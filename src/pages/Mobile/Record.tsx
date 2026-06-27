import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NavBar, Toast } from 'antd-mobile';
import { useParams, history } from 'umi';
import { withAppBase } from '@/utils/appPath';
import { request } from '@umijs/max';
import { useWakeLock } from '@/hooks/useWakeLock';
import { PauseOutlined, CaretRightOutlined, StopOutlined } from '@ant-design/icons';

const getToken = (): string => {
  return localStorage.getItem('access_token') || '';
};

const WS_RECONNECT_DELAYS_MS = [1000, 2000, 4000];
const WS_CONNECT_TIMEOUT_MS = 8000;
const MAX_PENDING_AUDIO_CHUNKS = 120;
const INTERRUPTED_FINALIZE_DELAY_MS = 120000;

const RecordPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const meetingId = parseInt(id || '0', 10);
  const provider = localStorage.getItem(`meeting_provider_${meetingId}`) || 'local';

  // 屏幕常亮：在用户点击开始录音时申请，离开页面自动释放
  const { request: requestWakeLock } = useWakeLock();

  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  interface TranscriptPart {
    text: string;
    speaker?: string;
  }
  const [transcriptParts, setTranscriptParts] = useState<TranscriptPart[]>([]);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'recording' | 'uploading' | 'error'>('idle');
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const committedTextRef = useRef('');   // 已 final 的文本累积，跨 session 保留
  const recordingSessionIdRef = useRef<string>(''); // 一次连续录音的标识，断连重连复用
  const currentTranscriptRef = useRef(''); // 当前实时行文本的同步 ref
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef(0);
  const pausedRef = useRef(false);
  const stoppingRef = useRef(false);
  const recordingRef = useRef(false);
  const interruptedRef = useRef(false);
  const lastProcessTimeRef = useRef(Date.now());
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectingRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const pendingAudioChunksRef = useRef<ArrayBuffer[]>([]);
  const interruptedFinalizeTimerRef = useRef<number | null>(null);
  const autoFinalizingRef = useRef(false);
  const backConfirmOnConfirmRef = useRef<(() => void) | null>(null);

  // 把 transcript state 同步到 ref，方便在 WebSocket 回调里读到最新值
  useEffect(() => {
    currentTranscriptRef.current = transcript;
  }, [transcript]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const buildWsUrl = useCallback(() => {
    const token = getToken();
    // 开发环境：通过环境变量直连后端（如 wss://localhost:8080�?
    // 生产环境：自动跟随当前页面域名和协议
    // umi define �? JSON.stringify 会给字符串加引号，需去掉
    const wsBaseUrl = (process.env.WS_BASE_URL || '').replace(/^["']|["']$/g, '');

    if (wsBaseUrl) {
      const basePath = provider === 'volc'
        ? `/api/meetings/minutes/volc/${meetingId}/live`
        : `/api/meetings/minutes/local/${meetingId}/live`;
      return `${wsBaseUrl}${basePath}?token=${encodeURIComponent(token)}`;
    }

    // 生产环境自动检测：走 nginx 的 /agent_officea/api 前缀。
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const basePath = provider === 'volc'
      ? `/api/meetings/minutes/volc/${meetingId}/live`
      : `/api/meetings/minutes/local/${meetingId}/live`;
    const sameOriginPath = `/agent_officea${basePath}`;
    return `${protocol}//${host}${sameOriginPath}?token=${encodeURIComponent(token)}`;
  }, [meetingId, provider]);

  const flushCurrentTranscript = () => {
    // 断连或暂停时，把当前未 final 的 partial 文本落袋，避免丢失
    setTranscript(prev => {
      if (prev && !transcriptParts.some(p => p.text === prev)) {
        setTranscriptParts(parts => [...parts, { text: prev }]);
        committedTextRef.current += prev;
      }
      return '';
    });
  };

  const handleWsMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'partial') {
        // 实时行展示完整 accumulated（历史 + 当前草稿），保持连贯
        setTranscript(data.accumulated || data.text || '');
      }
      if (data.type === 'final' && data.text) {
        // 只把当前 final 这句落袋；实时行里的 accumulated 是预览，不要整段 flush
        setTranscriptParts(prev => [...prev, { text: data.text, speaker: data.speaker }]);
        committedTextRef.current += data.text;
        // final 后实时行保持为最新 accumulated，避免空一下
        setTranscript(data.accumulated || '');
      }
      if (data.type === 'completed') {
        Toast.show({ icon: 'success', content: '录音总结已生成' });
      }
      if (data.type === 'error') {
        Toast.show({ icon: 'fail', content: data.message || '处理失败' });
      }
    } catch {
      // ignore
    }
  };

  const flushPendingAudioChunks = (ws: WebSocket) => {
    const pendingChunks = pendingAudioChunksRef.current;

    while (
      pendingChunks.length > 0 &&
      ws.readyState === WebSocket.OPEN
    ) {
      const chunk = pendingChunks[0];

      try {
        ws.send(chunk);
        pendingChunks.shift();
      } catch (error) {
        console.warn('发送缓存音频失败:', error);
        break;
      }
    }
  };

  function setupWebSocket(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const wsUrl = buildWsUrl();
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';

      let settled = false;

      const rejectConnection = (error: unknown) => {
        if (settled) return;

        settled = true;
        window.clearTimeout(connectTimeout);

        reject(
          error instanceof Error
            ? error
            : new Error('WebSocket 连接失败'),
        );
      };

      const connectTimeout = window.setTimeout(() => {
        rejectConnection(
          new Error('WebSocket 连接超时'),
        );
        ws.close();
      }, WS_CONNECT_TIMEOUT_MS);

      ws.onopen = () => {
        if (settled) {
          ws.close();
          return;
        }

        try {
          ws.send(JSON.stringify({
            action: 'config',
            rate: 16000,
            channels: 1,
            recording_session_id: recordingSessionIdRef.current,
          }));

          wsRef.current = ws;
          flushPendingAudioChunks(ws);

          settled = true;
          window.clearTimeout(connectTimeout);
          resolve(ws);
        } catch (error) {
          rejectConnection(error);
          ws.close();
        }
      };

      ws.onmessage = handleWsMessage;

      ws.onerror = (event: Event) => {
        console.error('WS error:', event);
        rejectConnection(
          new Error('WebSocket 连接异常'),
        );
      };

      ws.onclose = (event: CloseEvent) => {
        console.log(
          'WS closed:',
          event.code,
          event.reason,
        );

        if (wsRef.current === ws) {
          wsRef.current = null;
        }

        rejectConnection(
          new Error('WebSocket 连接已关闭'),
        );

        if (
          recordingRef.current &&
          !stoppingRef.current &&
          !interruptedRef.current
        ) {
          if (provider === 'volc') {
            void reconnectWebSocket();
          } else {
            autoPause('连接断开');
          }
        }
      };
    });
  }

  async function reconnectWebSocket(): Promise<void> {
    if (
      reconnectingRef.current ||
      !recordingRef.current ||
      stoppingRef.current ||
      interruptedRef.current
    ) {
      return;
    }

    reconnectingRef.current = true;
    reconnectAttemptRef.current = 0;
    setStatus('connecting');

    // 保存断线前尚未 final 的实时文字。
    // transcriptParts 和 committedTextRef 不清空。
    flushCurrentTranscript();

    Toast.show({
      content: '连接中断，正在自动重连',
    });

    for (
      let index = 0;
      index < WS_RECONNECT_DELAYS_MS.length;
      index += 1
    ) {
      const attempt = index + 1;
      const delayMs = WS_RECONNECT_DELAYS_MS[index];

      reconnectAttemptRef.current = attempt;

      await new Promise<void>(resolve => {
        window.setTimeout(resolve, delayMs);
      });

      if (
        !recordingRef.current ||
        stoppingRef.current ||
        interruptedRef.current
      ) {
        reconnectingRef.current = false;
        return;
      }

      try {
        await setupWebSocket();

        reconnectingRef.current = false;
        reconnectAttemptRef.current = 0;
        setStatus('recording');
        startWatchdog();

        Toast.show({
          icon: 'success',
          content: '连接已恢复，继续录音',
        });
        return;
      } catch (error) {
        console.warn(
          `WS 第 ${attempt} 次重连失败:`,
          error,
        );
      }
    }

    reconnectingRef.current = false;
    reconnectAttemptRef.current = 0;

    autoPause('自动重连失败');
  }

  const startWatchdog = () => {
    stopWatchdog();
    lastProcessTimeRef.current = Date.now();
    watchdogRef.current = window.setInterval(() => {
      if (recordingRef.current && !pausedRef.current && !interruptedRef.current) {
        if (Date.now() - lastProcessTimeRef.current > 8000) {
          console.warn('watchdog: audio process timeout');
          autoPause('音频中断');
        }
      }
    }, 1000);
  };

  const stopWatchdog = () => {
    if (watchdogRef.current) {
      clearInterval(watchdogRef.current);
      watchdogRef.current = null;
    }
  };

  const startHeartbeat = () => {
    stopHeartbeat();

    const sendHeartbeat = () => {
      if (
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN
      ) {
        wsRef.current.send(
          JSON.stringify({
            action: 'heartbeat',
          }),
        );
      }
    };

    // 暂停后立即发送一次，之后每 30 秒发送一次。
    sendHeartbeat();

    heartbeatRef.current = window.setInterval(
      sendHeartbeat,
      30000,
    );
  };

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  const clearInterruptedFinalizeTimer = () => {
    if (interruptedFinalizeTimerRef.current !== null) {
      window.clearTimeout(interruptedFinalizeTimerRef.current);
      interruptedFinalizeTimerRef.current = null;
    }
  };

  const closeWebSocketWithoutStop = () => {
    const ws = wsRef.current;

    if (ws) {
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;

      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
    }

    wsRef.current = null;
  };

  const finalizeInterruptedRecording = async (reason: string) => {
    if (
      autoFinalizingRef.current ||
      stoppingRef.current ||
      !recordingSessionIdRef.current
    ) {
      return;
    }

    autoFinalizingRef.current = true;
    stoppingRef.current = true;
    recordingRef.current = false;
    interruptedRef.current = false;

    flushCurrentTranscript();
    clearInterruptedFinalizeTimer();
    stopHeartbeat();
    stopWatchdog();
    stopTimer();
    stopAudioCapture();
    closeWebSocketWithoutStop();
    setRecording(false);
    pausedRef.current = false;
    setPaused(false);
    setStatus('uploading');

    localStorage.setItem(
      `meeting_minutes_status_${meetingId}`,
      'processing',
    );

    try {
      // 给后端一点时间感知 WS 关闭并保存当前 session 的已有音频。
      await new Promise<void>(resolve => {
        window.setTimeout(resolve, 3000);
      });

      const finalRes = await request(
        `/api/meetings/minutes/volc/${meetingId}/finalize-and-generate`,
        {
          method: 'POST',
          data: {
            recording_session_id: recordingSessionIdRef.current,
          },
        },
      );

      const resultStatus = finalRes?.data?.status;

      if (resultStatus === 'failed_no_audio') {
        throw new Error('没有可用录音，无法生成会议纪要');
      }

      Toast.show({
        icon: 'success',
        content: '录音已自动收尾，会议纪要开始生成',
      });

      history.push('/mobile/meetings');
    } catch (error) {
      console.error('异常中断自动收尾失败:', reason, error);
      localStorage.setItem(
        `meeting_minutes_status_${meetingId}`,
        'failed',
      );
      setStatus('error');
      Toast.show({
        icon: 'fail',
        content: '异常中断自动收尾失败',
      });
    } finally {
      autoFinalizingRef.current = false;
      stoppingRef.current = false;
    }
  };

  const scheduleInterruptedFinalize = (reason: string) => {
    clearInterruptedFinalizeTimer();

    if (provider !== 'volc') {
      return;
    }

    interruptedFinalizeTimerRef.current = window.setTimeout(() => {
      void finalizeInterruptedRecording(reason);
    }, INTERRUPTED_FINALIZE_DELAY_MS);
  };

  const stopAudioCapture = () => {
    stopWatchdog();
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const autoPause = (reason: string) => {
    if (!recordingRef.current || interruptedRef.current) return;
    console.log('autoPause:', reason);
    interruptedRef.current = true;
    pausedRef.current = true;
    setPaused(true);
    flushCurrentTranscript();  // 断连前把当前 partial 落袋
    stopAudioCapture();
    startHeartbeat();  // 暂停期间持续心跳，保持 WS 存活
    stopTimer();
    scheduleInterruptedFinalize(reason);
    Toast.show({ icon: 'fail', content: '录音已暂停，点击继续' });
  };

  const resumeFromInterruption = async () => {
    try {
      clearInterruptedFinalizeTimer();
      stopHeartbeat();
      // 1. 确保 WebSocket 连接
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        await setupWebSocket();
      }

      // 2. 重新获取麦克风并初始化音频
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      await startAudioCapture(stream);

      // 3. 恢复状态
      interruptedRef.current = false;
      pausedRef.current = false;
      setPaused(false);
      startWatchdog();
      startTimer(false);
      Toast.show({ content: '已恢复录音' });
    } catch (err: any) {
      console.error('resume failed:', err);
      setStatus('error');
      Toast.show({ icon: 'fail', content: err.message || '恢复录音失败' });
    }
  };

  const startRecording = async () => {
    clearInterruptedFinalizeTimer();
    autoFinalizingRef.current = false;
    stoppingRef.current = false;
    interruptedRef.current = false;
    // 每次开始新的连续录音，生成新的 recording_session_id
    recordingSessionIdRef.current = crypto.randomUUID();

    setStatus('connecting');
    try {
      // 用户手势触发屏幕常亮（iOS 必须在用户操作后调用）
      await requestWakeLock();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      await setupWebSocket();

      setStatus('recording');
      setRecording(true);
      recordingRef.current = true;
      pausedRef.current = false;
      setPaused(false);
      await startAudioCapture(stream);
      startTimer();
      startWatchdog();
    } catch (err: any) {
      setStatus('error');
      Toast.show({ icon: 'fail', content: err.message || '启动录音失败' });
    }
  };

  const startAudioCapture = async (stream: MediaStream) => {
    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;

    // iOS Safari 需要 resume
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const source = audioContext.createMediaStreamSource(stream);
    sourceRef.current = source;

    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    let sendCount = 0;

    processor.onaudioprocess = (event) => {
      lastProcessTimeRef.current = Date.now();

      if (pausedRef.current) {
        return;
      }

      const input = event.inputBuffer.getChannelData(0);
      const pcm16 = float32ToInt16PCM(input);
      const audioChunk = pcm16.buffer.slice(0) as ArrayBuffer;
      const activeWs = wsRef.current;

      if (
        activeWs &&
        activeWs.readyState === WebSocket.OPEN
      ) {
        activeWs.send(audioChunk);
        sendCount += 1;

        if (sendCount <= 3) {
          Toast.show({
            content: `已发送音频块 #${sendCount}`,
            duration: 800,
          });
        }
        return;
      }

      if (reconnectingRef.current) {
        pendingAudioChunksRef.current.push(
          audioChunk,
        );

        if (
          pendingAudioChunksRef.current.length >
          MAX_PENDING_AUDIO_CHUNKS
        ) {
          pendingAudioChunksRef.current.shift();
        }
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    // 监听系统中断（如来电、通知抢占麦克风）
    const track = stream.getAudioTracks()[0];
    if (track) {
      track.onmute = () => {
        console.log('audio track muted');
        autoPause('麦克风被占用');
      };
      track.onended = () => {
        console.log('audio track ended');
        autoPause('麦克风中断');
      };
    }

    audioContext.onstatechange = async () => {
      console.log('audioContext state:', audioContext.state);
      if (
        recordingRef.current &&
        !pausedRef.current &&
        !interruptedRef.current
      ) {
        if (audioContext.state === 'interrupted' || audioContext.state === 'suspended') {
          try {
            await audioContext.resume();
            console.log('audioContext resume succeeded');
            return;
          } catch (resumeErr) {
            console.warn('audioContext resume failed:', resumeErr);
          }
          autoPause('音频上下文中断');
        }
      }
    };
  };

  const float32ToInt16PCM = (input: Float32Array): Int16Array => {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  };

  const startTimer = (reset = true) => {
    if (reset) {
      durationRef.current = 0;
      setDuration(0);
    }
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) {
        durationRef.current += 1;
        setDuration(durationRef.current);
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const togglePause = async () => {
    // 如果是中断导致的暂停，点击继续需要重新初始化
    if (interruptedRef.current && pausedRef.current) {
      await resumeFromInterruption();
      return;
    }

    const nextPaused = !pausedRef.current;

    pausedRef.current = nextPaused;
    setPaused(nextPaused);

    if (nextPaused) {
      // 手动暂停时没有 PCM，使用低频心跳保持 WS 存活。
      startHeartbeat();
    } else {
      // 继续录音后由 PCM 作为活跃信号。
      stopHeartbeat();
      lastProcessTimeRef.current = Date.now();
    }
  };

  const pauseRecording = () => {
    if (!recordingRef.current) return;
    if (pausedRef.current) return;

    pausedRef.current = true;
    setPaused(true);
    startHeartbeat();
  };

  const handleBackConfirm = (onConfirm?: (() => void) | unknown) => {
    console.log('[Record] handleBackConfirm called', { recording: recordingRef.current, exitConfirmVisible });
    if (exitConfirmVisible) return;

    // 未开始录音时直接返回会议列表
    if (!recordingRef.current) {
      console.log('[Record] not recording, go back to list');
      history.push('/mobile/meetings');
      return;
    }

    // 录音中点击返回，先暂停录音，再弹窗让用户选择
    console.log('[Record] recording, pause first then show modal');
    pauseRecording();
    backConfirmOnConfirmRef.current = typeof onConfirm === 'function' ? onConfirm : null;
    setExitConfirmVisible(true);
  };

  const handleBackConfirmOk = () => {
    console.log('[Record] exit confirm ok');
    setExitConfirmVisible(false);
    const onConfirm = backConfirmOnConfirmRef.current;
    backConfirmOnConfirmRef.current = null;
    if (typeof onConfirm === 'function') {
      onConfirm();
    } else {
      stopRecording();
    }
  };

  const handleBackConfirmCancel = () => {
    console.log('[Record] exit confirm cancel');
    setExitConfirmVisible(false);
    backConfirmOnConfirmRef.current = null;
    // 点击返回时已暂停，取消后保持暂停状态，用户可手动继续
  };

  const stopRecording = async (
    options: { autoGenerate?: boolean; redirect?: boolean } = {},
  ) => {
    const { autoGenerate = true, redirect = true } = options;

    flushCurrentTranscript();  // 结束前把最后未 final 的 partial 落袋

    if (autoGenerate) {
      localStorage.setItem(`meeting_minutes_status_${meetingId}`, 'processing');
    }

    if (stoppingRef.current) {
      return;
    }

    stoppingRef.current = true;
    recordingRef.current = false;
    interruptedRef.current = false;
    clearInterruptedFinalizeTimer();
    setStatus('uploading');
    stopWatchdog();
    stopHeartbeat();
    stopTimer();
    stopAudioCapture();

    // 等待后端 saving_audio 事件（转写已落 DB，约 2-5 秒）
    // 此时即可安全发起 POST /generate，不必等慢速 TOS 上传完成
    await new Promise<void>((resolve) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const ws = wsRef.current;
        let settled = false;
        let stopWaitTimer: number | undefined;

        const onMsg = (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (
              data.type === 'saving_audio' ||
              data.type === 'completed' ||
              data.type === 'error'
            ) {
              if (settled) return;
              settled = true;

              if (stopWaitTimer !== undefined) {
                window.clearTimeout(stopWaitTimer);
              }

              ws.removeEventListener('message', onMsg);
              ws.close();
              wsRef.current = null;
              resolve();
            }
          } catch {}
        };

        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ action: 'stop' }));

        // 最长等 10 秒兜底，超时也继续
        stopWaitTimer = window.setTimeout(() => {
          if (!settled) {
            settled = true;
            ws.removeEventListener('message', onMsg);
            ws.close();
            wsRef.current = null;
            resolve();
          }
        }, 10000);
      } else {
        wsRef.current = null;
        resolve();
      }
    });

    setRecording(false);
    pausedRef.current = false;
    setPaused(false);
    setStatus('idle');

    if (autoGenerate) {
      const statusKey = `meeting_minutes_status_${meetingId}`;

      // 后台发起生成请求，不阻塞跳转会议列表
      void (async () => {
        try {
          if (provider === 'volc') {
            const finalRes = await request(
              `/api/meetings/minutes/volc/${meetingId}/finalize-and-generate`,
              {
                method: 'POST',
                data: {
                  recording_session_id: recordingSessionIdRef.current,
                },
              },
            );

            const resultStatus = finalRes?.data?.status;

            if (resultStatus === 'failed_no_audio') {
              throw new Error('没有可用录音，无法生成会议纪要');
            }
          } else {
            // local provider：直接生成纪要
            await request(`/api/meetings/minutes/local/${meetingId}/generate`, {
              method: 'POST',
            });
          }
          Toast.show({ icon: 'success', content: '会议纪要已开始生成' });
        } catch (error) {
          console.error('自动生成会议纪要失败:', error);
          localStorage.setItem(statusKey, 'failed');
          Toast.show({ icon: 'fail', content: '会议纪要生成失败' });
        }
      })();
    }

    if (redirect) {
      history.push('/mobile/meetings');
    }
  };

  const cleanupRecordingOnPageLeave = () => {
    if (
      !recordingRef.current ||
      stoppingRef.current ||
      autoFinalizingRef.current
    ) {
      return;
    }

    console.log('[Record] page leave while recording, close ws without stop');

    recordingRef.current = false;
    interruptedRef.current = false;
    pausedRef.current = false;

    if (provider === 'volc' && recordingSessionIdRef.current) {
      localStorage.setItem(
        `meeting_minutes_status_${meetingId}`,
        'processing',
      );
    }

    clearInterruptedFinalizeTimer();
    stopHeartbeat();
    stopWatchdog();
    stopTimer();
    stopAudioCapture();
    closeWebSocketWithoutStop();
  };

  // 实时转写自动下滑
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: 'center' });
  }, [transcript, transcriptParts]);

  useEffect(() => {
    const handlePageHide = () => {
      cleanupRecordingOnPageLeave();
    };

    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      cleanupRecordingOnPageLeave();
    };
  }, []);

  // 拦截录音中的返回行为：企微返回 / 页面关闭提示
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (recordingRef.current) {
        e.preventDefault();
        e.returnValue = '是否结束当前录音并自动生成会议总结？';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const wx = (window as any).wx;
    const wxHistoryBackHandler = () => {
      if (recordingRef.current) {
        handleBackConfirm();
        return true;
      }
      return false;
    };
    if (wx && typeof wx.onHistoryBack === 'function') {
      wx.onHistoryBack(wxHistoryBackHandler);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (wx && typeof wx.onHistoryBack === 'function') {
        wx.onHistoryBack(() => false);
      }
    };
  }, []);

  // 拦截手机物理/虚拟返回键（非企微环境兜底）
  useEffect(() => {
    if (!recording) return;

    // 压入一个 guard state，使返回键触发 popstate 而不直接离开页面
    console.log('[Record] push popstate guard');
    window.history.pushState({ recordingGuard: true }, '', window.location.href);

    const handlePopState = () => {
      console.log('[Record] popstate fired', { recording: recordingRef.current });
      if (recordingRef.current) {
        // 延迟处理，避免与浏览器返回动画冲突导致卡顿
        setTimeout(() => {
          window.history.pushState({ recordingGuard: true }, '', window.location.href);
          handleBackConfirm();
        }, 0);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      console.log('[Record] remove popstate listener');
      window.removeEventListener('popstate', handlePopState);
    };
  }, [recording]);

  return (
    <div style={{ height: '100dvh', overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <NavBar onBack={handleBackConfirm}>
        {provider === 'local' ? '🔒 机密会议' : '💬 普通会议'}
      </NavBar>

      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 14, color: '#00bfa5', marginBottom: 8 }}>
          {status === 'connecting'
            ? '正在连接...'
            : status === 'uploading'
            ? '录音上传中...'
            : !recording
            ? '准备就绪'
            : paused
            ? '录音已暂停'
            : '正在录音转译中...'}
        </div>
        <div style={{ fontSize: 48, fontWeight: 'bold', fontFamily: 'monospace', color: '#333' }}>
          {formatTime(duration)}
        </div>
        {recording && !paused && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginTop: 12, height: 30 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 4,
                  borderRadius: 2,
                  background: '#00bfa5',
                  animation: `wave 0.8s ease-in-out ${i * 0.05}s infinite alternate`,
                }}
              />
            ))}
          </div>
        )}
        <style>{`
          @keyframes wave {
            0% { height: 8px; }
            100% { height: 28px; }
          }
        `}</style>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 120px' }} ref={transcriptContainerRef}>
        {transcriptParts.length === 0 && !transcript && (
          <div style={{ textAlign: 'center', color: '#ccc', paddingTop: 40 }}>
            {status === 'idle' ? '点击开始录音' : '等待转译内容...'}
          </div>
        )}

        {transcriptParts.map((part, idx) => (
          <div key={idx} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
              {part.speaker ? `${part.speaker} · ` : ''}
              {formatTime(Math.min((idx + 1) * 10, duration))}
            </div>
            <div style={{
              background: '#f5f6fa',
              borderRadius: 8,
              padding: 12,
              fontSize: 15,
              lineHeight: 1.6,
              color: '#333',
            }}>
              {part.text}
            </div>
          </div>
        ))}

        {transcript && !transcriptParts.some(p => p.text === transcript) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>实时</div>
            <div style={{
              background: '#f5f6fa',
              borderRadius: 8,
              padding: 12,
              fontSize: 15,
              lineHeight: 1.6,
              color: '#666',
              fontStyle: 'italic',
            }}>
              {transcript}
            </div>
          </div>
        )}
        <div ref={transcriptEndRef} style={{ height: '20vh' }} />
      </div>

      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '20px 0 40px',
        background: 'linear-gradient(transparent, rgba(255,255,255,0.9))',
        textAlign: 'center',
      }}>
        {!recording ? (
          <div>
            <button
              onClick={startRecording}
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: '#00bfa5',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,191,165,0.4)',
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 4, background: '#fff' }} />
            </button>
            <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>点击开始录音</div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
            <button
              onClick={togglePause}
              style={{ textAlign: 'center', border: 'none', background: 'none', padding: 0 }}
            >
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#f5f6fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #ddd',
              }}>
                {paused ? (
                  <CaretRightOutlined style={{ fontSize: 24, color: '#00bfa5' }} />
                ) : (
                  <PauseOutlined style={{ fontSize: 20, color: '#666' }} />
                )}
              </div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
                {paused ? '继续' : '暂停'}
              </div>
            </button>

            <button
              onClick={() => stopRecording()}
              style={{ textAlign: 'center', border: 'none', background: 'none', padding: 0 }}
            >
              <div style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: '#ff4d4f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(255,77,79,0.4)',
              }}>
                <StopOutlined style={{ fontSize: 28, color: '#fff' }} />
              </div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>结束录音</div>
            </button>
          </div>
        )}
      </div>
      {exitConfirmVisible && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleBackConfirmCancel();
            }
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 20,
              width: '100%',
              maxWidth: 300,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>提示</div>
            <div style={{ fontSize: 14, color: '#333', marginBottom: 20, lineHeight: 1.5 }}>
              是否结束当前录音并自动生成会议总结？
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleBackConfirmCancel}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 6,
                  border: '1px solid #ddd',
                  background: '#fff',
                  color: '#666',
                  fontSize: 14,
                }}
              >
                取消
              </button>
              <button
                onClick={handleBackConfirmOk}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 6,
                  border: 'none',
                  background: '#00bfa5',
                  color: '#fff',
                  fontSize: 14,
                }}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordPage;