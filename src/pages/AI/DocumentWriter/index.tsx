import React, { useState } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
    Button,
    Input,
    Select,
    Space,
    Spin,
    message,
    Row,
    Col,
    Typography,
    List,
    Modal,
    Progress,
    Upload,
} from 'antd';
import {
    EditOutlined,
    CopyOutlined,
    ReloadOutlined,
    CloudUploadOutlined,
    FileTextOutlined,
    DeleteOutlined,
    DownloadOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import { aiWriteDocument, aiOptimizeDocument } from '@/services/ai';
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
    const [documentType, setDocumentType] = useState<string>('speech');
    const [scenario, setScenario] = useState<string>('');
    const [titleInput, setTitleInput] = useState('');
    const [lengthOption, setLengthOption] = useState<'short' | 'medium' | 'long'>('medium');
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [savedDocs, setSavedDocs] = useState<SavedDocument[]>([]);
    const [showSaveModal, setShowSaveModal] = useState(false);

    // 公文类型对应的场景
    const scenarioOptions: Record<string, { label: string; value: string }[]> = {
        speech: [{ label: '开场演讲', value: 'opening' }, { label: '闭幕演讲', value: 'closing' }],
        notice: [{ label: '内部通知', value: 'internal' }, { label: '外部通知', value: 'external' }],
        report: [
            { label: '个人工作报告', value: 'personal' },
            { label: '单位工作报告', value: 'unit' },
            { label: '专项工作报告', value: 'special' },
        ],
        research: [{ label: '市场调研报告', value: 'market' }, { label: '行业调研报告', value: 'industry' }],
        suggestion: [{ label: '政策建议', value: 'policy' }, { label: '管理建议', value: 'management' }],
    };

    // 生成文档
    const handleGenerate = async () => {
        if (!prompt.trim()) {
            message.warning('请输入文档主题或描述');
            return;
        }
        setLoading(true);
        try {
            const filesContent = uploadedFiles.map(f => `\n[附加素材: ${f.name}]`).join('');
            const response = await aiWriteDocument({
                prompt: `${prompt}\n类型: ${documentType}\n场景: ${scenario}\n字数: ${lengthOption}${filesContent}`,
                documentType: documentType as any,
                tone: 'formal',
                language: 'zh-CN',
            });
            setContent(response.data?.content || '');
            message.success('文档生成成功');
        } catch (error) {
            message.error('生成失败，请重试');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // 优化文档
    const handleOptimize = async () => {
        if (!content.trim()) {
            message.warning('请先生成文档内容');
            return;
        }
        setLoading(true);
        try {
            const response = await aiOptimizeDocument({ content, optimizationType: 'all' });
            setContent(response.data?.content || '');
            message.success('文档优化成功');
        } catch (error) {
            message.error('优化失败，请重试');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // 复制
    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        message.success('已复制到剪贴板');
    };

    // 保存弹窗
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
            const blob = new Blob([content], { type: 'text/markdown' });
            const file = new File([blob], `${titleInput}.md`, { type: 'text/markdown' });
            const result = await ossStorageService.uploadFile(file, {
                folder: 'documents',
                onProgress: (percent) => setUploadProgress(percent),
            });
            const newDoc: SavedDocument = {
                id: Date.now().toString(),
                title: titleInput,
                content,
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
        const blob = new Blob([doc.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.title}.md`;
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
        setDocumentType(doc.type);
        setScenario(doc.scenario || '');
        message.success('文档已加载');
    };

    return (
        <PageContainer
            header={{
                title: 'AI 公文生成器',
                subTitle: '根据公文类型和场景快速生成、优化文档，支持云端存储',
            }}
        >
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <ProCard title="输入区域" bordered>
                        <Space direction="vertical" style={{ width: '100%' }} size="large">
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Title level={5}>公文类型</Title>
                                    <Select
                                        value={documentType}
                                        onChange={(val) => { setDocumentType(val); setScenario(''); }}
                                        style={{ width: '100%' }}
                                        options={[
                                            { label: '演讲稿', value: 'speech' },
                                            { label: '通知', value: 'notice' },
                                            { label: '工作报告', value: 'report' },
                                            { label: '调研报告', value: 'research' },
                                            { label: '意见建议', value: 'suggestion' },
                                        ]}
                                    />
                                </Col>
                                <Col span={12}>
                                    <Title level={5}>写作场景</Title>
                                    <Select
                                        value={scenario}
                                        onChange={setScenario}
                                        style={{ width: '100%' }}
                                        options={scenarioOptions[documentType] || []}
                                    />
                                </Col>
                            </Row>
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
                                        { label: '短', value: 'short' },
                                        { label: '中', value: 'medium' },
                                        { label: '长', value: 'long' },
                                    ]}
                                />
                            </div>
                            <div>
                                <Title level={5}>写作素材（可选）</Title>
                                <Upload
                                    beforeUpload={(file) => { setUploadedFiles([...uploadedFiles, file]); return false; }}
                                    multiple
                                    fileList={uploadedFiles.map(f => ({ uid: f.name, name: f.name, status: 'done' }))}
                                    onRemove={(file) => setUploadedFiles(uploadedFiles.filter(f => f.name !== file.name))}
                                >
                                    <Button icon={<UploadOutlined />}>添加文件</Button>
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
                            <Button type="primary" icon={<EditOutlined />} onClick={handleGenerate} loading={loading} block size="large">
                                生成文档
                            </Button>
                        </Space>
                    </ProCard>
                </Col>

                <Col xs={24} lg={8}>
                    <ProCard title="生成结果" bordered>
                        <Spin spinning={loading}>
                            <Space direction="vertical" style={{ width: '100%' }} size="large">
                                <TextArea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="生成的内容将显示在这里..."
                                    rows={16}
                                    style={{ minHeight: '400px' }}
                                />
                                <Space wrap>
                                    <Button icon={<ReloadOutlined />} onClick={handleOptimize} disabled={!content}>
                                        优化文档
                                    </Button>
                                    <Button icon={<CopyOutlined />} onClick={handleCopy} disabled={!content}>
                                        复制内容
                                    </Button>
                                    <Button icon={<CloudUploadOutlined />} onClick={handleSaveToCloud} disabled={!content} type="primary">
                                        保存到云端
                                    </Button>
                                </Space>
                            </Space>
                        </Spin>
                    </ProCard>

                    <ProCard title="已保存的文档" bordered style={{ marginTop: 16 }}>
                        <List
                            dataSource={savedDocs}
                            locale={{ emptyText: '暂无保存的文档' }}
                            renderItem={(doc) => (
                                <List.Item
                                    actions={[
                                        <Button key="load" type="link" size="small" onClick={() => handleLoadDocument(doc)}>
                                            加载
                                        </Button>,
                                        <Button key="download" type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(doc)} />,
                                        <Button key="delete" type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(doc.id)} />,
                                    ]}
                                >
                                    <List.Item.Meta
                                        avatar={<FileTextOutlined style={{ fontSize: 24 }} />}
                                        title={doc.title}
                                        description={
                                            <Space direction="vertical" size="small">
                                                <span>类型: {doc.type}</span>
                                                {doc.scenario && <span>场景: {doc.scenario}</span>}
                                                <span>{doc.createdAt.toLocaleDateString('zh-CN')}</span>
                                                {doc.size && <span>大小: {(doc.size / 1024).toFixed(2)} KB</span>}
                                            </Space>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    </ProCard>
                </Col>
            </Row>

            <Modal
                title="保存文档到云端"
                open={showSaveModal}
                onOk={handleConfirmSave}
                onCancel={() => { setShowSaveModal(false); setTitleInput(''); }}
                confirmLoading={loading}
            >
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div>
                        <Title level={5}>文档标题</Title>
                        <Input value={titleInput} onChange={(e) => setTitleInput(e.target.value)} placeholder="请输入文档标题" maxLength={100} />
                    </div>
                    {uploadProgress > 0 && <Progress percent={uploadProgress} status="active" />}
                </Space>
            </Modal>
        </PageContainer>
    );
};

export default DocumentWriter;
