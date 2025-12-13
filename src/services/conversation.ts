import { request } from '@umijs/max';

const CONVERSATION_API_PREFIX = '/api/conversations';

export type FeedbackType = 'upvote' | 'downvote' | 'neutral';

export interface ConversationMessage {
  id: string;
  role: 'query' | 'answer';
  content: string;
  createdAt?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  query: string;
  answer: string;
  summary?: string;
  createdAt?: string;
  updatedAt?: string;
  lastMessagePreview?: string;
  messageCount?: number;
  weight?: number;
  liked?: boolean;
  vectorScore?: number;
  tags?: string[];
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ConversationMessage[];
  conversationId?: string;
  extra?: Record<string, any>;
}

export interface ConversationListQuery {
  page?: number;
  pageSize?: number;
}

export interface ConversationListResult {
  items: ConversationSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ConversationSearchParams {
  query: string;
  topK?: number;
}

export interface ConversationFeedbackPayload {
  liked?: boolean;
  weightDelta?: number;
}

const ensureString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
};

const ensureNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const ensureStringArray = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    const result = value
      .map((item) => ensureString(item))
      .filter((item): item is string => Boolean(item));
    return result.length ? result : undefined;
  }
  if (typeof value === 'string') {
    const items = value
      .split(/[,#\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length ? items : undefined;
  }
  return undefined;
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

const generateFallbackId = () =>
  `conversation-${Math.random().toString(36).slice(2, 10)}`;

const buildMessages = (
  id: string,
  query: string,
  answer: string,
  createdAt?: string,
): ConversationMessage[] => {
  const timestamp = createdAt;
  const messages: ConversationMessage[] = [];
  if (query) {
    messages.push({
      id: `${id}-query`,
      role: 'query',
      content: query,
      createdAt: timestamp,
    });
  }
  if (answer) {
    messages.push({
      id: `${id}-answer`,
      role: 'answer',
      content: answer,
      createdAt: timestamp,
    });
  }
  return messages;
};

const normalizeConversationSummary = (raw: any): ConversationSummary => {
  const conversationId =
    ensureString(raw?.conv_id || raw?.conversation_id || raw?.id) ||
    generateFallbackId();
  const query = ensureString(raw?.query) || '';
  const answer = ensureString(raw?.answer) || '';
  const createdAt = ensureDateString(raw?.created_at || raw?.createdAt);
  const updatedAt = ensureDateString(raw?.updated_at || raw?.updatedAt) || createdAt;
  const title =
    query.trim().slice(0, 30) ||
    `会话 ${conversationId.slice(-6)}`;
  const summary =
    answer.trim().slice(0, 100) || undefined;
  const weight = ensureNumber(raw?.weight);
  const liked =
    typeof raw?.liked === 'boolean' ? Boolean(raw?.liked) : undefined;
  const vectorScore = ensureNumber(raw?.score);
  const tags = ensureStringArray(raw?.tags);
  const userId = ensureString(raw?.user_id || raw?.userId);
  const metadata =
    raw?.metadata && typeof raw.metadata === 'object' ? raw.metadata : undefined;

  return {
    id: conversationId,
    title,
    query,
    answer,
    summary,
    createdAt,
    updatedAt,
    messageCount: answer ? 2 : query ? 1 : undefined,
    lastMessagePreview: summary,
    weight,
    liked,
    vectorScore,
    tags,
    userId,
    metadata,
  };
};

const normalizeConversationDetail = (raw: any): ConversationDetail => {
  const summary = normalizeConversationSummary(raw);
  const messages = buildMessages(
    summary.id,
    summary.query,
    summary.answer,
    summary.createdAt,
  );

  return {
    ...summary,
    messages,
    conversationId: summary.id,
    extra: raw?.extra && typeof raw.extra === 'object' ? raw.extra : undefined,
  };
};

const unwrapData = <T>(response: any): T => {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data as T;
  }
  return response as T;
};

export const conversationService = {
  async list(params: ConversationListQuery = {}): Promise<ConversationListResult> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 10;
    const resp = await request(CONVERSATION_API_PREFIX, {
      method: 'GET',
      params: {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      },
    });
    const payload = unwrapData<any>(resp);
    const source = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.items)
        ? payload.items
        : [];
    const items = source.map((item: any) => normalizeConversationSummary(item));

    return {
      items,
      total: items.length,
      page,
      pageSize,
    };
  },

  async search(params: ConversationSearchParams): Promise<ConversationSummary[]> {
    const resp = await request(`${CONVERSATION_API_PREFIX}/search`, {
      method: 'POST',
      data: {
        query: params.query,
        top_k: params.topK ?? 10,
      },
    });
    const payload = unwrapData<any>(resp);
    const source = Array.isArray(payload) ? payload : [];
    return source.map((item: any) => normalizeConversationSummary(item));
  },

  async get(conversationId: string): Promise<ConversationDetail> {
    const resp = await request(`${CONVERSATION_API_PREFIX}/${conversationId}`, {
      method: 'GET',
    });
    const data = unwrapData(resp);
    return normalizeConversationDetail(data);
  },

  async feedback(
    conversationId: string,
    payload: ConversationFeedbackPayload,
  ): Promise<void> {
    await request(`${CONVERSATION_API_PREFIX}/${conversationId}/feedback`, {
      method: 'PATCH',
      data: {
        liked: payload.liked,
        weight_delta: payload.weightDelta,
      },
    });
  },
};

export default conversationService;
