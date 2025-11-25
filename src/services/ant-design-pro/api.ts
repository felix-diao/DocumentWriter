// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';
import { setToken, removeToken } from '@/utils/auth';

/** 获取当前的用户 GET /api/auth/me */
export async function currentUser(options?: { [key: string]: any }) {
  return request<API.CurrentUser>('/api/auth/me', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 退出登录接口 POST /api/auth/logout */
export async function outLogin(options?: { [key: string]: any }) {
  try {
    return await request<API.StandardResponse<API.LogoutResponse>>('/api/auth/logout', {
      method: 'POST',
      ...(options || {}),
    });
  } finally {
    removeToken();
  }
}

/** 登录接口 POST /api/auth/login */
export async function login(body: API.LoginParams, options?: { [key: string]: any }) {
  const response = await request<API.StandardResponse<API.LoginResult>>('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: {
      username: body.username,
      password: body.password,
    },
    ...(options || {}),
  });
  
  const tokenInfo = response.data;

  if (response.success && tokenInfo?.access_token) {
    setToken(tokenInfo.access_token);
    return {
      status: 'ok',
      type: body.type,
      currentAuthority: 'user',
      access_token: tokenInfo.access_token,
      token_type: tokenInfo.token_type,
    };
  }

  return {
    status: 'error',
    type: body.type,
    message: response.message || '用户名或密码错误',
  };
}

/** 注册接口 POST /api/auth/register */
export async function register(body: API.RegisterParams, options?: { [key: string]: any }) {
  return request<API.StandardResponse<API.RegisterResult>>('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 修改密码接口 PUT /api/auth/change-password */
export async function changePassword(
  body: API.ChangePasswordParams,
  options?: { [key: string]: any },
) {
  return request<API.StandardResponse<API.PasswordChangeResponse>>('/api/auth/change-password', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 GET /api/notices */
export async function getNotices(options?: { [key: string]: any }) {
  return request<API.NoticeIconList>('/api/notices', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取规则列表 GET /api/rule */
export async function rule(
  params: {
    // query
    /** 当前的页码 */
    current?: number;
    /** 页面的容量 */
    pageSize?: number;
  },
  options?: { [key: string]: any },
) {
  return request<API.RuleList>('/api/rule', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 更新规则 PUT /api/rule */
export async function updateRule(options?: { [key: string]: any }) {
  return request<API.RuleListItem>('/api/rule', {
    method: 'POST',
    data: {
      method: 'update',
      ...(options || {}),
    },
  });
}

/** 新建规则 POST /api/rule */
export async function addRule(options?: { [key: string]: any }) {
  return request<API.RuleListItem>('/api/rule', {
    method: 'POST',
    data: {
      method: 'post',
      ...(options || {}),
    },
  });
}

/** 删除规则 DELETE /api/rule */
export async function removeRule(options?: { [key: string]: any }) {
  return request<Record<string, any>>('/api/rule', {
    method: 'POST',
    data: {
      method: 'delete',
      ...(options || {}),
    },
  });
}
