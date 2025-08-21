# DrawDB SQL 匯入使用指南

## 目錄
- [功能介紹](#功能介紹)
- [從資料庫工具匯出 SQL](#從資料庫工具匯出-sql)
- [SQL 檔案準備要求](#sql-檔案準備要求)
- [匯入步驟](#匯入步驟)
- [常見問題與解決方案](#常見問題與解決方案)
- [範例 SQL 檔案](#範例-sql-檔案)

## 功能介紹

DrawDB 提供兩種匯入功能：

### 1. 檔案 → 匯入自
- **JSON/DDB 格式**：匯入 DrawDB 專有格式的完整圖表
- **DBML 格式**：匯入 Database Markup Language 檔案

### 2. 檔案 → 從SQL匯入
- **用途**：從現有資料庫的 SQL DDL 腳本反向工程生成 ER 圖
- **支援資料庫**：
  - MySQL
  - PostgreSQL
  - SQLite
  - MariaDB
  - SQL Server (MSSQL)
  - Oracle SQL

## 從資料庫工具匯出 SQL

### pgAdmin (PostgreSQL)

#### 方法一：使用 Backup 功能
1. 右鍵點擊要匯出的資料庫
2. 選擇 **「Backup...」**
3. 設定選項：
   ```
   Filename: your_database.sql
   Format: Plain (純文字)
   Encoding: UTF8
   ```
4. 在 **「Dump options」** 標籤中：
   - **Sections**：
     - ✅ Pre-data（結構定義）
     - ❌ Data（取消勾選，不需要資料）
     - ✅ Post-data（約束、索引）
   - **Do not save**：
     - ✅ Owner（擁有者）
     - ✅ Privilege（權限）
     - ✅ Tablespace（表空間）
5. 點擊 **「Backup」**

#### 方法二：使用命令列 pg_dump
```bash
# 只匯出結構，不含資料
pg_dump -h localhost -U username -d database_name \
  --schema-only \
  --no-owner \
  --no-privileges \
  > schema.sql

# 匯出特定 schema
pg_dump -h localhost -U username -d database_name \
  -n public \
  --schema-only \
  > public_schema.sql
```

### MySQL Workbench

1. 開啟 MySQL Workbench 並連接到資料庫
2. 選擇 **「Server」** → **「Data Export」**
3. 選擇要匯出的 Schema
4. 在 **「Export Options」**：
   - 選擇 **「Dump Structure Only」**（只匯出結構）
   - Export to: **「Self-Contained File」**
5. **Objects to Export**：
   - ✅ Tables
   - ❌ Stored Procedures（不需要）
   - ❌ Functions（不需要）
   - ❌ Events（不需要）
6. 點擊 **「Start Export」**

### phpMyAdmin

1. 選擇要匯出的資料庫
2. 點擊 **「匯出」** 標籤
3. 選擇 **「自訂」** 匯出方法
4. **格式**：SQL
5. **格式特定選項**：
   - 結構：
     - ✅ Add CREATE TABLE
     - ✅ Add IF NOT EXISTS
     - ❌ Add AUTO_INCREMENT value（取消）
   - 資料：
     - ❌ 取消所有資料選項
6. 點擊 **「執行」**

### DBeaver (通用工具)

1. 右鍵點擊資料庫或表格
2. 選擇 **「Tools」** → **「Generate SQL」** → **「DDL」**
3. 選擇要包含的物件：
   - ✅ Tables
   - ✅ Constraints
   - ✅ Indexes
   - ❌ Data（取消）
4. 點擊 **「Copy」** 或 **「Save」**

### 命令列工具

#### PostgreSQL (pg_dump)
```bash
pg_dump -h localhost -U username -d database_name \
  --schema-only \
  --no-owner \
  --no-acl \
  --no-comments \
  > database_structure.sql
```

#### MySQL (mysqldump)
```bash
mysqldump -h localhost -u username -p database_name \
  --no-data \
  --skip-comments \
  --skip-add-drop-table \
  > database_structure.sql
```

#### SQLite
```bash
# 匯出整個資料庫結構
sqlite3 database.db .schema > schema.sql

# 或使用 .dump 但只要結構
sqlite3 database.db ".dump" | grep -E '^CREATE' > schema.sql
```

## SQL 檔案準備要求

### ✅ 必須包含的元素

1. **CREATE TABLE 語句**
   ```sql
   CREATE TABLE users (
       id SERIAL PRIMARY KEY,
       username VARCHAR(50) NOT NULL,
       email VARCHAR(100) UNIQUE
   );
   ```

2. **主鍵定義**（PRIMARY KEY）
3. **外鍵約束**（FOREIGN KEY）
   ```sql
   ALTER TABLE orders 
   ADD CONSTRAINT fk_user 
   FOREIGN KEY (user_id) REFERENCES users(id);
   ```

4. **資料類型定義**

### ❌ 應該避免的元素

1. **DROP 語句**（會導致錯誤）
   ```sql
   -- 避免這類語句
   DROP TABLE IF EXISTS users;
   ```

2. **INSERT 語句**（資料不需要）
   ```sql
   -- 不需要資料
   INSERT INTO users VALUES (1, 'admin', 'admin@example.com');
   ```

3. **資料庫層級指令**
   ```sql
   -- 避免這些
   CREATE DATABASE mydb;
   USE mydb;
   ```

4. **儲存過程、函數、觸發器**（不支援）

5. **權限相關語句**
   ```sql
   -- 不需要
   GRANT ALL ON TABLE users TO admin;
   ```

### 檔案編碼要求

- **建議編碼**：UTF-8
- **換行符號**：Unix (LF) 或 Windows (CRLF) 皆可
- **檔案大小**：建議小於 10MB（大檔案可能導致瀏覽器效能問題）

## 匯入步驟

### 步驟 1：開啟匯入功能
1. 在 DrawDB 編輯器中
2. 點擊 **「檔案」** 選單
3. 選擇 **「從SQL匯入」**
4. 選擇對應的資料庫類型（MySQL、PostgreSQL 等）

### 步驟 2：上傳 SQL 檔案
1. 拖放 SQL 檔案到上傳區域，或
2. 點擊上傳區域選擇檔案

### 步驟 3：選擇匯入選項
- **覆寫現有圖表**：
  - ✅ 勾選：清空現有圖表，只保留匯入的內容
  - ❌ 不勾選：將匯入的表格附加到現有圖表

### 步驟 4：確認匯入
1. 檢查預覽是否正確
2. 點擊 **「匯入」** 按鈕
3. 等待處理完成

## 常見問題與解決方案

### 問題 1：匯入失敗顯示語法錯誤

**原因**：SQL 檔案包含不支援的語法

**解決方案**：
1. 移除 DROP 語句
2. 移除資料庫層級指令（CREATE DATABASE、USE）
3. 確認選擇正確的資料庫類型

### 問題 2：匯入後看不到關聯線

**原因**：外鍵約束定義不完整或格式不正確

**解決方案**：
確保外鍵定義完整：
```sql
-- 正確的外鍵定義
ALTER TABLE orders 
ADD CONSTRAINT fk_customer_id 
FOREIGN KEY (customer_id) 
REFERENCES customers(id);
```

### 問題 3：資料類型顯示不正確

**原因**：使用了資料庫特定的資料類型

**解決方案**：
- 選擇正確的目標資料庫類型
- 或使用標準 SQL 資料類型

### 問題 4：檔案太大無法上傳

**原因**：瀏覽器記憶體限制

**解決方案**：
1. 只匯出需要的表格
2. 分批匯入（先匯入部分表格）
3. 使用命令列工具過濾不需要的內容：
   ```bash
   # 只保留 CREATE 和 ALTER 語句
   grep -E '^(CREATE|ALTER)' original.sql > filtered.sql
   ```

### 問題 5：中文或特殊字元顯示錯誤

**原因**：檔案編碼問題

**解決方案**：
1. 確保檔案使用 UTF-8 編碼
2. 在匯出時指定編碼：
   ```bash
   # PostgreSQL
   pg_dump --encoding=UTF8 ...
   
   # MySQL
   mysqldump --default-character-set=utf8mb4 ...
   ```

## 範例 SQL 檔案

### PostgreSQL 範例
```sql
-- 用戶表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 文章表
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 評論表
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 標籤表
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- 文章標籤關聯表
CREATE TABLE post_tags (
    post_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, tag_id)
);

-- 添加外鍵約束
ALTER TABLE posts 
ADD CONSTRAINT fk_posts_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE comments 
ADD CONSTRAINT fk_comments_post 
FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

ALTER TABLE comments 
ADD CONSTRAINT fk_comments_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE post_tags 
ADD CONSTRAINT fk_post_tags_post 
FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

ALTER TABLE post_tags 
ADD CONSTRAINT fk_post_tags_tag 
FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;

-- 創建索引
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_published ON posts(published);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
```

### MySQL 範例
```sql
-- 用戶表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 產品表
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    category_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category_id),
    INDEX idx_price (price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 訂單表
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 訂單項目表
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 分類表
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    parent_id INT,
    INDEX idx_parent (parent_id),
    CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 添加產品與分類的外鍵關係
ALTER TABLE products 
ADD CONSTRAINT fk_products_category 
FOREIGN KEY (category_id) REFERENCES categories(id);
```

## 最佳實踐建議

1. **開始前備份**：在匯入前先儲存當前圖表
2. **小批次測試**：先用少量表格測試匯入功能
3. **檢查相容性**：確認 SQL 語法與選擇的資料庫類型匹配
4. **簡化 SQL**：移除不必要的註解、權限語句等
5. **使用版本控制**：將 SQL 檔案納入版本控制系統

## 需要協助？

如果遇到問題：
1. 檢查瀏覽器控制台的錯誤訊息
2. 確認 SQL 檔案符合上述要求
3. 嘗試簡化 SQL 檔案（只保留基本的 CREATE TABLE 和約束）
4. 回報問題到 [GitHub Issues](https://github.com/drawdb-io/drawdb/issues)