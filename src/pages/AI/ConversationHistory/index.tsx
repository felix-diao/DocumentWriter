import {
  DislikeOutlined,
  LikeOutlined,
  MessageOutlined,
  ReloadOutlined,
  SearchOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Descriptions,
  Divider,
  Empty,
  Input,
  InputNumber,
  List,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  ConversationDetail,
  ConversationMessage,
  ConversationSummary,
  FeedbackType,
} from '@/services/conversation';
import conversationService from '@/services/conversation';

const { Text, Paragraph } = Typography;

const DEFAULT_PAGE_SIZE = 10;

interface LoadListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  refreshDetail?: boolean;
}

const formatDateTime = (value?: string) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';

const roleColorMap: Record<string, string> = {
  query: 'blue',
  answer: 'green',
};

const mapLikedToFeedbackType = (value?: boolean): FeedbackType => {
  if (value === true) return 'upvote';
  if (value === false) return 'downvote';
  return 'neutral';
};

const ConversationHistoryPage: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
  });
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('upvote');
  const [feedbackWeight, setFeedbackWeight] = useState<number>(1);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const selectedIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const loadDetail = useCallback(async (conversationId: string) => {
    if (!conversationId) return;
    setDetailLoading(true);
    try {
      const data = await conversationService.get(conversationId);
      setDetail(data);
      setFeedbackType(mapLikedToFeedbackType(data.liked));
      if (typeof data.weight === 'number') {
        setFeedbackWeight(Number(data.weight.toFixed(2)));
      } else {
        setFeedbackWeight(0.8);
      }
    } catch (error) {
      console.error(error);
      message.error('加载会话详情失败');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadList = useCallback(
    async ({
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      keyword,
      refreshDetail = false,
    }: LoadListParams = {}) => {
      setListLoading(true);
      const trimmedKeyword = keyword?.trim();

      const updateSelection = async (items: ConversationSummary[]) => {
        if (items.length === 0) {
          setSelectedId(undefined);
          setDetail(null);
          return;
        }

        const currentSelected = selectedIdRef.current;
        const exists =
          currentSelected && items.some((item) => item.id === currentSelected);
        const nextId = exists ? currentSelected : items[0]?.id;

        if (!nextId) return;

        if (!exists) {
          setSelectedId(nextId);
          await loadDetail(nextId);
        } else if (refreshDetail) {
          await loadDetail(nextId);
        }
      };

      try {
        if (trimmedKeyword) {
          const searchResults = await conversationService.search({
            query: trimmedKeyword,
            topK: pageSize,
          });
          setConversations(searchResults);
          setPagination({
            current: 1,
            pageSize,
            total: searchResults.length,
          });
          await updateSelection(searchResults);
        } else {
          const res = await conversationService.list({
            page,
            pageSize,
          });
          setConversations(res.items);
          const total =
            res.items.length < pageSize
              ? (page - 1) * pageSize + res.items.length
              : page * pageSize + 1;
          setPagination({
            current: res.page,
            pageSize: res.pageSize,
            total,
          });
          await updateSelection(res.items);
        }
      } catch (error) {
        console.error(error);
        message.error('加载会话列表失败');
      } finally {
        setListLoading(false);
      }
    },
    [loadDetail],
  );

  useEffect(() => {
    loadList({ page: 1, pageSize: DEFAULT_PAGE_SIZE, refreshDetail: true });
  }, [loadList]);

  const handleSearch = () => {
    loadList({
      page: 1,
      pageSize: pagination.pageSize,
      keyword: searchKeyword,
      refreshDetail: true,
    });
  };

  const handleRefresh = () => {
    loadList({
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: searchKeyword,
      refreshDetail: true,
    });
  };

  const handleSelectConversation = (conversationId: string) => {
    if (!conversationId || conversationId === selectedId) return;
    setSelectedId(conversationId);
    loadDetail(conversationId);
  };

  const handleFeedbackSubmit = async () => {
    if (!selectedId || !detail) {
      message.warning('请选择需要反馈的会话');
      return;
    }
    const payload: {
      liked?: boolean;
      weightDelta?: number;
    } = {};

    if (feedbackType === 'upvote') {
      payload.liked = true;
    } else if (feedbackType === 'downvote') {
      payload.liked = false;
    }

    if (typeof feedbackWeight === 'number' && typeof detail.weight === 'number') {
      const delta = Number((feedbackWeight - detail.weight).toFixed(4));
      if (Math.abs(delta) >= 0.0001) {
        payload.weightDelta = delta;
      }
    }

    if (payload.liked === undefined && payload.weightDelta === undefined) {
      message.warning('请调整点赞状态或权重后再提交');
      return;
    }

    setSubmittingFeedback(true);
    try {
      await conversationService.feedback(selectedId, payload);
      message.success('反馈已提交');
      await loadDetail(selectedId);
      await loadList({
        page: searchKeyword.trim() ? 1 : pagination.current,
        pageSize: pagination.pageSize,
        keyword: searchKeyword,
      });
    } catch (error) {
      console.error(error);
      message.error('提交反馈失败');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const renderMessage = (messageItem: ConversationMessage, index: number) => (
    <Card
      key={`${messageItem.id || index}-${messageItem.role}-${index}`}
      type="inner"
      size="small"
      style={{
        marginBottom: 12,
        borderColor:
          messageItem.role === 'query'
            ? '#d9d9d9'
            : 'rgba(22, 119, 255, 0.3)',
        background:
          messageItem.role === 'query'
            ? '#fff'
            : 'rgba(22, 119, 255, 0.03)',
      }}
      title={
        <Space size="small" align="center">
          <Tag color={roleColorMap[messageItem.role] || 'default'}>
            {messageItem.role}
          </Tag>
          <Text type="secondary">
            {formatDateTime(messageItem.createdAt)}
          </Text>
        </Space>
      }
    >
      <Paragraph
        copyable={{ text: messageItem.content }}
        style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}
      >
        {messageItem.content || '（暂无内容）'}
      </Paragraph>
      {messageItem.sources && messageItem.sources.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Text type="secondary">引用来源</Text>
          <List
            size="small"
            dataSource={messageItem.sources}
            renderItem={(source) => (
              <List.Item style={{ padding: '4px 0' }}>
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                  <Text strong>{source.title || source.id}</Text>
                  {source.snippet && (
                    <Text type="secondary" style={{ whiteSpace: 'pre-wrap' }}>
                      {source.snippet}
                    </Text>
                  )}
                  {source.url && (
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.url}
                    </a>
                  )}
                </Space>
              </List.Item>
            )}
          />
        </div>
      )}
    </Card>
  );

  const metaInfo = useMemo(() => {
    if (!detail?.metadata) return [];
    return Object.entries(detail.metadata);
  }, [detail?.metadata]);

  return (
    <PageContainer
      header={{
        title: '会话历史',
        breadcrumb: undefined,
      }}
    >
      <ProCard split="vertical" gutter={16}>
        <ProCard
          title={
            <Space>
              <MessageOutlined />
              会话列表
            </Space>
          }
          colSpan="38%"
          extra={
            <Space size={8}>
              <Input
                allowClear
                placeholder="搜索关键词或标签"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onPressEnter={handleSearch}
                size="small"
                style={{ width: 200 }}
              />
              <Button
                size="small"
                icon={<SearchOutlined />}
                onClick={handleSearch}
              >
                搜索
              </Button>
              <Tooltip title="刷新列表">
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                />
              </Tooltip>
            </Space>
          }
          bodyStyle={{ paddingRight: 8 }}
        >
          {conversations.length === 0 && !listLoading ? (
            <Empty description="暂无会话数据" style={{ marginTop: 40 }} />
          ) : (
            <List
              size="small"
              dataSource={conversations}
              loading={listLoading}
              rowKey={(item) => item.id}
              pagination={
                searchKeyword.trim()
                  ? false
                  : {
                      current: pagination.current,
                      pageSize: pagination.pageSize,
                      total: pagination.total,
                      size: 'small',
                      hideOnSinglePage: pagination.total <= pagination.pageSize,
                      onChange: (page, pageSize) =>
                        loadList({
                          page,
                          pageSize,
                          keyword: searchKeyword,
                          refreshDetail: true,
                        }),
                    }
              }
              renderItem={(item) => (
                <List.Item
                  style={{
                    cursor: 'pointer',
                    padding: '8px 0',
                  }}
                  onClick={() => handleSelectConversation(item.id)}
                >
                  <div
                    style={{
                      borderRadius: 8,
                      padding: 12,
                      border:
                        item.id === selectedId
                          ? '1px solid var(--ant-color-primary)'
                          : '1px solid var(--ant-color-border-secondary)',
                      background:
                        item.id === selectedId
                          ? 'rgba(22,119,255,0.06)'
                          : '#fff',
                      width: '100%',
                    }}
                  >
                    <Space
                      align="center"
                      style={{ width: '100%', marginBottom: 8 }}
                    >
                      <Text strong>{item.title}</Text>
                      {item.vectorScore !== undefined && (
                        <Tag color="processing">
                          Score: {item.vectorScore.toFixed(3)}
                        </Tag>
                      )}
                      {item.tags?.map((tag) => (
                        <Tag key={`${item.id}-${tag}`} color="blue">
                          {tag}
                        </Tag>
                      ))}
                      <Space
                        style={{ marginLeft: 'auto' }}
                        size={4}
                        align="center"
                      >
                        <UserOutlined />
                        <Text type="secondary">
                          {formatDateTime(item.updatedAt || item.createdAt)}
                        </Text>
                      </Space>
                    </Space>
                    <Paragraph
                      type="secondary"
                      ellipsis={{ rows: 2 }}
                      style={{ marginBottom: 0 }}
                    >
                      {item.lastMessagePreview ||
                        item.summary ||
                        '暂无摘要'}
                    </Paragraph>
                  </div>
                </List.Item>
              )}
            />
          )}
        </ProCard>
        <ProCard
          title="会话详情"
          colSpan="62%"
          loading={detailLoading && !!selectedId}
          extra={
            detail && (
              <Space size="small">
                <Tag color={detail.liked ? 'green' : 'default'}>
                  {detail.liked ? '已点赞' : '未点赞'}
                </Tag>
                {typeof detail.weight === 'number' && (
                  <Tag color="blue">权重：{detail.weight.toFixed(2)}</Tag>
                )}
              </Space>
            )
          }
        >
          {!selectedId ? (
            <Empty description="请选择左侧会话查看详情" style={{ margin: '48px 0' }} />
          ) : !detail ? (
            <Spin />
          ) : (
            <>
              <Space
                wrap
                size={[8, 8]}
                style={{ marginBottom: detail.tags?.length ? 16 : 8 }}
              >
                {detail.tags?.map((tag) => (
                  <Tag key={`${detail.id}-${tag}`} color="blue">
                    {tag}
                  </Tag>
                ))}
              </Space>
              <Descriptions size="small" column={2} bordered>
                <Descriptions.Item label="会话 ID" span={2}>
                  {detail.conversationId || detail.id}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {formatDateTime(detail.createdAt)}
                </Descriptions.Item>
                <Descriptions.Item label="更新时间">
                  {formatDateTime(detail.updatedAt)}
                </Descriptions.Item>
                <Descriptions.Item label="消息数">
                  {detail.messages?.length ?? detail.messageCount ?? '-'}
                </Descriptions.Item>
                <Descriptions.Item label="用户">
                  {detail.userId || '未知'}
                </Descriptions.Item>
                <Descriptions.Item label="当前权重">
                  {typeof detail.weight === 'number'
                    ? detail.weight.toFixed(2)
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="点赞状态">
                  {detail.liked ? '已点赞' : '未点赞'}
                </Descriptions.Item>
              </Descriptions>

              <Divider />

              <div style={{ marginBottom: 16 }}>
                <Space align="center" wrap>
                  <Button
                    icon={<LikeOutlined />}
                    type={feedbackType === 'upvote' ? 'primary' : 'default'}
                    onClick={() => setFeedbackType('upvote')}
                    disabled={!selectedId}
                  >
                    点赞
                  </Button>
                  <Button
                    icon={<DislikeOutlined />}
                    type={feedbackType === 'downvote' ? 'primary' : 'default'}
                    onClick={() => setFeedbackType('downvote')}
                    disabled={!selectedId}
                  >
                    点踩
                  </Button>
                  <Button
                    type={feedbackType === 'neutral' ? 'primary' : 'default'}
                    onClick={() => setFeedbackType('neutral')}
                    disabled={!selectedId}
                  >
                    中立
                  </Button>
                  <InputNumber
                    value={feedbackWeight}
                    min={0.1}
                    max={1}
                    step={0.05}
                    onChange={(value) =>
                      setFeedbackWeight(
                        typeof value === 'number' ? value : feedbackWeight,
                      )
                    }
                    disabled={!selectedId}
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleFeedbackSubmit}
                    loading={submittingFeedback}
                    disabled={!selectedId}
                  >
                    提交反馈
                  </Button>
                </Space>
              </div>

              <div
                style={{
                  maxHeight: '60vh',
                  overflowY: 'auto',
                  paddingRight: 8,
                }}
              >
                {detail.messages && detail.messages.length > 0 ? (
                  detail.messages.map((messageItem, index) =>
                    renderMessage(messageItem, index),
                  )
                ) : (
                  <Empty description="暂无消息" />
                )}
              </div>

              {(metaInfo.length > 0 || detail.extra) && (
                <>
                  <Divider />
                  {metaInfo.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <Text strong>元数据</Text>
                      <List
                        size="small"
                        dataSource={metaInfo}
                        renderItem={([key, value]) => (
                          <List.Item>
                            <Space align="start">
                              <Text type="secondary">{key}:</Text>
                              <Text>
                                {typeof value === 'object'
                                  ? JSON.stringify(value, null, 2)
                                  : String(value)}
                              </Text>
                            </Space>
                          </List.Item>
                        )}
                      />
                    </div>
                  )}
                  {detail.extra && (
                    <div>
                      <Text strong>附加信息</Text>
                      <pre
                        style={{
                          background: '#f5f5f5',
                          padding: 12,
                          borderRadius: 6,
                          overflowX: 'auto',
                        }}
                      >
                        {JSON.stringify(detail.extra, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </ProCard>
      </ProCard>
    </PageContainer>
  );
};

export default ConversationHistoryPage;
