# DrawDB 整合式服務啟動指南

## 快速啟動

### 1. 安裝依賴
```bash
npm run setup
```

### 2. 啟動服務
```bash
npm start
```

服務將會：
- 自動建置前端檔案
- 啟動整合式服務 (server.cjs)
- 在 http://localhost:3001 提供完整的 DrawDB 服務

## 開發模式

如果您需要開發模式（自動重新載入）：
```bash
npm run dev:server
```

## 服務說明

- **網站地址**: http://localhost:3001
- **API 服務**: http://localhost:3001/api
- **資料庫**: SQLite (database/drawdb.sqlite)
- **預設管理員**: 
  - 使用者名稱: `mitadmin`
  - 密碼: `mitadmin123`

## 架構說明

此版本採用整合式架構：
- **單一服務**: 所有功能整合在 `server.cjs` 中
- **前端**: React 應用建置後由 Express 提供靜態檔案服務
- **後端**: Express API 路由處理所有後端邏輯
- **資料庫**: SQLite 檔案儲存所有資料

## 注意事項

1. 首次啟動會自動建立 SQLite 資料庫
2. 所有資料都儲存在本地 SQLite 檔案中
3. 如果端口 3001 被佔用，可以使用：`PORT=3002 npm start`
4. 建議首次登入後更改預設管理員密碼
5. 系統會自動清理過期會話（每小時執行一次）

## 故障排除

### 端口佔用問題
```bash
# 查看佔用端口的程序
lsof -i :3001

# 停止佔用端口的程序
pkill -f "node server.cjs"

# 或使用其他端口
PORT=3002 npm start
```

### 服務重啟
```bash
# 如果服務異常，可以強制停止並重新啟動
pkill -f "node server.cjs"
npm start
```

### 資料庫重置
```bash
# 如果需要重置資料庫（會清除所有資料）
rm -f database/drawdb.sqlite*
npm start
``` 