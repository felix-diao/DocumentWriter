import type { Request, Response } from 'express';
import type {
  BatchExportParams,
  ExportDocumentParams,
  ExportDocumentResponse,
} from '@/services/documentExport';

// 模拟导出历史记录
const exportHistory: Array<{
  id: string;
  title: string;
  format: 'pdf' | 'docx' | 'txt';
  url: string;
  size: number;
  createdAt: string;
  expiresAt: string;
}> = [];

/**
 * 模拟文件大小计算（根据内容长度估算）
 */
function calculateFileSize(content: string, format: string): number {
  const baseSize = content.length;
  switch (format) {
    case 'pdf':
      return Math.floor(baseSize * 2.5); // PDF 通常较大
    case 'docx':
      return Math.floor(baseSize * 1.8); // Word 文档
    case 'txt':
      return baseSize; // 纯文本
    default:
      return baseSize;
  }
}

/**
 * 生成模拟下载 URL
 */
function generateMockDownloadUrl(
  title: string,
  format: string,
): string {
  const timestamp = Date.now();
  const encodedTitle = encodeURIComponent(title);
  return `https://mock-storage.example.com/exports/${timestamp}/${encodedTitle}.${format}`;
}

/**
 * 导出文档
 */
function exportDocument(req: Request, res: Response) {
  const params = req.body as ExportDocumentParams;
  const { content, title, format, options } = params;

  // 模拟处理时间
  setTimeout(() => {
    const size = calculateFileSize(content, format);
    const url = generateMockDownloadUrl(title, format);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24小时后过期
    const filename = `${title}.${format}`;

    // 保存到历史记录
    const historyItem = {
      id: Date.now().toString(),
      title,
      format,
      url,
      size,
      createdAt: new Date().toISOString(),
      expiresAt,
    };
    exportHistory.unshift(historyItem);

    // 只保留最近 50 条记录
    if (exportHistory.length > 50) {
      exportHistory.pop();
    }

    const response: ExportDocumentResponse = {
      success: true,
      data: {
        url,
        filename,
        size,
        expiresAt,
      },
    };

    // 在实际应用中，这里应该：
    // 1. 使用 puppeteer 或类似库生成 PDF
    // 2. 使用 docx 库生成 Word 文档
    // 3. 将文件上传到云存储（OSS/S3）
    // 4. 返回真实的下载链接

    console.log(`[Mock Export] ${format.toUpperCase()} generated:`, {
      title,
      size,
      contentLength: content.length,
      options,
    });

    res.json(response);
  }, 1000); // 模拟 1 秒处理时间
}

/**
 * 批量导出文档
 */
function batchExportDocuments(req: Request, res: Response) {
  const params = req.body as BatchExportParams;
  const { documents } = params;

  setTimeout(() => {
    let totalSize = 0;
    documents.forEach((doc) => {
      totalSize += calculateFileSize(doc.content, doc.format);
    });

    const zipUrl = `https://mock-storage.example.com/exports/batch-${Date.now()}/documents.zip`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    console.log(`[Mock Batch Export] ${documents.length} documents processed:`, {
      totalSize,
      formats: documents.map((d) => d.format),
    });

    res.json({
      success: true,
      data: {
        zipUrl,
        filename: `documents-${Date.now()}.zip`,
        size: totalSize,
        expiresAt,
      },
    });
  }, 2000); // 批量导出需要更长时间
}

/**
 * 获取导出历史
 */
function getExportHistory(req: Request, res: Response) {
  const { current = 1, pageSize = 10 } = req.query;

  const startIndex = (Number(current) - 1) * Number(pageSize);
  const endIndex = startIndex + Number(pageSize);
  const paginatedData = exportHistory.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: paginatedData,
    total: exportHistory.length,
  });
}

/**
 * 模拟实际下载文件
 * 在实际应用中，这个接口应该从云存储获取文件并返回
 */
function downloadFile(req: Request, res: Response) {
  const { filename } = req.params;
  const { format } = req.query;

  console.log(`[Mock Download] Downloading file: ${filename}`);

  // 在实际应用中，这里应该：
  // 1. 验证文件是否存在
  // 2. 检查是否有权限
  // 3. 从云存储获取文件
  // 4. 返回文件流

  // Mock: 返回一个简单的文本响应
  let contentType = 'text/plain';
  switch (format) {
    case 'pdf':
      contentType = 'application/pdf';
      break;
    case 'docx':
      contentType =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      break;
    case 'txt':
      contentType = 'text/plain';
      break;
  }

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('Mock file content - In production, this would be the actual file');
}

export default {
  'POST /api/document/export': exportDocument,
  'POST /api/document/export/batch': batchExportDocuments,
  'GET /api/document/export/history': getExportHistory,
  'GET /api/document/export/download/:filename': downloadFile,
};

