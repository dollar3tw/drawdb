import { useState } from "react";
import { Modal, Form, Select, Toast, Button } from "@douyinfe/semi-ui";
import axios from "axios";

export default function InviteCollaboratorModal({ 
  visible, 
  onCancel, 
  diagramId,
  diagramName,
  onSuccess,
  currentUserEmail 
}) {
  const [loading, setLoading] = useState(false);
  const [formApi, setFormApi] = useState(null);

  const handleSubmit = async (values, event) => {
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    try {
      setLoading(true);
      
      // 檢查是否嘗試邀請自己
      if (values.email.toLowerCase() === currentUserEmail?.toLowerCase()) {
        Toast.error('您不能邀請自己');
        setLoading(false);
        return;
      }
      
      // 先查找用戶
      let userResponse;
      try {
        userResponse = await axios.get(`/api/users/search`, {
          params: { email: values.email }
        });
      } catch (searchError) {
        console.error('User search error:', searchError);
        if (searchError.response?.status === 404) {
          Toast.error('找不到此 Email 的使用者');
        } else {
          Toast.error('搜尋使用者時發生錯誤');
        }
        setLoading(false);
        return;
      }
      
      if (!userResponse.data || !userResponse.data.id) {
        Toast.error('找不到此 Email 的使用者');
        setLoading(false);
        return;
      }
      
      const userId = userResponse.data.id;
      
      // 授予權限
      try {
        await axios.post(`/api/diagrams/${diagramId}/permissions`, {
          userId: userId,
          permissionType: values.permissionType
        });
        
        Toast.success('成功邀請協作者');
        // 使用 Semi UI Form API 重置表單
        if (formApi) {
          formApi.reset();
        }
        onSuccess();
        onCancel();
      } catch (permissionError) {
        console.error('Grant permission error:', permissionError);
        if (permissionError.response?.data?.error) {
          Toast.error(permissionError.response.data.error);
        } else {
          Toast.error('邀請協作者失敗');
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      Toast.error('發生未預期的錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`邀請協作者 - ${diagramName}`}
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={480}
    >
      <Form
        getFormApi={(api) => setFormApi(api)}
        onSubmit={handleSubmit}
        labelPosition="top"
      >
        <Form.Input
          field="email"
          label="使用者 Email"
          placeholder="請輸入要邀請的使用者 Email"
          rules={[
            { required: true, message: '請輸入 Email' },
            { type: 'email', message: '請輸入有效的 Email' }
          ]}
        />
        
        <Form.Select
          field="permissionType"
          label="權限類型"
          placeholder="請選擇權限類型"
          rules={[
            { required: true, message: '請選擇權限類型' }
          ]}
          initValue="editor"
          optionList={[
            { value: 'editor', label: '編輯者（可編輯圖表）' },
            { value: 'viewer', label: '檢視者（僅可檢視）' }
          ]}
        />
        
        <div className="flex justify-end space-x-2 mt-6">
          <Button onClick={onCancel} type="tertiary">
            取消
          </Button>
          <Button htmlType="submit" type="primary" loading={loading}>
            邀請
          </Button>
        </div>
      </Form>
    </Modal>
  );
}