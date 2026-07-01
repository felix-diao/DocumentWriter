import type { RequestOptions } from '@@/plugin-request/request';
import type { RequestConfig } from '@umijs/max';
import { message, notification } from 'antd';
import { getAuthHeader } from '@/utils/auth';

/** 从 Axios/Fetch 类错误中解析 FastAPI 常见字段 `detail`（字符串或校验错误数组）。 */
export function getFastApiErrorDetail(error: any): string | undefined {
  const data = error?.response?.data;
  if (!data || typeof data !== 'object') return undefined;
  const d = (data as { detail?: unknown }).detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) {
    const parts = d
      .map((item: any) => (typeof item?.msg === 'string' ? item.msg : undefined))
      .filter(Boolean);
    if (parts.length) return parts.join('；');
  }
  return undefined;
}

/** HTTP 错误的人类可读文案（优先后端 detail）。 */
export function getHttpErrorMessage(error: any): string {
  const detail = getFastApiErrorDetail(error);
  if (detail) return detail;
  const status = error?.response?.status;
  if (status === 409) return '与已有记录冲突，请修改后重试';
  if (status === 404) return '资源不存在或已被删除';
  if (status === 403) return '没有权限执行此操作';
  if (status === 401) return '登录已失效，请重新登录';
  if (typeof status === 'number') return `请求失败（${status}）`;
  return error?.message || '网络异常，请稍后重试';
}

// 错误处理方案： 错误类型
enum ErrorShowType {
  SILENT = 0,
  WARN_MESSAGE = 1,
  ERROR_MESSAGE = 2,
  NOTIFICATION = 3,
  REDIRECT = 9,
}
// 与后端约定的响应数据格式
interface ResponseStructure {
  success?: boolean;
  data: any;
  errorCode?: number;
  errorMessage?: string;
  message?: string;
  showType?: ErrorShowType;
}

/**
 * @name 错误处理
 * pro 自带的错误处理， 可以在这里做自己的改动
 * @doc https://umijs.org/docs/max/request#配置
 */
export const errorConfig: RequestConfig = {
  // 错误处理： umi@3 的错误处理方案。
  errorConfig: {
    // 错误抛出
    errorThrower: (res) => {
      if (!res || typeof res !== 'object' || Array.isArray(res) || !('success' in res)) {
        return;
      }
      const { success, data, errorCode, errorMessage, message: bizMessage, showType } =
        res as unknown as ResponseStructure;
      if (success === false) {
        const error: any = new Error(errorMessage || bizMessage || '请求失败');
        error.name = 'BizError';
        error.info = {
          errorCode,
          errorMessage: errorMessage || bizMessage,
          showType,
          data,
        };
        throw error; // 抛出自制的错误
      }
    },
    // 错误接收及处理
    errorHandler: (error: any, opts: any) => {
      if (opts?.skipErrorHandler) throw error;
      // 我们的 errorThrower 抛出的错误。
      if (error.name === 'BizError') {
        const errorInfo: ResponseStructure | undefined = error.info;
        if (errorInfo) {
          const { errorMessage, errorCode } = errorInfo;
          switch (errorInfo.showType) {
            case ErrorShowType.SILENT:
              // do nothing
              break;
            case ErrorShowType.WARN_MESSAGE:
              message.warning(errorMessage);
              break;
            case ErrorShowType.ERROR_MESSAGE:
              message.error(errorMessage);
              break;
            case ErrorShowType.NOTIFICATION:
              notification.open({
                description: errorMessage,
                message: errorCode,
              });
              break;
            case ErrorShowType.REDIRECT:
              // TODO: redirect
              break;
            default:
              message.error(errorMessage);
          }
        }
      } else if (error.response) {
        // Axios：HTTP 非 2xx；FastAPI 多为 { detail: string | array }
        const friendly = getHttpErrorMessage(error);
        message.error(friendly);
      } else if (error.request) {
        const isCanceledRequest =
          error?.name === 'CanceledError' ||
          error?.name === 'AbortError' ||
          error?.code === 'ERR_CANCELED' ||
          error?.message === 'canceled' ||
          error?.message === 'Request aborted';

        if (isCanceledRequest) {
          return;
        }

        // 请求已经成功发起，但没有收到响应
        // `error.request` 在浏览器中是 XMLHttpRequest 的实例，
        // 而在node.js中是 http.ClientRequest 的实例
        message.error('网络连接异常，请稍后重试');
      } else {
        // 发送请求时出了点问题
        message.error('Request error, please retry.');
      }
    },
  },

  // 请求拦截器
  requestInterceptors: [
    (config: RequestOptions) => {
      // 拦截请求配置，添加 Authorization header
      const authHeader = getAuthHeader();
      if (authHeader) {
        if (config.headers instanceof Headers) {
          config.headers.set('Authorization', authHeader);
        } else {
          config.headers = {
            ...(config.headers || {}),
            Authorization: authHeader,
          };
        }
      }
      return config;
    },
  ],

  // 响应拦截器
  responseInterceptors: [
    (response) => {
      // 拦截响应数据，进行个性化处理
      const resp: any = response;
      const data = resp?.data as ResponseStructure | undefined;
      if (data?.success === false) {
        const requestUrl: string =
          resp?.config?.url || resp?.url || '';
        const suppressToastPaths = ['/api/auth/login', '/api/auth/register'];
        const shouldSuppress = suppressToastPaths.some((path) =>
          requestUrl.includes(path),
        );
        if (!shouldSuppress) {
          message.error(data?.errorMessage || data?.message || '请求失败！');
        }
      }
      return response;
    },
  ],
};
