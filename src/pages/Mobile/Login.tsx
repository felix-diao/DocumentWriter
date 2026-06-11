import React, { useState } from 'react';
import { request } from '@umijs/max';

// 判断是否在企微环境
function isWechatWork(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('wxwork');
}

const MobileLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('请输入账号和密码');
      return;
    }

    setLoading(true);
    try {
      const res = await request('/api/auth/login', {
        method: 'POST',
        data: { username, password },
      });
      if (res.success && res.data?.access_token) {
        localStorage.setItem('access_token', res.data.access_token);
        // 返回原页面或首页
        const redirect = new URLSearchParams(window.location.search).get('redirect') || '/mobile/meetings';
        window.location.href = redirect;
      } else {
        setError(res.message || '登录失败');
      }
    } catch (err: any) {
      setError(err.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  const inWechat = isWechatWork();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f6fa',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 32px',
    }}>
      <div style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8, color: '#1677ff' }}>
        AI 会议助手
      </div>
      <div style={{ fontSize: 14, color: '#999', marginBottom: 40 }}>
        移动端登录
      </div>

      {inWechat && (
        <div style={{
          fontSize: 13, color: '#faad14', background: '#fffbe6',
          padding: '8px 12px', borderRadius: 6, marginBottom: 20,
          width: '100%', textAlign: 'center',
        }}>
          建议在企微中使用免登登录
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 320 }}>
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="账号"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              width: '100%', padding: '12px 16px', fontSize: 16,
              border: '1px solid #d9d9d9', borderRadius: 8,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%', padding: '12px 16px', fontSize: 16,
              border: '1px solid #d9d9d9', borderRadius: 8,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <div style={{ color: '#ff4d4f', fontSize: 14, marginBottom: 16, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '14px 0', fontSize: 16,
            background: loading ? '#bae0ff' : '#1677ff', color: '#fff',
            border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {loading ? '登录中...' : '登 录'}
        </button>
      </form>
    </div>
  );
};

export default MobileLogin;
