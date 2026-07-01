import React, { useEffect, useState, useRef } from 'react';
import { NavBar, Tabs, Toast, SpinLoading } from 'antd-mobile';
import { useParams, history } from 'umi';
import { withAppBase } from '@/utils/appPath';
import { request } from '@umijs/max';
import ReactMarkdown from 'react-markdown';
const MEETING_TITLE_MAX_LEN = 20;

interface Meeting {
  id: number;
  title: string;
  date: string;
  location?: string;
  host?: string;
  participants?: string;
  content_text?: string;
  status?: string;
  provider?: string;
  created_at: string;
}

interface MeetingAudio {
  id: number;
  file_url?: string;
  file_name?: string;
  transcript_text?: string;
  status?: string;
}

const MeetingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const meetingId = parseInt(id || '0', 10);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [audios, setAudios] = useState<MeetingAudio[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [audioUrl, setAudioUrl] = useState('');
  const [minutesData, setMinutesData] = useState<any>(null);
  const [minutesLoading, setMinutesLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoTitleAppliedRef = useRef(false);
  const recoverAttemptedRef = useRef<Record<string, boolean>>({});
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');

  const getProvider = () =>
    meeting?.provider || localStorage.getItem(`meeting_provider_${meetingId}`) || 'local';

  const recoverInterruptedRecording = async (
    provider: string,
    recordingSessionId: string,
  ) => {
    const recoverKey = `${meetingId}_${recordingSessionId}`;
    if (recoverAttemptedRef.current[recoverKey]) {
      return false;
    }

    recoverAttemptedRef.current[recoverKey] = true;

    const recoverPath =
      provider === 'volc'
        ? `/api/meetings/minutes/volc/${meetingId}/recover-and-finalize`
        : `/api/meetings/minutes/local/${meetingId}/recover-and-finalize`;

    await request(recoverPath, {
      method: 'POST',
      data: {
        recording_session_id: recordingSessionId,
      },
      skipErrorHandler: true,
    });

    return true;
  };

  useEffect(() => {
    loadMeeting();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [meetingId]);

  useEffect(() => {
    if (!meeting) return;
    loadAudios();
    loadMinutes();
  }, [meeting, meetingId]);

  const loadMeeting = async () => {
    try {
      const res = await request(`/api/meetings/${meetingId}`);
      if (res.success) {
        setMeeting(res.data);
      }
    } catch {
      Toast.show({ icon: 'fail', content: '获取会议详情失败' });
    }
  };

  const loadAudios = async () => {
    try {
      const res = await request(`/api/meetings/audio/${meetingId}?provider=${getProvider()}`);
      if (res.success) {
        setAudios(res.data || []);
        if (res.data?.length > 0 && res.data[0].file_url) {
          setAudioUrl(res.data[0].file_url);
        }
      }
    } catch {
      // ignore
    }
  };

  const loadMinutes = async () => {
    setMinutesLoading(true);
    try {
      const path = getProvider() === 'volc'
        ? `/api/meetings/minutes/volc/${meetingId}`
        : `/api/meetings/minutes/local/${meetingId}`;
      const res = await request(path);
      if (res.success) {
        const data = res.data;
        const recoverableRecording = data?.recoverable_recording;
        const recordingSessionId = recoverableRecording?.recording_session_id;

        if (
          recordingSessionId &&
          typeof recordingSessionId === 'string'
        ) {
          try {
            const recovered = await recoverInterruptedRecording(
              recoverableRecording?.provider || getProvider(),
              recordingSessionId,
            );

            if (recovered) {
              localStorage.setItem(
                `meeting_minutes_status_${meetingId}`,
                'processing',
              );
              setMinutesData({
                ...data,
                processing_status: 'processing',
                processing_stage: 'minutes',
              });
              return;
            }
          } catch (recoverError) {
            console.error('恢复异常录音失败:', recoverError);
          }
        }

        setMinutesData(data);
      }
    } catch {
      Toast.show({ icon: 'fail', content: '获取会议纪要失败' });
    } finally {
      setMinutesLoading(false);
      setLoading(false);
    }
  };

  // 轮询：当检测到正在处理中时自动轮询
  useEffect(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    const isProcessing =
      minutesData?.processing_status === 'processing' ||
      minutesData?.audio_status === 'processing' ||
      minutesData?.asr_status === 'processing' ||
      minutesData?.minutes_job_status === 'running';

    if (isProcessing && !minutesLoading) {
      pollTimerRef.current = setInterval(() => {
        loadMinutes();
      }, 3000);
    }
  }, [minutesData, minutesLoading]);

  // 摘要生成完成后，自动用 AI 标题替换默认标题
  useEffect(() => {
    if (autoTitleAppliedRef.current) return;
    if (!meeting || !minutesData) return;

    const aiTitle = minutesData?.summary?.title;
    if (!aiTitle || typeof aiTitle !== 'string' || !aiTitle.trim()) return;
    if (!isDefaultTitle(meeting.title)) return;

    const applyTitle = async () => {
      try {
        const safeTitle = aiTitle.trim().slice(0, MEETING_TITLE_MAX_LEN);
        await request(`/api/meetings/${meetingId}`, {
          method: 'PUT',
          data: { title: aiTitle.trim() },
        });
        setMeeting((prev) => (prev ? { ...prev, title: aiTitle.trim() } : prev));
        autoTitleAppliedRef.current = true;
      } catch {
        // 静默失败，不影响页面
      }
    };
    applyTitle();
  }, [meeting, minutesData]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const path = getProvider() === 'volc'
        ? `/api/meetings/minutes/volc/${meetingId}/generate`
        : `/api/meetings/minutes/local/${meetingId}/generate`;
      const res = await request(path, { method: 'POST' });
      if (res.success) {
        Toast.show({ icon: 'success', content: '纪要生成已启动' });
        setMinutesData((prev: any) => ({
          ...prev,
          processing_status: 'processing',
          processing_stage: 'minutes',
        }));
        // 开始轮询
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        pollTimerRef.current = setInterval(() => {
          loadMinutes();
        }, 3000);
      } else {
        Toast.show({ icon: 'fail', content: res.message || '生成失败' });
      }
    } catch (err: any) {
      Toast.show({ icon: 'fail', content: err.message || '生成失败' });
    } finally {
      setGenerating(false);
    }
  };

  const handleTitleSave = async () => {
    const newTitle = editTitleValue.trim();
    if (newTitle.length > MEETING_TITLE_MAX_LEN) {
      Toast.show({
        icon: "fail",
        content: `会议名称不能超过 ${MEETING_TITLE_MAX_LEN} 个字符`,
      });
      return; // 不退出编辑态，让用户继续修改
    }
    if (!newTitle || newTitle === meeting?.title) {
      setEditingTitle(false);
      return;
    }
    try {
      await request(`/api/meetings/${meetingId}`, {
        method: "PUT",
        data: { title: newTitle },
      });
      setMeeting((prev) => (prev ? { ...prev, title: newTitle } : prev));
      setEditingTitle(false);
    } catch {
      Toast.show({ icon: "fail", content: "标题修改失败" });
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTranscriptBlocks = () => {
    const text = minutesData?.stream_transcript_text || minutesData?.transcript_text || meeting?.content_text || '';
    if (!text) return [];
    const sentences = text.split(/[。！？\n]+/).filter(s => s.trim());
    const blocks: string[] = [];
    let current = '';
    sentences.forEach((s) => {
      current += s + '。';
      if (current.length > 80) {
        blocks.push(current);
        current = '';
      }
    });
    if (current) blocks.push(current);
    return blocks;
  };

  const transcriptBlocks = getTranscriptBlocks();

  // 判断是否为默认生成的标题（格式："会议 MM/DD HH:mm" 或 "会议 MM/DD HH:mm:ss"）
  const isDefaultTitle = (title: string): boolean => {
    return /^会议 \d{2}\/\d{2} \d{2}:\d{2}(:\d{2})?$/.test(title);
  };

  // 将秒数格式化为 MM:SS 或 HH:MM:SS
  const formatTime = (seconds?: number) => {
    if (!seconds || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (h > 0) {
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  };

  // 判断纪要状态
  const hasSummary = !!(minutesData?.summary?.paragraph || minutesData?.summary_paragraph);
  const hasTranscript = !!(minutesData?.stream_transcript_text || minutesData?.transcript_text);
  const isProcessing =
    minutesData?.processing_status === 'processing' ||
    minutesData?.audio_status === 'processing' ||
    minutesData?.asr_status === 'processing' ||
    minutesData?.minutes_job_status === 'running';
  const canGenerate = hasTranscript && !hasSummary && !isProcessing;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <SpinLoading style={{ '--size': '40px' } as any} />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f6fa' }}>
        <NavBar onBack={() => history.push('/mobile/meetings')}>会议详情</NavBar>
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>会议不存在</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa' }}>
      <NavBar onBack={() => history.push('/mobile/meetings')}>会议详情</NavBar>

      <div style={{ background: '#fff', padding: 16, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          {editingTitle ? (
            // 移动端会议名称限制 20 字符：maxLength + slice 双保险 + 右侧字符计数
            <>
              <input
                value={editTitleValue}
                maxLength={MEETING_TITLE_MAX_LEN}
                onChange={(e) =>
                  setEditTitleValue(
                    e.target.value.slice(0, MEETING_TITLE_MAX_LEN),
                  )
                }
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") {
                    setEditingTitle(false);
                  }
                }}
                autoFocus
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: "#333",
                  border: "2px solid #1677ff",
                  borderRadius: 6,
                  padding: "4px 10px",
                  maxWidth: "100%",
                  width: 260,
                  outline: "none",
                  background: "#fff",
                  boxSizing: "border-box",
                }}
              />
              {/* 字符计数，达到上限时变红提示 */}
              <span
                style={{
                  fontSize: 12,
                  color:
                    editTitleValue.length >= MEETING_TITLE_MAX_LEN
                      ? "#ff4d4f"
                      : "#999",
                  flexShrink: 0,
                }}
              >
                {editTitleValue.length}/{MEETING_TITLE_MAX_LEN}
              </span>
            </>
          ) : (
            <>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: '#333',
                  maxWidth: '100%',
                  wordBreak: 'break-all',
                }}
              >
                {meeting.title}
              </div>
              <button
                onClick={() => {
                  setEditingTitle(true);
                  setEditTitleValue(meeting.title);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 16,
                  cursor: 'pointer',
                  padding: '2px 6px',
                  color: '#bbb',
                  flexShrink: 0,
                }}
                title="修改会议标题"
              >
                ✏️
              </button>
            </>
          )}
          {meeting.provider === 'local' && (
            <span style={{
              fontSize: 12, fontWeight: 'bold', color: '#cf1322',
              background: '#fff1f0', padding: '2px 10px',
              borderRadius: 10, border: '1px solid #ffccc7',
            }}>
              🔒 机密
            </span>
          )}
          {meeting.provider === 'volc' && (
            <span style={{
              fontSize: 12, fontWeight: 'bold', color: '#006d75',
              background: '#e6fffb', padding: '2px 10px',
              borderRadius: 10, border: '1px solid #87e8de',
            }}>
              💬 普通
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: '#999' }}>
          {formatDate(meeting.date)}
          {meeting.host && ` · 主持：${meeting.host}`}
        </div>
      </div>

      {audioUrl && (
        <div style={{ background: '#fff', padding: '12px 16px', marginBottom: 8 }}>
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            style={{ width: '100%', height: 40 }}
          />
        </div>
      )}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ background: '#fff' }}
      >
        <Tabs.Tab title="会议总结" key="summary">
          <div style={{ padding: 16, minHeight: 300 }}>
            {minutesLoading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                <SpinLoading style={{ '--size': '24px' } as any} />
                <div style={{ marginTop: 12 }}>加载中...</div>
              </div>
            ) : (
              <div>
                {/* 生成中状态 */}
                {isProcessing && (
                  <div style={{
                    background: '#e6f7f5',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                    textAlign: 'center',
                  }}>
                    <SpinLoading style={{ '--size': '24px' } as any} />
                    <div style={{ marginTop: 8, fontSize: 14, color: '#00bfa5' }}>
                      AI 正在生成会议总结，请稍候...
                    </div>
                  </div>
                )}

                {/* AI 核心摘要 */}
                {hasSummary && (
                  <div style={{
                    position: 'relative',
                    background: '#f5f6fa',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                    fontSize: 15,
                    lineHeight: 1.8,
                    color: '#333',
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#00bfa5' }}>
                      AI 核心摘要
                    </div>
                    <button
                      onClick={() => {
                        const text = minutesData.summary?.paragraph || minutesData.summary_paragraph || '';
                        const ta = document.createElement('textarea');
                        ta.value = text;
                        ta.style.position = 'fixed';
                        ta.style.left = '-9999px';
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        background: copied ? '#52c41a' : '#00bfa5',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 14,
                        padding: '4px 14px',
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      {copied ? '✓ 已复制' : '复制'}
                    </button>
                    {(() => {
                      const rawMd = minutesData.summary?.paragraph || minutesData.summary_paragraph || '';
                      const formattedMd = rawMd.replace(/\n\*\*([^*]+)\*\*\n/g, '\n\n## $1\n\n');
                      return (
                        <div className="md-summary">
                          <style>{`
                            .md-summary h2 { font-size: 17px; font-weight: bold; margin: 20px 0 10px; color: #333; padding-bottom: 6px; border-bottom: 1px solid #eee; }
                            .md-summary h2:first-child { margin-top: 0; }
                            .md-summary ul { padding-left: 20px; margin: 8px 0; }
                            .md-summary li { list-style-type: disc; margin-bottom: 6px; line-height: 1.7; }
                            .md-summary p { margin-bottom: 12px; line-height: 1.8; }
                            .md-summary p:last-child { margin-bottom: 0; }
                          `}</style>
                          <ReactMarkdown>{formattedMd}</ReactMarkdown>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 生成纪要按钮 */}
                {canGenerate && (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      style={{
                        padding: '10px 24px',
                        borderRadius: 20,
                        background: generating ? '#ccc' : '#00bfa5',
                        color: '#fff',
                        fontSize: 15,
                        fontWeight: 500,
                        border: 'none',
                      }}
                    >
                      {generating ? '生成中...' : '✨ 生成会议总结'}
                    </button>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                      转写已完成，点击生成 AI 总结与待办
                    </div>
                  </div>
                )}

                {/* 待办事项 — 有数据才显示 */}
                {minutesData?.todos && minutesData.todos.length > 0 && (
                  <div style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: 16,
                    marginTop: 16,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
                      待办事项 ({minutesData.todos.length})
                    </div>
                    {minutesData.todos.map((todo: any, idx: number) => (
                      <div key={idx} style={{
                        display: 'flex',
                        background: '#fafafa',
                        borderRadius: 10,
                        marginBottom: idx < minutesData.todos.length - 1 ? 12 : 0,
                        overflow: 'hidden',
                      }}>
                        <div style={{ width: 4, background: '#00bfa5', flexShrink: 0 }} />
                        <div style={{ padding: '12px 14px', flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 15,
                            color: '#333',
                            fontWeight: 500,
                            lineHeight: 1.6,
                            marginBottom: (todo.executor || todo.execution_time) ? 10 : 0,
                            wordBreak: 'break-all',
                          }}>
                            {todo.content || '待办事项'}
                          </div>
                          {(todo.executor || todo.execution_time) && (
                            <div style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '8px 16px',
                              fontSize: 13,
                              color: '#666',
                            }}>
                              {todo.executor && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{
                                    display: 'inline-block', width: 16, height: 16,
                                    borderRadius: '50%', background: '#e6f7f5',
                                    color: '#00bfa5', fontSize: 10,
                                    textAlign: 'center', lineHeight: '16px', fontWeight: 'bold',
                                  }}>人</span>
                                  <span>{todo.executor}</span>
                                </div>
                              )}
                              {todo.execution_time && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{
                                    display: 'inline-block', width: 16, height: 16,
                                    borderRadius: '50%', background: '#e6f7f5',
                                    color: '#00bfa5', fontSize: 10,
                                    textAlign: 'center', lineHeight: '16px', fontWeight: 'bold',
                                  }}>时</span>
                                  <span>{todo.execution_time}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 空状态 */}
                {!hasSummary && !isProcessing && !canGenerate && (
                  <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                    <div>暂无会议总结</div>
                    {hasTranscript && (
                      <div style={{ fontSize: 13, marginTop: 8, color: '#ccc' }}>
                        转写内容已保存，请返回列表重新进入查看
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Tabs.Tab>

        <Tabs.Tab title="转译内容" key="transcript">
          <div style={{ padding: 16, minHeight: 300 }}>
            {minutesData?.speaker_segments && minutesData.speaker_segments.length > 0 ? (
              // 火山妙记返回了说话人分段，按说话人展示
              minutesData.speaker_segments.map((seg: any, idx: number) => (
                <div key={idx} style={{ marginBottom: 16 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 6,
                  }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: ['#00bfa5', '#ff7a45', '#722ed1', '#1890ff'][idx % 4],
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 'bold',
                      flexShrink: 0,
                    }}>
                      {(seg.speaker || '未知').slice(0, 1)}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>
                      {seg.speaker || '未知'}
                    </span>
                    <span style={{ fontSize: 12, color: '#999', marginLeft: 'auto' }}>
                      {formatTime((seg.start_ms || 0) / 1000)}
                    </span>
                  </div>
                  <div style={{
                    background: '#fff',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: '#333',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    marginLeft: 36,
                  }}>
                    {seg.text}
                  </div>
                </div>
              ))
            ) : transcriptBlocks.length > 0 ? (
              // 兼容老数据：没有 speaker_segments 时按段落展示
              transcriptBlocks.map((block, idx) => (
                <div key={idx} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#00bfa5', marginBottom: 6, fontWeight: 'bold' }}>
                    第 {idx + 1} 段
                  </div>
                  <div style={{
                    background: '#fff',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: '#333',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    {block}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                暂无转译内容
              </div>
            )}
          </div>
        </Tabs.Tab>
      </Tabs>
    </div>
  );
};

export default MeetingDetail;
