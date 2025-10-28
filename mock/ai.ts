// mock/ai.ts
import { Request, Response } from 'express';

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 模拟翻译数据库
const translationDatabase: Record<string, Record<string, Record<string, string>>> = {
    'zh-CN': {
        'en-US': {
            '你好': 'Hello',
            '早上好': 'Good morning',
            '测试': 'Test',
            '人工智能': 'Artificial Intelligence',
            '机器学习': 'Machine Learning',
        },
        'ja-JP': {
            '你好': 'こんにちは',
            '早上好': 'おはようございます',
            '测试': 'テスト',
        },
    },
    'en-US': {
        'zh-CN': {
            'Hello': '你好',
            'Good morning': '早上好',
            'Test': '测试',
            'Artificial Intelligence': '人工智能',
        },
    },
};

// ==================== 类型声明 ====================
interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    description?: string;
    type: 'meeting' | 'task' | 'reminder' | 'other';
    color: string;
}

// 模拟会议数据
let meetingStorage: any[] = [
    {
        meeting_id: 'mock_001',
        meeting_code: '123456789',
        subject: '产品规划会议',
        join_url: 'https://meeting.tencent.com/dm/mock_001',
        start_time: '2025-10-15 10:00:00',
        end_time: '2025-10-15 11:00:00',
        status: 'scheduled',
    },
    {
        meeting_id: 'mock_002',
        meeting_code: '987654321',
        subject: '技术评审会',
        join_url: 'https://meeting.tencent.com/dm/mock_002',
        start_time: '2025-10-16 14:00:00',
        end_time: '2025-10-16 15:30:00',
        status: 'scheduled',
    },
];

// 模拟文件存储
let fileStorage: any[] = [];

export default {
    // ==================== 文档书写相关 ====================
    // 'POST /api/ai/document/write': async (req: Request, res: Response) => {
    //     await delay(2000);
    //     const { prompt, documentType, tone } = req.body;

    //     res.json({
    //         success: true,
    //         data: {
    //             content: `# ${prompt}\n\n这是一篇由 AI 生成的${documentType === 'article' ? '文章' : '文档'}内容。\n\n## 背景\n\n根据您的需求"${prompt}"，我们为您生成了以下内容。这篇文档采用${tone === 'professional' ? '专业' : tone === 'formal' ? '正式' : '随意'}的语气风格编写。\n\n## 主要内容\n\n1. **第一部分**：详细阐述核心观点和理念\n2. **第二部分**：提供具体的实施方案和建议\n3. **第三部分**：总结要点并展望未来\n\n## 详细说明\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.\n\n## 结论\n\n通过以上分析，我们可以得出结论...`,
    //         },
    //     });
    // },
    'POST /api/ai/document/optimize': async (req: Request, res: Response) => {
        await delay(1500);
        const { content, optimizationType, customInstruction, context } = req.body;

        let optimizedContent = content;
        let optimizationNote = '';

        // 根据优化类型进行模拟优化
        if (customInstruction) {
            optimizationNote = `已根据您的要求进行优化：${customInstruction}`;
            // 模拟根据自定义指令优化
            optimizedContent = content.replace(/。/g, '。\n');
        } else {
            switch (optimizationType) {
                case 'grammar':
                    optimizationNote = '已纠正语法错误和标点使用';
                    optimizedContent = content.replace(/，+/g, '，').replace(/。+/g, '。');
                    break;
                case 'style':
                    optimizationNote = '已优化文风，使表达更加流畅';
                    optimizedContent = content
                        .replace(/很好/g, '卓有成效')
                        .replace(/不错/g, '良好');
                    break;
                case 'logic':
                    optimizationNote = '已梳理逻辑，增强条理性';
                    break;
                case 'clarity':
                    optimizationNote = '已清晰化表达，避免歧义';
                    break;
                case 'format':
                    optimizationNote = '已规范格式，符合公文标准';
                    break;
                case 'tone':
                    optimizationNote = '已调整语气，更加正式庄重';
                    optimizedContent = content
                        .replace(/做好/g, '切实做好')
                        .replace(/要/g, '务必');
                    break;
                case 'all':
                default:
                    optimizationNote = '已进行全面智能优化';
                    optimizedContent = content
                        .replace(/很好/g, '卓有成效')
                        .replace(/做好/g, '切实做好')
                        .replace(/要/g, '务必')
                        .replace(/问题/g, '有待改进的问题')
                        .replace(/完成/g, '圆满完成');
                    break;
            }
        }

        console.log('[Mock AI Optimize]', {
            optimizationType,
            customInstruction,
            context,
            note: optimizationNote,
        });

        res.json({
            success: true,
            data: {
                content: optimizedContent,
                optimizationNote,
            },
        });
    },

    // ==================== 翻译相关 ====================
    'POST /api/ai/translate': async (req: Request, res: Response) => {
        await delay(800);
        const { text, sourceLang, targetLang } = req.body;

        let translatedText = text;
        if (translationDatabase[sourceLang]?.[targetLang]?.[text]) {
            translatedText = translationDatabase[sourceLang][targetLang][text];
        } else {
            const langMap: Record<string, string> = {
                'zh-CN': '中文',
                'en-US': 'English',
                'ja-JP': '日本語',
                'ko-KR': '한국어',
                'fr-FR': 'Français',
                'de-DE': 'Deutsch',
                'es-ES': 'Español',
                'ru-RU': 'Русский',
            };
            translatedText = `[模拟翻译 from ${langMap[sourceLang]} to ${langMap[targetLang]}]: ${text}`;
        }

        res.json({
            success: true,
            data: { translatedText, sourceLang, targetLang, charCount: text.length },
        });
    },
    'POST /api/ai/translate/batch': async (req: Request, res: Response) => {
        await delay(2000);
        const { texts } = req.body;

        res.json({
            success: true,
            data: {
                translations: texts.map((text: string, index: number) => ({
                    original: text,
                    translated: `[批量翻译 ${index + 1}] ${text}`,
                })),
            },
        });
    },
    'POST /api/ai/translate/detect': async (req: Request, res: Response) => {
        await delay(300);
        const { text } = req.body;

        const chineseRegex = /[\u4e00-\u9fa5]/;
        const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff]/;
        const koreanRegex = /[\uac00-\ud7af]/;

        let detectedLang = 'en-US';
        if (chineseRegex.test(text)) detectedLang = 'zh-CN';
        else if (japaneseRegex.test(text)) detectedLang = 'ja-JP';
        else if (koreanRegex.test(text)) detectedLang = 'ko-KR';

        res.json({ success: true, data: { detectedLang, confidence: 0.95 } });
    },

    // ==================== 会议管理相关 ====================
    'POST /api/meeting/create': async (req: Request, res: Response) => {
        await delay(1000);
        const { subject, start_time, end_time, settings } = req.body;

        const newMeeting = {
            meeting_id: `mock_${Date.now()}`,
            meeting_code: Math.floor(100000000 + Math.random() * 900000000).toString(),
            subject,
            join_url: `https://meeting.tencent.com/dm/mock_${Date.now()}`,
            start_time,
            end_time,
            status: 'scheduled',
            settings,
        };

        meetingStorage.push(newMeeting);
        res.json({ success: true, data: newMeeting });
    },
    'GET /api/meeting/list': async (req: Request, res: Response) => {
        await delay(500);
        res.json({ success: true, data: { meetings: meetingStorage, total: meetingStorage.length } });
    },
    'GET /api/meeting/:meetingId': async (req: Request, res: Response) => {
        await delay(300);
        const meeting = meetingStorage.find(m => m.meeting_id === req.params.meetingId);
        if (meeting) res.json({ success: true, data: meeting });
        else res.status(404).json({ success: false, message: '会议不存在' });
    },
    'POST /api/meeting/:meetingId/cancel': async (req: Request, res: Response) => {
        await delay(500);
        const meetingIndex = meetingStorage.findIndex(m => m.meeting_id === req.params.meetingId);
        if (meetingIndex !== -1) {
            meetingStorage[meetingIndex].status = 'cancelled';
            res.json({ success: true, message: '会议已取消' });
        } else res.status(404).json({ success: false, message: '会议不存在' });
    },
    'PUT /api/meeting/:meetingId': async (req: Request, res: Response) => {
        await delay(500);
        const meetingIndex = meetingStorage.findIndex(m => m.meeting_id === req.params.meetingId);
        if (meetingIndex !== -1) {
            meetingStorage[meetingIndex] = { ...meetingStorage[meetingIndex], ...req.body };
            res.json({ success: true, data: meetingStorage[meetingIndex] });
        } else res.status(404).json({ success: false, message: '会议不存在' });
    },
    'GET /api/meeting/:meetingId/participants': async (req: Request, res: Response) => {
        await delay(300);
        res.json({
            success: true,
            data: {
                participants: [
                    { userid: 'user1', name: '张三', role: 'host' },
                    { userid: 'user2', name: '李四', role: 'member' },
                    { userid: 'user3', name: '王五', role: 'member' },
                ],
            },
        });
    },
    'POST /api/ai/meeting/notes': async (req: Request, res: Response) => {
        await delay(2500);
        const { transcript } = req.body;

        res.json({
            success: true,
            data: {
                summary: `本次会议主要讨论了 AI 功能模块的开发进度和下一步计划。根据会议内容"${transcript.substring(0, 50)}..."，团队确认了文档书写、翻译和会议助手三个核心功能的技术方案。会议决定优先完成文档书写功能的开发，预计两周内上线测试版本。`,
                actionItems: [
                    { id: '1', task: '完成文档书写功能的前端界面开发', assignee: '张三', deadline: '2025-10-15', status: 'pending' },
                    { id: '2', task: '对接 AI API 并完成后端集成', assignee: '李四', deadline: '2025-10-18', status: 'pending' },
                    { id: '3', task: '编写单元测试和集成测试', assignee: '王五', deadline: '2025-10-20', status: 'pending' },
                    { id: '4', task: '准备用户使用文档和培训材料', assignee: '赵六', deadline: '2025-10-22', status: 'pending' },
                ],
                decisions: [
                    '确定使用 Ant Design Pro 作为前端框架',
                    '采用微服务架构进行后端开发',
                    '优先开发文档书写功能',
                    '每周举行两次技术评审会议',
                ],
                participants: ['张三', '李四', '王五', '赵六', '项目经理'],
            },
        });
    },
    'POST /api/ai/meeting/summary': async (req: Request, res: Response) => {
        await delay(1500);
        res.json({
            success: true,
            data: {
                summary: '会议高效地涵盖了所有议程项目，团队成员积极参与讨论并达成了重要共识。',
                keyPoints: ['明确了项目里程碑', '分配了具体任务', '确定了技术方案'],
            },
        });
    },
    'POST /api/ai/meeting/transcribe/start': async (req: Request, res: Response) => {
        await delay(500);
        res.json({ success: true, data: { transcriptionId: 'trans_' + Date.now(), status: 'started', websocketUrl: 'wss://api.example.com/transcribe' } });
    },
    'GET /api/ai/meeting/analytics/:meetingId': async (req: Request, res: Response) => {
        await delay(1000);
        res.json({
            success: true,
            data: {
                duration: '01:30:45',
                speakerTime: { '张三': '25%', '李四': '30%', '王五': '20%', '赵六': '15%', '其他': '10%' },
                sentiment: 'positive',
                engagementScore: 85,
            },
        });
    },

    // ==================== 云存储相关 ====================
    'POST /api/storage/upload': async (req: Request, res: Response) => {
        await delay(500);
        const { filename, folder, size, type } = req.body;

        const fileInfo = {
            id: `file_${Date.now()}`,
            name: filename,
            url: `https://mock-oss.example.com/${folder}/${filename}`, // 模拟 URL
            size: size || Math.floor(Math.random() * 1000000),
            type: type || 'text/plain',
            folder,
            uploadTime: new Date().toISOString(),
        };

        fileStorage.push(fileInfo);

        res.json({ success: true, data: fileInfo });
    },

    'GET /api/storage/files': async (req: Request, res: Response) => {
        await delay(300);
        const { folder } = req.query;

        const filteredFiles = folder ? fileStorage.filter(f => f.folder === folder) : fileStorage;

        res.json({ success: true, data: { files: filteredFiles, total: filteredFiles.length } });
    },

    'DELETE /api/storage/file/:fileId': async (req: Request, res: Response) => {
        await delay(300);
        const fileIndex = fileStorage.findIndex(f => f.id === req.params.fileId);

        if (fileIndex !== -1) {
            fileStorage.splice(fileIndex, 1);
            res.json({ success: true, message: '文件已删除' });
        } else {
            res.status(404).json({ success: false, message: '文件不存在' });
        }
    },

    'GET /api/storage/file/:fileId/url': async (req: Request, res: Response) => {
        await delay(200);
        const file = fileStorage.find(f => f.id === req.params.fileId);

        if (file) {
            res.json({
                success: true,
                data: {
                    url: `${file.url}?mockSign=${Date.now()}`, // 模拟签名
                    expiresIn: 3600,
                },
            });
        } else {
            res.status(404).json({ success: false, message: '文件不存在' });
        }
    },

    // ==================== 日程管理相关 ====================
    'POST /api/calendar/event': async (req: Request, res: Response) => {
        await delay(500);
        const eventData = req.body;
        res.json({
            success: true,
            data: {
                id: `event_${Date.now()}`,
                ...eventData,
                createdAt: new Date().toISOString(),
                color: eventData.color || '#6b7280',
            },
        });
    },

    'GET /api/calendar/events': async (req: Request, res: Response) => {
        await delay(500);

        const mockEvents: CalendarEvent[] = [
            {
                id: 'event_1',
                title: '团队周会',
                start: new Date('2025-10-13T10:00:00'),
                end: new Date('2025-10-13T11:00:00'),
                type: 'meeting',
                description: '讨论本周工作进展',
                color: '#3b82f6',
            },
            {
                id: 'event_2',
                title: '项目截止日',
                start: new Date('2025-10-15T09:00:00'),
                end: new Date('2025-10-15T18:00:00'),
                type: 'task',
                description: '完成项目第一阶段开发',
                color: '#ef4444',
            },
            {
                id: 'event_3',
                title: '客户会议',
                start: new Date('2025-10-16T14:00:00'),
                end: new Date('2025-10-16T15:30:00'),
                type: 'meeting',
                description: '产品演示和需求讨论',
                color: '#3b82f6',
            },
        ];

        res.json({
            success: true,
            data: {
                events: mockEvents,
                total: mockEvents.length,
            },
        });
    },

    'PUT /api/calendar/event/:eventId': async (req: Request, res: Response) => {
        await delay(500);
        const updatedEvent: CalendarEvent = {
            id: req.params.eventId,
            ...req.body,
            color: req.body.color || '#6b7280',
            start: new Date(req.body.start),
            end: new Date(req.body.end),
        };
        res.json({ success: true, data: updatedEvent });
    },

    'DELETE /api/calendar/event/:eventId': async (req: Request, res: Response) => {
        await delay(300);
        res.json({ success: true, message: '日程已删除' });
    },

    // ==================== 统计分析相关 ====================
    'GET /api/ai/statistics': async (req: Request, res: Response) => {
        await delay(800);
        res.json({
            success: true,
            data: {
                documentsGenerated: 156,
                translationsCompleted: 423,
                meetingsHeld: 89,
                totalUsageTime: '125h 30m',
                weeklyTrend: [
                    { date: '2025-10-04', count: 25 },
                    { date: '2025-10-05', count: 32 },
                    { date: '2025-10-06', count: 28 },
                    { date: '2025-10-07', count: 35 },
                    { date: '2025-10-08', count: 30 },
                    { date: '2025-10-09', count: 38 },
                    { date: '2025-10-10', count: 42 },
                ],
            },
        });
    },

};
