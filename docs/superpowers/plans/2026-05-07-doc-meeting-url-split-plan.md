# 公文写作 / 会议纪要 URL 拆分 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the single app into two URL-prefixed entry points (`/doc` for Document Writer, `/meeting` for Meeting Minutes) with runtime menu filtering.

**Architecture:** Same build, same codebase. Routes duplicated under `/doc` and `/meeting` prefixes via a `withPrefix` helper. At runtime, `menuDataRender` filters sidebar items based on `window.location.pathname`. No backend changes, no new dependencies.

**Tech Stack:** UmiJS Max 4, React 19, Ant Design Pro Layout, TypeScript

---

### Task 1: Restructure routes in config/routes.ts

**Files:**
- Modify: `config/routes.ts`

- [ ] **Step 1: Extract shared routes and rebuild route config with withPrefix**

Replace the current `config/routes.ts` content:

```ts
/**
 * @name umi 的路由配置
 * @description 只支持 path,component,routes,redirect,wrappers,name,icon 的配置
 * @param path  path 只支持两种占位符配置，第一种是动态参数 :id 的形式，第二种是 * 通配符，通配符只能出现路由字符串的最后。
 * @param component 配置 location 和 path 匹配后用于渲染的 React 组件路径。可以是绝对路径，也可以是相对路径，如果是相对路径，会从 src/pages 开始找起。
 * @param routes 配置子路由，通常在需要为多个路径增加 layout 组件时使用。
 * @param redirect 配置路由跳转
 * @param wrappers 配置路由组件的包装组件，通过包装组件可以为当前的路由组件组合进更多的功能。 比如，可以用于路由级别的权限校验
 * @param name 配置路由的标题，默认读取国际化文件 menu.ts 中 menu.xxxx 的值，如配置 name 为 login，则读取 menu.ts 中 menu.login 的取值作为标题
 * @param icon 配置路由的图标，取值参考 https://ant.design/components/icon-cn， 注意去除风格后缀和大小写，如想要配置图标为 <StepBackwardOutlined /> 则取值应为 stepBackward 或 StepBackward，如想要配置图标为 <UserOutlined /> 则取值应为 user 或者 User
 * @doc https://umijs.org/docs/guides/routes
 */

function withPrefix(prefix: string, routes: any[]) {
  return routes.map((r) => ({
    ...r,
    path: prefix + r.path,
    ...(r.routes ? { routes: withPrefix(prefix, r.routes) } : {}),
  }));
}

// 两个入口共享的页面
const shared = [
  {
    path: '/welcome',
    name: 'welcome',
    icon: 'smile',
    component: './Welcome',
  },
  {
    path: '/user-info',
    name: '用户信息',
    icon: 'bug',
    component: './UserInfo',
  },
  {
    path: '/AI/calendar',
    icon: 'calendar',
    name: '日程管理',
    component: './AI/Calendar',
  },
];

// 公文写作专属
const docOnly = [
  {
    path: '/AI',
    name: 'AI 写作',
    icon: 'robot',
    routes: [
      {
        path: '/AI/document-writer',
        name: 'AI 公文生成器',
        component: './AI/DocumentWriter',
      },
      {
        path: '/AI/conversation-history',
        name: '会话历史',
        icon: 'message',
        component: './AI/ConversationHistory',
      },
      {
        path: '/AI/prompt-manager',
        name: 'Prompt 管理',
        icon: 'file-text',
        component: './AI/PromptManager',
      },
      {
        path: '/AI/knowledge-base',
        name: '知识库',
        icon: 'database',
        component: './AI/KnowledgeBase',
      },
    ],
  },
];

// 会议纪要专属
const meetingOnly = [
  {
    path: '/meetings',
    name: '会议系统',
    icon: 'solution',
    routes: [
      {
        path: '/meetings/manage',
        name: '会议管理',
        component: './Meetings/Management',
      },
      {
        path: '/meetings/minutes',
        name: '会议纪要',
        component: './Meetings/Minutes',
      },
      {
        path: '/meetings/sessions',
        name: '会话历史',
        component: './Meetings/Minutes',
      },
    ],
  },
];

export default [
  {
    path: '/user',
    layout: false,
    routes: [
      {
        name: 'login',
        path: '/user/login',
        component: './user/login',
      },
      {
        name: 'register',
        path: '/user/register',
        component: './user/register',
      },
      {
        name: 'set-password',
        path: '/user/set-password',
        component: './user/set-password',
      },
    ],
  },
  ...withPrefix('/doc', [...shared, ...docOnly]),
  ...withPrefix('/meeting', [...shared, ...meetingOnly]),
  { path: '/welcome', redirect: '/doc/welcome' },
  { path: '/', redirect: '/doc/welcome' },
  {
    component: './404',
    layout: false,
    path: '/*',
  },
];
```

- [ ] **Step 2: Verify routes.ts has no TypeScript errors**

Run: `npx tsc --noEmit --strict config/routes.ts 2>&1 | head -20`
Expected: No errors (may show unrelated config file issues, skip those)

- [ ] **Step 3: Commit**

```bash
git add config/routes.ts
git commit -m "refactor(routes): split routes into /doc and /meeting entry points"
```

---

### Task 2: Add menu filtering and fix redirects in src/app.tsx

**Files:**
- Modify: `src/app.tsx`

- [ ] **Step 1: Add getEntry function and menuDataRender to layout config**

In `src/app.tsx`, add `getEntry` above the `layout` export:

```ts
const getEntry = (): 'doc' | 'meeting' => {
  const path = window.location.pathname;
  if (path === '/meeting' || path.startsWith('/meeting/')) return 'meeting';
  return 'doc';
};
```

Then in the `layout` export object, add `menuDataRender` after `footerRender` (or anywhere in the config):

```ts
menuDataRender: (menuData) => {
  const entry = getEntry();
  return menuData.filter((item) => {
    if (!item.path) return true;
    if (item.path.startsWith('/user')) return false;
    return item.path.startsWith('/' + entry);
  });
},
```

- [ ] **Step 2: Replace all /welcome references (3 places)**

Line 132: `'/welcome'` → `'/doc/welcome'`
```ts
const redirect = location.pathname !== loginPath ? location.pathname : '/doc/welcome';
```

Line 142: `history.push('/welcome')` → `history.push('/doc/welcome')`
```ts
history.push('/doc/welcome');
```

Line 192: `'/welcome'` → `'/doc/welcome'`
```ts
const redirect = location.pathname !== loginPath ? location.pathname : '/doc/welcome';
```

- [ ] **Step 3: Verify app.tsx has no TypeScript errors**

Run: `npx tsc --noEmit src/app.tsx 2>&1 | head -20`
Expected: No errors related to this file

- [ ] **Step 4: Commit**

```bash
git add src/app.tsx
git commit -m "feat(app): add entry-based menu filtering and update default redirects"
```

---

### Task 3: Fix set-password redirect fallback

**Files:**
- Modify: `src/pages/user/set-password/index.tsx`

- [ ] **Step 1: Update getRedirect fallback**

Line 57: `'/welcome'` → `'/doc/welcome'`

```ts
const getRedirect = () => {
  const urlParams = new URL(window.location.href).searchParams;
  return urlParams.get('redirect') || '/doc/welcome';
};
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/user/set-password/index.tsx
git commit -m "fix(set-password): update default redirect to /doc/welcome"
```

---

### Task 4: Manual verification

- [ ] **Step 1: Start the dev server**

Run: `npm run start:dev`
Wait for the dev server to be ready.

- [ ] **Step 2: Test /doc entry**

Open `http://localhost:8000/doc/welcome` in a browser.
- Verify sidebar shows: 欢迎, 用户信息, 日程管理, AI 写作 (with sub-items)
- Verify sidebar does NOT show: 会议系统

- [ ] **Step 3: Test /meeting entry**

Open `http://localhost:8000/meeting/welcome` in a browser.
- Verify sidebar shows: 欢迎, 用户信息, 日程管理, 会议系统 (with sub-items)
- Verify sidebar does NOT show: AI 写作

- [ ] **Step 4: Test cross-entry URL access**

From `/doc/welcome`, manually navigate to `/meeting/minutes`.
- Verify page loads correctly
- Verify sidebar switches to meeting menu

- [ ] **Step 5: Test backward compatibility**

Open `http://localhost:8000/welcome`.
- Verify redirect to `/doc/welcome`

- [ ] **Step 6: Test root redirect**

Open `http://localhost:8000/`.
- Verify redirect to `/doc/welcome`

- [ ] **Step 7: Test page refresh**

On `/meeting/manage`, refresh the browser.
- Verify sidebar still shows meeting menu
- Verify page content is correct

- [ ] **Step 8: Test login redirect**

Clear localStorage token, visit `/doc/welcome`.
- Verify redirect to `/user/login`
- Login with valid credentials
- Verify final landing is `/doc/welcome`

- [ ] **Step 9: Test set-password redirect**

Use a new account that needs password setup. Visit `/meeting/welcome`.
- Verify redirect to `/user/set-password`
- Set a new password
- Verify final landing is `/doc/welcome` (known limitation per spec)

- [ ] **Step 10: Test shared pages on both entries**

- Open `/doc/user-info` → verify user info page loads
- Open `/meeting/user-info` → verify user info page loads
- Open `/doc/AI/calendar` → verify calendar page loads
- Open `/meeting/AI/calendar` → verify calendar page loads

---

### File Change Summary

| File | Change |
|------|--------|
| `config/routes.ts` | Full restructure: add `withPrefix`, extract `shared`/`docOnly`/`meetingOnly`, add backward-compat redirect |
| `src/app.tsx` | Add `getEntry` + `menuDataRender`; 3 `/welcome` → `/doc/welcome` |
| `src/pages/user/set-password/index.tsx` | 1 `/welcome` → `/doc/welcome` in `getRedirect()` |
| `src/pages/user/login/index.tsx` | No change (line 176 stays as `'/'`) |
| All other pages | No change |
