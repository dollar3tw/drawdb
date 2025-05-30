const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database/database.cjs');

const app = express();
const PORT = process.env.PORT || 3001;

// 檢查端口是否被佔用
const net = require('net');
const server = net.createServer();

server.listen(PORT, (err) => {
  if (err) {
    console.log(`❌ 端口 ${PORT} 已被佔用，請：`);
    console.log('1. 停止佔用該端口的程式');
    console.log(`2. 或使用其他端口: PORT=3002 npm start`);
    process.exit(1);
  }
  server.close();
  startApp();
});

function startApp() {
  // Middleware
  app.use(cors());
  app.use(express.json());

  // 記錄靜態檔案請求
  app.use(express.static(path.join(__dirname, 'dist'), {
    setHeaders: (res, path) => {
      if (path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.css')) {
        console.log(`📁 靜態檔案請求: GET ${path.replace(__dirname + '/dist', '')}`);
      }
    }
  }));

  // API routes
  const authRoutes = require('./routes/auth.cjs');
  app.use('/api/auth', authRoutes);

  const diagramRoutes = require('./routes/diagrams.cjs');
  app.use('/api/diagrams', diagramRoutes);

  const templateRoutes = require('./routes/templates.cjs');
  app.use('/api/templates', templateRoutes);

  // 所有非 API 路由都返回 index.html (用於 React Router)
  app.get('*', (req, res) => {
    console.log(`📁 靜態檔案請求: GET ${req.path}`);
    // 如果是 API 路由，返回 404
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }
    // 否則返回前端應用
    res.sendFile(path.join(__dirname, 'dist/index.html'));
  });

  // 定期清理過期會話（每小時執行一次）
  setInterval(async () => {
    try {
      const deletedSessions = await db.deleteExpiredSessions();
      if (deletedSessions > 0) {
        console.log(`🧹 清理了 ${deletedSessions} 個過期會話`);
      }
    } catch (error) {
      console.error('清理過期會話時發生錯誤:', error);
    }
  }, 60 * 60 * 1000); // 1 hour

  // Start the server
  app.listen(PORT, () => {
    console.log('🎉 ================================');
    console.log('🚀 DrawDB 整合式服務已啟動！');
    console.log('🎉 ================================');
    console.log(`📱 網站地址: http://localhost:${PORT}`);
    console.log(`🔗 API 服務: http://localhost:${PORT}/api`);
    console.log(`💾 資料庫: SQLite (database/drawdb.sqlite)`);
    console.log(`🌍 環境: ${process.env.NODE_ENV || 'development'}`);
    console.log('🎉 ================================');
    console.log('✨ 所有人都可以透過網址存取此服務！');
    console.log('🎉 ================================');
  });

  // Initialize database
  db.initDb((err) => {
    if (err) {
      console.error("❌ 資料庫初始化失敗:", err);
      process.exit(1);
    } else {
      console.log("✅ 資料庫初始化成功");
    }
  });
}
