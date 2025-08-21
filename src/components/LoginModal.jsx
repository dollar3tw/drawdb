import React, { useState } from 'react';
import { Modal, Form, Input, Button, Toast, Tabs, TabPane, Divider } from '@douyinfe/semi-ui';
import { IconUser, IconLock, IconMail, IconSafe } from '@douyinfe/semi-icons';
import { useAuth } from '../context/AuthContext';

const LoginModal = ({ visible, onCancel }) => {
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const result = await login(values.username, values.password);
      if (result.success) {
        Toast.success('登入成功！');
        onCancel();
      } else {
        Toast.error(result.error);
      }
    } catch (error) {
      Toast.error('登入失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleSSOLogin = () => {
    // 強制重新載入 SSO 登入頁面，避免緩存
    window.location.href = `/sso/login?t=${Date.now()}`;
  };

  const handleRegister = async (values) => {
    if (values.password !== values.confirmPassword) {
      Toast.error('密碼確認不一致');
      return;
    }

    setLoading(true);
    try {
      const result = await register(values.username, values.email, values.password);
      if (result.success) {
        Toast.success('註冊成功！請登入');
        setActiveTab('login');
      } else {
        Toast.error(result.error);
      }
    } catch (error) {
      Toast.error('註冊失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="用戶認證"
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={400}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="登入" itemKey="login">
          <Form onSubmit={handleLogin} style={{ marginTop: 16 }}>
            <Form.Input
              field="username"
              label="用戶名"
              prefix={<IconUser />}
              placeholder="請輸入用戶名"
              rules={[{ required: true, message: '請輸入用戶名' }]}
            />
            <Form.Input
              field="password"
              label="密碼"
              type="password"
              prefix={<IconLock />}
              placeholder="請輸入密碼"
              rules={[{ required: true, message: '請輸入密碼' }]}
            />
            <Button
              htmlType="submit"
              type="primary"
              block
              loading={loading}
              style={{ marginTop: 16 }}
            >
              登入
            </Button>
          </Form>
          
          <Divider margin='12px'>或</Divider>
          
          <Button
            type="tertiary"
            block
            icon={<IconSafe />}
            onClick={handleSSOLogin}
            style={{ marginTop: 8 }}
          >
            使用 Synology SSO 登入
          </Button>
        </TabPane>

        <TabPane tab="註冊" itemKey="register">
          <Form onSubmit={handleRegister} style={{ marginTop: 16 }}>
            <Form.Input
              field="username"
              label="用戶名"
              prefix={<IconUser />}
              placeholder="請輸入用戶名"
              rules={[
                { required: true, message: '請輸入用戶名' },
                { min: 3, message: '用戶名至少3個字符' }
              ]}
            />
            <Form.Input
              field="email"
              label="電子郵件"
              prefix={<IconMail />}
              placeholder="請輸入電子郵件"
              rules={[
                { required: true, message: '請輸入電子郵件' },
                { type: 'email', message: '請輸入有效的電子郵件' }
              ]}
            />
            <Form.Input
              field="password"
              label="密碼"
              type="password"
              prefix={<IconLock />}
              placeholder="請輸入密碼"
              rules={[
                { required: true, message: '請輸入密碼' },
                { min: 6, message: '密碼至少6個字符' }
              ]}
            />
            <Form.Input
              field="confirmPassword"
              label="確認密碼"
              type="password"
              prefix={<IconLock />}
              placeholder="請再次輸入密碼"
              rules={[{ required: true, message: '請確認密碼' }]}
            />
            <Button
              htmlType="submit"
              type="primary"
              block
              loading={loading}
              style={{ marginTop: 16 }}
            >
              註冊
            </Button>
          </Form>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default LoginModal; 