import {
  App,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Space,
  Tag,
  Typography,
} from 'antd';
import { history, useModel } from '@umijs/max';
import React, { useState } from 'react';
import { changePassword, outLogin } from '@/services/ant-design-pro/api';

const UserInfo: React.FC = () => {
  const { initialState, setInitialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [changingPassword, setChangingPassword] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await outLogin();
      setInitialState?.((s) => ({ ...s, currentUser: undefined }));
      message.success('您已安全退出');
      history.replace('/user/login');
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.detail || error?.message || '退出登录失败，请稍后再试';
      message.error(errorMessage);
    } finally {
      setLoggingOut(false);
    }
  };

  const handlePasswordChange = async (values: {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    setChangingPassword(true);
    try {
      const response = await changePassword({
        old_password: values.oldPassword,
        new_password: values.newPassword,
        confirm_password: values.confirmPassword,
      });

      if (response?.success) {
        message.success(response.message || '密码修改成功，请重新登录');
        form.resetFields();
        await handleLogout();
        return;
      }

      message.error(response?.message || '密码修改失败，请稍后再试');
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.detail || error?.message || '密码修改失败，请稍后再试';
      message.error(errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div
      style={{
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      <Card title="🔍 当前用户信息检查" bordered>
        <Descriptions column={1} bordered>
          <Descriptions.Item label="用户名">
            {currentUser?.name || '未获取到'}
          </Descriptions.Item>
          <Descriptions.Item label="用户ID">
            {currentUser?.userid || currentUser?.user_id || '未获取到'}
          </Descriptions.Item>
          <Descriptions.Item label="邮箱">
            {currentUser?.email || '未获取到'}
          </Descriptions.Item>
          <Descriptions.Item label="权限级别 (access)">
            <Tag color={currentUser?.access === 'admin' ? 'green' : 'orange'}>
              {currentUser?.access || '未获取到'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="职位">
            {currentUser?.title || '未获取到'}
          </Descriptions.Item>
          <Descriptions.Item label="部门">
            {currentUser?.group || currentUser?.department || '未获取到'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="账户安全" bordered>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
          建议定期更新密码，密码需包含大小写字母及数字且不少于 8 位。修改成功后系统会自动退出登录。
        </Typography.Paragraph>

        <Form
          layout="vertical"
          form={form}
          requiredMark={false}
          onFinish={handlePasswordChange}
        >
          <Form.Item
            label="当前密码"
            name="oldPassword"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password
              autoComplete="current-password"
              placeholder="请输入当前密码"
            />
          </Form.Item>

          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              {
                validator: (_, value) => {
                  if (!value) {
                    return Promise.resolve();
                  }
                  if (value.length < 8) {
                    return Promise.reject(new Error('密码至少 8 位'));
                  }
                  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value)) {
                    return Promise.reject(new Error('密码需包含大小写字母和数字'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input.Password
              autoComplete="new-password"
              placeholder="请输入新密码"
            />
          </Form.Item>

          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              autoComplete="new-password"
              placeholder="请再次输入新密码"
            />
          </Form.Item>

          <Space size="middle">
            <Button
              type="primary"
              htmlType="submit"
              loading={changingPassword}
            >
              更新密码
            </Button>
            <Button danger onClick={handleLogout} loading={loggingOut}>
              退出登录
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default UserInfo;
