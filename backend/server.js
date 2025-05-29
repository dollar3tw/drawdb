const express = require('express');
const cors = require('cors');
const db = require('./database/database'); // We'll create this next

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'DrawDB backend is running!' });
});

// API routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const diagramRoutes = require('./routes/diagrams');
app.use('/api/diagrams', diagramRoutes);

const templateRoutes = require('./routes/templates');
app.use('/api/templates', templateRoutes);

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
  console.log(`Server is running on http://localhost:${PORT}`);
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
