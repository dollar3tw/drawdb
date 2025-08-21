const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 新密碼（您可以修改這個密碼）
const NEW_PASSWORD = 'Admin@2024';

// 資料庫路徑
const DB_PATH = path.join(__dirname, 'drawdb.sqlite');

async function resetAdminPassword() {
  try {
    // 生成加密密碼
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, saltRounds);
    
    console.log('正在重設 admin 密碼...');
    console.log('新密碼將設為:', NEW_PASSWORD);
    
    // 連接資料庫
    const db = new sqlite3.Database(DB_PATH);
    
    // 更新 admin 密碼
    db.run(
      `UPDATE users SET password = ? WHERE username = 'admin'`,
      [hashedPassword],
      function(err) {
        if (err) {
          console.error('❌ 更新密碼失敗:', err.message);
          db.close();
          return;
        }
        
        if (this.changes === 0) {
          console.error('❌ 找不到 admin 用戶');
          
          // 如果沒有 admin 用戶，創建一個
          console.log('正在創建新的 admin 用戶...');
          db.run(
            `INSERT INTO users (username, email, password, role, auth_source) 
             VALUES ('admin', 'admin@ddb.local', ?, 'admin', 'LocalDB')`,
            [hashedPassword],
            function(createErr) {
              if (createErr) {
                console.error('❌ 創建 admin 用戶失敗:', createErr.message);
              } else {
                console.log('✅ 成功創建 admin 用戶');
                console.log('用戶名: admin');
                console.log('密碼:', NEW_PASSWORD);
                console.log('角色: admin (最高管理者)');
                console.log('請立即使用新密碼登入並修改密碼！');
              }
              db.close();
            }
          );
        } else {
          console.log('✅ admin 密碼已成功重設');
          console.log('');
          console.log('========================================');
          console.log('登入資訊：');
          console.log('用戶名: admin');
          console.log('密碼:', NEW_PASSWORD);
          console.log('角色: admin (最高管理者)');
          console.log('========================================');
          console.log('');
          console.log('⚠️  安全提醒：請立即登入並修改此預設密碼！');
          db.close();
        }
      }
    );
    
  } catch (error) {
    console.error('❌ 錯誤:', error.message);
  }
}

// 執行重設密碼
resetAdminPassword();