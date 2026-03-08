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
dayjs.extend(duration);
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { history, useLocation } from '@umijs/max';
import meetingsApi, {
	type Meeting,
	type MeetingAudio,
	type MeetingFile,
	type VolcMeetingAudio,
} from '@/services/meetings';
import meetingMinutesApi, {
	type MeetingActionItem,
	type MeetingDecisionItem,
	type MeetingInsights,
	type SpeakerSegment,
	type VolcMeetingMinutes,
	type VolcMeetingTodo,
} from '@/services/meetingMinutes';
import { getToken } from '@/utils/auth';
import { downsampleBuffer, float32ToInt16PCM } from '@/utils/pcm';

const { TextArea } = Input;
const { Title, Text } = Typography;

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
		'idle' | 'live_connecting' | 'live_streaming' | 'file_streaming' | 'completed' | 'error'
	>('idle');
	const [volcStreamError, setVolcStreamError] = useState<string | null>(null);
	const [volcStreamSessionId, setVolcStreamSessionId] = useState<number | null>(null);
	// 'live' = 在线录音来源，'upload' = 上传音频来源（无流式转写步骤）
	const [volcInputMode, setVolcInputMode] = useState<'live' | 'upload'>('live');
	const [volcTranscriptDraft, setVolcTranscriptDraft] = useState('');
	const [savingVolcTranscript, setSavingVolcTranscript] = useState(false);
	const [volcMinutesStatus, setVolcMinutesStatus] = useState<{
		status?: string;
		task_id?: string;
		audio_id?: number;
		error?: string;
	} | null>(null);
	const [volcSummaryTitle, setVolcSummaryTitle] = useState('');
	const [volcSummaryDraft, setVolcSummaryDraft] = useState('');
	const [savingVolcSummary, setSavingVolcSummary] = useState(false);
	const [volcTodoModalVisible, setVolcTodoModalVisible] = useState(false);
	const [editingVolcTodo, setEditingVolcTodo] = useState<VolcMeetingTodo | null>(null);
	const [volcTodoForm] = Form.useForm<VolcTodoFormValues>();
	const [savingVolcTodo, setSavingVolcTodo] = useState(false);

	const meetingWsRef = useRef<WebSocket | null>(null);
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
	const volcStreamCardRef = useRef<HTMLDivElement | null>(null);
	// 记录当前激活的 meetingId 请求，用于竞态防护
	const loadingMeetingIdRef = useRef<number | null>(null);
	const hasSelectedMeeting = typeof selectedMeetingId === 'number';

	const queryMeetingId = useMemo(() => {
		const params = new URLSearchParams(location.search);
		const item = params.get('meetingId');
		if (!item) return undefined;
		const parsed = Number(item);
		return Number.isNaN(parsed) ? undefined : parsed;
	}, [location.search]);

	useEffect(() => {
		if (queryMeetingId) {
			setSelectedMeetingId(queryMeetingId);
		}
	}, [queryMeetingId]);

	const loadMeetings = async () => {
		setLoadingMeetings(true);
		try {
			const data = await meetingsApi.list();
			const sorted = [...data].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
			setMeetings(sorted);
			if (!queryMeetingId && !selectedMeetingId && sorted.length) {
				const firstId = sorted[0].id;
				setSelectedMeetingId(firstId);
				history.replace(`/meetings/minutes?meetingId=${firstId}`);
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

	const loadVolcMinutesData = useCallback(async (meetingId: number, showToast = false) => {
		// 竞态保护：记录本次请求对应的 meetingId，返回后若已切换到其他会议则丢弃结果
		loadingMeetingIdRef.current = meetingId;
		setLoadingVolcMinutes(true);
		try {
			const result = await meetingMinutesApi.getVolcMinutes(meetingId);

			// 请求返回时若 meetingId 已改变，丢弃旧结果，防止覆盖新会议数据
			if (loadingMeetingIdRef.current !== meetingId) return;

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

			// 精确转写：只有妙记真正跑完（audio_status === 'completed'）才填入
			// 粗 ASR 阶段 audio_status 不是 'completed'，不应填入精确转写框
			const miaojiCompleted = result.audio_status === 'completed';
			const hasTranscript = miaojiCompleted && !!(result.transcript_text || (result.speaker_segments?.length ?? 0));
			setVolcTranscriptDraft(hasTranscript ? (result.transcript_text || '') : '');
			// 摘要：有内容才填入；无内容时清空
			setVolcSummaryTitle(cleanTitle);
			setVolcSummaryDraft(cleanParagraph);

			// 流式转写文本：
			//   - 若当前正在本会议的流式转写/录音中（file_streaming/live_*），保留实时内容不覆盖
			//   - 其他情况（包括切换会议后的恢复）直接用数据库结果刷新
			setVolcStreamText((prev) => {
				const streamType = volcStreamTypeRef.current;
				const isStreaming = streamType === 'file_streaming' || streamType === 'live_streaming' || streamType === 'live_connecting';
				if (isStreaming && prev) return prev;
				return result.stream_transcript_text || '';
			});
			setVolcStreamType((prev) => {
				const isActive = prev === 'file_streaming' || prev === 'live_streaming' || prev === 'live_connecting';
				if (isActive) return prev;
				return result.stream_transcript_text ? 'completed' : 'idle';
			});
			if (showToast) {
				if (result.transcript_text || result.summary || result.todos.length) {
					message.success('已刷新火山纪要');
				} else {
					message.info('火山纪要尚未生成');
				}
			}
		} catch (error: any) {
			if (loadingMeetingIdRef.current !== meetingId) return;
			message.error(error?.message || '获取火山纪要失败');
			setVolcMinutes(null);
			setVolcTranscriptDraft('');
			setVolcSummaryTitle('');
			setVolcSummaryDraft('');
			setVolcStreamText('');
			setVolcStreamType('idle');
		} finally {
			if (loadingMeetingIdRef.current === meetingId) setLoadingVolcMinutes(false);
		}
	}, []);

  const buildWsUrl = (path: string) => {
    if (typeof window === 'undefined') return path;
    // 开发模式下直连后端，绕过 Umi dev proxy（proxy ws:true 会为每个前端 WS 创建两条后端连接）
    const devBase = (process.env as any).DEV_BACKEND_WS_BASE as string | undefined;
    if (typeof devBase === 'string' && devBase.length > 0) return `${devBase}${path}`;
    // 兜底：开发时 define 未生效则直连常见后端，确保 WS 可用
    if (process.env.NODE_ENV === 'development') {
      const fallback = 'ws://127.0.0.1:8080';
      return `${fallback}${path}`;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}${path}`;
  };

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

					if (payload.type === 'volc_minutes_status') {
						setVolcMinutesStatus({
							status: payload.status,
							task_id: payload.task_id,
							audio_id: payload.audio_id,
						});
					}

					if (payload.type === 'volc_minutes_failed') {
						setVolcMinutesStatus({
							status: payload.status,
							task_id: payload.task_id,
							audio_id: payload.audio_id,
							error: payload.error,
						});
					}

					if (payload.type === 'volc_minutes_completed') {
						const streamType = volcStreamTypeRef.current;
						// 新生成进行中时不应用可能过期的完成消息，避免覆盖已清空的展示
						if (streamType === 'file_streaming' || streamType === 'live_streaming' || streamType === 'live_connecting') {
							return;
						}
						setVolcMinutesStatus({
							status: payload.status,
							task_id: payload.task_id,
							audio_id: payload.audio_id,
						});
						if (payload.refresh) {
							loadVolcMinutesData(meetingId, true);
							loadVolcAudioList(meetingId);
						}
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
		[closeMeetingWs, loadVolcMinutesData, loadVolcAudioList, wsDebug],
	);

	useEffect(() => {
		// 无论切换到哪个会议（或置空），先把与上个会议相关的展示状态全部清空，
		// 防止切换后仍显示上一个会议的内容（竞态 + 旧 state 残留）
		stopVolcSseStream();
		void stopVolcLiveWs(true);
		setVolcMinutes(null);
		setVolcMinutesStatus(null);
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

		if (typeof selectedMeetingId === 'number') {
			loadInsights(selectedMeetingId);
			loadAssets(selectedMeetingId);
			setSelectedFileIds([]);
			setSelectedAudioIds([]);
			loadVolcAudioList(selectedMeetingId);
			loadVolcMinutesData(selectedMeetingId);
		} else {
			setVolcLiveModalVisible(false);
			setVolcUploadModalVisible(false);
			setInsights(null);
			setAvailableFiles([]);
			setAvailableAudios([]);
			stopRecordingTimer();
			if (recording) stopRecording();
		}
		return () => {
			// ★ 让当前 session 失效，WS 回调中 isSessionValid() 会返回 false
			volcLiveSessionIdRef.current++;
			stopVolcSseStream();
			void stopVolcLiveWs(true);
			stopRecordingTimer();
			if (mediaRecorderRef.current) {
				mediaRecorderRef.current.stream.getTracks().forEach((track) => {
					track.stop();
				});
			}
		};
	}, [selectedMeetingId]);

	useEffect(() => {
		if (minutesMode === 'volc' && typeof selectedMeetingId === 'number') {
			connectMeetingWs(selectedMeetingId);
			return () => closeMeetingWs();
		}
		closeMeetingWs();
		return () => closeMeetingWs();
	}, [minutesMode, selectedMeetingId, connectMeetingWs, closeMeetingWs]);

	useEffect(() => {
		volcStreamTypeRef.current = volcStreamType;
	}, [volcStreamType]);

	const handleMeetingChange = (value: number) => {
		setSelectedMeetingId(value);
		history.replace(`/meetings/minutes?meetingId=${value}`);
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

	const handleRefreshVolcMinutes = () => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		loadVolcMinutesData(selectedMeetingId, true);
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
		setVolcTranscriptDraft('');
		setVolcSummaryTitle('');
		setVolcSummaryDraft('');
		resetVolcStreamState();
	}, []);

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
		async (closeSocket = false) => {
			wsDebug('volcLive stop ws', { closeSocket });
			await stopVolcAudioCapture();
			const ws = volcLiveWsRef.current;
			if (!ws) return;
			volcLiveStopRequestedRef.current = true;
			if (ws.readyState === WebSocket.OPEN) {
				try {
					ws.send(JSON.stringify({ action: 'stop' }));
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

	const handleUploadVolcMinutesAudio = async ({ file, onSuccess, onError }: any) => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			onError?.(new Error('请选择会议'));
			return;
		}
		setUploadingVolcMinutesAudio(true);
		try {
			const record = await meetingMinutesApi.uploadVolcMinutesAudio(selectedMeetingId, file as File);
			setVolcLatestAudioId(record.id);
			setSelectedVolcAudioId(record.id);
			message.success('上传成功，请选择该条后点击「生成会议纪要」');
			await loadVolcAudioList(selectedMeetingId);
			onSuccess?.('ok');
		} catch (error: any) {
			const errMsg = error?.message || `${file?.name || '音频'} 上传失败`;
			message.error(errMsg);
			onError?.(new Error(errMsg));
		} finally {
			setUploadingVolcMinutesAudio(false);
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
		const token = getToken();
		if (!token) {
			message.error('未找到登录 token，请先登录');
			return;
		}

		// 覆盖式：先清空展示与数据库，再开始录音
		clearVolcMinutesDisplay();
		setVolcInputMode('live');
		try {
			await meetingMinutesApi.clearVolcMinutes(selectedMeetingId);
		} catch {
			// 忽略清空失败，继续录音
		}

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

		let stream: MediaStream;
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					channelCount: 1,
					sampleRate: { ideal: 16000 },
					echoCancellation: true,
					noiseSuppression: true,
				},
			});
		} catch (error: any) {
			if (!isSessionValid()) return;
			setVolcStreamType('error');
			setVolcStreamError(error?.message || '无法获取麦克风权限');
			message.error(error?.message || '无法获取麦克风权限');
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
				`/api/minutes/volc/${selectedMeetingId}/live?token=${encodeURIComponent(token)}`,
			);
			ws = new WebSocket(wsUrl);
		} catch (error: any) {
			if (!isSessionValid()) return;
			setVolcStreamType('error');
			setVolcStreamError(error?.message || 'WebSocket 初始化失败');
			message.error(error?.message || 'WebSocket 初始化失败');
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
				if (data.type === 'session_created') setVolcStreamSessionId(data.session_id || null);
				if (typeof data.accumulated === 'string') setVolcStreamText(data.accumulated);
				if (data.type === 'completed') {
					if (typeof data.transcript === 'string') setVolcStreamText(data.transcript);
					const liveAudioId = typeof data.audio_id === 'number' ? data.audio_id : undefined;
					if (liveAudioId != null) {
						setVolcLatestAudioId(liveAudioId);
						setSelectedVolcAudioId(liveAudioId);
					}
					setVolcStreamType('completed');
					await stopVolcLiveWs(true);
					if (selectedMeetingId) await loadVolcAudioList(selectedMeetingId);
					message.success('录音已完成，正在自动生成会议纪要…');
					// 直接传 liveAudioId，避免 setState 异步导致读到旧 volcLatestAudioId
					handleSubmitVolcMinutes(liveAudioId);
				}
				if (data.type === 'error') {
					setVolcStreamType('error');
					setVolcStreamError(data.message || '实时录音失败');
					await stopVolcLiveWs(true);
				}
			} catch {
				// ignore
			}
		};

		ws.onerror = () => {
			if (!isSessionValid()) return;
			setVolcStreamType('error');
			setVolcStreamError('WebSocket 连接失败或已中断（请在 Network-WS 查看 Status Code / Close Code）');
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
			const reason = (e as CloseEvent | any)?.reason;
			if (volcStreamTypeRef.current === 'completed') return;
			if (volcLiveStopRequestedRef.current && (code === 1000 || code === 1001)) return;

			const hint =
				code === 4001
					? '（token 无效/过期：请重新登录）'
					: code === 4004
						? '（meeting_id 不存在或无权限）'
						: code === 1006
							? '（常见原因：反向代理未开启 WebSocket Upgrade / 后端不可达）'
							: '';
			const audioHint =
				!volcLiveFirstAudioSentRef.current && code === 1000
					? '（提示：后端在 30s 内未收到任何音频帧会主动关闭；请检查麦克风权限/AudioContext 状态）'
					: '';
			const connectHint =
				!volcLiveWsOpenedRef.current && (code === 1006 || code == null)
					? '（提示：握手未成功，常见原因：前端 dev server 未开启 ws 代理 / 反向代理未配置 Upgrade）'
					: '';
			setVolcStreamType('error');
			setVolcStreamError(
				`WebSocket 已关闭 code=${code ?? '—'} reason=${reason || '—'}${hint}${audioHint}${connectHint}`,
			);
		};

		volcLiveWsConnectTimerRef.current = window.setTimeout(() => {
			if (!isSessionValid()) return;
			if (volcLiveStopRequestedRef.current) return;
			if (volcLiveWsOpenedRef.current) return;
			setVolcStreamType('error');
			setVolcStreamError(
				'WebSocket 握手超时：请确认当前运行的是带代理的开发服务器（/api/minutes 设置 ws:true），或在反向代理上开启 WebSocket Upgrade',
			);
			void stopVolcLiveWs(true);
		}, 5000);
	};

	const handleSubmitVolcMinutes = async (audioId?: number) => {
		if (!selectedMeetingId) {
			message.warning('请选择会议');
			return;
		}
		const idToSubmit = audioId ?? volcLatestAudioId;
		if (!idToSubmit) {
			message.warning('请先完成转写（在线录音或上传后流式转写）');
			return;
		}
		setSubmittingVolcMinutes(true);
		try {
			const record = await meetingMinutesApi.submitVolcMinutes(selectedMeetingId, idToSubmit);
			setVolcMinutesStatus({
				status: record.status || 'submitted',
				task_id: record.task_id || undefined,
				audio_id: record.id,
			});
			message.success('已提交生成纪要，后台处理中（完成后将通过会议 WS 推送）');
			loadVolcAudioList(selectedMeetingId);
			loadVolcMinutesData(selectedMeetingId);
		} catch (error: any) {
			message.error(error?.message || '提交失败');
		} finally {
			setSubmittingVolcMinutes(false);
		}
	};

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
			loadVolcMinutesData(selectedMeetingId);
			loadVolcAudioList(selectedMeetingId);
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
			loadVolcMinutesData(selectedMeetingId);
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
			loadVolcMinutesData(selectedMeetingId);
		} catch (error: any) {
			message.error(error?.message || '删除待办事项失败');
		}
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
			message.success('火山音频已删除');
			if (selectedVolcAudioId === audioId) setSelectedVolcAudioId(null);
			loadVolcAudioList(selectedMeetingId);
		} catch (error: any) {
			message.error(error?.message || '删除音频失败');
		}
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
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
			const errMsg = error?.message || '无法开始录音，请检查麦克风权限';
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
			render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
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
									<Text type="secondary">上传于 {dayjs(file.uploaded_at).format('YYYY-MM-DD HH:mm')}</Text>
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
											{dayjs(audio.uploaded_at).format('YYYY-MM-DD HH:mm')} ·{' '}
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

	const volcStatusMeta: Record<string, { label: string; color: string }> = {
		uploaded: { label: '已上传', color: 'default' },
		submitted: { label: '处理中', color: 'processing' },
		completed: { label: '已完成', color: 'green' },
		failed: { label: '失败', color: 'red' },
	};

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
			render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
		},
		{
			title: '状态',
			dataIndex: 'status',
			width: 140,
			render: (value: string, record) => {
				const meta = volcStatusMeta[value] || { label: value || '未知', color: 'default' };
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
		{
			title: '操作',
			width: 160,
			render: (_, record) => (
				<Space>
					<Button type="link" onClick={() => openVolcTodoModal(record)}>
						编辑
					</Button>
					<Popconfirm title="确定删除该待办？" onConfirm={() => handleDeleteVolcTodo(record.id)}>
						<Button type="link" danger>
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

	const volcStreamStatusLabel: Record<string, string> = {
		idle: '空闲',
		live_connecting: '连接中（WS）',
		live_streaming: '实时录音中（WS）',
		file_streaming: '流式转写中（SSE）',
		completed: '已完成',
		error: '失败',
	};

	const renderHeaderActions = () => (
		<Row gutter={[16, 16]} align="middle">
			<Col xs={24} lg={12}>
				<Space size="middle" wrap>
					<Space>
						<Text strong>选择会议：</Text>
						<Select<number>
							placeholder="请选择会议"
							style={{ minWidth: 260 }}
							loading={loadingMeetings}
							showSearch
							optionFilterProp="label"
							value={selectedMeetingId}
							onChange={handleMeetingChange}
							options={meetings.map((meeting) => ({
								value: meeting.id,
								label: `${meeting.title}（${dayjs(meeting.date).format('MM-DD HH:mm')}）`,
							}))}
						/>
					</Space>
					<Space>
						<Text strong>纪要模式：</Text>
						<Button.Group>
							<Button type={minutesMode === 'local' ? 'primary' : 'default'} onClick={() => setMinutesMode('local')}>
								本地大模型
							</Button>
							<Button type={minutesMode === 'volc' ? 'primary' : 'default'} onClick={() => setMinutesMode('volc')}>
								火山纪要
							</Button>
						</Button.Group>
					</Space>
				</Space>
			</Col>
			<Col xs={24} lg={12}>
				{minutesMode === 'local' ? (
					<Space style={{ width: '100%', justifyContent: 'flex-end' }} wrap>
						<Button icon={<AudioOutlined />} onClick={() => handleOpenRecordingModal('local')} disabled={!hasSelectedMeeting}>
							在线录音
						</Button>
						<Button icon={<CloudUploadOutlined />} disabled={!hasSelectedMeeting} onClick={() => openUploadAudioModal('local')}>
							上传录音
						</Button>
						<Button icon={<CloudUploadOutlined />} disabled={!hasSelectedMeeting} onClick={() => setUploadFileModalVisible(true)}>
							上传文件
						</Button>
						<Button icon={<ThunderboltOutlined />} type="primary" disabled={!selectedMeetingId} onClick={() => setGenerateModalVisible(true)}>
							智能生成纪要
						</Button>
					</Space>
				) : (
					<Space style={{ width: '100%', justifyContent: 'flex-end' }} wrap>
						<Button
								icon={<AudioOutlined />}
								onClick={() => void startVolcLiveRecording()}
								disabled={!hasSelectedMeeting || volcStreamType === 'live_streaming' || volcStreamType === 'live_connecting'}
							>
								{volcStreamType === 'live_streaming' || volcStreamType === 'live_connecting' ? '录音中…' : '在线录音'}
							</Button>
						<Button icon={<UnorderedListOutlined />} disabled={!hasSelectedMeeting} onClick={openVolcAudiosModal}>
							查看已有音频
						</Button>
					</Space>
				)}
			</Col>
		</Row>
	);

	const renderLocalMinutes = () => (
		<Spin spinning={loadingInsights}>
			{!selectedMeetingId ? (
				<Empty description="请选择一个会议以查看纪要" style={{ marginTop: 48 }} />
			) : (
				<>
					{!insights && (
						<Alert
							type="info"
							showIcon
							style={{ marginBottom: 16 }}
							message="暂未生成结构化纪要"
							description="可选择会议文件和音频后点击“智能生成纪要”，也可以手动维护行动项/决策事项。"
						/>
					)}
					<ProCard
						title="会议摘要"
						extra={
							<Button type="link" onClick={handleSaveSummary} loading={savingSummary}>
								保存摘要
							</Button>
						}
					>
						<TextArea
							rows={6}
							value={summaryDraft}
							placeholder="这里将展示 AI 生成的会议摘要，也可以手动修改补充"
							onChange={(e) => setSummaryDraft(e.target.value)}
						/>
						<Text type="secondary">
							最后编辑：{summaryUpdatedAt ? dayjs(summaryUpdatedAt).format('YYYY-MM-DD HH:mm') : '暂无'}
						</Text>
					</ProCard>

					<ProCard split="vertical" style={{ marginTop: 16 }}>
						<ProCard
							title="行动项"
							extra={
								<Button type="link" icon={<PlusOutlined />} onClick={() => openActionModal()}>
									新增行动项
								</Button>
							}
						>
							<Table<MeetingActionItem>
								rowKey="id"
								size="small"
								dataSource={insights?.action_items || []}
								columns={actionColumns}
								pagination={false}
								locale={{ emptyText: '暂无行动项' }}
							/>
						</ProCard>
						<ProCard
							title="决策事项"
							extra={
								<Button type="link" icon={<PlusOutlined />} onClick={() => openDecisionModal()}>
									新增决策
								</Button>
							}
						>
							<Table<MeetingDecisionItem>
								rowKey="id"
								size="small"
								dataSource={insights?.decision_items || []}
								columns={decisionColumns}
								pagination={false}
								locale={{ emptyText: '暂无决策记录' }}
							/>
						</ProCard>
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
						message="火山纪要"
						description="在线录音：边录边转写，停止后自动生成会议纪要。查看已有音频：选择或上传音频后点击「生成会议纪要」，直接生成精确转写、摘要与待办。"
					/>

					<div ref={volcStreamCardRef}>
					<ProCard
						title="第一步：流式转写（实时出字）"
						style={{ marginBottom: 16 }}
						extra={
							<Space>
								{(volcStreamType === 'live_streaming' || volcStreamType === 'live_connecting') && (
									<Button danger onClick={() => void stopVolcLiveWs(false)}>
										停止录音
									</Button>
								)}
							</Space>
						}
					>
						{volcInputMode === 'upload' ? (
							<Space direction="vertical" style={{ width: '100%' }} size="small">
								<Tag color="default">无</Tag>
								<Text type="secondary">上传音频模式不经过流式转写，直接提交至语音妙记生成精确内容。</Text>
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
								<Text type="secondary">流式转写仅用于实时展示，录音结束后自动提交语音妙记生成精确转写、摘要与待办。</Text>
							</Space>
						)}
					</ProCard>
					</div>

					<ProCard
						title="第二步：语音妙记结果（精确转写 / 摘要 / 待办）"
						extra={
							<Button icon={<ReloadOutlined />} onClick={handleRefreshVolcMinutes}>
								刷新纪要
							</Button>
						}
					>
						<Space direction="vertical" style={{ width: '100%' }} size="middle">
						{volcMinutesStatus && (
							<Alert
								showIcon
								type={volcMinutesStatus?.error ? 'error' : 'info'}
								message={`妙记状态：${({ completed: '已完成', succeeded: '已完成', success: '已完成', finished: '已完成', failed: '失败', error: '失败', processing: '处理中', submitted: '处理中', running: '运行中', pending: '等待中' }[String(volcMinutesStatus.status ?? '').toLowerCase()]) || volcMinutesStatus.status || '—'}`}
								description={volcMinutesStatus.error ? <Text type="danger">错误：{volcMinutesStatus.error}</Text> : undefined}
							/>
						)}

					{/* 精确转写：框始终展示，妙记刷新成功后才填入文字内容 */}
					{(() => {
						// 只有妙记真正完成（audio_status === 'completed'）才算有精确转写结果
						const hasTranscript = !!(volcMinutes &&
							volcMinutes.audio_status === 'completed' &&
							(volcMinutes.transcript_text != null || (volcMinutes.speaker_segments?.length ?? 0) > 0));
							return (
								<ProCard
									title="精确转写"
									extra={
										<Button
											type="link"
											onClick={handleSaveVolcTranscript}
											loading={savingVolcTranscript}
											disabled={!hasTranscript}
										>
											保存转写
										</Button>
									}
									style={{ marginBottom: 16 }}
								>
									<Space direction="vertical" style={{ width: '100%' }} size="small">
										<TextArea
											rows={14}
											placeholder="火山纪要刷新成功后将在此显示精确转写内容。"
											value={volcTranscriptDraft}
											onChange={(e) => setVolcTranscriptDraft(e.target.value)}
										/>
										<Text type="secondary">
											流式转写仅作实时预览；生成纪要后得到带说话人的精确转写，可在此修订并保存。
										</Text>
									</Space>
								</ProCard>
							);
						})()}

						{/* 会议摘要：始终显示 */}
						<ProCard
							title="会议摘要"
							extra={
								<Button
									type="link"
									onClick={handleSaveVolcSummary}
									loading={savingVolcSummary}
									disabled={!selectedMeetingId}
								>
									保存会议摘要
								</Button>
							}
							style={{ marginBottom: 16 }}
						>
							<Space direction="vertical" style={{ width: '100%' }} size="middle">
								<Input
									placeholder="请输入会议摘要标题（可选）"
									value={volcSummaryTitle}
									onChange={(e) => setVolcSummaryTitle(e.target.value)}
									allowClear
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
							) : null}
								{/* 编辑框：始终显示，方便手动补充 */}
								<TextArea
									rows={6}
									placeholder="可在此编辑摘要内容（支持 Markdown），修改后点击「保存会议摘要」"
									value={volcSummaryDraft}
									onChange={(e) => setVolcSummaryDraft(e.target.value)}
								/>
							</Space>
						</ProCard>

							<ProCard
								title="待办事项"
								extra={
									<Button type="link" icon={<PlusOutlined />} onClick={() => openVolcTodoModal()}>
										新增待办
									</Button>
								}
							>
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

	return (
		<PageContainer>
			<ProCard ghost>{renderHeaderActions()}{minutesMode === 'local' ? renderLocalMinutes() : renderVolcMinutes()}</ProCard>

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
						disabled={!selectedMeetingId || volcStreamType === 'live_streaming' || volcStreamType === 'live_connecting'}
						onClick={startVolcLiveRecording}
					>
						开始实时录音
					</Button>,
					<Button
						key="stop"
						danger
						disabled={volcStreamType !== 'live_streaming' && volcStreamType !== 'live_connecting'}
						onClick={() => void stopVolcLiveWs(false)}
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
						disabled={!selectedVolcAudioId || submittingVolcMinutes}
						loading={submittingVolcMinutes}
						onClick={async () => {
							if (!selectedVolcAudioId || !selectedMeetingId) return;
							clearVolcMinutesDisplay();
							setVolcInputMode('upload');
							try {
								await meetingMinutesApi.clearVolcMinutes(selectedMeetingId);
							} catch {
								// 忽略清空失败
							}
							setVolcAudiosModalVisible(false);
							handleSubmitVolcMinutes(selectedVolcAudioId);
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
						customRequest={handleUploadVolcMinutesAudio}
						showUploadList
						disabled={!hasSelectedMeeting || uploadingVolcMinutesAudio}
					>
						<p className="ant-upload-drag-icon">
							<CloudUploadOutlined />
						</p>
						<p className="ant-upload-text">上传音频</p>
						<p className="ant-upload-hint">上传后选中下方列表中该条，再点击「生成会议纪要」</p>
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
		</PageContainer>
	);
};

export default MeetingMinutes;
