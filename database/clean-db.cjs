#!/usr/bin/env node

/**
 * 資料庫清理腳本
 * 用於清理過多的修訂歷史和測試資料
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const readline = require('readline');

const DB_PATH = path.join(__dirname, '..', 'drawdb.sqlite');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function cleanDatabase() {
  const db = new sqlite3.Database(DB_PATH);
  
  console.log('🔍 分析資料庫...\n');
  
  // 顯示目前狀態
  await new Promise((resolve) => {
    db.all(`
      SELECT 
        (SELECT COUNT(*) FROM diagrams) as diagrams_count,
        (SELECT COUNT(*) FROM revision_history) as revisions_count,
        (SELECT COUNT(*) FROM users) as users_count,
        (SELECT COUNT(*) FROM templates) as templates_count
    `, (err, rows) => {
      if (err) {
        console.error('Error:', err);
        return;
      }
      const stats = rows[0];
      console.log('📊 目前資料庫狀態：');
      console.log(`  - 圖表數量: ${stats.diagrams_count}`);
      console.log(`  - 修訂歷史: ${stats.revisions_count}`);
      console.log(`  - 使用者數: ${stats.users_count}`);
      console.log(`  - 模板數量: ${stats.templates_count}`);
      console.log('');
      resolve();
    });
  });
  
  // 顯示大型圖表
  await new Promise((resolve) => {
    db.all(`
      SELECT id, name, 
        LENGTH(tables) + LENGTH(relationships) + LENGTH(notes) + LENGTH(areas) as total_size
      FROM diagrams 
      WHERE total_size > 100000
      ORDER BY total_size DESC
    `, (err, rows) => {
      if (err) {
        console.error('Error:', err);
        return;
      }
      if (rows.length > 0) {
        console.log('⚠️  發現大型圖表（> 100KB）：');
        rows.forEach(row => {
          console.log(`  - [ID: ${row.id}] ${row.name}: ${(row.total_size / 1024).toFixed(2)} KB`);
        });
        console.log('');
      }
      resolve();
    });
  });
  
  console.log('🧹 清理選項：');
  console.log('1. 保留每個圖表最新 10 筆修訂歷史');
  console.log('2. 刪除所有修訂歷史');
  console.log('3. 刪除測試圖表（untitled_diagram）');
  console.log('4. 完整清理（選項 1 + 3）');
  console.log('5. 重置為空資料庫（刪除所有資料）');
  console.log('0. 取消');
  
  const choice = await question('\n請選擇清理選項 (0-5): ');
  
  switch (choice) {
    case '1':
      // 保留最新 10 筆修訂
      await new Promise((resolve) => {
        db.run(`
          DELETE FROM revision_history 
          WHERE id NOT IN (
            SELECT id FROM (
              SELECT id, diagram_id,
                ROW_NUMBER() OVER (PARTITION BY diagram_id ORDER BY created_at DESC) as rn
              FROM revision_history
            ) WHERE rn <= 10
          )
        `, function(err) {
          if (err) {
            console.error('Error:', err);
          } else {
            console.log(`✅ 已刪除 ${this.changes} 筆舊的修訂歷史`);
          }
          resolve();
        });
      });
      break;
      
    case '2':
      // 刪除所有修訂歷史
      await new Promise((resolve) => {
        db.run(`DELETE FROM revision_history`, function(err) {
          if (err) {
            console.error('Error:', err);
          } else {
            console.log(`✅ 已刪除 ${this.changes} 筆修訂歷史`);
          }
          resolve();
        });
      });
      break;
      
    case '3':
      // 刪除測試圖表
      await new Promise((resolve) => {
        db.run(`
          DELETE FROM diagrams 
          WHERE name LIKE 'untitled_diagram%' 
          OR name IN ('AAAAAAAA', 'test', 'Test')
        `, function(err) {
          if (err) {
            console.error('Error:', err);
          } else {
            console.log(`✅ 已刪除 ${this.changes} 個測試圖表`);
          }
          resolve();
        });
      });
      break;
      
    case '4':
      // 完整清理
      await new Promise((resolve) => {
        db.serialize(() => {
          // 刪除測試圖表
          db.run(`
            DELETE FROM diagrams 
            WHERE name LIKE 'untitled_diagram%' 
            OR name IN ('AAAAAAAA', 'test', 'Test')
          `, function(err) {
            if (!err) {
              console.log(`✅ 已刪除 ${this.changes} 個測試圖表`);
            }
          });
          
          // 保留最新 10 筆修訂
          db.run(`
            DELETE FROM revision_history 
            WHERE id NOT IN (
              SELECT id FROM (
                SELECT id, diagram_id,
                  ROW_NUMBER() OVER (PARTITION BY diagram_id ORDER BY created_at DESC) as rn
                FROM revision_history
              ) WHERE rn <= 10
            )
          `, function(err) {
            if (!err) {
              console.log(`✅ 已刪除 ${this.changes} 筆舊的修訂歷史`);
            }
            resolve();
          });
        });
      });
      break;
      
    case '5':
      const confirm = await question('⚠️  確定要刪除所有資料嗎？這個操作無法復原！(yes/no): ');
      if (confirm.toLowerCase() === 'yes') {
        await new Promise((resolve) => {
          db.serialize(() => {
            db.run(`DELETE FROM revision_history`);
            db.run(`DELETE FROM diagram_permissions`);
            db.run(`DELETE FROM collaboration_history`);
            db.run(`DELETE FROM diagrams`);
            db.run(`DELETE FROM templates`);
            db.run(`DELETE FROM user_sessions`);
            // 保留 admin 使用者
            db.run(`DELETE FROM users WHERE username != 'admin'`, function(err) {
              if (!err) {
                console.log('✅ 已重置資料庫（保留 admin 使用者）');
              }
              resolve();
            });
          });
        });
      } else {
        console.log('❌ 操作已取消');
      }
      break;
      
    default:
      console.log('❌ 操作已取消');
      rl.close();
      db.close();
      return;
  }
  
  // 執行 VACUUM 壓縮資料庫
  console.log('\n🗜️  正在壓縮資料庫...');
  await new Promise((resolve) => {
    db.run('VACUUM', (err) => {
      if (err) {
        console.error('Error during VACUUM:', err);
      } else {
        console.log('✅ 資料庫壓縮完成');
      }
      resolve();
    });
  });
  
  rl.close();
  db.close();
  
  console.log('\n✨ 清理完成！');
}

cleanDatabase().catch(console.error);