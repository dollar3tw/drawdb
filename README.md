<div align="center">
  <sup>Special thanks to:</sup>
  <br>
  <a href="https://www.warp.dev/drawdb/" target="_blank">
    <img alt="Warp sponsorship" width="280" src="https://github.com/user-attachments/assets/c7f141e7-9751-407d-bb0e-d6f2c487b34f">
    <br>
    <b>Next-gen AI-powered intelligent terminal for all platforms</b>
  </a>
</div>

<br/>
<br/>

<div align="center">
    <img width="64" alt="drawdb logo" src="./src/assets/icon-dark.png">
    <h1>drawDB</h1>
</div>

<h3 align="center">Free, simple, and intuitive database schema editor and SQL generator.</h3>

<div align="center" style="margin-bottom:12px;">
    <a href="https://drawdb.app/" style="display: flex; align-items: center;">
        <img src="https://img.shields.io/badge/Start%20building-grey" alt="drawDB"/>
    </a>
    <a href="https://discord.gg/BrjZgNrmR6" style="display: flex; align-items: center;">
        <img src="https://img.shields.io/discord/1196658537208758412.svg?label=Join%20the%20Discord&logo=discord" alt="Discord"/>
    </a>
    <a href="https://x.com/drawDB_" style="display: flex; align-items: center;">
        <img src="https://img.shields.io/badge/Follow%20us%20on%20X-blue?logo=X" alt="Follow us on X"/>
    </a>
</div>

<h3 align="center"><img width="700" style="border-radius:5px;" alt="demo" src="drawdb.png"></h3>

DrawDB is a robust and user-friendly database entity relationship (DBER) editor right in your browser. Build diagrams with a few clicks, export sql scripts, customize your editor, and more without creating an account. See the full set of features [here](https://drawdb.app/).

## 🚀 整合式服務 (All-in-One)

這個版本已經完全整合前後端為單一服務，所有資料都儲存在 SQLite 資料庫中，只需要啟動一個服務即可使用完整功能。

### 快速開始

```bash
git clone https://github.com/drawdb-io/drawdb
cd drawdb

# 安裝所有依賴
npm run setup

# 建置並啟動整合服務
npm start
```

服務啟動後，訪問 http://localhost:3001 即可使用完整功能。

### 開發模式

```bash
# 開發模式（自動重新載入）
npm run dev:server
```

- 整合服務：http://localhost:3001
- 前端會自動建置並由同一服務提供
- API 端點：http://localhost:3001/api

## 📦 部署選項

### 1. 生產部署
```bash
# 建置並啟動服務
npm run build
npm start
```

### 2. Docker 部署
```bash
docker build -t drawdb .
docker run -p 3001:3001 drawdb
```

### 3. 自訂端口
```bash
PORT=3002 npm start
```

## 🗄️ 資料儲存

- 所有資料儲存在 `database/drawdb.sqlite`
- 支援圖表、模板和使用者資料的持久化儲存
- 自動建立和初始化資料庫

## 🔧 環境配置

### 環境變數
```env
PORT=3001                    # 服務端口 (預設: 3001)
NODE_ENV=production         # 環境模式
```

### 生產環境
生產環境中前後端在同一服務下，無需額外配置。

## 📚 API 文件

整合服務提供以下 API 端點：

### 認證相關
- `POST /api/auth/register` - 使用者註冊
- `POST /api/auth/login` - 使用者登入
- `POST /api/auth/logout` - 使用者登出

### 圖表管理
- `GET /api/diagrams` - 獲取所有圖表
- `POST /api/diagrams` - 創建新圖表
- `GET /api/diagrams/:id` - 獲取特定圖表
- `PUT /api/diagrams/:id` - 更新圖表
- `DELETE /api/diagrams/:id` - 刪除圖表

### 模板管理
- `GET /api/templates` - 獲取所有模板
- `POST /api/templates` - 創建新模板

## 🔐 認證系統

系統包含完整的使用者認證功能：
- 預設管理員帳號：`mitadmin` / `mitadmin123`
- 支援使用者註冊和登入
- JWT Token 認證
- 自動會話清理

## 🛠️ 技術架構

- **整合服務**：Node.js + Express (server.cjs)
- **前端**：React + Vite + Tailwind CSS
- **資料庫**：SQLite
- **認證**：JWT + bcrypt
- **靜態檔案**：Express 靜態檔案服務

## 📁 專案結構

```
drawdb/
├── src/                    # React 前端原始碼
├── dist/                   # 建置後的前端檔案
├── database/               # 資料庫相關檔案
├── routes/                 # API 路由
├── middleware/             # Express 中介軟體
├── server.cjs              # 整合服務主檔案
├── package.json            # 專案配置
└── README.md              # 專案說明
```

## 🚀 快速啟動指南

詳細的啟動說明請參考 [START.md](./START.md)

## 🔧 故障排除

### 端口佔用問題
```bash
# 查看佔用端口的程序
lsof -i :3001

# 停止佔用端口的程序
pkill -f "node server.cjs"

# 或使用其他端口
PORT=3002 npm start
```

### 資料庫問題
- 資料庫檔案位於 `database/drawdb.sqlite`
- 如果資料庫損壞，刪除該檔案後重新啟動服務會自動重建
