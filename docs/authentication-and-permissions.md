# DrawDB 認證與權限管理系統

## 概述

DrawDB 支援兩種登入方式，並實作三層權限管理系統，確保系統的安全性和功能的適當分配。

## 登入方式

### 1. 本地註冊登入

**端點：** `/api/auth/login`

**流程：**
1. 用戶透過 `/api/auth/register` 註冊新帳號
2. 系統使用 bcrypt 加密密碼並儲存在本地資料庫
3. 登入時驗證用戶名和密碼
4. 成功後發放 JWT token

**特點：**
- 用戶完全控制自己的帳號密碼
- 可以隨時修改密碼（需提供當前密碼）
- `auth_source` 標記為 `LocalDB`
- 預設角色為 `user`

### 2. Synology SSO 單一簽入

**端點：** `/sso/login` → `/sso/callback`

**流程：**
1. 用戶點擊 SSO 登入，重定向到 Synology SSO Server
2. 在 SSO Server 完成身份驗證
3. SSO Server 回調到 `/sso/callback` 並附帶授權碼
4. 系統使用授權碼換取 access token 和用戶資訊
5. 首次登入自動創建本地用戶記錄
6. 發放 JWT token

**特點：**
- 使用 OpenID Connect (OIDC) 協議
- 不需要在 DrawDB 註冊帳號
- 密碼由系統隨機生成（用戶無法使用密碼登入）
- `auth_source` 標記為 `SSO`
- 預設角色為 `user`

### 登入方式比較

| 項目 | 本地註冊登入 | SSO 登入 |
|------|-------------|----------|
| **認證方式** | 本地密碼驗證 | Synology SSO Server |
| **帳號創建** | 需要先註冊 | 自動創建 |
| **密碼管理** | 用戶自行設定和修改 | 系統隨機生成，不可修改 |
| **初始權限** | user | user |
| **auth_source** | LocalDB | SSO |
| **適用場景** | 獨立部署、小團隊 | 企業環境、集中式身份管理 |

## 權限系統

### 角色層級

系統實作三種角色，權限由高到低：

#### 1. Admin（最高管理員）
- **權限範圍：**
  - 所有 user 和 editor 的權限
  - 查看所有用戶列表 (`GET /api/auth/users`)
  - 修改用戶角色 (`PUT /api/auth/users/:id/role`)
  - 刪除用戶帳號 (`DELETE /api/auth/users/:id`)
  - 管理系統設定

- **使用限制：**
  - 不能刪除自己的帳號
  - 建議只設置 1-2 個 admin 帳號

#### 2. Editor（編輯者）
- **權限範圍：**
  - 所有 user 的權限
  - 創建和管理公開模板
  - 批量管理圖表
  - 查看系統統計資料

- **使用場景：**
  - 團隊主管
  - 內容管理員

#### 3. User（一般用戶）
- **權限範圍：**
  - 創建和編輯自己的圖表
  - 查看公開的圖表和模板
  - 修改自己的個人資料
  - 刪除自己的圖表

- **使用場景：**
  - 一般使用者
  - 新註冊用戶的預設角色

### 權限檢查機制

系統使用中介軟體（middleware）進行權限檢查：

```javascript
// 需要登入
authenticateToken

// 需要 admin 權限
requireAdmin

// 需要 editor 或以上權限
requireEditor

// 可選的認證（不強制登入）
optionalAuth
```

## 技術實作細節

### JWT Token 機制

- **Secret Key：** `mitdb-default-jwt-secret-2024`
- **有效期：** 7 天
- **Token 內容：**
  ```json
  {
    "userId": 1,
    "username": "user",
    "email": "user@example.com",
    "role": "user"
  }
  ```
- **儲存位置：** 前端 localStorage
- **傳遞方式：** Authorization header (`Bearer <token>`)

### 資料庫結構

**users 表格：**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'editor', 'user')),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  lastLogin DATETIME,
  isActive INTEGER DEFAULT 1,
  auth_source TEXT DEFAULT 'LocalDB' CHECK (auth_source IN ('LocalDB', 'SSO', 'LDAP')),
  display_name TEXT,
  sso_id TEXT
);
```

### API 端點

#### 認證相關
- `POST /api/auth/register` - 註冊新用戶
- `POST /api/auth/login` - 本地登入
- `POST /api/auth/logout` - 登出
- `GET /api/auth/me` - 獲取當前用戶資訊
- `PUT /api/auth/profile` - 更新個人資料

#### 管理功能（需要 admin）
- `GET /api/auth/users` - 獲取所有用戶
- `PUT /api/auth/users/:id/role` - 更新用戶角色
- `DELETE /api/auth/users/:id` - 刪除用戶

#### SSO 相關
- `GET /sso/login` - 開始 SSO 登入流程
- `GET /sso/callback` - SSO 回調處理
- `GET /sso/clear` - 清理 session（調試用）

## 管理指南

### 初始設置

1. **創建第一個 Admin 管理員**
   
   系統預設包含一個管理員帳號：
   - Username: `admin`
   - Password: 需要在首次部署時設定
   - Email: `admin@ddb.local`
   - Role: `admin`

2. **SSO 設置**

   在 `routes/sso.cjs` 中配置：
   ```javascript
   const SSO_CONFIG = {
     issuer: 'https://sso.mi-tech.com.tw',
     client_id: 'your-client-id',
     client_secret: 'your-client-secret',
     redirect_uri: 'http://your-domain/sso/callback',
     scope: 'openid profile email'
   };
   ```

### 用戶管理

#### 提升用戶權限
1. 使用 root 帳號登入
2. 進入用戶管理介面
3. 選擇目標用戶
4. 更改角色為 `editor` 或 `admin`

#### 管理 SSO 用戶
- SSO 用戶首次登入時自動創建
- 預設角色為 `user`
- 需要手動提升權限
- 無法修改 SSO 用戶的密碼

### 安全建議

1. **密碼政策**
   - 本地用戶應使用強密碼
   - 定期要求用戶更新密碼
   - 考慮實作密碼複雜度檢查

2. **JWT 安全**
   - 定期更換 JWT_SECRET
   - 考慮縮短 token 有效期
   - 實作 token 黑名單機制

3. **權限管理**
   - 最小權限原則：只授予必要的權限
   - 定期審查用戶權限
   - 記錄權限變更日誌

4. **SSO 安全**
   - 使用 HTTPS 進行所有 SSO 通訊
   - 驗證 state 參數防止 CSRF 攻擊
   - 設置合理的 session 超時時間

5. **資料庫安全**
   - 定期備份資料庫
   - 使用 WAL 模式提高並發性能
   - 設置適當的檔案權限（664）

## 故障排除

### 常見問題

1. **SSO 登入失敗**
   - 檢查 SSO 配置是否正確
   - 確認 redirect_uri 與 SSO Server 設定一致
   - 檢查網路連線和防火牆設定

2. **Token 驗證失敗**
   - 確認 JWT_SECRET 一致
   - 檢查 token 是否過期
   - 清除瀏覽器 localStorage 重新登入

3. **權限不足錯誤**
   - 確認用戶角色設定正確
   - 檢查 API 端點的權限要求
   - 重新登入以更新 token 中的角色資訊

## 相關檔案

- `/routes/auth.cjs` - 本地認證實作
- `/routes/sso.cjs` - SSO 認證實作
- `/middleware/auth.cjs` - 認證和權限中介軟體
- `/database/database.cjs` - 資料庫操作
- `/src/context/AuthContext.jsx` - 前端認證狀態管理