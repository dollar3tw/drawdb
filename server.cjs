require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
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
  app.use(cors({
    origin: true,
    credentials: true
  }));
  // 增加請求大小限制（預設是 100kb，改為 50mb）
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  
  // Session middleware for SSO
  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true, // 改為 true 以確保 session 被創建
    cookie: {
      secure: false, // 開發環境設為 false
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax' // 允許跨站點重定向
    },
    name: 'drawdb.sid' // 自定義 session 名稱
  }));

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
  
  const permissionRoutes = require('./routes/permissions.cjs');
  app.use('/api/diagrams', permissionRoutes);
  
  // SSO routes
  const ssoRoutes = require('./routes/sso.cjs');
  app.use('/sso', ssoRoutes);
  
  // Users routes
  const usersRoutes = require('./routes/users.cjs');
  app.use('/api/users', usersRoutes);

  // 所有非 API 路由都返回 index.html (用於 React Router)
  app.get('*', (req, res) => {
    console.log(`📁 靜態檔案請求: GET ${req.path}`);
    // 如果是 API 路由或 SSO 路由，返回 404
    if (req.path.startsWith('/api/') || req.path.startsWith('/sso/')) {
      return res.status(404).json({ message: 'Endpoint not found' });
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
    console.log('🚀 MiTDB 整合式服務已啟動！');
    console.log('🎉 ================================');
    console.log(`📱 網站地址: http://localhost:${PORT}`);
    console.log(`🔗 API 服務: http://localhost:${PORT}/api`);
    console.log(`💾 資料庫: SQLite (database/mitdb.sqlite)`);
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
