/**
 * @name 代理的配置
 * @see 在生产环境 代理是无法生效的，所以这里没有生产环境的配置
 * -------------------------------
 * The agent cannot take effect in the production environment
 * so there is no configuration of the production environment
 * For details, please see
 * https://pro.ant.design/docs/deploy
 *
 * @doc https://umijs.org/docs/guides/proxy
 */
const backendTarget = 'http://127.0.0.1:8000';
const ragTarget = process.env.RAG_SERVICE_URL || 'http://127.0.0.1:3000';

export default {
  // 如果需要自定义本地开发服务器  请取消注释按需调整
  dev: {
    // /api/ai/document/write -> http://127.0.0.1:8000/document/write
    // 将 /api/ai/** 代理到后端服务
    '/api/ai/': {
      target: backendTarget,
      changeOrigin: true,
      pathRewrite: { '^/api/ai': '' }, // 移除 /api/ai 前缀
    },
    // 将 /api/storage/** 代理到后端服务
    '/api/storage/': {
      target: backendTarget,
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
    },
    // 将 /api/knowledge/** 代理到后端服务
    '/api/knowledge/': {
      target: backendTarget,
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
    },
    // 将 /api/documents/** 代理到 RAG 服务
    '/api/documents/': {
      target: ragTarget,
      changeOrigin: true,
    },
    '/api/rag/': {
      target: ragTarget,
      changeOrigin: true,
    },
    // 直通静态资源，供上传文件访问
    '/static/': {
      target: backendTarget,
      changeOrigin: true,
    },
  },
  // dev: {
  //   // localhost:8000/api/** -> https://preview.pro.ant.design/api/**
  //   '/api/': {
  //     // 要代理的地址
  //     target: 'https://preview.pro.ant.design',
  //     // 配置了这个可以从 http 代理到 https
  //     // 依赖 origin 的功能可能需要这个，比如 cookie
  //     changeOrigin: true,
  //   },
  // },
  /**
   * @name 详细的代理配置
   * @doc https://github.com/chimurai/http-proxy-middleware
   */
  test: {
    // localhost:8000/api/** -> https://preview.pro.ant.design/api/**
    '/api/': {
      target: 'https://proapi.azurewebsites.net',
      changeOrigin: true,
      pathRewrite: { '^': '' },
    },
  },
  pre: {
    '/api/': {
      target: 'your pre url',
      changeOrigin: true,
      pathRewrite: { '^': '' },
    },
  },
};
