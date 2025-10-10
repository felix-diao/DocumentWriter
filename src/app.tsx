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

import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';
import { currentUser as queryCurrentUser } from '@/services/ant-design-pro/api';
import '@ant-design/v5-patch-for-react-19';

const isDev = process.env.NODE_ENV === 'development';
const isDevOrTest = isDev || process.env.CI;
const loginPath = '/user/login';

/**
 * @see https://umijs.org/docs/api/runtime-config#getinitialstate
 */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
}> {
  const fetchUserInfo = async () => {
    try {
      const msg = await queryCurrentUser({ skipErrorHandler: true });
      return msg.data;
    } catch (_error) {
      history.push(loginPath);
    }
    return undefined;
  };

  const { location } = history;
  if (![loginPath, '/user/register', '/user/register-result'].includes(location.pathname)) {
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
      ©2025 AI文档助手 | AI文档书写 · AI翻译 · AI会议助手
    </div>
  ),
  onPageChange: () => {
    const { location } = history;
    if (!initialState?.currentUser && location.pathname !== loginPath) {
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
      <Link key="openapi" to="/umi/plugin/openapi" target="_blank">
        <LinkOutlined />
        <span>OpenAPI 文档</span>
      </Link>,
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
  baseURL: isDev ? '' : 'https://proapi.azurewebsites.net',
  ...errorConfig,
};
