import { request } from '@umijs/max';

const DOCUMENT_API_BASE = '/api/document';
const TRANSLATE_API_BASE = '/api/translate';
const LEGACY_AI_API_BASE = '/api/ai';

// 文档书写接口
export async function aiWriteDocument(params: {
    title: string;
    requirement: string;
    prompt: string;
    documentType: 'notice' | 'bulletin' | 'request' | 'report' | 'letter' | 'meeting';
    tone?: 'professional' | 'casual' | 'formal';
    language?: string;
}) {
    return request(`${DOCUMENT_API_BASE}/write`, {
        method: 'POST',
        data: params,
    });
}

// 文档优化接口
export async function aiOptimizeDocument(params: {
    content: string;
    optimizationType: 'grammar' | 'style' | 'clarity' | 'logic' | 'format' | 'tone' | 'all';
    customInstruction?: string; // 用户自定义优化指令
    context?: Record<string, any>; // 文档上下文信息（对象格式）
}) {
    return request(`${DOCUMENT_API_BASE}/optimize`, {
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
    return request(`${TRANSLATE_API_BASE}/`, {
        method: 'POST',
        data: {
            text: params.text,
            from_lang: params.sourceLang,
            to_lang: params.targetLang,
        },
    });
}

// 批量翻译
export async function aiBatchTranslate(params: {
    texts: string[];
    sourceLang: string;
    targetLang: string;
}) {
    return request(`${TRANSLATE_API_BASE}/batch`, {
        method: 'POST',
        data: {
            texts: params.texts,
            from_lang: params.sourceLang,
            to_lang: params.targetLang,
        },
    });
}

// 会议记录生成
export async function aiGenerateMeetingNotes(params: {
    transcript: string;
    meetingType?: 'standup' | 'review' | 'planning' | 'general';
    participants?: string[];
}) {
    return request(`${LEGACY_AI_API_BASE}/meeting/notes`, {
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
    return request(`${LEGACY_AI_API_BASE}/meeting/summary`, {
        method: 'POST',
        data: params,
    });
}

// 实时转录（WebSocket 或 SSE）
export async function startRealtimeTranscription(params: {
    meetingId: string;
    language?: string;
}) {
    return request(`${LEGACY_AI_API_BASE}/meeting/transcribe/start`, {
        method: 'POST',
        data: params,
    });
}

// 获取会议分析
export async function aiMeetingAnalytics(params: {
    meetingId: string;
}) {
    return request(`${LEGACY_AI_API_BASE}/meeting/analytics/${params.meetingId}`, {
        method: 'GET',
    });
}
