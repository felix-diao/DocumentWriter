import React, { useEffect, useState } from 'react';
import { Outlet } from 'umi';
import { request } from '@umijs/max';

// 开发环境启用 vConsole 方便手机调试
if (process.env.NODE_ENV === 'development' || window.location.pathname.startsWith('/mobile')) {
  import('vconsole').then((VConsole) => {
    new VConsole.default();
  }).catch(() => {});
}

// 动态加载企业微信 JS-SDK
function loadWechatScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).wx) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://res.wx.qq.com/open/js/jweixin-1.2.0.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('企业微信 JS-SDK 加载失败'));
    document.head.appendChild(script);
  });
}

// 判断是否在企微环境
function isWechatWork(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('wxwork');
}

const MobileLayout: React.FC = () => {
  const [loginStatus, setLoginStatus] = useState<string>('');
  const [needLogin, setNeedLogin] = useState<boolean>(false);

  useEffect(() => {
    // 登录页不走免登逻辑，直接渲染
    if (window.location.pathname === '/mobile/login') {
      return;
    }

    // 移动端 viewport 适配
    const meta = document.querySelector('meta[name=viewport]');
    if (meta) {
      meta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }

    // 企微免登
    const doWechatLogin = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        setLoginStatus('已有 token，跳过免登');
        return;
      }

      const isWx = isWechatWork();
      if (!isWx) {
        setLoginStatus('非企微环境');
        setNeedLogin(true);
        return;
      }

      try {
        setLoginStatus('加载企微 SDK...');
        await loadWechatScript();
        const wx = (window as any).wx;
        if (!wx) {
          setLoginStatus('wx 对象不存在');
          return;
        }

        // 1. 获取 js-config
        const currentUrl = window.location.href.split('#')[0];
        setLoginStatus('获取 js-config...');
        const configRes = await request('/api/auth/wechat-js-config', {
          params: { url: currentUrl },
        });
        if (!configRes.success) {
          setLoginStatus('js-config 失败: ' + (configRes.message || 'unknown'));
          setNeedLogin(true);
          return;
        }
        const cfg = configRes.data;

        // 2. wx.config
        setLoginStatus('wx.config...');
        wx.config({
          beta: true,
          debug: false,
          appId: cfg.corpId,
          timestamp: cfg.timestamp,
          nonceStr: cfg.nonceStr,
          signature: cfg.signature,
          jsApiList: [],
        });

        // 3. wx.ready → getContext 取 code
        wx.ready(async () => {
          setLoginStatus('获取免登 code...');
          wx.invoke('getContext', {}, async (res: any) => {
            if (res.err_msg !== 'getContext:ok') {
              setLoginStatus('getContext 失败: ' + res.err_msg);
              setNeedLogin(true);
              return;
            }
            const code = res.code;
            if (!code) {
              setLoginStatus('code 为空');
              setNeedLogin(true);
              return;
            }

            try {
              // 4. code → ticket
              setLoginStatus('wechat-login...');
              const loginRes = await request('/api/auth/wechat-login', {
                method: 'POST',
                data: { code },
              });
              if (!loginRes.success) {
                setLoginStatus('wechat-login 失败: ' + (loginRes.message || 'unknown'));
                setNeedLogin(true);
                return;
              }
              const ticket = loginRes.data.ticket;

              // 5. ticket → JWT
              setLoginStatus('redeem ticket...');
              const tokenRes = await request('/api/auth/redeem-ticket', {
                method: 'POST',
                data: { ticket },
                headers: { Authorization: 'Bearer ' },
              });
              if (!tokenRes.success) {
                setLoginStatus('redeem 失败: ' + (tokenRes.message || 'unknown'));
                setNeedLogin(true);
                return;
              }

              localStorage.setItem('access_token', tokenRes.data.access_token);
              setLoginStatus('免登成功');
              window.location.reload();
            } catch (e: any) {
              setLoginStatus('请求异常: ' + e.message);
            }
          });
        });

        wx.error((err: any) => {
          setLoginStatus('wx.error: ' + JSON.stringify(err));
        });
      } catch (e: any) {
        setLoginStatus('免登异常: ' + e.message);
        setNeedLogin(true);
      }
    };

    doWechatLogin();
  }, []);

  const handleLogin = () => {
    window.location.href = '/mobile/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa' }}>
      {process.env.NODE_ENV === 'development' && loginStatus && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          background: '#fffbe6', color: '#ad6800',
          padding: '4px 12px', fontSize: 12, zIndex: 9999,
          textAlign: 'center',
        }}>
          免登: {loginStatus}
        </div>
      )}
      {needLogin && window.location.pathname !== '/mobile/login' && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', padding: '0 24px',
        }}>
          <div style={{ fontSize: 16, color: '#666', marginBottom: 16, textAlign: 'center' }}>
            {loginStatus || '需要登录'}
          </div>
          <button
            onClick={handleLogin}
            style={{
              padding: '12px 32px', fontSize: 16, background: '#1677ff',
              color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
            }}
          >
            使用密码登录
          </button>
        </div>
      )}
      {(!needLogin || window.location.pathname === '/mobile/login') && <Outlet />}
    </div>
  );
};

export default MobileLayout;
