const jwt = require('jsonwebtoken');
const { getSessionByToken } = require('../database/database.cjs');

const JWT_SECRET = process.env.JWT_SECRET || 'drawdb-mit-secret-key-2024';

// 驗證用戶是否已登入
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: '需要認證令牌' });
    }

    // 驗證 JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 檢查會話是否仍然有效
    const session = await getSessionByToken(token);
    if (!session) {
      return res.status(401).json({ error: '會話已過期或無效' });
    }

    // 將用戶資訊添加到請求對象
    req.user = {
      id: session.userId,
      username: session.username,
      email: session.email,
      role: session.role
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ error: '無效的認證令牌' });
  }
};

// 檢查用戶角色權限
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '需要認證' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '權限不足' });
    }

    next();
  };
};

// 檢查是否為 mitadmin
const requireMitAdmin = requireRole(['mitadmin']);

// 檢查是否為編輯者或以上權限
const requireEditor = requireRole(['mitadmin', 'editor']);

// 可選的認證中間件（不強制要求登入）
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const session = await getSessionByToken(token);
      
      if (session) {
        req.user = {
          id: session.userId,
          username: session.username,
          email: session.email,
          role: session.role
        };
      }
    }

    next();
  } catch (error) {
    // 如果認證失敗，繼續執行但不設置 req.user
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireMitAdmin,
  requireEditor,
  optionalAuth,
  JWT_SECRET
}; 