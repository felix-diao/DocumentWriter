import { history, Outlet, useLocation, useModel } from '@umijs/max';
import {
  CalendarOutlined,
  FileTextOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Spin, Typography } from 'antd';
import { useEffect, useMemo } from 'react';

const { Sider, Content } = Layout;

const menuItems = [
  { key: '/ai-meeting/manage', icon: <CalendarOutlined />, label: '会议管理' },
  { key: '/ai-meeting/minutes', icon: <FileTextOutlined />, label: '会议纪要' },
  { key: '/ai-meeting/sessions', icon: <MessageOutlined />, label: '会话历史' },
];

const setPasswordPath = '/user/set-password';
const loginPath = '/user/login';

const StandaloneMeeting: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const location = useLocation();
  const loading = initialState === undefined || initialState?.loading;
  const isLoggedIn = !!initialState?.currentUser;
  const needsPasswordSetup = initialState?.currentUser?.needs_password_setup;

  const selectedKey = useMemo(() => {
    const match = menuItems.find((item) => location.pathname.startsWith(item.key));
    return match?.key ?? menuItems[0].key;
  }, [location.pathname]);

  useEffect(() => {
    if (loading) return;
    // 新用户需要设置密码，跳转到设置密码页面
    if (isLoggedIn && needsPasswordSetup && location.pathname !== setPasswordPath) {
      history.push(`${setPasswordPath}?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    // 未登录跳转到登录页面
    if (!isLoggedIn) {
      history.push(`${loginPath}?redirect=${encodeURIComponent(location.pathname)}`);
    }
  }, [loading, isLoggedIn, needsPasswordSetup, location.pathname]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  // 未登录或需要设置密码时，返回 null 等待跳转
  if (!isLoggedIn || needsPasswordSetup) {
    return null;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={200}
        style={{
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Typography.Title level={5} style={{ margin: 0 }}>
            AI 会议助手
          </Typography.Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => history.push(key)}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>
      <Content style={{ overflow: 'auto' }}>
        <Outlet />
      </Content>
    </Layout>
  );
};

export default StandaloneMeeting;
