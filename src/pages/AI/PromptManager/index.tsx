import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import {
  Badge,
  Button,
  Form,
  Input,
  Modal,
  message,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
} from 'antd';
import React, { useRef, useState } from 'react';
import type { PromptTemplate } from '@/services/prompt';
import {
  batchDeletePrompts,
  createPrompt,
  deletePrompt,
  getPrompts,
  togglePromptActive,
  updatePrompt,
} from '@/services/prompt';

const { TextArea } = Input;

// 分类选项
const CATEGORY_OPTIONS = [
  { label: '通知', value: 'notice' },
  { label: '公文', value: 'bulletin' },
  { label: '请示', value: 'request' },
  { label: '报告', value: 'report' },
  { label: '函', value: 'letter' },
  { label: '会议纪要', value: 'meeting' },
];

const CATEGORY_COLOR_MAP: Record<string, string> = {
  notice: 'green',
  bulletin: 'orange',
  request: 'cyan',
  report: 'gold',
  letter: 'magenta',
  meeting: 'purple',
};

const PromptManager: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(
    null,
  );
  const [previewPrompt, setPreviewPrompt] = useState<PromptTemplate | null>(
    null,
  );
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const { initialState } = useModel('@@initialState');
  const currentUserId = initialState?.currentUser?.user_id;
  const isAdmin = initialState?.currentUser?.role === 'admin';
  const permissionTip = '仅管理员或模板创建者可以执行此操作';

  const canManagePrompt = (prompt?: PromptTemplate | null) => {
    if (isAdmin) {
      return true;
    }
    if (!prompt) {
      return false;
    }
    return !prompt.isPublic && prompt.userId === currentUserId;
  };

  // 打开创建/编辑对话框
  const handleOpenModal = (record?: PromptTemplate) => {
    if (record) {
      if (!canManagePrompt(record)) {
        message.warning(permissionTip);
        return;
      }
      setEditingPrompt(record);
      form.setFieldsValue({
        ...record,
        variables: record.variables?.join(', ') || '',
      });
    } else {
      setEditingPrompt(null);
      form.resetFields();
      form.setFieldsValue({ isActive: true, isPublic: false });
    }
    setModalVisible(true);
  };

  // 保存 Prompt
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const variables = values.variables
        ? values.variables
            .split(',')
            .map((v: string) => v.trim())
            .filter(Boolean)
        : [];

      const promptData = {
        ...values,
        variables,
      };
      if (!isAdmin) {
        promptData.isPublic = editingPrompt?.isPublic ?? false;
      }

      if (editingPrompt) {
        await updatePrompt(editingPrompt.id, promptData);
        message.success('更新成功');
      } else {
        await createPrompt(promptData);
        message.success('创建成功');
      }

      setModalVisible(false);
      actionRef.current?.reload();
    } catch (error) {
      console.error(error);
    }
  };

  // 删除单个 Prompt
  const handleDelete = async (record: PromptTemplate) => {
    if (!canManagePrompt(record)) {
      message.warning(permissionTip);
      return;
    }
    try {
      await deletePrompt(record.id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的项');
      return;
    }
    try {
      await batchDeletePrompts(selectedRowKeys as string[]);
      message.success('批量删除成功');
      setSelectedRowKeys([]);
      actionRef.current?.reload();
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  // 切换启用状态
  const handleToggleActive = async (record: PromptTemplate) => {
    if (!canManagePrompt(record)) {
      message.warning(permissionTip);
      return;
    }
    try {
      await togglePromptActive(record.id, !record.isActive);
      message.success(record.isActive ? '已禁用' : '已启用');
      actionRef.current?.reload();
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 预览 Prompt
  const handlePreview = (record: PromptTemplate) => {
    setPreviewPrompt(record);
    setPreviewVisible(true);
  };

  const columns: ProColumns<PromptTemplate>[] = [
    {
      title: '名称',
      dataIndex: 'name',
      width: 200,
      ellipsis: true,
      fixed: 'left',
      render: (text, record) => (
        <Space>
          <Badge status={record.isActive ? 'success' : 'default'} />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 120,
      valueType: 'select',
      valueEnum: CATEGORY_OPTIONS.reduce(
        (acc, item) => {
          acc[item.value] = { text: item.label };
          return acc;
        },
        {} as Record<string, { text: string }>,
      ),
      render: (_, record) => (
        <Tag color={CATEGORY_COLOR_MAP[record.category] || 'blue'}>
          {CATEGORY_OPTIONS.find((c) => c.value === record.category)?.label}
        </Tag>
      ),
    },
    {
      title: '权限',
      dataIndex: 'isPublic',
      width: 120,
      valueType: 'select',
      valueEnum: {
        true: { text: '公共模板' },
        false: { text: '个人模板' },
      },
      filters: isAdmin
        ? [
            { text: '公共模板', value: true },
            { text: '个人模板', value: false },
          ]
        : undefined,
      render: (_, record) => (
        <Tag color={record.isPublic ? 'blue' : 'default'}>
          {record.isPublic ? '公共模板' : '个人模板'}
        </Tag>
      ),
    },
    {
      title: '所属用户',
      dataIndex: 'userId',
      width: 160,
      hideInTable: !isAdmin,
      render: (_, record) => (
        <Tag color={record.userId === currentUserId ? 'gold' : 'default'}>
          {record.userId === currentUserId ? '自己' : record.userId}
        </Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
      search: false,
    },
    {
      title: '变量',
      dataIndex: 'variables',
      width: 150,
      search: false,
      render: (_, record) =>
        record.variables && record.variables.length > 0 ? (
          <Tooltip title={record.variables.join(', ')}>
            <span>{record.variables.length} 个变量</span>
          </Tooltip>
        ) : (
          <span style={{ color: '#999' }}>无</span>
        ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      width: 100,
      valueType: 'select',
      valueEnum: {
        true: { text: '启用', status: 'Success' },
        false: { text: '禁用', status: 'Default' },
      },
      render: (_, record) => {
        const disabled = !canManagePrompt(record);
        const switchNode = (
          <Switch
            checked={record.isActive}
            onChange={() => handleToggleActive(record)}
            checkedChildren="启用"
            unCheckedChildren="禁用"
            disabled={disabled}
          />
        );
        return disabled ? (
          <Tooltip title={permissionTip}>
            <span>{switchNode}</span>
          </Tooltip>
        ) : (
          switchNode
        );
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 180,
      valueType: 'dateTime',
      search: false,
      sorter: (a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    },
    {
      title: '操作',
      width: 200,
      fixed: 'right',
      search: false,
      render: (_, record) => {
        const canEdit = canManagePrompt(record);
        const editButton = (
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
            disabled={!canEdit}
          />
        );
        const deleteButton = (
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            disabled={!canEdit}
          />
        );
        return (
          <Space>
            <Tooltip title="预览">
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handlePreview(record)}
              />
            </Tooltip>
            <Tooltip title={canEdit ? '编辑' : permissionTip}>
              <span>{editButton}</span>
            </Tooltip>
            {canEdit ? (
              <Popconfirm
                title="确认删除"
                description="确定要删除这个 Prompt 模板吗？"
                onConfirm={() => handleDelete(record)}
                okText="确定"
                cancelText="取消"
              >
                <Tooltip title="删除">
                  {deleteButton}
                </Tooltip>
              </Popconfirm>
            ) : (
              <Tooltip title={permissionTip}>
                <span>{deleteButton}</span>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];
  const previewFooter: React.ReactNode[] = [
    <Button key="close" onClick={() => setPreviewVisible(false)}>
      关闭
    </Button>,
  ];
  if (previewPrompt && canManagePrompt(previewPrompt)) {
    previewFooter.push(
      <Button
        key="edit"
        type="primary"
        onClick={() => {
          setPreviewVisible(false);
          handleOpenModal(previewPrompt);
        }}
      >
        编辑
      </Button>,
    );
  }

  return (
    <PageContainer
      header={{
        title: 'Prompt 模板管理',
        subTitle: '管理 AI 写作的 Prompt 模板',
      }}
    >
      <ProTable<PromptTemplate>
        columns={columns}
        actionRef={actionRef}
        cardBordered
        request={async (params, sort, filter) => {
          const filters: Record<string, any> = {};
          const isPublicFilter = filter?.isPublic as (boolean | string)[] | undefined;
          if (isPublicFilter && isPublicFilter.length > 0) {
            const value = isPublicFilter[0];
            filters.isPublic =
              typeof value === 'string' ? value === 'true' : Boolean(value);
          }
          const response = await getPrompts({
            ...params,
            ...filters,
            current: params.current,
            pageSize: params.pageSize,
          });
          return {
            data: response.data,
            total: response.total,
            success: response.success,
          };
        }}
        rowKey="id"
        search={{
          labelWidth: 'auto',
        }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
        }}
        dateFormatter="string"
        headerTitle="Prompt 模板列表"
        toolBarRender={() => [
          <Button
            key="button"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
            type="primary"
          >
            新建模板
          </Button>,
          // <Popconfirm
          //   key="batch-delete"
          //   title="确认批量删除"
          //   description={`确定要删除选中的 ${selectedRowKeys.length} 个模板吗？`}
          //   onConfirm={handleBatchDelete}
          //   disabled={selectedRowKeys.length === 0}
          //   okText="确定"
          //   cancelText="取消"
          // >
          //   <Button
          //     danger
          //     icon={<DeleteOutlined />}
          //     disabled={selectedRowKeys.length === 0}
          //   >
          //     批量删除
          //   </Button>
          // </Popconfirm>,
        ]}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          getCheckboxProps: (record) => ({
            disabled: !canManagePrompt(record),
          }),
        }}
      />

      {/* 创建/编辑对话框 */}
      <Modal
        title={editingPrompt ? '编辑 Prompt 模板' : '新建 Prompt 模板'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        width={800}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ isActive: true, isPublic: false }}
        >
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="请输入模板名称" maxLength={100} />
          </Form.Item>

          <Form.Item
            name="category"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select placeholder="请选择分类" options={CATEGORY_OPTIONS} />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea
              placeholder="请输入模板描述"
              rows={2}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="content"
            label="Prompt 内容"
            rules={[{ required: true, message: '请输入 Prompt 内容' }]}
            tooltip="可以使用 {变量名} 的形式定义变量"
          >
            <TextArea
              placeholder="请输入 Prompt 内容，使用 {变量名} 定义变量，例如：{主题}、{背景}"
              rows={12}
              maxLength={5000}
              showCount
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item
            name="variables"
            label="变量列表"
            tooltip="多个变量用逗号分隔，例如：主题, 背景, 日期"
          >
            <Input
              placeholder="多个变量用逗号分隔，例如：主题, 背景, 日期"
              maxLength={500}
            />
          </Form.Item>

          {isAdmin ? (
            <Form.Item
              name="isPublic"
              label="权限"
              valuePropName="checked"
              tooltip="公共模板对所有用户可见，仅管理员可设置"
            >
              <Switch checkedChildren="公共" unCheckedChildren="私有" />
            </Form.Item>
          ) : (
            <Form.Item label="权限">
              <Tag color="default">仅自己可见</Tag>
            </Form.Item>
          )}

          <Form.Item name="isActive" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 预览对话框 */}
      <Modal
        title="Prompt 预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={previewFooter}
        width={700}
      >
        {previewPrompt && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <strong>模板名称：</strong>
              {previewPrompt.name}
            </div>
            <div>
              <strong>分类：</strong>
              <Tag color={CATEGORY_COLOR_MAP[previewPrompt.category] || 'blue'}>
                {
                  CATEGORY_OPTIONS.find(
                    (c) => c.value === previewPrompt.category,
                  )?.label
                }
              </Tag>
            </div>
            {previewPrompt.description && (
              <div>
                <strong>描述：</strong>
                {previewPrompt.description}
              </div>
            )}
            <div>
              <strong>权限：</strong>
              <Tag color={previewPrompt.isPublic ? 'blue' : 'default'}>
                {previewPrompt.isPublic
                  ? '公共模板（管理员维护）'
                  : previewPrompt.userId === currentUserId
                    ? '仅自己可见'
                    : '私人模板'}
              </Tag>
            </div>
            {previewPrompt.variables && previewPrompt.variables.length > 0 && (
              <div>
                <strong>变量：</strong>
                {previewPrompt.variables.map((v) => (
                  <Tag key={v} color="blue">
                    {`{${v}}`}
                  </Tag>
                ))}
              </div>
            )}
            {isAdmin && (
              <div>
                <strong>创建者：</strong>
                <Tag color={previewPrompt.userId === currentUserId ? 'gold' : 'default'}>
                  {previewPrompt.userId === currentUserId ? '自己' : previewPrompt.userId}
                </Tag>
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
                {previewPrompt.content}
              </div>
            </div>
            <div>
              <strong>状态：</strong>
              <Badge
                status={previewPrompt.isActive ? 'success' : 'default'}
                text={previewPrompt.isActive ? '启用' : '禁用'}
              />
            </div>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
};

export default PromptManager;
