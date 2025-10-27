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
  EyeOutlined,
  FileTextOutlined,
  FontColorsOutlined,
  HighlightOutlined,
  ItalicOutlined,
  LeftOutlined,
  LinkOutlined,
  OrderedListOutlined,
  RedoOutlined,
  ReloadOutlined,
  RightOutlined,
  SettingOutlined,
  StrikethroughOutlined,
  TableOutlined,
  UnderlineOutlined,
  UndoOutlined,
  UnorderedListOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  Button,
  Checkbox,
  Col,
  Collapse,
  Empty,
  Input,
  List,
  Modal,
  message,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { aiOptimizeDocument, aiWriteDocument } from '@/services/ai';
import { ossStorageService } from '@/services/ossStorage';
import type { PromptTemplate } from '@/services/prompt';
import { getPrompts } from '@/services/prompt';

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

  // Prompt 模板相关状态
  const [availablePrompts, setAvailablePrompts] = useState<PromptTemplate[]>(
    [],
  );
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([]);
  const [promptPreviewVisible, setPromptPreviewVisible] = useState(false);
  const [previewingPrompt, setPreviewingPrompt] =
    useState<PromptTemplate | null>(null);
  const [promptsLoading, setPromptsLoading] = useState(false);

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

  // 加载 Prompt 模板
  useEffect(() => {
    loadPrompts();
  }, [documentType]);

  const loadPrompts = async () => {
    setPromptsLoading(true);
    try {
      const response = await getPrompts({
        category: documentType,
        isActive: true,
        pageSize: 100,
      });
      setAvailablePrompts(response.data || []);
    } catch (error) {
      console.error('加载 Prompt 模板失败:', error);
    } finally {
      setPromptsLoading(false);
    }
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
            return `<h1 style="text-align: center; font-size: 22px; font-weight: bold; margin: 24px 0 20px 0; color: #000; font-family: '黑体', 'SimHei', sans-serif;">${content}</h1>`;
          } else if (level === 2) {
            return `<h2 style="font-size: 18px; font-weight: bold; margin: 20px 0 12px 0; color: #000; font-family: '黑体', 'SimHei', sans-serif;">${content}</h2>`;
          } else {
            return `<h3 style="font-size: 16px; font-weight: bold; margin: 16px 0 10px 0; color: #000; font-family: '黑体', 'SimHei', sans-serif;">${content}</h3>`;
          }
        }

        return `<p style="text-indent: 2em; line-height: 1.75; margin: 8px 0; font-size: 16px; color: #000;">${trimmed}</p>`;
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
      // 合并选中的 Prompt 模板
      const selectedPrompts = availablePrompts.filter((p) =>
        selectedPromptIds.includes(p.id),
      );
      const promptsContent = selectedPrompts
        .map((p) => `\n[模板: ${p.name}]\n${p.content}`)
        .join('\n\n');

      const filesContent = uploadedFiles
        .map((f) => `\n[附加素材: ${f.name}]`)
        .join('');

      const finalPrompt = `${promptsContent ? promptsContent + '\n\n' : ''}${prompt}\n类型: ${documentType}\n场景: ${scenario}\n字数: ${lengthOption}${filesContent}`;

      const response = await aiWriteDocument({
        prompt: finalPrompt,
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

  const insertTable = () => {
    const table =
      '<table border="1" style="border-collapse: collapse; width: 100%; margin: 12px 0; border: 1px solid #000;"><tr><td style="padding: 8px; border: 1px solid #000;">单元格1</td><td style="padding: 8px; border: 1px solid #000;">单元格2</td></tr><tr><td style="padding: 8px; border: 1px solid #000;">单元格3</td><td style="padding: 8px; border: 1px solid #000;">单元格4</td></tr></table>';
    execCommand('insertHTML', table);
  };

  return (
    <PageContainer
      header={{
        title: 'AI 公文生成器',
        subTitle: '智能写作，高效办公',
      }}
    >
      <div style={{ position: 'relative' }}>
        <Row gutter={[16, 16]}>
          {/* 左侧：文档编辑器 */}
          <Col xs={24} lg={settingsPanelOpen ? 16 : 24}>
            <ProCard bordered>
              <Spin spinning={loading}>
                <Space
                  direction="vertical"
                  style={{ width: '100%' }}
                  size="middle"
                >
                  {/* Word 风格工具栏 */}
                  <div
                    style={{
                      background: '#f3f4f6',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      alignItems: 'center',
                    }}
                  >
                    <Select
                      defaultValue="16px"
                      style={{ width: 85 }}
                      size="small"
                      onChange={(val) => execCommand('fontSize', val)}
                      options={[
                        { label: '12px', value: '2' },
                        { label: '14px', value: '3' },
                        { label: '16px', value: '4' },
                        { label: '18px', value: '5' },
                        { label: '20px', value: '6' },
                      ]}
                    />

                    <div
                      style={{
                        borderLeft: '1px solid #d1d5db',
                        height: '20px',
                        margin: '0 4px',
                      }}
                    />

                    <Tooltip title="粗体">
                      <Button
                        size="small"
                        icon={<BoldOutlined />}
                        onClick={() => execCommand('bold')}
                      />
                    </Tooltip>
                    <Tooltip title="斜体">
                      <Button
                        size="small"
                        icon={<ItalicOutlined />}
                        onClick={() => execCommand('italic')}
                      />
                    </Tooltip>
                    <Tooltip title="下划线">
                      <Button
                        size="small"
                        icon={<UnderlineOutlined />}
                        onClick={() => execCommand('underline')}
                      />
                    </Tooltip>
                    <Tooltip title="删除线">
                      <Button
                        size="small"
                        icon={<StrikethroughOutlined />}
                        onClick={() => execCommand('strikeThrough')}
                      />
                    </Tooltip>

                    <div
                      style={{
                        borderLeft: '1px solid #d1d5db',
                        height: '20px',
                        margin: '0 4px',
                      }}
                    />

                    <Tooltip title="字体颜色">
                      <Button
                        size="small"
                        icon={<FontColorsOutlined />}
                        onClick={() => {
                          const color = window.prompt(
                            '请输入颜色（如：red 或 #ff0000）',
                            '#000000',
                          );
                          if (color) execCommand('foreColor', color);
                        }}
                      />
                    </Tooltip>
                    <Tooltip title="高亮">
                      <Button
                        size="small"
                        icon={<HighlightOutlined />}
                        onClick={() => execCommand('backColor', '#ffff00')}
                      />
                    </Tooltip>

                    <div
                      style={{
                        borderLeft: '1px solid #d1d5db',
                        height: '20px',
                        margin: '0 4px',
                      }}
                    />

                    <Tooltip title="左对齐">
                      <Button
                        size="small"
                        icon={<AlignLeftOutlined />}
                        onClick={() => execCommand('justifyLeft')}
                      />
                    </Tooltip>
                    <Tooltip title="居中">
                      <Button
                        size="small"
                        icon={<AlignCenterOutlined />}
                        onClick={() => execCommand('justifyCenter')}
                      />
                    </Tooltip>
                    <Tooltip title="右对齐">
                      <Button
                        size="small"
                        icon={<AlignRightOutlined />}
                        onClick={() => execCommand('justifyRight')}
                      />
                    </Tooltip>

                    <div
                      style={{
                        borderLeft: '1px solid #d1d5db',
                        height: '20px',
                        margin: '0 4px',
                      }}
                    />

                    <Tooltip title="编号">
                      <Button
                        size="small"
                        icon={<OrderedListOutlined />}
                        onClick={() => execCommand('insertOrderedList')}
                      />
                    </Tooltip>
                    <Tooltip title="符号">
                      <Button
                        size="small"
                        icon={<UnorderedListOutlined />}
                        onClick={() => execCommand('insertUnorderedList')}
                      />
                    </Tooltip>
                    <Tooltip title="表格">
                      <Button
                        size="small"
                        icon={<TableOutlined />}
                        onClick={insertTable}
                      />
                    </Tooltip>
                    <Tooltip title="链接">
                      <Button
                        size="small"
                        icon={<LinkOutlined />}
                        onClick={() => {
                          const url = window.prompt('请输入链接地址:');
                          if (url) execCommand('createLink', url);
                        }}
                      />
                    </Tooltip>

                    <div
                      style={{
                        borderLeft: '1px solid #d1d5db',
                        height: '20px',
                        margin: '0 4px',
                      }}
                    />

                    <Tooltip title="撤销">
                      <Button
                        size="small"
                        icon={<UndoOutlined />}
                        onClick={() => execCommand('undo')}
                      />
                    </Tooltip>
                    <Tooltip title="重做">
                      <Button
                        size="small"
                        icon={<RedoOutlined />}
                        onClick={() => execCommand('redo')}
                      />
                    </Tooltip>

                    <div style={{ flex: 1 }} />

                    <Space size="small">
                      <Button
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={handleOptimize}
                        disabled={!content}
                      >
                        优化
                      </Button>
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={handleCopy}
                        disabled={!content}
                      >
                        复制
                      </Button>
                      <Button
                        size="small"
                        type="primary"
                        icon={<CloudUploadOutlined />}
                        onClick={handleSaveToCloud}
                        disabled={!content}
                      >
                        保存
                      </Button>
                    </Space>
                  </div>

                  {/* 标准 A4 Word 编辑器 */}
                  <div
                    style={{
                      background: '#e5e5e5',
                      padding: '40px 20px',
                      borderRadius: '4px',
                      minHeight: '900px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      id="word-editor"
                      contentEditable
                      // biome-ignore lint/security/noDangerouslySetInnerHtml: 需要渲染富文本编辑器内容
                      dangerouslySetInnerHTML={{ __html: htmlContent }}
                      onInput={handleInput}
                      style={{
                        width: '21cm',
                        minHeight: '29.7cm',
                        background: '#ffffff',
                        padding: '2.54cm 3.18cm',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        fontSize: '16px',
                        lineHeight: '1.75',
                        fontFamily:
                          '"Times New Roman", "仿宋", "FangSong", "SimSun", serif',
                        color: '#000',
                        outline: 'none',
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                      }}
                    />
                  </div>
                </Space>
              </Spin>
            </ProCard>
          </Col>

          {/* 右侧：设置面板 */}
          {settingsPanelOpen && (
            <Col xs={24} lg={8}>
              <Space
                direction="vertical"
                style={{ width: '100%' }}
                size="middle"
              >
                {/* 文档设置 */}
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
                        placeholder="选择场景"
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
                        <Button icon={<UploadOutlined />} block size="small">
                          添加文件
                        </Button>
                      </Upload>
                    </div>

                    <div>
                      <Title level={5}>Prompt 模板（可选）</Title>
                      <Spin spinning={promptsLoading}>
                        {availablePrompts.length > 0 ? (
                          <Checkbox.Group
                            value={selectedPromptIds}
                            onChange={(values) =>
                              setSelectedPromptIds(values as string[])
                            }
                            style={{ width: '100%' }}
                          >
                            <Space
                              direction="vertical"
                              style={{ width: '100%' }}
                              size="small"
                            >
                              {availablePrompts.map((prompt) => (
                                <div
                                  key={prompt.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    padding: '8px',
                                    background: '#f5f5f5',
                                    borderRadius: '4px',
                                  }}
                                >
                                  <Checkbox value={prompt.id}>
                                    <Space direction="vertical" size={0}>
                                      <span style={{ fontWeight: 500 }}>
                                        {prompt.name}
                                      </span>
                                      {prompt.description && (
                                        <span
                                          style={{
                                            fontSize: '12px',
                                            color: '#666',
                                          }}
                                        >
                                          {prompt.description}
                                        </span>
                                      )}
                                    </Space>
                                  </Checkbox>
                                  <Tooltip title="预览">
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<EyeOutlined />}
                                      style={{ marginLeft: 'auto' }}
                                      onClick={() => {
                                        setPreviewingPrompt(prompt);
                                        setPromptPreviewVisible(true);
                                      }}
                                    />
                                  </Tooltip>
                                </div>
                              ))}
                            </Space>
                          </Checkbox.Group>
                        ) : (
                          <Empty
                            description="暂无可用的 Prompt 模板"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                          >
                            <Button
                              type="link"
                              onClick={() =>
                                window.open('/AI/prompt-manager', '_blank')
                              }
                            >
                              去创建
                            </Button>
                          </Empty>
                        )}
                      </Spin>
                      {selectedPromptIds.length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                          <Tag color="blue">
                            已选择 {selectedPromptIds.length} 个模板
                          </Tag>
                        </div>
                      )}
                    </div>

                    <div>
                      <Title level={5}>文档描述</Title>
                      <TextArea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="请输入文档主题或详细描述..."
                        rows={5}
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
                              style={{ fontSize: 20, color: '#1890ff' }}
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

        {/* 侧边收起按钮 */}
        <div
          style={{
            position: 'fixed',
            right: settingsPanelOpen
              ? 'calc((100vw - 1200px) / 2 + 400px + 16px)'
              : '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 999,
            transition: 'right 0.3s ease',
          }}
        >
          <Tooltip
            title={settingsPanelOpen ? '收起面板' : '展开面板'}
            placement="left"
          >
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={settingsPanelOpen ? <RightOutlined /> : <LeftOutlined />}
              onClick={() => setSettingsPanelOpen(!settingsPanelOpen)}
              style={{
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                width: '48px',
                height: '48px',
              }}
            />
          </Tooltip>
        </div>
      </div>

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

      {/* Prompt 预览对话框 */}
      <Modal
        title="Prompt 模板预览"
        open={promptPreviewVisible}
        onCancel={() => setPromptPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPromptPreviewVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {previewingPrompt && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <strong>模板名称：</strong>
              {previewingPrompt.name}
            </div>
            {previewingPrompt.description && (
              <div>
                <strong>描述：</strong>
                {previewingPrompt.description}
              </div>
            )}
            {previewingPrompt.variables &&
              previewingPrompt.variables.length > 0 && (
                <div>
                  <strong>变量：</strong>
                  {previewingPrompt.variables.map((v) => (
                    <Tag key={v} color="blue">
                      {`{${v}}`}
                    </Tag>
                  ))}
                </div>
              )}
            <div>
              <strong>Prompt 内容：</strong>
              <div
                style={{
                  marginTop: '8px',
                  padding: '12px',
                  background: '#f5f5f5',
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  maxHeight: '400px',
                  overflow: 'auto',
                }}
              >
                {previewingPrompt.content}
              </div>
            </div>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
};

export default DocumentWriter;
