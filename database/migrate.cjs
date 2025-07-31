const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'drawdb.sqlite');

// 創建遷移記錄表
function createMigrationTable(db) {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT UNIQUE NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// 獲取已執行的遷移
function getExecutedMigrations(db) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT filename FROM migrations ORDER BY id`, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows.map(row => row.filename));
      }
    });
  });
}

// 記錄遷移執行
function recordMigration(db, filename) {
  return new Promise((resolve, reject) => {
    db.run(`INSERT INTO migrations (filename) VALUES (?)`, [filename], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// 執行遷移
async function runMigrations() {
  const db = new sqlite3.Database(DB_PATH);
  
  try {
    // 創建遷移記錄表
    await createMigrationTable(db);
    
    // 獲取已執行的遷移
    const executedMigrations = await getExecutedMigrations(db);
    
    // 獲取所有遷移文件
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found');
      return;
    }
    
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.cjs'))
      .sort(); // 按文件名排序確保執行順序
    
    // 執行尚未執行的遷移
    for (const file of migrationFiles) {
      if (!executedMigrations.includes(file)) {
        console.log(`\nExecuting migration: ${file}`);
        
        try {
          const migration = require(path.join(migrationsDir, file));
          
          if (migration.up) {
            await migration.up(db);
            await recordMigration(db, file);
            console.log(`Migration ${file} completed successfully`);
          } else {
            console.log(`Migration ${file} does not have an 'up' function`);
          }
        } catch (error) {
          console.error(`Error executing migration ${file}:`, error);
          throw error;
        }
      } else {
        console.log(`Migration ${file} already executed, skipping...`);
      }
    }
    
    console.log('\nAll migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// 回滾最後一個遷移
async function rollbackLastMigration() {
  const db = new sqlite3.Database(DB_PATH);
  
  try {
    const executedMigrations = await getExecutedMigrations(db);
    
    if (executedMigrations.length === 0) {
      console.log('No migrations to rollback');
      return;
    }
    
    const lastMigration = executedMigrations[executedMigrations.length - 1];
    console.log(`Rolling back migration: ${lastMigration}`);
    
    const migrationsDir = path.join(__dirname, 'migrations');
    const migration = require(path.join(migrationsDir, lastMigration));
    
    if (migration.down) {
      await migration.down(db);
      
      // 刪除遷移記錄
      await new Promise((resolve, reject) => {
        db.run(`DELETE FROM migrations WHERE filename = ?`, [lastMigration], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      console.log(`Rollback of ${lastMigration} completed successfully`);
    } else {
      console.log(`Migration ${lastMigration} does not have a 'down' function`);
    }
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// 命令行參數處理
const command = process.argv[2];

if (command === 'rollback') {
  rollbackLastMigration();
} else {
  runMigrations();
}

module.exports = { runMigrations, rollbackLastMigration };