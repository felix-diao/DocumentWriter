import { PageContainer } from '@ant-design/pro-components';
import { history, useLocation, useModel } from '@umijs/max';
import { Card, theme } from 'antd';
import React from 'react';
import InfoCard from '@/components/InfoCard';
import { normalizeAppPath } from '@/utils/appPath';

type WelcomeEntry = 'doc' | 'meeting';

const copyByEntry: Record<WelcomeEntry, {
  title: string;
  heading: string;
  description: string;
  cards: Array<{ title: string; desc: string; target: string }>;
}> = {
  doc: {
    title: 'AI 文档助手',
    heading: '欢迎使用 AI 文档助手',
    description:
      'AI 文档助手是一个专为企业和个人打造的智能文档管理与处理工具。它整合了人工智能技术与高效的文档管理方案，支持文档快速检索、智能摘要、内容生成和协作编辑，让用户能够更便捷地创建、管理和共享文档，提高工作效率。',
    cards: [
      {
        title: 'AI 文档书写',
        desc: '智能文档编辑与书写功能，支持快速创建、格式优化和内容补全，让写作更高效。',
        target: '/doc/AI/document-writer',
      },
      {
        title: '知识库',
        desc: '沉淀常用资料和业务知识，支持文档检索、内容复用和协作管理。',
        target: '/doc/AI/knowledge-base',
      },
    ],
  },
  meeting: {
    title: 'AI 会议助手',
    heading: '欢迎使用 AI 会议助手',
    description:
      'AI 会议助手面向会议记录、音频转写和纪要生成场景，支持会议管理、在线录音、本地音频转写、自动生成会议纪要和任务分配，让会议材料整理更高效。',
    cards: [
      {
        title: '会议管理',
        desc: '统一管理会议日程、会议资料和参会信息，快速进入录音与纪要处理流程。',
        target: '/meeting/meetings/manage',
      },
      {
        title: '会议纪要',
        desc: '支持会议记录、音频转写、自动生成会议纪要和待办任务，让会议成果更清晰。',
        target: '/meeting/meetings/minutes',
      },
    ],
  },
};

const getEntry = (pathname: string): WelcomeEntry => {
  const appPath = normalizeAppPath(pathname);
  return appPath === '/meeting' || appPath.startsWith('/meeting/') ? 'meeting' : 'doc';
};

const Welcome: React.FC = () => {
  const { token } = theme.useToken();
  const { initialState } = useModel('@@initialState');
  const location = useLocation();
  const entry = getEntry(location.pathname);
  const copy = copyByEntry[entry];

  return (
    <PageContainer title={copy.title}>
      <Card
        style={{
          borderRadius: 8,
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
            {copy.heading}
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
            {copy.description}
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            {copy.cards.map((card, index) => (
              <InfoCard
                key={card.target}
                index={index + 1}
                title={card.title}
                desc={card.desc}
                onClick={() => history.push(card.target)}
              />
            ))}
          </div>
        </div>
      </Card>
    </PageContainer>
  );
};

export default Welcome;
