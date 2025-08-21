# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 建置與開發指令

### 初始設置
```bash
npm run setup          # 安裝所有依賴
```

### 開發模式
```bash
npm run dev:server     # 開發模式（自動重新載入）- 服務運行在 http://localhost:3001
```

### 生產建置
```bash
npm run build         # 建置前端（輸出到 dist/）
npm start            # 建置並啟動整合服務
```

### 程式碼品質
```bash
npm run lint         # 執行 ESLint 檢查
```

### 環境變數
```bash
PORT=3001                              # 服務端口
NODE_ENV=production                    # 環境模式
JWT_SECRET=drawdb-mit-secret-key-2024  # JWT 簽名密鑰（重要：必須與 auth.cjs 中一致）
SESSION_SECRET=your-session-secret     # Session 加密密鑰
```

## 架構概覽

### 整合式架構
DrawDB 採用前後端整合的單一服務架構：
- **前端**：React 18 + Vite，使用 Context API 管理狀態
- **後端**：Node.js + Express，整合在 server.cjs 中
- **資料庫**：SQLite（database/drawdb.sqlite）
- **認證**：JWT token + bcrypt，支援 Synology SSO
- **UI 框架**：Semi UI + Tailwind CSS + Framer Motion

### 關鍵目錄結構
```
/src                # React 前端源碼
  /context         # 狀態管理（11個 Context）
  /components      # UI 元件
  /pages          # 頁面元件
  /hooks          # 自定義 Hook
  /utils          # 工具函數（SQL 生成、匯入匯出等）
/routes           # API 路由（auth、diagrams、templates、sso）
/middleware       # Express 中介軟體（JWT 驗證）
/database         # 資料庫模組
server.cjs        # 整合式服務主檔案
```

### 核心 Context 架構
1. **AuthContext** - 使用者認證與授權
2. **DiagramContext** - 圖表資料管理（表格、關聯、索引）
3. **CanvasContext** - 畫布操作（平移、縮放）
4. **SelectContext** - 選擇狀態管理
5. **UndoRedoContext** - 撤銷/重做功能
6. **SaveStateContext** - 儲存狀態追蹤
7. **AreasContext** - 區域管理
8. **NotesContext** - 註解管理
9. **EnumsContext** - 列舉管理
10. **TypesContext** - 自定義類型管理
11. **SettingsContext** - 應用程式設定

### API 端點模式
- `/api/auth/*` - 認證相關（登入、註冊、登出）
- `/api/diagrams/*` - 圖表 CRUD 操作
- `/api/templates/*` - 模板管理
- `/sso/*` - Synology SSO 整合（OIDC 流程）

### 資料庫架構
```sql
- users (id, username, email, password, role, display_name)
  - role: 'admin' (最高管理者), 'editor' (編輯者), 'user' (一般用戶)
- diagrams (id, user_id, diagram_data, is_public, share_id)
- templates (id, name, thumbnail, diagram_data)
- user_sessions (id, user_id, created_at, expires_at)
- revision_history (id, diagram_id, revision_data, revision_message)
```

## 重要實作細節

### SQL 生成器架構
位於 `/src/utils/exportSQL/`，每種資料庫都有專屬的生成器：
- 共用邏輯在 `shared.js`
- 各資料庫特定語法在對應檔案（mysql.js、postgres.js 等）
- 主入口在 `index.js`，根據資料庫類型分發

### 匯入/匯出系統
- SQL 匯入：`/src/utils/importSQL/` - 使用 node-sql-parser 解析
- DBML 支援：使用 @dbml/core 套件
- 匯出格式：SQL、DBML、Mermaid、文檔

### 認證流程
1. 一般登入：JWT token 儲存在 localStorage
2. SSO 登入：
   - OIDC 授權碼流程
   - 自動創建本地用戶
   - JWT secret 必須統一（drawdb-mit-secret-key-2024）

### 前端路由結構
- `/` - 首頁（未登入顯示 Landing Page）
- `/editor` - 主編輯器（需要登入）
- `/templates` - 模板庫
- `/bug-report` - 錯誤回報

## 開發注意事項

### 檔案類型約定
- `.cjs` - CommonJS 模組（後端）
- `.js/.jsx` - ES 模組（前端）
- 專案設定為 `"type": "module"`

### 資料流模式
1. 前端通過 Context API 管理狀態
2. 使用 axios 與後端 API 通訊
3. 所有 API 請求需要 JWT token（除了登入/註冊）
4. 圖表資料以 JSON 格式儲存在資料庫

### 端口衝突處理
```bash
lsof -i :3001              # 查看佔用
pkill -f "node server.cjs" # 停止服務
PORT=3002 npm start        # 使用其他端口
```

### 資料庫重置
```bash
rm -f database/drawdb.sqlite*  # 刪除資料庫（會清除所有資料）
npm start                       # 重新啟動會自動初始化
```