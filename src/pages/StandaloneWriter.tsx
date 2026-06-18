import { history, Outlet, useLocation, useModel } from '@umijs/max';
import {
  DatabaseOutlined,
  EditOutlined,
  FileTextOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Spin, Typography } from 'antd';
import { useEffect, useMemo } from 'react';
import { normalizeAppPath, withAppBase } from '@/utils/appPath';

const { Sider, Content } = Layout;

const menuItems = [
  { key: '/ai-writer/write', icon: <EditOutlined />, label: '写作' },
  { key: '/ai-writer/knowledge', icon: <DatabaseOutlined />, label: '知识库' },
  { key: '/ai-writer/prompts', icon: <FileTextOutlined />, label: 'Prompt 管理' },
  { key: '/ai-writer/history', icon: <MessageOutlined />, label: '会话历史' },
];

const StandaloneWriter: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const location = useLocation();
  const loading = initialState === undefined || initialState?.loading;
  const isLoggedIn = !!initialState?.currentUser;

  const selectedKey = useMemo(() => {
    const currentAppPath = normalizeAppPath(location.pathname);
    const match = menuItems.find((item) => currentAppPath.startsWith(item.key));
    return match?.key ?? menuItems[0].key;
  }, [location.pathname]);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      history.push(
        `/user/login?redirect=${encodeURIComponent(normalizeAppPath(location.pathname))}`,
      );
    }
  }, [loading, isLoggedIn, location.pathname]);

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

  if (!isLoggedIn) {
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
            AI 写作助手
          </Typography.Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => history.push(String(key))}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>
      <Content style={{ overflow: 'auto' }}>
        <Outlet />
      </Content>
    </Layout>
  );
};

export default StandaloneWriter;
