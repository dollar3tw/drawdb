const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 資料庫遷移腳本 - 新增權限管理系統
async function up(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('Starting permission system migration...');
      
      // 1. 修改 users 表
      db.run(`ALTER TABLE users ADD COLUMN auth_source TEXT DEFAULT 'LocalDB' CHECK (auth_source IN ('LocalDB', 'SSO', 'LDAP'))`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding auth_source column:', err);
          return reject(err);
        }
        console.log('Added auth_source column to users table');
      });
      
      db.run(`ALTER TABLE users ADD COLUMN display_name TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding display_name column:', err);
          return reject(err);
        }
        console.log('Added display_name column to users table');
      });
      
      db.run(`ALTER TABLE users ADD COLUMN sso_id TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding sso_id column:', err);
          return reject(err);
        }
        console.log('Added sso_id column to users table');
      });
      
      // 2. 暫時不在這裡更新，等新表建立後再更新
      
      // 3. 創建新的 users 表以更新約束（SQLite 不支援直接修改約束）
      db.run(`
        CREATE TABLE IF NOT EXISTS users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('root', 'editor', 'user')),
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          lastLogin DATETIME,
          isActive INTEGER DEFAULT 1,
          auth_source TEXT DEFAULT 'LocalDB' CHECK (auth_source IN ('LocalDB', 'SSO', 'LDAP')),
          display_name TEXT,
          sso_id TEXT
        )
      `, (err) => {
        if (err) {
          console.error('Error creating new users table:', err);
          return reject(err);
        }
        console.log('Created new users table with updated constraints');
      });
      
      // 4. 複製資料到新表，同時將 mitadmin 改為 root
      db.run(`
        INSERT INTO users_new (id, username, email, password, role, createdAt, lastLogin, isActive, auth_source, display_name, sso_id)
        SELECT id, username, email, password, 
               CASE WHEN role = 'mitadmin' THEN 'root' ELSE role END as role,
               createdAt, lastLogin, isActive, 
               COALESCE(auth_source, 'LocalDB'), display_name, sso_id
        FROM users
      `, (err) => {
        if (err) {
          console.error('Error copying data to new users table:', err);
          return reject(err);
        }
        console.log('Copied data to new users table and updated mitadmin to root');
      });
      
      // 5. 刪除舊表並重命名新表
      db.run(`DROP TABLE users`, (err) => {
        if (err) {
          console.error('Error dropping old users table:', err);
          return reject(err);
        }
      });
      
      db.run(`ALTER TABLE users_new RENAME TO users`, (err) => {
        if (err) {
          console.error('Error renaming users table:', err);
          return reject(err);
        }
        console.log('Successfully updated users table');
      });
      
      // 6. 創建 diagram_permissions 表
      db.run(`
        CREATE TABLE IF NOT EXISTS diagram_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          diagram_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          permission_type TEXT NOT NULL CHECK (permission_type IN ('owner', 'editor', 'viewer')),
          granted_by INTEGER,
          granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (granted_by) REFERENCES users(id),
          UNIQUE(diagram_id, user_id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating diagram_permissions table:', err);
          return reject(err);
        }
        console.log('Created diagram_permissions table');
      });
      
      // 7. 創建 collaboration_history 表
      db.run(`
        CREATE TABLE IF NOT EXISTS collaboration_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          diagram_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'grant_permission', 'revoke_permission')),
          target_type TEXT NOT NULL,
          target_id TEXT,
          changes TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating collaboration_history table:', err);
          return reject(err);
        }
        console.log('Created collaboration_history table');
      });
      
      // 8. 創建索引
      db.run(`CREATE INDEX IF NOT EXISTS idx_collab_history_diagram ON collaboration_history(diagram_id, timestamp DESC)`, (err) => {
        if (err) {
          console.error('Error creating index:', err);
        }
      });
      
      db.run(`CREATE INDEX IF NOT EXISTS idx_collab_history_user ON collaboration_history(user_id, timestamp DESC)`, (err) => {
        if (err) {
          console.error('Error creating index:', err);
        }
      });
      
      // 9. 修改 diagrams 表
      db.run(`ALTER TABLE diagrams ADD COLUMN is_collaborative INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding is_collaborative column:', err);
        }
      });
      
      db.run(`ALTER TABLE diagrams ADD COLUMN promoted_by INTEGER`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding promoted_by column:', err);
        }
      });
      
      db.run(`ALTER TABLE diagrams ADD COLUMN promoted_at DATETIME`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding promoted_at column:', err);
        }
      });
      
      // 10. 為現有圖表創建擁有者權限記錄
      db.run(`
        INSERT INTO diagram_permissions (diagram_id, user_id, permission_type)
        SELECT id, userId, 'owner' FROM diagrams WHERE userId IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM diagram_permissions 
          WHERE diagram_id = diagrams.id AND user_id = diagrams.userId
        )
      `, (err) => {
        if (err) {
          console.error('Error creating owner permissions:', err);
        } else {
          console.log('Created owner permissions for existing diagrams');
        }
      });
      
      console.log('Permission system migration completed successfully');
      resolve();
    });
  });
}

// 回滾函數
async function down(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('Rolling back permission system migration...');
      
      // 刪除新增的表
      db.run(`DROP TABLE IF EXISTS diagram_permissions`);
      db.run(`DROP TABLE IF EXISTS collaboration_history`);
      
      // 恢復 users 表（這裡簡化處理，實際應該保存原始結構）
      db.run(`UPDATE users SET role = 'mitadmin' WHERE role = 'root'`);
      
      console.log('Rollback completed');
      resolve();
    });
  });
}

module.exports = { up, down };