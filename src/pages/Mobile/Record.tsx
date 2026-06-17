import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NavBar, Toast } from 'antd-mobile';
import { useParams, history } from 'umi';
import { request } from '@umijs/max';
import { useWakeLock } from '@/hooks/useWakeLock';

const getToken = (): string => {
  return localStorage.getItem('access_token') || '';
};

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
  const [transcriptParts, setTranscriptParts] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'recording' | 'error'>('idle');

  const wsRef = useRef<WebSocket | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef(0);
  const pausedRef = useRef(false);
  const stoppingRef = useRef(false);
  
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

    // 生产环境自动检�?
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const basePath = provider === 'volc'
      ? `/api/meetings/minutes/volc/${meetingId}/live`
      : `/api/meetings/minutes/local/${meetingId}/live`;
    return `${protocol}//${host}${basePath}?token=${encodeURIComponent(token)}`;
  }, [meetingId, provider]);

  const startRecording = async () => {
    stoppingRef.current = false;

    setStatus('connecting');
    try {
      // 用户手势触发屏幕常亮（iOS 必须在用户操作后调用）
      await requestWakeLock();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const wsUrl = buildWsUrl();
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ action: 'config', rate: 16000, channels: 1 }));
        // 诊断：立即发送一个二进制测试消息
        const testData = new Int16Array(1024);
        for (let i = 0; i < 1024; i++) testData[i] = i % 32767;
        ws.send(testData.buffer);
        Toast.show({ content: '已发送测试音频块', duration: 1000 });
        setStatus('recording');
        setRecording(true);
        pausedRef.current = false;
        setPaused(false);
        startAudioCapture(stream, ws);
        startTimer();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'partial' || data.type === 'final') {
            const text = data.accumulated || data.text || '';
            setTranscript(text);
            if (data.type === 'final' && data.text) {
              setTranscriptParts(prev => [...prev, data.text]);
            }
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

      ws.onerror = (e: Event) => {
        console.error('WS error:', e);
        setStatus('error');
        Toast.show({ icon: 'fail', content: 'WebSocket 错误，查看控制台' });
      };

      ws.onclose = (e: CloseEvent) => {
        console.log('WS closed:', e.code, e.reason);
        Toast.show({ content: `连接断开: code=${e.code}`, duration: 2000 });
        setRecording(false);
        pausedRef.current = false;
        setPaused(false);
        stopTimer();
      };
    } catch (err: any) {
      setStatus('error');
      Toast.show({ icon: 'fail', content: err.message || '启动录音失败' });
    }
  };

  const startAudioCapture = async (stream: MediaStream, ws: WebSocket) => {
    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;

    // iOS Safari 需�? resume
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const source = audioContext.createMediaStreamSource(stream);
    sourceRef.current = source;

    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    let sendCount = 0;
    processor.onaudioprocess = (e) => {
      if (pausedRef.current || ws.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);
      const pcm16 = float32ToInt16PCM(input);
      ws.send(pcm16.buffer);
      sendCount++;
      if (sendCount <= 3) {
        Toast.show({ content: `已发送音频块 #${sendCount}`, duration: 800 });
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  };

  const float32ToInt16PCM = (input: Float32Array): Int16Array => {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  };

  const startTimer = () => {
    durationRef.current = 0;
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

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  const generateMinutesAfterRecording = async () => {
    const statusKey = `meeting_minutes_status_${meetingId}`;
    localStorage.setItem(statusKey, 'processing');

    const url =
      provider === 'volc'
        ? `/api/meetings/minutes/volc/${meetingId}/generate`
        : `/api/meetings/minutes/local/${meetingId}/generate`;

    await request(url, {
      method: 'POST',
    });
  };

  const stopRecording = async (
    options: { autoGenerate?: boolean; redirect?: boolean } = {},
  ) => {
    const { autoGenerate = true, redirect = true } = options;

    if (autoGenerate) {
      localStorage.setItem(`meeting_minutes_status_${meetingId}`, 'processing');
    }

    if (stoppingRef.current) {
      return;
    }

    stoppingRef.current = true;
    // 1. 先停止麦克风采集（释放硬件）
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
    stopTimer();

    // 2. 发�? stop，等待后�? completed/error（最�? 60 秒）
    await new Promise<void>((resolve) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const ws = wsRef.current;
        let settled = false;

        const onMsg = (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'completed' || data.type === 'error') {
              settled = true;
              ws.removeEventListener('message', onMsg);
              ws.close();
              wsRef.current = null;
              resolve();
            }
          } catch {}
        };

        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ action: 'stop' }));

        // 兜底�?60 秒后强制关闭
        setTimeout(() => {
          if (!settled) {
            ws.removeEventListener('message', onMsg);
            ws.close();
            wsRef.current = null;
            resolve();
          }
        }, 5000);
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

      void generateMinutesAfterRecording().catch((error) => {
        console.error('自动生成会议纪要失败:', error);
        localStorage.setItem(statusKey, 'failed');
      });

      Toast.show({ icon: 'success', content: '会议纪要已开始生成' });
    }

    if (redirect) {
      history.push('/mobile/meetings');
    }
  };


  // 实时转写自动下滑
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: 'center' });
  }, [transcript, transcriptParts]);

  useEffect(() => {
    return () => {
      stopRecording({ autoGenerate: false, redirect: false });
    };
  }, []);

  return (
    <div style={{ height: '100dvh', overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <NavBar onBack={() => history.push('/mobile/meetings')}>
        {provider === 'local' ? '🔒 机密会议' : '💬 普通会议'}
      </NavBar>

      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 14, color: '#00bfa5', marginBottom: 8 }}>
          {status === 'connecting' ? '正在连接...' : recording ? '正在录音转译中...' : '准备就绪'}
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
              {part}
            </div>
          </div>
        ))}

        {transcript && !transcriptParts.includes(transcript) && (
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
            <button onClick={togglePause} style={{ textAlign: 'center' }}>
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
                  <div style={{ width: 0, height: 0, borderLeft: '16px solid #00bfa5', borderTop: '10px solid transparent', borderBottom: '10px solid transparent', marginLeft: 4 }} />
                ) : (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div style={{ width: 4, height: 20, background: '#666', borderRadius: 2 }} />
                    <div style={{ width: 4, height: 20, background: '#666', borderRadius: 2 }} />
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
                {paused ? '继续' : '暂停'}
              </div>
            </button>

            <button onClick={() => stopRecording()} style={{ textAlign: 'center' }}>
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
                <div style={{ width: 24, height: 24, borderRadius: 4, background: '#fff' }} />
              </div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>点击结束录音</div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordPage;