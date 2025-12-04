import { request } from '@umijs/max';

const CONVERSATION_API_PREFIX = '/api/conversations';

export type FeedbackType = 'upvote' | 'downvote' | 'neutral';

export interface ConversationSource {
  id?: string;
  title?: string;
  url?: string;
  snippet?: string;
  metadata?: Record<string, any>;
}

export interface ConversationMessage {
  id?: string;
  role: string;
  content: string;
  createdAt?: string;
  tokenUsage?: number;
  metadata?: Record<string, any>;
  sources?: ConversationSource[];
}

export interface ConversationSummary {
  id: string;
  title?: string;
  summary?: string;
  createdAt?: string;
  updatedAt?: string;
  lastMessagePreview?: string;
  messageCount?: number;
  tags?: string[];
  vectorScore?: number;
  metadata?: Record<string, any>;
}

export interface ConversationFeedback {
  type?: FeedbackType;
  weight?: number;
  comment?: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export interface ConversationDetail extends ConversationSummary {
  userId?: string;
  conversationId?: string;
  feedback?: ConversationFeedback;
  messages: ConversationMessage[];
  extra?: Record<string, any>;
}

export interface ConversationListQuery {
  keyword?: string;
  page?: number;
  pageSize?: number;
  tags?: string[];
  orderBy?: 'latest' | 'oldest' | 'score';
}

export interface ConversationListResult {
  items: ConversationSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SaveConversationPayload {
  conversationId?: string;
  title?: string;
  summary?: string;
  userId?: string;
  metadata?: Record<string, any>;
  messages: Array<{
    role: string;
    content: string;
    timestamp?: string;
    metadata?: Record<string, any>;
  }>;
}

export interface ConversationFeedbackPayload {
  type: FeedbackType;
  weight?: number;
  comment?: string;
  metadata?: Record<string, any>;
}

export interface ConversationCreateRequest {
  user_id: string;
  query: string;
  answer: string;
  weight?: number;
  liked?: boolean;
}

interface ConversationCreateResponse {
  conv_id: string;
  query: string;
  answer: string;
  weight?: number;
  liked?: boolean;
  created_at?: string;
}

const ensureString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
};

const ensureStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => ensureString(item))
      .filter((item): item is string => Boolean(item));
  }
  if (typeof value === 'string') {
    return value
      .split(/[,#\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const ensureNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const ensureDateString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') {
    const normalized = value > 1e12 ? value : value * 1000;
    const date = new Date(normalized);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return undefined;
};

const ensureArray = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
};

const generateFallbackId = () => `conversation-${Math.random().toString(36).slice(2, 10)}`;

const normalizeMessage = (raw: any): ConversationMessage => {
  const id = ensureString(
    raw?.id || raw?.message_id || raw?.messageId || raw?.uuid,
  );
  const role = raw?.role || raw?.speaker || 'assistant';
  const content = ensureString(raw?.content || raw?.text || raw?.answer) || '';
  const createdAt = ensureDateString(
    raw?.createdAt || raw?.created_at || raw?.timestamp,
  );
  const tokenUsage = ensureNumber(
    raw?.tokenUsage || raw?.token_usage || raw?.tokens,
  );
  const metadata = raw?.metadata || raw?.meta || undefined;
  const sources = ensureArray(raw?.sources || raw?.citations).map(
    (source: any): ConversationSource => ({
      id: ensureString(source?.id || source?.doc_id || source?.documentId),
      title: ensureString(source?.title || source?.name),
      url: ensureString(source?.url || source?.link),
      snippet: ensureString(source?.snippet || source?.text),
      metadata: source?.metadata || source?.meta || undefined,
    }),
  );
  return {
    id,
    role,
    content,
    createdAt,
    tokenUsage,
    metadata,
    sources,
  };
};

const normalizeFeedback = (raw: any): ConversationFeedback | undefined => {
  if (!raw) return undefined;
  const type = raw?.type || raw?.feedback_type || raw?.feedbackType;
  const weight = ensureNumber(raw?.weight || raw?.score || raw?.rating);
  const comment = ensureString(raw?.comment || raw?.note || raw?.remark);
  const updatedAt = ensureDateString(
    raw?.updatedAt || raw?.updated_at || raw?.timestamp,
  );
  const metadata = raw?.metadata || raw?.meta || undefined;
  return {
    type,
    weight,
    comment,
    updatedAt,
    metadata,
  };
};

const normalizeConversationSummary = (raw: any): ConversationSummary => {
  const conversationId = ensureString(
    raw?.conversation_id || raw?.conversationId || raw?.conv_id,
  );
  const baseId = ensureString(raw?.id);
  const id = baseId || conversationId || generateFallbackId();
  const title =
    ensureString(raw?.title || raw?.name) || `会话 ${id.slice(-6)}`;
  const summary = ensureString(raw?.summary || raw?.description);
  const createdAt = ensureDateString(
    raw?.createdAt || raw?.created_at || raw?.created_time,
  );
  const updatedAt = ensureDateString(
    raw?.updatedAt || raw?.updated_at || raw?.last_activity,
  );
  const messageCount = ensureNumber(
    raw?.messageCount || raw?.messages_count || raw?.messagesCount,
  );
  const lastMessagePreview = ensureString(
    raw?.lastMessage || raw?.last_message || raw?.preview,
  );
  const tags = ensureStringArray(raw?.tags);
  const vectorScore = ensureNumber(
    raw?.vectorScore || raw?.score || raw?.similarity,
  );
  const metadata = raw?.metadata || raw?.meta || undefined;

  return {
    id,
    title,
    summary,
    createdAt,
    updatedAt,
    messageCount,
    lastMessagePreview,
    tags,
    vectorScore,
    metadata,
  };
};

const normalizeConversationDetail = (raw: any): ConversationDetail => {
  const summary = normalizeConversationSummary(raw);
  const messages = ensureArray(raw?.messages || raw?.history).map((msg) =>
    normalizeMessage(msg),
  );
  const feedback = normalizeFeedback(raw?.feedback || raw?.latestFeedback);
  const userId = ensureString(raw?.userId || raw?.user_id);
  const conversationId =
    ensureString(raw?.conversation_id || raw?.conversationId) || summary.id;
  const extra =
    raw?.extra || raw?.additionalInfo || raw?.debug_info || undefined;

  return {
    ...summary,
    userId,
    conversationId,
    messages,
    feedback,
    extra,
  };
};

const unwrapData = <T>(response: any): T => {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data as T;
  }
  return response as T;
};

export const conversationService = {
  async list(params?: ConversationListQuery): Promise<ConversationListResult> {
    const resp = await request(`/api/conversations`, {
      method: 'GET',
      params,
    });
    const data: any = unwrapData(resp);
    const itemsSource = Array.isArray(data?.items)
      ? data?.items
      : Array.isArray(data?.results)
        ? data?.results
        : Array.isArray(data?.data)
          ? data?.data
          : Array.isArray(resp?.data)
            ? resp?.data
            : Array.isArray(resp)
              ? resp
              : [];

    const items = itemsSource.map((item: any) =>
      normalizeConversationSummary(item),
    );

    const total =
      ensureNumber(
        data?.total || data?.count || resp?.total || itemsSource.length,
      ) || itemsSource.length;

    const page =
      ensureNumber(data?.page || data?.current) || params?.page || 1;
    const pageSize =
      ensureNumber(data?.pageSize || data?.page_size) || params?.pageSize || 10;

    return {
      items,
      total,
      page,
      pageSize,
    };
  },

  async get(conversationId: string): Promise<ConversationDetail> {
    const resp = await request(`${CONVERSATION_API_PREFIX}/${conversationId}`, {
      method: 'GET',
    });
    const data = unwrapData(resp);
    return normalizeConversationDetail(data);
  },

  async save(payload: SaveConversationPayload): Promise<ConversationDetail> {
    const resp = await request(CONVERSATION_API_PREFIX, {
      method: 'POST',
      data: payload,
    });
    const data = unwrapData(resp);
    return normalizeConversationDetail(data);
  },

  async create(payload: ConversationCreateRequest): Promise<ConversationSummary> {
    const resp = await request(CONVERSATION_API_PREFIX, {
      method: 'POST',
      data: payload,
    });
    const data = unwrapData<ConversationCreateResponse>(resp);
    return normalizeConversationSummary({
      ...data,
      title: payload.query,
      lastMessage: payload.answer,
    });
  },

  async feedback(
    conversationId: string,
    payload: ConversationFeedbackPayload,
  ): Promise<void> {
    await request(`${CONVERSATION_API_PREFIX}/${conversationId}/feedback`, {
      method: 'POST',
      data: payload,
    });
  },
};

export default conversationService;
