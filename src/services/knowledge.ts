import axios from 'axios';

export interface KnowledgeItem {
  id: number;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  tags: string[];
  createdAt: string;
}

export const knowledgeService = {
  async upload(file: File, tags: string[], baseId?: number): Promise<KnowledgeItem> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tags', JSON.stringify(tags || []));
    if (typeof baseId === 'number') formData.append('baseId', String(baseId));
    const res = await axios.post('/api/knowledge/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data as KnowledgeItem;
  },

  async list(tag?: string, baseId?: number): Promise<KnowledgeItem[]> {
    const res = await axios.get('/api/knowledge/items', { params: { tag, baseId } });
    return res.data.data as KnowledgeItem[];
  },

  async remove(id: number): Promise<void> {
    await axios.delete(`/api/knowledge/items/${id}`);
  },

  async moveItem(id: number, targetBaseId: number): Promise<void> {
    await axios.post(`/api/knowledge/items/${id}/move`, { targetBaseId });
  },
  async moveBatch(itemIds: number[], targetBaseId: number): Promise<{ moved: number }> {
    const res = await axios.post(`/api/knowledge/items/move`, { itemIds, targetBaseId });
    return res.data.data as { moved: number };
  },

  // Knowledge Bases
  async listBases(): Promise<KnowledgeBase[]> {
    const res = await axios.get('/api/knowledge/bases');
    return res.data.data as KnowledgeBase[];
  },
  async createBase(payload: { name: string; key?: string; description?: string }): Promise<KnowledgeBase> {
    const res = await axios.post('/api/knowledge/bases', payload);
    return res.data.data as KnowledgeBase;
  },
  async updateBase(id: number, payload: Partial<{ name: string; key: string; description: string }>): Promise<KnowledgeBase> {
    const res = await axios.patch(`/api/knowledge/bases/${id}`, payload);
    return res.data.data as KnowledgeBase;
  },
  async deleteBase(id: number): Promise<void> {
    await axios.delete(`/api/knowledge/bases/${id}`);
  },
};

export default knowledgeService;

export interface KnowledgeBase {
  id: number;
  name: string;
  key?: string;
  description?: string;
  createdAt: string;
}
