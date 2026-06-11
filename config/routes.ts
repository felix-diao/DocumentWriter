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
  {
    path: '/ai-writer',
    component: './StandaloneWriter',
    layout: false,
    routes: [
      { path: '/ai-writer/write', component: './AI/DocumentWriter' },
      { path: '/ai-writer/knowledge', component: './AI/KnowledgeBase' },
      { path: '/ai-writer/prompts', component: './AI/PromptManager' },
      { path: '/ai-writer/history', component: './AI/ConversationHistory' },
      { path: '/ai-writer', redirect: '/ai-writer/write' },
    ],
  },
  {
    path: '/ai-meeting',
    component: './StandaloneMeeting',
    layout: false,
    routes: [
      { path: '/ai-meeting/minutes', component: './Meetings/Minutes' },
      { path: '/ai-meeting/manage', component: './Meetings/Management' },
      { path: '/ai-meeting/sessions', component: './Meetings/Minutes' },
      { path: '/ai-meeting', redirect: '/ai-meeting/manage' },
    ],
  },
  {
    path: '/mobile',
    component: './Mobile/index',
    layout: false,
    routes: [
      { path: '/mobile', redirect: '/mobile/meetings' },
      { path: '/mobile/login', component: './Mobile/Login' },
      { path: '/mobile/meetings', component: './Mobile/MeetingList' },
      { path: '/mobile/record/:id', component: './Mobile/Record' },
      { path: '/mobile/detail/:id', component: './Mobile/MeetingDetail' },
    ],
  },
  { path: '/', component: './Landing', layout: false },
  { path: '/meeting', redirect: '/meeting/welcome' },
  { path: '/doc', redirect: '/doc/welcome' },
  {
    component: '404',
    layout: false,
    path: '/*',
  },
];
