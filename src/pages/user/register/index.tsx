import {
  LockOutlined,
  UserOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import {
  FormattedMessage,
  Helmet,
  SelectLang,
  useIntl,
  history,
} from '@umijs/max';
import { Alert, App, Form } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState } from 'react';
import { Footer } from '@/components';
import { register } from '@/services/ant-design-pro/api';
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

const Lang = () => {
  const { styles } = useStyles();

  return (
    <div className={styles.lang} data-lang>
      {SelectLang && <SelectLang />}
    </div>
  );
};

const RegisterMessage: React.FC<{
  content: string;
}> = ({ content }) => {
  return (
    <Alert
      style={{
        marginBottom: 24,
      }}
      message={content}
      type="error"
      showIcon
    />
  );
};

const Register: React.FC = () => {
  const [registerState, setRegisterState] = useState<{
    status?: string;
    message?: string;
  }>({});
  const { styles } = useStyles();
  const { message } = App.useApp();
  const intl = useIntl();
  const [form] = Form.useForm();

  const handleSubmit = async (values: any) => {
    try {
      // 移除 confirmPassword 字段，只提交后端需要的字段
      const { confirmPassword, ...registerData } = values;
      const response = await register(registerData as API.RegisterParams);
      if (response?.success && response.data?.user_id) {
        const defaultRegisterSuccessMessage = intl.formatMessage({
          id: 'pages.register.success',
          defaultMessage: '注册成功！',
        });
        message.success(defaultRegisterSuccessMessage);
        // 跳转到登录页面
        setTimeout(() => {
          history.push('/user/login');
        }, 1000);
        return;
      }
      setRegisterState({
        status: 'error',
        message: response?.message || '注册失败，请重试',
      });
    } catch (error: any) {
      console.log(error);
      const errorResponse = error?.response;
      let parsedMessage: string | undefined;

      if (Array.isArray(errorResponse?.data?.detail)) {
        parsedMessage = errorResponse.data.detail
          .map((item: { msg?: string }) => item?.msg)
          .filter(Boolean)
          .join('；');
      } else if (typeof errorResponse?.data?.detail === 'string') {
        parsedMessage = errorResponse.data.detail;
      } else if (error?.message) {
        parsedMessage = error.message;
      }

      if (!parsedMessage) {
        parsedMessage = intl.formatMessage({
          id: 'pages.register.failure',
          defaultMessage: '注册失败，用户名已存在或密码格式不正确，请重试！',
        });
      }

      const isValidationError = errorResponse?.status === 422;
      if (!isValidationError) {
        message.error(parsedMessage);
      }

      setRegisterState({
        status: 'error',
        message: parsedMessage,
      });
    }
  };

  const { status } = registerState;

  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          {intl.formatMessage({
            id: 'menu.register',
            defaultMessage: '注册页',
          })}
          {Settings.title && ` - ${Settings.title}`}
        </title>
      </Helmet>
      <Lang />
      <div
        style={{
          flex: '1',
          padding: '32px 0',
        }}
      >
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
          <div
            style={{
              textAlign: 'center',
              marginBottom: 24,
            }}
          >
            <img alt="logo" src="/logo.svg" style={{ height: 60, marginBottom: 16 }} />
            <h2 style={{ marginBottom: 16 }}>{Settings.title}</h2>
            <p style={{ color: '#999' }}>
              {intl.formatMessage({
                id: 'pages.register.subTitle',
                defaultMessage: '创建您的账号',
              })}
            </p>
          </div>

          {status === 'error' && (
            <RegisterMessage content={registerState.message || '注册失败，请重试( 用户名已存在或密码格式不正确) '} />
          )}

          <Form
            form={form}
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
          >
            <ProFormText
              name="username"
              fieldProps={{
                size: 'large',
                prefix: <UserOutlined />,
              }}
              placeholder={intl.formatMessage({
                id: 'pages.register.username.placeholder',
                defaultMessage: '用户名',
              })}
              rules={[
                {
                  required: true,
                  message: (
                    <FormattedMessage
                      id="pages.register.username.required"
                      defaultMessage="请输入用户名!"
                    />
                  ),
                },
                {
                  min: 3,
                  message: (
                    <FormattedMessage
                      id="pages.register.username.min"
                      defaultMessage="用户名至少3个字符!"
                    />
                  ),
                },
              ]}
            />
            <ProFormText.Password
              name="password"
              fieldProps={{
                size: 'large',
                prefix: <LockOutlined />,
              }}
              placeholder={intl.formatMessage({
                id: 'pages.register.password.placeholder',
                defaultMessage: '密码',
              })}
              rules={[
                {
                  required: true,
                  message: (
                    <FormattedMessage
                      id="pages.register.password.required"
                      defaultMessage="请输入密码！"
                    />
                  ),
                },
                {
                  min: 8,
                  message: (
                    <FormattedMessage
                      id="pages.register.password.minLength"
                      defaultMessage="密码至少 8 位"
                    />
                  ),
                },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const requirements = [
                      {
                        test: /[A-Z]/.test(value),
                        message: '密码需包含至少一个大写字母',
                      },
                      {
                        test: /[a-z]/.test(value),
                        message: '密码需包含至少一个小写字母',
                      },
                      {
                        test: /\d/.test(value),
                        message: '密码需包含至少一个数字',
                      },
                      {
                        test: /[^A-Za-z0-9\s]/.test(value),
                        message: '密码需包含至少一个特殊字符',
                      },
                      {
                        test: !/\s/.test(value),
                        message: '密码不能包含空格',
                      },
                    ];
                    const failed = requirements.find((item) => !item.test);
                    if (failed) {
                      return Promise.reject(new Error(failed.message));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            />
            <ProFormText.Password
              name="confirmPassword"
              fieldProps={{
                size: 'large',
                prefix: <LockOutlined />,
              }}
              placeholder={intl.formatMessage({
                id: 'pages.register.confirmPassword.placeholder',
                defaultMessage: '确认密码',
              })}
              dependencies={['password']}
              rules={[
                {
                  required: true,
                  message: (
                    <FormattedMessage
                      id="pages.register.confirmPassword.required"
                      defaultMessage="请确认密码！"
                    />
                  ),
                },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error(
                        intl.formatMessage({
                          id: 'pages.register.confirmPassword.mismatch',
                          defaultMessage: '两次输入的密码不一致！',
                        })
                      )
                    );
                  },
                }),
              ]}
            />
            <ProFormText
              name="department"
              fieldProps={{
                size: 'large',
                prefix: <TeamOutlined />,
              }}
              placeholder={intl.formatMessage({
                id: 'pages.register.department.placeholder',
                defaultMessage: '部门（可选）',
              })}
            />
            <Form.Item>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <a
                  onClick={() => {
                    history.push('/user/login');
                  }}
                >
                  <FormattedMessage
                    id="pages.register.backToLogin"
                    defaultMessage="已有账号？去登录"
                  />
                </a>
              </div>
            </Form.Item>
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
                <FormattedMessage
                  id="pages.register.submit"
                  defaultMessage="注册"
                />
              </button>
            </Form.Item>
          </Form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Register;
