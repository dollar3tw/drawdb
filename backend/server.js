const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database/database'); // We'll create this next

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// 提供前端靜態檔案
app.use(express.static(path.join(__dirname, '../dist')));

// API routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const diagramRoutes = require('./routes/diagrams');
app.use('/api/diagrams', diagramRoutes);

const templateRoutes = require('./routes/templates');
app.use('/api/templates', templateRoutes);

// 所有非 API 路由都返回 index.html (用於 React Router)
app.get('*', (req, res) => {
  // 如果是 API 路由，返回 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }
  // 否則返回前端應用
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// 定期清理過期會話（每小時執行一次）
setInterval(async () => {
  try {
    const deletedSessions = await db.deleteExpiredSessions();
    if (deletedSessions > 0) {
      console.log(`Cleaned up ${deletedSessions} expired sessions`);
    }
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
  }
}, 60 * 60 * 1000); // 1 hour

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 DrawDB 服務已啟動！`);
  console.log(`📱 前端網站: http://localhost:${PORT}`);
  console.log(`🔗 API 服務: http://localhost:${PORT}/api`);
  console.log(`💾 資料庫: SQLite (backend/drawdb.sqlite)`);
});

// Initialize database
db.initDb((err) => {
  if (err) {
    console.error("Failed to initialize database:", err);
    process.exit(1); // Exit if DB initialization fails
  } else {
    console.log("Database initialized successfully.");
  }
});
