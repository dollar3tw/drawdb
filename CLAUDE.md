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
# NODE_ENV 會在啟動指令中自動設定（npm start = production, npm dev = development）
JWT_SECRET=mitdb-default-jwt-secret-2024  # JWT 簽名密鑰（重要：必須與 auth.cjs 中一致）
SESSION_SECRET=your-session-secret     # Session 加密密鑰
SSO_ISSUER=https://sso.mi-tech.com.tw  # SSO 伺服器地址
SSO_CLIENT_ID=...                      # SSO 客戶端 ID
SSO_CLIENT_SECRET=...                  # SSO 客戶端密鑰
SSO_REDIRECT_URI=...                   # SSO 回調 URL
STATE_SECRET=...                       # SSO 狀態加密密鑰
SSO_SCOPE=openid profile email         # SSO 權限範圍
ADMIN_DEFAULT_PASSWORD=admin           # 預設管理員密碼（首次登入後必須修改）
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

### 資料庫架構（SQLite）

#### users 表 - 使用者管理
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,  -- bcrypt 加密
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'editor', 'user')),
  display_name TEXT,  -- 顯示名稱
  auth_source TEXT DEFAULT 'LocalDB' CHECK (auth_source IN ('LocalDB', 'SSO', 'LDAP')),
  sso_id TEXT,  -- SSO 識別碼
  must_change_password INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  lastLogin DATETIME,
  isActive INTEGER DEFAULT 1
)
```

#### diagrams 表 - 圖表資料
```sql
CREATE TABLE diagrams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  databaseType TEXT,  -- mysql, postgresql, sqlite 等
  tables TEXT,  -- JSON 格式的表格資料
  relationships TEXT,  -- JSON 格式的關聯資料
  notes TEXT,  -- JSON 格式的註解
  areas TEXT,  -- JSON 格式的區域資料
  enums TEXT DEFAULT '[]',  -- JSON 格式的列舉
  types TEXT DEFAULT '[]',  -- JSON 格式的自定義類型
  pan TEXT,  -- 畫布位置
  zoom REAL,  -- 縮放比例
  lastModified DATETIME DEFAULT CURRENT_TIMESTAMP,
  userId INTEGER,
  is_collaborative INTEGER DEFAULT 0,  -- 是否為協作圖表
  promoted_by INTEGER,  -- 推廣者 ID
  promoted_at DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (promoted_by) REFERENCES users(id)
)
```

#### diagram_permissions 表 - 圖表權限管理
```sql
CREATE TABLE diagram_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  diagram_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  permission_type TEXT NOT NULL CHECK (permission_type IN ('owner', 'editor', 'viewer')),
  granted_by INTEGER NOT NULL,
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id),
  UNIQUE(diagram_id, user_id)
)
```

#### revision_history 表 - 修訂歷史
```sql
CREATE TABLE revision_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  diagramId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  username TEXT NOT NULL,
  action TEXT NOT NULL,  -- CREATE, EDIT, DELETE 等
  element TEXT NOT NULL,  -- TABLE, RELATIONSHIP, NOTE 等
  message TEXT NOT NULL,  -- 修訂訊息
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (diagramId) REFERENCES diagrams(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
)
```

#### user_sessions 表 - 使用者會話管理
```sql
CREATE TABLE user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,  -- JWT token
  expiresAt DATETIME NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
)
```

#### templates 表 - 範本管理
```sql
CREATE TABLE templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  databaseType TEXT,
  tables TEXT,  -- JSON 格式
  relationships TEXT,  -- JSON 格式
  notes TEXT,  -- JSON 格式
  subjectAreas TEXT,  -- JSON 格式
  pan TEXT,
  zoom REAL,
  custom INTEGER DEFAULT 1
)
```

#### collaboration_history 表 - 協作歷史
```sql
CREATE TABLE collaboration_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  diagram_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  changes TEXT,  -- JSON 格式的變更詳情
  details TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
```

## 重要實作細節

### SQL 生成器架構
位於 `/src/utils/exportSQL/`，每種資料庫都有專屬的生成器：
- 共用邏輯在 `shared.js`
- 各資料庫特定語法在對應檔案（mysql.js、postgres.js 等）
- 主入口在 `index.js`，根據資料庫類型分發

### 匯入/匯出系統
- SQL 匯入：`/src/utils/importSQL/` - 使用簡單提取器處理 PostgreSQL/pgAdmin 格式
- DBML 支援：使用 @dbml/core 套件
- 匯出格式：SQL、DBML、Mermaid、文檔
- 智慧合併：支援增量匯入，保留使用者編輯

### 認證流程
1. 一般登入：JWT token 儲存在 localStorage
2. SSO 登入：
   - OIDC 授權碼流程
   - 自動創建本地用戶
   - JWT secret 必須統一（mitdb-default-jwt-secret-2024）

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
rm -f drawdb.sqlite*  # 刪除資料庫（會清除所有資料）
npm start             # 重新啟動會自動初始化
```

### 預設管理員帳號
- 使用者名稱：`admin`
- 預設密碼：`admin`
- **重要**：首次登入必須修改密碼

## 重要系統檔案說明

### 資料庫相關（必須保留）
- **sqlite3** - 主要資料庫引擎，專案核心依賴
- **drawdb.sqlite** - 主資料庫檔案
- **drawdb.sqlite-shm** - SQLite 共享記憶體檔案（運行時產生）
- **drawdb.sqlite-wal** - SQLite Write-Ahead Log（運行時產生）
- **database/migrate.cjs** - 資料庫遷移管理系統
- **database/migrations/** - 遷移腳本目錄，記錄資料庫架構變更歷史

## 已移除的功能和檔案

### 移除的UI功能（2024-08）
- **檢視/側邊欄** - 側邊欄切換功能
- **檢視/嚴謹模式** - 圖表錯誤檢查模式（快捷鍵 Ctrl+Shift+M）
- **檢視/欄位詳細資料** - 欄位詳細資訊顯示（快捷鍵 Ctrl+Shift+F）
- **檢視/顯示資料型別** - 資料型別顯示切換

### 移除的依賴套件
- **dexie** - 本地 IndexedDB（改用後端 API）
- **dexie-react-hooks** - Dexie 的 React Hooks

### 已清理的檔案（2024-08-22）
- 測試用 SQL 檔案（babycare.sql - 134個表格的測試資料）
- 一次性遷移腳本（migrate-root-to-admin.cjs, migrate-root-to-admin-v2.cjs）
- 密碼重設腳本（reset-admin-password.cjs）
- 重複的文件（START.md）
- 臨時檔案（temp_export_section.txt）
- 舊版資料庫檔案（database/database.db）
- Dexie 相關註解程式碼