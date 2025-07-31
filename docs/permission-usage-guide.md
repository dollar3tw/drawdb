# DrawDB 權限管理使用指南

## 權限管理功能總覽

DrawDB 現在支援完整的權限管理系統，包括：

1. **帳號來源識別**：支援 SSO、LocalDB（未來將支援 LDAP）
2. **角色管理**：root（系統管理員）、editor（編輯者）、user（一般使用者）
3. **圖表權限**：owner（擁有者）、editor（編輯者）、viewer（檢視者）
4. **共編功能**：支援多人協作編輯
5. **操作紀錄**：完整的共編歷史追蹤

## 資料庫遷移

在使用新的權限系統前，需要先執行資料庫遷移：

```bash
# 執行資料庫遷移
npm run migrate

# 如需回滾
npm run migrate:rollback
```

## 預設帳號

系統會自動創建一個 root 帳號：
- 用戶名：`root`
- 密碼：`mitadmin123`
- 建議首次登入後立即更改密碼

## API 端點說明

### 權限管理

1. **獲取圖表權限列表**
```
GET /api/diagrams/:id/permissions
Authorization: Bearer {token}
```

2. **授予權限**
```
POST /api/diagrams/:id/permissions
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": 123,
  "permissionType": "editor"  // 可選：editor, viewer
}
```

3. **撤銷權限**
```
DELETE /api/diagrams/:id/permissions/:userId
Authorization: Bearer {token}
```

4. **提升為共編圖表（僅 root）**
```
PUT /api/diagrams/:id/promote
Authorization: Bearer {token}
```

### 共編歷史

1. **獲取圖表的共編歷史**
```
GET /api/diagrams/:id/collaboration-history?limit=100
Authorization: Bearer {token}
```

2. **獲取使用者的共編歷史**
```
GET /api/diagrams/users/:userId/collaboration-history
Authorization: Bearer {token}
```

## 權限檢查邏輯

### 圖表存取權限

1. **root 使用者**：可以存取和管理所有圖表
2. **一般使用者**：只能存取自己有權限的圖表
3. **權限類型**：
   - `owner`：完整權限（檢視、編輯、刪除、管理權限）
   - `editor`：編輯權限（檢視、編輯）
   - `viewer`：檢視權限（僅檢視）

### SSO 使用者

通過 SSO 登入的使用者會自動標記為 `auth_source = 'SSO'`，並儲存其 SSO ID。

## 前端整合建議

### 顯示權限資訊

在圖表列表和詳細頁面顯示：
- 使用者的權限類型
- 是否為共編圖表
- 共編參與者列表

### 權限操作 UI

1. **圖表擁有者**可以：
   - 邀請其他使用者共同編輯
   - 管理使用者權限
   - 查看共編歷史

2. **root 使用者**額外可以：
   - 提升任何圖表為共編狀態
   - 管理所有圖表的權限

### 共編標識

建議在 UI 上明顯標示：
- 共編圖表的特殊圖標
- 當前編輯者列表
- 最近的修改記錄

## 注意事項

1. **資料庫備份**：執行遷移前請先備份資料庫
2. **權限同步**：修改權限後需要重新整理才能看到更新
3. **共編衝突**：多人同時編輯可能產生衝突，建議實作衝突解決機制
4. **效能考量**：大量共編歷史可能影響查詢效能，建議定期歸檔

## 測試建議

1. 創建多個測試帳號
2. 測試不同權限等級的操作
3. 測試 SSO 與本地帳號的權限差異
4. 測試共編功能的並發操作