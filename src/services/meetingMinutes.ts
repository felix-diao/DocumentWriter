import { request } from '@umijs/max';
import type { VolcMeetingAudio } from './meetings';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

type AudioProvider = 'local' | 'volc';

interface MeetingAudioRecordRaw {
  id: number;
  meeting_id: number;
  provider: AudioProvider;
  file_name?: string | null;
  object_key?: string | null;
  file_url?: string | null;
  file_type?: string | null;
  status?: string | null;
  transcript_text?: string | null;
  error_msg?: string | null;
  created_at: string;
  updated_at: string;
}

interface MeetingAudioUploadTask {
  task_id: string;
  provider: AudioProvider;
  meeting_id: number;
  file_name: string;
  file_type?: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | string;
  audio_id?: number | null;
  error_msg?: string | null;
  audio?: MeetingAudioRecordRaw | null;
  created_at: string;
  updated_at: string;
}

interface VolcMinutesJobRaw {
  id: number;
  meeting_id: number;
  source_audio_id?: number | null;
  input_file_url?: string;
  input_file_type?: string | null;
  volc_task_id?: string | null;
  status: string;
  error_msg?: string | null;
  created_at: string;
  updated_at: string;
}

const VOLC_MINUTES_API_BASE = '/api/meetings/minutes/volc';
const LOCAL_MINUTES_API_BASE = '/api/meetings/minutes/local';
const MEETING_AUDIO_API_BASE = '/api/meetings/audio';
const UNSUPPORTED_STRUCTURED_MINUTES_MESSAGE = '当前后端版本已移除结构化会议纪要接口。';
const UNSUPPORTED_CURRENT_EDIT_MESSAGE = '当前后端版本已将纪要主视图改为只读，请在“会话历史”中修订。';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const failUnsupported = <T>(message: string): Promise<T> =>
  Promise.reject(new Error(message));

const createAudioUploadTask = async (
  meetingId: number,
  provider: AudioProvider,
  file: File,
): Promise<MeetingAudioUploadTask> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await request<ApiResponse<MeetingAudioUploadTask>>(
    `${MEETING_AUDIO_API_BASE}/${meetingId}/upload-task`,
    {
      method: 'POST',
      params: { provider },
      data: formData,
      requestType: 'form',
    },
  );
  return res.data;
};

const getAudioUploadTask = async (taskId: string): Promise<MeetingAudioUploadTask> => {
  const res = await request<ApiResponse<MeetingAudioUploadTask>>(
    `${MEETING_AUDIO_API_BASE}/upload-tasks/${taskId}`,
    {
      method: 'GET',
    },
  );
  return res.data;
};

const pollAudioUploadTask = async (taskId: string): Promise<MeetingAudioUploadTask> => {
  const startedAt = Date.now();
  let latest = await getAudioUploadTask(taskId);
  while (latest.status !== 'completed' && latest.status !== 'failed') {
    if (Date.now() - startedAt > 5 * 60 * 1000) {
      throw new Error('音频上传超时，请稍后刷新确认结果');
    }
    await wait(1000);
    latest = await getAudioUploadTask(taskId);
  }
  if (latest.status === 'failed') {
    throw new Error(latest.error_msg || '音频上传失败');
  }
  return latest;
};

export interface MeetingSummary {
  id: number;
  meeting_id: number;
  summary_text: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingActionItem {
  id: number;
  meeting_id: number;
  description: string;
  owner?: string | null;
  due_date?: string | null;
  status?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingDecisionItem {
  id: number;
  meeting_id: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingInsights {
  summary?: MeetingSummary | null;
  action_items: MeetingActionItem[];
  decision_items: MeetingDecisionItem[];
}

export interface VolcMeetingSummary {
  id: number;
  meeting_id: number;
  paragraph: string;
  title?: string | null;
  source_audio_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface VolcMeetingTodo {
  id: number;
  meeting_id: number;
  content: string;
  executor?: string | null;
  execution_time?: string | null;
  source_audio_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface SpeakerSegment {
  speaker: string;
  text: string;
  start_ms?: number | null;
  end_ms?: number | null;
}

export interface VolcMeetingMinutes {
  transcript_text?: string | null;
  stream_transcript_text?: string | null;
  minutes_job_status?: string | null;
  audio_status?: string | null;
  speaker_segments: SpeakerSegment[];
  summary?: VolcMeetingSummary | null;
  todos: VolcMeetingTodo[];
}

export interface VolcMeetingSummaryPayload {
  paragraph: string;
  meeting_id?: number;
  title?: string | null;
  source_audio_id?: number | null;
}

export interface VolcAudioUploadTask {
  task_id: string;
  provider?: AudioProvider;
  meeting_id: number;
  file_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | string;
  audio_id?: number | null;
  error_msg?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VolcMinutesJob {
  job_id: number;
  meeting_id: number;
  audio_id?: number | null;
  task_id?: string | null;
  status: string;
  error_msg?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VolcMeetingTodoPayload {
  content: string;
  executor?: string | null;
  execution_time?: string | null;
  meeting_id?: number;
  source_audio_id?: number | null;
}

export interface VolcTranscriptPayload {
  transcript_text: string;
}

export interface VolcSessionTodoItem {
  content: string;
  executor?: string | null;
  execution_time?: string | null;
  source_audio_id?: number | null;
}

export interface VolcMeetingMinutesSession {
  id: number;
  session_no?: string | null;
  meeting_id: number;
  source_audio_id?: number | null;
  source_asr_session_id?: number | null;
  volc_task_id?: string | null;
  status: string;
  error_msg?: string | null;
  stream_transcript_text?: string | null;
  transcript_text?: string | null;
  speaker_segments: SpeakerSegment[];
  summary_title?: string | null;
  summary_paragraph?: string | null;
  todos: VolcSessionTodoItem[];
  created_at: string;
  updated_at: string;
}

export interface VolcMeetingMinutesSessionUpdatePayload {
  status?: string | null;
  error_msg?: string | null;
  stream_transcript_text?: string | null;
  transcript_text?: string | null;
  speaker_segments?: SpeakerSegment[];
  summary_title?: string | null;
  summary_paragraph?: string | null;
  todos?: VolcSessionTodoItem[];
}

export interface GenerateMinutesPayload {
  file_ids?: number[];
  audio_ids?: number[];
}

export interface ActionItemPayload {
  description: string;
  owner?: string;
  due_date?: string;
  status?: string;
}

export interface DecisionItemPayload {
  description: string;
}

export interface LocalMeetingSummary {
  id: number;
  meeting_id: number;
  title?: string | null;
  paragraph: string;
  source_audio_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface LocalMeetingTodo {
  id: number;
  meeting_id: number;
  content: string;
  executor?: string | null;
  execution_time?: string | null;
  source_audio_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface LocalMeetingAudioRecord {
  id: number;
  meeting_id: number;
  file_name: string;
  object_key: string;
  file_url: string;
  file_type?: string | null;
  status: string;
  transcript_text?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalMeetingMinutes {
  transcript_text?: string | null;
  stream_transcript_text?: string | null;
  asr_session_id?: number | null;
  asr_status?: string | null;
  source_audio_id?: number | null;
  audio_status?: string | null;
  summary?: LocalMeetingSummary | null;
  todos: LocalMeetingTodo[];
}

export interface LocalAsrTranscribeFromAudioResponse {
  asr_session_id: number;
  meeting_id: number;
  source_audio_id: number;
  status: 'processing';
}

export interface LocalSessionTodoItem {
  content: string;
  executor?: string | null;
  execution_time?: string | null;
  source_audio_id?: number | null;
}

export interface LocalMeetingMinutesSession {
  id: number;
  session_no?: string | null;
  meeting_id: number;
  source_audio_id?: number | null;
  source_asr_session_id?: number | null;
  status: string;
  error_msg?: string | null;
  stream_transcript_text?: string | null;
  transcript_text?: string | null;
  summary_title?: string | null;
  summary_paragraph?: string | null;
  todos: LocalSessionTodoItem[];
  created_at: string;
  updated_at: string;
}

export interface LocalMeetingMinutesSessionUpdatePayload {
  status?: string | null;
  error_msg?: string | null;
  stream_transcript_text?: string | null;
  transcript_text?: string | null;
  summary_title?: string | null;
  summary_paragraph?: string | null;
  todos?: LocalSessionTodoItem[];
}

export interface LocalMeetingSummaryPayload {
  paragraph: string;
  title?: string | null;
  source_audio_id?: number | null;
  meeting_id?: number;
}

export interface LocalMeetingTodoPayload {
  content: string;
  executor?: string | null;
  execution_time?: string | null;
  source_audio_id?: number | null;
  meeting_id?: number;
}

export interface GenerateLocalMinutesOptions {
  asrSessionId?: number | null;
}

const normalizeVolcUploadTask = (task: MeetingAudioUploadTask): VolcAudioUploadTask => ({
  task_id: task.task_id,
  provider: task.provider,
  meeting_id: task.meeting_id,
  file_name: task.file_name,
  status: task.status,
  audio_id: task.audio_id ?? null,
  error_msg: task.error_msg ?? null,
  created_at: task.created_at,
  updated_at: task.updated_at,
});

const normalizeLocalAudioRecord = (raw: MeetingAudioRecordRaw): LocalMeetingAudioRecord => ({
  id: raw.id,
  meeting_id: raw.meeting_id,
  file_name: raw.file_name || '未命名音频',
  object_key: raw.object_key || '',
  file_url: raw.file_url || '',
  file_type: raw.file_type || null,
  status: raw.status || 'completed',
  transcript_text: raw.transcript_text || null,
  created_at: raw.created_at,
  updated_at: raw.updated_at,
});

const getInsights = async (_meetingId: number): Promise<MeetingInsights> =>
  failUnsupported(UNSUPPORTED_STRUCTURED_MINUTES_MESSAGE);

const generateInsights = async (
  _meetingId: number,
  _payload: GenerateMinutesPayload,
): Promise<MeetingInsights> => failUnsupported(UNSUPPORTED_STRUCTURED_MINUTES_MESSAGE);

const updateSummary = async (_meetingId: number, _summaryText: string): Promise<MeetingSummary> =>
  failUnsupported(UNSUPPORTED_STRUCTURED_MINUTES_MESSAGE);

const createActionItem = async (
  _meetingId: number,
  _payload: ActionItemPayload,
): Promise<MeetingActionItem> => failUnsupported(UNSUPPORTED_STRUCTURED_MINUTES_MESSAGE);

const updateActionItem = async (
  _meetingId: number,
  _itemId: number,
  _payload: ActionItemPayload,
): Promise<MeetingActionItem> => failUnsupported(UNSUPPORTED_STRUCTURED_MINUTES_MESSAGE);

const deleteActionItem = async (_meetingId: number, _itemId: number): Promise<void> =>
  failUnsupported(UNSUPPORTED_STRUCTURED_MINUTES_MESSAGE);

const createDecisionItem = async (
  _meetingId: number,
  _payload: DecisionItemPayload,
): Promise<MeetingDecisionItem> => failUnsupported(UNSUPPORTED_STRUCTURED_MINUTES_MESSAGE);

const updateDecisionItem = async (
  _meetingId: number,
  _itemId: number,
  _payload: DecisionItemPayload,
): Promise<MeetingDecisionItem> => failUnsupported(UNSUPPORTED_STRUCTURED_MINUTES_MESSAGE);

const deleteDecisionItem = async (_meetingId: number, _itemId: number): Promise<void> =>
  failUnsupported(UNSUPPORTED_STRUCTURED_MINUTES_MESSAGE);

const getVolcMinutes = async (meetingId: number): Promise<VolcMeetingMinutes> => {
  const res = await request<ApiResponse<VolcMeetingMinutes>>(`${VOLC_MINUTES_API_BASE}/${meetingId}`, {
    method: 'GET',
  });
  return res?.data ?? {
    transcript_text: null,
    stream_transcript_text: null,
    minutes_job_status: null,
    audio_status: null,
    speaker_segments: [],
    summary: null,
    todos: [],
  };
};

const submitVolcMinutes = async (
  meetingId: number,
  audioId?: number,
  _source?: 'live' | 'existing_audio',
): Promise<VolcMinutesJob> => {
  const query = typeof audioId === 'number' ? `?audio_id=${audioId}` : '';
  const res = await request<ApiResponse<VolcMinutesJobRaw>>(
    `${VOLC_MINUTES_API_BASE}/${meetingId}/submit${query}`,
    {
      method: 'POST',
    },
  );
  return {
    job_id: res.data.id,
    meeting_id: res.data.meeting_id,
    audio_id: res.data.source_audio_id ?? audioId ?? null,
    task_id: res.data.volc_task_id ?? null,
    status: res.data.status,
    error_msg: res.data.error_msg ?? null,
    created_at: res.data.created_at,
    updated_at: res.data.updated_at,
  };
};

const abandonVolcMinutes = async (
  _meetingId: number,
  _audioId: number,
  _reason?: string,
): Promise<VolcMeetingAudio> => failUnsupported(UNSUPPORTED_CURRENT_EDIT_MESSAGE);

const discardVolcWorkspace = async (
  _meetingId: number,
  _reason?: string,
  _currentAudioId?: number | null,
): Promise<void> => failUnsupported(UNSUPPORTED_CURRENT_EDIT_MESSAGE);

const clearVolcMinutes = async (_meetingId: number): Promise<void> =>
  failUnsupported(UNSUPPORTED_CURRENT_EDIT_MESSAGE);

const uploadVolcMinutesAudio = async (meetingId: number, file: File): Promise<VolcAudioUploadTask> => {
  const task = await createAudioUploadTask(meetingId, 'volc', file);
  return normalizeVolcUploadTask(task);
};

const getVolcUploadTask = async (taskId: string): Promise<VolcAudioUploadTask> => {
  const task = await getAudioUploadTask(taskId);
  return normalizeVolcUploadTask(task);
};

const updateVolcTranscript = async (
  _meetingId: number,
  _payload: VolcTranscriptPayload,
): Promise<VolcMeetingAudio> => failUnsupported(UNSUPPORTED_CURRENT_EDIT_MESSAGE);

const updateVolcSummary = async (
  _meetingId: number,
  _payload: VolcMeetingSummaryPayload,
): Promise<VolcMeetingSummary> => failUnsupported(UNSUPPORTED_CURRENT_EDIT_MESSAGE);

const createVolcTodo = async (
  _meetingId: number,
  _payload: VolcMeetingTodoPayload,
): Promise<VolcMeetingTodo> => failUnsupported(UNSUPPORTED_CURRENT_EDIT_MESSAGE);

const updateVolcTodo = async (
  _meetingId: number,
  _todoId: number,
  _payload: VolcMeetingTodoPayload,
): Promise<VolcMeetingTodo> => failUnsupported(UNSUPPORTED_CURRENT_EDIT_MESSAGE);

const deleteVolcTodo = async (_meetingId: number, _todoId: number): Promise<void> =>
  failUnsupported(UNSUPPORTED_CURRENT_EDIT_MESSAGE);

const listVolcMinutesSessions = async (meetingId: number): Promise<VolcMeetingMinutesSession[]> => {
  const res = await request<ApiResponse<VolcMeetingMinutesSession[]>>(
    `${VOLC_MINUTES_API_BASE}/${meetingId}/sessions`,
    {
      method: 'GET',
    },
  );
  return res?.data ?? [];
};

const getVolcMinutesSession = async (
  meetingId: number,
  sessionId: number,
): Promise<VolcMeetingMinutesSession> => {
  const res = await request<ApiResponse<VolcMeetingMinutesSession>>(
    `${VOLC_MINUTES_API_BASE}/${meetingId}/sessions/${sessionId}`,
    {
      method: 'GET',
      skipErrorHandler: true,
    },
  );
  return res.data;
};

const updateVolcMinutesSession = async (
  meetingId: number,
  sessionId: number,
  payload: VolcMeetingMinutesSessionUpdatePayload,
): Promise<VolcMeetingMinutesSession> => {
  const res = await request<ApiResponse<VolcMeetingMinutesSession>>(
    `${VOLC_MINUTES_API_BASE}/${meetingId}/sessions/${sessionId}`,
    {
      method: 'PUT',
      data: payload,
    },
  );
  return res.data;
};

const deleteVolcMinutesSession = async (meetingId: number, sessionId: number): Promise<void> => {
  await request<ApiResponse<null>>(`${VOLC_MINUTES_API_BASE}/${meetingId}/sessions/${sessionId}`, {
    method: 'DELETE',
  });
};

const getLocalMinutes = async (meetingId: number): Promise<LocalMeetingMinutes> => {
  const res = await request<ApiResponse<LocalMeetingMinutes>>(`${LOCAL_MINUTES_API_BASE}/${meetingId}`, {
    method: 'GET',
  });
  return res?.data ?? {
    transcript_text: null,
    stream_transcript_text: null,
    asr_session_id: null,
    asr_status: null,
    source_audio_id: null,
    audio_status: null,
    summary: null,
    todos: [],
  };
};

const generateLocalMinutes = async (
  meetingId: number,
  options?: GenerateLocalMinutesOptions,
): Promise<LocalMeetingMinutes> => {
  const res = await request<ApiResponse<LocalMeetingMinutes>>(
    `${LOCAL_MINUTES_API_BASE}/${meetingId}/generate`,
    {
      method: 'POST',
      params: typeof options?.asrSessionId === 'number' ? { asr_session_id: options.asrSessionId } : undefined,
      skipErrorHandler: true,
    },
  );
  return res?.data ?? {
    transcript_text: null,
    stream_transcript_text: null,
    asr_session_id: null,
    asr_status: null,
    source_audio_id: null,
    audio_status: null,
    summary: null,
    todos: [],
  };
};

const transcribeUploadedLocalAudio = async (
  meetingId: number,
  audioId: number,
): Promise<LocalAsrTranscribeFromAudioResponse> => {
  const res = await request<ApiResponse<LocalAsrTranscribeFromAudioResponse>>(
    `${LOCAL_MINUTES_API_BASE}/${meetingId}/transcribe-audio`,
    {
      method: 'POST',
      params: { audio_id: audioId },
      skipErrorHandler: true,
    },
  );
  return res.data;
};

const uploadLocalAudio = async (meetingId: number, file: File): Promise<LocalMeetingAudioRecord> => {
  const task = await createAudioUploadTask(meetingId, 'local', file);
  const latest = await pollAudioUploadTask(task.task_id);
  if (!latest.audio) {
    throw new Error('上传完成但未返回音频记录');
  }
  return normalizeLocalAudioRecord(latest.audio);
};

const updateLocalSummary = async (
  _meetingId: number,
  _payload: LocalMeetingSummaryPayload,
): Promise<LocalMeetingSummary> => failUnsupported(UNSUPPORTED_CURRENT_EDIT_MESSAGE);

const createLocalTodo = async (
  _meetingId: number,
  _payload: LocalMeetingTodoPayload,
): Promise<LocalMeetingTodo> => failUnsupported(UNSUPPORTED_CURRENT_EDIT_MESSAGE);

const updateLocalTodo = async (
  _meetingId: number,
  _todoId: number,
  _payload: LocalMeetingTodoPayload,
): Promise<LocalMeetingTodo> => failUnsupported(UNSUPPORTED_CURRENT_EDIT_MESSAGE);

const deleteLocalTodo = async (_meetingId: number, _todoId: number): Promise<void> =>
  failUnsupported(UNSUPPORTED_CURRENT_EDIT_MESSAGE);

const listLocalMinutesSessions = async (meetingId: number): Promise<LocalMeetingMinutesSession[]> => {
  const res = await request<ApiResponse<LocalMeetingMinutesSession[]>>(
    `${LOCAL_MINUTES_API_BASE}/${meetingId}/sessions`,
    {
      method: 'GET',
    },
  );
  return (res?.data ?? []).map((item) => ({
    ...item,
    status: item.status || 'completed',
    error_msg: item.error_msg || null,
  }));
};

const getLocalMinutesSession = async (
  meetingId: number,
  sessionId: number,
): Promise<LocalMeetingMinutesSession> => {
  const res = await request<ApiResponse<LocalMeetingMinutesSession>>(
    `${LOCAL_MINUTES_API_BASE}/${meetingId}/sessions/${sessionId}`,
    {
      method: 'GET',
      skipErrorHandler: true,
    },
  );
  return {
    ...res.data,
    status: res.data.status || 'completed',
    error_msg: res.data.error_msg || null,
  };
};

const updateLocalMinutesSession = async (
  meetingId: number,
  sessionId: number,
  payload: LocalMeetingMinutesSessionUpdatePayload,
): Promise<LocalMeetingMinutesSession> => {
  const res = await request<ApiResponse<LocalMeetingMinutesSession>>(
    `${LOCAL_MINUTES_API_BASE}/${meetingId}/sessions/${sessionId}`,
    {
      method: 'PUT',
      data: payload,
    },
  );
  return {
    ...res.data,
    status: res.data.status || 'completed',
    error_msg: res.data.error_msg || null,
  };
};

const deleteLocalMinutesSession = async (meetingId: number, sessionId: number): Promise<void> => {
  await request<ApiResponse<null>>(`${LOCAL_MINUTES_API_BASE}/${meetingId}/sessions/${sessionId}`, {
    method: 'DELETE',
  });
};

export const meetingMinutesApi = {
  getInsights,
  generateInsights,
  updateSummary,
  createActionItem,
  updateActionItem,
  deleteActionItem,
  createDecisionItem,
  updateDecisionItem,
  deleteDecisionItem,
  getVolcMinutes,
  submitVolcMinutes,
  abandonVolcMinutes,
  discardVolcWorkspace,
  clearVolcMinutes,
  uploadVolcMinutesAudio,
  getVolcUploadTask,
  updateVolcTranscript,
  updateVolcSummary,
  createVolcTodo,
  updateVolcTodo,
  deleteVolcTodo,
  listVolcMinutesSessions,
  getVolcMinutesSession,
  updateVolcMinutesSession,
  deleteVolcMinutesSession,
  getLocalMinutes,
  generateLocalMinutes,
  transcribeUploadedLocalAudio,
  uploadLocalAudio,
  updateLocalSummary,
  createLocalTodo,
  updateLocalTodo,
  deleteLocalTodo,
  listLocalMinutesSessions,
  getLocalMinutesSession,
  updateLocalMinutesSession,
  deleteLocalMinutesSession,
};

export const getMinutesDocxUrl = (_meetingId: number) => '';

export default meetingMinutesApi;
