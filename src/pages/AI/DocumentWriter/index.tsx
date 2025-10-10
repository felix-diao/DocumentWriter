import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BoldOutlined,
  CloudUploadOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileTextOutlined,
  ItalicOutlined,
  //SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  OrderedListOutlined,
  ReloadOutlined,
  StrikethroughOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  Button,
  Col,
  Input,
  List,
  Modal,
  message,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Typography,
  Upload,
  //Drawer,
} from 'antd';
import React, { useState } from 'react';
import { aiOptimizeDocument, aiWriteDocument } from '@/services/ai';
import { ossStorageService } from '@/services/ossStorage';

const { TextArea } = Input;
const { Title } = Typography;

interface SavedDocument {
  id: string;
  title: string;
  content: string;
  type: string;
  scenario?: string;
  url?: string;
  createdAt: Date;
  size?: number;
}

const DocumentWriter: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [content, setContent] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [documentType, setDocumentType] = useState<string>('speech');
  const [scenario, setScenario] = useState<string>('');
  const [titleInput, setTitleInput] = useState('');
  const [lengthOption, setLengthOption] = useState<'short' | 'medium' | 'long'>(
    'medium',
  );
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [savedDocs, setSavedDocs] = useState<SavedDocument[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(true);

  const scenarioOptions: Record<string, { label: string; value: string }[]> = {
    speech: [
      { label: '开场演讲', value: 'opening' },
      { label: '闭幕演讲', value: 'closing' },
    ],
    notice: [
      { label: '内部通知', value: 'internal' },
      { label: '外部通知', value: 'external' },
    ],
    report: [
      { label: '个人工作报告', value: 'personal' },
      { label: '单位工作报告', value: 'unit' },
      { label: '专项工作报告', value: 'special' },
    ],
    research: [
      { label: '市场调研报告', value: 'market' },
      { label: '行业调研报告', value: 'industry' },
    ],
    suggestion: [
      { label: '政策建议', value: 'policy' },
      { label: '管理建议', value: 'management' },
    ],
  };

  const formatContentToHTML = (text: string) => {
    if (!text) return '<p><br></p>';

    return text
      .split('\n')
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return '<p><br></p>';

        if (trimmed.startsWith('#')) {
          const level = (line.match(/^#+/) || [''])[0].length;
          const content = trimmed.replace(/^#+\s*/, '');
          if (level === 1) {
            return `<h1 style="text-align: center; font-size: 22px; font-weight: bold; margin: 20px 0;">${content}</h1>`;
          } else if (level === 2) {
            return `<h2 style="font-size: 18px; font-weight: bold; margin: 16px 0 8px 0;">${content}</h2>`;
          } else {
            return `<h3 style="font-size: 16px; font-weight: bold; margin: 12px 0 6px 0;">${content}</h3>`;
          }
        }

        return `<p style="text-indent: 2em; line-height: 2; margin: 8px 0;">${trimmed}</p>`;
      })
      .join('');
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      message.warning('请输入文档主题或描述');
      return;
    }
    setLoading(true);
    try {
      const filesContent = uploadedFiles
        .map((f) => `\n[附加素材: ${f.name}]`)
        .join('');
      const response = await aiWriteDocument({
        prompt: `${prompt}\n类型: ${documentType}\n场景: ${scenario}\n字数: ${lengthOption}${filesContent}`,
        documentType: documentType as any,
        tone: 'formal',
        language: 'zh-CN',
      });
      const generatedContent = response.data?.content || '';
      setContent(generatedContent);
      setHtmlContent(formatContentToHTML(generatedContent));
      message.success('文档生成成功');
    } catch (error) {
      message.error('生成失败，请重试');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    if (!content.trim()) {
      message.warning('请先生成文档内容');
      return;
    }
    setLoading(true);
    try {
      const response = await aiOptimizeDocument({
        content,
        optimizationType: 'all',
      });
      const optimizedContent = response.data?.content || '';
      setContent(optimizedContent);
      setHtmlContent(formatContentToHTML(optimizedContent));
      message.success('文档优化成功');
    } catch (error) {
      message.error('优化失败，请重试');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const editor = document.getElementById('word-editor');
    if (editor) {
      const text = editor.innerText;
      navigator.clipboard.writeText(text);
      message.success('已复制到剪贴板');
    }
  };

  const handleSaveToCloud = () => {
    if (!content.trim()) {
      message.warning('请先生成文档内容');
      return;
    }
    setShowSaveModal(true);
  };

  const handleConfirmSave = async () => {
    if (!titleInput.trim()) {
      message.warning('请输入文档标题');
      return;
    }
    setLoading(true);
    setUploadProgress(0);
    try {
      const editor = document.getElementById('word-editor');
      const currentContent = editor?.innerText || content;
      const blob = new Blob([currentContent], { type: 'text/plain' });
      const file = new File([blob], `${titleInput}.txt`, {
        type: 'text/plain',
      });
      const result = await ossStorageService.uploadFile(file, {
        folder: 'documents',
        onProgress: (percent) => setUploadProgress(percent),
      });
      const newDoc: SavedDocument = {
        id: Date.now().toString(),
        title: titleInput,
        content: currentContent,
        type: documentType,
        scenario,
        url: result.url,
        createdAt: new Date(),
        size: result.size,
      };
      setSavedDocs([newDoc, ...savedDocs]);
      message.success('文档已保存到云端');
      setShowSaveModal(false);
      setTitleInput('');
    } catch (error: any) {
      message.error(error.message || '保存失败');
      console.error(error);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = (doc: SavedDocument) => {
    const blob = new Blob([doc.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('下载成功');
  };

  const handleDelete = (docId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个文档吗？',
      onOk: () => {
        setSavedDocs(savedDocs.filter((d) => d.id !== docId));
        message.success('文档已删除');
      },
    });
  };

  const handleLoadDocument = (doc: SavedDocument) => {
    setContent(doc.content);
    setHtmlContent(formatContentToHTML(doc.content));
    setDocumentType(doc.type);
    setScenario(doc.scenario || '');
    message.success('文档已加载');
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const text = e.currentTarget.innerText;
    setContent(text);
  };

  return (
    <PageContainer
      header={{
        title: 'AI 公文生成器',
        subTitle: '根据公文类型和场景快速生成、优化文档，支持云端存储',
        extra: [
          <Button
            key="toggle"
            icon={
              settingsPanelOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />
            }
            onClick={() => setSettingsPanelOpen(!settingsPanelOpen)}
          >
            {settingsPanelOpen ? '收起设置面板' : '展开设置面板'}
          </Button>,
        ],
      }}
    >
      <Row gutter={[16, 16]}>
        {/* 中间和左侧：文档编辑器 - 占据主要空间 */}
        <Col xs={24} lg={settingsPanelOpen ? 16 : 24}>
          <ProCard bordered>
            <Spin spinning={loading}>
              <Space
                direction="vertical"
                style={{ width: '100%' }}
                size="middle"
              >
                {/* Word风格工具栏 */}
                <div
                  style={{
                    background: '#fafafa',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #e8e8e8',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <Select
                    defaultValue="16px"
                    style={{ width: 90 }}
                    size="small"
                    onChange={(val) => execCommand('fontSize', val)}
                    options={[
                      { label: '12px', value: '2' },
                      { label: '14px', value: '3' },
                      { label: '16px', value: '4' },
                      { label: '18px', value: '5' },
                      { label: '20px', value: '6' },
                      { label: '24px', value: '7' },
                    ]}
                  />

                  <div
                    style={{ borderLeft: '1px solid #d9d9d9', height: '24px' }}
                  />

                  <Button
                    size="small"
                    icon={<BoldOutlined />}
                    onClick={() => execCommand('bold')}
                    title="粗体 (Ctrl+B)"
                  />
                  <Button
                    size="small"
                    icon={<ItalicOutlined />}
                    onClick={() => execCommand('italic')}
                    title="斜体 (Ctrl+I)"
                  />
                  <Button
                    size="small"
                    icon={<UnderlineOutlined />}
                    onClick={() => execCommand('underline')}
                    title="下划线 (Ctrl+U)"
                  />
                  <Button
                    size="small"
                    icon={<StrikethroughOutlined />}
                    onClick={() => execCommand('strikeThrough')}
                    title="删除线"
                  />

                  <div
                    style={{ borderLeft: '1px solid #d9d9d9', height: '24px' }}
                  />

                  <Button
                    size="small"
                    icon={<AlignLeftOutlined />}
                    onClick={() => execCommand('justifyLeft')}
                    title="左对齐"
                  />
                  <Button
                    size="small"
                    icon={<AlignCenterOutlined />}
                    onClick={() => execCommand('justifyCenter')}
                    title="居中对齐"
                  />
                  <Button
                    size="small"
                    icon={<AlignRightOutlined />}
                    onClick={() => execCommand('justifyRight')}
                    title="右对齐"
                  />

                  <div
                    style={{ borderLeft: '1px solid #d9d9d9', height: '24px' }}
                  />

                  <Button
                    size="small"
                    icon={<OrderedListOutlined />}
                    onClick={() => execCommand('insertOrderedList')}
                    title="编号列表"
                  />
                  <Button
                    size="small"
                    icon={<UnorderedListOutlined />}
                    onClick={() => execCommand('insertUnorderedList')}
                    title="项目符号"
                  />

                  <div style={{ flex: 1 }} />

                  <Space>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={handleOptimize}
                      disabled={!content}
                      size="small"
                    >
                      优化
                    </Button>
                    <Button
                      icon={<CopyOutlined />}
                      onClick={handleCopy}
                      disabled={!content}
                      size="small"
                    >
                      复制
                    </Button>
                    <Button
                      icon={<CloudUploadOutlined />}
                      onClick={handleSaveToCloud}
                      disabled={!content}
                      type="primary"
                      size="small"
                    >
                      保存
                    </Button>
                  </Space>
                </div>

                {/* Word风格编辑器 */}
                <div
                  style={{
                    background: '#f0f0f0',
                    padding: '20px',
                    borderRadius: '4px',
                    minHeight: '75vh',
                  }}
                >
                  <div
                    id="word-editor"
                    contentEditable
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                    onInput={handleInput}
                    style={{
                      minHeight: settingsPanelOpen ? '700px' : '75vh',
                      background: 'white',
                      padding: '2.54cm 3.18cm',
                      boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                      fontSize: '16px',
                      lineHeight: '2',
                      fontFamily: '仿宋, FangSong, STFangsong, serif',
                      color: '#333',
                      outline: 'none',
                      overflowY: 'auto',
                      maxHeight: '75vh',
                    }}
                  />
                </div>
              </Space>
            </Spin>
          </ProCard>
        </Col>

        {/* 右侧：设置面板 - 可收起 */}
        {settingsPanelOpen && (
          <Col xs={24} lg={8}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* 输入设置 */}
              <ProCard title="文档设置" bordered>
                <Space
                  direction="vertical"
                  style={{ width: '100%' }}
                  size="middle"
                >
                  <div>
                    <Title level={5}>公文类型</Title>
                    <Select
                      value={documentType}
                      onChange={(val) => {
                        setDocumentType(val);
                        setScenario('');
                      }}
                      style={{ width: '100%' }}
                      options={[
                        { label: '演讲稿', value: 'speech' },
                        { label: '通知', value: 'notice' },
                        { label: '工作报告', value: 'report' },
                        { label: '调研报告', value: 'research' },
                        { label: '意见建议', value: 'suggestion' },
                      ]}
                    />
                  </div>

                  <div>
                    <Title level={5}>写作场景</Title>
                    <Select
                      value={scenario}
                      onChange={setScenario}
                      style={{ width: '100%' }}
                      options={scenarioOptions[documentType] || []}
                    />
                  </div>

                  <div>
                    <Title level={5}>公文标题</Title>
                    <Input
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      placeholder="请输入公文标题"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <Title level={5}>字数</Title>
                    <Select
                      value={lengthOption}
                      onChange={setLengthOption}
                      style={{ width: '100%' }}
                      options={[
                        { label: '短 (500字左右)', value: 'short' },
                        { label: '中 (1000字左右)', value: 'medium' },
                        { label: '长 (2000字以上)', value: 'long' },
                      ]}
                    />
                  </div>

                  <div>
                    <Title level={5}>写作素材（可选）</Title>
                    <Upload
                      beforeUpload={(file) => {
                        setUploadedFiles([...uploadedFiles, file]);
                        return false;
                      }}
                      multiple
                      fileList={uploadedFiles.map((f, idx) => ({
                        uid: `${f.name}-${idx}`,
                        name: f.name,
                        status: 'done' as const,
                      }))}
                      onRemove={(file) => {
                        const idx = uploadedFiles.findIndex(
                          (f, i) => `${f.name}-${i}` === file.uid,
                        );
                        if (idx > -1) {
                          const newFiles = [...uploadedFiles];
                          newFiles.splice(idx, 1);
                          setUploadedFiles(newFiles);
                        }
                      }}
                    >
                      <Button icon={<UploadOutlined />} block>
                        添加文件
                      </Button>
                    </Upload>
                  </div>

                  <div>
                    <Title level={5}>文档描述</Title>
                    <TextArea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="请输入文档主题或详细描述..."
                      rows={4}
                      maxLength={2000}
                      showCount
                    />
                  </div>

                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={handleGenerate}
                    loading={loading}
                    block
                    size="large"
                  >
                    生成文档
                  </Button>
                </Space>
              </ProCard>

              {/* 已保存文档列表 */}
              <ProCard title="已保存的文档" bordered>
                <List
                  dataSource={savedDocs}
                  locale={{ emptyText: '暂无保存的文档' }}
                  renderItem={(doc) => (
                    <List.Item
                      actions={[
                        <Button
                          key="load"
                          type="link"
                          size="small"
                          onClick={() => handleLoadDocument(doc)}
                        >
                          加载
                        </Button>,
                        <Button
                          key="download"
                          type="link"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownload(doc)}
                        />,
                        <Button
                          key="delete"
                          type="link"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDelete(doc.id)}
                        />,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <FileTextOutlined
                            style={{ fontSize: 24, color: '#1890ff' }}
                          />
                        }
                        title={doc.title}
                        description={
                          <Space direction="vertical" size={0}>
                            <span style={{ fontSize: '12px' }}>
                              类型: {doc.type}
                            </span>
                            {doc.scenario && (
                              <span style={{ fontSize: '12px' }}>
                                场景: {doc.scenario}
                              </span>
                            )}
                            <span style={{ fontSize: '12px' }}>
                              {doc.createdAt.toLocaleDateString('zh-CN')}
                            </span>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              </ProCard>
            </Space>
          </Col>
        )}
      </Row>

      <Modal
        title="保存文档到云端"
        open={showSaveModal}
        onOk={handleConfirmSave}
        onCancel={() => {
          setShowSaveModal(false);
          setTitleInput('');
        }}
        confirmLoading={loading}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={5}>文档标题</Title>
            <Input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="请输入文档标题"
              maxLength={100}
            />
          </div>
          {uploadProgress > 0 && (
            <Progress percent={uploadProgress} status="active" />
          )}
        </Space>
      </Modal>
    </PageContainer>
  );
};

export default DocumentWriter;
