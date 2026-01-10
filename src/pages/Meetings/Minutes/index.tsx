import {
  AudioOutlined,
  CloudUploadOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
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
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { history, useLocation } from '@umijs/max';
import meetingsApi, {
  Meeting,
  MeetingAudio,
  MeetingFile,
  VolcMeetingAudio,
} from '@/services/meetings';
import meetingMinutesApi, {
  ActionItemPayload,
  DecisionItemPayload,
  MeetingActionItem,
  MeetingDecisionItem,
  MeetingInsights,
  VolcMeetingMinutes,
  VolcMeetingTodo,
} from '@/services/meetingMinutes';

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

const actionStatusOptions = [
  { value: 'pending', label: '待跟进', color: 'default' },
  { value: 'in_progress', label: '处理中', color: 'blue' },
  { value: 'completed', label: '已完成', color: 'green' },
  { value: 'blocked', label: '受阻', color: 'red' },
];

const MeetingMinutes: React.FC = () => {
  const location = useLocation();
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
  const [volcSummaryTitle, setVolcSummaryTitle] = useState('');
  const [volcSummaryDraft, setVolcSummaryDraft] = useState('');
  const [savingVolcSummary, setSavingVolcSummary] = useState(false);
  const [volcTodoModalVisible, setVolcTodoModalVisible] = useState(false);
  const [editingVolcTodo, setEditingVolcTodo] = useState<VolcMeetingTodo | null>(null);
  const [volcTodoForm] = Form.useForm<VolcTodoFormValues>();
  const [savingVolcTodo, setSavingVolcTodo] = useState(false);

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

  const loadVolcAudioList = async (meetingId: number) => {
    setLoadingVolcAudios(true);
    try {
      const list = await meetingsApi.listVolcAudios(meetingId);
      setVolcAudios(list);
      if (selectedVolcAudioId && !list.find((item) => item.id === selectedVolcAudioId)) {
        setSelectedVolcAudioId(null);
      }
    } catch (error: any) {
      message.warning(error?.message || '加载火山音频失败');
    } finally {
      setLoadingVolcAudios(false);
    }
  };

  const loadVolcMinutesData = async (meetingId: number, showToast = false) => {
    setLoadingVolcMinutes(true);
    try {
      const result = await meetingMinutesApi.getVolcMinutes(meetingId);
      setVolcMinutes(result);
      setVolcSummaryTitle(result.summary?.title || '');
      setVolcSummaryDraft(result.summary?.paragraph || '');
      if (showToast) {
        if (result.summary || result.todos.length) {
          message.success('已刷新火山纪要');
        } else {
          message.info('火山纪要尚未生成');
        }
      }
    } catch (error: any) {
      message.error(error?.message || '获取火山纪要失败');
      setVolcMinutes(null);
      setVolcSummaryTitle('');
      setVolcSummaryDraft('');
    } finally {
      setLoadingVolcMinutes(false);
    }
  };

  useEffect(() => {
    if (typeof selectedMeetingId === 'number') {
      loadInsights(selectedMeetingId);
      loadAssets(selectedMeetingId);
      setSelectedFileIds([]);
      setSelectedAudioIds([]);
      loadVolcAudioList(selectedMeetingId);
      loadVolcMinutesData(selectedMeetingId);
    } else {
      setInsights(null);
      setAvailableFiles([]);
      setAvailableAudios([]);
      setVolcAudios([]);
      setVolcMinutes(null);
      setSelectedVolcAudioId(null);
      setVolcSummaryTitle('');
      setVolcSummaryDraft('');
      stopRecordingTimer();
      if (recording) stopRecording();
    }
    return () => {
      stopRecordingTimer();
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedMeetingId]);

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

  const handleSubmitVolcMinutes = async () => {
    if (!selectedVolcAudioId) {
      message.warning('请选择要提交的火山音频');
      return;
    }
    setSubmittingVolcMinutes(true);
    try {
      await meetingMinutesApi.submitVolcAudio(selectedVolcAudioId);
      message.success('音频已提交至火山纪要');
      message.info('稍后请刷新纪要');
      if (selectedMeetingId) {
        loadVolcAudioList(selectedMeetingId);
        loadVolcMinutesData(selectedMeetingId);
      }
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
    if (!volcSummaryDraft.trim()) {
      message.warning('请填写会议摘要内容');
      return;
    }
    setSavingVolcSummary(true);
    try {
      const summary = await meetingMinutesApi.updateVolcSummary(selectedMeetingId, {
        meeting_id: selectedMeetingId,
        paragraph: volcSummaryDraft,
        title: volcSummaryTitle || undefined,
      });
      setVolcMinutes((prev) =>
        prev
          ? { ...prev, summary }
          : {
              summary,
              todos: [],
            },
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
        stream.getTracks().forEach((track) => track.stop());
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
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
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
            <Button icon={<AudioOutlined />} onClick={() => handleOpenRecordingModal('volc')} disabled={!hasSelectedMeeting}>
              在线录音
            </Button>
            <Button icon={<CloudUploadOutlined />} disabled={!hasSelectedMeeting} onClick={() => openUploadAudioModal('volc')}>
              上传录音
            </Button>
            <Button icon={<ReloadOutlined />} disabled={!selectedMeetingId} onClick={handleRefreshVolcMinutes}>
              刷新纪要
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
            message="火山纪要（字节 API）"
            description="录音、上传与本地模式完全隔离，选择音频提交后可获取会议摘要与待办事项。"
          />
          <ProCard
            title="火山音频列表"
            style={{ marginBottom: 16 }}
            extra={
              <Space>
                <Button icon={<ReloadOutlined />} onClick={handleRefreshVolcAudios}>
                  刷新音频
                </Button>
                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  disabled={!selectedVolcAudioId}
                  loading={submittingVolcMinutes}
                  onClick={handleSubmitVolcMinutes}
                >
                  提交火山纪要
                </Button>
              </Space>
            }
          >
            <Table<VolcMeetingAudio>
              rowKey="id"
              size="small"
              dataSource={volcAudios}
              columns={volcAudioColumns}
              pagination={false}
              loading={loadingVolcAudios}
              locale={{ emptyText: '暂无火山音频' }}
              rowSelection={volcAudioRowSelection}
            />
          </ProCard>

          <ProCard
            title="火山纪要结果"
            extra={
              <Button icon={<ReloadOutlined />} onClick={handleRefreshVolcMinutes}>
                刷新纪要
              </Button>
            }
          >
            <ProCard split="vertical" gutter={16}>
              <ProCard
                title="会议摘要"
                extra={
                  <Button type="link" onClick={handleSaveVolcSummary} loading={savingVolcSummary} disabled={!selectedMeetingId}>
                    保存会议摘要
                  </Button>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Input
                    placeholder="请输入会议摘要标题（可选）"
                    value={volcSummaryTitle}
                    onChange={(e) => setVolcSummaryTitle(e.target.value)}
                    allowClear
                  />
                  <TextArea
                    rows={6}
                    placeholder="请输入会议摘要内容"
                    value={volcSummaryDraft}
                    onChange={(e) => setVolcSummaryDraft(e.target.value)}
                  />
                  {volcMinutes?.summary?.source_audio_id && (
                    <Text type="secondary">来源音频 ID：{volcMinutes.summary.source_audio_id}</Text>
                  )}
                  {!volcMinutes?.summary && (
                    <Text type="secondary">尚未生成会议摘要，可手动编写并保存。</Text>
                  )}
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
            </ProCard>
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
    </PageContainer>
  );
};

export default MeetingMinutes;
