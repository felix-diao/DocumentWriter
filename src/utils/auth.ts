/**
 * Token 管理工具
 * 用于管理 JWT token 的存储和获取
 */

const TOKEN_KEY = 'access_token';

/**
 * 保存 token 到 localStorage
 * @param token - JWT token
 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * 获取 token
 * @returns JWT token 或 null
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 移除 token
 */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * 获取 Authorization header
 * @returns Authorization header 字符串
 */
export function getAuthHeader(): string | null {
  const token = getToken();
  return token ? `Bearer ${token}` : null;
}


