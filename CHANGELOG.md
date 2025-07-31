# 更新日誌

## [1.1.0] - 2025-01-31

### 新增功能
- **Synology SSO 單一登入支援** - 使用者現在可以使用 Synology DSM 帳號直接登入系統
  - 實現完整的 OIDC (OpenID Connect) 認證流程
  - 支援自動創建本地用戶
  - 整合 JWT token 認證機制
  - 添加 SSO 登入按鈕到登入介面

### 技術改進
- 改進 JWT token 驗證邏輯，移除對 session token 的強制依賴
- 優化前端 AuthContext 的 SSO token 處理
- 增強錯誤處理和調試日誌輸出
- 統一 JWT secret 配置

### 文檔更新
- 新增 [Synology SSO 整合指南](./docs/synology-sso.md)
- 更新 README.md 添加 SSO 相關說明
- 添加環境變數配置範例

### 修復問題
- 修正 JWT secret 不一致導致的認證失敗問題
- 修正 SSO 回調後前端無法正確顯示登入狀態的問題
- 修正 token exchange 時的 client secret 錯誤

## [1.0.0] - 2025-01-01

### 初始版本
- 整合前後端為單一服務
- SQLite 資料庫支援
- 基本的使用者認證系統
- 圖表管理功能
- 模板管理功能
- SQL 腳本生成
- 多資料庫支援（MySQL、PostgreSQL、SQLite、SQL Server、MariaDB、Oracle）