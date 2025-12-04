import {
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Divider,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import { history, useLocation } from '@umijs/max';
import meetingsApi, { Meeting, MeetingAudio, MeetingFile } from '@/services/meetings';
import meetingMinutesApi, {
  ActionItemPayload,
  DecisionItemPayload,
  getMinutesDocxUrl,
  MeetingActionItem,
  MeetingDecisionItem,
  MeetingInsights,
} from '@/services/meetingMinutes';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface ActionFormValues {
  description: string;
  owner?: string;
  due_date?: Dayjs;
  status?: string;
}

interface DecisionFormValues {
  description: string;
}

const actionStatusOptions = [
  { value: 'pending', label: '待跟进', color: 'default' },
  { value: 'in_progress', label: '处理中', color: 'blue' },
  { value: 'completed', label: '已完成', color: 'green' },
  { value: 'blocked', label: '受阻', color: 'red' },
];

const MeetingMinutes: React.FC = () => {
  const location = useLocation();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | undefined>();
  const [insights, setInsights] = useState<MeetingInsights | null>(null);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [savingSummary, setSavingSummary] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<MeetingFile[]>([]);
  const [availableAudios, setAvailableAudios] = useState<MeetingAudio[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
  const [selectedAudioIds, setSelectedAudioIds] = useState<number[]>([]);
  const [generateModalVisible, setGenerateModalVisible] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [decisionModalVisible, setDecisionModalVisible] = useState(false);
  const [editingAction, setEditingAction] = useState<MeetingActionItem | null>(null);
  const [editingDecision, setEditingDecision] = useState<MeetingDecisionItem | null>(null);
  const [actionForm] = Form.useForm<ActionFormValues>();
  const [decisionForm] = Form.useForm<DecisionFormValues>();

  const queryMeetingId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const item = params.get('meetingId');
    if (!item) return undefined;
    const parsed = Number(item);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, [location.search]);

  useEffect(() => {
    if (queryMeetingId) {
      setSelectedMeetingId(queryMeetingId);
    }
  }, [queryMeetingId]);

  const loadMeetings = async () => {
    setLoadingMeetings(true);
    try {
      const data = await meetingsApi.list();
      setMeetings(data);
      if (!queryMeetingId && !selectedMeetingId && data.length) {
        const firstId = data[0].id;
        setSelectedMeetingId(firstId);
        history.replace(`/meetings/minutes?meetingId=${firstId}`);
      }
    } catch (error: any) {
      message.error(error?.message || '加载会议失败');
    } finally {
      setLoadingMeetings(false);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadInsights = async (meetingId: number, showToast = false) => {
    setLoadingInsights(true);
    try {
      const result = await meetingMinutesApi.getInsights(meetingId);
      setInsights(result);
      setSummaryDraft(result.summary?.summary_text || '');
      if (showToast) {
        message.success('已刷新纪要内容');
      }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setInsights(null);
        setSummaryDraft('');
        if (showToast) {
          message.info('尚未生成该会议的纪要');
        }
      } else {
        message.error(error?.message || '获取会议纪要失败');
      }
    } finally {
      setLoadingInsights(false);
    }
  };

  const loadAssets = async (meetingId: number) => {
    try {
      const [files, audios] = await Promise.all([
        meetingsApi.listFiles(meetingId),
        meetingsApi.listAudios(meetingId),
      ]);
      setAvailableFiles(files);
      setAvailableAudios(audios);
    } catch (error: any) {
      message.warning(error?.message || '加载会议资料失败');
    }
  };

  useEffect(() => {
    if (typeof selectedMeetingId === 'number') {
      loadInsights(selectedMeetingId);
      loadAssets(selectedMeetingId);
      setSelectedFileIds([]);
      setSelectedAudioIds([]);
    } else {
      setInsights(null);
      setAvailableFiles([]);
      setAvailableAudios([]);
    }
  }, [selectedMeetingId]);

  const handleMeetingChange = (value: number) => {
    setSelectedMeetingId(value);
    history.replace(`/meetings/minutes?meetingId=${value}`);
  };

  const handleSaveSummary = async () => {
    if (!selectedMeetingId) return;
    setSavingSummary(true);
    try {
      const updated = await meetingMinutesApi.updateSummary(selectedMeetingId, summaryDraft || '');
      setInsights((prev) =>
        prev
          ? {
              ...prev,
              summary: updated,
            }
          : prev,
      );
      message.success('摘要已更新');
    } catch (error: any) {
      message.error(error?.message || '保存摘要失败');
    } finally {
      setSavingSummary(false);
    }
  };

  const handleSelectFiles = (values: Array<number | string>) => {
    if (values.length > 5) {
      message.warning('最多选择 5 个文件用于生成纪要');
      return;
    }
    setSelectedFileIds(values.map((item) => Number(item)));
  };

  const handleSelectAudios = (values: Array<number | string>) => {
    if (values.length > 3) {
      message.warning('最多选择 3 段音频用于生成纪要');
      return;
    }
    setSelectedAudioIds(values.map((item) => Number(item)));
  };

  const handleGenerate = async () => {
    if (!selectedMeetingId) return;
    setGenerating(true);
    try {
      const result = await meetingMinutesApi.generateInsights(selectedMeetingId, {
        file_ids: selectedFileIds.length ? selectedFileIds : undefined,
        audio_ids: selectedAudioIds.length ? selectedAudioIds : undefined,
      });
      setInsights(result);
      setSummaryDraft(result.summary?.summary_text || '');
      message.success('纪要生成成功');
      setGenerateModalVisible(false);
    } catch (error: any) {
      message.error(error?.message || '生成纪要失败');
    } finally {
      setGenerating(false);
    }
  };

  const openActionModal = (item?: MeetingActionItem) => {
    setEditingAction(item || null);
    if (item) {
      actionForm.setFieldsValue({
        description: item.description,
        owner: item.owner || undefined,
        due_date: item.due_date ? dayjs(item.due_date) : undefined,
        status: item.status || 'pending',
      });
    } else {
      actionForm.resetFields();
      actionForm.setFieldsValue({ status: 'pending' });
    }
    setActionModalVisible(true);
  };

  const submitActionItem = async () => {
    if (!selectedMeetingId) return;
    const values = await actionForm.validateFields();
    const payload: ActionItemPayload = {
      description: values.description,
      owner: values.owner,
      status: values.status,
      due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : undefined,
    };
    try {
      if (editingAction) {
        await meetingMinutesApi.updateActionItem(selectedMeetingId, editingAction.id, payload);
        message.success('行动项已更新');
      } else {
        await meetingMinutesApi.createActionItem(selectedMeetingId, payload);
        message.success('已创建行动项');
      }
      setActionModalVisible(false);
      loadInsights(selectedMeetingId);
    } catch (error: any) {
      message.error(error?.message || '保存行动项失败');
    }
  };

  const handleDeleteAction = async (record: MeetingActionItem) => {
    if (!selectedMeetingId) return;
    try {
      await meetingMinutesApi.deleteActionItem(selectedMeetingId, record.id);
      message.success('行动项已删除');
      loadInsights(selectedMeetingId);
    } catch (error: any) {
      message.error(error?.message || '删除失败');
    }
  };

  const openDecisionModal = (item?: MeetingDecisionItem) => {
    setEditingDecision(item || null);
    if (item) {
      decisionForm.setFieldsValue({ description: item.description });
    } else {
      decisionForm.resetFields();
    }
    setDecisionModalVisible(true);
  };

  const submitDecision = async () => {
    if (!selectedMeetingId) return;
    const values = await decisionForm.validateFields();
    const payload: DecisionItemPayload = {
      description: values.description,
    };
    try {
      if (editingDecision) {
        await meetingMinutesApi.updateDecisionItem(selectedMeetingId, editingDecision.id, payload);
        message.success('决策事项已更新');
      } else {
        await meetingMinutesApi.createDecisionItem(selectedMeetingId, payload);
        message.success('已创建决策事项');
      }
      setDecisionModalVisible(false);
      loadInsights(selectedMeetingId);
    } catch (error: any) {
      message.error(error?.message || '保存失败');
    }
  };

  const handleDeleteDecision = async (record: MeetingDecisionItem) => {
    if (!selectedMeetingId) return;
    try {
      await meetingMinutesApi.deleteDecisionItem(selectedMeetingId, record.id);
      message.success('决策事项已删除');
      loadInsights(selectedMeetingId);
    } catch (error: any) {
      message.error(error?.message || '删除失败');
    }
  };

  const summaryUpdatedAt = insights?.summary?.updated_at;

  const actionColumns: ColumnsType<MeetingActionItem> = [
    {
      title: '行动项',
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: '负责人',
      dataIndex: 'owner',
      width: 120,
      render: (value?: string) => value || '—',
    },
    {
      title: '截止日期',
      dataIndex: 'due_date',
      width: 140,
      render: (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD') : '—'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value?: string) => {
        const meta = actionStatusOptions.find((item) => item.value === value);
        return <Tag color={meta?.color || 'default'}>{meta?.label || '未设置'}</Tag>;
      },
    },
    {
      title: '操作',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openActionModal(record)}>
            编辑
          </Button>
          <Button type="link" danger onClick={() => handleDeleteAction(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const decisionColumns: ColumnsType<MeetingDecisionItem> = [
    {
      title: '决策事项',
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 180,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openDecisionModal(record)}>
            编辑
          </Button>
          <Button type="link" danger onClick={() => handleDeleteDecision(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const renderGenerateContent = () => (
    <div>
      <Title level={5}>选择会议资料（最多 5 个）</Title>
      {availableFiles.length ? (
        <Checkbox.Group
          value={selectedFileIds}
          onChange={handleSelectFiles}
          style={{ width: '100%' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {availableFiles.map((file) => (
              <Checkbox key={file.id} value={file.id}>
                <Space direction="vertical" size={0}>
                  <Text strong>{file.filename}</Text>
                  <Text type="secondary">
                    上传于 {dayjs(file.uploaded_at).format('YYYY-MM-DD HH:mm')}
                  </Text>
                </Space>
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      ) : (
        <Text type="secondary">暂无会议文件，可以在会议管理页面上传。</Text>
      )}

      <Divider />
      <Title level={5}>选择音频（最多 3 段）</Title>
      {availableAudios.length ? (
        <Checkbox.Group value={selectedAudioIds} onChange={handleSelectAudios} style={{ width: '100%' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {availableAudios.map((audio) => (
              <Checkbox key={audio.id} value={audio.id}>
                <Space direction="vertical" size={0}>
                  <Text strong>{audio.filename}</Text>
                  <Text type="secondary">
                    {dayjs(audio.uploaded_at).format('YYYY-MM-DD HH:mm')} ·{' '}
                    {audio.status === 'completed'
                      ? '已完成转写'
                      : audio.status === 'failed'
                        ? '转写失败'
                        : '转写中'}
                  </Text>
                </Space>
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      ) : (
        <Text type="secondary">暂无已上传的音频文件。</Text>
      )}
    </div>
  );

  return (
    <PageContainer
      // header={{
      //   title: '会议纪要洞察',
      //   subTitle: '汇总会议摘要、行动项与决策事项，支持一键导出',
      // }}
    >
      <ProCard ghost>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
          <Space size="large">
            <Space>
              <Text strong>选择会议：</Text>
              <Select<number>
                placeholder="请选择会议"
                style={{ minWidth: 260 }}
                loading={loadingMeetings}
                showSearch
                optionFilterProp="label"
                value={selectedMeetingId}
                onChange={handleMeetingChange}
                options={meetings.map((meeting) => ({
                  value: meeting.id,
                  label: `${meeting.title}（${dayjs(meeting.date).format('MM-DD HH:mm')}）`,
                }))}
              />
            </Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => selectedMeetingId && loadInsights(selectedMeetingId, true)}
              disabled={!selectedMeetingId}
            >
              刷新纪要
            </Button>
          </Space>
          <Space>
            <Button
              icon={<ThunderboltOutlined />}
              type="primary"
              disabled={!selectedMeetingId}
              onClick={() => setGenerateModalVisible(true)}
            >
              智能生成纪要
            </Button>
            <Button
              icon={<DownloadOutlined />}
              disabled={!selectedMeetingId}
              onClick={() => selectedMeetingId && window.open(getMinutesDocxUrl(selectedMeetingId), '_blank')}
            >
              导出 Word
            </Button>
          </Space>
        </Space>

        <Spin spinning={loadingInsights}>
          {!selectedMeetingId ? (
            <Empty description="请选择一个会议以查看纪要" style={{ marginTop: 48 }} />
          ) : (
            <>
              {!insights && (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="暂未生成结构化纪要"
                  description="可选择会议文件和音频后点击“智能生成纪要”，也可以手动维护行动项/决策事项。"
                />
              )}
              <ProCard
                title="会议摘要"
                extra={
                  <Button type="link" onClick={handleSaveSummary} loading={savingSummary}>
                    保存摘要
                  </Button>
                }
              >
                <TextArea
                  rows={6}
                  value={summaryDraft}
                  placeholder="这里将展示 AI 生成的会议摘要，也可以手动修改补充"
                  onChange={(e) => setSummaryDraft(e.target.value)}
                />
                <Text type="secondary">
                  最后编辑：
                  {summaryUpdatedAt ? dayjs(summaryUpdatedAt).format('YYYY-MM-DD HH:mm') : '暂未生成'}
                </Text>
              </ProCard>

              <ProCard split="vertical" style={{ marginTop: 16 }}>
                <ProCard
                  title="行动项"
                  extra={
                    <Button type="link" icon={<PlusOutlined />} onClick={() => openActionModal()}>
                      新增行动项
                    </Button>
                  }
                >
                  <Table<MeetingActionItem>
                    rowKey="id"
                    size="small"
                    dataSource={insights?.action_items || []}
                    columns={actionColumns}
                    pagination={false}
                    locale={{ emptyText: '暂无行动项' }}
                  />
                </ProCard>
                <ProCard
                  title="决策事项"
                  extra={
                    <Button type="link" icon={<PlusOutlined />} onClick={() => openDecisionModal()}>
                      新增决策
                    </Button>
                  }
                >
                  <Table<MeetingDecisionItem>
                    rowKey="id"
                    size="small"
                    dataSource={insights?.decision_items || []}
                    columns={decisionColumns}
                    pagination={false}
                    locale={{ emptyText: '暂无决策记录' }}
                  />
                </ProCard>
              </ProCard>
            </>
          )}
        </Spin>
      </ProCard>

      <Modal
        title="生成结构化会议纪要"
        open={generateModalVisible}
        onCancel={() => setGenerateModalVisible(false)}
        onOk={handleGenerate}
        okText="开始生成"
        okButtonProps={{ loading: generating, disabled: !selectedMeetingId }}
        width={720}
      >
        {renderGenerateContent()}
      </Modal>

      <Modal
        title={editingAction ? '编辑行动项' : '新增行动项'}
        open={actionModalVisible}
        onCancel={() => setActionModalVisible(false)}
        onOk={submitActionItem}
        okButtonProps={{ disabled: !selectedMeetingId }}
        destroyOnClose
      >
        <Form<ActionFormValues> form={actionForm} layout="vertical">
          <Form.Item
            name="description"
            label="行动内容"
            rules={[{ required: true, message: '请填写行动项内容' }]}
          >
            <TextArea rows={3} placeholder="例如：收集下周产品发布所需素材" />
          </Form.Item>
          <Form.Item name="owner" label="负责人">
            <Input placeholder="请输入负责人" />
          </Form.Item>
          <Form.Item name="due_date" label="截止日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              options={actionStatusOptions.map((item) => ({
                label: item.label,
                value: item.value,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingDecision ? '编辑决策事项' : '新增决策事项'}
        open={decisionModalVisible}
        onCancel={() => setDecisionModalVisible(false)}
        onOk={submitDecision}
        okButtonProps={{ disabled: !selectedMeetingId }}
        destroyOnClose
      >
        <Form<DecisionFormValues> form={decisionForm} layout="vertical">
          <Form.Item
            name="description"
            label="决策内容"
            rules={[{ required: true, message: '请填写决策内容' }]}
          >
            <TextArea rows={4} placeholder="例如：优先推进 A 项目的上线排期" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default MeetingMinutes;
