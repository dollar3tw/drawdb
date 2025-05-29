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

## 🚀 整合部署 (推薦)

這個版本已經整合前後端，所有資料都儲存在後端的 SQLite 資料庫中，只需要啟動一個服務。

### 快速開始

```bash
git clone https://github.com/drawdb-io/drawdb
cd drawdb

# 安裝所有依賴
npm run full:setup

# 建置並啟動整合服務
npm start
```

服務啟動後，訪問 http://localhost:3001 即可使用完整功能。

### 開發模式

```bash
# 同時啟動前後端開發服務
npm run full:dev
```

- 前端開發服務：http://localhost:5173
- 後端 API 服務：http://localhost:3001
- 前端會自動代理 API 請求到後端

## 📦 部署選項

### 1. 整合部署 (推薦)
```bash
# 建置前端並啟動後端服務
npm run build
cd backend
npm start
```

### 2. Docker 部署
```bash
docker build -t drawdb .
docker run -p 3001:3001 drawdb
```

### 3. 純前端部署 (功能受限)
```bash
npm run build
# 將 dist/ 目錄部署到靜態網站託管服務
```

## 🗄️ 資料儲存

- **整合模式**：所有資料儲存在 `backend/drawdb.sqlite`
- **純前端模式**：資料儲存在瀏覽器 IndexedDB (無法分享)

## 🔧 環境配置

### 開發環境變數
創建 `.env` 檔案：
```env
VITE_BACKEND_URL=http://localhost:3001
```

### 生產環境
生產環境中前後端在同一域名下，無需額外配置。

## 📚 API 文件

整合服務提供以下 API 端點：

- `GET /api/diagrams` - 獲取所有圖表
- `POST /api/diagrams` - 創建新圖表
- `GET /api/diagrams/:id` - 獲取特定圖表
- `PUT /api/diagrams/:id` - 更新圖表
- `DELETE /api/diagrams/:id` - 刪除圖表
- `GET /api/templates` - 獲取所有模板
- `POST /api/templates` - 創建新模板

## 🔐 認證系統

系統包含基本的使用者認證功能：
- 預設管理員帳號：`mitadmin` / `mitadmin123`
- 支援使用者註冊和登入
- JWT Token 認證

## 🛠️ 技術架構

- **前端**：React + Vite + Tailwind CSS
- **後端**：Node.js + Express
- **資料庫**：SQLite
- **認證**：JWT + bcrypt
