import React from 'react';
import { history, Link } from '@umijs/max';
import { LinkOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';

import {
  AvatarDropdown,
  AvatarName,
  //Footer,
  Question,
  SelectLang,
} from '@/components';
import { message } from 'antd';

import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';
import { currentUser as queryCurrentUser } from '@/services/ant-design-pro/api';
import { redeemTicket } from '@/services/ant-design-pro/api';
import { setToken } from '@/utils/auth';
import '@ant-design/v5-patch-for-react-19';

const isDev = process.env.NODE_ENV === 'development';
const isDevOrTest = isDev || process.env.CI;
const loginPath = '/user/login';
const setPasswordPath = '/user/set-password';

const getEntry = (): 'doc' | 'meeting' => {
  const path = window.location.pathname;
  if (path === '/meeting' || path.startsWith('/meeting/')) return 'meeting';
  return 'doc';
};

/**
 * @see https://umijs.org/docs/api/runtime-config#getinitialstate
 */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
}> {
  // 检测 URL 中的 ticket 参数，用于无感知登录
  const urlParams = new URLSearchParams(window.location.search);
  const ticket = urlParams.get('ticket');

  // 先检查是否已有 token，获取当前用户信息
  let existingToken = localStorage.getItem('access_token');
  let existingUser: API.CurrentUser | undefined;

  // 转换用户信息的辅助函数
  const transformUserInfo = (userInfo: any): API.CurrentUser => {
    return {
      name: userInfo.username || userInfo.name,
      userid: userInfo.user_id || userInfo.userid,
      username: userInfo.username,
      user_id: userInfo.user_id,
      role: userInfo.role,
      department: userInfo.department,
      access: userInfo.role === 'admin' ? 'admin' : userInfo.role === 'user' ? 'user' : 'guest',
      needs_password_setup: userInfo.needs_password_setup,
      avatar: userInfo.avatar,
      email: userInfo.email,
      signature: userInfo.signature,
      title: userInfo.title,
      group: userInfo.group || userInfo.department,
      tags: userInfo.tags,
      notifyCount: userInfo.notifyCount,
      unreadCount: userInfo.unreadCount,
      country: userInfo.country,
      geographic: userInfo.geographic,
      address: userInfo.address,
      phone: userInfo.phone,
    };
  };

  if (existingToken) {
    try {
      const rawUserInfo = await queryCurrentUser({ skipErrorHandler: true });
      if (rawUserInfo) {
        existingUser = transformUserInfo(rawUserInfo);
      }
    } catch (e) {
      // token 无效，继续处理 ticket
      localStorage.removeItem('access_token');
      existingToken = null;
      }
  }

  if (ticket) {
    // 始终尝试兑换 ticket，后端会比较 token username 是否与 ticket 一致
    try {
      const response = await redeemTicket({ ticket });
      console.log('redeemTicket response:', response);
      if (response.success && response.data?.access_token) {
        setToken(response.data.access_token);
        // 清除旧用户信息，让下面重新获取
        existingToken = response.data.access_token;
        existingUser = undefined;
      } else {
        console.log('Ticket invalid:', response.message);
        message.error(response.message || 'ticket 无效');
      }
    } catch (error) {
      console.log('Ticket redemption failed:', error);
      message.error('ticket 兑换失败，请重新获取');
    }
    // 清除 URL 中的 ticket 参数
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, '', cleanUrl);
  }

  const fetchUserInfo = async () => {
    try {
      const userInfo = await queryCurrentUser({ skipErrorHandler: true });
      if (userInfo) {
        return transformUserInfo(userInfo);
      }
      return undefined;
    } catch (_error) {
      history.push(loginPath);
    }
    return undefined;
  };

  const { location } = history;

  // 检查是否有有效的 token（可能来自 localStorage 或刚兑换的 ticket）
  const hasValidToken = localStorage.getItem('access_token');

   // 如果已有有效 token，即使是 login 页面也应该尝试获取用户信息
  if (hasValidToken && existingUser) {
    // 已有有效 token 且获取到用户信息，如果在 login 页面则跳转到 welcome
    if (location.pathname === loginPath) {
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      history.push(redirect || '/doc/welcome');
    }
    return {
      fetchUserInfo,
      currentUser: existingUser,
      settings: defaultSettings as Partial<LayoutSettings>,
    };
  }
  // 无 token 或获取用户信息失败，按原逻辑处理
  // 移动端路由由 MobileLayout 自己处理登录态，不在这里强制跳转
  const isMobilePath = location.pathname.replace(/^\/agent_officea/, '').startsWith('/mobile');
  if (!isMobilePath && ![loginPath, '/user/register', '/user/register-result', setPasswordPath].includes(location.pathname)) {
    const currentUser = await fetchUserInfo();
    return {
      fetchUserInfo,
      currentUser,
      settings: defaultSettings as Partial<LayoutSettings>,
    };
  }

  return {
    fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
  };
}

/**
 * ProLayout 配置
 */
export const layout: RunTimeLayoutConfig = ({ initialState, setInitialState }) => ({
  actionsRender: () => [
    <Question key="doc" />,
    <SelectLang key="SelectLang" />,
  ],
  avatarProps: {
    src: initialState?.currentUser?.avatar,
    title: <AvatarName />,
    render: (_, avatarChildren) => <AvatarDropdown>{avatarChildren}</AvatarDropdown>,
  },
  waterMarkProps: {
    content: initialState?.currentUser?.name,
  },
  footerRender: () => (
    <div style={{ textAlign: 'center', padding: '16px 0', color: '#999' }}>
      ©2025 AI文档助手 | AI文档书写 · AI会议助手
    </div>
  ),
  menuDataRender: (menuData) => {
    const entry = getEntry();
    return menuData.filter((item) => {
      if (!item.path) return true;
      if (item.path.startsWith('/user')) return false;
      return item.path.startsWith('/' + entry);
    });
  },
  onPageChange: () => {
    const { location } = history;
    const isMobilePath = location.pathname.replace(/^\/agent_officea/, '').startsWith('/mobile');
    if (!isMobilePath && !initialState?.currentUser && location.pathname !== loginPath && location.pathname !==
  setPasswordPath){
      history.push(loginPath);
    }
  },
  layoutBgImgList: [
    { src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/D2LWSqNny4sAAAAAAAAAAAAAFl94AQBr', left: 85, bottom: 100, height: '303px' },
    { src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/C2TWRpJpiC0AAAAAAAAAAAAAFl94AQBr', bottom: -68, right: -45, height: '303px' },
    { src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/F6vSTbj8KpYAAAAAAAAAAAAAFl94AQBr', bottom: 0, left: 0, width: '331px' },
  ],
  links: isDevOrTest
    ? [
      // <Link key="openapi" to="/umi/plugin/openapi" target="_blank">
      //   <LinkOutlined />
      //   <span>OpenAPI 文档</span>
      // </Link>,
    ]
    : [],
  menuHeaderRender: undefined,
  childrenRender: (children) => (
    <>
      {children}
      {isDevOrTest && (
        <SettingDrawer
          disableUrlParams
          enableDarkTheme
          settings={initialState?.settings}
          onSettingChange={(settings) =>
            setInitialState((preInitialState) => ({
              ...preInitialState,
              settings,
            }))
          }
        />
      )}
    </>
  ),
  ...initialState?.settings,
});

/**
 * Request 配置
 * 基于 axios / ahooks 的 useRequest
 * @see https://umijs.org/docs/max/request#配置
 */
export const request: RequestConfig = {
  baseURL:  '' ,
  ...errorConfig,
};
