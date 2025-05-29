import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Table, 
  Button, 
  Select, 
  Toast, 
  Popconfirm,
  Tag,
  Space,
  Typography
} from '@douyinfe/semi-ui';
import { IconDelete, IconEdit, IconRefresh } from '@douyinfe/semi-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const { Text } = Typography;

const UserManagement = ({ visible, onCancel }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { API_BASE_URL, user: currentUser } = useAuth();

  const roleColors = {
    mitadmin: 'red',
    editor: 'orange',
    user: 'blue'
  };

  const roleLabels = {
    mitadmin: '最高管理者',
    editor: '編輯者',
    user: '使用者'
  };

  useEffect(() => {
    if (visible) {
      fetchUsers();
    }
  }, [visible]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/users`);
      setUsers(response.data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      Toast.error('獲取使用者列表失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`${API_BASE_URL}/api/auth/users/${userId}/role`, {
        role: newRole
      });
      
      Toast.success('使用者角色更新成功');
      fetchUsers(); // 重新獲取使用者列表
    } catch (error) {
      console.error('Failed to update user role:', error);
      Toast.error('更新使用者角色失敗');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/auth/users/${userId}`);
      Toast.success('使用者刪除成功');
      fetchUsers(); // 重新獲取使用者列表
    } catch (error) {
      console.error('Failed to delete user:', error);
      Toast.error('刪除使用者失敗');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: '使用者名稱',
      dataIndex: 'username',
      width: 120,
    },
    {
      title: '電子郵件',
      dataIndex: 'email',
      width: 200,
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: 120,
      render: (role, record) => (
        <Select
          value={role}
          style={{ width: 100 }}
          onChange={(newRole) => handleRoleChange(record.id, newRole)}
          disabled={record.id === currentUser?.id} // 不能修改自己的角色
        >
          <Select.Option value="user">
            <Tag color={roleColors.user}>{roleLabels.user}</Tag>
          </Select.Option>
          <Select.Option value="editor">
            <Tag color={roleColors.editor}>{roleLabels.editor}</Tag>
          </Select.Option>
          <Select.Option value="mitadmin">
            <Tag color={roleColors.mitadmin}>{roleLabels.mitadmin}</Tag>
          </Select.Option>
        </Select>
      ),
    },
    {
      title: '註冊時間',
      dataIndex: 'createdAt',
      width: 150,
      render: (date) => new Date(date).toLocaleDateString('zh-TW'),
    },
    {
      title: '最後登入',
      dataIndex: 'lastLogin',
      width: 150,
      render: (date) => date ? new Date(date).toLocaleDateString('zh-TW') : '從未登入',
    },
    {
      title: '狀態',
      dataIndex: 'isActive',
      width: 80,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '啟用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      width: 100,
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="確定要刪除此使用者嗎？"
            content="此操作不可撤銷"
            onConfirm={() => handleDeleteUser(record.id)}
            disabled={record.id === currentUser?.id} // 不能刪除自己
          >
            <Button
              icon={<IconDelete />}
              type="danger"
              size="small"
              disabled={record.id === currentUser?.id}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title="使用者管理"
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={1000}
      height={600}
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          總共 {users.length} 個使用者
        </Text>
        <Button
          style={{ float: 'right' }}
          onClick={fetchUsers}
          loading={loading}
          icon={<IconRefresh />}
        >
        </Button>
      </div>
      
      <Table
        columns={columns}
        dataSource={users}
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        rowKey="id"
        size="small"
      />
    </Modal>
  );
};

export default UserManagement; 