import React, { useEffect, useState, useCallback } from 'react';
import { NavBar, SearchBar, Modal, Toast, SpinLoading } from 'antd-mobile';
import { SearchOutline, AddOutline, RightOutline } from 'antd-mobile-icons';
import { history } from 'umi';
import { request } from '@umijs/max';

interface Meeting {
  id: number;
  title: string;
  date: string;
  location?: string;
  host?: string;
  participants?: string;
  status?: string;
  creator_id?: string;
  provider?: string;
  created_at: string;
}

type MinutesStatus = 'loading' | 'not_started' | 'processing' | 'completed' | 'failed';

interface MinutesStatusInfo {
  status: MinutesStatus;
  text: string;
}

const resolveMinutesStatus = (data: any): MinutesStatusInfo => {
  const hasSummary = !!(
    data?.summary?.paragraph ||
    data?.summary?.summary_text ||
    data?.summary_paragraph ||
    data?.summary_text
  );

  const rawStatus = String(
    data?.processing_status ||
      data?.audio_status ||
      data?.asr_status ||
      data?.minutes_job_status ||
      data?.status ||
      '',
  ).toLowerCase();

  if (hasSummary || rawStatus === 'completed' || rawStatus === 'success' || rawStatus === '已完成') {
    return { status: 'completed', text: '已完成' };
  }

  if (['processing', 'running', 'submitted', 'pending', 'uploading'].includes(rawStatus)) {
    return { status: 'processing', text: '生成中' };
  }

  if (['failed', 'error'].includes(rawStatus)) {
    return { status: 'failed', text: '生成失败' };
  }

  return { status: 'not_started', text: '未开始' };
};

// 判断是否为默认生成的标题（格式："会议 MM/DD HH:mm"）
const isDefaultTitle = (title: string): boolean => {
  return /^会议 \d{2}\/\d{2} \d{2}:\d{2}$/.test(title);
};

const fetchMinutesStatus = async (
  meeting: Meeting,
): Promise<{ status: MinutesStatusInfo; updatedTitle?: string }> => {
  const provider =
    meeting.provider || localStorage.getItem(`meeting_provider_${meeting.id}`) || 'local';

  const url =
    provider === 'volc'
      ? `/api/meetings/minutes/volc/${meeting.id}`
      : `/api/meetings/minutes/local/${meeting.id}`;

  try {
    const res = await request(url);
    const data = res?.data;

    // 自动标题替换：AI 总结生成后，用 summary.title 替换默认标题
    let updatedTitle: string | undefined;
    const aiTitle = data?.summary?.title;
    if (
      aiTitle &&
      typeof aiTitle === 'string' &&
      aiTitle.trim() &&
      isDefaultTitle(meeting.title)
    ) {
      try {
        await request(`/api/meetings/${meeting.id}`, {
          method: 'PUT',
          data: { title: aiTitle.trim() },
        });
        updatedTitle = aiTitle.trim();
      } catch {
        // 静默失败
      }
    }

    const status = resolveMinutesStatus(data);
    const statusKey = `meeting_minutes_status_${meeting.id}`;
    const cachedStatus = localStorage.getItem(statusKey);

    if (status.status === 'completed' || status.status === 'failed') {
      localStorage.removeItem(statusKey);
      return { status, updatedTitle };
    }

    if (cachedStatus === 'processing') {
      return { status: { status: 'processing', text: '生成中' }, updatedTitle };
    }

    if (cachedStatus === 'failed') {
      return { status: { status: 'failed', text: '生成失败' }, updatedTitle };
    }

    return { status, updatedTitle };
  } catch (error) {
    console.error('获取会议纪要状态失败:', error);
    return { status: { status: 'not_started', text: '未开始' } };
  }
};

const MeetingList: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [minutesStatusMap, setMinutesStatusMap] = useState<Record<number, MinutesStatusInfo>>({});
  const [loading, setLoading] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [typeModalVisible, setTypeModalVisible] = useState(false);

  const fetchMeetings = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const res = await request('/api/meetings');
      if (res.success) {
        const list: Meeting[] = res.data || [];
        setMeetings(list);

        const entries = await Promise.all(
          list.map(async (meeting) => {
            const result = await fetchMinutesStatus(meeting);
            return [meeting.id, result] as const;
          }),
        );

        const statusMap: Record<number, MinutesStatusInfo> = {};
        const titleUpdates: Record<number, string> = {};
        entries.forEach(([id, result]) => {
          statusMap[id] = result.status;
          if (result.updatedTitle) {
            titleUpdates[id] = result.updatedTitle;
          }
        });

        setMinutesStatusMap(statusMap);

        // 本地刷新已自动替换的标题
        if (Object.keys(titleUpdates).length > 0) {
          setMeetings((prev) =>
            prev.map((m) =>
              titleUpdates[m.id] ? { ...m, title: titleUpdates[m.id] } : m,
            ),
          );
        }
      }
    } catch (err) {
      Toast.show({ icon: 'fail', content: '获取会议列表失败' });
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  useEffect(() => {
    const hasUnfinished = Object.values(minutesStatusMap).some(
      (item) => item.status === 'processing',
    );

    if (!hasUnfinished) {
      return;
    }

    const timer = window.setInterval(() => {
      fetchMeetings(false);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [minutesStatusMap, fetchMeetings]);

  const handleCreate = () => {
    setTypeModalVisible(true);
  };

  const doCreateMeeting = async (provider: 'local' | 'volc') => {
    const title = `会议 ${new Date().toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })}`;
    try {
      const res = await request('/api/meetings', {
        method: 'POST',
        data: {
          title,
          date: new Date().toISOString(),
          status: 'created',
          provider,
        },
      });
      if (res.success && res.data?.id) {
        localStorage.setItem(`meeting_provider_${res.data.id}`, provider);
        history.push(`/mobile/record/${res.data.id}`);
      }
    } catch (err) {
      Toast.show({ icon: 'fail', content: '创建会议失败' });
    }
  };

  const filteredMeetings = meetings.filter((m) =>
    m.title.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa', paddingBottom: 80 }}>
      <NavBar
        back={null}
        right={
          <SearchOutline
            style={{ fontSize: 20, color: '#333' }}
            onClick={() => setSearchVisible(!searchVisible)}
          />
        }
      >
        会议记录
      </NavBar>

      {searchVisible && (
        <div style={{ padding: '8px 16px', background: '#fff' }}>
          <SearchBar
            placeholder="搜索会议主题"
            value={searchKeyword}
            onChange={setSearchKeyword}
            showCancelButton
            onCancel={() => {
              setSearchVisible(false);
              setSearchKeyword('');
            }}
          />
        </div>
      )}

      <div style={{ padding: 12 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <SpinLoading style={{ '--size': '32px' } as any} />
          </div>
        )}

        {!loading && filteredMeetings.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            暂无会议记录
          </div>
        )}

        {filteredMeetings.map((meeting, index) => (
          <div
            key={meeting.id}
            
            onClick={() => {
              const minutesStatus = minutesStatusMap[meeting.id];

              if (minutesStatus?.status !== 'completed') {
                Toast.show({
                  icon: 'fail',
                  content:
                    minutesStatus?.status === 'failed'
                      ? '会议纪要生成失败，请稍后重试'
                      : '会议纪要生成中，请稍后',
                });
                return;
              }

              history.push(`/mobile/detail/${meeting.id}`);
            }}

            style={{
              background: index === 0 ? '#00bfa5' : '#fff',
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: index === 0 ? '#fff' : '#333',
                  }}
                >
                  {meeting.title}
                </div>
                {meeting.provider === 'local' && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 'bold',
                      color: '#cf1322',
                      background: index === 0 ? 'rgba(255,255,255,0.9)' : '#fff1f0',
                      padding: '2px 8px',
                      borderRadius: 10,
                      border: '1px solid #ffccc7',
                    }}
                  >
                    🔒 机密
                  </span>
                )}
                {meeting.provider === 'volc' && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 'bold',
                      color: '#006d75',
                      background: index === 0 ? 'rgba(255,255,255,0.9)' : '#e6fffb',
                      padding: '2px 8px',
                      borderRadius: 10,
                      border: '1px solid #87e8de',
                    }}
                  >
                    💬 普通
                  </span>
                )}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 'bold',
                    color: minutesStatusMap[meeting.id]?.status === 'completed' ? '#389e0d' : '#d48806',
                    background:
                      minutesStatusMap[meeting.id]?.status === 'completed' ? '#f6ffed' : '#fff7e6',
                    padding: '2px 8px',
                    borderRadius: 10,
                    border: `1px solid ${
                      minutesStatusMap[meeting.id]?.status === 'completed' ? '#b7eb8f' : '#ffd591'
                    }`,
                  }}
                >
                  {minutesStatusMap[meeting.id]?.text || '状态获取中'}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: index === 0 ? 'rgba(255,255,255,0.8)' : '#999',
                  marginTop: 6,
                }}
              >
                {meeting.participants
                  ? `参与人：${meeting.participants}`
                  : `时间：${new Date(meeting.date || meeting.created_at).toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`}
              </div>
            </div>
            <RightOutline
              style={{
                fontSize: 16,
                color: index === 0 ? 'rgba(255,255,255,0.7)' : '#ccc',
              }}
            />
          </div>
        ))}
      </div>

      <div
        onClick={handleCreate}
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#00bfa5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,191,165,0.4)',
          zIndex: 100,
        }}
      >
        <AddOutline style={{ fontSize: 28, color: '#fff' }} />
      </div>

      <Modal
        visible={typeModalVisible}
        onClose={() => setTypeModalVisible(false)}
        closeOnMaskClick
        content={
          <div style={{ padding: '8px 0' }}>
            <div style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}>
              选择会议类型
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                onClick={() => {
                  setTypeModalVisible(false);
                  doCreateMeeting('local');
                }}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border: '1px solid #ff4d4f',
                  background: '#fff1f0',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#cf1322' }}>🔒 机密会议</div>
                <div style={{ fontSize: 12, color: '#ff7875', marginTop: 4 }}>高度加密，离线转译，本地保存</div>
              </div>
              <div
                onClick={() => {
                  setTypeModalVisible(false);
                  doCreateMeeting('volc');
                }}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border: '1px solid #00bfa5',
                  background: '#e6fffb',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#006d75' }}>💬 普通会议</div>
                <div style={{ fontSize: 12, color: '#13c2c2', marginTop: 4 }}>云端加速转译，多人实时同步</div>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
};

export default MeetingList;