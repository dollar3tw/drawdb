# DrawDB 專案設置指南

## 🚀 新專案初始化

### 1. 克隆專案
```bash
git clone [repository-url]
cd drawdb
```

### 2. 安裝依賴
```bash
npm install
```

### 3. 資料庫初始化
**SQLite 資料庫會自動建立！** 首次啟動時，系統會：
- 自動建立 `drawdb.sqlite` 檔案
- 建立所有必要的資料表
- 創建預設管理員帳號

### 4. 啟動服務
```bash
npm run build    # 建置前端
npm start        # 啟動服務（預設 port 3001）
```

## 🔐 預設管理員帳號

### 初始登入資訊
- **使用者名稱**: `admin`
- **密碼**: 在 `.env` 中設定的 `ADMIN_DEFAULT_PASSWORD`

### ⚠️ 重要：首次登入必須修改密碼
1. 使用預設帳密登入
2. 系統會自動要求更改密碼
3. 設定新的安全密碼（建議至少 8 個字元）

## 📁 Git 版本控制說明

### 不需要提交的檔案（已在 .gitignore）
```
✅ 已自動忽略：
- *.sqlite        # 資料庫主檔案
- *.sqlite-shm    # SQLite 共享記憶體檔案
- *.sqlite-wal    # SQLite 寫入日誌檔案
- node_modules/   # NPM 套件
- dist/           # 建置輸出
```

### 為什麼不提交 SQLite？
1. **資料庫會自動建立** - 新環境會自動初始化空資料庫
2. **避免衝突** - 每個環境有自己的資料
3. **安全考量** - 不將使用者資料提交到版本控制
4. **檔案很大** - 資料庫可能達到數百 MB

## 🗄️ 資料庫管理

### 清理資料庫
```bash
# 使用清理腳本
node database/clean-db.cjs

# 或手動重置
rm -f drawdb.sqlite*
npm start  # 會自動重新建立
```

### 資料庫備份
```bash
# 備份
cp drawdb.sqlite drawdb.sqlite.backup

# 還原
cp drawdb.sqlite.backup drawdb.sqlite
```

### 資料庫遷移
```bash
# 執行遷移
node database/migrate.cjs

# 回滾最後一個遷移
node database/migrate.cjs rollback
```

## 🔧 環境變數設定

創建 `.env` 檔案（**必要**）：
```bash
# 從範本複製
cp .env.example .env

# 編輯並修改為您的設定
nano .env
```

重要環境變數：
```env
PORT=3001                              # 服務端口
# NODE_ENV 不要在 .env 設定，會在啟動指令中自動設定
JWT_SECRET=...                         # JWT 密鑰（必須設定）
SESSION_SECRET=...                     # Session 密鑰（必須設定）
ADMIN_DEFAULT_PASSWORD=...             # 預設管理員密碼（必須設定）
# SSO 相關設定請參考 .env.example
```

## 📊 SQLite 檔案說明

當服務運行時，會看到三個 SQLite 檔案：

1. **drawdb.sqlite** - 主資料庫檔案
2. **drawdb.sqlite-shm** - 共享記憶體（運行時產生）
3. **drawdb.sqlite-wal** - Write-Ahead Log（運行時產生）

這是正常的！SQLite 使用 WAL 模式提供更好的並發性能。

## 🆘 常見問題

### Q: 資料庫檔案不存在？
**A:** 執行 `npm start` 會自動建立

### Q: 忘記 admin 密碼？
**A:** 刪除資料庫重新開始：
```bash
rm -f drawdb.sqlite*
npm start
```

### Q: 端口被佔用？
**A:** 使用其他端口：
```bash
PORT=3002 npm start
```

### Q: 資料庫太大？
**A:** 執行清理：
```bash
sqlite3 drawdb.sqlite "DELETE FROM revision_history; VACUUM;"
```

## 📝 開發流程

1. **拉取最新代碼**
   ```bash
   git pull origin main
   ```

2. **安裝/更新依賴**
   ```bash
   npm install
   ```

3. **建置前端**
   ```bash
   npm run build
   ```

4. **啟動服務**
   ```bash
   npm start
   ```

5. **開發模式**
   ```bash
   npm run dev:server  # 自動重載
   ```

## ✅ 檢查清單

新環境設置確認：
- [ ] Node.js >= 16 已安裝
- [ ] npm 已安裝
- [ ] 執行 `npm install` 成功
- [ ] 執行 `npm run build` 成功
- [ ] 執行 `npm start` 成功
- [ ] 可以訪問 http://localhost:3001
- [ ] 使用 admin/admin 登入
- [ ] 已修改預設密碼