import { request } from '@umijs/max';

interface RawKnowledgeItem {
  id: number;
  original_name?: string;
  originalName?: string;
  url: string;
  mime_type?: string;
  mimeType?: string;
  size?: number;
  tags?: string[] | null;
  created_at?: string;
  createdAt?: string;
  base_id?: number | null;
  baseId?: number | null;
  status?: string | null;
  error_msg?: string | null;
  errorMsg?: string | null;
  doc_id?: string | null;
  docId?: string | null;
  chunk_count?: number | null;
  chunkCount?: number | null;
}

interface RawKnowledgeBase {
  id: number;
  name: string;
  key?: string | null;
  description?: string | null;
  item_count?: number | null;
  itemCount?: number | null;
  total_size?: number | null;
  totalSize?: number | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface KnowledgeItem {
  id: number;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  tags: string[];
  createdAt: string;
  baseId?: number;
  status?: string;
  errorMsg?: string;
  docId?: string;
  chunkCount?: number;
}

export interface KnowledgeBase {
  id: number;
  name: string;
  key?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  itemCount?: number;
  totalSize?: number;
}

const normalizeKnowledgeItem = (raw: RawKnowledgeItem): KnowledgeItem => {
  const tags = Array.isArray(raw.tags) ? raw.tags : [];
  const baseId = raw.baseId ?? raw.base_id;
  const errorMsg = raw.errorMsg ?? raw.error_msg;
  const docId = raw.docId ?? raw.doc_id;
  const chunkCount = raw.chunkCount ?? raw.chunk_count;
  return {
    id: raw.id,
    originalName: raw.originalName ?? raw.original_name ?? '',
    url: raw.url,
    mimeType: raw.mimeType ?? raw.mime_type ?? '',
    size: raw.size ?? 0,
    tags,
    createdAt: raw.createdAt ?? raw.created_at ?? '',
    baseId: typeof baseId === 'number' ? baseId : undefined,
    status: raw.status ?? undefined,
    errorMsg: typeof errorMsg === 'string' ? errorMsg : undefined,
    docId: typeof docId === 'string' ? docId : undefined,
    chunkCount: typeof chunkCount === 'number' ? chunkCount : undefined,
  };
};

const normalizeKnowledgeBase = (raw: RawKnowledgeBase): KnowledgeBase => ({
  id: raw.id,
  name: raw.name,
  key: raw.key ?? undefined,
  description: raw.description ?? undefined,
  createdAt: raw.createdAt ?? raw.created_at ?? undefined,
  updatedAt: raw.updatedAt ?? raw.updated_at ?? undefined,
  itemCount: raw.itemCount ?? raw.item_count ?? undefined,
  totalSize: raw.totalSize ?? raw.total_size ?? undefined,
});

export const knowledgeService = {
  async upload(file: File, tags: string[], baseId?: number): Promise<KnowledgeItem> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tags', JSON.stringify(tags || []));
    if (typeof baseId === 'number') {
      formData.append('baseId', String(baseId));
    }

    const res = await request<RawKnowledgeItem>('/api/knowledge/upload', {
      method: 'POST',
      data: formData,
      requestType: 'form',
    });

    return normalizeKnowledgeItem(res);
  },

  async list(tag?: string, baseId?: number): Promise<KnowledgeItem[]> {
    const res = await request<RawKnowledgeItem[]>('/api/knowledge/items', {
      method: 'GET',
      params: { tag, baseId },
    });
    return (res || []).map(normalizeKnowledgeItem);
  },

  async remove(id: number): Promise<void> {
    await request(`/api/knowledge/items/${id}`, {
      method: 'DELETE',
    });
  },

  async moveItem(id: number, targetBaseId: number): Promise<void> {
    await request(`/api/knowledge/items/${id}/move`, {
      method: 'POST',
      data: { target_base_id: targetBaseId },
    });
  },

  async moveBatch(itemIds: number[], targetBaseId: number): Promise<{ moved: number }> {
    const res = await request<{ data?: { moved?: number } }>('/api/knowledge/items/move', {
      method: 'POST',
      data: { item_ids: itemIds, target_base_id: targetBaseId },
    });
    return { moved: res?.data?.moved ?? 0 };
  },

  async listBases(): Promise<KnowledgeBase[]> {
    const res = await request<RawKnowledgeBase[]>('/api/knowledge/bases', {
      method: 'GET',
    });
    return (res || []).map(normalizeKnowledgeBase);
  },

  async createBase(payload: { name: string; key?: string; description?: string }): Promise<KnowledgeBase> {
    const res = await request<RawKnowledgeBase>('/api/knowledge/bases', {
      method: 'POST',
      data: payload,
    });
    return normalizeKnowledgeBase(res);
  },

  async updateBase(
    id: number,
    payload: Partial<{ name: string; key: string; description: string }>,
  ): Promise<KnowledgeBase> {
    const res = await request<RawKnowledgeBase>(`/api/knowledge/bases/${id}`, {
      method: 'PATCH',
      data: payload,
    });
    return normalizeKnowledgeBase(res);
  },

  async deleteBase(id: number): Promise<void> {
    await request(`/api/knowledge/bases/${id}`, {
      method: 'DELETE',
    });
  },
};

export default knowledgeService;
