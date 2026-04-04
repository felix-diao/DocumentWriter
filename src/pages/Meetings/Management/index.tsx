import {
  AudioOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileTextOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd/es/upload';
import type { UploadRequestOption as RcCustomRequestOptions } from 'rc-upload/lib/interface';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useEffect, useState } from 'react';
import { history } from '@umijs/max';
import meetingsApi, {
  type LocalMeetingAudio,
  type Meeting,
  type MeetingPayload,
} from '@/services/meetings';

const { Paragraph, Text } = Typography;
const { TextArea } = Input;

interface MeetingFormValues extends Omit<MeetingPayload, 'date'> {
  date: Dayjs;
}

const statusMeta: Record<string, { label: string; color: string }> = {
  created: { label: '已创建', color: 'default' },
  scheduled: { label: '已排期', color: 'processing' },
  ongoing: { label: '进行中', color: 'blue' },
  finished: { label: '已完成', color: 'green' },
  cancelled: { label: '已取消', color: 'red' },
};

const MeetingManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [audios, setAudios] = useState<LocalMeetingAudio[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<MeetingFormValues>();

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const data = await meetingsApi.list();
      setMeetings(data);
    } catch (error: any) {
      message.error(error?.message || '加载会议列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMeetings();
  }, []);

  const loadAudios = async (meetingId: number) => {
    setAssetsLoading(true);
    try {
      const data = await meetingsApi.listLocalAudios(meetingId);
      setAudios(data);
    } catch (error: any) {
      message.error(error?.message || '加载本地音频失败');
    } finally {
      setAssetsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMeeting) {
      void loadAudios(selectedMeeting.id);
    }
  }, [selectedMeeting]);

  const openCreateModal = () => {
    setEditingMeeting(null);
    form.resetFields();
    form.setFieldsValue({
      date: dayjs(),
      status: 'created',
    } as MeetingFormValues);
    setModalVisible(true);
  };

  const openEditModal = (record: Meeting) => {
    setEditingMeeting(record);
    form.setFieldsValue({
      ...record,
      date: dayjs(record.date),
    } as MeetingFormValues);
    setModalVisible(true);
  };

  const handleSaveMeeting = async () => {
    const values = await form.validateFields();
    const payload: MeetingPayload = {
      title: values.title,
      date: values.date?.toISOString(),
      location: values.location,
      host: values.host,
      participants: values.participants,
      content_text: values.content_text,
      meeting_url: values.meeting_url,
      status: values.status,
    };

    setSaving(true);
    try {
      if (editingMeeting) {
        await meetingsApi.update(editingMeeting.id, payload);
        message.success('会议更新成功');
        if (selectedMeeting?.id === editingMeeting.id) {
          const detail = await meetingsApi.detail(editingMeeting.id);
          setSelectedMeeting(detail);
        }
      } else {
        await meetingsApi.create(payload);
        message.success('会议创建成功');
      }
      setModalVisible(false);
      await fetchMeetings();
    } catch (error: any) {
      message.error(error?.message || '保存会议失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMeeting = (record: Meeting) => {
    Modal.confirm({
      title: `确定删除会议「${record.title}」吗？`,
      content: '会议及其相关音频都会被清理，操作不可恢复。',
      okButtonProps: { danger: true },
      onOk: async () => {
        setLoading(true);
        try {
          await meetingsApi.remove(record.id);
          message.success('会议删除成功');
          if (selectedMeeting?.id === record.id) {
            setSelectedMeeting(null);
            setAudios([]);
          }
          await fetchMeetings();
        } catch (error: any) {
          message.error(error?.message || '删除会议失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const openMeetingDrawer = async (record: Meeting) => {
    try {
      const detail = await meetingsApi.detail(record.id);
      setSelectedMeeting(detail);
    } catch {
      setSelectedMeeting(record);
    }
  };

  const handleAudioUpload = async (options: RcCustomRequestOptions) => {
    if (!selectedMeeting) return;
    const { file, onSuccess, onError } = options;
    try {
      await meetingsApi.uploadAudios(selectedMeeting.id, [file as File]);
      message.success('音频上传成功');
      await loadAudios(selectedMeeting.id);
      onSuccess?.('ok' as any);
    } catch (error: any) {
      message.error(error?.message || '音频上传失败');
      onError?.(error);
    }
  };

  const handleDownloadBlob = async (getBlob: () => Promise<{ blob: Blob; filename: string }>) => {
    try {
      const { blob, filename } = await getBlob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      message.error(error?.message || '下载失败，请稍后重试');
    }
  };

  const handleDownloadAudio = (audio: LocalMeetingAudio) => {
    void handleDownloadBlob(() => meetingsApi.downloadLocalAudio(audio.meeting_id, audio.id));
  };

  const audioUploadProps: UploadProps = {
    name: 'audio',
    multiple: true,
    showUploadList: false,
    accept: '.mp3,.wav,.m4a,.flac,.aac,.ogg',
    customRequest: handleAudioUpload,
    disabled: !selectedMeeting,
  };

  const renderStatusTag = (status?: string) => {
    if (!status) return <Tag>未指定</Tag>;
    const meta = statusMeta[status] || { label: status, color: 'default' };
    return <Tag color={meta.color}>{meta.label}</Tag>;
  };

  const renderAudioStatusTag = (status?: string | null) => {
    if (!status) return <Tag>未知</Tag>;
    if (status === 'failed') return <Tag color="red">失败</Tag>;
    if (status === 'uploaded') return <Tag color="green">已上传</Tag>;
    return <Tag color="processing">{status}</Tag>;
  };

  const actionToMinutes = (meetingId: number) => {
    history.push(`/meetings/minutes?meetingId=${meetingId}`);
  };

  const columns: ColumnsType<Meeting> = [
    {
      title: '会议标题',
      width: 220,
      dataIndex: 'title',
      render: (value: string) => (
        <Typography.Text strong ellipsis={{ tooltip: value }}>
          {value}
        </Typography.Text>
      ),
    },
    {
      title: '会议时间',
      width: 170,
      dataIndex: 'date',
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '地点',
      width: 220,
      dataIndex: 'location',
      ellipsis: true,
    },
    {
      title: '主持人',
      width: 120,
      dataIndex: 'host',
      ellipsis: true,
    },
    {
      title: '会议状态',
      width: 120,
      dataIndex: 'status',
      render: (value: string) => renderStatusTag(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 340,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button size="small" onClick={() => openEditModal(record)} icon={<EditOutlined />}>
            编辑
          </Button>
          <Button
            size="small"
            onClick={() => actionToMinutes(record.id)}
            icon={<FileTextOutlined />}
          >
            纪要
          </Button>
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteMeeting(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const renderDrawerHeader = () => {
    if (!selectedMeeting) return null;
    return (
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {selectedMeeting.title}
          </Typography.Title>
          <Text type="secondary">
            {dayjs(selectedMeeting.date).format('YYYY-MM-DD HH:mm')} · {selectedMeeting.location || '地点待定'}
          </Text>
        </div>
        <Space>
          <Button icon={<FileTextOutlined />} onClick={() => actionToMinutes(selectedMeeting.id)}>
            查看纪要
          </Button>
          <Button type="primary" icon={<EditOutlined />} onClick={() => openEditModal(selectedMeeting)}>
            编辑信息
          </Button>
        </Space>
      </Space>
    );
  };

  const renderAudioList = () => {
    if (!audios.length) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无本地音频记录"
          style={{ marginTop: 32 }}
        />
      );
    }

    return (
      <List
        dataSource={audios}
        itemLayout="vertical"
        renderItem={(item) => (
          <List.Item
            key={item.id}
            actions={[
              <Button
                key="download"
                type="link"
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadAudio(item)}
              >
                下载音频
              </Button>,
              <Popconfirm
                key="delete"
                title="删除音频"
                description="确认删除这段音频吗？"
                onConfirm={async () => {
                  if (!selectedMeeting) return;
                  try {
                    await meetingsApi.deleteLocalAudio(selectedMeeting.id, item.id);
                    message.success('音频已删除');
                    await loadAudios(selectedMeeting.id);
                  } catch (error: any) {
                    message.error(error?.message || '删除音频失败');
                  }
                }}
              >
                <Button type="link" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>,
            ]}
          >
            <List.Item.Meta
              avatar={<AudioOutlined />}
              title={
                <Space>
                  {item.file_name}
                  {renderAudioStatusTag(item.status)}
                </Space>
              }
              description={dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}
            />
            {item.transcript_text ? (
              <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}>
                {item.transcript_text}
              </Paragraph>
            ) : (
              <Text type="secondary">当前后端版本仅保留音频管理；纪要生成与修订请前往“会议纪要”页。</Text>
            )}
          </List.Item>
        )}
      />
    );
  };

  return (
    <PageContainer
      header={{
        title: '',
        subTitle: '',
      }}
    >
      <ProCard ghost>
        <Space style={{ width: '100%', marginBottom: 16, justifyContent: 'space-between' }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              我的会议
            </Typography.Title>
            <Text type="secondary">实时查看会议状态并管理本地音频资料</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void fetchMeetings()} loading={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              新建会议
            </Button>
          </Space>
        </Space>

        <Table<Meeting>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={meetings}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          onRow={(record) => ({
            onDoubleClick: () => {
              void openMeetingDrawer(record);
            },
          })}
        />
      </ProCard>

      <Modal
        title={editingMeeting ? '编辑会议' : '新建会议'}
        open={modalVisible}
        onOk={() => void handleSaveMeeting()}
        okButtonProps={{ loading: saving }}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
        width={680}
      >
        <Form<MeetingFormValues> form={form} layout="vertical">
          <Form.Item name="title" label="会议标题" rules={[{ required: true, message: '请输入会议标题' }]}>
            <Input placeholder="例如：2025年一季度重点项目推进会" />
          </Form.Item>
          <Form.Item
            name="date"
            label="会议时间"
            rules={[{ required: true, message: '请选择会议时间' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="location" label="会议地点">
            <Input placeholder="会议室或线上链接说明" />
          </Form.Item>
          <Form.Item name="meeting_url" label="会议链接">
            <Input placeholder="可填写视频会议链接" suffix={<LinkOutlined />} />
          </Form.Item>
          <Form.Item name="host" label="主持人">
            <Input placeholder="请输入主持人姓名" />
          </Form.Item>
          <Form.Item name="participants" label="参会人员">
            <TextArea rows={2} placeholder="请输入参会部门或成员" />
          </Form.Item>
          <Form.Item name="content_text" label="会议说明">
            <TextArea rows={3} placeholder="主要议题、背景或准备材料说明" />
          </Form.Item>
          <Form.Item name="status" label="会议状态">
            <Select
              allowClear
              placeholder="选择当前状态"
              options={Object.keys(statusMeta).map((key) => ({
                value: key,
                label: statusMeta[key].label,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        open={!!selectedMeeting}
        onClose={() => setSelectedMeeting(null)}
        size="large"
        title={renderDrawerHeader()}
        destroyOnClose
        width={900}
      >
        {selectedMeeting ? (
          <Tabs
            defaultActiveKey="info"
            items={[
              {
                key: 'info',
                label: '基础信息',
                children: (
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="会议时间">
                      {dayjs(selectedMeeting.date).format('YYYY-MM-DD HH:mm')}
                    </Descriptions.Item>
                    <Descriptions.Item label="会议状态">
                      {renderStatusTag(selectedMeeting.status)}
                    </Descriptions.Item>
                    <Descriptions.Item label="会议地点" span={2}>
                      {selectedMeeting.location || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="主持人">{selectedMeeting.host || '—'}</Descriptions.Item>
                    <Descriptions.Item label="会议链接" span={2}>
                      {selectedMeeting.meeting_url ? (
                        <a href={selectedMeeting.meeting_url} target="_blank" rel="noreferrer">
                          {selectedMeeting.meeting_url}
                        </a>
                      ) : (
                        '—'
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="参会人员" span={2}>
                      {selectedMeeting.participants || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="会议简介" span={2}>
                      <Paragraph style={{ marginBottom: 0 }}>
                        {selectedMeeting.content_text || '暂无描述'}
                      </Paragraph>
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'audio',
                label: '本地音频',
                children: (
                  <>
                    <Upload.Dragger {...audioUploadProps} style={{ marginBottom: 24 }}>
                      <p className="ant-upload-drag-icon">
                        <CloudUploadOutlined />
                      </p>
                      <p className="ant-upload-text">上传本地会议录音</p>
                      <p className="ant-upload-hint">
                        支持 MP3/WAV/M4A/FLAC/AAC/OGG；纪要生成与修订请前往“会议纪要”页
                      </p>
                    </Upload.Dragger>
                    <Spin spinning={assetsLoading}>{renderAudioList()}</Spin>
                  </>
                ),
              },
            ]}
          />
        ) : null}
      </Drawer>
    </PageContainer>
  );
};

export default MeetingManagement;
