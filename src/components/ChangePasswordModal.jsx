import React, { useState } from 'react';
import {
  Modal,
  Form,
  Button,
  Toast,
  Typography
} from '@douyinfe/semi-ui';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const { Text } = Typography;

const ChangePasswordModal = ({ visible, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const { API_BASE_URL, user } = useAuth();
  const formApi = React.useRef();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/api/auth/change-password`, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      
      Toast.success('密碼更改成功');
      formApi.current?.reset();
      onCancel();
    } catch (error) {
      console.error('Failed to change password:', error);
      const errorMessage = error.response?.data?.error || '更改密碼失敗';
      Toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="更改密碼"
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={450}
    >
      {user?.auth_source === 'SSO' ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Text type="warning">
            您是通過 SSO 登入的用戶，無法在此更改密碼。
            請通過 SSO 系統管理您的密碼。
          </Text>
        </div>
      ) : (
        <Form
          getFormApi={(api) => formApi.current = api}
          labelPosition="left"
          labelAlign="right"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          onSubmit={handleSubmit}
        >
          <Form.Input
            field="currentPassword"
            label="當前密碼"
            type="password"
            placeholder="請輸入當前密碼"
            rules={[
              { required: true, message: '請輸入當前密碼' }
            ]}
          />
          
          <Form.Input
            field="newPassword"
            label="新密碼"
            type="password"
            placeholder="請輸入新密碼（至少 6 個字元）"
            rules={[
              { required: true, message: '請輸入新密碼' },
              { min: 6, message: '密碼長度至少需要 6 個字元' }
            ]}
          />
          
          <Form.Input
            field="confirmPassword"
            label="確認新密碼"
            type="password"
            placeholder="請再次輸入新密碼"
            rules={[
              { required: true, message: '請確認新密碼' },
              {
                validator: (rule, value) => {
                  const newPassword = formApi.current?.getValue('newPassword');
                  if (value !== newPassword) {
                    return Promise.reject('兩次輸入的密碼不一致');
                  }
                  return Promise.resolve();
                }
              }
            ]}
          />
          
          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Button
              onClick={onCancel}
              style={{ marginRight: 8 }}
            >
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
            >
              確認更改
            </Button>
          </div>
        </Form>
      )}
    </Modal>
  );
};

export default ChangePasswordModal;