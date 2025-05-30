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
- 啟動整合式後端服務
- 在 http://localhost:3001 提供完整的 DrawDB 服務

## 開發模式

如果您需要開發模式（自動重新載入）：
```bash
npm run dev:full
```

## 服務說明

- **網站地址**: http://localhost:3001
- **API 服務**: http://localhost:3001/api
- **資料庫**: SQLite (backend/drawdb.sqlite)
- **預設管理員**: 
  - 使用者名稱: `mitadmin`
  - 密碼: `mitadmin123`

## 注意事項

1. 首次啟動會自動建立 SQLite 資料庫
2. 所有資料都儲存在本地 SQLite 檔案中
3. 如果端口 3001 被佔用，可以使用：`PORT=3002 npm start`
4. 建議首次登入後更改預設管理員密碼

## 故障排除

如果遇到端口佔用問題：
```bash
# 查看佔用端口的程序
lsof -i :3001

# 停止佔用端口的程序
pkill -f "node server.js"
``` 