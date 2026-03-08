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

const submitVolcMinutes = async (meetingId: number, audioId?: number): Promise<VolcMeetingAudio> => {
  const url = audioId != null
    ? `/api/minutes/volc/${meetingId}/submit?audio_id=${audioId}`
    : `/api/minutes/volc/${meetingId}/submit`;
  const res = await request<ApiResponse<VolcMeetingAudio>>(url, {
    method: 'POST',
  });
  return res.data;
};

const clearVolcMinutes = async (meetingId: number): Promise<void> => {
  await request<ApiResponse<null>>(`/api/minutes/volc/${meetingId}/clear`, {
    method: 'POST',
  });
};

const uploadVolcMinutesAudio = async (meetingId: number, file: File): Promise<VolcMeetingAudio> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await request<ApiResponse<VolcMeetingAudio>>(`/api/minutes/volc/${meetingId}/upload`, {
    method: 'POST',
    data: formData,
    requestType: 'form',
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
  clearVolcMinutes,
  uploadVolcMinutesAudio,
  updateVolcTranscript,
  updateVolcSummary,
  createVolcTodo,
  updateVolcTodo,
  deleteVolcTodo,
};

export const getMinutesDocxUrl = (meetingId: number) =>
  `/api/minutes/insights/export/docx/${meetingId}`;

export default meetingMinutesApi;
