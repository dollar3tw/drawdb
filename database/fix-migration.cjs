const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'drawdb.sqlite');

// 修復遷移問題的腳本
async function fixMigration() {
  const db = new sqlite3.Database(DB_PATH);
  
  console.log('開始修復遷移問題...');
  
  db.serialize(() => {
    // 1. 檢查是否有 users_new 表
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users_new'", (err, row) => {
      if (err) {
        console.error('Error checking for users_new table:', err);
        return;
      }
      
      if (row) {
        console.log('發現 users_new 表，刪除它...');
        db.run('DROP TABLE IF EXISTS users_new', (err) => {
          if (err) {
            console.error('Error dropping users_new table:', err);
          } else {
            console.log('已刪除 users_new 表');
          }
        });
      }
    });
    
    // 2. 檢查 diagram_permissions 表是否存在
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='diagram_permissions'", (err, row) => {
      if (err) {
        console.error('Error checking for diagram_permissions table:', err);
        return;
      }
      
      if (row) {
        console.log('diagram_permissions 表已存在');
        
        // 檢查是否需要為現有圖表創建權限
        db.run(`
          INSERT OR IGNORE INTO diagram_permissions (diagram_id, user_id, permission_type)
          SELECT id, userId, 'owner' FROM diagrams WHERE userId IS NOT NULL
        `, (err) => {
          if (err) {
            console.error('Error creating owner permissions:', err);
          } else {
            console.log('確保所有圖表都有擁有者權限');
          }
        });
      }
    });
    
    // 3. 刪除遷移記錄，以便重新執行
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'", (err, row) => {
      if (err) {
        console.error('Error checking for migrations table:', err);
        return;
      }
      
      if (row) {
        db.run("DELETE FROM migrations WHERE filename = '001_add_permission_system.cjs'", (err) => {
          if (err) {
            console.error('Error deleting migration record:', err);
          } else {
            console.log('已刪除遷移記錄，可以重新執行遷移');
          }
        });
      }
    });
    
    setTimeout(() => {
      console.log('修復完成！現在可以重新執行 npm run migrate');
      db.close();
    }, 2000);
  });
}

fixMigration();