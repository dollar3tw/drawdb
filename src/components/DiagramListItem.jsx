import { Button, Popconfirm, Avatar, AvatarGroup, Tooltip } from "@douyinfe/semi-ui";
import { IconDelete, IconShareStroked, IconUser, IconUserAdd } from "@douyinfe/semi-icons";
import { databases } from "../data/databases";

// 生成基於用戶名的顏色
function getAvatarColor(username) {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#48C9B0', '#F8B195', '#6C5CE7', '#A29BFE', '#FD79A8'
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function DiagramListItem({ 
  diagram, 
  onDiagramClick, 
  onDeleteDiagram, 
  onPromoteDiagram,
  onInviteCollaborator,
  canDelete,
  canPromote,
  canInvite 
}) {
  return (
    <li 
      key={diagram.id} 
      className="px-6 py-4 hover:bg-zinc-100 transition-colors duration-150 cursor-pointer"
      onClick={() => onDiagramClick(diagram.id)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* 資料庫類型圖示 */}
          {databases[diagram.databaseType]?.image && (
            <div className="p-2 bg-gray-100 rounded">
              <img
                src={databases[diagram.databaseType].image}
                className="h-8 w-8 object-contain brightness-110 contrast-125"
                alt={databases[diagram.databaseType].name + " icon"}
                title={databases[diagram.databaseType].name}
              />
            </div>
          )}
          {/* 如果沒有圖示，顯示預設圖示 */}
          {!databases[diagram.databaseType]?.image && (
            <div 
              className="h-10 w-10 bg-gray-300 rounded flex items-center justify-center text-sm font-bold text-gray-600"
              title="Generic Database"
            >
              DB
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sky-700 text-lg truncate">
              {diagram.name || "Untitled Diagram"}
            </div>
            {/* 顯示協作者 */}
            {diagram.collaborators && diagram.collaborators.length > 0 && (
              <div className="flex items-center mt-2 space-x-2">
                <span className="text-xs text-gray-500">協作者：</span>
                <AvatarGroup size="extra-small" maxCount={3}>
                  {diagram.collaborators.map((collaborator) => (
                    <Tooltip
                      key={collaborator.id}
                      content={
                        <div className="text-xs">
                          <div>{collaborator.display_name || collaborator.username}</div>
                          <div className="text-gray-400">
                            {collaborator.permission_type === 'owner' ? '擁有者' : 
                             collaborator.permission_type === 'editor' ? '編輯者' : '檢視者'}
                          </div>
                        </div>
                      }
                    >
                      <Avatar
                        style={{ backgroundColor: getAvatarColor(collaborator.username) }}
                        size="extra-small"
                      >
                        {(collaborator.display_name || collaborator.username).charAt(0).toUpperCase()}
                      </Avatar>
                    </Tooltip>
                  ))}
                </AvatarGroup>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* 邀請協作者按鈕 */}
          {canInvite && (
            <Button
              icon={<IconUserAdd />}
              type="tertiary"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onInviteCollaborator(diagram.id);
              }}
            />
          )}
          
          {/* 提升為協作按鈕 */}
          {canPromote && (
            <Popconfirm
              title="提升為協作圖表？"
              content="提升後，其他使用者可以被邀請共同編輯此圖表"
              onConfirm={(event) => onPromoteDiagram(diagram.id, event)}
            >
              <Button
                icon={<IconShareStroked />}
                type="primary"
                size="small"
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          )}
          
          {/* 刪除按鈕 */}
          {canDelete && (
            <Popconfirm
              title="確定要刪除此圖表嗎？"
              content="此操作不可撤銷"
              onConfirm={(event) => onDeleteDiagram(diagram.id, event)}
            >
              <Button
                icon={<IconDelete />}
                type="danger"
                size="small"
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          )}
        </div>
      </div>
    </li>
  );
}