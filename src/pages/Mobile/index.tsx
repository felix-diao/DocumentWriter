import React, { useEffect } from 'react';
import { Outlet } from 'umi';

// 开发环境启用 vConsole 方便手机调试
if (process.env.NODE_ENV === 'development' || window.location.pathname.startsWith('/mobile')) {
  import('vconsole').then((VConsole) => {
    new VConsole.default();
  }).catch(() => {});
}

const MobileLayout: React.FC = () => {
  useEffect(() => {
    // 移动端 viewport 适配
    const meta = document.querySelector('meta[name=viewport]');
    if (meta) {
      meta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa' }}>
      <Outlet />
    </div>
  );
};

export default MobileLayout;
