import { request } from '@umijs/max';

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
};

export const getMinutesDocxUrl = (meetingId: number) =>
  `/api/minutes/insights/export/docx/${meetingId}`;

export default meetingMinutesApi;
