# 公文写作 / 会议纪要 URL 拆分

## 目标

同一域名下，通过不同 URL 路径区分两个功能入口：
- `/doc`：仅展示 AI 公文写作相关页面
- `/meeting`：仅展示会议纪要相关页面

两个入口功能不受影响、不做改动，只通过路由和菜单控制可见范围。

## 范围

### `/doc` 入口
- 欢迎页、用户信息、日程管理（共享）
- AI 公文生成器、会话历史、Prompt 管理、知识库

### `/meeting` 入口
- 欢迎页、用户信息、日程管理（共享）
- 会议管理、会议纪要、会话历史

### 不参与拆分的路由
- `/user/*`：登录、注册、设置密码（无 layout，不加前缀）

### 跨入口访问
允许直接输入 URL 访问对方入口的页面，但不渲染对方菜单。

## 改动点

### 1. `config/routes.ts` — 路由前缀 + 向后兼容

- 新增 `withPrefix` 工具函数，递归为路由加前缀
- 共享页面放入 `shared` 数组，专属页面各放一个数组
- 向后兼容：旧的 `/welcome` 重定向到 `/doc/welcome`
- 根路径 `/` 重定向到 `/doc/welcome`
- 需要 `import type { IBestAFSRoute } from '@umijs/max'` 或直接用 `Record<string, any>[]`

```ts
function withPrefix(prefix: string, routes: any[]) {
  return routes.map(r => ({
    ...r,
    path: prefix + r.path,
    ...(r.routes ? { routes: withPrefix(prefix, r.routes) } : {}),
  }));
}

const shared = [
  { path: '/welcome',   name: 'welcome',  icon: 'smile',    component: './Welcome' },
  { path: '/user-info', name: '用户信息',   icon: 'bug',      component: './UserInfo' },
  { path: '/AI/calendar', name: '日程管理', icon: 'calendar', component: './AI/Calendar' },
];

const docOnly = [{ path: '/AI', name: 'AI 写作', icon: 'robot', routes: [...] }];
const meetingOnly = [{ path: '/meetings', name: '会议系统', icon: 'solution', routes: [...] }];

export default [
  { path: '/user', layout: false, routes: [ /* login, register, set-password */ ] },
  ...withPrefix('/doc',     [...shared, ...docOnly]),
  ...withPrefix('/meeting', [...shared, ...meetingOnly]),
  { path: '/welcome', redirect: '/doc/welcome' },  // 向后兼容旧书签
  { path: '/',        redirect: '/doc/welcome' },
  { component: './404', layout: false, path: '/*' },
];
```

日程管理 `/AI/calendar` 在旧路由中是顶级菜单项，拆分后在 `/doc` 和 `/meeting` 下作为菜单平级项出现，和现有行为一致。

### 2. `src/app.tsx` — 菜单过滤 + `/welcome` 引用替换

**菜单过滤**：根据当前 URL 前缀过滤菜单项，只显示当前入口下的页面。

```ts
const getEntry = (): 'doc' | 'meeting' => {
  const path = window.location.pathname;
  if (path === '/meeting' || path.startsWith('/meeting/')) return 'meeting';
  return 'doc';
};

// layout 中新增
menuDataRender: (menuData) => {
  const entry = getEntry();
  return menuData.filter(item => {
    if (!item.path) return true;
    if (item.path.startsWith('/user')) return false;
    return item.path.startsWith('/' + entry);
  });
},
```

**所有 `/welcome` 替换为 `/doc/welcome`**：

| 文件 | 行号 | 原来 | 改为 |
|------|------|------|------|
| `src/app.tsx` | 132 | `'/welcome'` | `'/doc/welcome'` |
| `src/app.tsx` | 142 | `history.push('/welcome')` | `history.push('/doc/welcome')` |
| `src/app.tsx` | 192 | `'/welcome'` | `'/doc/welcome'` |

### 3. `src/pages/user/login/index.tsx` — 登录跳转

Line 176：`window.location.href = urlParams.get('redirect') || '/'`

保持 `/` 不变，由路由级 `redirect` 自动跳转到 `/doc/welcome`。

### 4. `src/pages/user/set-password/index.tsx` — 设置密码后跳转

Line 57 附近 `getRedirect()` 函数的 fallback 从 `/welcome` 改为 `/doc/welcome`。

### 5. 共享页面组件

无需改动。`Welcome.tsx`、`UserInfo.tsx`、`Calendar` 等共享页面内部链接如指向 `/welcome`，由向后兼容 redirect 兜底。

## 已知限制

- **认证后丢失入口上下文**：未登录用户访问 `/meeting/welcome` 会被 `onPageChange` 跳转到 `/user/login`，登录后默认跳回 `/doc/welcome`（而非 `/meeting/welcome`）。接受此行为，不做会话级入口记忆。
- **共享组件内部链接**：如果 `Welcome.tsx` 等组件内部使用了 `history.push('/welcome')`，由 `routes.ts` 中的向后兼容 redirect 兜底。不在本次改动中逐个排查共享组件的硬编码路径。

## 不在范围内

- 不新增路由守卫或权限校验
- 不修改任何业务页面组件的功能逻辑
- 不改动后端或 API 调用
- 不添加 sessionStorage/cookie 等入口记忆机制

## 测试要点

- `/doc/welcome` 只显示公文写作相关菜单
- `/meeting/welcome` 只显示会议相关菜单
- 旧 URL `/welcome` 自动跳转到 `/doc/welcome`
- 登录后正确跳转到 `/doc/welcome`
- 设置密码后正确跳转到 `/doc/welcome`
- 在 `/doc` 下手动输入 `/meeting/minutes` 能正常加载页面（无对方菜单）
- 刷新页面后菜单状态正确
- 两个入口之间的公共页面功能正常
