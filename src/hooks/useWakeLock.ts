import { useEffect, useRef } from 'react';

export function useWakeLock(active: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const noSleepRef = useRef<any>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    const acquire = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } else {
          if (!noSleepRef.current) {
            const NoSleep = (await import('nosleep.js')).default;
            noSleepRef.current = new NoSleep();
          }
          await noSleepRef.current.enable();
        }
      } catch (e) {
        // 某些浏览器/环境会拒绝，静默处理即可
        // eslint-disable-next-line no-console
        console.warn('Wake lock acquire failed:', e);
      }
    };

    const release = () => {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
      noSleepRef.current?.disable();
      noSleepRef.current = null;
    };

    acquire();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && active) {
        acquire();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      release();
    };
  }, [active]);
}
