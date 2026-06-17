import { useCallback, useEffect, useRef, useState } from 'react';

export function useWakeLock() {
  const wakeLockRef = useRef<any>(null);
  const noSleepRef = useRef<any>(null);
  const [active, setActive] = useState(false);

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // ignore
      }
      wakeLockRef.current = null;
    }
    if (noSleepRef.current) {
      try {
        await noSleepRef.current.disable();
      } catch {
        // ignore
      }
      noSleepRef.current = null;
    }
    setActive(false);
  }, []);

  const request = useCallback(async () => {
    // 先释放旧的，避免重复
    await release();

    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setActive(true);
      } else {
        const NoSleep = (await import('nosleep.js')).default;
        noSleepRef.current = new NoSleep();
        await noSleepRef.current.enable();
        setActive(true);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Wake lock request failed:', e);
      setActive(false);
    }
  }, [release]);

  // 切回前台时，如果之前是 active 状态，重新申请
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible' && active) {
        request();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [active, request]);

  // 组件卸载时释放
  useEffect(() => {
    return () => {
      release();
    };
  }, [release]);

  return { request, release, active };
}
