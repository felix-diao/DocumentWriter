// MeetingAssistant.tsx - 升级版 AI 会议助手，集成腾讯会议 API

import {
  AudioOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  DownloadOutlined,
  FileTextOutlined,
  LinkOutlined,
  PauseCircleOutlined,
  TeamOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard, ProList } from '@ant-design/pro-components';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Col,
  DatePicker,
  Descriptions,
  Input,
  Modal,
  message,
  Row,
  Space,
  Spin,
  Tabs,
  Tag,
  Timeline,
  TimePicker,
  Typography,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';
import { aiGenerateMeetingNotes } from '@/services/ai';
import { tencentMeetingService } from '@/services/tencentMeeting';

const { TextArea } = Input;
const { Title, Paragraph, Text } = Typography;

interface ActionItem {
  id: string;
  task: string;
  assignee: string;
  deadline: string;
  status: 'pending' | 'completed';
}

interface MeetingInfo {
  meeting_id: string;
  meeting_code: string;
  subject: string;
  join_url: string;
  start_time?: string;
  end_time?: string;
  status?: string;
}

const MeetingAssistant: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [meetingSummary, setMeetingSummary] = useState('');
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [decisions, setDecisions] = useState<string[]>([]);
  const [participants, setParticipants] = useState<string[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // 会议管理
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [meetingList, setMeetingList] = useState<MeetingInfo[]>([]);
  const [currentMeeting, setCurrentMeeting] = useState<MeetingInfo | null>(
    null,
  );
  const [meetingSubject, setMeetingSubject] = useState('');
  const [meetingDate, setMeetingDate] = useState<Dayjs>(dayjs());
  const [startTime, setStartTime] = useState<Dayjs>(dayjs());
  const [endTime, setEndTime] = useState<Dayjs>(dayjs().add(1, 'hour'));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 加载会议列表
  useEffect(() => {
    loadMeetingList();
  }, []);

  // 录音计时器
  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording]);

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const loadMeetingList = async () => {
    setLoading(true);
    try {
      const meetings = await tencentMeetingService.getUserMeetings();
      setMeetingList(meetings);
    } catch (error: any) {
      message.error(error.message || '加载会议列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async (): Promise<void> => {
    if (!meetingSubject.trim()) {
      message.warning('请输入会议主题');
      return; // 明确返回 void
    }

    setLoading(true);
    try {
      const startDateTime = meetingDate
        .hour(startTime.hour())
        .minute(startTime.minute())
        .unix();
      const endDateTime = meetingDate
        .hour(endTime.hour())
        .minute(endTime.minute())
        .unix();

      const meetingInfo = await tencentMeetingService.createMeeting({
        subject: meetingSubject,
        type: 0,
        start_time: startDateTime.toString(),
        end_time: endDateTime.toString(),
        settings: {
          mute_enable_join: true,
          allow_unmute_self: true,
          auto_record_type: 'cloud',
        },
      });

      setCurrentMeeting(meetingInfo);
      setShowCreateModal(false);
      message.success('会议创建成功！');
      loadMeetingList();

      Modal.info({
        title: '会议创建成功',
        width: 600,
        content: (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="会议主题">
              {meetingInfo.subject}
            </Descriptions.Item>
            <Descriptions.Item label="会议号">
              {meetingInfo.meeting_code}
            </Descriptions.Item>
            <Descriptions.Item label="会议链接">
              <Space>
                <a
                  href={meetingInfo.join_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {meetingInfo.join_url}
                </a>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => {
                    navigator.clipboard.writeText(meetingInfo.join_url);
                    message.success('已复制链接');
                  }}
                />
              </Space>
            </Descriptions.Item>
          </Descriptions>
        ),
      });
    } catch (error: any) {
      message.error(error.message || '创建会议失败');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = (meeting: MeetingInfo) => {
    window.open(meeting.join_url, '_blank');
    message.info('正在打开会议链接...');
  };

  const handleCancelMeeting = async (meetingId: string) => {
    Modal.confirm({
      title: '确认取消会议',
      content: '取消后将无法恢复，确定要取消这个会议吗？',
      onOk: async () => {
        setLoading(true);
        try {
          await tencentMeetingService.cancelMeeting(meetingId, '主动取消');
          message.success('会议已取消');
          loadMeetingList();
        } catch (error: any) {
          message.error(error.message || '取消会议失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        message.success('录音已停止，正在处理...');
      };

      mediaRecorder.start();
      setRecording(true);
      message.success('开始录音...');
    } catch {
      message.error('无法访问麦克风，请检查权限设置');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => {
        track.stop();
      });
      setRecording(false);
    }
  };

  const handleGenerateNotes = async (): Promise<void> => {
    if (!transcript.trim()) {
      message.warning('请先输入或录制会议内容');
      return; // 明确返回 void
    }

    setLoading(true);
    try {
      const response = await aiGenerateMeetingNotes({
        transcript,
        meetingType: 'general',
        participants,
      });
      const data = response.data;
      setMeetingSummary(data.summary || '');
      setActionItems(data.actionItems || []);
      setDecisions(data.decisions || []);
      message.success('会议记录生成成功');
    } catch {
      message.error('生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const content = `
# 会议摘要
${meetingSummary}

# 会议信息
${currentMeeting ? `- 会议主题：${currentMeeting.subject}\n- 会议号：${currentMeeting.meeting_code}\n- 会议时间：${currentMeeting.start_time}` : ''}

# 参会人员
${participants.map((p) => `- ${p}`).join('\n')}

# 决策事项
${decisions.map((d, i) => `${i + 1}. ${d}`).join('\n')}

# 行动项
${actionItems.map((item, i) => `${i + 1}. ${item.task} - 负责人：${item.assignee} - 截止：${item.deadline}`).join('\n')}

# 会议转录
${transcript}
        `;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-notes-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('导出成功');
  };

  return (
    <PageContainer
      header={{
        title: 'AI 会议助手',
        subTitle: '预约会议、实时转录、智能摘要、自动提取行动项',
      }}
    >
      <Row gutter={[16, 16]}>
        {/* 会议管理区域 */}
        <Col span={24}>
          <ProCard
            title={
              <Space>
                <VideoCameraOutlined />
                会议管理
              </Space>
            }
            extra={
              <Button
                type="primary"
                icon={<CalendarOutlined />}
                onClick={() => setShowCreateModal(true)}
              >
                预约会议
              </Button>
            }
            bordered
          >
            <Spin spinning={loading}>
              {meetingList.length === 0 ? (
                <Alert
                  message="暂无会议"
                  description="点击右上角「预约会议」按钮创建新会议"
                  type="info"
                  showIcon
                />
              ) : (
                <ProList
                  rowKey="meeting_id"
                  dataSource={meetingList}
                  metas={{
                    title: { dataIndex: 'subject' },
                    description: {
                      render: (_, row) => `会议号：${row.meeting_code}`,
                    },
                    actions: {
                      render: (_, row) => [
                        <Button
                          key="join"
                          type="link"
                          icon={<LinkOutlined />}
                          onClick={() => handleJoinMeeting(row)}
                        >
                          加入
                        </Button>,
                        <Button
                          key="cancel"
                          type="link"
                          danger
                          onClick={() => handleCancelMeeting(row.meeting_id)}
                        >
                          取消
                        </Button>,
                      ],
                    },
                  }}
                />
              )}
            </Spin>
          </ProCard>
        </Col>

        {/* 会议内容 */}
        <Col xs={24} lg={16}>
          <ProCard title="会议内容" bordered>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Space>
                <Button
                  type={recording ? 'default' : 'primary'}
                  danger={recording}
                  icon={recording ? <PauseCircleOutlined /> : <AudioOutlined />}
                  onClick={
                    recording ? handleStopRecording : handleStartRecording
                  }
                  size="large"
                >
                  {recording ? '停止录音' : '开始录音'}
                </Button>
                {recording && (
                  <Space>
                    <Badge status="processing" text="正在录音" />
                    <Text strong>{formatDuration(recordingDuration)}</Text>
                  </Space>
                )}
              </Space>

              <div>
                <Title level={5}>会议转录 / 手动输入</Title>
                <TextArea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="会议内容将实时显示在这里，也可以手动输入..."
                  rows={12}
                  style={{ minHeight: '300px' }}
                />
              </div>

              <Space>
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  onClick={handleGenerateNotes}
                  loading={loading}
                  size="large"
                >
                  生成会议记录
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleExport}
                  disabled={!meetingSummary}
                >
                  导出记录
                </Button>
              </Space>
            </Space>
          </ProCard>
        </Col>

        {/* 参会人员 & 时长 */}
        <Col xs={24} lg={8}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <ProCard title="参会人员" bordered>
              <Space direction="vertical" style={{ width: '100%' }}>
                {participants.length > 0 ? (
                  participants.map((name) => (
                    <div key={name}>
                      <Avatar size="small" icon={<TeamOutlined />} /> {name}
                    </div>
                  ))
                ) : (
                  <Text type="secondary">暂无参会人员</Text>
                )}
                <Input
                  placeholder="添加参会人员"
                  onPressEnter={(e) => {
                    const value = e.currentTarget.value.trim();
                    if (value) {
                      setParticipants([...participants, value]);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </Space>
            </ProCard>
            <ProCard title="会议时长" bordered>
              <Space>
                <ClockCircleOutlined />
                <Text strong>{formatDuration(recordingDuration)}</Text>
              </Space>
            </ProCard>
          </Space>
        </Col>

        {/* 摘要 / 行动项 / 决策事项 */}
        <Col span={24}>
          <ProCard>
            <Tabs
              items={[
                {
                  key: 'summary',
                  label: '会议摘要',
                  children: (
                    <Spin spinning={loading}>
                      {meetingSummary ? (
                        <Paragraph>{meetingSummary}</Paragraph>
                      ) : (
                        <Text type="secondary">暂无摘要</Text>
                      )}
                    </Spin>
                  ),
                },
                {
                  key: 'actions',
                  label: (
                    <span>
                      行动项{' '}
                      {actionItems.length > 0 && (
                        <Badge count={actionItems.length} />
                      )}
                    </span>
                  ),
                  children: (
                    <ProList<ActionItem>
                      rowKey="id"
                      dataSource={actionItems}
                      metas={{
                        title: { dataIndex: 'task' },
                        description: {
                          render: (_, row) => (
                            <Space>
                              <Text type="secondary">
                                负责人：{row.assignee}
                              </Text>
                              <Text type="secondary">截止：{row.deadline}</Text>
                            </Space>
                          ),
                        },
                        actions: {
                          render: (_, row) => [
                            <Tag
                              key="status"
                              color={
                                row.status === 'completed'
                                  ? 'success'
                                  : 'default'
                              }
                            >
                              {row.status === 'completed' ? '已完成' : '进行中'}
                            </Tag>,
                          ],
                        },
                      }}
                      locale={{ emptyText: '暂无行动项' }}
                    />
                  ),
                },
                {
                  key: 'decisions',
                  label: (
                    <span>
                      决策事项{' '}
                      {decisions.length > 0 && (
                        <Badge count={decisions.length} />
                      )}
                    </span>
                  ),
                  children: (
                    <Timeline
                      items={
                        decisions.length > 0
                          ? decisions.map((d) => ({
                              children: d,
                              dot: <CheckCircleOutlined />,
                            }))
                          : [
                              {
                                children: (
                                  <Text type="secondary">暂无决策事项</Text>
                                ),
                              },
                            ]
                      }
                    />
                  ),
                },
              ]}
            />
          </ProCard>
        </Col>
      </Row>

      {/* 创建会议对话框 */}
      <Modal
        title="预约会议"
        open={showCreateModal}
        onOk={handleCreateMeeting}
        onCancel={() => setShowCreateModal(false)}
        confirmLoading={loading}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={5}>会议主题 *</Title>
            <Input
              value={meetingSubject}
              onChange={(e) => setMeetingSubject(e.target.value)}
              placeholder="请输入会议主题"
              maxLength={100}
            />
          </div>
          <div>
            <Title level={5}>会议日期 *</Title>
            <DatePicker
              value={meetingDate}
              onChange={(date) => date && setMeetingDate(date)}
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
            />
          </div>
          <Row gutter={16}>
            <Col span={12}>
              <Title level={5}>开始时间 *</Title>
              <TimePicker
                value={startTime}
                onChange={(time) => time && setStartTime(time)}
                style={{ width: '100%' }}
                format="HH:mm"
              />
            </Col>
            <Col span={12}>
              <Title level={5}>结束时间 *</Title>
              <TimePicker
                value={endTime}
                onChange={(time) => time && setEndTime(time)}
                style={{ width: '100%' }}
                format="HH:mm"
              />
            </Col>
          </Row>
          <Alert
            message="提示"
            description="创建会议后，您将获得会议号和入会链接，可分享给参会人员"
            type="info"
            showIcon
          />
        </Space>
      </Modal>
    </PageContainer>
  );
};

export default MeetingAssistant;
