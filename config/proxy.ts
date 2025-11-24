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
const ragTarget = process.env.RAG_SERVICE_URL || 'http://127.0.0.1:8080';

export default {
  // 如果需要自定义本地开发服务器  请取消注释按需调整
  dev: {
    // /api/ai/document/write -> http://127.0.0.1:8000/document/write
    // 将 /api/ai/** 代理到后端服务
    // RAG 认证相关接口
    '/api/auth/': {
      target: ragTarget,
      changeOrigin: true,
    },
    // 兼容旧的登录接口路径
    '/api/login/account': {
      target: ragTarget,
      changeOrigin: true,
      pathRewrite: { '^/api/login/account': '/api/auth/login' }
    },
    '/api/login/outLogin': {
      target: ragTarget,
      changeOrigin: true,
      pathRewrite: { '^/api/login/outLogin': '/api/auth/logout' }
    },
    '/api/currentUser': {
      target: ragTarget,
      changeOrigin: true,
      pathRewrite: { '^/api/currentUser': '/api/auth/me' }
    },
    // /api/ai/document/write -> http://127.0.0.1:8080/api/document/write
    '/api/ai/document/': {
      target: ragTarget,
      changeOrigin: true,
      pathRewrite: { '^/api/ai/document': '/api/document' }
    },
    // 将 /api/knowledge/** 代理到 RAG 服务
    '/api/knowledge': {
      target: ragTarget,
      changeOrigin: true,
      pathRewrite: { '^/api/knowledge': '/api/knowledge' }
    },
    '/AI/uploads/': {
      target: ragTarget,
      changeOrigin: true,
      pathRewrite: { '^/AI/uploads': '/uploads' }
    },
    '/AI/word/': {
      target: ragTarget,
      changeOrigin: true,
      pathRewrite: { '^/AI/word': '/generated_documents' }
    },
    '/AI/pdf/': {
      target: ragTarget,
      changeOrigin: true,
      pathRewrite: { '^/AI/pdf': '/pdf' }
    },
    '/AI/txt/': {
      target: ragTarget,
      changeOrigin: true,
      pathRewrite: { '^/AI/txt': '/txt' }
    },
    "/api/document/export": {
      target: ragTarget,
      changeOrigin: true,
      pathRewrite: { '^/api/document': '/api/document' }
    },
    '/api/meeting/create': {
      target: ragTarget,
      changeOrigin: true,
      pathRewrite: { '^/api/meeting/create': '/api/meetings' }
    },
    // ====================================================

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
    
    // 将 /api/documents/** 代理到 RAG 服务
    '/api/documents/': {
      target: ragTarget,
      changeOrigin: true,
    },
    '/api/rag/': {
      target: ragTarget,
      changeOrigin: true,
    },
    // 将 /api/meeting/** 代理到 RAG 服务（腾讯会议接口）
    
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
