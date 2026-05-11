import { history, useModel } from '@umijs/max';
import { Card, theme } from 'antd';
import React from 'react';
import InfoCard from '@/components/InfoCard';

const Landing: React.FC = () => {
  const { token } = theme.useToken();
  const { initialState } = useModel('@@initialState');

  const isLoggedIn =
    !!initialState?.currentUser ||
    !!localStorage.getItem('access_token');

  const handleEnter = (entry: 'doc' | 'meeting') => {
    const target = `/${entry}/welcome`;
    if (isLoggedIn) {
      history.push(target);
    } else {
      history.push(`/user/login?redirect=${encodeURIComponent(target)}`);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(75deg, #FBFDFF 0%, #F5F7FF 100%)',
        padding: 24,
      }}
    >
      <Card
        style={{
          borderRadius: 8,
          maxWidth: 800,
          width: '100%',
        }}
        styles={{
          body: {
            backgroundImage:
              initialState?.settings?.navTheme === 'realDark'
                ? 'linear-gradient(75deg, #1A1B1F 0%, #191C1F 100%)'
                : 'linear-gradient(75deg, #FBFDFF 0%, #F5F7FF 100%)',
          },
        }}
      >
        <div
          style={{
            backgroundPosition: '100% -30%',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '274px auto',
            backgroundImage:
              "url('https://gw.alipayobjects.com/mdn/rms_a9745b/afts/img/A*BuFmQqsB2iAAAAAAAAAAAAAAARQnAQ')",
          }}
        >
          <div
            style={{
              fontSize: '20px',
              color: token.colorTextHeading,
            }}
          >
            AI 文档助手
          </div>
          <p
            style={{
              fontSize: '14px',
              color: token.colorTextSecondary,
              lineHeight: '22px',
              marginTop: 16,
              marginBottom: 32,
              width: '65%',
            }}
          >
            AI 文档助手是一个专为企业和个人打造的智能文档管理与处理工具。它整合了人工智能技术与高效的文档管理方案，
            支持文档快速检索、智能摘要、内容生成和协作编辑，让用户能够更便捷地创建、管理和共享文档，提高工作效率。
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <InfoCard
              index={1}
              title="AI 公文写作"
              desc="智能文档编辑与书写功能，支持快速创建、格式优化和内容补全，让写作更高效。"
              onClick={() => handleEnter('doc')}
            />
            <InfoCard
              index={2}
              title="AI 会议助手"
              desc="智能会议助手，支持会议记录、自动生成会议纪要和任务分配，让会议更高效。"
              onClick={() => handleEnter('meeting')}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Landing;
