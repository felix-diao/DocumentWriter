import type { Request, Response } from 'express';

const waitTime = (time: number = 100) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, time);
  });
};

async function getFakeCaptcha(_req: Request, res: Response) {
  await waitTime(2000);
  return res.json('captcha-xxx');
}

const { ANT_DESIGN_PRO_ONLY_DO_NOT_USE_IN_YOUR_PRODUCTION } = process.env;

let access =
  ANT_DESIGN_PRO_ONLY_DO_NOT_USE_IN_YOUR_PRODUCTION === 'site' ? 'admin' : '';

const getAccess = () => access;

// ============= 登录账号配置 =============
const LOGIN_ACCOUNTS = {
  // felix 管理员账号
  felix: {
    username: 'felix',
    password: '123456',
    access: 'admin',
    name: 'Felix',
    avatar: 'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png',
    userid: '00000001',
    email: 'felix@aidoc.com',
    signature: '专注 AI 文档助手开发',
    title: 'AI 文档专家',
    group: 'AI 文档助手团队',
  },
  // 普通用户账号
  user: {
    username: 'user',
    password: '123456',
    access: 'user',
    name: '普通用户',
    avatar: 'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png',
    userid: '00000002',
    email: 'user@aidoc.com',
    signature: 'AI 文档助手用户',
    title: '文档编辑者',
    group: 'AI 文档助手团队',
  },
  // 访客账号
  guest: {
    username: 'guest',
    password: '123456',
    access: 'guest',
    name: '访客',
    avatar: 'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png',
    userid: '00000003',
    email: 'guest@aidoc.com',
    signature: '访客用户',
    title: '访客',
    group: 'AI 文档助手团队',
  },
};

export default {
  // 当前登录用户信息
  'GET /api/currentUser': (_req: Request, res: Response) => {
    if (!getAccess()) {
      res.status(401).send({
        data: { isLogin: false },
        errorCode: '401',
        errorMessage: '请先登录！',
        success: true,
      });
      return;
    }

    // 根据当前权限返回对应用户信息
    const currentAccount = Object.values(LOGIN_ACCOUNTS).find(
      (account) => account.access === getAccess()
    );

    if (!currentAccount) {
      res.status(401).send({
        data: { isLogin: false },
        errorCode: '401',
        errorMessage: '用户信息异常',
        success: true,
      });
      return;
    }

    res.send({
      success: true,
      data: {
        name: currentAccount.name,
        avatar: currentAccount.avatar,
        userid: currentAccount.userid,
        email: currentAccount.email,
        signature: currentAccount.signature,
        title: currentAccount.title,
        group: currentAccount.group,
        tags: [
          { key: '0', label: '热爱技术' },
          { key: '1', label: '专注文档' },
          { key: '2', label: '高效' },
        ],
        notifyCount: 5,
        unreadCount: 2,
        country: 'China',
        access: getAccess(),
        geographic: {
          province: { label: '陕西省', key: '610000' },
          city: { label: '西安市', key: '610100' },
        },
        address: '陕西省西安市西安交通大学',
        phone: '029-12345678',
      },
    });
  },

  // 用户列表示例
  'GET /api/users': [
    { key: '1', name: 'Felix', age: 32, address: '陕西省西安市西安交通大学' },
    { key: '2', name: '普通用户', age: 28, address: '北京海淀区 XXX' },
    { key: '3', name: '测试用户', age: 30, address: '上海浦东 XXX' },
  ],

  // 登录接口
  'POST /api/login/account': async (req: Request, res: Response) => {
    const { password, username, type } = req.body;
    await waitTime(2000);

    // 遍历所有账号进行验证
    for (const account of Object.values(LOGIN_ACCOUNTS)) {
      if (username === account.username && password === account.password) {
        res.send({
          status: 'ok',
          type,
          currentAuthority: account.access,
        });
        access = account.access;
        return;
      }
    }

    // 手机号登录（保留原逻辑）
    if (type === 'mobile') {
      res.send({ status: 'ok', type, currentAuthority: 'admin' });
      access = 'admin';
      return;
    }

    // 登录失败
    res.send({
      status: 'error',
      type,
      currentAuthority: 'guest',
      message: '用户名或密码错误',
    });
    access = '';
  },

  // 退出登录
  // 'POST /api/login/outLogin': (_req: Request, res: Response) => {
  //   access = '';
  //   res.send({ data: {}, success: true });
  // },

  // 注册接口
  'POST /api/register': (_req: Request, res: Response) => {
    res.send({ status: 'ok', currentAuthority: 'user', success: true });
  },

  // 错误接口示例
  'GET /api/500': (_req: Request, res: Response) => {
    res.status(500).send({
      timestamp: Date.now(),
      status: 500,
      error: '系统错误',
      message: '系统内部错误，请稍后重试',
      path: '/base/category/list',
    });
  },
  'GET /api/404': (_req: Request, res: Response) => {
    res.status(404).send({
      timestamp: Date.now(),
      status: 404,
      error: '未找到',
      message: '请求资源不存在',
      path: '/base/category/list/2121212',
    });
  },
  'GET /api/403': (_req: Request, res: Response) => {
    res.status(403).send({
      timestamp: Date.now(),
      status: 403,
      error: '禁止访问',
      message: '无权限访问该资源',
      path: '/base/category/list',
    });
  },
  'GET /api/401': (_req: Request, res: Response) => {
    res.status(401).send({
      timestamp: Date.now(),
      status: 401,
      error: '未授权',
      message: '请先登录',
      path: '/base/category/list',
    });
  },

  // 获取验证码
  'GET  /api/login/captcha': getFakeCaptcha,
};
