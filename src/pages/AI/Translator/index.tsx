// Translator.tsx

import {
  CopyOutlined,
  DeleteOutlined,
  FileTextOutlined,
  HistoryOutlined,
  SoundOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  Button,
  Col,
  Input,
  List,
  message,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
  Upload,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { baiduTranslateService } from '@/services/baiduTranslate';

const { TextArea } = Input;
const { Text } = Typography;

interface TranslationHistory {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: Date;
}

const Translator: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('zh-CN');
  const [targetLang, setTargetLang] = useState('en-US');
  const [translationHistory, setTranslationHistory] = useState<
    TranslationHistory[]
  >([]);
  const [_charCount, setCharCount] = useState(0);

  const languages = [
    { label: '中文', value: 'zh-CN' },
    { label: '英语', value: 'en-US' },
    { label: '日语', value: 'ja-JP' },
    { label: '韩语', value: 'ko-KR' },
    { label: '法语', value: 'fr-FR' },
    { label: '德语', value: 'de-DE' },
    { label: '西班牙语', value: 'es-ES' },
    { label: '俄语', value: 'ru-RU' },
  ];

  useEffect(() => {
    setCharCount(sourceText.length);
  }, [sourceText]);

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      message.warning('请输入要翻译的内容');
      return;
    }
    setLoading(true);
    try {
      const result = await baiduTranslateService.translate({
        text: sourceText,
        from: sourceLang,
        to: targetLang,
      });
      setTranslatedText(result);

      const newHistory: TranslationHistory = {
        id: Date.now().toString(),
        sourceText,
        translatedText: result,
        sourceLang,
        targetLang,
        timestamp: new Date(),
      };
      setTranslationHistory([newHistory, ...translationHistory.slice(0, 19)]);

      message.success('翻译完成');
    } catch (error: any) {
      message.error(error.message || '翻译失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSwapLanguages = () => {
    const tempLang = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(tempLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  const handleSpeak = (text: string, lang: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      speechSynthesis.speak(utterance);
    } else {
      message.warning('浏览器不支持语音朗读');
    }
  };

  const handleClear = () => {
    setSourceText('');
    setTranslatedText('');
  };

  const handleLoadHistory = (history: TranslationHistory) => {
    setSourceText(history.sourceText);
    setTranslatedText(history.translatedText);
    setSourceLang(history.sourceLang);
    setTargetLang(history.targetLang);
  };

  const handleDeleteHistory = (id: string) => {
    setTranslationHistory(translationHistory.filter((h) => h.id !== id));
    message.success('已删除历史记录');
  };

  const handleDocumentUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      message.error('文件不能超过 5MB');
      return false;
    }
    setLoading(true);
    try {
      const text = await file.text();
      setSourceText(text);
      message.success('文件加载成功，准备翻译...');
      setTimeout(() => handleTranslate(), 500);
    } catch {
      message.error('文件读取失败');
    } finally {
      setLoading(false);
    }
    return false;
  };

  return (
    <PageContainer
      header={{
        title: 'AI 翻译',
        subTitle: '支持历史记录和文档翻译',
      }}
    >
      <ProCard>
        <Tabs
          items={[
            {
              key: 'text',
              label: '文本翻译',
              children: (
                <Row gutter={[24, 24]}>
                  <Col span={24}>
                    <Space
                      size="large"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <Select
                        value={sourceLang}
                        onChange={setSourceLang}
                        style={{ width: 150 }}
                        options={languages}
                      />
                      <Button
                        icon={<SwapOutlined />}
                        onClick={handleSwapLanguages}
                        shape="circle"
                      />
                      <Select
                        value={targetLang}
                        onChange={setTargetLang}
                        style={{ width: 150 }}
                        options={languages}
                      />
                    </Space>
                  </Col>

                  <Col xs={24} lg={12}>
                    <ProCard title="原文" bordered>
                      <TextArea
                        value={sourceText}
                        onChange={(e) => setSourceText(e.target.value)}
                        placeholder="输入要翻译的内容..."
                        rows={12}
                        maxLength={5000}
                        showCount
                      />
                      <div style={{ marginTop: 16 }}>
                        <Button
                          type="primary"
                          onClick={handleTranslate}
                          loading={loading}
                          block
                          size="large"
                        >
                          翻译
                        </Button>
                        <Button
                          onClick={handleClear}
                          style={{ marginTop: 8 }}
                          block
                        >
                          清空
                        </Button>
                        <Button
                          icon={<SoundOutlined />}
                          onClick={() => handleSpeak(sourceText, sourceLang)}
                          disabled={!sourceText}
                          style={{ marginTop: 8 }}
                          block
                        >
                          朗读
                        </Button>
                      </div>
                    </ProCard>
                  </Col>

                  <Col xs={24} lg={12}>
                    <ProCard title="译文" bordered>
                      <Spin spinning={loading}>
                        <TextArea
                          value={translatedText}
                          placeholder="翻译结果将显示在这里..."
                          rows={12}
                          readOnly
                        />
                        <div style={{ marginTop: 16 }}>
                          <Space>
                            <Button
                              icon={<CopyOutlined />}
                              onClick={() => handleCopy(translatedText)}
                              disabled={!translatedText}
                            >
                              复制
                            </Button>
                            <Button
                              icon={<SoundOutlined />}
                              onClick={() =>
                                handleSpeak(translatedText, targetLang)
                              }
                              disabled={!translatedText}
                            >
                              朗读
                            </Button>
                          </Space>
                        </div>
                      </Spin>
                    </ProCard>
                  </Col>

                  <Col span={24}>
                    <ProCard
                      title={
                        <Space>
                          <HistoryOutlined />
                          <span>翻译历史</span>
                          <Tag color="blue">{translationHistory.length}</Tag>
                        </Space>
                      }
                      bordered
                      collapsible
                      defaultCollapsed
                    >
                      <List
                        dataSource={translationHistory}
                        locale={{ emptyText: '暂无历史记录' }}
                        renderItem={(item) => (
                          <List.Item
                            actions={[
                              <Button
                                key="load"
                                type="link"
                                size="small"
                                onClick={() => handleLoadHistory(item)}
                              >
                                加载
                              </Button>,
                              <Button
                                key="delete"
                                type="link"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleDeleteHistory(item.id)}
                              />,
                            ]}
                          >
                            <List.Item.Meta
                              title={
                                <Space>
                                  <Tag color="blue">
                                    {
                                      languages.find(
                                        (l) => l.value === item.sourceLang,
                                      )?.label
                                    }
                                  </Tag>
                                  <SwapOutlined />
                                  <Tag color="green">
                                    {
                                      languages.find(
                                        (l) => l.value === item.targetLang,
                                      )?.label
                                    }
                                  </Tag>
                                </Space>
                              }
                              description={
                                <div>
                                  <Text type="secondary">
                                    {item.sourceText.substring(0, 50)}
                                    {item.sourceText.length > 50 ? '...' : ''}
                                  </Text>
                                  <br />
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 12 }}
                                  >
                                    {item.timestamp.toLocaleString('zh-CN')}
                                  </Text>
                                </div>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    </ProCard>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'document',
              label: '文档翻译',
              children: (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <Upload.Dragger
                    beforeUpload={handleDocumentUpload}
                    maxCount={1}
                    accept=".txt,.doc,.docx,.pdf,.md"
                  >
                    <p className="ant-upload-drag-icon">
                      <FileTextOutlined style={{ fontSize: 48 }} />
                    </p>
                    <p className="ant-upload-text">点击或拖拽文件上传</p>
                    <p className="ant-upload-hint">
                      支持 TXT、MD、DOC、DOCX、PDF，最大 5MB
                    </p>
                  </Upload.Dragger>
                  {loading && (
                    <div style={{ marginTop: 24 }}>
                      <Progress percent={50} status="active" />
                      <Text type="secondary">正在处理文档...</Text>
                    </div>
                  )}
                </div>
              ),
            },
          ]}
        />
      </ProCard>
    </PageContainer>
  );
};

export default Translator;
