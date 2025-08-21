const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 資料庫路徑
const DB_PATH = path.join(__dirname, 'drawdb.sqlite');

console.log('開始遷移：將 root 角色改為 admin...');

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  // 開始交易
  db.run('BEGIN TRANSACTION', (err) => {
    if (err) {
      console.error('❌ 無法開始交易:', err.message);
      return;
    }
    
    console.log('✅ 開始交易');
    
    // 步驟 1: 創建新的 users 表（包含新的約束）
    db.run(`CREATE TABLE IF NOT EXISTS users_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'editor', 'user')),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      lastLogin DATETIME,
      isActive INTEGER DEFAULT 1,
      auth_source TEXT DEFAULT 'LocalDB' CHECK (auth_source IN ('LocalDB', 'SSO', 'LDAP')),
      display_name TEXT,
      sso_id TEXT
    )`, (err) => {
      if (err) {
        console.error('❌ 創建新表失敗:', err.message);
        db.run('ROLLBACK');
        return;
      }
      console.log('✅ 創建新的 users_new 表');
      
      // 步驟 2: 複製資料到新表，同時將 root 改為 admin
      db.run(`INSERT INTO users_new (id, username, email, password, role, createdAt, lastLogin, isActive, auth_source, display_name, sso_id)
        SELECT 
          id, 
          username, 
          email, 
          password, 
          CASE WHEN role = 'root' THEN 'admin' ELSE role END as role,
          createdAt,
          lastLogin,
          isActive,
          auth_source,
          display_name,
          sso_id
        FROM users`, function(err) {
        if (err) {
          console.error('❌ 複製資料失敗:', err.message);
          db.run('ROLLBACK');
          return;
        }
        console.log(`✅ 已複製 ${this.changes} 筆資料到新表，並將 root 改為 admin`);
        
        // 步驟 3: 刪除舊表
        db.run('DROP TABLE users', (err) => {
          if (err) {
            console.error('❌ 刪除舊表失敗:', err.message);
            db.run('ROLLBACK');
            return;
          }
          console.log('✅ 已刪除舊的 users 表');
          
          // 步驟 4: 重命名新表
          db.run('ALTER TABLE users_new RENAME TO users', (err) => {
            if (err) {
              console.error('❌ 重命名新表失敗:', err.message);
              db.run('ROLLBACK');
              return;
            }
            console.log('✅ 已重命名 users_new 為 users');
            
            // 提交交易
            db.run('COMMIT', (err) => {
              if (err) {
                console.error('❌ 提交交易失敗:', err.message);
                return;
              }
              console.log('✅ 交易成功提交');
              console.log('========================================');
              console.log('資料庫遷移完成！');
              console.log('角色 "root" 已成功改為 "admin"');
              console.log('========================================');
              
              // 顯示更新後的用戶
              db.all('SELECT id, username, role FROM users', (err, rows) => {
                if (!err && rows) {
                  console.log('\n所有用戶列表:');
                  rows.forEach(row => {
                    console.log(`  - ${row.username} (ID: ${row.id}, Role: ${row.role})`);
                  });
                }
                db.close();
              });
            });
          });
        });
      });
    });
  });
});