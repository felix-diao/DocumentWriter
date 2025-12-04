import { request } from '@umijs/max';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface MeetingPayload {
  title: string;
  date: string;
  location?: string;
  host?: string;
  participants?: string;
  content_text?: string;
  meeting_url?: string;
  status?: string;
}

export interface Meeting extends MeetingPayload {
  id: number;
  creator_id?: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingFile {
  id: number;
  meeting_id: number;
  filename: string;
  file_type: string;
  file_path?: string;
  uploaded_at: string;
}

export interface MeetingAudio {
  id: number;
  meeting_id: number;
  filename: string;
  file_type: string;
  file_path?: string;
  transcript_text?: string;
  language?: string;
  status?: string;
  error_msg?: string | null;
  uploaded_at: string;
}

const listMeetings = async (): Promise<Meeting[]> => {
  const res = await request<ApiResponse<Meeting[]>>('/api/meetings', {
    method: 'GET',
  });
  return res?.data ?? [];
};

const getMeetingDetail = async (meetingId: number): Promise<Meeting> => {
  const res = await request<ApiResponse<Meeting>>(`/api/meetings/${meetingId}`, {
    method: 'GET',
  });
  return res.data;
};

const createMeeting = async (payload: MeetingPayload): Promise<Meeting> => {
  const res = await request<ApiResponse<Meeting>>('/api/meetings', {
    method: 'POST',
    data: payload,
  });
  return res.data;
};

const updateMeeting = async (meetingId: number, payload: MeetingPayload): Promise<Meeting> => {
  const res = await request<ApiResponse<Meeting>>(`/api/meetings/${meetingId}`, {
    method: 'PUT',
    data: payload,
  });
  return res.data;
};

const deleteMeeting = async (meetingId: number): Promise<void> => {
  await request<ApiResponse<null>>(`/api/meetings/${meetingId}`, {
    method: 'DELETE',
  });
};

const listFiles = async (meetingId: number): Promise<MeetingFile[]> => {
  const res = await request<ApiResponse<MeetingFile[]>>(`/api/meetings/files/${meetingId}`, {
    method: 'GET',
  });
  return res?.data ?? [];
};

const uploadFiles = async (meetingId: number, files: File[]): Promise<MeetingFile[]> => {
  const formData = new FormData();
  files.forEach((file) => formData.append('uploaded_files', file));
  const res = await request<ApiResponse<MeetingFile[]>>(`/api/meetings/files/${meetingId}`, {
    method: 'POST',
    data: formData,
    requestType: 'form',
  });
  return res?.data ?? [];
};

const deleteFile = async (meetingId: number, fileId: number): Promise<void> => {
  await request<ApiResponse<null>>(`/api/meetings/files/${meetingId}/${fileId}`, {
    method: 'DELETE',
  });
};

const listAudios = async (meetingId: number): Promise<MeetingAudio[]> => {
  const res = await request<ApiResponse<MeetingAudio[]>>(`/api/meetings/audio/${meetingId}`, {
    method: 'GET',
  });
  return res?.data ?? [];
};

const uploadAudios = async (meetingId: number, files: File[]): Promise<MeetingAudio[]> => {
  const formData = new FormData();
  files.forEach((file) => formData.append('uploaded_files', file));
  const res = await request<ApiResponse<MeetingAudio[]>>(`/api/meetings/audio/${meetingId}`, {
    method: 'POST',
    data: formData,
    requestType: 'form',
  });
  return res?.data ?? [];
};

const deleteAudio = async (meetingId: number, audioId: number): Promise<void> => {
  await request<ApiResponse<null>>(`/api/meetings/audio/${meetingId}/${audioId}`, {
    method: 'DELETE',
  });
};

export const meetingFileDownloadUrl = (meetingId: number, fileId: number) =>
  `/api/meetings/files/download/${meetingId}/${fileId}`;

export const meetingAudioDownloadUrl = (meetingId: number, audioId: number) =>
  `/api/meetings/audio/download/${meetingId}/${audioId}`;

export const meetingsApi = {
  list: listMeetings,
  detail: getMeetingDetail,
  create: createMeeting,
  update: updateMeeting,
  remove: deleteMeeting,
  listFiles,
  uploadFiles,
  deleteFile,
  listAudios,
  uploadAudios,
  deleteAudio,
};

export default meetingsApi;
