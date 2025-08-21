const express = require('express');
const router = express.Router();
const { authenticateToken, requireRoot } = require('../middleware/auth.cjs');
const db = require('../database/database.cjs');

// GET /api/users/search - 搜尋使用者（通過 email）
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: '請提供 email 參數' });
    }
    
    const user = await db.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ error: '找不到使用者' });
    }
    
    // 只返回基本資訊
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      display_name: user.display_name
    });
    
  } catch (error) {
    console.error('Search user error:', error);
    res.status(500).json({ error: '搜尋使用者失敗' });
  }
});

// GET /api/users - 獲取所有使用者（僅 root）
router.get('/', authenticateToken, requireRoot, async (req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: '獲取使用者列表失敗' });
  }
});

// GET /api/users/:id - 獲取特定使用者資訊
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 只有本人或 admin 可以查看詳細資訊
    if (req.user.id !== parseInt(id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: '無權限查看此使用者資訊' });
    }
    
    const user = await db.getUserById(id);
    
    if (!user) {
      return res.status(404).json({ error: '使用者不存在' });
    }
    
    // 移除敏感資訊
    delete user.password;
    
    res.json(user);
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: '獲取使用者資訊失敗' });
  }
});

module.exports = router;