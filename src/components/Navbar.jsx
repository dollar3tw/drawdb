import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo_light_160.png";
import { SideSheet, Button, Dropdown, Avatar, Tag, Space } from "@douyinfe/semi-ui";
import { IconMenu, IconUser, IconSetting, IconExit } from "@douyinfe/semi-icons";
import { socials } from "../data/socials";
import { useAuth } from "../context/AuthContext";
import LoginModal from "./LoginModal";
import UserManagement from "./UserManagement";

export default function Navbar() {
  const [openMenu, setOpenMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const { user, logout, isAuthenticated, isMitAdmin } = useAuth();

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

  const handleLogout = async () => {
    await logout();
  };

  const userDropdownItems = [
    {
      node: 'item',
      name: '個人資料',
      icon: <IconUser />,
      onClick: () => {
        // TODO: 實現個人資料編輯
        console.log('Open profile');
      }
    },
    ...(isMitAdmin ? [{
      node: 'item',
      name: '使用者管理',
      icon: <IconSetting />,
      onClick: () => setShowUserManagement(true)
    }] : []),
    {
      node: 'divider'
    },
    {
      node: 'item',
      name: '登出',
      icon: <IconExit />,
      onClick: handleLogout
    }
  ];

  return (
    <>
      <div className="py-4 px-12 sm:px-4 flex justify-between items-center">
        <div className="flex items-center justify-between w-full">
          <Link to="/">
            <img src={logo} alt="logo" className="h-[48px] sm:h-[32px]" />
          </Link>
          <div className="md:hidden block ms-12">
            <span className="text-2xl font-bold text-sky-800">MiT</span>
          </div>
        </div>

        {/* 桌面版用戶區域 */}
        <div className="hidden md:flex items-center space-x-4">
          {isAuthenticated ? (
            <Space>
              <Tag color={roleColors[user?.role]}>
                {roleLabels[user?.role]}
              </Tag>
              <Dropdown
                trigger="click"
                menu={userDropdownItems}
                position="bottomRight"
              >
                <Button
                  icon={<Avatar size="small">{user?.username?.charAt(0).toUpperCase()}</Avatar>}
                  type="tertiary"
                >
                  {user?.username}
                </Button>
              </Dropdown>
            </Space>
          ) : (
            <Button
              type="primary"
              onClick={() => setShowLoginModal(true)}
            >
              登入
            </Button>
          )}
        </div>

        {/* 移動版菜單按鈕 */}
        <button
          onClick={() => setOpenMenu((prev) => !prev)}
          className="md:hidden inline-block h-[24px]"
        >
          <IconMenu size="extra-large" />
        </button>
      </div>
      <hr />

      {/* 移動版側邊菜單 */}
      <SideSheet
        title={
          <img src={logo} alt="logo" className="sm:h-[32px] md:h-[42px]" />
        }
        visible={openMenu}
        onCancel={() => setOpenMenu(false)}
        width={320}
      >
        <div className="p-4 space-y-4">
          {isAuthenticated ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Avatar>{user?.username?.charAt(0).toUpperCase()}</Avatar>
                <div>
                  <div className="font-medium">{user?.username}</div>
                  <Tag color={roleColors[user?.role]} size="small">
                    {roleLabels[user?.role]}
                  </Tag>
                </div>
              </div>
              
              {isMitAdmin && (
                <Button
                  block
                  icon={<IconSetting />}
                  onClick={() => {
                    setShowUserManagement(true);
                    setOpenMenu(false);
                  }}
                >
                  使用者管理
                </Button>
              )}
              
              <Button
                block
                type="danger"
                icon={<IconExit />}
                onClick={() => {
                  handleLogout();
                  setOpenMenu(false);
                }}
              >
                登出
              </Button>
            </div>
          ) : (
            <Button
              block
              type="primary"
              onClick={() => {
                setShowLoginModal(true);
                setOpenMenu(false);
              }}
            >
              登入
            </Button>
          )}
        </div>
      </SideSheet>

      {/* 登入模態框 */}
      <LoginModal
        visible={showLoginModal}
        onCancel={() => setShowLoginModal(false)}
      />

      {/* 用戶管理模態框 */}
      {isMitAdmin && (
        <UserManagement
          visible={showUserManagement}
          onCancel={() => setShowUserManagement(false)}
        />
      )}
    </>
  );
}
