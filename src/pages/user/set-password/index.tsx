import { LockOutlined } from '@ant-design/icons';
import { ProFormText } from '@ant-design/pro-components';
import { Helmet, history, useIntl } from '@umijs/max';
import { Alert, App, Form } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState } from 'react';
import { Footer } from '@/components';
import { setPassword } from '@/services/ant-design-pro/api';
import Settings from '../../../../config/defaultSettings';

const useStyles = createStyles(({ token }) => {
  return {
    lang: {
      width: 42,
      height: 42,
      lineHeight: '42px',
      position: 'fixed',
      right: 16,
      borderRadius: token.borderRadius,
      ':hover': {
        backgroundColor: token.colorBgTextHover,
      },
    },
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'auto',
      backgroundImage:
        "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
      backgroundSize: '100% 100%',
    },
  };
});

const SetPasswordMessage: React.FC<{ content: string }> = ({ content }) => {
  return (
    <Alert
      style={{ marginBottom: 24 }}
      message={content}
      type="error"
      showIcon
    />
  );
};

const SetPassword: React.FC = () => {
  const [submitState, setSubmitState] = useState<{ status: string; message: string }>({ status: '', message: '' });
  const { styles } = useStyles();
  const { message } = App.useApp();
  const intl = useIntl();
  const [form] = Form.useForm();

  // 获取跳转目标
  const getRedirect = () => {
    const urlParams = new URL(window.location.href).searchParams;
    return urlParams.get('redirect') || '/welcome';
  };

  const handleSubmit = async (values: any) => {
    try {
      const response = await setPassword({ new_password: values.new_password });

      if (response.success) {
        message.success('密码设置成功！');
        // 跳转到目标页面
        setTimeout(() => {
          window.location.href = getRedirect();
        }, 500);
        return;
      }

      setSubmitState({
        status: 'error',
        message: response.message || '设置失败，请重试',
      });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || '设置失败，请重试';
      setSubmitState({
        status: 'error',
        message: errorMessage,
      });
    }
  };

  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          设置密码 - {Settings.title}
        </title>
      </Helmet>
      <div style={{ flex: '1', padding: '32px 0' }}>
        <div
          style={{
            maxWidth: 400,
            margin: '0 auto',
            padding: '24px',
            background: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img alt="logo" src="/logo.svg" style={{ height: 60, marginBottom: 16 }} />
            <h2 style={{ marginBottom: 8 }}>首次登录设置密码</h2>
            <p style={{ color: '#999', marginBottom: 16 }}>
              为了账户安全，请设置您的登录密码
            </p>
            <div style={{
              background: '#f6f6f6',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: 16,
              textAlign: 'left',
              fontSize: 13,
              color: '#666'
            }}>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>密码要求：</div>
              <div>• 长度 8-72 位</div>
              <div>• 包含大写字母、小写字母、数字</div>
              <div>• 包含特殊符号（如 !@#$%^&*）</div>
            </div>
          </div>

          {submitState.status === 'error' && (
            <SetPasswordMessage content={submitState.message} />
          )}

          <Form
            form={form}
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
          >
            <ProFormText.Password
              name="new_password"
              fieldProps={{
                size: 'large',
                prefix: <LockOutlined />,
              }}
              placeholder="请输入新密码"
              rules={[
                { required: true, message: '请输入新密码！' },
                { min: 8, message: '密码长度至少8位' },
                { max: 72, message: '密码长度最多72位' },
                { pattern: /[A-Z]/, message: '密码需包含大写字母' },
                { pattern: /[a-z]/, message: '密码需包含小写字母' },
                { pattern: /[0-9]/, message: '密码需包含数字' },
                { pattern: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/, message: '密码需包含特殊符号' },
              ]}
            />
            <ProFormText.Password
              name="confirm_password"
              fieldProps={{
                size: 'large',
                prefix: <LockOutlined />,
              }}
              placeholder="请再次输入新密码"
              dependencies={['new_password']}
              rules={[
                { required: true, message: '请确认新密码！' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('new_password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            />
            <Form.Item>
              <button
                type="submit"
                style={{
                  width: '100%',
                  height: 40,
                  background: '#1890ff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                确认设置
              </button>
            </Form.Item>
          </Form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SetPassword;
