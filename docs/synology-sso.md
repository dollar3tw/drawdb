# Synology SSO 整合指南

## 概述

DrawDB 支援透過 Synology SSO Server 進行單一登入（Single Sign-On），讓使用者可以使用 Synology DSM 帳號直接登入系統。

## 設定步驟

### 1. Synology SSO Server 設定

在 Synology DSM 的 SSO Server 中創建新的應用程式：

1. 登入 Synology DSM 管理介面
2. 開啟「SSO Server」套件
3. 點擊「應用程式」標籤
4. 點擊「新增」創建新應用程式
5. 填寫應用程式資訊：
   - **應用程式名稱**：`drawdb`
   - **重新導向 URI**：`http://dd2.mi-tech.com.tw/sso/callback`（注意：必須是 http 而非 https）
   - **應用程式類型**：選擇「OIDC」

6. 創建後記錄以下資訊：
   - **應用程式 ID**（Client ID）
   - **應用程式密鑰**（Client Secret）

### 2. DrawDB SSO 配置

編輯 `/routes/sso.cjs` 文件中的 SSO 配置：

```javascript
const SSO_CONFIG = {
  issuer: 'https://sso.mi-tech.com.tw',
  client_id: '你的應用程式ID',
  client_secret: '你的應用程式密鑰',
  redirect_uri: 'http://你的網域/sso/callback',
  scope: 'openid profile email'
};
```

### 3. 環境變數設定（可選）

建議使用環境變數來管理敏感資訊：

```bash
# .env 文件
SSO_ISSUER=https://sso.mi-tech.com.tw
SSO_CLIENT_ID=你的應用程式ID
SSO_CLIENT_SECRET=你的應用程式密鑰
SSO_REDIRECT_URI=http://你的網域/sso/callback
JWT_SECRET=your-jwt-secret-key
SESSION_SECRET=your-session-secret-key
```

## 技術實現細節

### 認證流程

1. **使用者點擊 SSO 登入**
   - 前端顯示「使用 Synology SSO 登入」按鈕
   - 點擊後重定向到 `/sso/login`

2. **OAuth 2.0 授權流程**
   - 系統生成 state 和 nonce 參數
   - 將使用者重定向到 Synology SSO 登入頁面
   - 使用者在 DSM 登入頁面輸入帳號密碼

3. **回調處理**
   - SSO Server 驗證成功後回調到 `/sso/callback`
   - 系統驗證 state 參數防止 CSRF 攻擊
   - 使用授權碼（authorization code）交換 access token

4. **Token 交換**
   - 使用 `client_secret_post` 認證方法
   - 發送 POST 請求到 token endpoint
   - 獲取 access_token 和 id_token

5. **用戶資訊獲取**
   - 使用 access_token 調用 userinfo endpoint
   - 獲取用戶的 email、username 等資訊
   - 在本地資料庫創建或更新用戶記錄

6. **JWT Token 生成**
   - 生成應用程式自己的 JWT token
   - 包含 userId、username、email 等資訊
   - 設定 7 天有效期

7. **前端處理**
   - 重定向回首頁並附帶 token 參數
   - 前端 AuthContext 自動處理 token
   - 將 token 儲存到 localStorage
   - 設定 axios 的預設 Authorization header

### 關鍵文件

- `/routes/sso.cjs` - SSO 路由處理
- `/src/components/LoginModal.jsx` - 登入介面（包含 SSO 按鈕）
- `/src/context/AuthContext.jsx` - 前端認證狀態管理
- `/middleware/auth.cjs` - JWT token 驗證中間件

## 常見問題與解決方案

### 1. Token Exchange 失敗（401 錯誤）

**問題**：顯示 "server_error" 或 401 Unauthorized

**解決方案**：
- 檢查 client_id 和 client_secret 是否正確
- 確認 redirect_uri 完全匹配（包括協議 http/https）
- 注意密鑰中的每個字符，避免複製錯誤

### 2. 協議不匹配錯誤

**問題**：使用 https 訪問但 redirect_uri 配置為 http

**解決方案**：
- 統一使用 http 或 https
- 或在 SSO Server 中添加兩個 redirect_uri

### 3. JWT 簽名驗證失敗

**問題**：`JsonWebTokenError: invalid signature`

**解決方案**：
- 確保所有地方使用相同的 JWT_SECRET
- 檢查 `/routes/sso.cjs` 和 `/middleware/auth.cjs` 中的 secret

### 4. 會話已過期或無效

**問題**：JWT 驗證成功但提示會話無效

**解決方案**：
- SSO 用戶不需要 session token
- 直接使用 JWT token 中的用戶資訊
- 已在 auth middleware 中修正此問題

### 5. 無法顯示登入狀態

**問題**：登入成功但前端仍顯示未登入

**解決方案**：
- 確保前端已重新建置 (`npm run build`)
- 檢查瀏覽器 Console 是否有錯誤
- 確認 localStorage 中有 auth_token

## 安全考量

1. **HTTPS 建議**
   - 生產環境強烈建議使用 HTTPS
   - 避免 token 在傳輸過程中被截獲

2. **環境變數管理**
   - 不要將 client_secret 提交到版本控制
   - 使用環境變數或配置文件管理敏感資訊

3. **Token 有效期**
   - JWT token 預設 7 天有效期
   - 可根據安全需求調整

4. **CSRF 防護**
   - 使用 state 參數防止 CSRF 攻擊
   - state 使用 JWT 加密並設定短暫有效期（10 分鐘）

## 調試技巧

1. **查看詳細日誌**
   - 終端會顯示完整的 SSO 流程日誌
   - 包含 token exchange、用戶資訊等

2. **手動測試 Token Exchange**
   ```bash
   curl -X POST "https://sso.mi-tech.com.tw/webman/sso/SSOAccessToken.cgi" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "grant_type=authorization_code" \
     -d "code=AUTHORIZATION_CODE" \
     -d "redirect_uri=http://your-domain/sso/callback"
   ```

3. **瀏覽器開發者工具**
   - Network 標籤查看請求詳情
   - Console 查看前端日誌
   - Application 標籤查看 localStorage

## 相關配置範例

### Nginx 反向代理配置（如需要）

```nginx
location /sso {
    proxy_pass http://localhost:3001/sso;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 未來改進建議

1. 支援自動刷新 token
2. 實現 Single Logout（單一登出）
3. 支援更多 OIDC 提供者（如 Google、Azure AD）
4. 添加角色映射功能（將 DSM 群組映射到應用角色）