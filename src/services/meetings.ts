import { request } from '@umijs/max';

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
  creator_id?: string | null;
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
  creator_id?: string | null;
  file_name: string;
  file_type?: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | string;
  audio_id?: number | null;
  error_msg?: string | null;
  audio?: MeetingAudioRecordRaw | null;
  created_at: string;
  updated_at: string;
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
  file_type?: string;
  file_path?: string;
  transcript_text?: string;
  language?: string;
  status?: string;
  error_msg?: string | null;
  uploaded_at: string;
}

export interface VolcMeetingAudio {
  id: number;
  meeting_id: number;
  provider?: 'volc';
  file_name: string;
  object_key: string;
  file_url: string;
  file_type?: string | null;
  status?: string | null;
  transcript_text?: string | null;
  task_id?: string | null;
  error_msg?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalMeetingAudio {
  id: number;
  meeting_id: number;
  provider?: 'local';
  file_name: string;
  object_key: string;
  file_url: string;
  file_type?: string | null;
  status?: string | null;
  transcript_text?: string | null;
  source_asr_session_id?: number | null;
  error_msg?: string | null;
  created_at: string;
  updated_at: string;
}

const MEETING_AUDIO_API_BASE = '/api/meetings/audio';
const UNSUPPORTED_MEETING_FILES_MESSAGE = '当前后端版本已移除会议文件接口';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeMeetingAudio = (raw: MeetingAudioRecordRaw): MeetingAudio => ({
  id: raw.id,
  meeting_id: raw.meeting_id,
  filename: raw.file_name || '未命名音频',
  file_type: raw.file_type || undefined,
  file_path: raw.file_url || undefined,
  transcript_text: raw.transcript_text || undefined,
  status: raw.status || undefined,
  error_msg: raw.error_msg || undefined,
  uploaded_at: raw.created_at,
});

const normalizeLocalAudio = (raw: MeetingAudioRecordRaw): LocalMeetingAudio => ({
  id: raw.id,
  meeting_id: raw.meeting_id,
  provider: 'local',
  file_name: raw.file_name || '未命名音频',
  object_key: raw.object_key || '',
  file_url: raw.file_url || '',
  file_type: raw.file_type || null,
  status: raw.status || null,
  transcript_text: raw.transcript_text || null,
  error_msg: raw.error_msg || null,
  created_at: raw.created_at,
  updated_at: raw.updated_at,
});

const normalizeVolcAudio = (raw: MeetingAudioRecordRaw): VolcMeetingAudio => ({
  id: raw.id,
  meeting_id: raw.meeting_id,
  provider: 'volc',
  file_name: raw.file_name || '未命名音频',
  object_key: raw.object_key || '',
  file_url: raw.file_url || '',
  file_type: raw.file_type || null,
  status: raw.status || null,
  transcript_text: raw.transcript_text || null,
  error_msg: raw.error_msg || null,
  created_at: raw.created_at,
  updated_at: raw.updated_at,
});

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

const listFiles = async (_meetingId: number): Promise<MeetingFile[]> => [];

const uploadFiles = async (_meetingId: number, _files: File[]): Promise<MeetingFile[]> => {
  throw new Error(UNSUPPORTED_MEETING_FILES_MESSAGE);
};

const deleteFile = async (_meetingId: number, _fileId: number): Promise<void> => {
  throw new Error(UNSUPPORTED_MEETING_FILES_MESSAGE);
};

const downloadBlob = async (url: string) => {
  const response: any = await request(url, {
    method: 'GET',
    responseType: 'blob',
    getResponse: true,
  });
  const headers = response?.response?.headers ?? response?.headers;
  const disposition =
    headers?.get?.('content-disposition') ??
    headers?.['content-disposition'] ??
    headers?.['Content-Disposition'];
  let filename = 'download';
  if (disposition) {
    const match = disposition.match(/filename\*?=(?:UTF-8'')?\"?([^\";]+)/i);
    if (match?.[1]) {
      filename = decodeURIComponent(match[1]);
    }
  }
  return { blob: response.data as Blob, filename };
};

const downloadMeetingFile = async (_meetingId: number, _fileId: number) => {
  throw new Error(UNSUPPORTED_MEETING_FILES_MESSAGE);
};

const listAudios = async (meetingId: number): Promise<MeetingAudio[]> => {
  const res = await request<ApiResponse<MeetingAudioRecordRaw[]>>(
    `${MEETING_AUDIO_API_BASE}/${meetingId}`,
    {
      method: 'GET',
      params: { provider: 'local' },
    },
  );
  return (res?.data ?? []).map(normalizeMeetingAudio);
};

const uploadAudios = async (meetingId: number, files: File[]): Promise<MeetingAudio[]> => {
  return Promise.all(
    files.map(async (file) => {
      const task = await createAudioUploadTask(meetingId, 'local', file);
      const latest = await pollAudioUploadTask(task.task_id);
      if (!latest.audio) {
        throw new Error('上传完成但未返回音频记录');
      }
      return normalizeMeetingAudio(latest.audio);
    }),
  );
};

const deleteAudio = async (meetingId: number, audioId: number): Promise<void> => {
  await request<ApiResponse<null>>(`${MEETING_AUDIO_API_BASE}/${meetingId}/${audioId}`, {
    method: 'DELETE',
    params: { provider: 'local' },
  });
};

const downloadMeetingAudio = async (meetingId: number, audioId: number) => {
  return downloadBlob(`${MEETING_AUDIO_API_BASE}/download/${meetingId}/${audioId}?provider=local`);
};

export const meetingFileDownloadUrl = (meetingId: number, fileId: number) =>
  `/api/meetings/files/download/${meetingId}/${fileId}`;

export const meetingAudioDownloadUrl = (meetingId: number, audioId: number) =>
  `${MEETING_AUDIO_API_BASE}/download/${meetingId}/${audioId}?provider=local`;

export const localAudioDirectDownloadUrl = (meetingId: number, audioId: number, token: string) =>
  `${MEETING_AUDIO_API_BASE}/direct-download/${meetingId}/${audioId}?provider=local&token=${encodeURIComponent(token)}`;

const listVolcAudios = async (meetingId: number): Promise<VolcMeetingAudio[]> => {
  const res = await request<ApiResponse<MeetingAudioRecordRaw[]>>(
    `${MEETING_AUDIO_API_BASE}/${meetingId}`,
    {
      method: 'GET',
      params: { provider: 'volc' },
    },
  );
  return (res?.data ?? []).map(normalizeVolcAudio);
};

const uploadVolcAudio = async (meetingId: number, file: File): Promise<VolcMeetingAudio> => {
  const task = await createAudioUploadTask(meetingId, 'volc', file);
  const latest = await pollAudioUploadTask(task.task_id);
  if (!latest.audio) {
    throw new Error('上传完成但未返回音频记录');
  }
  return normalizeVolcAudio(latest.audio);
};

const deleteVolcAudio = async (meetingId: number, audioId: number): Promise<void> => {
  await request<ApiResponse<VolcMeetingAudio>>(`${MEETING_AUDIO_API_BASE}/${meetingId}/${audioId}`, {
    method: 'DELETE',
    params: { provider: 'volc' },
  });
};

const downloadVolcAudio = async (meetingId: number, audioId: number) => {
  return downloadBlob(`${MEETING_AUDIO_API_BASE}/download/${meetingId}/${audioId}?provider=volc`);
};

const listLocalAudios = async (meetingId: number): Promise<LocalMeetingAudio[]> => {
  const res = await request<ApiResponse<MeetingAudioRecordRaw[]>>(
    `${MEETING_AUDIO_API_BASE}/${meetingId}`,
    {
      method: 'GET',
      params: { provider: 'local' },
    },
  );
  return (res?.data ?? []).map(normalizeLocalAudio);
};

const deleteLocalAudio = async (meetingId: number, audioId: number): Promise<void> => {
  await request<ApiResponse<LocalMeetingAudio>>(`${MEETING_AUDIO_API_BASE}/${meetingId}/${audioId}`, {
    method: 'DELETE',
    params: { provider: 'local' },
  });
};

const downloadLocalAudio = async (meetingId: number, audioId: number) => {
  return downloadBlob(`${MEETING_AUDIO_API_BASE}/download/${meetingId}/${audioId}?provider=local`);
};

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
  downloadMeetingFile,
  downloadMeetingAudio,
  listVolcAudios,
  uploadVolcAudio,
  deleteVolcAudio,
  downloadVolcAudio,
  listLocalAudios,
  deleteLocalAudio,
  downloadLocalAudio,
};

export default meetingsApi;
