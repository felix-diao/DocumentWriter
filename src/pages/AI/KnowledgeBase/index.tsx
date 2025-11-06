import { DeleteOutlined, InboxOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  List,
  Modal,
  message,
  Popconfirm,
  Progress,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
} from 'antd';
import type { UploadRequestOption as RcCustomRequestOptions } from 'rc-upload/lib/interface';
import React, { useEffect, useMemo, useState } from 'react';
import knowledgeService, {
  type KnowledgeBase,
  type KnowledgeItem,
} from '@/services/knowledge';

const { Dragger } = Upload;
const { Text } = Typography;

const KnowledgeBasePage: React.FC = () => {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterTag, setFilterTag] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [currentBaseId, setCurrentBaseId] = useState<number | undefined>(
    undefined,
  );
  const [createVisible, setCreateVisible] = useState(false);
  const [form] = Form.useForm();
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameForm] = Form.useForm();
  const currentBase = useMemo(
    () => bases.find((b) => b.id === currentBaseId),
    [bases, currentBaseId],
  );
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [moveVisible, setMoveVisible] = useState(false);
  const [moveTargetBaseId, setMoveTargetBaseId] = useState<number | undefined>(
    undefined,
  );
  const [singleMoveId, setSingleMoveId] = useState<number | null>(null);

  const load = async (tag?: string, baseId?: number) => {
    const data = await knowledgeService.list(tag, baseId);
    setItems(data);
  };

  useEffect(() => {
    (async () => {
      const bs = await knowledgeService.listBases();
      setBases(bs);
      const defaultBase = bs[0];
      setCurrentBaseId(defaultBase?.id);
      await load(undefined, defaultBase?.id);
    })();
  }, []);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => {
      (i.tags || []).forEach((t) => {
        if (typeof t === 'string' && t.startsWith('kb:')) {
          // 过滤知识库标记
        } else {
          s.add(t);
        }
      });
    });
    return Array.from(s);
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!filterTag) return items;
    return items.filter((i) => i.tags?.includes(filterTag));
  }, [items, filterTag]);

  const stats = useMemo(() => {
    const count = filteredItems.length;
    const size = filteredItems.reduce((acc, it) => acc + (it.size || 0), 0);
    return { count, size };
  }, [filteredItems]);

  const customRequest = async ({
    file,
    onError,
    onSuccess,
  }: RcCustomRequestOptions) => {
    try {
      if (!currentBaseId) {
        message.warning('请先选择知识库');
        return;
      }
      setUploading(true);
      setUploadProgress(20);
      const res = await knowledgeService.upload(
        file as File,
        selectedTags,
        currentBaseId,
      );
      setUploadProgress(90);
      await load(filterTag, currentBaseId);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 600);
      setSelectedTags([]);
      if (onSuccess) onSuccess(res, new XMLHttpRequest());
      message.success('上传成功');
    } catch (e: any) {
      if (onError) onError(e);
      message.error(e?.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const removeItem = async (id: number) => {
    await knowledgeService.remove(id);
    message.success('已删除');
    await load(filterTag, currentBaseId);
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const onCreateBase = async () => {
    try {
      const values = await form.validateFields();
      const created = await knowledgeService.createBase(values);
      const bs = await knowledgeService.listBases();
      setBases(bs);
      setCurrentBaseId(created.id);
      await load(undefined, created.id);
      setCreateVisible(false);
      form.resetFields();
      message.success('创建成功');
    } catch (_e) {
      // 校验或请求错误
    }
  };

  const openMoveModal = (ids: number[]) => {
    setSingleMoveId(ids.length === 1 ? ids[0] : null);
    setMoveTargetBaseId(undefined);
    setMoveVisible(true);
  };

  const onConfirmMove = async () => {
    if (!moveTargetBaseId || !currentBaseId) {
      message.warning('请选择目标知识库');
      return;
    }
    const ids = singleMoveId ? [singleMoveId] : selectedIds;
    if (!ids.length) return;
    if (ids.length === 1) {
      await knowledgeService.moveItem(ids[0], moveTargetBaseId);
    } else {
      await knowledgeService.moveBatch(ids, moveTargetBaseId);
    }
    message.success('已移动');
    setMoveVisible(false);
    setSingleMoveId(null);
    setSelectedIds([]);
    await load(filterTag, currentBaseId);
  };

  const onOpenRename = () => {
    if (!currentBase) return;
    renameForm.setFieldsValue({
      name: currentBase.name,
      key: currentBase.key,
      description: currentBase.description,
    });
    setRenameVisible(true);
  };

  const onRenameBase = async () => {
    if (!currentBaseId) return;
    try {
      const values = await renameForm.validateFields();
      await knowledgeService.updateBase(currentBaseId, values);
      const bs = await knowledgeService.listBases();
      setBases(bs);
      setRenameVisible(false);
      message.success('已更新');
    } catch (_e) {
      // ignore
    }
  };

  const onDeleteBase = async () => {
    if (!currentBaseId) return;
    await knowledgeService.deleteBase(currentBaseId);
    message.success('已删除');
    const bs = await knowledgeService.listBases();
    setBases(bs);
    const next = bs[0];
    setCurrentBaseId(next?.id);
    await load(undefined, next?.id);
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="知识库管理" bordered>
        <Space style={{ width: '100%' }}>
          <Select
            placeholder="选择知识库"
            style={{ minWidth: 220 }}
            value={currentBaseId}
            onChange={async (id) => {
              setCurrentBaseId(id);
              setFilterTag(undefined);
              await load(undefined, id);
            }}
            options={bases.map((b) => ({ label: b.name, value: b.id }))}
          />
          <Button type="primary" onClick={() => setCreateVisible(true)}>
            新建知识库
          </Button>
          <Button onClick={onOpenRename} disabled={!currentBaseId}>
            重命名
          </Button>
          <Popconfirm
            title="删除知识库"
            description="将删除该知识库及其中所有文件，操作不可恢复。确认删除？"
            onConfirm={onDeleteBase}
            okButtonProps={{ danger: true }}
            okText="删除"
            cancelText="取消"
            disabled={!currentBaseId}
          >
            <Button danger disabled={!currentBaseId}>
              删除知识库
            </Button>
          </Popconfirm>
        </Space>
      </Card>
      <Card title="上传到知识库" bordered>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text type="secondary">为本次上传打标签（可输入新标签）：</Text>
            <Select
              mode="tags"
              style={{ width: '100%', marginTop: 8 }}
              placeholder="输入或选择标签后上传"
              value={selectedTags}
              onChange={setSelectedTags}
              tokenSeparators={[',', ' ', ';']}
              options={allTags.map((t) => ({ label: t, value: t }))}
            />
          </div>
          <Dragger
            name="file"
            multiple={false}
            customRequest={customRequest}
            disabled={uploading}
            showUploadList={false}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">上传时将会把所选标签一起保存</p>
          </Dragger>
          {uploadProgress > 0 && (
            <Progress
              percent={uploadProgress}
              status={uploadProgress < 100 ? 'active' : 'normal'}
            />
          )}
        </Space>
      </Card>

      <Card
        title="知识库文件"
        extra={
          <Space wrap>
            <Text type="secondary">{`共 ${stats.count} 个文件，合计 ${(stats.size / 1024).toFixed(1)} KB`}</Text>
            <Divider type="vertical" />
            <Text type="secondary">按标签筛选：</Text>
            <Select
              allowClear
              placeholder="选择标签"
              style={{ minWidth: 180 }}
              value={filterTag}
              onChange={(v) => {
                setFilterTag(v);
                load(v, currentBaseId);
              }}
              options={allTags.map((t) => ({ label: t, value: t }))}
            />
            <Divider type="vertical" />
            <Button
              disabled={!selectedIds.length}
              onClick={() => openMoveModal(selectedIds)}
            >
              批量移动
            </Button>
            <Button
              disabled={!selectedIds.length}
              onClick={() => setSelectedIds([])}
            >
              清空选择
            </Button>
          </Space>
        }
      >
        <List
          itemLayout="horizontal"
          dataSource={filteredItems}
          renderItem={(item) => (
            <List.Item
              actions={[
                <a key="open" href={item.url} target="_blank" rel="noreferrer">
                  打开
                </a>,
                <Button
                  key="move"
                  type="link"
                  onClick={() => openMoveModal([item.id])}
                >
                  移动
                </Button>,
                <Popconfirm
                  key="del"
                  title="确认删除该文件？"
                  onConfirm={() => removeItem(item.id)}
                >
                  <Button type="link" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space split={<Divider type="vertical" />} align="start">
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onChange={(e) => {
                        setSelectedIds((prev) =>
                          e.target.checked
                            ? Array.from(new Set([...prev, item.id]))
                            : prev.filter((x) => x !== item.id),
                        );
                      }}
                    />
                    <span style={{ fontWeight: 500 }}>{item.originalName}</span>
                    <Text type="secondary">
                      {(item.size / 1024).toFixed(1)} KB
                    </Text>
                    <Text type="secondary">
                      {new Date(item.createdAt).toLocaleString('zh-CN')}
                    </Text>
                  </Space>
                }
                description={
                  <Space wrap>
                    {(item.tags || []).map((t) => (
                      <Tag key={t} color="blue">
                        {t}
                      </Tag>
                    ))}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      <Modal
        open={createVisible}
        title="新建知识库"
        onOk={onCreateBase}
        onCancel={() => setCreateVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="例如：会议记录库、制度文档库" />
          </Form.Item>
          <Form.Item label="Key（可选）" name="key">
            <Input placeholder="用于唯一标识（字母数字-下划线）" />
          </Form.Item>
          <Form.Item label="描述（可选）" name="description">
            <Input.TextArea rows={3} placeholder="简要说明此知识库用途" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={renameVisible}
        title="重命名知识库"
        onOk={onRenameBase}
        onCancel={() => setRenameVisible(false)}
        destroyOnClose
      >
        <Form form={renameForm} layout="vertical" preserve={false}>
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="知识库名称" />
          </Form.Item>
          <Form.Item label="Key（可选）" name="key">
            <Input placeholder="用于唯一标识（字母数字-下划线）" />
          </Form.Item>
          <Form.Item label="描述（可选）" name="description">
            <Input.TextArea rows={3} placeholder="简要说明此知识库用途" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={moveVisible}
        title={
          singleMoveId
            ? '移动文件到知识库'
            : `批量移动 ${selectedIds.length} 个文件到知识库`
        }
        onOk={onConfirmMove}
        onCancel={() => setMoveVisible(false)}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="secondary">选择目标知识库：</Text>
          <Select
            style={{ width: '100%' }}
            placeholder="请选择"
            value={moveTargetBaseId}
            onChange={setMoveTargetBaseId}
            options={bases
              .filter((b) => b.id !== currentBaseId)
              .map((b) => ({ label: b.name, value: b.id }))}
          />
        </Space>
      </Modal>
    </Space>
  );
};

export default KnowledgeBasePage;
