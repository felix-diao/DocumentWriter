import { request } from '@umijs/max';
import type { VolcMeetingAudio } from './meetings';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

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
  stream_transcript_text?: string | null;  // 粗 ASR 流式转写结果（退出重进后恢复流式文本框）
  audio_status?: string | null;            // 妙记处理状态，'completed' 表示妙记精确转写已就绪
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
  meeting_id: number;
  file_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | string;
  audio_id?: number | null;
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

const getInsights = async (meetingId: number): Promise<MeetingInsights> => {
  const res = await request<ApiResponse<MeetingInsights>>(`/api/minutes/insights/${meetingId}`, {
    method: 'GET',
    // 该接口在未生成历史纪要时可能返回 404，页面内会自行兜底处理，不走全局错误弹窗。
    skipErrorHandler: true,
  });
  return res.data;
};

const generateInsights = async (
  meetingId: number,
  payload: GenerateMinutesPayload,
): Promise<MeetingInsights> => {
  const res = await request<ApiResponse<MeetingInsights>>(
    `/api/minutes/insights/generate/${meetingId}`,
    {
      method: 'POST',
      data: payload,
    },
  );
  return res.data;
};

const updateSummary = async (meetingId: number, summaryText: string): Promise<MeetingSummary> => {
  const res = await request<ApiResponse<MeetingSummary>>(
    `/api/minutes/insights/${meetingId}/summary`,
    {
      method: 'PUT',
      data: { summary_text: summaryText },
    },
  );
  return res.data;
};

const createActionItem = async (
  meetingId: number,
  payload: ActionItemPayload,
): Promise<MeetingActionItem> => {
  const res = await request<ApiResponse<MeetingActionItem>>(
    `/api/minutes/insights/${meetingId}/actions`,
    {
      method: 'POST',
      data: payload,
    },
  );
  return res.data;
};

const updateActionItem = async (
  meetingId: number,
  itemId: number,
  payload: ActionItemPayload,
): Promise<MeetingActionItem> => {
  const res = await request<ApiResponse<MeetingActionItem>>(
    `/api/minutes/insights/${meetingId}/actions/${itemId}`,
    {
      method: 'PUT',
      data: payload,
    },
  );
  return res.data;
};

const deleteActionItem = async (meetingId: number, itemId: number): Promise<void> => {
  await request<ApiResponse<null>>(`/api/minutes/insights/${meetingId}/actions/${itemId}`, {
    method: 'DELETE',
  });
};

const createDecisionItem = async (
  meetingId: number,
  payload: DecisionItemPayload,
): Promise<MeetingDecisionItem> => {
  const res = await request<ApiResponse<MeetingDecisionItem>>(
    `/api/minutes/insights/${meetingId}/decisions`,
    {
      method: 'POST',
      data: payload,
    },
  );
  return res.data;
};

const updateDecisionItem = async (
  meetingId: number,
  itemId: number,
  payload: DecisionItemPayload,
): Promise<MeetingDecisionItem> => {
  const res = await request<ApiResponse<MeetingDecisionItem>>(
    `/api/minutes/insights/${meetingId}/decisions/${itemId}`,
    {
      method: 'PUT',
      data: payload,
    },
  );
  return res.data;
};

const deleteDecisionItem = async (meetingId: number, itemId: number): Promise<void> => {
  await request<ApiResponse<null>>(`/api/minutes/insights/${meetingId}/decisions/${itemId}`, {
    method: 'DELETE',
  });
};

const getVolcMinutes = async (meetingId: number): Promise<VolcMeetingMinutes> => {
  const res = await request<ApiResponse<VolcMeetingMinutes>>(`/api/minutes/volc/${meetingId}`, {
    method: 'GET',
  });
  return res?.data ?? { transcript_text: null, speaker_segments: [], summary: null, todos: [] };
};

const submitVolcMinutes = async (
  meetingId: number,
  audioId?: number,
  source?: 'live' | 'existing_audio',
): Promise<VolcMeetingAudio> => {
  const params = new URLSearchParams();
  if (audioId != null) params.set('audio_id', String(audioId));
  if (source) params.set('source', source);
  const query = params.toString();
  const url = query
    ? `/api/minutes/volc/${meetingId}/submit?${query}`
    : `/api/minutes/volc/${meetingId}/submit`;
  const res = await request<ApiResponse<VolcMeetingAudio>>(url, {
    method: 'POST',
  });
  return res.data;
};

const abandonVolcMinutes = async (
  meetingId: number,
  audioId: number,
  reason?: string,
): Promise<VolcMeetingAudio> => {
  const query = reason
    ? `?audio_id=${audioId}&reason=${encodeURIComponent(reason)}`
    : `?audio_id=${audioId}`;
  const res = await request<ApiResponse<VolcMeetingAudio>>(
    `/api/minutes/volc/${meetingId}/abandon${query}`,
    { method: 'POST' },
  );
  return res.data;
};

const discardVolcWorkspace = async (
  meetingId: number,
  reason?: string,
  currentAudioId?: number | null,
): Promise<void> => {
  const params = new URLSearchParams();
  if (reason) params.set('reason', reason);
  if (typeof currentAudioId === 'number') params.set('current_audio_id', String(currentAudioId));
  const query = params.toString() ? `?${params.toString()}` : '';
  await request<ApiResponse<null>>(`/api/minutes/volc/${meetingId}/discard${query}`, {
    method: 'POST',
  });
};

const clearVolcMinutes = async (meetingId: number): Promise<void> => {
  await request<ApiResponse<null>>(`/api/minutes/volc/${meetingId}/clear`, {
    method: 'POST',
  });
};

const uploadVolcMinutesAudio = async (meetingId: number, file: File): Promise<VolcAudioUploadTask> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await request<ApiResponse<VolcAudioUploadTask>>(`/api/minutes/volc/${meetingId}/upload`, {
    method: 'POST',
    data: formData,
    requestType: 'form',
  });
  return res.data;
};

const getVolcUploadTask = async (taskId: string): Promise<VolcAudioUploadTask> => {
  const res = await request<ApiResponse<VolcAudioUploadTask>>(`/api/minutes/volc/upload-tasks/${taskId}`, {
    method: 'GET',
  });
  return res.data;
};

const updateVolcTranscript = async (
  meetingId: number,
  payload: VolcTranscriptPayload,
): Promise<VolcMeetingAudio> => {
  const res = await request<ApiResponse<VolcMeetingAudio>>(`/api/minutes/volc/${meetingId}/transcript`, {
    method: 'PUT',
    data: payload,
  });
  return res.data;
};

const updateVolcSummary = async (
  meetingId: number,
  payload: VolcMeetingSummaryPayload,
): Promise<VolcMeetingSummary> => {
  const res = await request<ApiResponse<VolcMeetingSummary>>(`/api/minutes/volc/${meetingId}/summary`, {
    method: 'PUT',
    data: { ...payload, meeting_id: meetingId },
  });
  return res.data;
};

const createVolcTodo = async (
  meetingId: number,
  payload: VolcMeetingTodoPayload,
): Promise<VolcMeetingTodo> => {
  const res = await request<ApiResponse<VolcMeetingTodo>>(`/api/minutes/volc/${meetingId}/todos`, {
    method: 'POST',
    data: { ...payload, meeting_id: meetingId },
  });
  return res.data;
};

const updateVolcTodo = async (
  meetingId: number,
  todoId: number,
  payload: VolcMeetingTodoPayload,
): Promise<VolcMeetingTodo> => {
  const res = await request<ApiResponse<VolcMeetingTodo>>(
    `/api/minutes/volc/${meetingId}/todos/${todoId}`,
    {
      method: 'PUT',
      data: { ...payload, meeting_id: meetingId },
    },
  );
  return res.data;
};

const deleteVolcTodo = async (meetingId: number, todoId: number): Promise<void> => {
  await request<ApiResponse<null>>(`/api/minutes/volc/${meetingId}/todos/${todoId}`, {
    method: 'DELETE',
  });
};

const listVolcMinutesSessions = async (meetingId: number): Promise<VolcMeetingMinutesSession[]> => {
  const res = await request<ApiResponse<VolcMeetingMinutesSession[]>>(`/api/minutes/volc/${meetingId}/sessions`, {
    method: 'GET',
  });
  return res?.data ?? [];
};

const getVolcMinutesSession = async (
  meetingId: number,
  sessionId: number,
): Promise<VolcMeetingMinutesSession> => {
  const res = await request<ApiResponse<VolcMeetingMinutesSession>>(
    `/api/minutes/volc/${meetingId}/sessions/${sessionId}`,
    {
      method: 'GET',
      // 会话删除/切换过程中详情可能短暂404，由页面逻辑自行处理，避免全局错误弹窗干扰。
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
    `/api/minutes/volc/${meetingId}/sessions/${sessionId}`,
    {
      method: 'PUT',
      data: payload,
    },
  );
  return res.data;
};

const deleteVolcMinutesSession = async (meetingId: number, sessionId: number): Promise<void> => {
  await request<ApiResponse<null>>(`/api/minutes/volc/${meetingId}/sessions/${sessionId}`, {
    method: 'DELETE',
  });
};

// ── 本地 Qwen3-ASR 会议纪要 Types ─────────────────────────────────────────────

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
  audio_status?: string | null;
  summary?: LocalMeetingSummary | null;
  todos: LocalMeetingTodo[];
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

// ── 本地 Qwen3-ASR API 函数 ───────────────────────────────────────────────────

const getLocalMinutes = async (meetingId: number): Promise<LocalMeetingMinutes> => {
  const res = await request<ApiResponse<LocalMeetingMinutes>>(`/api/minutes/local/${meetingId}`, {
    method: 'GET',
  });
  return res?.data ?? { transcript_text: null, stream_transcript_text: null, audio_status: null, summary: null, todos: [] };
};

const generateLocalMinutes = async (meetingId: number): Promise<LocalMeetingMinutes> => {
  const res = await request<ApiResponse<LocalMeetingMinutes>>(`/api/minutes/local/${meetingId}/generate`, {
    method: 'POST',
    skipErrorHandler: true,
  });
  return res?.data ?? { transcript_text: null, stream_transcript_text: null, audio_status: null, summary: null, todos: [] };
};

const uploadLocalAudio = async (meetingId: number, file: File): Promise<LocalMeetingAudioRecord> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await request<ApiResponse<LocalMeetingAudioRecord>>(`/api/minutes/local/${meetingId}/upload`, {
    method: 'POST',
    data: formData,
    requestType: 'form',
  });
  return res.data;
};

const updateLocalSummary = async (
  meetingId: number,
  payload: LocalMeetingSummaryPayload,
): Promise<LocalMeetingSummary> => {
  const res = await request<ApiResponse<LocalMeetingSummary>>(
    `/api/minutes/local/${meetingId}/summary`,
    { method: 'PUT', data: { ...payload, meeting_id: meetingId } },
  );
  return res.data;
};

const createLocalTodo = async (
  meetingId: number,
  payload: LocalMeetingTodoPayload,
): Promise<LocalMeetingTodo> => {
  const res = await request<ApiResponse<LocalMeetingTodo>>(
    `/api/minutes/local/${meetingId}/todos`,
    { method: 'POST', data: { ...payload, meeting_id: meetingId } },
  );
  return res.data;
};

const updateLocalTodo = async (
  meetingId: number,
  todoId: number,
  payload: LocalMeetingTodoPayload,
): Promise<LocalMeetingTodo> => {
  const res = await request<ApiResponse<LocalMeetingTodo>>(
    `/api/minutes/local/${meetingId}/todos/${todoId}`,
    { method: 'PUT', data: { ...payload, meeting_id: meetingId } },
  );
  return res.data;
};

const deleteLocalTodo = async (meetingId: number, todoId: number): Promise<void> => {
  await request<ApiResponse<null>>(`/api/minutes/local/${meetingId}/todos/${todoId}`, { method: 'DELETE' });
};

const listLocalMinutesSessions = async (meetingId: number): Promise<LocalMeetingMinutesSession[]> => {
  const res = await request<ApiResponse<LocalMeetingMinutesSession[]>>(`/api/minutes/local/${meetingId}/sessions`, {
    method: 'GET',
  });
  return res?.data ?? [];
};

const getLocalMinutesSession = async (
  meetingId: number,
  sessionId: number,
): Promise<LocalMeetingMinutesSession> => {
  const res = await request<ApiResponse<LocalMeetingMinutesSession>>(
    `/api/minutes/local/${meetingId}/sessions/${sessionId}`,
    { method: 'GET' },
  );
  return res.data;
};

const updateLocalMinutesSession = async (
  meetingId: number,
  sessionId: number,
  payload: LocalMeetingMinutesSessionUpdatePayload,
): Promise<LocalMeetingMinutesSession> => {
  const res = await request<ApiResponse<LocalMeetingMinutesSession>>(
    `/api/minutes/local/${meetingId}/sessions/${sessionId}`,
    {
      method: 'PUT',
      data: payload,
    },
  );
  return res.data;
};

const deleteLocalMinutesSession = async (meetingId: number, sessionId: number): Promise<void> => {
  await request<ApiResponse<null>>(`/api/minutes/local/${meetingId}/sessions/${sessionId}`, {
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
  // 本地 Qwen3-ASR
  getLocalMinutes,
  generateLocalMinutes,
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

export const getMinutesDocxUrl = (meetingId: number) =>
  `/api/minutes/insights/export/docx/${meetingId}`;

export default meetingMinutesApi;
