import { request } from '@umijs/max';

/**
 * 文档导出服务
 */

// 导出格式类型
export type ExportFormat = 'pdf' | 'docx' | 'txt';

// 导出请求参数
export interface ExportDocumentParams {
  content: string;
  title: string;
  format: ExportFormat;
  options?: {
    // PDF 选项
    pageSize?: 'A4' | 'A3' | 'Letter';
    orientation?: 'portrait' | 'landscape';
    margins?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    // Word 选项
    fontFamily?: string;
    fontSize?: number;
    lineHeight?: number;
  };
}

// 导出响应
export interface ExportDocumentResponse {
  success: boolean;
  data?: {
    url: string; // 下载链接
    filename: string;
    size: number; // 文件大小（字节）
    expiresAt: string; // 链接过期时间
  };
  errorMessage?: string;
}

const EXPORT_API_BASE = '/api/document/export';

/**
 * 导出文档为指定格式
 */
export async function exportDocument(
  params: ExportDocumentParams,
): Promise<ExportDocumentResponse> {
  return request<ExportDocumentResponse>(EXPORT_API_BASE, {
    method: 'POST',
    data: params,
  });
}

/**
 * 导出为 PDF
 */
export async function exportToPDF(
  content: string,
  title: string,
  options?: ExportDocumentParams['options'],
): Promise<ExportDocumentResponse> {
  return exportDocument({
    content,
    title,
    format: 'pdf',
    options,
  });
}

/**
 * 导出为 Word (DOCX)
 */
export async function exportToWord(
  content: string,
  title: string,
  options?: ExportDocumentParams['options'],
): Promise<ExportDocumentResponse> {
  return exportDocument({
    content,
    title,
    format: 'docx',
    options,
  });
}

/**
 * 导出为纯文本
 */
export async function exportToText(
  content: string,
  title: string,
): Promise<ExportDocumentResponse> {
  return exportDocument({
    content,
    title,
    format: 'txt',
  });
}

/**
 * 批量导出文档
 */
export interface BatchExportParams {
  documents: Array<{
    content: string;
    title: string;
    format: ExportFormat;
  }>;
}

export async function batchExportDocuments(
  params: BatchExportParams,
): Promise<{
  success: boolean;
  data?: {
    zipUrl: string; // ZIP 压缩包下载链接
    filename: string;
    size: number;
    expiresAt: string;
  };
  errorMessage?: string;
}> {
  return request(`${EXPORT_API_BASE}/batch`, {
    method: 'POST',
    data: params,
  });
}

/**
 * 获取导出历史记录
 */
export async function getExportHistory(params?: {
  current?: number;
  pageSize?: number;
}): Promise<{
  success: boolean;
  data: Array<{
    id: string;
    title: string;
    format: ExportFormat;
    url: string;
    size: number;
    createdAt: string;
    expiresAt: string;
  }>;
  total: number;
}> {
  return request(`${EXPORT_API_BASE}/history`, {
    method: 'GET',
    params,
  });
}

