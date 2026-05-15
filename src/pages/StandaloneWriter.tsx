import { history, useModel } from '@umijs/max';
import { Spin } from 'antd';
import { useEffect } from 'react';
import DocumentWriter from './AI/DocumentWriter';

const StandaloneWriter: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const loading = initialState === undefined || initialState?.loading;
  const isLoggedIn = !!initialState?.currentUser;

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      history.push(`/user/login?redirect=${encodeURIComponent('/ai-writer')}`);
    }
  }, [loading, isLoggedIn]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return <DocumentWriter />;
};

export default StandaloneWriter;
