import {
	AudioOutlined,
	CloudUploadOutlined,
	PauseCircleOutlined,
	PlayCircleOutlined,
	PlusOutlined,
	ReloadOutlined,
	ThunderboltOutlined,
	UnorderedListOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
	Alert,
	Button,
	Col,
	Checkbox,
	DatePicker,
	Divider,
	Empty,
	Form,
	Input,
	Modal,
	Popconfirm,
	Progress,
	message,
	Row,
	Select,
	Space,
	Spin,
	Table,
	Tag,
	Upload,
	Tooltip,
	Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import duration from 'dayjs/plugin/duration';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(timezone);
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { history, useLocation } from '@umijs/max';
import meetingsApi, {
	isAudioUploadPendingError,
	type LocalMeetingAudio,
	type Meeting,
	type MeetingAudio,
	type MeetingFile,
	type VolcMeetingAudio,
	localAudioDirectDownloadUrl,
} from '@/services/meetings';
import meetingMinutesApi, {
	type LocalMeetingMinutes,
	type LocalMeetingMinutesSession,
	type LocalMeetingTodo,
	type LocalSessionTodoItem,
	type MeetingActionItem,
	type MeetingDecisionItem,
	type MeetingInsights,
	type SpeakerSegment,
	type VolcMeetingMinutes,
	type VolcMinutesJob,
	type VolcMeetingMinutesSession,
	type VolcMeetingTodo,
	type VolcSessionTodoItem,
} from '@/services/meetingMinutes';
import { getToken } from '@/utils/auth';
import { downsampleBuffer, float32ToInt16PCM } from '@/utils/pcm';

const { TextArea } = Input;
const { Title, Text } = Typography;
const SESSION_SUMMARY_PREVIEW_STYLE: React.CSSProperties = {
	minHeight: 160,
	padding: '12px 16px',
	border: '1px solid #d9d9d9',
	borderRadius: 6,
	background: '#fafafa',
	lineHeight: 1.85,
	fontSize: 14,
};

interface ActionFormValues {
	description: string;
	owner?: string;
	due_date?: Dayjs;
	status?: string;
}

interface DecisionFormValues {
	description: string;
}

interface VolcTodoFormValues {
	content: string;
	executor?: string;
	execution_time?: string;
}

interface LocalTodoFormValues {
	content: string;
	executor?: string;
	execution_time?: string;
}

type IncrementalAsrPayload = {
	accumulated?: string;
	delta?: string;
	replace?: boolean;
};

type CompletedAsrPayload = IncrementalAsrPayload & {
	transcript?: string;
	stream_transcript_text?: string;
};

const LOCAL_SILENCE_RMS_THRESHOLD = 0.008;
// 在线录音改为按固定时长分段后再通过 WS 发送，节奏对齐“已有音频流式转写”体验。
const LOCAL_LIVE_WS_CHUNK_SEC = 6.0;
const LOCAL_LIVE_WS_SAMPLE_RATE = 16000;
const LOCAL_LIVE_WS_BYTES_PER_SAMPLE = 2;
const LOCAL_LIVE_WS_CHUNK_BYTES = Math.max(
	1,
	Math.floor(LOCAL_LIVE_WS_CHUNK_SEC * LOCAL_LIVE_WS_SAMPLE_RATE * LOCAL_LIVE_WS_BYTES_PER_SAMPLE),
);
const MAX_AUDIO_UPLOAD_COUNT = 10;
const MAX_ONLINE_RECORDING_COUNT = 10;
const VOLC_COMPLETED_STATUS_SET = new Set(['completed', 'success', 'succeeded', 'finished']);
const VOLC_IN_PROGRESS_STATUS_SET = new Set([
	'submitted',
	'processing',
	'running',
	'queued',
	'处理中',
	'运行中',
	'等待中',
]);
const VOLC_BUSY_STREAM_TYPES = new Set([
	'live_connecting',
	'live_streaming',
	'live_stopping',
	'live_saving',
	'live_uploading',
	'file_streaming',
]);
const LOCAL_BUSY_STREAM_TYPES = new Set([
	'live_connecting',
	'live_streaming',
	'live_stopping',
	'live_saving',
	'live_uploading',
	'file_streaming',
]);
const MINUTES_MODE_LABEL: Record<'local' | 'volc', string> = {
	local: '机密会议',
	volc: '普通会议',
};

const normalizeStatus = (status?: string | null): string => String(status ?? '').trim().toLowerCase();
const clampPercent = (value: number, min = 0, max = 100): number => {
	if (!Number.isFinite(value)) return min;
	return Math.max(min, Math.min(max, Math.round(value)));
};
const resolveLocalStageProgressPercent = (payload: Record<string, any>): number | null => {
	const phase = String(payload.phase ?? '').trim();
	const totalChunks = Number(payload.total_chunks);
	const batchFrom = Number(payload.batch_from);
	const batchTo = Number(payload.batch_to);

	if (phase === 'downloading_audio') return 5;
	if (phase === 'normalizing') return 10;
	if (phase === 'probing') return 15;

	if (phase === 'preparing_batch') {
		if (Number.isFinite(totalChunks) && totalChunks > 0 && Number.isFinite(batchTo) && batchTo > 0) {
			return clampPercent(15 + (batchTo / totalChunks) * 15, 15, 30);
		}
		return 20;
	}

	if (phase === 'recognizing_batch') {
		if (Number.isFinite(totalChunks) && totalChunks > 0 && Number.isFinite(batchFrom) && batchFrom > 0) {
			return clampPercent(30 + ((batchFrom - 1) / totalChunks) * 65, 30, 95);
		}
		return 30;
	}

	return null;
};
const resolveLocalChunkProgressPercent = (chunkIdx?: unknown, totalChunks?: unknown): number | null => {
	const idx = Number(chunkIdx);
	const total = Number(totalChunks);
	if (!Number.isFinite(idx) || !Number.isFinite(total) || total <= 0) return null;
	return clampPercent(30 + ((idx + 1) / total) * 65, 30, 95);
};
const formatShanghaiTime = (value?: string | null, pattern = 'YYYY-MM-DD HH:mm'): string => {
	if (!value) return '—';
	const raw = String(value).trim();
	if (!raw) return '—';
	const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
	// 无时区后缀的 ISO 字符串与「会议管理」一致，按本地时间解析（见 dayjs 默认行为），避免误当 UTC 再转上海导致 +8 小时。
	const parsed = hasTimezone ? dayjs(raw).tz('Asia/Shanghai') : dayjs(raw);
	return parsed.isValid() ? parsed.format(pattern) : raw;
};
const isLocalAudioReadyForMinutesStatus = (status?: string | null): boolean => {
	const normalized = normalizeStatus(status);
	return normalized === 'uploaded' || normalized === 'completed';
};
const isVolcCompletedStatus = (status?: string | null): boolean => {
	const raw = String(status ?? '').trim();
	if (!raw) return false;
	if (raw === '已完成') return true;
	return VOLC_COMPLETED_STATUS_SET.has(raw.toLowerCase());
};
const isVolcInProgressStatus = (status?: string | null): boolean => {
	const raw = String(status ?? '').trim();
	if (!raw) return false;
	return VOLC_IN_PROGRESS_STATUS_SET.has(raw.toLowerCase());
};

const getVolcMinutesJobStatus = (
	minutes?: Pick<VolcMeetingMinutes, 'minutes_job_status' | 'audio_status'> | null,
	fallbackStatus?: string | null,
) => fallbackStatus ?? minutes?.minutes_job_status ?? minutes?.audio_status;

/** 精确转写主视图：优先整段 transcript_text，否则用说话人分段拼成可读文本（避免仅有 segments 时 TextArea 空白） */
const buildVolcPreciseTranscriptText = (
	transcriptText?: string | null,
	segments?: SpeakerSegment[] | null,
): string => {
	const trimmed = String(transcriptText ?? '').trim();
	if (trimmed) return String(transcriptText ?? '');
	const list = segments ?? [];
	if (!list.length) return '';
	return list
		.map((s) => {
			const sp = String(s.speaker ?? '发言人').trim() || '发言人';
			const tx = String(s.text ?? '').trim();
			if (!tx) return '';
			return `${sp}：${tx}`;
		})
		.filter(Boolean)
		.join('\n\n');
};
const VOLC_AUDIO_UPLOAD_STATUS_META: Record<'uploading' | 'uploaded' | 'failed', { label: string; color: string }> = {
	uploading: { label: '上传中', color: 'processing' },
	uploaded: { label: '已上传', color: 'green' },
	failed: { label: '上传失败', color: 'red' },
};
const resolveVolcAudioUploadStatus = (status?: string | null): 'uploading' | 'uploaded' | 'failed' => {
	const normalized = normalizeStatus(status);
	// 仅“上传链路失败”映射为上传失败；纪要生成失败/中断不应影响上传状态。
	if (
		normalized === 'upload_failed' ||
		normalized === 'upload-failed' ||
		normalized === 'uploadfailed' ||
		normalized === 'tos_upload_failed' ||
		normalized === '上传失败'
	) {
		return 'failed';
	}
	// 这些状态都代表“音频已成功上传”，即使后续进入妙记处理流程。
	if (
		normalized === '已上传' ||
		normalized === '已完成' ||
		normalized === '处理中' ||
		normalized === 'uploaded' ||
		normalized === 'submitted' ||
		normalized === 'processing' ||
		normalized === 'running' ||
		normalized === 'queued' ||
		normalized === 'failed' ||
		normalized === 'error' ||
		normalized === 'abandoned' ||
		normalized === 'cancelled' ||
		normalized === '失败' ||
		normalized === 'completed' ||
		normalized === 'success' ||
		normalized === 'succeeded' ||
		normalized === 'finished'
	) {
		return 'uploaded';
	}
	return 'uploading';
};

const calcRms = (samples: Float32Array): number => {
	if (!samples.length) return 0;
	let sum = 0;
	for (let i = 0; i < samples.length; i += 1) {
		const s = samples[i];
		sum += s * s;
	}
	return Math.sqrt(sum / samples.length);
};

const concatArrayBuffers = (chunks: ArrayBuffer[]): ArrayBuffer => {
	if (!chunks.length) return new ArrayBuffer(0);
	const total = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
	const merged = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		merged.set(new Uint8Array(chunk), offset);
		offset += chunk.byteLength;
	}
	return merged.buffer;
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const mergeIncrementalAsrText = (prev: string, payload: IncrementalAsrPayload): string => {
	const hasAccumulated = typeof payload.accumulated === 'string';
	const hasDelta = typeof payload.delta === 'string';
	const replace = payload.replace === true;

	if (replace) {
		if (hasAccumulated) return payload.accumulated as string;
		if (hasDelta) return payload.delta as string;
		return prev;
	}
	if (hasDelta) return prev + (payload.delta as string);
	if (hasAccumulated) {
		const accumulated = payload.accumulated as string;
		if (accumulated.startsWith(prev)) return prev + accumulated.slice(prev.length);
		return accumulated;
	}
	return prev;
};

const resolveCompletedAsrText = (prev: string, payload: CompletedAsrPayload): string => {
	const transcript =
		typeof payload.transcript === 'string'
			? payload.transcript
			: typeof payload.stream_transcript_text === 'string'
				? payload.stream_transcript_text
				: typeof payload.accumulated === 'string'
					? payload.accumulated
					: '';
	return transcript || prev;
};

/** 简单 Markdown 渲染：支持 **bold**、`- list`、空行段落，满足妙记摘要格式 */
const renderSimpleMarkdown = (text: string): React.ReactNode => {
	const lines = text.split('\n');
	const nodes: React.ReactNode[] = [];
	let key = 0;

	// 渲染行内格式：**bold** → <strong>
	const renderInline = (line: string): React.ReactNode => {
		const parts = line.split(/(\*\*[^*]+\*\*)/g);
		return parts.map((part, i) => {
			if (part.startsWith('**') && part.endsWith('**')) {
				return <strong key={i}>{part.slice(2, -2)}</strong>;
			}
			return part;
		});
	};

	// 计算行的缩进级别（以2空格或4空格为一级）
	const getIndent = (line: string): number => {
		const spaces = line.match(/^(\s*)/)?.[1]?.length ?? 0;
		return Math.floor(spaces / 2);
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();
		if (!trimmed) {
			nodes.push(<br key={key++} />);
		} else if (/^[-*]\s/.test(trimmed)) {
			const indent = getIndent(line);
			const content = trimmed.slice(2); // 去掉 "- " 或 "* "
			nodes.push(
				<div key={key++} style={{ paddingLeft: 16 + indent * 16, display: 'flex', gap: 6, margin: '1px 0' }}>
					<span style={{ flexShrink: 0 }}>{indent === 0 ? '•' : '◦'}</span>
					<span>{renderInline(content)}</span>
				</div>
			);
		} else {
			nodes.push(<p key={key++} style={{ margin: '3px 0' }}>{renderInline(trimmed)}</p>);
		}
	}
	return nodes;
};

/** 保留本地纪要原始摘要，仅做首尾裁剪，避免主视图把长摘要压缩过短 */
const normalizeSummaryMarkdown = (text: string): string => {
	const trimmed = (text || '').trim();
	if (!trimmed) return '';
	return trimmed;
};

/** 本地摘要展示/保存时压缩空行，避免视觉上过于松散 */
const compactSummaryBlankLines = (text: string): string =>
	(text || '')
		.replace(/\r\n/g, '\n')
		.replace(/\n[ \t]*\n+/g, '\n')
		.trim();

const resolveZhErrorMessage = (error: any, fallback: string): string => {
	const detail = error?.response?.data?.detail;
	if (typeof detail === 'string' && detail.trim()) return detail.trim();
	const backendMsg = error?.response?.data?.errorMessage || error?.response?.data?.message;
	if (typeof backendMsg === 'string' && backendMsg.trim()) return backendMsg.trim();
	const raw = typeof error?.message === 'string' ? error.message : '';
	if (/Request failed with status code\s*400/i.test(raw) || /Response status:400/i.test(raw)) {
		return '纪要生成失败：当前转写为空，请先完成录音或音频转写后重试。';
	}
	if (/Request failed with status code/i.test(raw)) {
		return `请求失败：${raw.replace(/^Request failed with status code\s*/i, 'HTTP ')}`;
	}
	return fallback;
};

const isLocalMinutesCancelledError = (error: any): boolean => {
	const detail = String(
		error?.response?.data?.detail ||
		error?.info?.data?.detail ||
		error?.message ||
		'',
	).trim();
	return error?.response?.status === 409 || detail === '已取消当前会议纪要生成任务';
};

const resolveMicrophoneAccessMessage = (error?: any): string => {
	if (typeof window !== 'undefined' && !window.isSecureContext) {
		return '当前页面无法获取麦克风权限，请使用 localhost 或 HTTPS 访问后重试。';
	}
	const raw = typeof error?.message === 'string' ? error.message : '';
	const name = typeof error?.name === 'string' ? error.name : '';
	if (name === 'NotAllowedError' || /permission|denied|notallowed/i.test(raw)) {
		return '麦克风权限被拒绝，请在浏览器中允许访问麦克风后重试。';
	}
	if (name === 'NotFoundError' || /notfound|device/i.test(raw)) {
		return '未检测到可用麦克风设备，请检查设备后重试。';
	}
	return '无法获取麦克风权限，请检查浏览器权限设置后重试。';
};

const resolveVolcErrorMessage = (raw?: string | null): string => {
	const text = String(raw || '').trim();
	if (!text) return '';
	const lower = text.toLowerCase();
	if (lower.includes('audio empty')) return '音频为空：未检测到有效语音，请检查录音设备或重新上传音频。';
	if (lower.includes('no speech')) return '未识别到语音内容，请确认音频中有人声。';
	if (lower.includes('timeout')) return '处理超时：AI生成纪要耗时过长，请稍后重试。';
	if (lower.includes('task not found')) return '任务不存在：纪要任务未找到，请重新提交生成。';
	if (lower.includes('permission') || lower.includes('unauthorized') || lower.includes('forbidden')) {
		return '权限不足：当前账号无权执行该操作。';
	}
	return text;
};

const resolveLocalLiveErrorMessage = (
	raw?: string | null,
	options?: {
		closeCode?: number | null;
		stopRequested?: boolean;
		firstAudioSent?: boolean;
		wsOpened?: boolean;
	},
): string => {
	const text = String(raw || '').trim();
	const lower = text.toLowerCase();
	const closeCode = options?.closeCode;
	const stopRequested = Boolean(options?.stopRequested);
	const firstAudioSent = Boolean(options?.firstAudioSent);
	const wsOpened = options?.wsOpened !== false;

	if (
		(!firstAudioSent && stopRequested && (closeCode === 1000 || closeCode === 1001 || closeCode === 1005 || closeCode === 1006)) ||
		lower.includes('未接收到任何音频数据') ||
		lower.includes('无法生成录音文件')
	) {
		return '录音时间过短或未采集到有效语音，请重新录音。';
	}

	if (closeCode === 4001 || lower.includes('token 无效') || lower.includes('token') || lower.includes('重新登录')) {
		return '登录状态已失效，请重新登录后重试。';
	}

	if (closeCode === 4004 || lower.includes('meeting_id') || lower.includes('会议不存在')) {
		return '当前会议不存在或无权限访问，请刷新页面后重试。';
	}

	if (lower.includes('握手超时')) {
		return '在线录音连接超时，请稍后重试。';
	}

	if (stopRequested && closeCode === 1006) {
		return firstAudioSent
			? '录音已停止，但音频处理未完成，请重新录音或稍后重试。'
			: '录音时间过短或未采集到有效语音，请重新录音。';
	}

	if (
		lower.includes('websocket 连接失败') ||
		lower.includes('ws 连接失败') ||
		lower.includes('websocket 初始化失败') ||
		((closeCode === 1005 || closeCode === 1006) && !wsOpened)
	) {
		return '在线录音连接失败，请检查网络或服务状态后重试。';
	}

	if (lower.includes('websocket') || closeCode === 1005 || closeCode === 1006) {
		return '在线录音连接中断，请稍后重试。';
	}

	if (lower.includes('实时录音失败')) {
		return '在线录音处理失败，请稍后重试。';
	}

	return text || '在线录音处理失败，请稍后重试。';
};

/** 普通会议在线录音 WebSocket：不向用户暴露 close code / 代理配置等调试信息 */
const resolveVolcLiveErrorMessage = (
	raw?: string | null,
	options?: {
		closeCode?: number | null;
		stopRequested?: boolean;
		firstAudioSent?: boolean;
		wsOpened?: boolean;
	},
): string => {
	const text = String(raw || '').trim();
	const lower = text.toLowerCase();
	const closeCode = options?.closeCode;
	const stopRequested = Boolean(options?.stopRequested);
	const firstAudioSent = Boolean(options?.firstAudioSent);
	const wsOpened = options?.wsOpened !== false;

	if (
		(!firstAudioSent &&
			stopRequested &&
			(closeCode === 1000 || closeCode === 1001 || closeCode === 1005 || closeCode === 1006)) ||
		lower.includes('未采集到音频帧')
	) {
		return '录音时间过短或未采集到有效语音，请重新录音。';
	}

	if (closeCode === 4001 || lower.includes('token 无效') || lower.includes('重新登录')) {
		return '登录状态已失效，请重新登录后重试。';
	}

	if (closeCode === 4004 || lower.includes('meeting_id') || lower.includes('会议不存在')) {
		return '当前会议不存在或无权限访问，请刷新页面后重试。';
	}

	if (lower.includes('握手超时')) {
		return '在线录音连接超时，请稍后重试。';
	}

	if (stopRequested && (closeCode === 1006 || closeCode === 1005)) {
		return firstAudioSent
			? '录音已停止，但音频处理未完成，请重新录音或稍后重试。'
			: '录音时间过短或未采集到有效语音，请重新录音。';
	}

	if (
		lower.includes('websocket 连接失败') ||
		lower.includes('ws 连接失败') ||
		lower.includes('websocket 初始化失败') ||
		lower.includes('network-ws') ||
		((closeCode === 1005 || closeCode === 1006) && !wsOpened)
	) {
		return '在线录音连接失败，请检查网络或服务状态后重试。';
	}

	if (lower.includes('websocket') || closeCode === 1005 || closeCode === 1006) {
		return '在线录音连接中断，请稍后重试。';
	}

	if (lower.includes('实时录音失败')) {
		return '在线录音处理失败，请稍后重试。';
	}

	return text || '在线录音处理失败，请稍后重试。';
};

const AUDIO_UPLOAD_EXTENSIONS = new Set([
	'.mp3',
	'.wav',
	'.m4a',
	'.flac',
	'.aac',
	'.ogg',
	'.oga',
	'.opus',
	'.webm',
]);

const isAudioUploadFile = (file?: File | null): boolean => {
	if (!file) return false;
	const mimeType = String(file.type || '').trim().toLowerCase();
	if (mimeType.startsWith('audio/')) return true;
	const lowerName = String(file.name || '').trim().toLowerCase();
	return [...AUDIO_UPLOAD_EXTENSIONS].some((ext) => lowerName.endsWith(ext));
};

const getInvalidAudioUploadMessage = (file?: File | null): string =>
	`${file?.name || '该文件'} 不是支持的音频文件，请上传 MP3、WAV、M4A、FLAC、AAC、OGG 等音频格式。`;

const resolveAudioUploadErrorMessage = (error: any, file?: File | null): string => {
	const raw = String(error?.message || error?.response?.data?.detail || '').trim();
	const lower = raw.toLowerCase();
	if (
		lower.includes('mime') ||
		lower.includes('status code 400') ||
		lower.includes('不支持的 mime 类型') ||
		lower.includes('音频 mime 类型不能为空')
	) {
		return getInvalidAudioUploadMessage(file);
	}
	return raw || `${file?.name || '音频'} 上传失败`;
};

const validateAudioUploadBeforeSelect = (file: File) => {
	if (isAudioUploadFile(file)) return true;
	message.error(getInvalidAudioUploadMessage(file));
	return Upload.LIST_IGNORE;
};

const actionStatusOptions = [
	{ value: 'pending', label: '待跟进', color: 'default' },
	{ value: 'in_progress', label: '处理中', color: 'blue' },
	{ value: 'completed', label: '已完成', color: 'green' },
	{ value: 'blocked', label: '受阻', color: 'red' },
];

const MeetingMinutes: React.FC = () => {
	const location = useLocation();
	const wsDebugEnabled = useMemo(() => {
		if (typeof window === 'undefined') return false;
		try {
			const params = new URLSearchParams(window.location.search);
			return params.get('ws_debug') === '1' || window.localStorage.getItem('ws_debug') === '1';
		} catch {
			return false;
		}
	}, []);
	const wsDebug = useCallback(
		(...args: any[]) => {
			if (!wsDebugEnabled) return;
			console.debug('[ws-debug]', ...args);
		},
		[wsDebugEnabled],
	);
	const [meetings, setMeetings] = useState<Meeting[]>([]);
	const [selectedMeetingId, setSelectedMeetingId] = useState<number | undefined>();
	const [minutesMode, setMinutesMode] = useState<'local' | 'volc'>('local');
	const [sessionHistoryMode, setSessionHistoryMode] = useState<'local' | 'volc'>('local');
	const [insights, setInsights] = useState<MeetingInsights | null>(null);
	const [loadingMeetings, setLoadingMeetings] = useState(false);
	const [loadingInsights, setLoadingInsights] = useState(false);
	const [summaryDraft, setSummaryDraft] = useState('');
	const [savingSummary, setSavingSummary] = useState(false);
	const [availableFiles, setAvailableFiles] = useState<MeetingFile[]>([]);
	const [availableAudios, setAvailableAudios] = useState<MeetingAudio[]>([]);
	const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
	const [selectedAudioIds, setSelectedAudioIds] = useState<number[]>([]);
	const [generateModalVisible, setGenerateModalVisible] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [actionModalVisible, setActionModalVisible] = useState(false);
	const [decisionModalVisible, setDecisionModalVisible] = useState(false);
	const [editingAction, setEditingAction] = useState<MeetingActionItem | null>(null);
	const [editingDecision, setEditingDecision] = useState<MeetingDecisionItem | null>(null);
	const [actionForm] = Form.useForm<ActionFormValues>();
	const [decisionForm] = Form.useForm<DecisionFormValues>();
	const [recordingModalVisible, setRecordingModalVisible] = useState(false);
	const [uploadAudioModalVisible, setUploadAudioModalVisible] = useState(false);
	const [uploadFileModalVisible, setUploadFileModalVisible] = useState(false);
	const [volcLiveModalVisible, setVolcLiveModalVisible] = useState(false);
	const [volcUploadModalVisible, setVolcUploadModalVisible] = useState(false);
	const [volcAudiosModalVisible, setVolcAudiosModalVisible] = useState(false);
	const [uploadingVolcMinutesAudio, setUploadingVolcMinutesAudio] = useState(false);
	const [recordingTarget, setRecordingTarget] = useState<'local' | 'volc'>('local');
	const [uploadAudioTarget, setUploadAudioTarget] = useState<'local' | 'volc'>('local');
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const recordingChunksRef = useRef<Blob[]>([]);
	const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
	const [recordingDuration, setRecordingDuration] = useState(0);
	const [recording, setRecording] = useState(false);
	const [isPaused, setIsPaused] = useState(false);
	const [recordingUploading, setRecordingUploading] = useState(false);
	const [recordingError, setRecordingError] = useState<string | null>(null);
	const [hasRecordingData, setHasRecordingData] = useState(false);

	const [volcAudios, setVolcAudios] = useState<VolcMeetingAudio[]>([]);
	const [loadingVolcAudios, setLoadingVolcAudios] = useState(false);
	const [selectedVolcAudioId, setSelectedVolcAudioId] = useState<number | null>(null);
	const [volcMinutes, setVolcMinutes] = useState<VolcMeetingMinutes | null>(null);
	const [loadingVolcMinutes, setLoadingVolcMinutes] = useState(false);
	const [submittingVolcMinutes, setSubmittingVolcMinutes] = useState(false);
	const [volcLatestAudioId, setVolcLatestAudioId] = useState<number | null>(null);
	const [volcStreamText, setVolcStreamText] = useState('');
	const [volcStreamType, setVolcStreamType] = useState<
		'idle' | 'live_connecting' | 'live_streaming' | 'live_stopping' | 'live_saving' | 'live_uploading' | 'file_streaming' | 'completed' | 'error'
	>('idle');
	const [volcStreamError, setVolcStreamError] = useState<string | null>(null);
	const [volcStreamSessionId, setVolcStreamSessionId] = useState<number | null>(null);
	// 'live' = 在线录音来源，'upload' = 上传音频来源（无流式转写步骤）
	const [volcInputMode, setVolcInputMode] = useState<'live' | 'upload'>('live');
	const [volcTranscriptDraft, setVolcTranscriptDraft] = useState('');
	const [savingVolcTranscript, setSavingVolcTranscript] = useState(false);
	const [volcMinutesStatus, setVolcMinutesStatus] = useState<{
		status?: string;
		job_id?: number;
		task_id?: string;
		audio_id?: number;
		error?: string;
	} | null>(null);
	const [cancelingVolcMinutes, setCancelingVolcMinutes] = useState(false);
	const [activeVolcJobId, setActiveVolcJobId] = useState<number | null>(null);
	const [volcSummaryTitle, setVolcSummaryTitle] = useState('');
	const [volcSummaryDraft, setVolcSummaryDraft] = useState('');
	const [savingVolcSummary, setSavingVolcSummary] = useState(false);
	const [volcTodoModalVisible, setVolcTodoModalVisible] = useState(false);
	const [editingVolcTodo, setEditingVolcTodo] = useState<VolcMeetingTodo | null>(null);
	const [volcTodoForm] = Form.useForm<VolcTodoFormValues>();
	const [savingVolcTodo, setSavingVolcTodo] = useState(false);
	const [volcSessionsModalVisible, setVolcSessionsModalVisible] = useState(false);
	const [loadingVolcSessions, setLoadingVolcSessions] = useState(false);
	const [loadingVolcSessionDetail, setLoadingVolcSessionDetail] = useState(false);
	const [volcSessionList, setVolcSessionList] = useState<VolcMeetingMinutesSession[]>([]);
	const [selectedVolcSessionId, setSelectedVolcSessionId] = useState<number | null>(null);
	const [selectedVolcSessionDetail, setSelectedVolcSessionDetail] = useState<VolcMeetingMinutesSession | null>(null);
	const [volcSessionDraft, setVolcSessionDraft] = useState({
		stream_transcript_text: '',
		transcript_text: '',
		summary_title: '',
		summary_paragraph: '',
		speaker_segments: [] as SpeakerSegment[],
		todos: [] as VolcSessionTodoItem[],
	});
	const [savingVolcSessionDetail, setSavingVolcSessionDetail] = useState(false);
	const [editingVolcSessionSummary, setEditingVolcSessionSummary] = useState(false);
	const [volcSessionTodoModalVisible, setVolcSessionTodoModalVisible] = useState(false);
	const [editingVolcSessionTodoIndex, setEditingVolcSessionTodoIndex] = useState<number | null>(null);
	const [volcSessionTodoForm] = Form.useForm<VolcTodoFormValues>();

	// ── 本地 Qwen3-ASR 会议纪要 state ─────────────────────────────────────────
	const [localMinutes, setLocalMinutes] = useState<LocalMeetingMinutes | null>(null);
	const [loadingLocalMinutes, setLoadingLocalMinutes] = useState(false);
	const [generatingLocalMinutes, setGeneratingLocalMinutes] = useState(false);
	const [localLatestAudioId, setLocalLatestAudioId] = useState<number | null>(null);
	const [localStreamText, setLocalStreamText] = useState('');
	const [localStreamType, setLocalStreamType] = useState<
		'idle' | 'live_connecting' | 'live_streaming' | 'live_stopping' | 'live_saving' | 'live_uploading' | 'file_streaming' | 'completed' | 'error'
	>('idle');
	const [localStreamError, setLocalStreamError] = useState<string | null>(null);
	const [localStreamHint, setLocalStreamHint] = useState<string | null>(null);
	const [localStreamProgressPercent, setLocalStreamProgressPercent] = useState<number | null>(null);
	const [localStreamSessionId, setLocalStreamSessionId] = useState<number | null>(null);
	const [localInputMode, setLocalInputMode] = useState<'live' | 'upload'>('live');
	const [localMinutesStatus, setLocalMinutesStatus] = useState<{
		status?: string;
		error?: string;
	} | null>(null);
	const [cancelingLocalProcessing, setCancelingLocalProcessing] = useState(false);
	const [activeLocalProcessingAsrSessionId, setActiveLocalProcessingAsrSessionId] = useState<number | null>(null);
	const [showLocalMinutesStatus, setShowLocalMinutesStatus] = useState(false);
	const [localSummaryTitle, setLocalSummaryTitle] = useState('');
	const [localSummaryDraft, setLocalSummaryDraft] = useState('');
	const [savingLocalSummary, setSavingLocalSummary] = useState(false);
	const [localTodoModalVisible, setLocalTodoModalVisible] = useState(false);
	const [editingLocalTodo, setEditingLocalTodo] = useState<LocalMeetingTodo | null>(null);
	const [localTodoForm] = Form.useForm<LocalTodoFormValues>();
	const [savingLocalTodo, setSavingLocalTodo] = useState(false);
	const [localAudiosModalVisible, setLocalAudiosModalVisible] = useState(false);
	const [localAudios, setLocalAudios] = useState<LocalMeetingAudio[]>([]);
	const [loadingLocalAudios, setLoadingLocalAudios] = useState(false);
	const [selectedLocalAudioId, setSelectedLocalAudioId] = useState<number | null>(null);
	const [uploadingLocalAudio, setUploadingLocalAudio] = useState(false);
	const [transcribingLocalAudio, setTranscribingLocalAudio] = useState(false);
	const [localSessionsModalVisible, setLocalSessionsModalVisible] = useState(false);
	const [loadingLocalSessions, setLoadingLocalSessions] = useState(false);
	const [loadingLocalSessionDetail, setLoadingLocalSessionDetail] = useState(false);
	const [localSessionList, setLocalSessionList] = useState<LocalMeetingMinutesSession[]>([]);
	const [selectedLocalSessionId, setSelectedLocalSessionId] = useState<number | null>(null);
	const [selectedLocalSessionDetail, setSelectedLocalSessionDetail] = useState<LocalMeetingMinutesSession | null>(null);
	const [localSessionDraft, setLocalSessionDraft] = useState({
		stream_transcript_text: '',
		summary_title: '',
		summary_paragraph: '',
		todos: [] as LocalSessionTodoItem[],
	});
	const [savingLocalSessionDetail, setSavingLocalSessionDetail] = useState(false);
	const [editingLocalSessionSummary, setEditingLocalSessionSummary] = useState(false);
	const [localSessionTodoModalVisible, setLocalSessionTodoModalVisible] = useState(false);
	const [editingLocalSessionTodoIndex, setEditingLocalSessionTodoIndex] = useState<number | null>(null);
	const [localSessionTodoForm] = Form.useForm<LocalTodoFormValues>();

	const meetingWsRef = useRef<WebSocket | null>(null);
	const selectedVolcSessionIdRef = useRef<number | null>(null);
	const selectedLocalSessionIdRef = useRef<number | null>(null);
	const activeVolcJobIdRef = useRef<number | null>(null);
	const activeLocalProcessingAsrSessionIdRef = useRef<number | null>(null);
	const meetingWsHeartbeatRef = useRef<number | null>(null);
	const volcLiveWsRef = useRef<WebSocket | null>(null);
	const volcLiveStopRequestedRef = useRef(false);
	const volcStreamTypeRef = useRef<typeof volcStreamType>('idle');
	const volcSseRef = useRef<EventSource | null>(null);
	const volcSseAudioIdRef = useRef<number | null>(null);
	const volcStreamCompleteCallbackRef = useRef<((audioId?: number) => void) | null>(null);
	const volcAudioContextRef = useRef<AudioContext | null>(null);
	const volcMediaStreamRef = useRef<MediaStream | null>(null);
	const volcProcessorRef = useRef<ScriptProcessorNode | null>(null);
	const volcLiveFirstAudioSentRef = useRef(false);
	const volcLiveFirstAudioTimerRef = useRef<number | null>(null);
	const volcLiveWsOpenedRef = useRef(false);
	const volcLiveWsConnectTimerRef = useRef<number | null>(null);
	const volcLiveSessionIdRef = useRef(0);
	const volcResetPendingRef = useRef(false);
	const volcDiscardHydrationRef = useRef(false);
	const volcLeaveGuardBypassRef = useRef(false);
	const volcStreamCardRef = useRef<HTMLDivElement | null>(null);

	// ── 本地 Qwen3-ASR refs ──────────────────────────────────────────────────
	const localLiveWsRef = useRef<WebSocket | null>(null);
	const localLiveStopRequestedRef = useRef(false);
	const localStreamTypeRef = useRef<typeof localStreamType>('idle');
	const localStreamTextRef = useRef('');
	const localStreamSessionIdRef = useRef<number | null>(null);
	const localSseRef = useRef<EventSource | null>(null);
	const localFileWsRef = useRef<WebSocket | null>(null);
	const localSseAudioIdRef = useRef<number | null>(null);
	const localAudioContextRef = useRef<AudioContext | null>(null);
	const localMediaStreamRef = useRef<MediaStream | null>(null);
	const localProcessorRef = useRef<ScriptProcessorNode | null>(null);
	const localLiveFirstAudioSentRef = useRef(false);
	const localLiveFirstAudioTimerRef = useRef<number | null>(null);
	const localLiveWsOpenedRef = useRef(false);
	const localLiveWsConnectTimerRef = useRef<number | null>(null);
	const localLiveReconnectAttemptsRef = useRef(0);
	const localLiveSessionIdRef = useRef(0);
	const localStreamCardRef = useRef<HTMLDivElement | null>(null);
	const localLiveChunkBuffersRef = useRef<ArrayBuffer[]>([]);
	const localLiveChunkBytesRef = useRef(0);
	const localDiscardHydrationRef = useRef(false);
	const localLeaveGuardBypassRef = useRef(false);
	const localUploadedTranscribeSessionIdRef = useRef<number | null>(null);
	const localUploadedTranscribeAudioIdRef = useRef<number | null>(null);
	const loadLocalAudioListRef = useRef<((meetingId: number) => Promise<void>) | null>(null);
	const loadLocalMinutesDataRef = useRef<((meetingId: number, showToast?: boolean) => Promise<void>) | null>(null);
	const loadLocalSessionsRef = useRef<((meetingId: number, keepSelection?: boolean) => Promise<void>) | null>(null);
	const handleGenerateLocalMinutesRef = useRef<((meetingId?: number, asrSessionId?: number | null) => Promise<void>) | null>(null);
	const selectedMeetingIdRef = useRef<number | undefined>(undefined);
	const selectedVolcAudioIdRef = useRef<number | null>(null);
	const volcLatestAudioIdRef = useRef<number | null>(null);
	const volcMinutesStatusRef = useRef<typeof volcMinutesStatus>(null);

	// 记录当前激活的 meetingId 请求，用于竞态防护
	const loadingMeetingIdRef = useRef<number | null>(null);
	const hasSelectedMeeting = typeof selectedMeetingId === 'number';
	const buildOnlineRecordingLimitMessage = (count: number) =>
		`每个会议最多支持 ${MAX_ONLINE_RECORDING_COUNT} 条在线录音，当前已 ${count} 条，请先删除旧音频后再录音。`;
	const isMinutesMainRoute = location.pathname === '/meetings/minutes';
	const isSessionsRoute = location.pathname === '/meetings/sessions';
	const isVolcSubmitInProgressStatus = useCallback((status?: string | null) => isVolcInProgressStatus(status), []);
	const isVolcFinalCompleted = useMemo(() => {
		// 最终态统一判定：状态成功，或页面已拥有一份稳定纪要结果（避免状态字段短暂为空导致误判）。
		const stableStatus = getVolcMinutesJobStatus(volcMinutes, volcMinutesStatus?.status);
		if (isVolcCompletedStatus(stableStatus)) {
			return true;
		}
		const hasStableMinutesResult =
			!!(volcMinutes?.transcript_text || '').trim() ||
			(volcMinutes?.speaker_segments?.length ?? 0) > 0 ||
			!!(volcMinutes?.summary?.paragraph || '').trim() ||
			(volcMinutes?.todos?.length ?? 0) > 0;
		return hasStableMinutesResult;
	}, [
		volcMinutesStatus?.status,
		volcMinutes?.minutes_job_status,
		volcMinutes?.audio_status,
		volcMinutes?.transcript_text,
		volcMinutes?.speaker_segments,
		volcMinutes?.summary?.paragraph,
		volcMinutes?.todos,
	]);
	const hasVolcWorkspaceDraft = useMemo(() => {
		const hasStream = !!volcStreamText.trim();
		const hasTranscript = !!volcTranscriptDraft.trim();
		const hasSummary = !!volcSummaryDraft.trim() || !!volcSummaryTitle.trim();
		const hasTodos = (volcMinutes?.todos?.length ?? 0) > 0;
		return hasStream || hasTranscript || hasSummary || hasTodos;
	}, [volcStreamText, volcTranscriptDraft, volcSummaryDraft, volcSummaryTitle, volcMinutes?.todos]);
	const shouldGuardVolcLeave = useMemo(() => {
		if (!isMinutesMainRoute || minutesMode !== 'volc') return false;
		if (isVolcFinalCompleted) return false;
		const streamBusy = VOLC_BUSY_STREAM_TYPES.has(volcStreamType);
		return streamBusy || submittingVolcMinutes || isVolcSubmitInProgressStatus(volcMinutesStatus?.status) || hasVolcWorkspaceDraft;
	}, [
		isMinutesMainRoute,
		minutesMode,
		isVolcFinalCompleted,
		volcStreamType,
		submittingVolcMinutes,
		isVolcSubmitInProgressStatus,
		volcMinutesStatus?.status,
		hasVolcWorkspaceDraft,
	]);
	const isLocalSubmitInProgressStatus = useCallback((status?: string | null) => {
		const raw = String(status ?? '').trim().toLowerCase();
		if (!raw) return false;
		return ['processing', 'submitted', 'running', 'pending', '处理中', '运行中', '等待中'].includes(raw);
	}, []);
	const isLocalFinalCompleted = useMemo(() => {
		const status = String(localMinutesStatus?.status ?? '').trim().toLowerCase();
		if (['completed', 'succeeded', 'success', 'finished'].includes(status)) {
			return true;
		}
		const hasStableMinutesResult =
			!!(localMinutes?.transcript_text || '').trim() ||
			!!(localMinutes?.summary?.paragraph || '').trim() ||
			(localMinutes?.todos?.length ?? 0) > 0;
		return hasStableMinutesResult;
	}, [
		localMinutesStatus?.status,
		localMinutes?.transcript_text,
		localMinutes?.summary?.paragraph,
		localMinutes?.todos,
	]);
	const hasLocalWorkspaceDraft = useMemo(() => {
		const hasStream = !!localStreamText.trim();
		const hasSummary = !!localSummaryDraft.trim() || !!localSummaryTitle.trim();
		const hasTodos = (localMinutes?.todos?.length ?? 0) > 0;
		return hasStream || hasSummary || hasTodos;
	}, [localStreamText, localSummaryDraft, localSummaryTitle, localMinutes?.todos]);
	const shouldGuardLocalLeave = useMemo(() => {
		if (!isMinutesMainRoute || minutesMode !== 'local') return false;
		if (isLocalFinalCompleted) return false;
		const streamBusy = LOCAL_BUSY_STREAM_TYPES.has(localStreamType);
		return streamBusy || generatingLocalMinutes || isLocalSubmitInProgressStatus(localMinutesStatus?.status) || hasLocalWorkspaceDraft;
	}, [
		isMinutesMainRoute,
		minutesMode,
		isLocalFinalCompleted,
		localStreamType,
		generatingLocalMinutes,
		isLocalSubmitInProgressStatus,
		localMinutesStatus?.status,
		hasLocalWorkspaceDraft,
	]);
	const shouldGuardMinutesLeave = minutesMode === 'volc' ? shouldGuardVolcLeave : shouldGuardLocalLeave;
	const isCompletedSessionStatus = useCallback((status?: string | null): boolean => {
		const normalized = String(status ?? '').trim().toLowerCase();
		return (
			normalized === 'completed' ||
			normalized === 'finished' ||
			normalized === 'success' ||
			normalized === 'succeeded' ||
			String(status ?? '').trim() === '已完成'
		);
	}, []);

	const queryMeetingId = useMemo(() => {
		const params = new URLSearchParams(location.search);
		const item = params.get('meetingId');
		if (!item) return undefined;
		const parsed = Number(item);
		return Number.isNaN(parsed) ? undefined : parsed;
	}, [location.search]);
	const shouldSyncVolcSessions = volcSessionsModalVisible || (isSessionsRoute && sessionHistoryMode === 'volc');
	const shouldSyncLocalSessions = localSessionsModalVisible || (isSessionsRoute && sessionHistoryMode === 'local');
	const buildMeetingRouteWithQuery = useCallback(
		(meetingId: number, targetPath = location.pathname) => {
			const params = new URLSearchParams(location.search);
			params.set('meetingId', String(meetingId));
			return `${targetPath}?${params.toString()}`;
		},
		[location.pathname, location.search],
	);

	useEffect(() => {
		if (queryMeetingId) {
			setSelectedMeetingId(queryMeetingId);
		}
	}, [queryMeetingId]);

	useEffect(() => {
		selectedMeetingIdRef.current = selectedMeetingId;
	}, [selectedMeetingId]);
	useEffect(() => {
		selectedVolcAudioIdRef.current = selectedVolcAudioId;
	}, [selectedVolcAudioId]);
	useEffect(() => {
		volcLatestAudioIdRef.current = volcLatestAudioId;
	}, [volcLatestAudioId]);
	useEffect(() => {
		volcMinutesStatusRef.current = volcMinutesStatus;
	}, [volcMinutesStatus]);

	const loadMeetings = async () => {
		setLoadingMeetings(true);
		try {
			const data = await meetingsApi.list();
			const sorted = [...data].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
			setMeetings(sorted);
			if (!queryMeetingId && !selectedMeetingId && sorted.length) {
				const firstId = sorted[0].id;
				setSelectedMeetingId(firstId);
				history.replace(buildMeetingRouteWithQuery(firstId));
			}
		} catch (error: any) {
			message.error(error?.message || '加载会议失败');
		} finally {
			setLoadingMeetings(false);
		}
	};

	useEffect(() => {
		loadMeetings();
	}, []);

	const loadInsights = async (meetingId: number, showToast = false) => {
		setLoadingInsights(true);
		try {
			const result = await meetingMinutesApi.getInsights(meetingId);
			setInsights(result);
			setSummaryDraft(result.summary?.summary_text || '');
			if (showToast) {
				message.success('已刷新纪要内容');
			}
		} catch (error: any) {
			if (error?.response?.status === 404) {
				setInsights(null);
				setSummaryDraft('');
				if (showToast) message.info('尚未生成该会议的纪要');
			} else {
				message.error(error?.message || '获取会议纪要失败');
			}
		} finally {
			setLoadingInsights(false);
		}
	};

	const loadAssets = async (meetingId: number) => {
		try {
			const [files, audios] = await Promise.all([
				meetingsApi.listFiles(meetingId),
				meetingsApi.listAudios(meetingId),
			]);
			setAvailableFiles(files);
			setAvailableAudios(audios);
		} catch (error: any) {
			message.warning(error?.message || '加载会议资料失败');
		}
	};

	const loadVolcAudioList = useCallback(async (meetingId: number) => {
		setLoadingVolcAudios(true);
		try {
			const list = await meetingsApi.listVolcAudios(meetingId);
			const normalized = [...(list || [])].sort((a, b) => {
				const at = dayjs(a.created_at).valueOf();
				const bt = dayjs(b.created_at).valueOf();
				return bt - at;
			});
			setVolcAudios(normalized);
			setVolcLatestAudioId(normalized[0]?.id ?? null);
			if (selectedVolcAudioId && !normalized.find((item) => item.id === selectedVolcAudioId)) {
				setSelectedVolcAudioId(null);
			}
		} catch (error: any) {
			message.warning(error?.message || '加载火山音频失败');
		} finally {
			setLoadingVolcAudios(false);
		}
	}, [selectedVolcAudioId]);

	const loadLocalAudioList = useCallback(async (meetingId: number) => {
		setLoadingLocalAudios(true);
		try {
			const list = await meetingsApi.listLocalAudios(meetingId);
			const normalized = [...(list || [])].sort((a, b) => {
				const at = dayjs(a.created_at).valueOf();
				const bt = dayjs(b.created_at).valueOf();
				return bt - at;
			});
			setLocalAudios(normalized);
			setLocalLatestAudioId(normalized[0]?.id ?? null);
			if (selectedLocalAudioId && !normalized.find((item) => item.id === selectedLocalAudioId)) {
				setSelectedLocalAudioId(null);
			}
		} catch (error: any) {
			message.warning(error?.message || '加载本地音频失败');
		} finally {
			setLoadingLocalAudios(false);
		}
	}, [selectedLocalAudioId]);

	const loadVolcMinutesData = useCallback(async (meetingId: number, showToast = false) => {
		// 竞态保护：记录本次请求对应的 meetingId，返回后若已切换到其他会议则丢弃结果
		loadingMeetingIdRef.current = meetingId;
		setLoadingVolcMinutes(true);
		try {
			if (volcDiscardHydrationRef.current && isMinutesMainRoute && minutesMode === 'volc') {
				return;
			}
			const result = await meetingMinutesApi.getVolcMinutes(meetingId);

			// 请求返回时若 meetingId 已改变，丢弃旧结果，防止覆盖新会议数据
			if (loadingMeetingIdRef.current !== meetingId) return;
			if (volcDiscardHydrationRef.current && isMinutesMainRoute && minutesMode === 'volc') return;

			// 过滤后端异常写入的 JSON fallback（如 {"paragraph":"","title":""}）
			const _isJsonGarbage = (s: string | null | undefined) => {
				if (!s) return false;
				const t = s.trimStart();
				return t.startsWith('{') || t.startsWith('[');
			};
			const cleanParagraph = _isJsonGarbage(result.summary?.paragraph) ? '' : (result.summary?.paragraph || '');
			const cleanTitle = _isJsonGarbage(result.summary?.title) ? '' : (result.summary?.title || '');
			const hasSummary = !!(cleanParagraph || cleanTitle);

			setVolcMinutes({
				...result,
				summary: hasSummary && result.summary ? { ...result.summary, paragraph: cleanParagraph, title: cleanTitle || null } : null,
			});
			const stableJobStatus = getVolcMinutesJobStatus(result);
			const latestJobId =
				typeof result.minutes_job_id === 'number' ? result.minutes_job_id : null;
			setActiveVolcJobId(
				latestJobId != null && isVolcInProgressStatus(stableJobStatus) ? latestJobId : null,
			);
			setCancelingVolcMinutes(false);

			// 精确转写：只有妙记真正跑完才填入（处理中 deliberately 留空，避免半成品误导）。
			const miaojiCompleted = isVolcCompletedStatus(stableJobStatus);
			const hasTranscript =
				miaojiCompleted &&
				!!(String(result.transcript_text || '').trim() || (result.speaker_segments?.length ?? 0));
			setVolcTranscriptDraft(
				hasTranscript ? buildVolcPreciseTranscriptText(result.transcript_text, result.speaker_segments) : '',
			);
			// 摘要：有内容才填入；无内容时清空
			setVolcSummaryTitle(cleanTitle);
			setVolcSummaryDraft(cleanParagraph);

			// 流式转写文本：
			//   - 若当前正在本会议的流式转写/录音中（file_streaming/live_*），保留实时内容不覆盖
			//   - 其他情况（包括切换会议后的恢复）直接用数据库结果刷新
			setVolcStreamText((prev) => {
				const streamType = volcStreamTypeRef.current;
				const isStreaming = streamType === 'file_streaming' || streamType === 'live_streaming' || streamType === 'live_connecting' || streamType === 'live_stopping' || streamType === 'live_saving' || streamType === 'live_uploading';
				if (isStreaming && prev) return prev;
				return result.stream_transcript_text || '';
			});
			setVolcStreamType((prev) => {
				const isActive = prev === 'file_streaming' || prev === 'live_streaming' || prev === 'live_connecting' || prev === 'live_stopping' || prev === 'live_saving' || prev === 'live_uploading';
				if (isActive) return prev;
				return result.stream_transcript_text ? 'completed' : 'idle';
			});
			if (showToast) {
				if (result.transcript_text || result.summary || result.todos.length) {
					message.success(`已刷新${MINUTES_MODE_LABEL.volc}`);
				} else {
					message.info(`${MINUTES_MODE_LABEL.volc}尚未生成`);
				}
			}
		} catch (error: any) {
			if (loadingMeetingIdRef.current !== meetingId) return;
			message.error(error?.message || `获取${MINUTES_MODE_LABEL.volc}失败`);
			setVolcMinutes(null);
			setVolcTranscriptDraft('');
			setVolcSummaryTitle('');
			setVolcSummaryDraft('');
			setVolcStreamText('');
			setVolcStreamType('idle');
		} finally {
			if (loadingMeetingIdRef.current === meetingId) setLoadingVolcMinutes(false);
		}
	}, [isMinutesMainRoute, minutesMode]);

	const loadVolcSessions = useCallback(async (meetingId: number, keepSelection = true) => {
		setLoadingVolcSessions(true);
		try {
			const list = await meetingMinutesApi.listVolcMinutesSessions(meetingId);
			const normalized = [...(list || [])].sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf());
			setVolcSessionList(normalized);
			const defaultId = normalized[0]?.id ?? null;
			const currentId = keepSelection ? selectedVolcSessionIdRef.current : null;
			const nextId = currentId && normalized.some((item) => item.id === currentId) ? currentId : defaultId;
			setSelectedVolcSessionId(nextId);
			if (!nextId) {
				setSelectedVolcSessionDetail(null);
				return;
			}
			const detail = await meetingMinutesApi.getVolcMinutesSession(meetingId, nextId);
			setSelectedVolcSessionDetail(detail);
		} catch (error: any) {
			message.warning(error?.message || '加载会话历史失败');
			setVolcSessionList([]);
			setSelectedVolcSessionId(null);
			setSelectedVolcSessionDetail(null);
		} finally {
			setLoadingVolcSessions(false);
		}
	}, []);

	const loadVolcSessionDetail = useCallback(async (meetingId: number, sessionId: number) => {
		setLoadingVolcSessionDetail(true);
		try {
			const detail = await meetingMinutesApi.getVolcMinutesSession(meetingId, sessionId);
			setSelectedVolcSessionDetail(detail);
		} catch (error: any) {
			if (error?.response?.status === 404) {
				setSelectedVolcSessionDetail(null);
				return;
			}
			message.warning(error?.message || '加载会话详情失败');
		} finally {
			setLoadingVolcSessionDetail(false);
		}
	}, []);

	const loadLocalSessions = useCallback(async (meetingId: number, keepSelection = true) => {
		setLoadingLocalSessions(true);
		try {
			const list = await meetingMinutesApi.listLocalMinutesSessions(meetingId);
			// 本地会话历史按最新优先展示，失败会话可第一时间在首页看到。
			const normalized = [...(list || [])].sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf());
			setLocalSessionList(normalized);
			const defaultId = normalized[0]?.id ?? null;
			const currentId = keepSelection ? selectedLocalSessionIdRef.current : null;
			const nextId = currentId && normalized.some((item) => item.id === currentId) ? currentId : defaultId;
			setSelectedLocalSessionId(nextId);
			if (!nextId) {
				setSelectedLocalSessionDetail(null);
				return;
			}
			const detail =
				normalized.find((item) => item.id === nextId) ||
				(await meetingMinutesApi.getLocalMinutesSession(meetingId, nextId));
			setSelectedLocalSessionDetail(detail);
		} catch (error: any) {
			message.warning(error?.message || '加载会话历史失败');
			setLocalSessionList([]);
			setSelectedLocalSessionId(null);
			setSelectedLocalSessionDetail(null);
		} finally {
			setLoadingLocalSessions(false);
		}
	}, []);

	const loadLocalSessionDetail = useCallback(async (meetingId: number, sessionId: number) => {
		setLoadingLocalSessionDetail(true);
		try {
			const detail = await meetingMinutesApi.getLocalMinutesSession(meetingId, sessionId);
			setSelectedLocalSessionDetail(detail);
		} catch (error: any) {
			if (error?.response?.status === 404) {
				setSelectedLocalSessionDetail(null);
				return;
			}
			message.warning(error?.message || '加载会话详情失败');
		} finally {
			setLoadingLocalSessionDetail(false);
		}
	}, []);

	const buildWsUrl = (path: string) => {
		if (typeof window === 'undefined') return path;
		const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
		const isLoopbackHost = (hostname: string) =>
			hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '0.0.0.0';
		const pageHostIsLoopback = isLoopbackHost(window.location.hostname);
		const sameOriginUrl = () => `${protocol}://${window.location.host}${path}`;
		const wsMode = String((process.env as any).DEV_BACKEND_WS_MODE || 'auto').trim().toLowerCase();

		// auto: 保持原有“本机直连、远程同源代理”的策略。
		// proxy: 一律走前端同源地址，适合 SSH/端口转发访问开发环境。
		// direct: 一律直连 DEV_BACKEND_WS_BASE/RAG_SERVICE_WS_URL，适合浏览器可直接访问后端 WS 的场景。
		const devBase = (process.env as any).DEV_BACKEND_WS_BASE as string | undefined;
		if (typeof devBase === 'string' && devBase.length > 0) {
			try {
				const baseUrl = new URL(devBase);
				if (wsMode === 'proxy') {
					return sameOriginUrl();
				}
				if (wsMode === 'direct') {
					return `${baseUrl.toString().replace(/\/$/, '')}${path}`;
				}
				if (isLoopbackHost(baseUrl.hostname) && !pageHostIsLoopback) {
					return sameOriginUrl();
				}
				return `${baseUrl.toString().replace(/\/$/, '')}${path}`;
			} catch {
				if (wsMode === 'proxy') {
					return sameOriginUrl();
				}
				return `${devBase}${path}`;
			}
		}

		if (process.env.NODE_ENV === 'development') {
			if (wsMode === 'proxy') {
				return sameOriginUrl();
			}
			if (!pageHostIsLoopback) {
				return sameOriginUrl();
			}
			return `ws://127.0.0.1:8080${path}`;
		}

		return sameOriginUrl();
	};

	useEffect(() => {
		selectedVolcSessionIdRef.current = selectedVolcSessionId;
	}, [selectedVolcSessionId]);

	useEffect(() => {
		selectedLocalSessionIdRef.current = selectedLocalSessionId;
	}, [selectedLocalSessionId]);

	useEffect(() => {
		activeVolcJobIdRef.current = activeVolcJobId;
	}, [activeVolcJobId]);

	useEffect(() => {
		activeLocalProcessingAsrSessionIdRef.current = activeLocalProcessingAsrSessionId;
	}, [activeLocalProcessingAsrSessionId]);

	useEffect(() => {
		localStreamSessionIdRef.current = localStreamSessionId;
	}, [localStreamSessionId]);

	const closeMeetingWs = useCallback(() => {
		if (meetingWsHeartbeatRef.current) {
			window.clearInterval(meetingWsHeartbeatRef.current);
			meetingWsHeartbeatRef.current = null;
		}
		if (meetingWsRef.current) {
			try {
				meetingWsRef.current.close();
			} catch {
				// ignore
			}
			meetingWsRef.current = null;
		}
	}, []);

	const connectMeetingWs = useCallback(
		(meetingId: number) => {
			closeMeetingWs();

			const token = getToken();
			const qs = token ? `?token=${encodeURIComponent(token)}` : '';
			const wsUrl = buildWsUrl(`/api/meetings/audio/ws/${meetingId}${qs}`);
			wsDebug('meetingWs connect', wsUrl);
			const ws = new WebSocket(wsUrl);
			meetingWsRef.current = ws;

			ws.onmessage = (event) => {
				wsDebug('meetingWs message', event.data);
				try {
					const payload = JSON.parse(String(event.data || '{}'));
					if (!payload?.type) return;

					const matchesActiveLocalUploadTask = (allowPendingSessionBinding = false) => {
						const expectedAudioId = localUploadedTranscribeAudioIdRef.current;
						if (expectedAudioId == null || payload.audio_id !== expectedAudioId) return false;
						const expectedSessionId = localUploadedTranscribeSessionIdRef.current;
						if (expectedSessionId == null) {
							return allowPendingSessionBinding;
						}
						return payload.asr_session_id === expectedSessionId;
					};

					const syncActiveLocalUploadSession = () => {
						if (
							localUploadedTranscribeAudioIdRef.current === payload.audio_id &&
							localUploadedTranscribeSessionIdRef.current == null &&
							typeof payload.asr_session_id === 'number'
						) {
							localUploadedTranscribeSessionIdRef.current = payload.asr_session_id;
						}
					};

					if (payload.type === 'local_audio_transcribe_started') {
						if (!matchesActiveLocalUploadTask(true)) {
							return;
						}
						syncActiveLocalUploadSession();
						setLocalStreamSessionId(payload.asr_session_id || null);
						setActiveLocalProcessingAsrSessionId(payload.asr_session_id || null);
						setLocalStreamType('file_streaming');
						setLocalStreamError(null);
						setLocalStreamHint(typeof payload.message === 'string' ? payload.message : '正在准备音频文件…');
						setLocalStreamProgressPercent(0);
						setTranscribingLocalAudio(true);
						setShowLocalMinutesStatus(true);
						setLocalMinutesStatus({ status: payload.status || 'processing' });
						return;
					}

					if (payload.type === 'local_audio_transcribe_stage') {
						if (!matchesActiveLocalUploadTask(true)) {
							return;
						}
						syncActiveLocalUploadSession();
						setLocalStreamSessionId(payload.asr_session_id || null);
						setActiveLocalProcessingAsrSessionId(payload.asr_session_id || null);
						setLocalStreamType('file_streaming');
						setLocalStreamError(null);
						setLocalStreamHint(
							typeof payload.message === 'string' && payload.message.trim()
								? payload.message
								: '正在处理音频，请稍候…',
						);
						const stageProgress = resolveLocalStageProgressPercent(payload);
						if (stageProgress != null) {
							setLocalStreamProgressPercent((prev) => (prev == null ? stageProgress : Math.max(prev, stageProgress)));
						}
						setTranscribingLocalAudio(true);
						setShowLocalMinutesStatus(true);
						setLocalMinutesStatus({ status: payload.status || 'processing' });
						return;
					}

					if (payload.type === 'local_audio_transcribe_progress') {
						if (!matchesActiveLocalUploadTask()) {
							return;
						}
						syncActiveLocalUploadSession();
						setLocalStreamSessionId(payload.asr_session_id || null);
						setActiveLocalProcessingAsrSessionId(payload.asr_session_id || null);
						if (typeof payload.accumulated === 'string') {
							setLocalStreamText(payload.accumulated);
						}
						setLocalStreamType('file_streaming');
						setLocalStreamError(null);
						setLocalStreamHint(
							typeof payload.chunk_idx === 'number' && typeof payload.total_chunks === 'number'
								? `正在识别第 ${payload.chunk_idx + 1}/${payload.total_chunks} 段音频…`
								: '正在继续识别音频…',
						);
						const chunkProgress = resolveLocalChunkProgressPercent(payload.chunk_idx, payload.total_chunks);
						if (chunkProgress != null) {
							setLocalStreamProgressPercent((prev) => (prev == null ? chunkProgress : Math.max(prev, chunkProgress)));
						}
						setTranscribingLocalAudio(true);
						setShowLocalMinutesStatus(true);
						setLocalMinutesStatus({ status: payload.status || 'processing' });
						return;
					}

					if (payload.type === 'local_audio_transcribe_failed') {
						if (!matchesActiveLocalUploadTask()) {
							return;
						}
						syncActiveLocalUploadSession();
						const errMsg =
							(typeof payload.error === 'string' && payload.error.trim()) ||
							'本地音频转写失败，请稍后重试。';
						setLocalStreamSessionId(payload.asr_session_id || null);
						if (typeof payload.transcript === 'string') {
							setLocalStreamText(payload.transcript);
						}
						setLocalStreamType('error');
						setLocalStreamError(errMsg);
						setLocalStreamHint(null);
						setLocalStreamProgressPercent(null);
						setTranscribingLocalAudio(false);
						setActiveLocalProcessingAsrSessionId(null);
						setShowLocalMinutesStatus(true);
						setLocalMinutesStatus({ status: payload.status || 'failed', error: errMsg });
						localUploadedTranscribeSessionIdRef.current = null;
						localUploadedTranscribeAudioIdRef.current = null;
						void loadLocalAudioListRef.current?.(meetingId);
						return;
					}

					if (payload.type === 'local_audio_transcribe_completed') {
						if (!matchesActiveLocalUploadTask()) {
							return;
						}
						syncActiveLocalUploadSession();
						const transcript = typeof payload.transcript === 'string' ? payload.transcript : '';
						const minutesGenerated = Boolean(payload.minutes_generated);
						const minutesError =
							typeof payload.minutes_error === 'string' ? payload.minutes_error.trim() : '';
						setLocalStreamSessionId(payload.asr_session_id || null);
						setActiveLocalProcessingAsrSessionId(payload.asr_session_id || null);
						setLocalStreamText(transcript);
						setLocalStreamType('completed');
						setLocalStreamError(null);
						setLocalStreamHint(null);
						setLocalStreamProgressPercent(100);
						setTranscribingLocalAudio(false);
						localUploadedTranscribeSessionIdRef.current = null;
						localUploadedTranscribeAudioIdRef.current = null;
						void loadLocalAudioListRef.current?.(meetingId);
						if (!transcript.trim()) {
							const errMsg = '音频转写完成，但未识别到有效文本，暂时无法生成会议纪要。';
							setShowLocalMinutesStatus(true);
							setLocalMinutesStatus({ status: 'failed', error: errMsg });
							setLocalStreamError(errMsg);
							message.warning(errMsg);
							return;
						}
						setShowLocalMinutesStatus(true);
						setLocalMinutesStatus({ status: 'processing' });
						if (minutesGenerated) {
							setLocalMinutesStatus({ status: 'completed' });
							setActiveLocalProcessingAsrSessionId(null);
							message.success('转写完成，会议纪要已自动生成');
							void loadLocalMinutesDataRef.current?.(meetingId, false);
							if (shouldSyncLocalSessions) {
								void loadLocalSessionsRef.current?.(meetingId, true);
							}
							return;
						}
						if (minutesError) {
							message.warning(`自动生成失败，改用兜底生成：${minutesError}`);
						}
						message.success('转写完成，正在自动生成会议纪要…');
						void handleGenerateLocalMinutesRef.current?.(meetingId, payload.asr_session_id);
						return;
					}

					if (payload.type === 'local_audio_transcribe_cancelled') {
						if (!matchesActiveLocalUploadTask(true)) {
							return;
						}
						syncActiveLocalUploadSession();
						const cancelledMsg =
							(typeof payload.error === 'string' && payload.error.trim()) ||
							'已结束当前处理。';
						const nextTranscript =
							typeof payload.transcript === 'string' ? payload.transcript : localStreamTextRef.current;
						setLocalStreamSessionId(payload.asr_session_id || null);
						if (typeof payload.transcript === 'string') {
							setLocalStreamText(payload.transcript);
						}
						setLocalStreamType(nextTranscript.trim() ? 'completed' : 'idle');
						setLocalStreamError(null);
						setLocalStreamHint(cancelledMsg);
						setLocalStreamProgressPercent(null);
						setTranscribingLocalAudio(false);
						setGeneratingLocalMinutes(false);
						setCancelingLocalProcessing(false);
						setActiveLocalProcessingAsrSessionId(null);
						setShowLocalMinutesStatus(true);
						setLocalMinutesStatus({ status: 'cancelled' });
						localUploadedTranscribeSessionIdRef.current = null;
						localUploadedTranscribeAudioIdRef.current = null;
						void loadLocalAudioListRef.current?.(meetingId);
						return;
					}

					if (payload.type === 'local_minutes_cancelled') {
						const currentAsrSessionId =
							activeLocalProcessingAsrSessionIdRef.current ?? localStreamSessionIdRef.current;
						if (
							typeof payload.asr_session_id === 'number' &&
							currentAsrSessionId != null &&
							payload.asr_session_id !== currentAsrSessionId
						) {
							return;
						}
						setGeneratingLocalMinutes(false);
						setCancelingLocalProcessing(false);
						setActiveLocalProcessingAsrSessionId(null);
						setShowLocalMinutesStatus(true);
						setLocalMinutesStatus({ status: 'cancelled' });
						setLocalStreamProgressPercent(null);
						setLocalStreamError(null);
						setLocalStreamHint('已结束当前生成，当前已识别文本会保留。');
						return;
					}

					if (payload.type === 'volc_minutes_status') {
						if (volcDiscardHydrationRef.current && isMinutesMainRoute && minutesMode === 'volc') {
							return;
						}
						setVolcMinutesStatus({
							status: payload.status,
							job_id: payload.job_id,
							task_id: payload.task_id,
							audio_id: payload.audio_id,
						});
						if (typeof payload.job_id === 'number') {
							setActiveVolcJobId(payload.job_id);
						}
					}

					if (payload.type === 'volc_minutes_failed') {
						if (volcDiscardHydrationRef.current && isMinutesMainRoute && minutesMode === 'volc') {
							return;
						}
						setVolcMinutesStatus({
							status: payload.status || 'failed',
							job_id: payload.job_id,
							task_id: payload.task_id,
							audio_id: payload.audio_id,
							error: resolveVolcErrorMessage(payload.error),
						});
						setCancelingVolcMinutes(false);
						setActiveVolcJobId(null);
					}

					if (payload.type === 'volc_minutes_completed') {
						if (volcDiscardHydrationRef.current && isMinutesMainRoute && minutesMode === 'volc') {
							return;
						}
						const streamType = volcStreamTypeRef.current;
						// 新生成进行中时不应用可能过期的完成消息，避免覆盖已清空的展示
						if (streamType === 'file_streaming' || streamType === 'live_streaming' || streamType === 'live_connecting' || streamType === 'live_stopping' || streamType === 'live_saving' || streamType === 'live_uploading') {
							return;
						}
						setVolcMinutesStatus({
							status: payload.status || 'completed',
							job_id: payload.job_id,
							task_id: payload.task_id,
							audio_id: payload.audio_id,
						});
						setCancelingVolcMinutes(false);
						setActiveVolcJobId(null);
						void loadVolcMinutesData(meetingId, true);
						void loadVolcAudioList(meetingId);
						if (shouldSyncVolcSessions) {
							void loadVolcSessions(meetingId, false);
						}
					}

					if (payload.type === 'volc_minutes_cancelled') {
						if (volcDiscardHydrationRef.current && isMinutesMainRoute && minutesMode === 'volc') {
							return;
						}
						setVolcMinutesStatus({
							status: payload.status || 'cancelled',
							job_id: payload.job_id,
							task_id: payload.task_id,
							audio_id: payload.audio_id,
							error: typeof payload.error === 'string' ? payload.error : undefined,
						});
						setCancelingVolcMinutes(false);
						setActiveVolcJobId(null);
						void loadVolcAudioList(meetingId);
					}
				} catch {
					// ignore malformed message
				}
			};

			ws.onopen = () => {
				wsDebug('meetingWs open');
				if (meetingWsHeartbeatRef.current) window.clearInterval(meetingWsHeartbeatRef.current);
				meetingWsHeartbeatRef.current = window.setInterval(() => {
					try {
						if (ws.readyState === WebSocket.OPEN) ws.send('ping');
					} catch {
						// ignore
					}
				}, 15000);
			};

			ws.onclose = () => {
				wsDebug('meetingWs close');
				if (meetingWsHeartbeatRef.current) {
					window.clearInterval(meetingWsHeartbeatRef.current);
					meetingWsHeartbeatRef.current = null;
				}
			};

			ws.onerror = (event) => {
				wsDebug('meetingWs error', event);
			};
		},
		[
			closeMeetingWs,
			loadVolcMinutesData,
			loadVolcAudioList,
			loadVolcSessions,
			shouldSyncVolcSessions,
			shouldSyncLocalSessions,
			wsDebug,
			isMinutesMainRoute,
			minutesMode,
		],
	);

	useEffect(() => {
		// 无论切换到哪个会议（或置空），先把与上个会议相关的展示状态全部清空，
		// 防止切换后仍显示上一个会议的内容（竞态 + 旧 state 残留）
		stopVolcSseStream();
		void stopVolcLiveWs(true);
		setVolcMinutes(null);
		setVolcMinutesStatus(null);
		setActiveVolcJobId(null);
		setCancelingVolcMinutes(false);
		setSelectedVolcAudioId(null);
		setVolcLatestAudioId(null);
		setVolcStreamText('');
		setVolcStreamType('idle');
		setVolcStreamError(null);
		setVolcStreamSessionId(null);
		setVolcInputMode('live');
		setVolcTranscriptDraft('');
		setVolcSummaryTitle('');
		setVolcSummaryDraft('');
		setVolcAudios([]);
		setVolcSessionList([]);
		setSelectedVolcSessionId(null);
		setSelectedVolcSessionDetail(null);
		setVolcSessionsModalVisible(false);

		// 本地模式清空
		stopLocalSseStream();
		void stopLocalLiveWs(true);
		setLocalMinutes(null);
		setLocalAudios([]);
		setLocalLatestAudioId(null);
		setSelectedLocalAudioId(null);
		setLocalStreamText('');
		setLocalStreamType('idle');
		setLocalStreamError(null);
		setLocalStreamHint(null);
		setLocalStreamSessionId(null);
		setLocalInputMode('live');
		setLocalMinutesStatus(null);
		setActiveLocalProcessingAsrSessionId(null);
		setCancelingLocalProcessing(false);
		setShowLocalMinutesStatus(false);
		setTranscribingLocalAudio(false);
		setLocalSummaryTitle('');
		setLocalSummaryDraft('');
		setLocalSessionList([]);
		setSelectedLocalSessionId(null);
		setSelectedLocalSessionDetail(null);
		setLocalSessionsModalVisible(false);
		localUploadedTranscribeSessionIdRef.current = null;
		localUploadedTranscribeAudioIdRef.current = null;

		if (typeof selectedMeetingId === 'number') {
			loadLocalAudioList(selectedMeetingId);
			// 与火山模式保持一致：本地主界面进入时默认空白，不自动回填历史纪要。
			if (!(isMinutesMainRoute && minutesMode === 'local')) {
				loadLocalMinutesData(selectedMeetingId);
			}
		} else {
			setVolcLiveModalVisible(false);
			setVolcUploadModalVisible(false);
			setInsights(null);
			stopRecordingTimer();
			if (recording) stopRecording();
		}
		return () => {
			// ★ 让当前 session 失效，WS 回调中 isSessionValid() 会返回 false
			volcLiveSessionIdRef.current++;
			localLiveSessionIdRef.current++;
			stopVolcSseStream();
			void stopVolcLiveWs(true);
			stopLocalSseStream();
			void stopLocalLiveWs(true);
			stopRecordingTimer();
			if (mediaRecorderRef.current) {
				mediaRecorderRef.current.stream.getTracks().forEach((track) => {
					track.stop();
				});
			}
		};
	}, [selectedMeetingId, isMinutesMainRoute, minutesMode]);

	useEffect(() => {
		if (typeof selectedMeetingId === 'number') {
			connectMeetingWs(selectedMeetingId);
			return () => closeMeetingWs();
		}
		closeMeetingWs();
		return () => closeMeetingWs();
	}, [selectedMeetingId, connectMeetingWs, closeMeetingWs]);

	useEffect(() => {
		volcStreamTypeRef.current = volcStreamType;
	}, [volcStreamType]);

	useEffect(() => {
		localStreamTypeRef.current = localStreamType;
	}, [localStreamType]);

	useEffect(() => {
		localStreamTextRef.current = localStreamText;
	}, [localStreamText]);

	useEffect(() => {
		const textarea = localStreamCardRef.current?.querySelector('textarea');
		if (!(textarea instanceof HTMLTextAreaElement)) return;
		const frameId = window.requestAnimationFrame(() => {
			textarea.scrollTop = textarea.scrollHeight;
		});
		return () => window.cancelAnimationFrame(frameId);
	}, [localStreamText]);

	useEffect(() => {
		setEditingVolcSessionSummary(false);
		if (!selectedVolcSessionDetail) {
			setVolcSessionDraft({
				stream_transcript_text: '',
				transcript_text: '',
				summary_title: '',
				summary_paragraph: '',
				speaker_segments: [],
				todos: [],
			});
			return;
		}
		setVolcSessionDraft({
			stream_transcript_text: selectedVolcSessionDetail.stream_transcript_text || '',
			transcript_text: selectedVolcSessionDetail.transcript_text || '',
			summary_title: selectedVolcSessionDetail.summary_title || '',
			summary_paragraph: selectedVolcSessionDetail.summary_paragraph || '',
			speaker_segments: selectedVolcSessionDetail.speaker_segments || [],
			todos: selectedVolcSessionDetail.todos || [],
		});
	}, [selectedVolcSessionDetail]);

	useEffect(() => {
		setEditingLocalSessionSummary(false);
		if (!selectedLocalSessionDetail) {
			setLocalSessionDraft({
				stream_transcript_text: '',
				summary_title: '',
				summary_paragraph: '',
				todos: [],
			});
			return;
		}
		setLocalSessionDraft({
			stream_transcript_text: selectedLocalSessionDetail.stream_transcript_text || '',
			summary_title: selectedLocalSessionDetail.summary_title || '',
			summary_paragraph: selectedLocalSessionDetail.summary_paragraph || '',
			todos: selectedLocalSessionDetail.todos || [],
		});
	}, [selectedLocalSessionDetail]);

	useEffect(() => {
		if (!selectedMeetingId) return;
		if (isSessionsRoute) {
			if (sessionHistoryMode === 'volc') {
				loadVolcSessions(selectedMeetingId, false);
			} else {
				loadLocalSessions(selectedMeetingId, false);
			}
		}
	}, [isSessionsRoute, selectedMeetingId, sessionHistoryMode, loadVolcSessions, loadLocalSessions]);

	const buildMinutesLeaveConfirmContent = useCallback((mode: 'local' | 'volc', actionLabel: string) => {
		const backgroundProcessing =
			mode === 'local'
				? (
					transcribingLocalAudio ||
					generatingLocalMinutes ||
					isLocalSubmitInProgressStatus(localMinutesStatus?.status)
				)
				: (
					submittingVolcMinutes ||
					isVolcInProgressStatus(getVolcMinutesJobStatus(volcMinutes, volcMinutesStatus?.status))
				);
		if (backgroundProcessing) {
			return `当前纪要已提交到后台处理。若${actionLabel}，当前页面展示会被清空，但后台仍会继续处理，你可以稍后前往“会话历史”查看结果。`;
		}
		return `若${actionLabel}，当前会话不会保留。`;
	}, [
		transcribingLocalAudio,
		generatingLocalMinutes,
		isLocalSubmitInProgressStatus,
		localMinutesStatus?.status,
		submittingVolcMinutes,
		isVolcInProgressStatus,
		volcMinutes,
		volcMinutesStatus?.status,
	]);

	useEffect(() => {
		if (!shouldGuardMinutesLeave) return;
		const handler = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			event.returnValue = '离开后当前页面内容不会保留，后台任务可能继续处理';
			return event.returnValue;
		};
		window.addEventListener('beforeunload', handler);
		return () => {
			window.removeEventListener('beforeunload', handler);
		};
	}, [shouldGuardMinutesLeave]);

	useEffect(() => {
		const historyWithBlock = history as any;
		if (typeof historyWithBlock.block !== 'function') return;
		const unblock = historyWithBlock.block((tx: any) => {
			const modeBypass =
				minutesMode === 'volc' ? volcLeaveGuardBypassRef.current : localLeaveGuardBypassRef.current;
			if (modeBypass || !shouldGuardMinutesLeave) {
				unblock();
				tx.retry();
				return;
			}
			Modal.confirm({
				title: '是否离开当前页面？',
				content: buildMinutesLeaveConfirmContent(minutesMode, '离开'),
				okText: '确认离开',
				cancelText: '取消',
				onOk: () => {
					if (minutesMode === 'volc') {
						void discardVolcWorkspaceNow('用户离开当前页面，丢弃当前工作区', {
							waitRemoteCleanup: false,
						});
						volcLeaveGuardBypassRef.current = true;
					} else {
						void discardLocalWorkspaceNow('用户离开当前页面，丢弃当前工作区', {
							waitRemoteCleanup: false,
						});
						localLeaveGuardBypassRef.current = true;
					}
					unblock();
					tx.retry();
					window.setTimeout(() => {
						volcLeaveGuardBypassRef.current = false;
						localLeaveGuardBypassRef.current = false;
					}, 0);
				},
			});
		});
		return () => {
			unblock();
		};
	}, [minutesMode, shouldGuardMinutesLeave, buildMinutesLeaveConfirmContent]);

	const confirmVolcDiscard = useCallback((actionLabel: string) => {
		return new Promise<boolean>((resolve) => {
			Modal.confirm({
				title: `是否${actionLabel}？`,
				content: buildMinutesLeaveConfirmContent('volc', actionLabel),
				okText: `确认${actionLabel}`,
				cancelText: '取消',
				onOk: () => resolve(true),
				onCancel: () => resolve(false),
			});
		});
	}, [buildMinutesLeaveConfirmContent]);

	const discardVolcWorkspaceNow = useCallback(async (
		reason: string,
		options?: {
			waitRemoteCleanup?: boolean;
			meetingId?: number;
			currentAudioId?: number | null;
		},
	) => {
		const meetingId =
			typeof options?.meetingId === 'number'
				? options.meetingId
				: selectedMeetingIdRef.current;
		if (typeof meetingId !== 'number') return;
		const waitRemoteCleanup = options?.waitRemoteCleanup !== false;
		volcDiscardHydrationRef.current = true;
		stopVolcSseStream();
		clearVolcMinutesDisplay();
		setVolcInputMode('live');
		setSelectedVolcAudioId(null);
		setVolcLatestAudioId(null);
		setVolcLiveModalVisible(false);

		if (volcLiveWsRef.current) {
			if (waitRemoteCleanup) {
				await stopVolcLiveWs(true, true);
			} else {
				void stopVolcLiveWs(true, true);
			}
		} else {
			if (waitRemoteCleanup) {
				await stopVolcAudioCapture();
			} else {
				void stopVolcAudioCapture();
			}
		}

		void reason;
		void options?.currentAudioId;
		volcResetPendingRef.current = false;
		setVolcStreamType('idle');
		setVolcStreamError(null);
		if (waitRemoteCleanup) {
			message.success('已丢弃当前内容并重置为空白');
		}
	}, []);

	const attemptLeaveVolcWorkspace = useCallback(async (actionLabel: string) => {
		if (!shouldGuardVolcLeave) return true;
		const confirmed = await confirmVolcDiscard(actionLabel);
		if (!confirmed) return false;
		return true;
	}, [shouldGuardVolcLeave, confirmVolcDiscard]);

	const confirmLocalDiscard = useCallback((actionLabel: string) => {
		return new Promise<boolean>((resolve) => {
			Modal.confirm({
				title: `是否${actionLabel}？`,
				content: buildMinutesLeaveConfirmContent('local', actionLabel),
				okText: `确认${actionLabel}`,
				cancelText: '取消',
				onOk: () => resolve(true),
				onCancel: () => resolve(false),
			});
		});
	}, [buildMinutesLeaveConfirmContent]);

	async function discardLocalWorkspaceNow(
		_reason: string,
		options?: {
			waitRemoteCleanup?: boolean;
			meetingId?: number;
		},
	) {
		const meetingId =
			typeof options?.meetingId === 'number'
				? options.meetingId
				: selectedMeetingIdRef.current;
		if (typeof meetingId !== 'number') return;
		const waitRemoteCleanup = options?.waitRemoteCleanup !== false;
		localDiscardHydrationRef.current = true;
		stopLocalSseStream();
		clearLocalMinutesDisplay();
		setLocalInputMode('live');
		setSelectedLocalAudioId(null);
		setLocalLatestAudioId(null);
		setLocalAudiosModalVisible(false);
		// 让旧 session 立即失效，避免异步回调把已丢弃内容写回界面
		localLiveSessionIdRef.current += 1;
		if (localLiveWsRef.current) {
			if (waitRemoteCleanup) {
				await stopLocalLiveWs(true, true);
			} else {
				void stopLocalLiveWs(true, true);
			}
		} else {
			if (waitRemoteCleanup) {
				await stopLocalAudioCapture();
			} else {
				void stopLocalAudioCapture();
			}
		}
		// 本地模式下 discard 仅清空前端工作区，不再请求后端清理接口。
		setLocalStreamType('idle');
		setLocalStreamError(null);
		setLocalStreamHint(null);
		if (waitRemoteCleanup) {
			message.success('已丢弃当前内容并重置为空白');
		}
	}

	const attemptLeaveLocalWorkspace = useCallback(async (actionLabel: string) => {
		if (!shouldGuardLocalLeave) return true;
		const confirmed = await confirmLocalDiscard(actionLabel);
		if (!confirmed) return false;
		return true;
	}, [shouldGuardLocalLeave, confirmLocalDiscard]);

	const attemptLeaveCurrentWorkspace = useCallback(async (actionLabel: string) => {
		if (minutesMode === 'volc') {
			return attemptLeaveVolcWorkspace(actionLabel);
		}
		return attemptLeaveLocalWorkspace(actionLabel);
	}, [minutesMode, attemptLeaveVolcWorkspace, attemptLeaveLocalWorkspace]);

	const handleMeetingChange = async (value: number) => {
		if (value === selectedMeetingId) return;
		const ok = await attemptLeaveCurrentWorkspace('离开当前会议');
		if (!ok) return;
		const prevMeetingId = selectedMeetingIdRef.current;
		if (typeof prevMeetingId === 'number' && shouldGuardMinutesLeave) {
			if (minutesMode === 'volc') {
				void discardVolcWorkspaceNow('用户切换会议，丢弃当前工作区', {
					waitRemoteCleanup: false,
					meetingId: prevMeetingId,
				});
			} else {
				void discardLocalWorkspaceNow('用户切换会议，丢弃当前工作区', {
					waitRemoteCleanup: false,
					meetingId: prevMeetingId,
				});
			}
		}
		volcLeaveGuardBypassRef.current = true;
		localLeaveGuardBypassRef.current = true;
		setSelectedMeetingId(value);
		history.replace(buildMeetingRouteWithQuery(value));
		window.setTimeout(() => {
			volcLeaveGuardBypassRef.current = false;
			localLeaveGuardBypassRef.current = false;
		}, 0);
	};

	const handleMinutesModeChange = async (nextMode: 'local' | 'volc') => {
		if (nextMode === minutesMode) return;
		const ok = await attemptLeaveCurrentWorkspace('切换纪要模式');
		if (!ok) return;
		if (shouldGuardMinutesLeave) {
			if (minutesMode === 'volc') {
				void discardVolcWorkspaceNow('用户切换纪要模式，丢弃当前工作区', {
					waitRemoteCleanup: false,
				});
			} else {
				void discardLocalWorkspaceNow('用户切换纪要模式，丢弃当前工作区', {
					waitRemoteCleanup: false,
				});
			}
		}
		setMinutesMode(nextMode);
	};

	const handleResetLocalWorkspace = async () => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		if (isLocalFinalCompleted) {
			stopLocalSseStream();
			void stopLocalLiveWs(true);
			clearLocalMinutesDisplay();
			setLocalInputMode('live');
			setSelectedLocalAudioId(null);
			setLocalLatestAudioId(null);
			setLocalAudiosModalVisible(false);
			localDiscardHydrationRef.current = true;
			message.success('已重置为空白状态');
			return;
		}
		const confirmed = await confirmLocalDiscard('重置');
		if (!confirmed) return;
		await discardLocalWorkspaceNow('用户点击重置，丢弃当前工作区');
	};

	const handleSaveSummary = async () => {
		if (!selectedMeetingId) return;
		setSavingSummary(true);
		try {
			const updated = await meetingMinutesApi.updateSummary(selectedMeetingId, summaryDraft || '');
			setInsights((prev) => (prev ? { ...prev, summary: updated } : prev));
			message.success('摘要已更新');
		} catch (error: any) {
			message.error(error?.message || '保存摘要失败');
		} finally {
			setSavingSummary(false);
		}
	};

	const handleSelectFiles = (values: Array<number | string>) => {
		if (values.length > 5) {
			message.warning('最多选择 5 个文件用于生成纪要');
			return;
		}
		setSelectedFileIds(values.map((item) => Number(item)));
	};

	const handleSelectAudios = (values: Array<number | string>) => {
		if (values.length > 3) {
			message.warning('最多选择 3 段音频用于生成纪要');
			return;
		}
		setSelectedAudioIds(values.map((item) => Number(item)));
	};

	const handleGenerate = async () => {
		if (!selectedMeetingId) return;
		setGenerating(true);
		try {
			const result = await meetingMinutesApi.generateInsights(selectedMeetingId, {
				file_ids: selectedFileIds.length ? selectedFileIds : undefined,
				audio_ids: selectedAudioIds.length ? selectedAudioIds : undefined,
			});
			setInsights(result);
			message.success('结构化纪要生成成功');
			setGenerateModalVisible(false);
		} catch (error: any) {
			message.error(error?.message || '生成纪要失败');
		} finally {
			setGenerating(false);
		}
	};

	const handleRefreshVolcAudios = () => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		loadVolcAudioList(selectedMeetingId);
	};

	const handleResetVolcWorkspace = async () => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		// 最终态（纪要已生成并落库）下，重置只清空当前页面展示，不再二次确认。
		if (isVolcFinalCompleted) {
			stopVolcSseStream();
			clearVolcMinutesDisplay();
			setVolcInputMode('live');
			setSelectedVolcAudioId(null);
			setVolcLatestAudioId(null);
			setVolcLiveModalVisible(false);
			volcDiscardHydrationRef.current = true;
			message.success('已重置为空白状态');
			return;
		}
		const confirmed = await confirmVolcDiscard('重置');
		if (!confirmed) return;
		await discardVolcWorkspaceNow('用户点击重置，丢弃当前工作区');
	};

	const resetVolcStreamState = () => {
		setVolcStreamText('');
		setVolcStreamType('idle');
		setVolcStreamError(null);
		setVolcStreamSessionId(null);
	};

	/** 清空会议纪要展示与数据库（覆盖式：开启新录音或新生成前调用） */
	const clearVolcMinutesDisplay = useCallback(() => {
		setVolcMinutes(null);
		setVolcMinutesStatus(null);
		setActiveVolcJobId(null);
		setCancelingVolcMinutes(false);
		setVolcTranscriptDraft('');
		setVolcSummaryTitle('');
		setVolcSummaryDraft('');
		resetVolcStreamState();
	}, []);

	useEffect(() => {
		if (!isMinutesMainRoute || minutesMode !== 'volc') return;
		// 进入火山主页时仅清空前端展示，不触发后端清空。
		clearVolcMinutesDisplay();
		setVolcInputMode('live');
	}, [isMinutesMainRoute, minutesMode, location.key, clearVolcMinutesDisplay]);

	const stopVolcSseStream = useCallback(() => {
		if (volcSseRef.current) {
			try {
				volcSseRef.current.close();
			} catch {
				// ignore
			}
			volcSseRef.current = null;
		}
		volcSseAudioIdRef.current = null;
	}, []);

	const stopVolcAudioCapture = useCallback(async () => {
		wsDebug('volcLive stop audio capture');
		if (volcLiveFirstAudioTimerRef.current) {
			window.clearTimeout(volcLiveFirstAudioTimerRef.current);
			volcLiveFirstAudioTimerRef.current = null;
		}
		if (volcLiveWsConnectTimerRef.current) {
			window.clearTimeout(volcLiveWsConnectTimerRef.current);
			volcLiveWsConnectTimerRef.current = null;
		}

		if (volcProcessorRef.current) {
			try {
				volcProcessorRef.current.disconnect();
			} catch {
				// ignore
			}
			volcProcessorRef.current.onaudioprocess = null;
			volcProcessorRef.current = null;
		}

		if (volcAudioContextRef.current) {
			try {
				await volcAudioContextRef.current.close();
			} catch {
				// ignore
			}
			volcAudioContextRef.current = null;
		}

		if (volcMediaStreamRef.current) {
			try {
				volcMediaStreamRef.current.getTracks().forEach((track) => {
					track.stop();
				});
			} catch {
				// ignore
			}
			volcMediaStreamRef.current = null;
		}
	}, [wsDebug]);

	const stopVolcLiveWs = useCallback(
		async (closeSocket = false, discard = false) => {
			wsDebug('volcLive stop ws', { closeSocket, discard });
			await stopVolcAudioCapture();
			const ws = volcLiveWsRef.current;
			if (!ws) return;
			volcLiveStopRequestedRef.current = !discard;
			if (ws.readyState === WebSocket.OPEN) {
				try {
					ws.send(JSON.stringify({ action: discard ? 'discard' : 'stop' }));
				} catch {
					// ignore
				}
			}
			if (closeSocket) {
				try {
					ws.close();
				} catch {
					// ignore
				}
				volcLiveWsRef.current = null;
			}
		},
		[stopVolcAudioCapture, wsDebug],
	);

	const openVolcLiveModal = () => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		resetVolcStreamState();
		setVolcLiveModalVisible(true);
	};

	const openVolcUploadModal = () => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		resetVolcStreamState();
		setVolcUploadModalVisible(true);
	};

	const openVolcAudiosModal = () => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		setVolcAudiosModalVisible(true);
		loadVolcAudioList(selectedMeetingId);
	};

	const closeVolcSessionsModal = () => {
		setVolcSessionsModalVisible(false);
		setEditingVolcSessionSummary(false);
		if (selectedMeetingId) {
			loadVolcAudioList(selectedMeetingId);
			if (isSessionsRoute) {
				history.replace(buildMeetingRouteWithQuery(selectedMeetingId, '/meetings/minutes'));
			}
		}
	};

	const closeLocalSessionsModal = () => {
		setLocalSessionsModalVisible(false);
		setEditingLocalSessionSummary(false);
		if (selectedMeetingId) {
			loadLocalMinutesData(selectedMeetingId);
			loadLocalAudioList(selectedMeetingId);
			if (isSessionsRoute) {
				history.replace(buildMeetingRouteWithQuery(selectedMeetingId, '/meetings/minutes'));
			}
		}
	};

	const persistVolcSessionDetail = async (
		draft = volcSessionDraft,
		successMessage = '会话历史已保存',
	): Promise<boolean> => {
		if (!selectedMeetingId || !selectedVolcSessionId) {
			message.warning('请选择会议与会话');
			return false;
		}

		setSavingVolcSessionDetail(true);
		try {
			const updated = await meetingMinutesApi.updateVolcMinutesSession(
				selectedMeetingId,
				selectedVolcSessionId,
				{
					stream_transcript_text: draft.stream_transcript_text,
					transcript_text: draft.transcript_text,
					summary_title: draft.summary_title || null,
					summary_paragraph: draft.summary_paragraph || null,
					speaker_segments: draft.speaker_segments,
					todos: draft.todos,
				},
			);
			setSelectedVolcSessionDetail(updated);
			let isLatestSession = false;
			setVolcSessionList((prev) => {
				if (!prev.length) return prev;
				const latest = prev[prev.length - 1];
				isLatestSession = latest?.id === updated.id;
				return prev.map((item) => (item.id === updated.id ? updated : item));
			});
			if (isLatestSession) {
				loadVolcAudioList(selectedMeetingId);
			}
			message.success(successMessage);
			return true;
		} catch (error: any) {
			message.error(error?.message || '保存会话历史失败');
			return false;
		} finally {
			setSavingVolcSessionDetail(false);
		}
	};

	const handleSaveVolcSessionDetail = async () => {
		return persistVolcSessionDetail(volcSessionDraft, '会话历史已保存');
	};

	const handleDeleteVolcSession = async (sessionId: number) => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		try {
			await meetingMinutesApi.deleteVolcMinutesSession(selectedMeetingId, sessionId);
			message.success('会话历史已删除');
			const isSelected = selectedVolcSessionId === sessionId;
			if (isSelected) {
				setSelectedVolcSessionId(null);
				setSelectedVolcSessionDetail(null);
			}
			await loadVolcSessions(selectedMeetingId, !isSelected);
			loadVolcAudioList(selectedMeetingId);
		} catch (error: any) {
			message.error(error?.message || '删除会话历史失败');
		}
	};

	const persistLocalSessionDetail = async (
		draft = localSessionDraft,
		successMessage = '会话历史已保存',
	): Promise<boolean> => {
		if (!selectedMeetingId || !selectedLocalSessionId) {
			message.warning('请选择会议与会话');
			return false;
		}
		if (!isCompletedSessionStatus(selectedLocalSessionDetail?.status)) {
			message.warning('仅已完成的会话支持保存编辑内容');
			return false;
		}
		setSavingLocalSessionDetail(true);
		try {
			const updated = await meetingMinutesApi.updateLocalMinutesSession(
				selectedMeetingId,
				selectedLocalSessionId,
				{
					stream_transcript_text: draft.stream_transcript_text,
					summary_title: draft.summary_title || null,
					summary_paragraph: draft.summary_paragraph || null,
					todos: draft.todos,
				},
			);
			setSelectedLocalSessionDetail(updated);
			let isLatestSession = false;
			setLocalSessionList((prev) => {
				if (!prev.length) return prev;
				const latest = prev[prev.length - 1];
				isLatestSession = latest?.id === updated.id;
				return prev.map((item) => (item.id === updated.id ? updated : item));
			});
			if (isLatestSession) {
				loadLocalMinutesData(selectedMeetingId);
				loadLocalAudioList(selectedMeetingId);
			}
			message.success(successMessage);
			return true;
		} catch (error: any) {
			message.error(error?.message || '保存会话历史失败');
			return false;
		} finally {
			setSavingLocalSessionDetail(false);
		}
	};

	const handleSaveLocalSessionDetail = async () => {
		return persistLocalSessionDetail(localSessionDraft, '会话历史已保存');
	};

	const openLocalAudiosModal = () => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		setLocalAudiosModalVisible(true);
		loadLocalAudioList(selectedMeetingId);
	};

	const handleUploadVolcMinutesAudio = async ({ file, onSuccess, onError }: any) => {
		if (!isAudioUploadFile(file as File)) {
			const errMsg = getInvalidAudioUploadMessage(file as File);
			message.error(errMsg);
			onError?.(new Error(errMsg));
			return;
		}
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			onError?.(new Error('请选择会议'));
			return;
		}
		if (volcAudios.length >= MAX_AUDIO_UPLOAD_COUNT) {
			const errMsg = `每个会议最多上传 ${MAX_AUDIO_UPLOAD_COUNT} 个音频，请先删除旧音频后再上传`;
			message.warning(errMsg);
			onError?.(new Error(errMsg));
			return;
		}
		setUploadingVolcMinutesAudio(true);
		try {
			const uploadTask = await meetingMinutesApi.uploadVolcMinutesAudio(selectedMeetingId, file as File);
			const latestTask = await meetingMinutesApi.waitForVolcUploadTask(uploadTask.task_id);
			const finalAudioId = typeof latestTask.audio_id === 'number' ? latestTask.audio_id : null;
			if (finalAudioId == null) {
				throw new Error(latestTask.error_msg || '上传完成但未返回音频记录');
			}
			setVolcLatestAudioId(finalAudioId);
			setSelectedVolcAudioId(finalAudioId);
			message.success('上传成功，请选择该条后点击「生成会议纪要」');
			await loadVolcAudioList(selectedMeetingId);
			onSuccess?.('ok');
		} catch (error: any) {
			const errMsg = resolveAudioUploadErrorMessage(error, file as File);
			if (isAudioUploadPendingError(error)) {
				message.warning(errMsg);
				onSuccess?.('ok');
				window.setTimeout(() => {
					void loadVolcAudioList(selectedMeetingId);
				}, 5000);
				return;
			}
			message.error(errMsg);
			onError?.(new Error(errMsg));
		} finally {
			setUploadingVolcMinutesAudio(false);
		}
	};

	const handleUploadLocalMinutesAudio = async ({ file, onSuccess, onError }: any) => {
		if (!isAudioUploadFile(file as File)) {
			const errMsg = getInvalidAudioUploadMessage(file as File);
			message.error(errMsg);
			onError?.(new Error(errMsg));
			return;
		}
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			onError?.(new Error('请选择会议'));
			return;
		}
		if (localAudios.length >= MAX_AUDIO_UPLOAD_COUNT) {
			const errMsg = `每个会议最多上传 ${MAX_AUDIO_UPLOAD_COUNT} 个音频，请先删除旧音频后再上传`;
			message.warning(errMsg);
			onError?.(new Error(errMsg));
			return;
		}
		setUploadingLocalAudio(true);
		try {
			const record = await meetingMinutesApi.uploadLocalAudio(selectedMeetingId, file as File);
			setLocalLatestAudioId(record.id);
			setSelectedLocalAudioId(record.id);
			message.success('上传成功，可在当前列表中管理本地音频。');
			await loadLocalAudioList(selectedMeetingId);
			onSuccess?.('ok');
		} catch (error: any) {
			const errMsg = resolveAudioUploadErrorMessage(error, file as File);
			if (isAudioUploadPendingError(error)) {
				message.warning(errMsg);
				onSuccess?.('ok');
				window.setTimeout(() => {
					void loadLocalAudioList(selectedMeetingId);
				}, 5000);
				return;
			}
			message.error(errMsg);
			onError?.(new Error(errMsg));
		} finally {
			setUploadingLocalAudio(false);
		}
	};

	const startVolcSseStream = (audioId: number) => {
		stopVolcSseStream();
		resetVolcStreamState();
		volcSseAudioIdRef.current = audioId;

		const token = getToken();
		if (!token) {
			message.error('未找到登录 token，请先登录');
			setVolcStreamType('error');
			setVolcStreamError('未找到登录 token');
			return;
		}

		setVolcStreamType('file_streaming');
		const url = `/api/minutes/volc/audio/${audioId}/stream?token=${encodeURIComponent(token)}`;
		const es = new EventSource(url);
		volcSseRef.current = es;

		// 弹窗关闭后滚动到流式转写区域，使用户能看到实时出字
		setTimeout(() => {
			volcStreamCardRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
		}, 100);

		es.onmessage = (event) => {
			try {
				const data = JSON.parse(String(event.data || '{}'));
				if (volcDiscardHydrationRef.current) {
					if (data.type === 'completed' || data.type === 'error') {
						stopVolcSseStream();
						clearVolcMinutesDisplay();
						setVolcInputMode('live');
					}
					return;
				}
				if (data.type === 'session_created') setVolcStreamSessionId(data.session_id || null);
				if (typeof data.accumulated === 'string') setVolcStreamText(data.accumulated);
				if (data.type === 'completed') {
					if (typeof data.transcript === 'string') setVolcStreamText(data.transcript);
					setVolcStreamType('completed');
					const completedAudioId = volcSseAudioIdRef.current ?? data.audio_id;
					if (completedAudioId != null) setVolcLatestAudioId(completedAudioId);
					stopVolcSseStream();
					const cb = volcStreamCompleteCallbackRef.current;
					volcStreamCompleteCallbackRef.current = null;
					if (cb) {
						message.success('转写完成，正在自动生成会议纪要…');
						cb(completedAudioId ?? undefined);
					} else {
						message.success('流式转写完成');
					}
				}
				if (data.type === 'error') {
					setVolcStreamType('error');
					setVolcStreamError(data.message || '流式转写失败');
					stopVolcSseStream();
				}
			} catch {
				// ignore
			}
		};

		es.onerror = () => {
			setVolcStreamType('error');
			setVolcStreamError('SSE 连接失败或已中断');
			stopVolcSseStream();
		};
	};

	const startVolcLiveRecording = async () => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		// 开始录音前强制拉取最新列表，避免本地缓存滞后导致超上限后仍可录音。
		let latestVolcAudios: VolcMeetingAudio[] = volcAudios;
		try {
			const list = await meetingsApi.listVolcAudios(selectedMeetingId);
			latestVolcAudios = [...(list || [])].sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf());
			setVolcAudios(latestVolcAudios);
			setVolcLatestAudioId(latestVolcAudios[0]?.id ?? null);
			if (selectedVolcAudioId && !latestVolcAudios.find((item) => item.id === selectedVolcAudioId)) {
				setSelectedVolcAudioId(null);
			}
		} catch {
			// ignore: 后续仍使用本地缓存兜底判断
		}
		if (latestVolcAudios.length >= MAX_ONLINE_RECORDING_COUNT) {
			message.warning(buildOnlineRecordingLimitMessage(latestVolcAudios.length));
			return;
		}
		const token = getToken();
		if (!token) {
			message.error('未找到登录 token，请先登录');
			return;
		}

		// 覆盖式：先清空当前展示，再开始新的录音会话
		clearVolcMinutesDisplay();
		volcResetPendingRef.current = false;
		volcDiscardHydrationRef.current = false;
		setVolcInputMode('live');

		// ★ 递增 session ID，后续每个 await 之后都要校验
		const currentSession = ++volcLiveSessionIdRef.current;
		const isSessionValid = () => currentSession === volcLiveSessionIdRef.current;

		await stopVolcLiveWs(true);
		stopVolcSseStream();
		resetVolcStreamState();

		if (!isSessionValid()) return;

		setVolcStreamType('live_connecting');
		volcLiveStopRequestedRef.current = false;
		volcLiveFirstAudioSentRef.current = false;
		volcLiveWsOpenedRef.current = false;

		const mediaDevices = typeof navigator === 'undefined' ? undefined : navigator.mediaDevices;
		if (!mediaDevices?.getUserMedia) {
			if (!isSessionValid()) return;
			const errMsg = resolveMicrophoneAccessMessage();
			setVolcStreamType('error');
			setVolcStreamError(errMsg);
			message.error(errMsg);
			return;
		}

		let stream: MediaStream;
		try {
			stream = await mediaDevices.getUserMedia({
				audio: {
					channelCount: 1,
					sampleRate: { ideal: 16000 },
					echoCancellation: true,
					noiseSuppression: true,
				},
			});
		} catch (error: any) {
			if (!isSessionValid()) return;
			const errMsg = resolveMicrophoneAccessMessage(error);
			setVolcStreamType('error');
			setVolcStreamError(errMsg);
			message.error(errMsg);
			return;
		}

		// ★ await 之后校验：如果 HMR 或切换会议导致 session 已过期，立即释放刚获取的麦克风
		if (!isSessionValid()) {
			stream.getTracks().forEach((t) => t.stop());
			return;
		}

		volcMediaStreamRef.current = stream;

		try {
			const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
			let audioContext: AudioContext;
			try {
				audioContext = new AudioContextCtor({ sampleRate: 16000 });
			} catch {
				audioContext = new AudioContextCtor();
			}
			volcAudioContextRef.current = audioContext;
			if (audioContext.state === 'suspended') {
				try {
					await audioContext.resume();
				} catch {
					// ignore
				}
			}

			if (!isSessionValid()) {
				await stopVolcAudioCapture();
				return;
			}

			const source = audioContext.createMediaStreamSource(stream);
			const processor = audioContext.createScriptProcessor(4096, 1, 1);
			volcProcessorRef.current = processor;

			processor.onaudioprocess = (e) => {
				try {
					if (!isSessionValid()) return;
					const liveWs = volcLiveWsRef.current;
					if (!liveWs || liveWs.readyState !== WebSocket.OPEN) return;
					const input = e.inputBuffer.getChannelData(0);
					const downsampled = downsampleBuffer(input, audioContext.sampleRate, 16000);
					const pcm16 = float32ToInt16PCM(downsampled);
					liveWs.send(pcm16.buffer);
					if (!volcLiveFirstAudioSentRef.current) {
						volcLiveFirstAudioSentRef.current = true;
						if (volcLiveFirstAudioTimerRef.current) {
							window.clearTimeout(volcLiveFirstAudioTimerRef.current);
							volcLiveFirstAudioTimerRef.current = null;
						}
					}
				} catch {
					// ignore
				}
			};

			source.connect(processor);
			processor.connect(audioContext.destination);
		} catch (error: any) {
			if (!isSessionValid()) return;
			setVolcStreamType('error');
			setVolcStreamError(error?.message || '初始化音频采集失败');
			message.error(error?.message || '初始化音频采集失败');
			await stopVolcAudioCapture();
			return;
		}

		// ★ 创建 WebSocket 之前再次校验
		if (!isSessionValid()) {
			await stopVolcAudioCapture();
			return;
		}

		let ws: WebSocket;
		try {
			const wsUrl = buildWsUrl(
				`/api/meetings/minutes/volc/${selectedMeetingId}/live?token=${encodeURIComponent(token)}`,
			);
			ws = new WebSocket(wsUrl);
		} catch (error: any) {
			if (!isSessionValid()) return;
			setVolcStreamType('error');
			const errMsg = resolveVolcLiveErrorMessage(error?.message || 'WebSocket 初始化失败', {});
			setVolcStreamError(errMsg);
			message.error(errMsg);
			await stopVolcAudioCapture();
			return;
		}

		ws.binaryType = 'arraybuffer';
		volcLiveWsRef.current = ws;

		ws.onopen = () => {
			if (!isSessionValid()) {
				try { ws.close(); } catch { /* ignore */ }
				return;
			}
			volcLiveWsOpenedRef.current = true;
			if (volcLiveWsConnectTimerRef.current) {
				window.clearTimeout(volcLiveWsConnectTimerRef.current);
				volcLiveWsConnectTimerRef.current = null;
			}
			try {
				ws.send(JSON.stringify({ action: 'config', rate: 16000, channels: 1 }));
			} catch {
				// ignore
			}
			setVolcStreamType('live_streaming');

			if (volcLiveFirstAudioTimerRef.current) {
				window.clearTimeout(volcLiveFirstAudioTimerRef.current);
			}
			volcLiveFirstAudioTimerRef.current = window.setTimeout(async () => {
				if (!isSessionValid()) return;
				if (volcLiveStopRequestedRef.current) return;
				if (volcLiveFirstAudioSentRef.current) return;
				setVolcStreamType('error');
				setVolcStreamError('未采集到音频帧：请检查麦克风权限/设备占用，或尝试刷新页面后重试');
				await stopVolcLiveWs(true);
			}, 6000);
		};

		ws.onmessage = async (event) => {
			if (!isSessionValid()) return;
			try {
				const data = JSON.parse(String(event.data || '{}'));
				if (volcDiscardHydrationRef.current) {
					if (data.type === 'completed' || data.type === 'error' || data.type === 'discarded') {
						await stopVolcLiveWs(true);
						clearVolcMinutesDisplay();
						setVolcInputMode('live');
					}
					return;
				}
				if (volcResetPendingRef.current && data.type !== 'completed' && data.type !== 'error') {
					return;
				}
				if (data.type === 'session_created') setVolcStreamSessionId(data.session_id || null);
				if (typeof data.accumulated === 'string') setVolcStreamText(data.accumulated);
				if (data.type === 'saving_audio') {
					setVolcStreamType('live_saving');
				}
				if (data.type === 'uploading_audio') {
					setVolcStreamType('live_uploading');
				}
				if (data.type === 'completed') {
					if (typeof data.transcript === 'string') setVolcStreamText(data.transcript);
					const liveAudioId = typeof data.audio_id === 'number' ? data.audio_id : undefined;
					const audioUploaded = data.audio_uploaded !== false && liveAudioId != null;
					if (!audioUploaded) {
						setVolcStreamType('error');
						setVolcStreamError('录音已停止，但音频上传失败（可能已达10条上限），请先删除旧音频后重试。');
						await stopVolcLiveWs(true);
						if (selectedMeetingId) await loadVolcAudioList(selectedMeetingId);
						message.error('音频上传失败：请先删除旧音频后重试。');
						return;
					}
					if (liveAudioId != null) {
						setVolcLatestAudioId(liveAudioId);
						setSelectedVolcAudioId(liveAudioId);
					}
					setVolcStreamType('completed');
					await stopVolcLiveWs(true);
					if (selectedMeetingId) await loadVolcAudioList(selectedMeetingId);
					if (volcResetPendingRef.current) {
						volcResetPendingRef.current = false;
						clearVolcMinutesDisplay();
						setVolcInputMode('live');
						return;
					}
					message.success('上传成功，正在自动生成会议纪要。');
					// 直接传 liveAudioId，避免 setState 异步导致读到旧 volcLatestAudioId
					handleSubmitVolcMinutes(liveAudioId, 'live');
				}
				if (data.type === 'error') {
					if (volcResetPendingRef.current) {
						volcResetPendingRef.current = false;
						await stopVolcLiveWs(true);
						clearVolcMinutesDisplay();
						setVolcInputMode('live');
						return;
					}
					setVolcStreamType('error');
					setVolcStreamError(resolveVolcErrorMessage(data.message) || '实时录音失败');
					await stopVolcLiveWs(true);
				}
			} catch {
				// ignore
			}
		};

		ws.onerror = () => {
			if (!isSessionValid()) return;
			setVolcStreamType('error');
			setVolcStreamError(
				resolveVolcLiveErrorMessage('WebSocket 连接失败或已中断', {
					wsOpened: volcLiveWsOpenedRef.current,
				}),
			);
			if (volcLiveWsConnectTimerRef.current) {
				window.clearTimeout(volcLiveWsConnectTimerRef.current);
				volcLiveWsConnectTimerRef.current = null;
			}
			void stopVolcLiveWs(true);
		};

		ws.onclose = (e) => {
			if (volcLiveFirstAudioTimerRef.current) {
				window.clearTimeout(volcLiveFirstAudioTimerRef.current);
				volcLiveFirstAudioTimerRef.current = null;
			}
			if (volcLiveWsConnectTimerRef.current) {
				window.clearTimeout(volcLiveWsConnectTimerRef.current);
				volcLiveWsConnectTimerRef.current = null;
			}
			stopVolcAudioCapture();

			// ★ session 已过期（HMR / 切换会议），不再更新 UI 状态
			if (!isSessionValid()) return;

			const code = (e as CloseEvent | any)?.code;
			if (volcStreamTypeRef.current === 'completed') return;
			// 用户主动结束录音时，浏览器常报 1006（异常关闭），与 1000/1001/1005 一样按正常收尾处理，避免展示技术错误
			if (
				volcLiveStopRequestedRef.current &&
				(code === 1000 || code === 1001 || code === 1005 || code === 1006)
			) {
				setVolcStreamError(null);
				setVolcStreamType((prev) => (prev === 'live_stopping' ? 'live_saving' : prev));
				return;
			}

			setVolcStreamType('error');
			setVolcStreamError(
				resolveVolcLiveErrorMessage(null, {
					closeCode: code,
					stopRequested: volcLiveStopRequestedRef.current,
					firstAudioSent: volcLiveFirstAudioSentRef.current,
					wsOpened: volcLiveWsOpenedRef.current,
				}),
			);
		};

		volcLiveWsConnectTimerRef.current = window.setTimeout(() => {
			if (!isSessionValid()) return;
			if (volcLiveStopRequestedRef.current) return;
			if (volcLiveWsOpenedRef.current) return;
			setVolcStreamType('error');
			setVolcStreamError(resolveVolcLiveErrorMessage('WebSocket 握手超时', { wsOpened: false }));
			void stopVolcLiveWs(true);
		}, 5000);
	};

	const handleSubmitVolcMinutes = async (
		audioId?: number,
		submitSource?: 'live' | 'existing_audio',
	) => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		if (volcDiscardHydrationRef.current) {
			return;
		}
		volcDiscardHydrationRef.current = false;
		const idToSubmit = audioId ?? volcLatestAudioId;
		if (!idToSubmit) {
			message.warning('请先完成转写（在线录音或上传后流式转写）');
			return;
		}
		if (audioId == null) {
			const selectedAudio = volcAudios.find((item) => item.id === idToSubmit);
			if (selectedAudio && normalizeStatus(selectedAudio.status) !== 'uploaded') {
				message.warning('仅“已上传”状态的音频可用于生成会议纪要');
				return;
			}
		}
		setSubmittingVolcMinutes(true);
		try {
			const source = submitSource || (volcInputMode === 'live' ? 'live' : 'existing_audio');
			const record: VolcMinutesJob = await meetingMinutesApi.submitVolcMinutes(selectedMeetingId, idToSubmit, source);
			setVolcMinutesStatus({
				status: record.status || 'submitted',
				job_id: record.job_id,
				task_id: record.task_id || undefined,
				audio_id: record.audio_id ?? undefined,
			});
			setActiveVolcJobId(record.job_id);
			setCancelingVolcMinutes(false);
			// 上传音频模式只在此处提示；在线录音模式在 WS completed 时已提示
			if (volcInputMode === 'upload') {
				message.success('上传成功，正在自动生成会议纪要。');
			}
			loadVolcAudioList(selectedMeetingId);
			if (shouldSyncVolcSessions) {
				loadVolcSessions(selectedMeetingId, true);
			}
		} catch (error: any) {
			message.error(error?.message || '提交失败');
		} finally {
			setSubmittingVolcMinutes(false);
		}
	};

	const handleCancelVolcMinutes = useCallback(() => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		const jobId =
			activeVolcJobIdRef.current ??
			volcMinutesStatusRef.current?.job_id ??
			(typeof volcMinutes?.minutes_job_id === 'number' ? volcMinutes.minutes_job_id : null);
		Modal.confirm({
			title: '结束当前生成纪要？',
			content: '当前页面会停止等待结果，后端会停止跟踪该任务，后续结果不会再回写到当前纪要。',
			okText: '结束当前生成',
			okButtonProps: { danger: true },
			cancelText: '取消',
			onOk: async () => {
				setCancelingVolcMinutes(true);
				try {
					await meetingMinutesApi.cancelVolcMinutesJob(selectedMeetingId, jobId, {
						job_id: jobId,
						reason: '用户在前端结束当前生成纪要',
					});
					setVolcMinutesStatus((prev) => ({
						...(prev || {}),
						status: 'cancelled',
						job_id: jobId ?? prev?.job_id,
						error: undefined,
					}));
					setActiveVolcJobId(null);
					message.success('已结束当前生成');
					void loadVolcAudioList(selectedMeetingId);
				} catch (error: any) {
					message.error(error?.message || '结束当前生成失败');
				} finally {
					setCancelingVolcMinutes(false);
				}
			},
		});
	}, [selectedMeetingId, loadVolcAudioList, volcMinutes?.minutes_job_id]);

	const handleCancelLocalProcessing = useCallback(() => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		const asrSessionId =
			activeLocalProcessingAsrSessionIdRef.current ?? localStreamSessionId ?? localMinutes?.asr_session_id ?? null;
		if (asrSessionId == null) {
			message.warning('当前没有可结束的处理任务');
			return;
		}
		const actionLabel = transcribingLocalAudio ? '结束当前处理' : '结束当前生成';
		Modal.confirm({
			title: `${actionLabel}？`,
			content: '后端会尽快停止当前任务。已经识别出的文本会保留在当前页面，不会被清空。',
			okText: actionLabel,
			okButtonProps: { danger: true },
			cancelText: '取消',
			onOk: async () => {
				setCancelingLocalProcessing(true);
				try {
					await meetingMinutesApi.cancelLocalProcessing(selectedMeetingId, {
						asr_session_id: asrSessionId,
						reason: '用户在前端结束当前处理',
					});
					setTranscribingLocalAudio(false);
					setGeneratingLocalMinutes(false);
					setActiveLocalProcessingAsrSessionId(null);
					setShowLocalMinutesStatus(true);
					setLocalMinutesStatus({ status: 'cancelled' });
					setLocalStreamError(null);
					setLocalStreamProgressPercent(null);
					setLocalStreamHint(
						localStreamTextRef.current.trim()
							? '已结束当前处理，当前已识别文本会保留。'
							: '已结束当前处理。',
					);
					setLocalStreamType((prev) => {
						if (prev !== 'file_streaming') return prev;
						return localStreamTextRef.current.trim() ? 'completed' : 'idle';
					});
					localUploadedTranscribeSessionIdRef.current = null;
					localUploadedTranscribeAudioIdRef.current = null;
					message.success('已结束当前处理');
					void loadLocalAudioList(selectedMeetingId);
				} catch (error: any) {
					message.error(error?.message || '结束当前处理失败');
				} finally {
					setCancelingLocalProcessing(false);
				}
			},
		});
	}, [selectedMeetingId, localStreamSessionId, localMinutes?.asr_session_id, transcribingLocalAudio, loadLocalAudioList]);

	const handleSaveVolcSummary = async () => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		setSavingVolcSummary(true);
		try {
			const summary = await meetingMinutesApi.updateVolcSummary(selectedMeetingId, {
				paragraph: volcSummaryDraft,
				title: volcSummaryTitle || undefined,
			});
			setVolcMinutes((prev) =>
				prev
					? { ...prev, summary }
					: { transcript_text: null, speaker_segments: [], summary, todos: [] },
			);
			setVolcSummaryTitle(summary.title || '');
			setVolcSummaryDraft(summary.paragraph || '');
			if (shouldSyncVolcSessions) {
				loadVolcSessions(selectedMeetingId, true);
			}
			message.success('火山会议摘要已保存');
		} catch (error: any) {
			message.error(error?.message || '保存火山会议摘要失败');
		} finally {
			setSavingVolcSummary(false);
		}
	};

	const handleSaveVolcTranscript = async () => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		if (!volcTranscriptDraft.trim()) {
			message.warning('请输入转写文本');
			return;
		}
		setSavingVolcTranscript(true);
		try {
			await meetingMinutesApi.updateVolcTranscript(selectedMeetingId, { transcript_text: volcTranscriptDraft });
			message.success('转写文本已保存');
			loadVolcAudioList(selectedMeetingId);
			if (shouldSyncVolcSessions) {
				loadVolcSessions(selectedMeetingId, true);
			}
		} catch (error: any) {
			message.error(error?.message || '保存转写文本失败');
		} finally {
			setSavingVolcTranscript(false);
		}
	};

	const openVolcTodoModal = (todo?: VolcMeetingTodo) => {
		if (!hasSelectedMeeting) {
			message.warning('请选择会议');
			return;
		}
		setEditingVolcTodo(todo || null);
		setVolcTodoModalVisible(true);
		if (todo) {
			volcTodoForm.setFieldsValue({
				content: todo.content,
				executor: todo.executor || undefined,
				execution_time: todo.execution_time || undefined,
			});
		} else {
			volcTodoForm.resetFields();
		}
	};

	const handleCloseVolcTodoModal = () => {
		setVolcTodoModalVisible(false);
		setEditingVolcTodo(null);
		volcTodoForm.resetFields();
	};

	const submitVolcTodo = async () => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		try {
			const values = await volcTodoForm.validateFields();
			setSavingVolcTodo(true);
			const payload = {
				meeting_id: selectedMeetingId,
				content: values.content,
				executor: values.executor,
				execution_time: values.execution_time,
			};
			if (editingVolcTodo) {
				await meetingMinutesApi.updateVolcTodo(selectedMeetingId, editingVolcTodo.id, payload);
				message.success('待办事项已更新');
			} else {
				await meetingMinutesApi.createVolcTodo(selectedMeetingId, payload);
				message.success('已新增待办事项');
			}
			handleCloseVolcTodoModal();
			if (shouldSyncVolcSessions) {
				loadVolcSessions(selectedMeetingId, true);
			}
		} catch (error: any) {
			if (!error?.errorFields) {
				message.error(error?.message || '保存待办事项失败');
			}
		} finally {
			setSavingVolcTodo(false);
		}
	};

	const handleDeleteVolcTodo = async (todoId: number) => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		try {
			await meetingMinutesApi.deleteVolcTodo(selectedMeetingId, todoId);
			message.success('待办事项已删除');
			if (shouldSyncVolcSessions) {
				loadVolcSessions(selectedMeetingId, true);
			}
		} catch (error: any) {
			message.error(error?.message || '删除待办事项失败');
		}
	};

	// ════════════════════════════════════════════════════════════════════════════
	// 本地 Qwen3-ASR 会议纪要 handlers
	// ════════════════════════════════════════════════════════════════════════════

	const loadLocalMinutesData = useCallback(async (meetingId: number, showToast = false) => {
		// 主界面默认空白；showToast=true 时会解除丢弃态并提示（例如会话历史等入口拉取时）。
		if (showToast) {
			localDiscardHydrationRef.current = false;
		}
		setLoadingLocalMinutes(true);
		try {
			const result = await meetingMinutesApi.getLocalMinutes(meetingId);
			if (localDiscardHydrationRef.current && isMinutesMainRoute && minutesMode === 'local') {
				return;
			}
			const cleanParagraph = (result.summary?.paragraph || '').trimStart().startsWith('{') ? '' : (result.summary?.paragraph || '');
			const cleanTitle = (result.summary?.title || '').trimStart().startsWith('{') ? '' : (result.summary?.title || '');
			setLocalMinutes({
				...result,
				summary: (cleanParagraph || cleanTitle) && result.summary
					? { ...result.summary, paragraph: cleanParagraph, title: cleanTitle || null }
					: null,
			});
			const processingStage = String(result.processing_stage || '').trim().toLowerCase();
			const processingStatus = normalizeStatus(result.processing_status);
			const isProcessing = processingStatus === 'processing';
			const isStreamingStage = processingStage === 'transcribe';
			const isGeneratingStage = processingStage === 'minutes';
			setLocalSummaryTitle(cleanTitle);
			setLocalSummaryDraft(compactSummaryBlankLines(normalizeSummaryMarkdown(cleanParagraph)));
			setActiveLocalProcessingAsrSessionId(
				typeof result.processing_asr_session_id === 'number' ? result.processing_asr_session_id : null,
			);
			if (isProcessing && typeof result.processing_asr_session_id === 'number') {
				setLocalStreamSessionId(result.processing_asr_session_id);
				setLocalStreamProgressPercent(null);
			}
			setTranscribingLocalAudio(isProcessing && isStreamingStage);
			setGeneratingLocalMinutes(isProcessing && isGeneratingStage);
			setCancelingLocalProcessing(false);
			if (isProcessing) {
				setShowLocalMinutesStatus(true);
				setLocalMinutesStatus({ status: 'processing' });
				setLocalStreamError(null);
				setLocalStreamHint(
					isStreamingStage ? '当前任务正在后台处理，识别文本会持续更新。' : '当前任务正在后台生成会议纪要。',
				);
			}
			setLocalStreamText((prev) => {
				const st = localStreamTypeRef.current;
				const isStreaming = ['file_streaming', 'live_streaming', 'live_connecting', 'live_stopping', 'live_saving', 'live_uploading'].includes(st);
				if (isStreaming && prev) return prev;
				// 查询刷新时优先恢复 stream 文本；若无 stream 但有最终 transcript，也用于展示
				return result.stream_transcript_text || result.transcript_text || '';
			});
			setLocalStreamType((prev) => {
				const isActive = ['file_streaming', 'live_streaming', 'live_connecting', 'live_stopping', 'live_saving', 'live_uploading'].includes(prev);
				if (isActive) return prev;
				if (isProcessing && isStreamingStage) return 'file_streaming';
				return (result.stream_transcript_text || result.transcript_text) ? 'completed' : 'idle';
			});
			if (showToast) message.success('已刷新本地纪要');
		} catch (error: any) {
			if (showToast) message.error(error?.message || '获取本地纪要失败');
		} finally {
			setLoadingLocalMinutes(false);
		}
	}, [isMinutesMainRoute, minutesMode]);

	const clearLocalMinutesDisplay = useCallback(() => {
		setLocalMinutes(null);
		setLocalSummaryTitle('');
		setLocalSummaryDraft('');
		setLocalStreamText('');
		setLocalStreamType('idle');
		setLocalStreamError(null);
		setLocalStreamHint(null);
		setLocalStreamProgressPercent(null);
		setLocalStreamSessionId(null);
		setLocalMinutesStatus(null);
		setActiveLocalProcessingAsrSessionId(null);
		setCancelingLocalProcessing(false);
		setShowLocalMinutesStatus(false);
		setTranscribingLocalAudio(false);
		localUploadedTranscribeSessionIdRef.current = null;
		localUploadedTranscribeAudioIdRef.current = null;
	}, []);

	useEffect(() => {
		if (!isMinutesMainRoute || minutesMode !== 'local') return;
		// 对齐火山体验：进入本地主界面时仅展示空白工作区，不自动回填历史结果。
		localDiscardHydrationRef.current = true;
		clearLocalMinutesDisplay();
		setLocalInputMode('live');
	}, [isMinutesMainRoute, minutesMode, location.key, clearLocalMinutesDisplay]);

	const resetLocalLiveChunkBuffer = useCallback(() => {
		localLiveChunkBuffersRef.current = [];
		localLiveChunkBytesRef.current = 0;
	}, []);

	const flushLocalLiveChunkBuffer = useCallback((force = false) => {
		const ws = localLiveWsRef.current;
		if (!ws || ws.readyState !== WebSocket.OPEN) return false;
		if (!localLiveChunkBytesRef.current) return false;
		if (!force && localLiveChunkBytesRef.current < LOCAL_LIVE_WS_CHUNK_BYTES) return false;
		try {
			const payload = concatArrayBuffers(localLiveChunkBuffersRef.current);
			resetLocalLiveChunkBuffer();
			if (!payload.byteLength) return false;
			ws.send(payload);
			return true;
		} catch {
			return false;
		}
	}, [resetLocalLiveChunkBuffer]);

	const stopLocalSseStream = useCallback(() => {
		if (localSseRef.current) {
			try { localSseRef.current.close(); } catch { /* ignore */ }
			localSseRef.current = null;
		}
		if (localFileWsRef.current) {
			try { localFileWsRef.current.close(); } catch { /* ignore */ }
			localFileWsRef.current = null;
		}
		localSseAudioIdRef.current = null;
	}, []);

	const stopLocalAudioCapture = useCallback(async () => {
		if (localLiveFirstAudioTimerRef.current) { window.clearTimeout(localLiveFirstAudioTimerRef.current); localLiveFirstAudioTimerRef.current = null; }
		if (localLiveWsConnectTimerRef.current) { window.clearTimeout(localLiveWsConnectTimerRef.current); localLiveWsConnectTimerRef.current = null; }
		if (localProcessorRef.current) {
			try { localProcessorRef.current.disconnect(); } catch { /* ignore */ }
			localProcessorRef.current.onaudioprocess = null;
			localProcessorRef.current = null;
		}
		if (localAudioContextRef.current) {
			try { await localAudioContextRef.current.close(); } catch { /* ignore */ }
			localAudioContextRef.current = null;
		}
		if (localMediaStreamRef.current) {
			try { localMediaStreamRef.current.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
			localMediaStreamRef.current = null;
		}
	}, []);

	const stopLocalLiveWs = useCallback(async (closeSocket = false, discard = false) => {
		await stopLocalAudioCapture();
		const ws = localLiveWsRef.current;
		if (!ws) {
			resetLocalLiveChunkBuffer();
			return;
		}
		// 与火山一致：discard 时服务端可跳过保存/上传，避免切页时长时间占满事件循环
		localLiveStopRequestedRef.current = !discard;
		if (ws.readyState === WebSocket.OPEN) {
			flushLocalLiveChunkBuffer(true);
			try {
				ws.send(JSON.stringify({ action: discard ? 'discard' : 'stop' }));
			} catch { /* ignore */ }
		}
		if (closeSocket) {
			try { ws.close(); } catch { /* ignore */ }
			localLiveWsRef.current = null;
		}
		resetLocalLiveChunkBuffer();
	}, [stopLocalAudioCapture, flushLocalLiveChunkBuffer, resetLocalLiveChunkBuffer]);

	const handleGenerateLocalMinutes = useCallback(async (meetingId?: number, asrSessionId?: number | null) => {
		const mid = meetingId ?? selectedMeetingId;
		if (!mid) { message.warning('请选择会议'); return; }
		localDiscardHydrationRef.current = false;
		setActiveLocalProcessingAsrSessionId(asrSessionId ?? localStreamSessionId ?? localMinutes?.asr_session_id ?? null);
		setCancelingLocalProcessing(false);
		setGeneratingLocalMinutes(true);
		setShowLocalMinutesStatus(true);
		setLocalMinutesStatus({ status: 'processing' });
		try {
			await meetingMinutesApi.generateLocalMinutes(mid, { asrSessionId });
			if (localDiscardHydrationRef.current && isMinutesMainRoute && minutesMode === 'local') {
				return;
			}
			setLocalMinutesStatus({ status: 'completed' });
			setActiveLocalProcessingAsrSessionId(null);
			message.success('会议纪要已生成');
			await loadLocalMinutesData(mid);
			if (shouldSyncLocalSessions) {
				loadLocalSessions(mid, true);
			}
		} catch (error: any) {
			if (localDiscardHydrationRef.current && isMinutesMainRoute && minutesMode === 'local') {
				return;
			}
			const errMsg = resolveZhErrorMessage(error, '生成会议纪要失败，请稍后重试。');
			if (isLocalMinutesCancelledError(error)) {
				setLocalMinutesStatus({ status: 'cancelled' });
				setLocalStreamHint('已结束当前生成，当前已识别文本会保留。');
			} else {
				setLocalMinutesStatus({ status: 'failed', error: errMsg });
				message.error(errMsg);
			}
			setActiveLocalProcessingAsrSessionId(null);
		} finally {
			setGeneratingLocalMinutes(false);
			setCancelingLocalProcessing(false);
		}
	}, [selectedMeetingId, localStreamSessionId, localMinutes?.asr_session_id, loadLocalMinutesData, shouldSyncLocalSessions, loadLocalSessions, isMinutesMainRoute, minutesMode]);

	useEffect(() => {
		loadLocalAudioListRef.current = loadLocalAudioList;
	}, [loadLocalAudioList]);

	useEffect(() => {
		loadLocalMinutesDataRef.current = loadLocalMinutesData;
	}, [loadLocalMinutesData]);

	useEffect(() => {
		loadLocalSessionsRef.current = loadLocalSessions;
	}, [loadLocalSessions]);

	useEffect(() => {
		handleGenerateLocalMinutesRef.current = handleGenerateLocalMinutes;
	}, [handleGenerateLocalMinutes]);

	const handleGenerateLocalMinutesFromAudio = useCallback(async (audioId?: number) => {
		const meetingId = selectedMeetingId;
		const idToProcess = audioId ?? selectedLocalAudioId;
		if (!meetingId) {
			message.warning('请选择会议');
			return;
		}
		if (!idToProcess) {
			message.warning('请先选择一条本地音频');
			return;
		}
		const audioRecord = localAudios.find((item) => item.id === idToProcess);
		if (audioRecord && !isLocalAudioReadyForMinutesStatus(audioRecord.status)) {
			message.warning('仅“已上传”或“已完成”状态的音频可生成会议纪要');
			return;
		}

		localDiscardHydrationRef.current = false;
		clearLocalMinutesDisplay();
		setLocalInputMode('upload');
		setLocalAudiosModalVisible(false);
		setLocalStreamType('file_streaming');
		setLocalStreamError(null);
		setLocalStreamHint('正在准备音频文件…');
		setLocalStreamProgressPercent(0);
		setLocalStreamText('');
		setLocalStreamSessionId(null);
		setShowLocalMinutesStatus(true);
		setLocalMinutesStatus({ status: 'processing' });
		setTranscribingLocalAudio(true);
		setCancelingLocalProcessing(false);
		localUploadedTranscribeAudioIdRef.current = idToProcess;
		localUploadedTranscribeSessionIdRef.current = null;

		try {
			const task = await meetingMinutesApi.transcribeUploadedLocalAudio(meetingId, idToProcess);
			setLocalStreamSessionId(task.asr_session_id);
			setActiveLocalProcessingAsrSessionId(task.asr_session_id);
			localUploadedTranscribeSessionIdRef.current = task.asr_session_id;
			localUploadedTranscribeAudioIdRef.current = idToProcess;
			message.success('已提交本地音频转写，正在分段识别并生成纪要…');
		} catch (error: any) {
			const errMsg = resolveZhErrorMessage(error, '本地音频转写失败，请稍后重试。');
			setLocalStreamType('error');
			setLocalStreamError(errMsg);
			setLocalStreamHint(null);
			setLocalStreamProgressPercent(null);
			setLocalMinutesStatus({ status: 'failed', error: errMsg });
			setTranscribingLocalAudio(false);
			setActiveLocalProcessingAsrSessionId(null);
			localUploadedTranscribeSessionIdRef.current = null;
			localUploadedTranscribeAudioIdRef.current = null;
			message.error(errMsg);
			await loadLocalAudioList(meetingId);
		} finally {
			// 转写完成/失败由会议级 WebSocket 事件驱动更新；这里只结束“提交任务”阶段。
		}
	}, [
		selectedMeetingId,
		selectedLocalAudioId,
		localAudios,
		clearLocalMinutesDisplay,
		loadLocalAudioList,
	]);

	const startLocalSseStream = useCallback((audioId: number, meetingId: number) => {
		localDiscardHydrationRef.current = false;
		stopLocalSseStream();
		localSseAudioIdRef.current = audioId;
		const token = getToken();
		if (!token) { message.error('未找到登录 token，请先登录'); setLocalStreamType('error'); setLocalStreamError('未找到登录 token'); setLocalStreamHint(null); return; }
		setLocalStreamType('file_streaming');
		setLocalStreamHint('正在连接文件转写服务…');
		setLocalMinutesStatus(null);
		setShowLocalMinutesStatus(false);
		const wsUrl = buildWsUrl(`/api/minutes/local/audio/${audioId}/ws?token=${encodeURIComponent(token)}`);
		const ws = new WebSocket(wsUrl);
		localFileWsRef.current = ws;
		setTimeout(() => { localStreamCardRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }); }, 100);
		ws.onopen = () => {
			setLocalStreamError(null);
			setLocalStreamHint('正在接收转写结果…');
		};
		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(String(event.data || '{}'));
				if (localDiscardHydrationRef.current) {
					if (data.type === 'completed' || data.type === 'error' || data.type === 'discarded') {
						stopLocalSseStream();
					}
					return;
				}
				if (data.type === 'session_created') setLocalStreamSessionId(data.session_id || null);
				if (typeof data.accumulated === 'string' || typeof data.delta === 'string') {
					setLocalStreamText((prev) => mergeIncrementalAsrText(prev, data));
					setLocalStreamHint(null);
				}
				if (data.type === 'completed') {
					const transcript = resolveCompletedAsrText(localStreamTextRef.current, data);
					setLocalStreamText(transcript);
					setLocalStreamType('completed');
					setLocalStreamHint(null);
					void loadLocalAudioList(meetingId);
					stopLocalSseStream();
					if (!transcript.trim()) {
							// 空转写场景仅在第二步展示“纪要状态失败”，避免第一步重复报错提示。
							setLocalStreamType('completed');
							setLocalStreamError(null);
							setLocalStreamHint(null);
						void handleGenerateLocalMinutes(meetingId, typeof data.session_id === 'number' ? data.session_id : null);
						return;
					}
						// 统一状态机：提交生成后先显示“处理中”，再进入“已完成/失败”
						setShowLocalMinutesStatus(true);
						setLocalMinutesStatus({ status: 'processing' });
					if (data.minutes_generated) {
						window.setTimeout(() => {
							setLocalMinutesStatus({ status: 'completed' });
							message.success('转写完成，会议纪要已自动生成');
							void loadLocalMinutesData(meetingId);
								if (shouldSyncLocalSessions) {
									void loadLocalSessions(meetingId, true);
								}
						}, 500);
					} else {
						if (data.minutes_error) message.warning(`自动生成失败，改用兜底生成：${data.minutes_error}`);
						message.success('转写完成，正在自动生成会议纪要…');
						void handleGenerateLocalMinutes(meetingId, typeof data.session_id === 'number' ? data.session_id : null);
					}
				}
				if (data.type === 'error') {
					setLocalStreamType('error');
					setLocalStreamError(data.message || '流式转写失败');
					setLocalStreamHint(null);
					stopLocalSseStream();
				}
			} catch { /* ignore */ }
		};
		ws.onerror = () => {
			setLocalStreamType('error');
			setLocalStreamError('WS 连接失败或已中断');
			setLocalStreamHint(null);
			stopLocalSseStream();
		};
		ws.onclose = (e) => {
			const st = localStreamTypeRef.current;
		if (st === 'completed') return;
		if (st === 'error') return;
		const code = (e as CloseEvent | any)?.code;
		setLocalStreamType('error');
		setLocalStreamError(`文件转写 WS 已关闭 code=${code ?? '—'}`);
		setLocalStreamHint(null);
	};
}, [stopLocalSseStream, handleGenerateLocalMinutes, loadLocalMinutesData, loadLocalAudioList, shouldSyncLocalSessions, loadLocalSessions]);

	const startLocalLiveRecording = async () => {
		if (!selectedMeetingId) { message.warning('请选择会议'); return; }
		if (localAudios.length >= MAX_ONLINE_RECORDING_COUNT) {
			message.warning(buildOnlineRecordingLimitMessage(localAudios.length));
			return;
		}
		const token = getToken();
		if (!token) { message.error('未找到登录 token，请先登录'); return; }
		localDiscardHydrationRef.current = false;

		clearLocalMinutesDisplay();
		setLocalInputMode('live');

		const currentSession = ++localLiveSessionIdRef.current;
		const isSessionValid = () => currentSession === localLiveSessionIdRef.current;

		await stopLocalLiveWs(true);
		stopLocalSseStream();
		if (!isSessionValid()) return;

		setLocalStreamType('live_connecting');
		setLocalStreamHint(null);
		setLocalMinutesStatus(null);
		setShowLocalMinutesStatus(false);
		localLiveStopRequestedRef.current = false;
		localLiveFirstAudioSentRef.current = false;
		localLiveWsOpenedRef.current = false;
		localLiveReconnectAttemptsRef.current = 0;
		resetLocalLiveChunkBuffer();

		const mediaDevices = typeof navigator === 'undefined' ? undefined : navigator.mediaDevices;
		if (!mediaDevices?.getUserMedia) {
			if (!isSessionValid()) return;
			const errMsg = resolveMicrophoneAccessMessage();
			setLocalStreamType('error');
			setLocalStreamError(errMsg);
			setLocalStreamHint(null);
			message.error(errMsg);
			return;
		}

		let stream: MediaStream;
		try {
			stream = await mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: { ideal: 16000 }, echoCancellation: true, noiseSuppression: true } });
		} catch (error: any) {
			if (!isSessionValid()) return;
			const errMsg = resolveMicrophoneAccessMessage(error);
			setLocalStreamType('error');
			setLocalStreamError(errMsg);
			setLocalStreamHint(null);
			message.error(errMsg);
			return;
		}
		if (!isSessionValid()) { stream.getTracks().forEach((t) => t.stop()); return; }
		localMediaStreamRef.current = stream;

		try {
			const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
			let audioContext: AudioContext;
			try { audioContext = new AudioContextCtor({ sampleRate: 16000 }); } catch { audioContext = new AudioContextCtor(); }
			localAudioContextRef.current = audioContext;
			if (audioContext.state === 'suspended') { try { await audioContext.resume(); } catch { /* ignore */ } }
			if (!isSessionValid()) { await stopLocalAudioCapture(); return; }

			const source = audioContext.createMediaStreamSource(stream);
			const processor = audioContext.createScriptProcessor(4096, 1, 1);
			localProcessorRef.current = processor;
			processor.onaudioprocess = (e) => {
				try {
					if (!isSessionValid()) return;
					const liveWs = localLiveWsRef.current;
					if (!liveWs || liveWs.readyState !== WebSocket.OPEN) return;
					const input = e.inputBuffer.getChannelData(0);
					if (!localLiveFirstAudioSentRef.current) {
						localLiveFirstAudioSentRef.current = true;
						if (localLiveFirstAudioTimerRef.current) { window.clearTimeout(localLiveFirstAudioTimerRef.current); localLiveFirstAudioTimerRef.current = null; }
					}
					if (calcRms(input) < LOCAL_SILENCE_RMS_THRESHOLD) return;
					const downsampled = downsampleBuffer(input, audioContext.sampleRate, 16000);
					const pcm16 = float32ToInt16PCM(downsampled);
					const payload = new ArrayBuffer(pcm16.byteLength);
					new Uint8Array(payload).set(
						new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength),
					);
					localLiveChunkBuffersRef.current.push(payload);
					localLiveChunkBytesRef.current += payload.byteLength;
					flushLocalLiveChunkBuffer(false);
				} catch { /* ignore */ }
			};
			source.connect(processor);
			processor.connect(audioContext.destination);
		} catch (error: any) {
			if (!isSessionValid()) return;
			setLocalStreamType('error');
			setLocalStreamError(error?.message || '初始化音频采集失败');
			setLocalStreamHint(null);
			message.error(error?.message || '初始化音频采集失败');
			await stopLocalAudioCapture();
			return;
		}
		if (!isSessionValid()) { await stopLocalAudioCapture(); return; }

		const connectLocalLiveWs = async () => {
			let ws: WebSocket;
			try {
				const wsUrl = buildWsUrl(`/api/meetings/minutes/local/${selectedMeetingId}/live?token=${encodeURIComponent(token)}`);
				ws = new WebSocket(wsUrl);
			} catch (error: any) {
				if (!isSessionValid()) return;
				setLocalStreamType('error');
				setLocalStreamError(error?.message || 'WebSocket 初始化失败');
				setLocalStreamHint(null);
				await stopLocalAudioCapture();
				return;
			}

			ws.binaryType = 'arraybuffer';
			localLiveWsRef.current = ws;

			ws.onopen = () => {
				if (!isSessionValid()) { try { ws.close(); } catch { /* ignore */ } return; }
				localLiveWsOpenedRef.current = true;
				localLiveReconnectAttemptsRef.current = 0;
				if (localLiveWsConnectTimerRef.current) { window.clearTimeout(localLiveWsConnectTimerRef.current); localLiveWsConnectTimerRef.current = null; }
				try { ws.send(JSON.stringify({ action: 'config', rate: 16000, channels: 1 })); } catch { /* ignore */ }
				flushLocalLiveChunkBuffer(true);
				setLocalStreamType('live_streaming');
				localLiveFirstAudioTimerRef.current = window.setTimeout(async () => {
					if (!isSessionValid() || localLiveStopRequestedRef.current || localLiveFirstAudioSentRef.current) return;
					setLocalStreamType('error');
					setLocalStreamError('未采集到音频帧：请检查麦克风权限/设备，或刷新页面后重试');
					await stopLocalLiveWs(true);
				}, 6000);
			};

			ws.onmessage = async (event) => {
				if (!isSessionValid()) return;
				try {
					const data = JSON.parse(String(event.data || '{}'));
					if (localDiscardHydrationRef.current) {
						if (data.type === 'completed' || data.type === 'error' || data.type === 'discarded') {
							void stopLocalLiveWs(true);
							clearLocalMinutesDisplay();
							setLocalInputMode('live');
						}
						return;
					}
					if (data.type === 'session_created') setLocalStreamSessionId(data.session_id || null);
					if (typeof data.accumulated === 'string' || typeof data.delta === 'string') {
						setLocalStreamText((prev) => mergeIncrementalAsrText(prev, data));
						setLocalStreamHint(null);
					}
					if (data.type === 'saving_audio') setLocalStreamType('live_saving');
					if (data.type === 'uploading_audio') {
						setLocalStreamType('live_uploading');
					}
					if (data.type === 'completed') {
						const transcript = resolveCompletedAsrText(localStreamTextRef.current, data);
						const mid = selectedMeetingId;
						const minutesGenerated = Boolean(data.minutes_generated);
						const minutesError = typeof data.minutes_error === 'string' ? data.minutes_error : '';
						setLocalStreamText(transcript);
						if (typeof data.audio_id === 'number') setLocalLatestAudioId(data.audio_id);
						if (mid) void loadLocalAudioList(mid);
						setLocalStreamType('completed');
						setLocalStreamHint(null);
						// 勿在 onmessage 内长 await：否则上传/生成阶段切路由时主线程与导航易被拖住（对齐火山侧非阻塞思路）
						void stopLocalLiveWs(true);
						void (async () => {
							if (!isSessionValid()) return;
							if (localDiscardHydrationRef.current) return;
							if (!transcript.trim()) {
								setLocalStreamType('completed');
								setLocalStreamError(null);
								await handleGenerateLocalMinutes(
									mid ?? undefined,
									typeof data.session_id === 'number' ? data.session_id : null,
								);
								return;
							}
							setShowLocalMinutesStatus(true);
							setLocalMinutesStatus({ status: 'processing' });
							if (minutesGenerated) {
								await new Promise<void>((resolve) => {
									window.setTimeout(() => resolve(), 500);
								});
								if (!isSessionValid() || localDiscardHydrationRef.current) return;
								setLocalMinutesStatus({ status: 'completed' });
								message.success('录音完成，会议纪要已自动生成');
								if (mid) {
									await loadLocalMinutesData(mid);
									if (shouldSyncLocalSessions && !localDiscardHydrationRef.current) {
										await loadLocalSessions(mid, true);
									}
								}
							} else {
								if (minutesError) message.warning(`自动生成失败，改用兜底生成：${minutesError}`);
								message.success('录音完成，正在自动生成会议纪要…');
								await handleGenerateLocalMinutes(
									mid ?? undefined,
									typeof data.session_id === 'number' ? data.session_id : null,
								);
							}
						})();
						return;
					}
					if (data.type === 'error') {
						setLocalStreamType('error');
						setLocalStreamError(
							resolveLocalLiveErrorMessage(data.message, {
								stopRequested: localLiveStopRequestedRef.current,
								firstAudioSent: localLiveFirstAudioSentRef.current,
								wsOpened: localLiveWsOpenedRef.current,
							}),
						);
						setLocalStreamHint(null);
						void stopLocalLiveWs(true);
					}
				} catch { /* ignore */ }
			};

			ws.onerror = () => {
				if (!isSessionValid()) return;
				setLocalStreamType('error');
				setLocalStreamError(
					resolveLocalLiveErrorMessage('WebSocket 连接失败', {
						stopRequested: localLiveStopRequestedRef.current,
						firstAudioSent: localLiveFirstAudioSentRef.current,
						wsOpened: localLiveWsOpenedRef.current,
					}),
				);
				setLocalStreamHint(null);
				if (localLiveWsConnectTimerRef.current) { window.clearTimeout(localLiveWsConnectTimerRef.current); localLiveWsConnectTimerRef.current = null; }
				void stopLocalLiveWs(true);
			};

			ws.onclose = async (e) => {
				if (localLiveFirstAudioTimerRef.current) { window.clearTimeout(localLiveFirstAudioTimerRef.current); localLiveFirstAudioTimerRef.current = null; }
				if (localLiveWsConnectTimerRef.current) { window.clearTimeout(localLiveWsConnectTimerRef.current); localLiveWsConnectTimerRef.current = null; }
				if (!isSessionValid()) return;
				const code = (e as CloseEvent | any)?.code;
				if (localStreamTypeRef.current === 'completed') return;
				if (localLiveStopRequestedRef.current && (code === 1000 || code === 1001 || code === 1005)) {
					await stopLocalAudioCapture();
					return;
				}

				// 1005/1006 多为异常断线，保留采集并自动重连一次，尽量不中断会议
				if ((code === 1005 || code === 1006) && localLiveReconnectAttemptsRef.current < 1 && !localLiveStopRequestedRef.current) {
					localLiveReconnectAttemptsRef.current += 1;
					setLocalStreamType('live_connecting');
					setLocalStreamError('连接短暂中断，正在自动重连…');
					window.setTimeout(() => {
						if (isSessionValid() && !localLiveStopRequestedRef.current) {
							void connectLocalLiveWs();
						}
					}, 600);
					return;
				}

				await stopLocalAudioCapture();
				setLocalStreamType('error');
				setLocalStreamError(
					resolveLocalLiveErrorMessage(undefined, {
						closeCode: code,
						stopRequested: localLiveStopRequestedRef.current,
						firstAudioSent: localLiveFirstAudioSentRef.current,
						wsOpened: localLiveWsOpenedRef.current,
					}),
				);
			};

			localLiveWsConnectTimerRef.current = window.setTimeout(() => {
				if (!isSessionValid() || localLiveStopRequestedRef.current || localLiveWsOpenedRef.current) return;
				setLocalStreamType('error');
				setLocalStreamError(resolveLocalLiveErrorMessage('WebSocket 握手超时'));
				void stopLocalLiveWs(true);
			}, 5000);
		};

		await connectLocalLiveWs();
	};

	const handleSaveLocalSummary = async () => {
		if (!selectedMeetingId) { message.warning('请选择会议'); return; }
		setSavingLocalSummary(true);
		try {
			const compactParagraph = compactSummaryBlankLines(localSummaryDraft);
			const summary = await meetingMinutesApi.updateLocalSummary(selectedMeetingId, {
				paragraph: compactParagraph,
				title: localSummaryTitle || undefined,
			});
			setLocalMinutes((prev) => prev ? { ...prev, summary } : { transcript_text: null, summary, todos: [] });
			setLocalSummaryTitle(summary.title || '');
			setLocalSummaryDraft(compactSummaryBlankLines(normalizeSummaryMarkdown(summary.paragraph || '')));
			message.success('会议摘要已保存');
		} catch (error: any) {
			message.error(error?.message || '保存摘要失败');
		} finally {
			setSavingLocalSummary(false);
		}
	};

	const openLocalTodoModal = (todo?: LocalMeetingTodo) => {
		if (!hasSelectedMeeting) { message.warning('请选择会议'); return; }
		setEditingLocalTodo(todo || null);
		setLocalTodoModalVisible(true);
		if (todo) {
			localTodoForm.setFieldsValue({ content: todo.content, executor: todo.executor || undefined, execution_time: todo.execution_time || undefined });
		} else {
			localTodoForm.resetFields();
		}
	};

	const handleCloseLocalTodoModal = () => {
		setLocalTodoModalVisible(false);
		setEditingLocalTodo(null);
		localTodoForm.resetFields();
	};

	const submitLocalTodo = async () => {
		if (!selectedMeetingId) { message.warning('请选择会议'); return; }
		try {
			const values = await localTodoForm.validateFields();
			setSavingLocalTodo(true);
			const payload = { content: values.content, executor: values.executor, execution_time: values.execution_time };
			if (editingLocalTodo) {
				await meetingMinutesApi.updateLocalTodo(selectedMeetingId, editingLocalTodo.id, payload);
				message.success('待办事项已更新');
			} else {
				await meetingMinutesApi.createLocalTodo(selectedMeetingId, payload);
				message.success('已新增待办事项');
			}
			handleCloseLocalTodoModal();
			loadLocalMinutesData(selectedMeetingId);
		} catch (error: any) {
			if (!error?.errorFields) message.error(error?.message || '保存待办事项失败');
		} finally {
			setSavingLocalTodo(false);
		}
	};

	const handleDeleteLocalTodo = async (todoId: number) => {
		if (!selectedMeetingId) { message.warning('请选择会议'); return; }
		try {
			await meetingMinutesApi.deleteLocalTodo(selectedMeetingId, todoId);
			message.success('待办事项已删除');
			loadLocalMinutesData(selectedMeetingId);
		} catch (error: any) {
			message.error(error?.message || '删除待办事项失败');
		}
	};

	const handleDeleteLocalSession = async (sessionId: number) => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		try {
			await meetingMinutesApi.deleteLocalMinutesSession(selectedMeetingId, sessionId);
			message.success('会话历史已删除');
			const isSelected = selectedLocalSessionId === sessionId;
			if (isSelected) {
				setSelectedLocalSessionId(null);
				setSelectedLocalSessionDetail(null);
			}
			await loadLocalSessions(selectedMeetingId, !isSelected);
			loadLocalMinutesData(selectedMeetingId);
			loadLocalAudioList(selectedMeetingId);
		} catch (error: any) {
			message.error(error?.message || '删除会话历史失败');
		}
	};

	const localTodoColumns: import('antd/es/table').ColumnsType<LocalMeetingTodo> = [
		{ title: '内容', dataIndex: 'content', ellipsis: true },
		{ title: '执行人', dataIndex: 'executor', width: 140, render: (v?: string) => v || '未指定' },
		{ title: '执行时间', dataIndex: 'execution_time', width: 160, render: (v?: string) => v || '未指定' },
	];

	const localStreamStatusLabel: Record<string, string> = {
		idle: '空闲',
		live_connecting: '连接中（WS）',
		live_streaming: '实时录音中',
		live_stopping: '正在上传音频…',
		live_saving: '保存音频中…',
		live_uploading: '上传音频中…',
		file_streaming: '流式转写中（WS）',
		completed: '已完成',
		error: '失败',
	};

	const localMinutesStatusLabel: Record<string, string> = {
		completed: '已完成',
		succeeded: '已完成',
		success: '已完成',
		finished: '已完成',
		cancelled: '已取消',
		canceled: '已取消',
		failed: '失败',
		error: '失败',
		processing: '处理中',
		submitted: '处理中',
		running: '运行中',
		pending: '等待中',
	};

	const triggerFileDownload = (blob: Blob, filename: string) => {
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);
	};

	const triggerBrowserDownload = (url: string) => {
		const a = document.createElement('a');
		a.href = url;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	};

	const handleDownloadVolcAudio = async (audioId: number) => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		try {
			const { blob, filename } = await meetingsApi.downloadVolcAudio(selectedMeetingId, audioId);
			triggerFileDownload(blob, filename);
		} catch (error: any) {
			message.error(error?.message || '下载音频失败');
		}
	};

	const handleDeleteVolcAudio = async (audioId: number) => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		try {
			await meetingsApi.deleteVolcAudio(selectedMeetingId, audioId);
			message.success('普通会议音频已删除');
			if (selectedVolcAudioId === audioId) setSelectedVolcAudioId(null);
			loadVolcAudioList(selectedMeetingId);
		} catch (error: any) {
			message.error(error?.message || '删除音频失败');
		}
	};

	const handleDownloadLocalAudio = async (audioId: number) => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		try {
			const token = getToken();
			if (!token) {
				message.error('未找到登录 token，请先登录');
				return;
			}
			triggerBrowserDownload(localAudioDirectDownloadUrl(selectedMeetingId, audioId, token));
		} catch (error: any) {
			message.error(error?.message || '下载音频失败');
		}
	};

	const handleDeleteLocalAudio = async (audioId: number) => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		try {
			await meetingsApi.deleteLocalAudio(selectedMeetingId, audioId);
			message.success('机密会议音频已删除');
			if (selectedLocalAudioId === audioId) setSelectedLocalAudioId(null);
			if (localLatestAudioId === audioId) setLocalLatestAudioId(null);
			loadLocalAudioList(selectedMeetingId);
		} catch (error: any) {
			message.error(error?.message || '删除音频失败');
		}
	};

	const handleDownloadVolcSessionAudio = async (sourceAudioId?: number | null) => {
		if (!sourceAudioId) {
			message.warning('当前会话未关联可下载的录音');
			return;
		}
		await handleDownloadVolcAudio(sourceAudioId);
	};

	const handleDownloadLocalSessionAudio = async (sourceAudioId?: number | null) => {
		if (!sourceAudioId) {
			message.warning('当前会话未关联可下载的录音');
			return;
		}
		await handleDownloadLocalAudio(sourceAudioId);
	};

	const startRecordingTimer = () => {
		stopRecordingTimer();
		recordingTimerRef.current = setInterval(() => {
			setRecordingDuration((prev) => prev + 1);
		}, 1000);
	};

	const stopRecordingTimer = () => {
		if (recordingTimerRef.current) {
			clearInterval(recordingTimerRef.current);
			recordingTimerRef.current = null;
		}
	};

	const resetRecordingState = () => {
		setRecording(false);
		setIsPaused(false);
		setRecordingDuration(0);
		setHasRecordingData(false);
		recordingChunksRef.current = [];
		stopRecordingTimer();
	};

	const handleOpenRecordingModal = (target: 'local' | 'volc') => {
		if (!hasSelectedMeeting) {
			message.warning('请选择会议');
			return;
		}
		setRecordingTarget(target);
		if (recording) stopRecording();
		resetRecordingState();
		setRecordingError(null);
		setRecordingModalVisible(true);
	};

	const startRecording = async () => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		setRecordingError(null);
		const mediaDevices = typeof navigator === 'undefined' ? undefined : navigator.mediaDevices;
		if (!mediaDevices?.getUserMedia) {
			const errMsg = resolveMicrophoneAccessMessage();
			setRecordingError(errMsg);
			message.error(errMsg);
			return;
		}
		try {
			const stream = await mediaDevices.getUserMedia({ audio: true });
			const mediaRecorder = new MediaRecorder(stream);
			mediaRecorderRef.current = mediaRecorder;
			recordingChunksRef.current = [];
			setRecordingDuration(0);
			setHasRecordingData(false);

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					recordingChunksRef.current.push(event.data);
					setHasRecordingData(true);
				}
			};

			mediaRecorder.onstop = () => {
				stream.getTracks().forEach((track) => {
					track.stop();
				});
			};

			mediaRecorder.start();
			setRecording(true);
			setIsPaused(false);
			startRecordingTimer();
			message.success('开始录音');
		} catch (error: any) {
			const errMsg = resolveMicrophoneAccessMessage(error);
			setRecordingError(errMsg);
			message.error(errMsg);
		}
	};

	const stopRecording = () => {
		if (!mediaRecorderRef.current) return;
		if (mediaRecorderRef.current.state !== 'inactive') {
			mediaRecorderRef.current.stop();
		}
		if (mediaRecorderRef.current.stream) {
			mediaRecorderRef.current.stream.getTracks().forEach((track) => {
				track.stop();
			});
		}
		mediaRecorderRef.current = null;
		setRecording(false);
		setIsPaused(false);
		stopRecordingTimer();
	};

	const getRecordedFile = (): File | null => {
		if (!recordingChunksRef.current.length) return null;
		const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
		return new File([blob], `meeting-recording-${Date.now()}.webm`, { type: 'audio/webm' });
	};

	const pauseRecording = () => {
		if (!mediaRecorderRef.current || isPaused || !recording) return;
		if (typeof mediaRecorderRef.current.pause === 'function') {
			mediaRecorderRef.current.pause();
			setIsPaused(true);
			stopRecordingTimer();
		}
	};

	const resumeRecording = () => {
		if (!mediaRecorderRef.current || !isPaused) return;
		if (typeof mediaRecorderRef.current.resume === 'function') {
			mediaRecorderRef.current.resume();
			setIsPaused(false);
			startRecordingTimer();
		}
	};

	const uploadRecording = async () => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		const recordedFile = getRecordedFile();
		if (!recordedFile) {
			message.warning('没有录音数据');
			return;
		}
		setRecordingUploading(true);
		try {
			if (recordingTarget === 'volc') {
				await meetingsApi.uploadVolcAudio(selectedMeetingId, recordedFile);
				message.success('录音已上传至火山模式');
				await loadVolcAudioList(selectedMeetingId);
			} else {
				await meetingsApi.uploadAudios(selectedMeetingId, [recordedFile]);
				message.success('录音已上传');
				const audios = await meetingsApi.listAudios(selectedMeetingId);
				setAvailableAudios(audios);
			}
			setRecordingModalVisible(false);
			resetRecordingState();
		} catch (error: any) {
			if (isAudioUploadPendingError(error)) {
				const errMsg = error?.message || '音频上传耗时较长，后台仍在继续处理，请稍后刷新确认结果';
				message.warning(errMsg);
				if (recordingTarget === 'volc') {
					window.setTimeout(() => {
						void loadVolcAudioList(selectedMeetingId);
					}, 5000);
				} else {
					window.setTimeout(() => {
						void meetingsApi.listAudios(selectedMeetingId).then(setAvailableAudios).catch(() => undefined);
					}, 5000);
				}
				setRecordingModalVisible(false);
				resetRecordingState();
				return;
			}
			const errMsg = error?.message || '录音上传失败';
			message.error(errMsg);
			setRecordingError(errMsg);
		} finally {
			setRecordingUploading(false);
		}
	};

	const handleAudioUpload = async ({ file, onSuccess, onError }: any) => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			onError?.(new Error('请选择会议'));
			return;
		}
		try {
			if (uploadAudioTarget === 'volc') {
				await meetingsApi.uploadVolcAudio(selectedMeetingId, file as File);
				await loadVolcAudioList(selectedMeetingId);
			} else {
				await meetingsApi.uploadAudios(selectedMeetingId, [file as File]);
				const audios = await meetingsApi.listAudios(selectedMeetingId);
				setAvailableAudios(audios);
			}
			onSuccess?.('ok');
			message.success(`${file.name} 上传成功`);
		} catch (error: any) {
			if (isAudioUploadPendingError(error)) {
				const errMsg = error?.message || `${file.name} 上传处理中，请稍后刷新确认结果`;
				message.warning(errMsg);
				if (uploadAudioTarget === 'volc') {
					window.setTimeout(() => {
						void loadVolcAudioList(selectedMeetingId);
					}, 5000);
				} else {
					window.setTimeout(() => {
						void meetingsApi.listAudios(selectedMeetingId).then(setAvailableAudios).catch(() => undefined);
					}, 5000);
				}
				onSuccess?.('ok');
				return;
			}
			const errMsg = error?.message || `${file.name} 上传失败`;
			message.error(errMsg);
			onError?.(new Error(errMsg));
		}
	};

	const handleFileUpload = async ({ file, onSuccess, onError }: any) => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			onError?.(new Error('请选择会议'));
			return;
		}
		try {
			await meetingsApi.uploadFiles(selectedMeetingId, [file as File]);
			const files = await meetingsApi.listFiles(selectedMeetingId);
			setAvailableFiles(files);
			onSuccess?.('ok');
			message.success(`${file.name} 上传成功`);
		} catch (error: any) {
			const errMsg = error?.message || `${file.name} 上传失败`;
			message.error(errMsg);
			onError?.(new Error(errMsg));
		}
	};

	const openUploadAudioModal = (target: 'local' | 'volc') => {
		if (!hasSelectedMeeting) {
			message.warning('请选择会议');
			return;
		}
		setUploadAudioTarget(target);
		setUploadAudioModalVisible(true);
	};

	const summaryUpdatedAt = insights?.summary?.updated_at;

	const actionColumns: ColumnsType<MeetingActionItem> = [
		{
			title: '行动项',
			dataIndex: 'description',
			ellipsis: true,
		},
		{
			title: '负责人',
			dataIndex: 'owner',
			width: 120,
			render: (value?: string) => value || '—',
		},
		{
			title: '截止日期',
			dataIndex: 'due_date',
			width: 140,
			render: (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD') : '—'),
		},
		{
			title: '状态',
			dataIndex: 'status',
			width: 120,
			render: (value?: string) => {
				const meta = actionStatusOptions.find((item) => item.value === value);
				return <Tag color={meta?.color || 'default'}>{meta?.label || '未设置'}</Tag>;
			},
		},
		{
			title: '操作',
			width: 160,
			render: (_, record) => (
				<Space>
					<Button type="link" onClick={() => openActionModal(record)}>
						编辑
					</Button>
					<Button type="link" danger onClick={() => handleDeleteAction(record)}>
						删除
					</Button>
				</Space>
			),
		},
	];

	const decisionColumns: ColumnsType<MeetingDecisionItem> = [
		{
			title: '决策事项',
			dataIndex: 'description',
			ellipsis: true,
		},
		{
			title: '更新时间',
			dataIndex: 'updated_at',
			width: 180,
			render: (value: string) => formatShanghaiTime(value),
		},
		{
			title: '操作',
			width: 150,
			render: (_, record) => (
				<Space>
					<Button type="link" onClick={() => openDecisionModal(record)}>
						编辑
					</Button>
					<Button type="link" danger onClick={() => handleDeleteDecision(record)}>
						删除
					</Button>
				</Space>
			),
		},
	];

	const openActionModal = (item?: MeetingActionItem) => {
		setEditingAction(item || null);
		if (item) {
			actionForm.setFieldsValue({
				description: item.description,
				owner: item.owner || undefined,
				due_date: item.due_date ? dayjs(item.due_date) : undefined,
				status: item.status || undefined,
			});
		} else {
			actionForm.resetFields();
		}
		setActionModalVisible(true);
	};

	const openDecisionModal = (item?: MeetingDecisionItem) => {
		setEditingDecision(item || null);
		if (item) {
			decisionForm.setFieldsValue({ description: item.description });
		} else {
			decisionForm.resetFields();
		}
		setDecisionModalVisible(true);
	};

	const submitActionItem = async () => {
		if (!selectedMeetingId) return;
		try {
			const values = await actionForm.validateFields();
			setActionModalVisible(false);
			if (editingAction) {
				await meetingMinutesApi.updateActionItem(selectedMeetingId, editingAction.id, {
					description: values.description,
					owner: values.owner,
					due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : undefined,
					status: values.status,
				});
				message.success('行动项已更新');
			} else {
				await meetingMinutesApi.createActionItem(selectedMeetingId, {
					description: values.description,
					owner: values.owner,
					due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : undefined,
					status: values.status,
				});
				message.success('新增行动项成功');
			}
			actionForm.resetFields();
			setEditingAction(null);
			loadInsights(selectedMeetingId);
		} catch (error: any) {
			if (!error?.errorFields) {
				message.error(error?.message || '保存行动项失败');
			}
		}
	};

	const handleDeleteAction = async (record: MeetingActionItem) => {
		if (!selectedMeetingId) return;
		try {
			await meetingMinutesApi.deleteActionItem(selectedMeetingId, record.id);
			message.success('行动项已删除');
			loadInsights(selectedMeetingId);
		} catch (error: any) {
			message.error(error?.message || '删除失败');
		}
	};

	const submitDecision = async () => {
		if (!selectedMeetingId) return;
		try {
			const values = await decisionForm.validateFields();
			setDecisionModalVisible(false);
			if (editingDecision) {
				await meetingMinutesApi.updateDecisionItem(selectedMeetingId, editingDecision.id, {
					description: values.description,
				});
				message.success('决策事项已更新');
			} else {
				await meetingMinutesApi.createDecisionItem(selectedMeetingId, {
					description: values.description,
				});
				message.success('新增决策事项成功');
			}
			decisionForm.resetFields();
			setEditingDecision(null);
			loadInsights(selectedMeetingId);
		} catch (error: any) {
			if (!error?.errorFields) {
				message.error(error?.message || '保存决策事项失败');
			}
		}
	};

	const handleDeleteDecision = async (record: MeetingDecisionItem) => {
		if (!selectedMeetingId) return;
		try {
			await meetingMinutesApi.deleteDecisionItem(selectedMeetingId, record.id);
			message.success('决策事项已删除');
			loadInsights(selectedMeetingId);
		} catch (error: any) {
			message.error(error?.message || '删除失败');
		}
	};

	const renderGenerateContent = () => (
		<div>
			<Title level={5}>选择会议资料（最多 5 个）</Title>
			{availableFiles.length ? (
				<Checkbox.Group value={selectedFileIds} onChange={handleSelectFiles} style={{ width: '100%' }}>
					<Space direction="vertical" style={{ width: '100%' }}>
						{availableFiles.map((file) => (
							<Checkbox key={file.id} value={file.id}>
								<Space direction="vertical" size={0}>
									<Text strong>{file.filename}</Text>
									<Text type="secondary">上传于 {formatShanghaiTime(file.uploaded_at)}</Text>
								</Space>
							</Checkbox>
						))}
					</Space>
				</Checkbox.Group>
			) : (
				<Text type="secondary">暂无会议文件，可以在会议管理页面上传。</Text>
			)}

			<Divider />
			<Title level={5}>选择音频（最多 3 段）</Title>
			{availableAudios.length ? (
				<Checkbox.Group value={selectedAudioIds} onChange={handleSelectAudios} style={{ width: '100%' }}>
					<Space direction="vertical" style={{ width: '100%' }}>
						{availableAudios.map((audio) => {
							const isProcessing = audio.status !== 'completed' && audio.status !== 'failed';
							const checkbox = (
								<Checkbox
									key={audio.id}
									value={audio.id}
									disabled={isProcessing}
									style={isProcessing ? { cursor: 'not-allowed' } : undefined}
								>
									<Space direction="vertical" size={0}>
										<Text strong>{audio.filename}</Text>
										<Text type="secondary">
											{formatShanghaiTime(audio.uploaded_at)} ·{' '}
											{audio.status === 'completed'
												? '已完成转写'
												: audio.status === 'failed'
													? '转写失败'
													: '转写中'}
										</Text>
									</Space>
								</Checkbox>
							);
							return isProcessing ? (
								<Tooltip key={audio.id} title="该录音仍在转写中，完成后方可参与生成纪要">
									<span>{checkbox}</span>
								</Tooltip>
							) : (
								checkbox
							);
						})}
					</Space>
				</Checkbox.Group>
			) : (
				<Text type="secondary">暂无已上传的音频文件。</Text>
			)}
		</div>
	);

	const volcAudioColumns: ColumnsType<VolcMeetingAudio> = [
		{
			title: '音频文件',
			dataIndex: 'file_name',
			ellipsis: true,
			render: (value?: string) => value || '未命名音频',
		},
		{
			title: '上传时间',
			dataIndex: 'created_at',
			width: 180,
			render: (value: string) => formatShanghaiTime(value),
		},
		{
			title: '状态',
			dataIndex: 'status',
			width: 140,
			render: (value: string, record) => {
				const uploadStatus = resolveVolcAudioUploadStatus(value);
				const meta = VOLC_AUDIO_UPLOAD_STATUS_META[uploadStatus];
				const tag = <Tag color={meta.color}>{meta.label}</Tag>;
				if (uploadStatus === 'failed' && record.error_msg) {
					return <Tooltip title={resolveVolcErrorMessage(record.error_msg)}>{tag}</Tooltip>;
				}
				return tag;
			},
		},
		{
			title: '操作',
			width: 200,
			render: (_, record) => (
				<Space>
					<Button type="link" onClick={() => handleDownloadVolcAudio(record.id)}>
						下载
					</Button>
					<Button type="link" danger onClick={() => handleDeleteVolcAudio(record.id)}>
						删除
					</Button>
				</Space>
			),
		},
	];

	const volcAudioRowSelection = {
		type: 'radio' as const,
		selectedRowKeys: selectedVolcAudioId ? [selectedVolcAudioId] : [],
		getCheckboxProps: (record: VolcMeetingAudio) => {
			return { disabled: resolveVolcAudioUploadStatus(record.status) !== 'uploaded' };
		},
		onChange: (selectedRowKeys: React.Key[]) => {
			const [key] = selectedRowKeys;
			if (key === undefined || key === null) {
				setSelectedVolcAudioId(null);
				return;
			}
			const normalized = typeof key === 'number' ? key : Number(key);
			setSelectedVolcAudioId(Number.isNaN(normalized) ? null : normalized);
		},
	};
	const selectedVolcAudioRecord = useMemo(
		() => volcAudios.find((item) => item.id === selectedVolcAudioId) || null,
		[volcAudios, selectedVolcAudioId],
	);
	const selectedVolcAudioCanGenerate = resolveVolcAudioUploadStatus(selectedVolcAudioRecord?.status) === 'uploaded';

	const localStatusMeta: Record<string, { label: string; color: string }> = {
		uploaded: { label: '已上传', color: 'default' },
		completed: { label: '已完成', color: 'green' },
		processing: { label: '处理中', color: 'processing' },
		failed: { label: '失败', color: 'red' },
	};

	const localAudioColumns: ColumnsType<LocalMeetingAudio> = [
		{
			title: '音频文件',
			dataIndex: 'file_name',
			ellipsis: true,
			render: (value?: string) => value || '未命名音频',
		},
		{
			title: '上传时间',
			dataIndex: 'created_at',
			width: 180,
			render: (value: string) => formatShanghaiTime(value),
		},
		{
			title: '状态',
			dataIndex: 'status',
			width: 140,
			render: (value: string, record) => {
				const meta = localStatusMeta[value] || { label: value || '未知', color: 'default' };
				const tag = <Tag color={meta.color}>{meta.label}</Tag>;
				if (value === 'failed' && record.error_msg) {
					return <Tooltip title={record.error_msg}>{tag}</Tooltip>;
				}
				return tag;
			},
		},
		{
			title: '操作',
			width: 200,
			render: (_, record) => (
				<Space>
					<Button type="link" disabled={localEntryButtonsBusy} onClick={() => handleDownloadLocalAudio(record.id)}>
						下载
					</Button>
					<Button type="link" danger disabled={localEntryButtonsBusy} onClick={() => handleDeleteLocalAudio(record.id)}>
						删除
					</Button>
				</Space>
			),
		},
	];

	const localAudioRowSelection = {
		type: 'radio' as const,
		selectedRowKeys: selectedLocalAudioId ? [selectedLocalAudioId] : [],
		getCheckboxProps: () => ({
			disabled: localEntryButtonsBusy,
		}),
		onChange: (selectedRowKeys: React.Key[]) => {
			const [key] = selectedRowKeys;
			if (key === undefined || key === null) {
				setSelectedLocalAudioId(null);
				return;
			}
			const normalized = typeof key === 'number' ? key : Number(key);
			setSelectedLocalAudioId(Number.isNaN(normalized) ? null : normalized);
		},
	};

	const latestVolcSessionId = volcSessionList[0]?.id ?? null;
	const latestLocalSessionId = localSessionList[0]?.id ?? null;
	const localSessionEditable = isCompletedSessionStatus(selectedLocalSessionDetail?.status);
	const selectedLocalAudioRecord = localAudios.find((item) => item.id === selectedLocalAudioId) || null;
	const selectedLocalAudioCanGenerate = isLocalAudioReadyForMinutesStatus(selectedLocalAudioRecord?.status);

	const resetVolcSessionSummaryDraft = () => {
		setVolcSessionDraft((prev) => ({
			...prev,
			summary_title: selectedVolcSessionDetail?.summary_title || '',
			summary_paragraph: selectedVolcSessionDetail?.summary_paragraph || '',
		}));
	};

	const resetLocalSessionSummaryDraft = () => {
		setLocalSessionDraft((prev) => ({
			...prev,
			summary_title: selectedLocalSessionDetail?.summary_title || '',
			summary_paragraph: selectedLocalSessionDetail?.summary_paragraph || '',
		}));
	};

	const handleCancelVolcSessionSummaryEdit = () => {
		resetVolcSessionSummaryDraft();
		setEditingVolcSessionSummary(false);
	};

	const handleCancelLocalSessionSummaryEdit = () => {
		resetLocalSessionSummaryDraft();
		setEditingLocalSessionSummary(false);
	};

	const handleSaveVolcSessionSummary = async () => {
		const saved = await handleSaveVolcSessionDetail();
		if (saved) {
			setEditingVolcSessionSummary(false);
		}
	};

	const handleSaveLocalSessionSummary = async () => {
		const saved = await handleSaveLocalSessionDetail();
		if (saved) {
			setEditingLocalSessionSummary(false);
		}
	};

	const renderVolcSessionSummaryCard = () => (
		<ProCard
			title="会议摘要"
			extra={
				editingVolcSessionSummary ? (
					<Space size={8}>
						<Button onClick={handleCancelVolcSessionSummaryEdit} disabled={savingVolcSessionDetail}>
							取消
						</Button>
						<Button
							type="primary"
							onClick={handleSaveVolcSessionSummary}
							loading={savingVolcSessionDetail}
							disabled={!selectedVolcSessionId}
						>
							保存
						</Button>
					</Space>
				) : (
					<Button type="link" onClick={() => setEditingVolcSessionSummary(true)} disabled={!selectedVolcSessionId}>
						编辑摘要
					</Button>
				)
			}
		>
			<Space direction="vertical" style={{ width: '100%' }}>
				{editingVolcSessionSummary ? (
					<>
						<Input
							value={volcSessionDraft.summary_title}
							onChange={(e) => setVolcSessionDraft((prev) => ({ ...prev, summary_title: e.target.value }))}
							placeholder="无摘要标题"
						/>
						<TextArea
							rows={6}
							value={volcSessionDraft.summary_paragraph}
							onChange={(e) => setVolcSessionDraft((prev) => ({ ...prev, summary_paragraph: e.target.value }))}
							placeholder="可在此编辑摘要内容（支持 Markdown）"
						/>
					</>
				) : (
					<>
						{volcSessionDraft.summary_title ? (
							<Text strong>{volcSessionDraft.summary_title}</Text>
						) : (
							<Text type="secondary">暂无摘要标题</Text>
						)}
						<div style={SESSION_SUMMARY_PREVIEW_STYLE}>
							{volcSessionDraft.summary_paragraph ? (
								renderSimpleMarkdown(volcSessionDraft.summary_paragraph)
							) : (
								<Text type="secondary">暂无摘要内容</Text>
							)}
						</div>
					</>
				)}
			</Space>
		</ProCard>
	);

	const renderLocalSessionSummaryCard = () => (
		<ProCard
			title="会议摘要"
			extra={
				localSessionEditable ? (
					editingLocalSessionSummary ? (
						<Space size={8}>
							<Button onClick={handleCancelLocalSessionSummaryEdit} disabled={savingLocalSessionDetail}>
								取消
							</Button>
							<Button
								type="primary"
								onClick={handleSaveLocalSessionSummary}
								loading={savingLocalSessionDetail}
								disabled={!selectedLocalSessionId}
							>
								保存
							</Button>
						</Space>
					) : (
						<Button type="link" onClick={() => setEditingLocalSessionSummary(true)} disabled={!selectedLocalSessionId}>
							编辑摘要
						</Button>
					)
				) : null
			}
		>
			{!localSessionEditable && (
				<Alert
					type="info"
					showIcon
					message="当前会话未完成，仅可查看，不可编辑或保存。"
				/>
			)}
			<Space direction="vertical" style={{ width: '100%' }}>
				{localSessionEditable && editingLocalSessionSummary ? (
					<>
						<Input
							value={localSessionDraft.summary_title}
							onChange={(e) => setLocalSessionDraft((prev) => ({ ...prev, summary_title: e.target.value }))}
							placeholder="无摘要标题"
						/>
						<TextArea
							rows={6}
							value={localSessionDraft.summary_paragraph}
							onChange={(e) => setLocalSessionDraft((prev) => ({ ...prev, summary_paragraph: e.target.value }))}
							placeholder="可在此编辑摘要内容（支持 Markdown）"
						/>
					</>
				) : (
					<>
						{localSessionDraft.summary_title ? (
							<Text strong>{localSessionDraft.summary_title}</Text>
						) : (
							<Text type="secondary">暂无摘要标题</Text>
						)}
						<div style={SESSION_SUMMARY_PREVIEW_STYLE}>
							{localSessionDraft.summary_paragraph ? (
								renderSimpleMarkdown(localSessionDraft.summary_paragraph)
							) : (
								<Text type="secondary">暂无摘要内容</Text>
							)}
						</div>
					</>
				)}
			</Space>
		</ProCard>
	);

	const openLocalSessionTodoModal = (index?: number) => {
		if (!localSessionEditable) {
			message.warning('当前会话未完成，仅支持查看');
			return;
		}
		setEditingLocalSessionTodoIndex(typeof index === 'number' ? index : null);
		if (typeof index === 'number' && localSessionDraft.todos[index]) {
			const item = localSessionDraft.todos[index];
			localSessionTodoForm.setFieldsValue({
				content: item.content,
				executor: item.executor || undefined,
				execution_time: item.execution_time || undefined,
			});
		} else {
			localSessionTodoForm.resetFields();
		}
		setLocalSessionTodoModalVisible(true);
	};

	const closeLocalSessionTodoModal = () => {
		setLocalSessionTodoModalVisible(false);
		setEditingLocalSessionTodoIndex(null);
		localSessionTodoForm.resetFields();
	};

	const submitLocalSessionTodo = async () => {
		if (!isCompletedSessionStatus(selectedLocalSessionDetail?.status)) {
			message.warning('仅已完成的会话支持编辑待办');
			return;
		}
		try {
			const values = await localSessionTodoForm.validateFields();
			const nextTodos = [...localSessionDraft.todos];
			const payload: LocalSessionTodoItem = {
				content: values.content,
				executor: values.executor || null,
				execution_time: values.execution_time || null,
				source_audio_id: selectedLocalSessionDetail?.source_audio_id ?? null,
			};
			if (editingLocalSessionTodoIndex != null && nextTodos[editingLocalSessionTodoIndex]) {
				nextTodos[editingLocalSessionTodoIndex] = {
					...nextTodos[editingLocalSessionTodoIndex],
					...payload,
				};
			} else {
				nextTodos.push(payload);
			}
			const nextDraft = { ...localSessionDraft, todos: nextTodos };
			setLocalSessionDraft(nextDraft);
			closeLocalSessionTodoModal();
			await persistLocalSessionDetail(nextDraft, '待办事项已保存');
		} catch (error: any) {
			if (!error?.errorFields) {
				message.error(error?.message || '保存会话待办失败');
			}
		}
	};

	const deleteLocalSessionTodo = async (index: number) => {
		if (!isCompletedSessionStatus(selectedLocalSessionDetail?.status)) {
			message.warning('仅已完成的会话支持编辑待办');
			return;
		}
		const nextDraft = {
			...localSessionDraft,
			todos: localSessionDraft.todos.filter((_, idx) => idx !== index),
		};
		setLocalSessionDraft(nextDraft);
		await persistLocalSessionDetail(nextDraft, '待办事项已保存');
	};

	const localSessionTodoColumns: ColumnsType<LocalSessionTodoItem> = [
		{
			title: '内容',
			dataIndex: 'content',
			ellipsis: true,
		},
		{
			title: '执行人',
			dataIndex: 'executor',
			width: 140,
			render: (value?: string | null) => value || '未指定',
		},
		{
			title: '执行时间',
			dataIndex: 'execution_time',
			width: 160,
			render: (value?: string | null) => value || '未指定',
		},
		{
			title: '操作',
			width: 160,
			render: (_, __, index) => (
				<Space>
					<Button type="link" disabled={!localSessionEditable} onClick={() => openLocalSessionTodoModal(index)}>
						编辑
					</Button>
					<Button type="link" danger disabled={!localSessionEditable} onClick={() => void deleteLocalSessionTodo(index)}>
						删除
					</Button>
				</Space>
			),
		},
	];

	const localSessionColumns: ColumnsType<LocalMeetingMinutesSession> = [
		{
			title: '会话编号',
			dataIndex: 'session_no',
			width: 240,
			render: (value?: string | null, record?) => (
				<Space size={6}>
					<span>{value || '—'}</span>
					{record?.id === latestLocalSessionId ? <Tag color="gold">最新</Tag> : null}
				</Space>
			),
		},
		{
			title: '创建时间',
			dataIndex: 'created_at',
			width: 170,
			render: (value: string) => formatShanghaiTime(value, 'YYYY-MM-DD HH:mm:ss'),
		},
		{
			title: '状态',
			dataIndex: 'status',
			width: 120,
			render: (value?: string, record?) => {
				const { color, label } = getSessionListFinalStatus(value);
				const tag = <Tag color={color}>{label}</Tag>;
				if (record?.error_msg) {
					return <Tooltip title={record.error_msg}>{tag}</Tooltip>;
				}
				return tag;
			},
		},
		{
			title: '来源音频',
			dataIndex: 'source_audio_id',
			width: 100,
			render: (value?: number | null) => value ?? '—',
		},
		{
			title: '操作',
			width: 180,
			render: (_, record) => (
				<Space size={0} onClick={(event) => event.stopPropagation()}>
					<Button
						type="link"
						onClick={(event) => {
							event.stopPropagation();
							void handleDownloadLocalSessionAudio(record.source_audio_id);
						}}
					>
						下载录音
					</Button>
					<Popconfirm
						title="确定删除该会话历史？"
						description="删除后无法恢复。"
						okText="确认删除"
						cancelText="取消"
						onConfirm={() => handleDeleteLocalSession(record.id)}
					>
						<Button
							type="link"
							danger
							onClick={(event) => {
								event.stopPropagation();
							}}
						>
							删除
						</Button>
					</Popconfirm>
				</Space>
			),
		},
	];

	const volcTodoColumns: ColumnsType<VolcMeetingTodo> = [
		{
			title: '内容',
			dataIndex: 'content',
			ellipsis: true,
		},
		{
			title: '执行人',
			dataIndex: 'executor',
			width: 140,
			render: (value?: string) => value || '未指定',
		},
		{
			title: '执行时间',
			dataIndex: 'execution_time',
			width: 160,
			render: (value?: string) => value || '未指定',
		},
	];

	const openVolcSessionTodoModal = (index?: number) => {
		setEditingVolcSessionTodoIndex(typeof index === 'number' ? index : null);
		if (typeof index === 'number' && volcSessionDraft.todos[index]) {
			const item = volcSessionDraft.todos[index];
			volcSessionTodoForm.setFieldsValue({
				content: item.content,
				executor: item.executor || undefined,
				execution_time: item.execution_time || undefined,
			});
		} else {
			volcSessionTodoForm.resetFields();
		}
		setVolcSessionTodoModalVisible(true);
	};

	const closeVolcSessionTodoModal = () => {
		setVolcSessionTodoModalVisible(false);
		setEditingVolcSessionTodoIndex(null);
		volcSessionTodoForm.resetFields();
	};

	const submitVolcSessionTodo = async () => {
		try {
			const values = await volcSessionTodoForm.validateFields();
			const nextTodos = [...volcSessionDraft.todos];
			const payload: VolcSessionTodoItem = {
				content: values.content,
				executor: values.executor || null,
				execution_time: values.execution_time || null,
				source_audio_id: selectedVolcSessionDetail?.source_audio_id ?? null,
			};
			if (editingVolcSessionTodoIndex != null && nextTodos[editingVolcSessionTodoIndex]) {
				nextTodos[editingVolcSessionTodoIndex] = {
					...nextTodos[editingVolcSessionTodoIndex],
					...payload,
				};
			} else {
				nextTodos.push(payload);
			}
			const nextDraft = { ...volcSessionDraft, todos: nextTodos };
			setVolcSessionDraft(nextDraft);
			closeVolcSessionTodoModal();
			await persistVolcSessionDetail(nextDraft, '待办事项已保存');
		} catch (error: any) {
			if (!error?.errorFields) {
				message.error(error?.message || '保存会话待办失败');
			}
		}
	};

	const deleteVolcSessionTodo = async (index: number) => {
		const nextDraft = {
			...volcSessionDraft,
			todos: volcSessionDraft.todos.filter((_, idx) => idx !== index),
		};
		setVolcSessionDraft(nextDraft);
		await persistVolcSessionDetail(nextDraft, '待办事项已保存');
	};

	const volcSessionTodoColumns: ColumnsType<VolcSessionTodoItem> = [
		{
			title: '内容',
			dataIndex: 'content',
			ellipsis: true,
		},
		{
			title: '执行人',
			dataIndex: 'executor',
			width: 140,
			render: (value?: string | null) => value || '未指定',
		},
		{
			title: '执行时间',
			dataIndex: 'execution_time',
			width: 160,
			render: (value?: string | null) => value || '未指定',
		},
		{
			title: '操作',
			width: 160,
			render: (_, __, index) => (
				<Space>
					<Button type="link" onClick={() => openVolcSessionTodoModal(index)}>
						编辑
					</Button>
					<Button type="link" danger onClick={() => void deleteVolcSessionTodo(index)}>
						删除
					</Button>
				</Space>
			),
		},
	];

	const volcSessionColumns: ColumnsType<VolcMeetingMinutesSession> = [
		{
			title: '会话编号',
			dataIndex: 'session_no',
			width: 300,
			render: (value?: string | null, record?) => (
				<Space size={6}>
					<span>{value || '—'}</span>
					{record?.id === latestVolcSessionId ? <Tag color="gold">最新</Tag> : null}
				</Space>
			),
		},
		{
			title: '创建时间',
			dataIndex: 'created_at',
			width: 170,
			render: (value: string) => formatShanghaiTime(value, 'YYYY-MM-DD HH:mm:ss'),
		},
		{
			title: '状态',
			dataIndex: 'status',
			width: 120,
			render: (value?: string, record?) => {
				const { color, label } = getSessionListFinalStatus(value);
				const tag = <Tag color={color}>{label}</Tag>;
				if (record?.error_msg) {
					return <Tooltip title={resolveVolcErrorMessage(record.error_msg)}>{tag}</Tooltip>;
				}
				return tag;
			},
		},
		{
			title: '来源音频',
			dataIndex: 'source_audio_id',
			width: 100,
			render: (value?: number | null) => value ?? '—',
		},
		{
			title: '操作',
			dataIndex: 'actions',
			width: 180,
			render: (_, record) => (
				<Space size={0} onClick={(event) => event.stopPropagation()}>
					<Button
						type="link"
						onClick={(event) => {
							event.stopPropagation();
							void handleDownloadVolcSessionAudio(record.source_audio_id);
						}}
					>
						下载录音
					</Button>
					<Popconfirm
						title="确定删除该会话历史？"
						description="删除后无法恢复。"
						okText="确认删除"
						cancelText="取消"
						onConfirm={() => handleDeleteVolcSession(record.id)}
					>
						<Button
							type="link"
							danger
							onClick={(event) => {
								event.stopPropagation();
							}}
						>
							删除
						</Button>
					</Popconfirm>
				</Space>
			),
		},
	];

	const formatSegmentTime = (ms?: number | null) => {
		if (typeof ms !== 'number') return null;
		const seconds = Math.floor(ms / 1000);
		const m = String(Math.floor(seconds / 60)).padStart(2, '0');
		const s = String(seconds % 60).padStart(2, '0');
		return `${m}:${s}`;
	};

	const renderSpeakerSegments = (segments: SpeakerSegment[]) => {
		const palette = ['blue', 'green', 'gold', 'magenta', 'purple', 'cyan', 'volcano'];
		const speakerOrder: string[] = [];
		const getColor = (speaker: string) => {
			let idx = speakerOrder.indexOf(speaker);
			if (idx < 0) {
				speakerOrder.push(speaker);
				idx = speakerOrder.length - 1;
			}
			return palette[idx % palette.length];
		};

		return (
			<div style={{ maxHeight: 420, overflow: 'auto', paddingRight: 8 }}>
				{segments.map((seg, idx) => {
					const start = formatSegmentTime(seg.start_ms);
					const end = formatSegmentTime(seg.end_ms);
					const time = start || end ? `${start || '--:--'} - ${end || '--:--'}` : null;
					return (
						<div key={`${idx}-${seg.speaker}-${seg.start_ms ?? ''}-${seg.end_ms ?? ''}`} style={{ marginBottom: 12 }}>
							<Space align="start">
								<Tag color={getColor(seg.speaker)}>{seg.speaker}</Tag>
								<div style={{ flex: 1 }}>
									<Text>{seg.text}</Text>
									{time && (
										<div>
											<Text type="secondary">{time}</Text>
										</div>
									)}
								</div>
							</Space>
						</div>
					);
				})}
			</div>
		);
	};

	const volcMinutesStatusLabel: Record<string, string> = {
		completed: '已完成',
		succeeded: '已完成',
		success: '已完成',
		finished: '已完成',
		cancelled: '已取消',
		canceled: '已取消',
		queued: '等待中',
		failed: '失败',
		error: '失败',
		processing: '处理中',
		submitted: '处理中',
		running: '运行中',
		pending: '等待中',
		uploaded: '已上传',
	};

	const volcStreamStatusLabel: Record<string, string> = {
		idle: '空闲',
		live_connecting: '连接中（WS）',
		live_streaming: '实时录音中（WS）',
		live_stopping: '正在保存并上传录音。',
		live_saving: '保存音频中…',
		live_uploading: '上传音频中…',
		file_streaming: '流式转写中（SSE）',
		completed: '已完成',
		error: '失败',
	};
	const stableVolcMinutesStatus = getVolcMinutesJobStatus(volcMinutes, volcMinutesStatus?.status);
	const volcStatusLower = normalizeStatus(stableVolcMinutesStatus);
	const showVolcMinutesStatus = !!stableVolcMinutesStatus || !!volcMinutesStatus?.error;
	const volcUploadGenerating =
		volcInputMode === 'upload' &&
		(submittingVolcMinutes || isVolcInProgressStatus(volcStatusLower));
	const localStatusLower = normalizeStatus(localMinutesStatus?.status);
	const localMinutesGenerating =
		!isLocalFinalCompleted &&
		(
			transcribingLocalAudio ||
			generatingLocalMinutes ||
			isLocalSubmitInProgressStatus(localStatusLower)
		);
	const localLiveBusy =
		localStreamType === 'live_streaming' ||
		localStreamType === 'live_connecting' ||
		localStreamType === 'live_stopping' ||
		localStreamType === 'live_saving' ||
		localStreamType === 'live_uploading' ||
		localStreamType === 'file_streaming';
	const localEntryButtonsBusy = localLiveBusy || localMinutesGenerating;
	const localCancelActionLabel = transcribingLocalAudio ? '结束当前处理' : '结束当前生成';
	const canCancelLocalProcessing =
		localMinutesGenerating &&
		(activeLocalProcessingAsrSessionId != null || localStreamSessionId != null || localMinutes?.asr_session_id != null);
	// 仅在“未最终完成”且“仍在处理中”时禁用入口按钮，避免完成后状态滞留导致按钮长期灰置。
	const volcMinutesGenerating =
		!isVolcFinalCompleted &&
		(submittingVolcMinutes || isVolcInProgressStatus(volcStatusLower));
	const volcLiveBusy =
		volcStreamType === 'live_streaming' ||
		volcStreamType === 'live_connecting' ||
		volcStreamType === 'live_stopping' ||
		volcStreamType === 'live_saving' ||
		volcStreamType === 'live_uploading';
	const volcEntryButtonsBusy = volcLiveBusy || volcMinutesGenerating;
	const canCancelVolcMinutes = volcMinutesGenerating;

	const getSessionStatusColor = (status?: string): string => {
		const normalized = String(status ?? '').toLowerCase();
		const isSuccess =
			normalized === 'completed' ||
			normalized === 'finished' ||
			normalized === 'success' ||
			normalized === 'succeeded' ||
			status === '已完成';
		if (isSuccess) {
			return 'green';
		}
		return 'red';
	};

	const getSessionStatusLabel = (status: string | undefined): string => {
		const normalized = String(status ?? '').toLowerCase();
		const isSuccess =
			normalized === 'completed' ||
			normalized === 'finished' ||
			normalized === 'success' ||
			normalized === 'succeeded' ||
			status === '已完成';
		return isSuccess ? '已完成' : '失败';
	};

	const getSessionListFinalStatus = (status?: string) => {
		const normalized = String(status ?? '').toLowerCase();
		const isSuccess =
			normalized === 'completed' ||
			normalized === 'finished' ||
			normalized === 'success' ||
			normalized === 'succeeded' ||
			status === '已完成';
		return {
			label: isSuccess ? '已完成' : '失败',
			color: isSuccess ? 'green' : 'red',
		};
	};

	const renderHeaderActions = () => (
		<Row gutter={[16, 16]} align="middle">
			<Col xs={24} lg={isSessionsRoute ? 24 : 12}>
				<Space size="large" wrap>
					<Space>
						<Text strong>选择会议：</Text>
						<Select<number>
							placeholder="请选择会议"
							style={{ minWidth: 260 }}
							loading={loadingMeetings}
							showSearch
							optionFilterProp="label"
							value={selectedMeetingId}
							onChange={(value) => {
								void handleMeetingChange(value);
							}}
							options={meetings.map((meeting) => ({
								value: meeting.id,
								label: `${meeting.title}（${formatShanghaiTime(meeting.date, 'MM-DD HH:mm')}）`,
							}))}
						/>
					</Space>
					{isSessionsRoute ? (
						<Space>
							<Text strong>会话来源：</Text>
							<Button.Group>
								<Button type={sessionHistoryMode === 'local' ? 'primary' : 'default'} onClick={() => setSessionHistoryMode('local')}>
									{MINUTES_MODE_LABEL.local}
								</Button>
								<Button type={sessionHistoryMode === 'volc' ? 'primary' : 'default'} onClick={() => setSessionHistoryMode('volc')}>
									{MINUTES_MODE_LABEL.volc}
								</Button>
							</Button.Group>
						</Space>
					) : (
						<Space>
							<Text strong>纪要模式：</Text>
							<Button.Group>
								<Button type={minutesMode === 'local' ? 'primary' : 'default'} onClick={() => void handleMinutesModeChange('local')}>
									{MINUTES_MODE_LABEL.local}
								</Button>
								<Button type={minutesMode === 'volc' ? 'primary' : 'default'} onClick={() => void handleMinutesModeChange('volc')}>
									{MINUTES_MODE_LABEL.volc}
								</Button>
							</Button.Group>
						</Space>
					)}
				</Space>
			</Col>
			{!isSessionsRoute && (
				<Col xs={24} lg={12}>
					{minutesMode === 'local' ? (
						<Space style={{ width: '100%', justifyContent: 'flex-end' }} wrap>
							<Button
								icon={<AudioOutlined />}
								onClick={() => void startLocalLiveRecording()}
								disabled={
									!hasSelectedMeeting ||
									localEntryButtonsBusy
								}
							>
								{localEntryButtonsBusy ? '录音/处理中…' : '在线录音'}
							</Button>
							<Button
								icon={<UnorderedListOutlined />}
								disabled={!hasSelectedMeeting || localEntryButtonsBusy}
								onClick={openLocalAudiosModal}
							>
								管理本地音频
							</Button>
							<Button icon={<ReloadOutlined />} disabled={!hasSelectedMeeting || localEntryButtonsBusy} onClick={() => void handleResetLocalWorkspace()}>
								重置
							</Button>
						</Space>
					) : (
						<Space style={{ width: '100%', justifyContent: 'flex-end' }} wrap>
							<Button
								icon={<AudioOutlined />}
								onClick={() => void startVolcLiveRecording()}
								disabled={
									!hasSelectedMeeting ||
									volcEntryButtonsBusy
								}
							>
								{volcEntryButtonsBusy ? '录音/处理中…' : '在线录音'}
							</Button>
							<Button
								icon={<UnorderedListOutlined />}
								disabled={
									!hasSelectedMeeting ||
									volcEntryButtonsBusy
								}
								onClick={openVolcAudiosModal}
							>
								查看已有音频
							</Button>
						<Button icon={<ReloadOutlined />} disabled={!hasSelectedMeeting} onClick={() => void handleResetVolcWorkspace()}>
							重置
						</Button>
						</Space>
					)}
				</Col>
			)}
		</Row>
	);

	const renderLocalMinutes = () => (
		<Spin spinning={loadingLocalMinutes}>
			{!selectedMeetingId ? (
				<Empty description="请选择一个会议以查看纪要" style={{ marginTop: 48 }} />
			) : (
				<>
					<Alert
						type="info"
						showIcon
						style={{ margin: '16px 0' }}
						message= "机密会议（Qwen3-ASR）"
						description="在线录音：边录边转写，停止后自动生成会议纪要。上传音频：可选择已有音频按分段逐步转写，完成后自动生成会议纪要。"
					/>

					{/* 第一步：实时出字 */}
					<div ref={localStreamCardRef}>
						<ProCard
							title="第一步：实时出字"
							style={{ marginBottom: 16 }}
							extra={
								<Space>
									{['live_streaming', 'live_connecting', 'live_stopping', 'live_saving', 'live_uploading'].includes(localStreamType) && (
										<Button
											danger
											disabled={['live_stopping', 'live_saving', 'live_uploading'].includes(localStreamType)}
											onClick={() => {
												setLocalStreamType('live_uploading');
												message.info('录音已停止，正在上传音频…');
												void stopLocalLiveWs(false);
											}}
										>
											停止录音
										</Button>
									)}
								</Space>
							}
						>
							<Space direction="vertical" style={{ width: '100%' }} size="middle">
								<Space wrap>
									<Tag color={localStreamType === 'error' ? 'red' : localStreamType === 'completed' ? 'green' : localStreamType === 'idle' ? 'default' : 'processing'}>
										{localStreamStatusLabel[localStreamType] || localStreamType}
									</Tag>
									{localStreamSessionId != null && (
										<Text type="secondary">session_id：{localStreamSessionId}</Text>
									)}
								</Space>
								{localStreamHint && !localStreamError && <Alert type="info" showIcon message={localStreamHint} />}
								{localStreamError && <Alert type="error" showIcon message={localStreamError} />}
								{localInputMode === 'upload' && localStreamProgressPercent != null && !localStreamError && (
									<Progress
										percent={localStreamProgressPercent}
										size="small"
										status={localStreamType === 'completed' ? 'success' : 'active'}
									/>
								)}
								<TextArea
									rows={8}
									value={localStreamText}
									placeholder="开始在线录音或提交已有音频后，这里会逐步输出识别文本…"
									readOnly
								/>
								<Text type="secondary">
									在线录音与已有音频分段转写都会在这里逐步显示识别文本，完成后自动调用大模型生成摘要与待办事项。
								</Text>
							</Space>
						</ProCard>
					</div>

					{/* 第二步：AI 生成结果 */}
					<ProCard title="第二步：AI生成纪要结果（只读）">
						<Space direction="vertical" style={{ width: '100%' }} size="middle">
							{showLocalMinutesStatus && localMinutesStatus && (
								<Alert
									showIcon
									type={localMinutesStatus?.error ? 'error' : 'info'}
									message={`纪要状态：${localMinutesStatusLabel[String(localMinutesStatus.status ?? '').toLowerCase()] || localMinutesStatus.status || '—'}`}
									description={localMinutesStatus.error ? <Text type="danger">错误：{localMinutesStatus.error}</Text> : undefined}
								/>
							)}
							{localMinutesGenerating && (
								<Alert
									type="info"
									showIcon
									message="当前任务已提交到后台处理。离开当前页面不会中断生成。"
									description="你可以稍后返回本页，或前往“会话历史”查看生成结果。"
									action={canCancelLocalProcessing ? (
										<Button
											size="small"
											danger
											loading={cancelingLocalProcessing}
											onClick={handleCancelLocalProcessing}
										>
											{localCancelActionLabel}
										</Button>
									) : undefined}
								/>
							)}
							<Alert
								type="info"
								showIcon
								message="当前主视图仅用于查看生成结果。若需修订摘要或待办，请前往“会话历史”。"
							/>

							{/* 会议摘要 */}
							<ProCard title="会议摘要" style={{ marginBottom: 16 }}>
								<Space direction="vertical" style={{ width: '100%' }} size="middle">
									<Input
										placeholder="暂无摘要标题"
										value={localSummaryTitle}
										readOnly
									/>
									{localSummaryDraft ? (
										<div
											style={{
												minHeight: 240,
												padding: '12px 16px',
												border: '1px solid #d9d9d9',
												borderRadius: 6,
												background: '#fafafa',
												lineHeight: 1.85,
												fontSize: 14,
											}}
										>
											{renderSimpleMarkdown(localSummaryDraft)}
										</div>
									) : (
										<Text type="secondary">暂无摘要内容；如需修订请前往“会话历史”。</Text>
									)}
								</Space>
							</ProCard>

							{/* 待办事项 */}
							<ProCard title="待办事项">
								<Table<LocalMeetingTodo>
									rowKey="id"
									dataSource={localMinutes?.todos || []}
									columns={localTodoColumns}
									pagination={false}
									size="small"
									locale={{ emptyText: '暂无待办事项' }}
								/>
							</ProCard>
						</Space>
					</ProCard>
				</>
			)}
		</Spin>
	);

	const renderVolcMinutes = () => (
		<Spin spinning={loadingVolcMinutes}>
			{!selectedMeetingId ? (
				<Empty description="请选择一个会议以查看纪要" style={{ marginTop: 48 }} />
			) : (
				<>
					<Alert
						type="info"
						showIcon
						style={{ margin: '16px 0' }}
						message={MINUTES_MODE_LABEL.volc}
						description="在线录音：边录边转写，停止后自动生成会议纪要。查看已有音频：选择或上传音频后点击「生成会议纪要」，生成结果将在主视图只读展示，修订请前往“会话历史”。"
					/>

					<div ref={volcStreamCardRef}>
					<ProCard
						title="第一步：实时出字"
						style={{ marginBottom: 16 }}
						extra={
							<Space>
								{(volcStreamType === 'live_streaming' || volcStreamType === 'live_connecting' || volcStreamType === 'live_stopping' || volcStreamType === 'live_saving' || volcStreamType === 'live_uploading') && (
									<Button
										danger
										disabled={volcStreamType === 'live_stopping' || volcStreamType === 'live_saving' || volcStreamType === 'live_uploading'}
										onClick={() => {
											setVolcStreamType('live_stopping');
											message.info('录音已停止，正在保存并上传录音。');
											void stopVolcLiveWs(false);
										}}
									>
										停止录音
									</Button>
								)}
							</Space>
						}
					>
						{volcInputMode === 'upload' ? (
							<Space direction="vertical" style={{ width: '100%' }} size="small">
								<Tag color="default">无</Tag>
								<Text type="secondary">上传音频模式不经过实时出字，直接提交至AI生成纪要，生成精确内容。</Text>
							</Space>
						) : (
							<Space direction="vertical" style={{ width: '100%' }} size="middle">
								<Space wrap>
									<Tag color={volcStreamType === 'error' ? 'red' : volcStreamType === 'completed' ? 'green' : volcStreamType === 'idle' ? 'default' : 'processing'}>
										{volcStreamStatusLabel[volcStreamType] || volcStreamType}
									</Tag>
								</Space>
								{volcStreamError && <Alert type="error" showIcon message={volcStreamError} />}
								<TextArea
									rows={8}
									value={volcStreamText}
									placeholder="开始在线录音后，这里会实时输出识别文本。"
									readOnly
								/>
								<Text type="secondary">实时出字仅用于实时展示，录音结束后自动提交至AI生成纪要，生成精确转写、摘要与待办。</Text>
							</Space>
						)}
					</ProCard>
					</div>

					<ProCard title="第二步：AI生成纪要结果（只读）">
						<Space direction="vertical" style={{ width: '100%' }} size="middle">
						{showVolcMinutesStatus && (
							<Alert
								showIcon
								type={volcMinutesStatus?.error ? 'error' : 'info'}
								message={`纪要状态：${volcMinutesStatusLabel[String(stableVolcMinutesStatus ?? '').toLowerCase()] || stableVolcMinutesStatus || '—'}`}
								description={volcMinutesStatus.error ? <Text type="danger">错误：{resolveVolcErrorMessage(volcMinutesStatus.error)}</Text> : undefined}
							/>
						)}
						{volcMinutesGenerating && (
							<Alert
								type="info"
								showIcon
								message="当前任务已提交到后台处理。离开当前页面不会中断生成。"
								description="你可以稍后返回本页，或前往“会话历史”查看生成结果。"
								action={
									canCancelVolcMinutes ? (
										<Button
											size="small"
											danger
											loading={cancelingVolcMinutes}
											onClick={handleCancelVolcMinutes}
										>
											结束当前生成
										</Button>
									) : undefined
								}
							/>
						)}
						<Alert
							type="info"
							showIcon
							message="当前主视图仅用于查看生成结果。若需修订精确转写、摘要或待办，请前往“会话历史”。"
						/>

						<ProCard title="精确转写" style={{ marginBottom: 16 }}>
							<Space direction="vertical" style={{ width: '100%' }} size="small">
								<TextArea
									rows={14}
									placeholder={`${MINUTES_MODE_LABEL.volc}生成完成后将在此显示精确转写内容。`}
									value={volcTranscriptDraft}
									readOnly
								/>
								<Text type="secondary">
									实时出字仅作实时预览；生成纪要后得到带说话人的精确转写，主视图只读展示。
								</Text>
							</Space>
						</ProCard>

						{/* 会议摘要：始终显示 */}
						<ProCard
							title="会议摘要"
							style={{ marginBottom: 16 }}
						>
							<Space direction="vertical" style={{ width: '100%' }} size="middle">
								<Input
									placeholder="暂无摘要标题"
									value={volcSummaryTitle}
									readOnly
								/>
								{/* 摘要正文预览 */}
								{volcSummaryDraft ? (
									<div
										style={{
											minHeight: 240,
											padding: '12px 16px',
											border: '1px solid #d9d9d9',
											borderRadius: 6,
											background: '#fafafa',
											lineHeight: 1.85,
											fontSize: 14,
										}}
									>
										{renderSimpleMarkdown(volcSummaryDraft)}
									</div>
								) : (
									<Text type="secondary">暂无摘要内容；如需修订请前往“会话历史”。</Text>
								)}
							</Space>
						</ProCard>

							<ProCard title="待办事项">
								<Table<VolcMeetingTodo>
									rowKey="id"
									dataSource={volcMinutes?.todos || []}
									columns={volcTodoColumns}
									pagination={false}
									size="small"
									locale={{ emptyText: '暂无待办事项' }}
								/>
							</ProCard>
						</Space>
					</ProCard>
				</>
			)}
		</Spin>
	);

	const renderSessionsOverview = () => (
		<Space direction="vertical" style={{ width: '100%' }} size="middle">
			<Alert
				type="info"
				showIcon
				style={{ margin: '16px 0' }}
				message="会话历史"
				description="切换来源可查看对应会话明细，并支持在详情中编辑保存。"
			/>

			{sessionHistoryMode === 'volc' ? (
				<Space direction="vertical" style={{ width: '100%' }} size={4}>
					<Table<VolcMeetingMinutesSession>
						rowKey="id"
						size="small"
						dataSource={volcSessionList}
						columns={volcSessionColumns}
						loading={loadingVolcSessions}
						pagination={{ pageSize: 8, hideOnSinglePage: true }}
						locale={{ emptyText: '暂无会话历史' }}
						rowSelection={{
							type: 'radio',
							selectedRowKeys: selectedVolcSessionId ? [selectedVolcSessionId] : [],
							onChange: (keys) => {
								const [key] = keys;
								const parsed = typeof key === 'number' ? key : Number(key);
								if (!selectedMeetingId || Number.isNaN(parsed)) {
									setSelectedVolcSessionId(null);
									setSelectedVolcSessionDetail(null);
									return;
								}
								setSelectedVolcSessionId(parsed);
								void loadVolcSessionDetail(selectedMeetingId, parsed);
							},
						}}
						onRow={(record) => ({
							onClick: () => {
								if (!selectedMeetingId) return;
								setSelectedVolcSessionId(record.id);
								void loadVolcSessionDetail(selectedMeetingId, record.id);
							},
						})}
					/>

					<Spin spinning={loadingVolcSessionDetail} style={{ marginTop: 0 }}>
						{selectedVolcSessionDetail ? (
							<Space direction="vertical" style={{ width: '100%' }} size={10}>
								<ProCard title={`会话详情 ${selectedVolcSessionDetail.session_no || selectedVolcSessionDetail.id}`}>
									<Space wrap>
										<Tag color={getSessionStatusColor(selectedVolcSessionDetail.status)}>
											状态：{getSessionStatusLabel(selectedVolcSessionDetail.status)}
										</Tag>
										<Tag>音频ID：{selectedVolcSessionDetail.source_audio_id ?? '—'}</Tag>
										<Text type="secondary">
											创建于：{formatShanghaiTime(selectedVolcSessionDetail.created_at, 'YYYY-MM-DD HH:mm:ss')}
										</Text>
									</Space>
									{selectedVolcSessionDetail.error_msg ? (
										<Alert
											type="error"
											showIcon
											style={{ marginTop: 12 }}
											message={`处理错误：${resolveVolcErrorMessage(selectedVolcSessionDetail.error_msg)}`}
										/>
									) : null}
								</ProCard>

								<ProCard title="实时转写">
									{volcSessionDraft.stream_transcript_text ? (
										<TextArea
											rows={6}
											value={volcSessionDraft.stream_transcript_text}
											onChange={(e) => setVolcSessionDraft((prev) => ({ ...prev, stream_transcript_text: e.target.value }))}
											placeholder="实时转写内容"
										/>
									) : (
										<Space direction="vertical" style={{ width: '100%' }}>
											<Tag color="default">无</Tag>
											<Text type="secondary">
												基于已有音频生成会议纪要时，该栏为空属于正常情况，无需填写。
											</Text>
										</Space>
									)}
								</ProCard>

								{(() => {
									return (
										<ProCard
											title="精确转写"
											extra={
												<Button
													type="link"
													onClick={handleSaveVolcSessionDetail}
													loading={savingVolcSessionDetail}
													disabled={!selectedVolcSessionId}
												>
													保存转写
												</Button>
											}
										>
											<Space direction="vertical" style={{ width: '100%' }} size="small">
												<TextArea
													rows={14}
													value={volcSessionDraft.transcript_text}
													onChange={(e) => setVolcSessionDraft((prev) => ({ ...prev, transcript_text: e.target.value }))}
													placeholder={`${MINUTES_MODE_LABEL.volc}刷新成功后将在此显示精确转写内容。`}
												/>
												<Text type="secondary">
													实时出字仅作实时预览；生成纪要后得到带说话人的精确转写，可在此修订并保存。
												</Text>
											</Space>
										</ProCard>
									);
								})()}

								{renderVolcSessionSummaryCard()}

								<ProCard
									title="待办事项"
									extra={
										<Button type="link" icon={<PlusOutlined />} onClick={() => openVolcSessionTodoModal()}>
											新增待办
										</Button>
									}
								>
									<Table<VolcSessionTodoItem>
										rowKey={(record) =>
											`${record.source_audio_id ?? 'none'}-${record.content}-${record.executor ?? ''}-${record.execution_time ?? ''}`
										}
										dataSource={volcSessionDraft.todos || []}
										columns={volcSessionTodoColumns}
										pagination={false}
										size="small"
										locale={{ emptyText: '暂无待办事项' }}
									/>
								</ProCard>
							</Space>
						) : (
							<Empty description="请选择一个会话查看详情" />
						)}
					</Spin>
				</Space>
			) : (
				<Space direction="vertical" style={{ width: '100%' }} size={4}>
					<Table<LocalMeetingMinutesSession>
						rowKey="id"
						size="small"
						dataSource={localSessionList}
						columns={localSessionColumns}
						loading={loadingLocalSessions}
						pagination={{ pageSize: 8, hideOnSinglePage: true }}
						locale={{ emptyText: '暂无会话历史' }}
						rowSelection={{
							type: 'radio',
							selectedRowKeys: selectedLocalSessionId ? [selectedLocalSessionId] : [],
							onChange: (keys) => {
								const [key] = keys;
								const parsed = typeof key === 'number' ? key : Number(key);
								if (!selectedMeetingId || Number.isNaN(parsed)) {
									setSelectedLocalSessionId(null);
									setSelectedLocalSessionDetail(null);
									return;
								}
								setSelectedLocalSessionId(parsed);
								void loadLocalSessionDetail(selectedMeetingId, parsed);
							},
						}}
						onRow={(record) => ({
							onClick: () => {
								if (!selectedMeetingId) return;
								setSelectedLocalSessionId(record.id);
								void loadLocalSessionDetail(selectedMeetingId, record.id);
							},
						})}
					/>

					<Spin spinning={loadingLocalSessionDetail} style={{ marginTop: 0 }}>
						{selectedLocalSessionDetail ? (
							<Space direction="vertical" style={{ width: '100%' }} size={10}>
								<ProCard title={`会话详情 ${selectedLocalSessionDetail.session_no || selectedLocalSessionDetail.id}`}>
									<Space wrap>
										<Tag color={getSessionStatusColor(selectedLocalSessionDetail.status)}>
											状态：{getSessionStatusLabel(selectedLocalSessionDetail.status)}
										</Tag>
										<Tag>音频ID：{selectedLocalSessionDetail.source_audio_id ?? '—'}</Tag>
										<Text type="secondary">
											创建于：{formatShanghaiTime(selectedLocalSessionDetail.created_at, 'YYYY-MM-DD HH:mm:ss')}
										</Text>
									</Space>
									{selectedLocalSessionDetail.error_msg ? (
										<Alert
											type="error"
											showIcon
											style={{ marginTop: 12 }}
											message={`处理错误：${selectedLocalSessionDetail.error_msg}`}
										/>
									) : null}
								</ProCard>

								<ProCard title="实时转写">
									<TextArea
										rows={6}
										value={localSessionDraft.stream_transcript_text}
										onChange={(e) => setLocalSessionDraft((prev) => ({ ...prev, stream_transcript_text: e.target.value }))}
										placeholder="实时转写内容"
										readOnly={!localSessionEditable}
									/>
								</ProCard>

								{renderLocalSessionSummaryCard()}

								<ProCard
									title="待办事项"
									extra={
										<Button type="link" icon={<PlusOutlined />} disabled={!localSessionEditable} onClick={() => openLocalSessionTodoModal()}>
											新增待办
										</Button>
									}
								>
									<Table<LocalSessionTodoItem>
										rowKey={(record, idx) => `${idx}-${record.content}-${record.executor ?? ''}-${record.execution_time ?? ''}`}
										dataSource={localSessionDraft.todos || []}
										columns={localSessionTodoColumns}
										pagination={false}
										size="small"
										locale={{ emptyText: '暂无待办事项' }}
									/>
								</ProCard>
							</Space>
						) : (
							<Empty description="请选择一个会话查看详情" />
						)}
					</Spin>
				</Space>
			)}
		</Space>
	);

	return (
		<PageContainer>
			<ProCard ghost>{renderHeaderActions()}{isSessionsRoute ? renderSessionsOverview() : (minutesMode === 'local' ? renderLocalMinutes() : renderVolcMinutes())}</ProCard>

			<Modal
				title="生成结构化会议纪要"
				open={generateModalVisible}
				onCancel={() => setGenerateModalVisible(false)}
				onOk={handleGenerate}
				okText="开始生成"
				okButtonProps={{ loading: generating, disabled: !selectedMeetingId }}
				width={720}
			>
				{renderGenerateContent()}
			</Modal>

			<Modal
				title={editingAction ? '编辑行动项' : '新增行动项'}
				open={actionModalVisible}
				onCancel={() => setActionModalVisible(false)}
				onOk={submitActionItem}
				okButtonProps={{ disabled: !selectedMeetingId }}
				destroyOnClose
			>
				<Form<ActionFormValues> form={actionForm} layout="vertical">
					<Form.Item name="description" label="行动内容" rules={[{ required: true, message: '请填写行动项内容' }]}>
						<TextArea rows={3} placeholder="例如：收集下周产品发布所需素材" />
					</Form.Item>
					<Form.Item name="owner" label="负责人">
						<Input placeholder="请输入负责人" />
					</Form.Item>
					<Form.Item name="due_date" label="截止日期">
						<DatePicker style={{ width: '100%' }} />
					</Form.Item>
					<Form.Item name="status" label="状态">
						<Select
							options={actionStatusOptions.map((item) => ({
								label: item.label,
								value: item.value,
							}))}
						/>
					</Form.Item>
				</Form>
			</Modal>

			<Modal
				title={editingDecision ? '编辑决策事项' : '新增决策事项'}
				open={decisionModalVisible}
				onCancel={() => setDecisionModalVisible(false)}
				onOk={submitDecision}
				okButtonProps={{ disabled: !selectedMeetingId }}
				destroyOnClose
			>
				<Form<DecisionFormValues> form={decisionForm} layout="vertical">
					<Form.Item name="description" label="决策内容" rules={[{ required: true, message: '请填写决策内容' }]}>
						<TextArea rows={4} placeholder="例如：优先推进 A 项目的上线排期" />
					</Form.Item>
				</Form>
			</Modal>

			<Modal
				title={editingVolcTodo ? '编辑火山待办' : '新增火山待办'}
				open={volcTodoModalVisible}
				onCancel={handleCloseVolcTodoModal}
				onOk={submitVolcTodo}
				okButtonProps={{ disabled: !selectedMeetingId, loading: savingVolcTodo }}
				destroyOnClose
			>
				<Form<VolcTodoFormValues> form={volcTodoForm} layout="vertical">
					<Form.Item name="content" label="待办内容" rules={[{ required: true, message: '请填写待办内容' }]}>
						<TextArea rows={3} placeholder="请输入待办事项内容" />
					</Form.Item>
					<Form.Item name="executor" label="执行人">
						<Input placeholder="请输入执行人（可选）" />
					</Form.Item>
					<Form.Item name="execution_time" label="执行时间">
						<Input placeholder="请输入执行时间，例如 2024-01-01" />
					</Form.Item>
				</Form>
			</Modal>

			<Modal
				title={recordingTarget === 'volc' ? '在线录音（火山模式）' : '在线录音'}
				open={recordingModalVisible}
				onCancel={() => {
					setRecordingModalVisible(false);
					stopRecording();
					resetRecordingState();
				}}
				footer={[
					<Button
						key="cancel"
						onClick={() => {
							setRecordingModalVisible(false);
							stopRecording();
							resetRecordingState();
						}}
					>
						关闭
					</Button>,
					<Button
						key="start"
						type={recording ? 'default' : 'primary'}
						danger={recording && !isPaused}
						icon={!recording ? <AudioOutlined /> : isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
						onClick={() => {
							if (!recording) {
								startRecording();
							} else if (isPaused) {
								resumeRecording();
							} else {
								pauseRecording();
							}
						}}
					>
						{!recording ? '开始录音' : isPaused ? '继续录音' : '暂停录音'}
					</Button>,
					recording && (
						<Button key="stop" danger onClick={stopRecording}>
							停止录音
						</Button>
					),
					<Button
						key="upload"
						type="primary"
						loading={recordingUploading}
						onClick={uploadRecording}
						disabled={recordingUploading || recording || !hasRecordingData}
					>
						上传录音
					</Button>,
				]}
			>
				<Space direction="vertical" style={{ width: '100%' }} size="large">
					<Text>录音时长：{dayjs.duration(recordingDuration, 'seconds').format('mm:ss')}</Text>
					{recording && <Alert message="录音进行中" type="info" showIcon />}
					{recordingError && <Alert type="error" message={recordingError} showIcon />}
					<Text type="secondary">
						录音会根据选择的模式保存到本地/火山音频列表。录完后请停止录音再上传。
					</Text>
				</Space>
			</Modal>

			<Modal
				title={uploadAudioTarget === 'volc' ? '上传火山模式录音' : '上传会议录音'}
				open={uploadAudioModalVisible}
				onCancel={() => setUploadAudioModalVisible(false)}
				footer={null}
			>
				<Upload.Dragger
					multiple
					accept="audio/*"
					customRequest={handleAudioUpload}
					showUploadList
					disabled={!hasSelectedMeeting}
				>
					<p className="ant-upload-drag-icon">
						<AudioOutlined />
					</p>
					<p className="ant-upload-text">点击或拖拽音频文件到此处上传</p>
					<p className="ant-upload-hint">支持 mp3、wav、m4a 等常见音频格式</p>
				</Upload.Dragger>
			</Modal>

			<Modal
				title="上传会议资料"
				open={uploadFileModalVisible}
				onCancel={() => setUploadFileModalVisible(false)}
				footer={null}
			>
				<Upload.Dragger
					multiple
					accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
					customRequest={handleFileUpload}
					showUploadList
					disabled={!hasSelectedMeeting}
					style={{ padding: '24px 0' }}
				>
					<p className="ant-upload-drag-icon">
						<CloudUploadOutlined />
					</p>
					<p className="ant-upload-text">点击或拖拽会议相关文件到此处上传</p>
					<p className="ant-upload-hint">支持 PDF、Word、PPT、TXT 等常见文档格式</p>
				</Upload.Dragger>
			</Modal>

			<Modal
				title="实时录音（火山 WS）"
				open={volcLiveModalVisible}
				onCancel={() => {
					setVolcLiveModalVisible(false);
					void stopVolcLiveWs(true);
					resetVolcStreamState();
				}}
				footer={[
					<Button
						key="close"
						onClick={() => {
							setVolcLiveModalVisible(false);
							void stopVolcLiveWs(true);
							resetVolcStreamState();
						}}
					>
						关闭
					</Button>,
					<Button
						key="start"
						type="primary"
						disabled={!selectedMeetingId || volcStreamType === 'live_streaming' || volcStreamType === 'live_connecting' || volcStreamType === 'live_stopping' || volcStreamType === 'live_saving' || volcStreamType === 'live_uploading'}
						onClick={startVolcLiveRecording}
					>
						开始实时录音
					</Button>,
					<Button
						key="stop"
						danger
						disabled={volcStreamType !== 'live_streaming' && volcStreamType !== 'live_connecting'}
						onClick={() => {
							setVolcStreamType('live_stopping');
							message.info('录音已停止，正在保存并上传录音。');
							void stopVolcLiveWs(false);
						}}
					>
						停止并保存
					</Button>,
				]}
				width={820}
			>
				<Space direction="vertical" style={{ width: '100%' }} size="middle">
					<Space wrap>
						<Tag color={volcStreamType === 'error' ? 'red' : volcStreamType === 'completed' ? 'green' : 'processing'}>
							{volcStreamStatusLabel[volcStreamType] || volcStreamType}
						</Tag>
						<Text type="secondary">session_id：{volcStreamSessionId || '—'}</Text>
						<Text type="secondary">audio_id：{volcLatestAudioId || '—'}</Text>
					</Space>
					{volcStreamError && <Alert type="error" showIcon message={volcStreamError} />}
					<TextArea
						rows={10}
						value={volcStreamText}
						placeholder="连接成功后会实时推送 partial/final 文本；点击“停止并保存”后等待 completed 消息返回 audio_id。"
						readOnly
					/>
					<Text type="secondary">说明：实时录音会持续发送 16kHz/16-bit/单声道 PCM 二进制帧，服务端返回实时识别文本。</Text>
				</Space>
			</Modal>

			<Modal
				title="查看已有音频"
				open={volcAudiosModalVisible}
				onCancel={() => setVolcAudiosModalVisible(false)}
				footer={[
					<Button key="close" onClick={() => setVolcAudiosModalVisible(false)}>
						关闭
					</Button>,
					<Button
						key="generate"
						type="primary"
						icon={<ThunderboltOutlined />}
						disabled={!selectedVolcAudioId || submittingVolcMinutes || !selectedVolcAudioCanGenerate}
						loading={submittingVolcMinutes}
						onClick={async () => {
							if (!selectedVolcAudioId || !selectedMeetingId) return;
							if (!selectedVolcAudioCanGenerate) {
								message.warning('仅“已上传”的音频可生成会议纪要');
								return;
							}
							clearVolcMinutesDisplay();
							setVolcInputMode('upload');
							setVolcAudiosModalVisible(false);
							handleSubmitVolcMinutes(selectedVolcAudioId, 'existing_audio');
						}}
					>
						生成会议纪要
					</Button>,
				]}
				width={720}
			>
				<Space direction="vertical" style={{ width: '100%' }} size="middle">
				<Upload.Dragger
					multiple={false}
					accept="audio/*"
					beforeUpload={validateAudioUploadBeforeSelect}
					customRequest={handleUploadVolcMinutesAudio}
					showUploadList
						disabled={!hasSelectedMeeting || uploadingVolcMinutesAudio || volcAudios.length >= MAX_AUDIO_UPLOAD_COUNT}
					>
						<p className="ant-upload-drag-icon">
							<CloudUploadOutlined />
						</p>
						<p className="ant-upload-text">上传音频</p>
						<p className="ant-upload-hint">
							{volcAudios.length >= MAX_AUDIO_UPLOAD_COUNT
								? `已达到上限（${MAX_AUDIO_UPLOAD_COUNT}个），请先删除旧音频后再上传`
								: `仅“已上传”状态的音频可被选中并生成会议纪要`}
						</p>
					</Upload.Dragger>
					<Table<VolcMeetingAudio>
						rowKey="id"
						size="small"
						dataSource={volcAudios}
						columns={volcAudioColumns}
						pagination={false}
						loading={loadingVolcAudios}
						locale={{ emptyText: '暂无音频，请先上传' }}
						rowSelection={volcAudioRowSelection}
					/>
			</Space>
		</Modal>

		<Modal
			title={`会话历史（${MINUTES_MODE_LABEL.volc}）`}
			open={volcSessionsModalVisible}
			onCancel={closeVolcSessionsModal}
			width={1100}
			footer={[
				<Button key="refresh" icon={<ReloadOutlined />} onClick={() => selectedMeetingId && loadVolcSessions(selectedMeetingId, true)}>
					刷新
				</Button>,
				<Button key="close" onClick={closeVolcSessionsModal}>
					关闭
				</Button>,
			]}
		>
			<Space direction="vertical" style={{ width: '100%' }} size="middle">
				<Table<VolcMeetingMinutesSession>
					rowKey="id"
					size="small"
					dataSource={volcSessionList}
					columns={volcSessionColumns}
					loading={loadingVolcSessions}
					pagination={{ pageSize: 8, hideOnSinglePage: true }}
					locale={{ emptyText: '暂无会话历史' }}
					rowSelection={{
						type: 'radio',
						selectedRowKeys: selectedVolcSessionId ? [selectedVolcSessionId] : [],
						onChange: (keys) => {
							const [key] = keys;
							const parsed = typeof key === 'number' ? key : Number(key);
							if (!selectedMeetingId || Number.isNaN(parsed)) {
								setSelectedVolcSessionId(null);
								setSelectedVolcSessionDetail(null);
								return;
							}
							setSelectedVolcSessionId(parsed);
							void loadVolcSessionDetail(selectedMeetingId, parsed);
						},
					}}
					onRow={(record) => ({
						onClick: () => {
							if (!selectedMeetingId) return;
							setSelectedVolcSessionId(record.id);
							void loadVolcSessionDetail(selectedMeetingId, record.id);
						},
					})}
				/>

				<Spin spinning={loadingVolcSessionDetail}>
					{selectedVolcSessionDetail ? (
						<Space direction="vertical" style={{ width: '100%' }} size="middle">
							<ProCard title={`会话详情 ${selectedVolcSessionDetail.session_no || selectedVolcSessionDetail.id}`}>
								<Space wrap>
									<Tag color={getSessionStatusColor(selectedVolcSessionDetail.status)}>
										状态：{getSessionStatusLabel(selectedVolcSessionDetail.status)}
									</Tag>
									<Tag>音频ID：{selectedVolcSessionDetail.source_audio_id ?? '—'}</Tag>
									<Button
										type="link"
										size="small"
										onClick={() => void handleDownloadVolcSessionAudio(selectedVolcSessionDetail.source_audio_id)}
									>
										下载录音
									</Button>
									<Text type="secondary">
										创建于：{formatShanghaiTime(selectedVolcSessionDetail.created_at, 'YYYY-MM-DD HH:mm:ss')}
									</Text>
								</Space>
								{selectedVolcSessionDetail.error_msg ? (
									<Alert
										type="error"
										showIcon
										style={{ marginTop: 12 }}
										message={`处理错误：${resolveVolcErrorMessage(selectedVolcSessionDetail.error_msg)}`}
									/>
								) : null}
							</ProCard>

							<ProCard title="实时转写">
								{volcSessionDraft.stream_transcript_text ? (
									<TextArea
										rows={6}
										value={volcSessionDraft.stream_transcript_text}
										onChange={(e) => setVolcSessionDraft((prev) => ({ ...prev, stream_transcript_text: e.target.value }))}
										placeholder="实时转写内容"
									/>
								) : (
									<Space direction="vertical" style={{ width: '100%' }}>
										<Tag color="default">无</Tag>
										<Text type="secondary">
											基于已有音频生成会议纪要时，该栏为空属于正常情况，无需填写。
										</Text>
									</Space>
								)}
							</ProCard>

							{(() => {
								return (
									<ProCard
										title="精确转写"
										extra={
											<Button
												type="link"
												onClick={handleSaveVolcSessionDetail}
												loading={savingVolcSessionDetail}
												disabled={!selectedVolcSessionId}
											>
												保存转写
											</Button>
										}
									>
										<Space direction="vertical" style={{ width: '100%' }} size="small">
											<TextArea
												rows={14}
												value={volcSessionDraft.transcript_text}
												onChange={(e) => setVolcSessionDraft((prev) => ({ ...prev, transcript_text: e.target.value }))}
												placeholder={`${MINUTES_MODE_LABEL.volc}刷新成功后将在此显示精确转写内容。`}
											/>
											<Text type="secondary">
												实时出字仅作实时预览；生成纪要后得到带说话人的精确转写，可在此修订并保存。
											</Text>
										</Space>
									</ProCard>
								);
							})()}

							{renderVolcSessionSummaryCard()}

							<ProCard
								title="待办事项"
								extra={
									<Button type="link" icon={<PlusOutlined />} onClick={() => openVolcSessionTodoModal()}>
										新增待办
									</Button>
								}
							>
								<Table<VolcSessionTodoItem>
									rowKey={(record) =>
										`${record.source_audio_id ?? 'none'}-${record.content}-${record.executor ?? ''}-${record.execution_time ?? ''}`
									}
									dataSource={volcSessionDraft.todos || []}
									columns={volcSessionTodoColumns}
									pagination={false}
									size="small"
									locale={{ emptyText: '暂无待办事项' }}
								/>
							</ProCard>
						</Space>
					) : (
						<Empty description="请选择一个会话查看详情" />
					)}
				</Spin>
			</Space>
		</Modal>

		<Modal
			title={editingVolcSessionTodoIndex != null ? '编辑待办事项' : '新增待办事项'}
			open={volcSessionTodoModalVisible}
			onOk={submitVolcSessionTodo}
			onCancel={closeVolcSessionTodoModal}
			okText={editingVolcSessionTodoIndex != null ? '保存' : '新增'}
			cancelText="取消"
		>
			<Form<VolcTodoFormValues> form={volcSessionTodoForm} layout="vertical" style={{ marginTop: 16 }}>
				<Form.Item name="content" label="待办内容" rules={[{ required: true, message: '请输入待办内容' }]}>
					<TextArea rows={3} placeholder="请输入待办事项内容" />
				</Form.Item>
				<Form.Item name="executor" label="负责人">
					<Input placeholder="请输入负责人姓名" />
				</Form.Item>
				<Form.Item name="execution_time" label="截止时间">
					<Input placeholder="例如：2026-03-20 或 本周五前" />
				</Form.Item>
			</Form>
		</Modal>

		<Modal
			title={`会话历史（${MINUTES_MODE_LABEL.local}）`}
			open={localSessionsModalVisible}
			onCancel={closeLocalSessionsModal}
			width={1100}
			footer={[
				<Button key="refresh" icon={<ReloadOutlined />} onClick={() => selectedMeetingId && loadLocalSessions(selectedMeetingId, true)}>
					刷新
				</Button>,
				<Button key="close" onClick={closeLocalSessionsModal}>
					关闭
				</Button>,
			]}
		>
			<Space direction="vertical" style={{ width: '100%' }} size="middle">
				<Table<LocalMeetingMinutesSession>
					rowKey="id"
					size="small"
					dataSource={localSessionList}
					columns={localSessionColumns}
					loading={loadingLocalSessions}
					pagination={{ pageSize: 8, hideOnSinglePage: true }}
					locale={{ emptyText: '暂无会话历史' }}
					rowSelection={{
						type: 'radio',
						selectedRowKeys: selectedLocalSessionId ? [selectedLocalSessionId] : [],
						onChange: (keys) => {
							const [key] = keys;
							const parsed = typeof key === 'number' ? key : Number(key);
							if (!selectedMeetingId || Number.isNaN(parsed)) {
								setSelectedLocalSessionId(null);
								setSelectedLocalSessionDetail(null);
								return;
							}
							setSelectedLocalSessionId(parsed);
							void loadLocalSessionDetail(selectedMeetingId, parsed);
						},
					}}
					onRow={(record) => ({
						onClick: () => {
							if (!selectedMeetingId) return;
							setSelectedLocalSessionId(record.id);
							void loadLocalSessionDetail(selectedMeetingId, record.id);
						},
					})}
				/>

				<Spin spinning={loadingLocalSessionDetail}>
					{selectedLocalSessionDetail ? (
						<Space direction="vertical" style={{ width: '100%' }} size="middle">
							<ProCard title={`会话详情 ${selectedLocalSessionDetail.session_no || selectedLocalSessionDetail.id}`}>
								<Space wrap>
									<Tag color={getSessionStatusColor(selectedLocalSessionDetail.status)}>
										状态：{getSessionStatusLabel(selectedLocalSessionDetail.status)}
									</Tag>
									<Tag>音频ID：{selectedLocalSessionDetail.source_audio_id ?? '—'}</Tag>
									<Button
										type="link"
										size="small"
										onClick={() => void handleDownloadLocalSessionAudio(selectedLocalSessionDetail.source_audio_id)}
									>
										下载录音
									</Button>
									<Text type="secondary">
										创建于：{formatShanghaiTime(selectedLocalSessionDetail.created_at, 'YYYY-MM-DD HH:mm:ss')}
									</Text>
								</Space>
								{selectedLocalSessionDetail.error_msg ? (
									<Alert
										type="error"
										showIcon
										style={{ marginTop: 12 }}
										message={`处理错误：${selectedLocalSessionDetail.error_msg}`}
									/>
								) : null}
							</ProCard>

							<ProCard title="实时转写">
								<TextArea
									rows={6}
									value={localSessionDraft.stream_transcript_text}
									onChange={(e) => setLocalSessionDraft((prev) => ({ ...prev, stream_transcript_text: e.target.value }))}
									placeholder="实时转写内容"
									readOnly={!localSessionEditable}
								/>
							</ProCard>

							{renderLocalSessionSummaryCard()}

							<ProCard
								title="待办事项"
								extra={
									<Button type="link" icon={<PlusOutlined />} disabled={!localSessionEditable} onClick={() => openLocalSessionTodoModal()}>
										新增待办
									</Button>
								}
							>
								<Table<LocalSessionTodoItem>
									rowKey={(record, idx) => `${idx}-${record.content}-${record.executor ?? ''}-${record.execution_time ?? ''}`}
									dataSource={localSessionDraft.todos || []}
									columns={localSessionTodoColumns}
									pagination={false}
									size="small"
									locale={{ emptyText: '暂无待办事项' }}
								/>
							</ProCard>
						</Space>
					) : (
						<Empty description="请选择一个会话查看详情" />
					)}
				</Spin>
			</Space>
		</Modal>

		<Modal
			title={editingLocalSessionTodoIndex != null ? '编辑待办事项' : '新增待办事项'}
			open={localSessionTodoModalVisible}
			onOk={submitLocalSessionTodo}
			onCancel={closeLocalSessionTodoModal}
			okText={editingLocalSessionTodoIndex != null ? '保存' : '新增'}
			cancelText="取消"
		>
			<Form<LocalTodoFormValues> form={localSessionTodoForm} layout="vertical" style={{ marginTop: 16 }}>
				<Form.Item name="content" label="待办内容" rules={[{ required: true, message: '请输入待办内容' }]}>
					<TextArea rows={3} placeholder="请输入待办事项内容" />
				</Form.Item>
				<Form.Item name="executor" label="负责人">
					<Input placeholder="请输入负责人姓名" />
				</Form.Item>
				<Form.Item name="execution_time" label="截止时间">
					<Input placeholder="例如：2026-03-20 或 本周五前" />
				</Form.Item>
			</Form>
		</Modal>

		<Modal
			title="管理本地音频"
			open={localAudiosModalVisible}
			onCancel={() => setLocalAudiosModalVisible(false)}
			footer={[
				<Button key="close" onClick={() => setLocalAudiosModalVisible(false)}>
					关闭
				</Button>,
				<Button
					key="generate"
					type="primary"
					icon={<ThunderboltOutlined />}
					disabled={
						!selectedLocalAudioId ||
						localEntryButtonsBusy ||
						!selectedLocalAudioCanGenerate ||
						!hasSelectedMeeting
					}
					loading={localMinutesGenerating}
					onClick={() => {
						void handleGenerateLocalMinutesFromAudio(selectedLocalAudioId ?? undefined);
					}}
				>
					生成会议纪要
				</Button>,
			]}
			width={720}
		>
			<Space direction="vertical" style={{ width: '100%' }} size="middle">
				<Upload.Dragger
					multiple={false}
					accept="audio/*"
					beforeUpload={validateAudioUploadBeforeSelect}
					customRequest={handleUploadLocalMinutesAudio}
					showUploadList
					disabled={
						!hasSelectedMeeting ||
						uploadingLocalAudio ||
						localAudios.length >= MAX_AUDIO_UPLOAD_COUNT ||
						localEntryButtonsBusy
					}
				>
					<p className="ant-upload-drag-icon">
						<CloudUploadOutlined />
					</p>
					<p className="ant-upload-text">上传音频</p>
					<p className="ant-upload-hint">
						{localAudios.length >= MAX_AUDIO_UPLOAD_COUNT
							? `已达到上限（${MAX_AUDIO_UPLOAD_COUNT}个），请先删除旧音频后再上传`
							: '上传后可选中一条音频并点击「生成会议纪要」，系统会先完成转写，再自动生成摘要与待办。'}
					</p>
				</Upload.Dragger>
				<Table<LocalMeetingAudio>
					rowKey="id"
					size="small"
					dataSource={localAudios}
					columns={localAudioColumns}
					rowSelection={localAudioRowSelection}
					pagination={false}
					loading={loadingLocalAudios}
					locale={{ emptyText: '暂无音频，请先上传' }}
				/>
		</Space>
	</Modal>

		{/* ── 本地 AI：待办事项弹窗 ───────────────────────────── */}
		<Modal
			title={editingLocalTodo ? '编辑待办事项' : '新增待办事项'}
			open={localTodoModalVisible}
			onOk={submitLocalTodo}
			onCancel={handleCloseLocalTodoModal}
			okText={editingLocalTodo ? '保存' : '新增'}
			cancelText="取消"
		>
			<Form form={localTodoForm} layout="vertical" style={{ marginTop: 16 }}>
				<Form.Item name="content" label="待办内容" rules={[{ required: true, message: '请输入待办内容' }]}>
					<TextArea rows={3} placeholder="请输入待办事项内容" />
				</Form.Item>
				<Form.Item name="executor" label="负责人">
					<Input placeholder="请输入负责人姓名" />
				</Form.Item>
				<Form.Item name="execution_time" label="截止时间">
					<Input placeholder="例如：2026-03-20 或 本周五前" />
				</Form.Item>
			</Form>
		</Modal>
	</PageContainer>
	);
};

export default MeetingMinutes;
