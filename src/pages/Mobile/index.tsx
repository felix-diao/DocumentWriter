import React, { useEffect, useRef, useState } from 'react';
import { Outlet } from 'umi';
import { request } from '@umijs/max';
import { normalizeAppPath, withAppBase } from '@/utils/appPath';

const DEBUG_PREFIX = '[DEBUG-wx]';

function log(...args: any[]) {
  // eslint-disable-next-line no-console
  console.log(DEBUG_PREFIX, ...args);
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

// 判断当前是否在移动端登录页（兼容 /agent_officea/mobile/login 等前缀）
function isMobileLoginPage(path: string): boolean {
  // 兼容 /mobile/login 和 /mobile/login/
  const normalized = path.replace(/\/+$/, '');
  return normalized.endsWith('/mobile/login');
}

type LoginState = 'checking' | 'needLogin' | 'loggedIn';

const MobileLayout: React.FC = () => {
  const [loginState, setLoginState] = useState<LoginState>('checking');
  const [loginStatus, setLoginStatus] = useState<string>('');
  const safetyTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const pathname = window.location.pathname;
    log('init pathname=', pathname, 'href=', window.location.href);

    const clearSafetyTimeout = () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
    };

    // 登录页直接渲染，不跑免登
    if (isMobileLoginPage(window.location.pathname)) {
      log('login page, skip');
      setLoginState('needLogin');
      return () => clearSafetyTimeout();
    }

    // 移动端 viewport 适配
    const meta = document.querySelector('meta[name=viewport]');
    if (meta) {
      meta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }

    // 安全超时：10 秒内没确定状态，强制显示密码登录
    safetyTimeoutRef.current = setTimeout(() => {
      log('safety timeout');
      setLoginStatus('登录检测超时，请使用密码登录');
      setLoginState('needLogin');
    }, 10000);

    const doWechatLogin = async () => {
      const existing = localStorage.getItem('access_token');
      log('token=', existing ? 'exists' : 'none');
      if (existing) {
        clearSafetyTimeout();
        setLoginState('loggedIn');
        return;
      }

      const isWx = isWechatWork();
      log('isWechatWork=', isWx, 'UA=', navigator.userAgent);
      if (!isWx) {
        clearSafetyTimeout();
        setLoginStatus('非企微环境');
        setLoginState('needLogin');
        return;
      }

      try {
        // 1. 先看 URL 上有没有 OAuth2 回调带回来的 code
        const code = new URLSearchParams(window.location.search).get('code');
        log('oauth code=', code);

        if (code) {
          // 先清掉 URL 上的 code/state：无论成功或失败都不残留旧 code（失败后刷新会重新走授权）
          window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
          // 有 code → 换 ticket → JWT
          setLoginStatus('wechat-login...');
          const loginRes = await request('/api/auth/wechat-login', {
            method: 'POST',
            data: { code },
          });
          log('wechat-login response=', loginRes);
          if (!loginRes.success) {
            clearSafetyTimeout();
            setLoginStatus('wechat-login 失败: ' + (loginRes.message || 'unknown'));
            setLoginState('needLogin');
            return;
          }
          const ticket = loginRes.data.ticket;

          setLoginStatus('redeem ticket...');
          const tokenRes = await request('/api/auth/redeem-ticket', {
            method: 'POST',
            data: { ticket },
            headers: { Authorization: 'Bearer ' },
          });
          log('redeem-ticket response=', tokenRes);
          if (!tokenRes.success) {
            clearSafetyTimeout();
            setLoginStatus('redeem 失败: ' + (tokenRes.message || 'unknown'));
            setLoginState('needLogin');
            return;
          }

          localStorage.setItem('access_token', tokenRes.data.access_token);
          clearSafetyTimeout();
          setLoginStatus('免登成功');
          log('reload');
          window.location.reload();
          return;
        }

        // 2. 没 code → 拿 corpId/agentId，跳转企业微信 OAuth2 授权（snsapi_base 静默）
        setLoginStatus('跳转企业微信授权...');
        const currentUrl = window.location.href.split('#')[0];
        let cfgRes: any;
        try {
          cfgRes = await request('/api/auth/wechat-js-config', {
            params: { url: currentUrl },
          });
        } catch (e: any) {
          clearSafetyTimeout();
          setLoginStatus('获取配置异常: ' + e.message);
          setLoginState('needLogin');
          return;
        }
        if (!cfgRes.success) {
          clearSafetyTimeout();
          setLoginStatus('获取配置失败: ' + (cfgRes.message || 'unknown'));
          setLoginState('needLogin');
          return;
        }
        const corpId = cfgRes.data.corpId;
        const agentId = cfgRes.data.agentId;
        const redirect = encodeURIComponent(currentUrl);
        const oauthUrl =
          'https://open.weixin.qq.com/connect/oauth2/authorize' +
          '?appid=' + corpId +
          '&redirect_uri=' + redirect +
          '&response_type=code&scope=snsapi_base' +
          '&agentid=' + agentId +
          '&state=wxlogin#wechat_redirect';
        log('redirect to oauth=', oauthUrl);
        window.location.href = oauthUrl;
      } catch (e: any) {
        log('doWechatLogin error', e?.message);
        clearSafetyTimeout();
        setLoginStatus('免登异常: ' + e.message);
        setLoginState('needLogin');
      }
    };
    doWechatLogin();

    return () => clearSafetyTimeout();
  }, []);

  const handleLogin = () => {
    const pathname = window.location.pathname;
    const redirect = pathname + window.location.search;
    const basePath = pathname.substring(0, pathname.lastIndexOf('/'));
    const loginPath = basePath.endsWith('/mobile') ? basePath + '/login' : withAppBase('/mobile/login');
    log('handleLogin redirect=', redirect, 'loginPath=', loginPath);
    window.location.href = loginPath + '?redirect=' + encodeURIComponent(redirect);
  };

  // 加载中状态：不渲染子页面
  if (loginState === 'checking') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', background: '#f5f6fa',
        padding: '0 24px',
      }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e0e0e0', borderTop: '3px solid #1677ff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: 16, color: '#666', fontSize: 14 }}>
          {loginStatus || '正在检测登录状态...'}
        </div>
        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // 需要登录：显示按钮，不渲染子页面
  if (loginState === 'needLogin' && !isMobileLoginPage(window.location.pathname)) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', background: '#f5f6fa', padding: '0 24px',
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
    );
  }

  // 已登录 或 当前就是登录页：渲染子页面
  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa' }}>
      <Outlet />
    </div>
  );
};

export default MobileLayout;
