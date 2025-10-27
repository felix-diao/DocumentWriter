import { request } from '@umijs/max';

// AI 服务基础配置
const AI_API_BASE = '/api/ai'; // 根据实际情况修改

// 文档书写接口
export async function aiWriteDocument(params: {
    prompt: string;
    documentType: 'article' | 'report' | 'summary' | 'email';
    tone?: 'professional' | 'casual' | 'formal';
    language?: string;
}) {
    return request(`${AI_API_BASE}/document/write`, {
        method: 'POST',
        data: params,
    });
}

// 文档优化接口
export async function aiOptimizeDocument(params: {
    content: string;
    optimizationType: 'grammar' | 'style' | 'clarity' | 'logic' | 'format' | 'tone' | 'all';
    customInstruction?: string; // 用户自定义优化指令
    context?: string; // 文档上下文信息
}) {
    return request(`${AI_API_BASE}/document/optimize`, {
        method: 'POST',
        data: params,
    });
}

// 翻译接口
export async function aiTranslate(params: {
    text: string;
    sourceLang: string;
    targetLang: string;
    context?: string;
}) {
    return request(`${AI_API_BASE}/translate`, {
        method: 'POST',
        data: params,
    });
}

// 批量翻译
export async function aiBatchTranslate(params: {
    texts: string[];
    sourceLang: string;
    targetLang: string;
}) {
    return request(`${AI_API_BASE}/translate/batch`, {
        method: 'POST',
        data: params,
    });
}

// 会议记录生成
export async function aiGenerateMeetingNotes(params: {
    transcript: string;
    meetingType?: 'standup' | 'review' | 'planning' | 'general';
    participants?: string[];
}) {
    return request(`${AI_API_BASE}/meeting/notes`, {
        method: 'POST',
        data: params,
    });
}

// 会议摘要
export async function aiMeetingSummary(params: {
    transcript: string;
    includeActionItems?: boolean;
    includeDecisions?: boolean;
}) {
    return request(`${AI_API_BASE}/meeting/summary`, {
        method: 'POST',
        data: params,
    });
}

// 实时转录（WebSocket 或 SSE）
export async function startRealtimeTranscription(params: {
    meetingId: string;
    language?: string;
}) {
    return request(`${AI_API_BASE}/meeting/transcribe/start`, {
        method: 'POST',
        data: params,
    });
}

// 获取会议分析
export async function aiMeetingAnalytics(params: {
    meetingId: string;
}) {
    return request(`${AI_API_BASE}/meeting/analytics/${params.meetingId}`, {
        method: 'GET',
    });
}