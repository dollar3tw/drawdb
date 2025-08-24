# DrawDB 資料庫架構文件

## 概述
DrawDB 使用 SQLite 作為主要資料庫，所有資料儲存在 `drawdb.sqlite` 檔案中。資料庫採用 WAL（Write-Ahead Logging）模式以提供更好的並發性能。

## 資料庫初始化
- 資料庫檔案位置：專案根目錄的 `drawdb.sqlite`
- 初始化程式：`database/database.cjs`
- 首次啟動時自動建立所有必要的表格
- 自動建立預設管理員帳號（username: admin, password: admin）

## 資料表結構詳解

### 1. users 表 - 使用者管理
儲存系統中所有使用者的資訊。

| 欄位名稱 | 資料類型 | 說明 | 限制條件 |
|---------|---------|------|---------|
| id | INTEGER | 主鍵，自動遞增 | PRIMARY KEY AUTOINCREMENT |
| username | TEXT | 使用者名稱 | UNIQUE NOT NULL |
| email | TEXT | 電子郵件 | UNIQUE NOT NULL |
| password | TEXT | 密碼（bcrypt 加密） | NOT NULL |
| role | TEXT | 角色：admin/editor/user | DEFAULT 'user' |
| display_name | TEXT | 顯示名稱 | 可為空 |
| auth_source | TEXT | 認證來源：LocalDB/SSO/LDAP | DEFAULT 'LocalDB' |
| sso_id | TEXT | SSO 識別碼 | 可為空 |
| must_change_password | INTEGER | 是否需要變更密碼 | DEFAULT 0 |
| createdAt | DATETIME | 建立時間 | DEFAULT CURRENT_TIMESTAMP |
| lastLogin | DATETIME | 最後登入時間 | 可為空 |
| isActive | INTEGER | 帳號是否啟用 | DEFAULT 1 |

**角色權限說明：**
- `admin`: 最高權限，可管理使用者、所有圖表
- `editor`: 編輯權限，可建立和編輯圖表
- `user`: 一般使用者，基本權限

### 2. diagrams 表 - 圖表資料
儲存所有的資料庫圖表設計。

| 欄位名稱 | 資料類型 | 說明 | 限制條件 |
|---------|---------|------|---------|
| id | INTEGER | 主鍵，自動遞增 | PRIMARY KEY AUTOINCREMENT |
| name | TEXT | 圖表名稱 | NOT NULL |
| databaseType | TEXT | 資料庫類型（mysql/postgresql/sqlite等） | 可為空 |
| tables | TEXT | 表格定義（JSON格式） | 可為空 |
| relationships | TEXT | 關聯定義（JSON格式） | 可為空 |
| notes | TEXT | 註解資料（JSON格式） | 可為空 |
| areas | TEXT | 區域定義（JSON格式） | 可為空 |
| enums | TEXT | 列舉定義（JSON格式） | DEFAULT '[]' |
| types | TEXT | 自定義類型（JSON格式） | DEFAULT '[]' |
| pan | TEXT | 畫布位置 | 可為空 |
| zoom | REAL | 縮放比例 | 可為空 |
| lastModified | DATETIME | 最後修改時間 | DEFAULT CURRENT_TIMESTAMP |
| userId | INTEGER | 擁有者ID | FOREIGN KEY |
| is_collaborative | INTEGER | 是否為協作圖表 | DEFAULT 0 |
| promoted_by | INTEGER | 推廣者ID | FOREIGN KEY |
| promoted_at | DATETIME | 推廣時間 | 可為空 |
| createdAt | DATETIME | 建立時間 | DEFAULT CURRENT_TIMESTAMP |
| updatedAt | DATETIME | 更新時間 | DEFAULT CURRENT_TIMESTAMP |

### 3. diagram_permissions 表 - 圖表權限管理
管理圖表的共享權限。

| 欄位名稱 | 資料類型 | 說明 | 限制條件 |
|---------|---------|------|---------|
| id | INTEGER | 主鍵，自動遞增 | PRIMARY KEY AUTOINCREMENT |
| diagram_id | INTEGER | 圖表ID | NOT NULL, FOREIGN KEY |
| user_id | INTEGER | 使用者ID | NOT NULL, FOREIGN KEY |
| permission_type | TEXT | 權限類型：owner/editor/viewer | NOT NULL |
| granted_by | INTEGER | 授權者ID | NOT NULL, FOREIGN KEY |
| granted_at | DATETIME | 授權時間 | DEFAULT CURRENT_TIMESTAMP |

**權限類型說明：**
- `owner`: 擁有者，完全控制權
- `editor`: 編輯者，可修改圖表
- `viewer`: 檢視者，僅可檢視

### 4. revision_history 表 - 修訂歷史
記錄圖表的所有修改歷史。

| 欄位名稱 | 資料類型 | 說明 | 限制條件 |
|---------|---------|------|---------|
| id | INTEGER | 主鍵，自動遞增 | PRIMARY KEY AUTOINCREMENT |
| diagramId | INTEGER | 圖表ID | NOT NULL, FOREIGN KEY |
| userId | INTEGER | 使用者ID | NOT NULL, FOREIGN KEY |
| username | TEXT | 使用者名稱 | NOT NULL |
| action | TEXT | 動作類型（CREATE/EDIT/DELETE） | NOT NULL |
| element | TEXT | 元素類型（TABLE/RELATIONSHIP/NOTE等） | NOT NULL |
| message | TEXT | 修訂訊息 | NOT NULL |
| timestamp | DATETIME | 時間戳記 | DEFAULT CURRENT_TIMESTAMP |

### 5. user_sessions 表 - 使用者會話管理
管理使用者的登入會話。

| 欄位名稱 | 資料類型 | 說明 | 限制條件 |
|---------|---------|------|---------|
| id | INTEGER | 主鍵，自動遞增 | PRIMARY KEY AUTOINCREMENT |
| userId | INTEGER | 使用者ID | NOT NULL, FOREIGN KEY |
| token | TEXT | JWT Token | UNIQUE NOT NULL |
| expiresAt | DATETIME | 過期時間 | NOT NULL |
| createdAt | DATETIME | 建立時間 | DEFAULT CURRENT_TIMESTAMP |

### 6. templates 表 - 範本管理
儲存可重複使用的圖表範本。

| 欄位名稱 | 資料類型 | 說明 | 限制條件 |
|---------|---------|------|---------|
| id | INTEGER | 主鍵，自動遞增 | PRIMARY KEY AUTOINCREMENT |
| title | TEXT | 範本標題 | NOT NULL |
| databaseType | TEXT | 資料庫類型 | 可為空 |
| tables | TEXT | 表格定義（JSON格式） | 可為空 |
| relationships | TEXT | 關聯定義（JSON格式） | 可為空 |
| notes | TEXT | 註解資料（JSON格式） | 可為空 |
| subjectAreas | TEXT | 主題區域（JSON格式） | 可為空 |
| pan | TEXT | 畫布位置 | 可為空 |
| zoom | REAL | 縮放比例 | 可為空 |
| custom | INTEGER | 是否為自定義範本 | DEFAULT 1 |

### 7. collaboration_history 表 - 協作歷史
記錄協作圖表的操作歷史。

| 欄位名稱 | 資料類型 | 說明 | 限制條件 |
|---------|---------|------|---------|
| id | INTEGER | 主鍵，自動遞增 | PRIMARY KEY AUTOINCREMENT |
| diagram_id | INTEGER | 圖表ID | NOT NULL, FOREIGN KEY |
| user_id | INTEGER | 使用者ID | NOT NULL, FOREIGN KEY |
| action | TEXT | 動作類型 | NOT NULL |
| target_type | TEXT | 目標類型 | 可為空 |
| target_id | TEXT | 目標ID | 可為空 |
| changes | TEXT | 變更內容（JSON格式） | 可為空 |
| details | TEXT | 詳細資訊 | 可為空 |
| timestamp | DATETIME | 時間戳記 | DEFAULT CURRENT_TIMESTAMP |

## 資料庫維護

### 重置資料庫
```bash
# 停止服務
pkill -f "node server.cjs"

# 刪除資料庫檔案
rm -f drawdb.sqlite drawdb.sqlite-shm drawdb.sqlite-wal

# 重新啟動服務（會自動建立新資料庫）
npm run dev:server
```

### 備份資料庫
```bash
# 建立備份
cp drawdb.sqlite drawdb.sqlite.backup

# 還原備份
cp drawdb.sqlite.backup drawdb.sqlite
```

### 資料庫遷移
遷移系統位於 `database/migrate.cjs`，支援：
- 自動執行未執行的遷移
- 回滾最後一個遷移
- 遷移歷史追蹤

執行遷移：
```bash
node database/migrate.cjs
```

回滾遷移：
```bash
node database/migrate.cjs rollback
```

## 效能優化建議

1. **索引優化**
   - users 表已有 username 和 email 的唯一索引
   - diagram_permissions 有 (diagram_id, user_id) 的複合唯一索引

2. **JSON 資料處理**
   - tables、relationships 等欄位儲存 JSON 資料
   - 前端負責解析和處理 JSON
   - 避免在資料庫層級進行 JSON 操作

3. **WAL 模式**
   - 已啟用 WAL 模式提升並發效能
   - 定期清理 WAL 檔案避免過大

4. **外鍵約束**
   - 使用 ON DELETE CASCADE 確保資料一致性
   - 刪除使用者或圖表時自動清理相關資料

## 注意事項

1. **密碼安全**
   - 所有密碼使用 bcrypt 加密（salt rounds: 10）
   - 預設管理員密碼必須在首次登入後修改

2. **資料完整性**
   - 外鍵約束確保引用完整性
   - CHECK 約束驗證欄位值的有效性

3. **時區處理**
   - 所有時間欄位使用 UTC 時間
   - 前端負責轉換為本地時間

4. **資料庫檔案權限**
   - 確保 drawdb.sqlite 檔案有適當的讀寫權限
   - 生產環境建議設置為 660 權限