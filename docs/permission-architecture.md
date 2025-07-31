# DrawDB 權限管理架構設計

## 帳號體系架構

### 使用者角色定義
- **root**: 系統唯一的最高權限管理者（現有的 mitadmin 將改為 root）
- **user**: 一般使用者
- **editor**: 編輯者（保留，未來可擴充）

### 使用者來源識別
- **SSO**: 通過 Synology SSO 登入的使用者
- **LDAP**: 預留 LDAP 整合（暫不實作）
- **LocalDB**: 本地資料庫使用者（現有機制）

## 圖表權限管理

### 權限層級
1. **擁有者權限**: 圖表創建者，擁有完整權限
2. **共編權限**: 被授予共同編輯權限的使用者
3. **檢視權限**: 只能檢視不能編輯（預留）
4. **Root 權限**: root 可以查看和管理所有圖表

### 共編機制
- Root 可以將任何個人圖表提升為共編狀態
- 圖表擁有者可以邀請其他使用者共同編輯
- 所有共編操作都會留下紀錄

## 資料庫架構設計

### 修改 users 表
```sql
-- 新增 auth_source 欄位來識別使用者來源
ALTER TABLE users ADD COLUMN auth_source TEXT DEFAULT 'LocalDB' CHECK (auth_source IN ('LocalDB', 'SSO', 'LDAP'));
ALTER TABLE users ADD COLUMN display_name TEXT;
ALTER TABLE users ADD COLUMN sso_id TEXT; -- SSO 使用者的唯一識別碼

-- 將 mitadmin 角色改為 root
UPDATE users SET role = 'root' WHERE role = 'mitadmin';
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('root', 'editor', 'user'));
```

### 新增 diagram_permissions 表
```sql
CREATE TABLE diagram_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  diagram_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  permission_type TEXT NOT NULL CHECK (permission_type IN ('owner', 'editor', 'viewer')),
  granted_by INTEGER, -- 授權者的 user_id
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id),
  UNIQUE(diagram_id, user_id) -- 每個使用者對每個圖表只能有一種權限
);
```

### 新增 collaboration_history 表
```sql
CREATE TABLE collaboration_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  diagram_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'grant_permission', 'revoke_permission')),
  target_type TEXT NOT NULL, -- 'table', 'relationship', 'note', 'permission', etc.
  target_id TEXT, -- 目標物件的 ID
  changes TEXT, -- JSON 格式的變更內容
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 建立索引以優化查詢
CREATE INDEX idx_collab_history_diagram ON collaboration_history(diagram_id, timestamp DESC);
CREATE INDEX idx_collab_history_user ON collaboration_history(user_id, timestamp DESC);
```

### 修改 diagrams 表
```sql
-- 新增欄位標識圖表狀態
ALTER TABLE diagrams ADD COLUMN is_collaborative INTEGER DEFAULT 0; -- 0: 個人, 1: 共編
ALTER TABLE diagrams ADD COLUMN promoted_by INTEGER; -- root 提升為共編時的 user_id
ALTER TABLE diagrams ADD COLUMN promoted_at DATETIME; -- 提升為共編的時間
```

## API 端點設計

### 權限管理 API
- `GET /api/diagrams/:id/permissions` - 獲取圖表的權限列表
- `POST /api/diagrams/:id/permissions` - 授予權限
- `DELETE /api/diagrams/:id/permissions/:userId` - 撤銷權限
- `PUT /api/diagrams/:id/promote` - Root 提升圖表為共編狀態

### 共編歷史 API
- `GET /api/diagrams/:id/collaboration-history` - 獲取共編歷史
- `GET /api/users/:id/collaboration-history` - 獲取使用者的共編歷史

### 權限檢查中介軟體
```javascript
// 檢查使用者對圖表的權限
async function checkDiagramPermission(req, res, next) {
  const diagramId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  // Root 有所有權限
  if (userRole === 'root') {
    req.permission = 'root';
    return next();
  }
  
  // 檢查權限表
  const permission = await db.getDiagramPermission(diagramId, userId);
  
  if (!permission) {
    return res.status(403).json({ error: '無權限存取此圖表' });
  }
  
  req.permission = permission.permission_type;
  next();
}
```

## 實作計畫

### Phase 1: 資料庫遷移
1. 備份現有資料庫
2. 執行資料庫遷移腳本
3. 更新現有資料（將 mitadmin 改為 root）

### Phase 2: 後端實作
1. 更新資料庫模組支援新表格
2. 實作權限檢查中介軟體
3. 更新現有 API 加入權限檢查
4. 實作新的權限管理 API

### Phase 3: 前端實作
1. 更新使用者介面顯示權限資訊
2. 實作共編邀請功能
3. 實作共編歷史檢視
4. Root 管理介面

### Phase 4: 測試與優化
1. 單元測試
2. 整合測試
3. 效能優化
4. 安全性審查