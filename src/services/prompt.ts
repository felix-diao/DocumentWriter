import { request } from '@umijs/max';

// Prompt 模板接口定义
export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  description?: string;
  variables?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API 基础路径
const PROMPT_API_BASE = '/api/prompts';

/**
 * 获取所有 Prompt 模板
 */
export async function getPrompts(params?: {
  name?: string;
  category?: string;
  isActive?: boolean;
  current?: number;
  pageSize?: number;
}) {
  return request<{
    data: PromptTemplate[];
    total: number;
    success: boolean;
  }>(PROMPT_API_BASE, {
    method: 'GET',
    params,
  });
}

/**
 * 获取单个 Prompt 模板
 */
export async function getPromptById(id: string) {
  return request<{
    data: PromptTemplate;
    success: boolean;
  }>(`${PROMPT_API_BASE}/${id}`, {
    method: 'GET',
  });
}

/**
 * 创建 Prompt 模板
 */
export async function createPrompt(
  data: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>,
) {
  return request<{
    data: PromptTemplate;
    success: boolean;
  }>(PROMPT_API_BASE, {
    method: 'POST',
    data,
  });
}

/**
 * 更新 Prompt 模板
 */
export async function updatePrompt(
  id: string,
  data: Partial<Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>>,
) {
  return request<{
    data: PromptTemplate;
    success: boolean;
  }>(`${PROMPT_API_BASE}/${id}`, {
    method: 'PUT',
    data,
  });
}

/**
 * 删除 Prompt 模板
 */
export async function deletePrompt(id: string) {
  return request<{
    success: boolean;
  }>(`${PROMPT_API_BASE}/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 批量删除 Prompt 模板
 */
export async function batchDeletePrompts(ids: string[]) {
  return request<{
    success: boolean;
  }>(`${PROMPT_API_BASE}/batch`, {
    method: 'DELETE',
    data: { ids },
  });
}

/**
 * 按分类获取 Prompt 模板
 */
export async function getPromptsByCategory(category: string) {
  return request<{
    data: PromptTemplate[];
    success: boolean;
  }>(`${PROMPT_API_BASE}/category/${category}`, {
    method: 'GET',
  });
}

/**
 * 切换 Prompt 启用状态
 */
export async function togglePromptActive(id: string, isActive: boolean) {
  return request<{
    success: boolean;
  }>(`${PROMPT_API_BASE}/${id}/toggle`, {
    method: 'PATCH',
    data: { isActive },
  });
}

