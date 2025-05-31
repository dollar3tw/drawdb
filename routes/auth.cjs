const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();
const dbHelpers = require('../database/database.cjs');
const { authenticateToken, requireMitAdmin, JWT_SECRET } = require('../middleware/auth.cjs');

// 用戶註冊
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role = 'user' } = req.body;

    // 驗證必填欄位
    if (!username || !email || !password) {
      return res.status(400).json({ error: '用戶名、電子郵件和密碼為必填項' });
    }

    // 檢查用戶名是否已存在
    const existingUserByUsername = await dbHelpers.getUserByUsername(username);
    if (existingUserByUsername) {
      return res.status(409).json({ error: '用戶名已存在' });
    }

    // 檢查電子郵件是否已存在
    const existingUserByEmail = await dbHelpers.getUserByEmail(email);
    if (existingUserByEmail) {
      return res.status(409).json({ error: '電子郵件已被使用' });
    }

    // 密碼加密
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 創建用戶
    const newUser = await dbHelpers.createUser({
      username,
      email,
      password: hashedPassword,
      role
    });

    res.status(201).json({
      message: '用戶註冊成功',
      user: newUser
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: '註冊失敗' });
  }
});

// 用戶登入
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用戶名和密碼為必填項' });
    }

    // 查找用戶
    const user = await dbHelpers.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: '用戶名或密碼錯誤' });
    }

    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: '用戶名或密碼錯誤' });
    }

    // 生成 JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 創建會話記錄
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 7); // 7天後過期
    
    await dbHelpers.createSession(user.id, token, expiresAt.toISOString());

    // 更新最後登入時間
    await dbHelpers.updateUser(user.id, { 
      lastLogin: now.toISOString() 
    });

    // 移除密碼後返回用戶資訊
    delete user.password;

    res.json({
      message: '登入成功',
      token,
      user
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登入失敗' });
  }
});

// 用戶登出
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      await dbHelpers.deleteSession(token);
    }

    res.json({ message: '登出成功' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: '登出失敗' });
  }
});

// 獲取當前用戶資訊
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbHelpers.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    delete user.password;
    res.json({ user });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ error: '獲取用戶資訊失敗' });
  }
});

// 更新用戶資訊
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // 如果要更新密碼，需要驗證當前密碼
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: '更新密碼需要提供當前密碼' });
      }

      const user = await dbHelpers.getUserById(userId);
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      
      if (!isCurrentPasswordValid) {
        return res.status(401).json({ error: '當前密碼錯誤' });
      }
    }

    const updateData = {};
    
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (newPassword) {
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await dbHelpers.updateUser(userId, updateData);
    
    if (!updatedUser) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    res.json({
      message: '用戶資訊更新成功',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: '更新用戶資訊失敗' });
  }
});

// 管理員功能：獲取所有用戶
router.get('/users', authenticateToken, requireMitAdmin, async (req, res) => {
  try {
    const users = await dbHelpers.getAllUsers();
    res.json({ users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: '獲取用戶列表失敗' });
  }
});

// 管理員功能：更新用戶角色
router.put('/users/:id/role', authenticateToken, requireMitAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['mitadmin', 'editor', 'user'].includes(role)) {
      return res.status(400).json({ error: '無效的角色' });
    }

    const updatedUser = await dbHelpers.updateUser(id, { role });
    
    if (!updatedUser) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    res.json({
      message: '用戶角色更新成功',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: '更新用戶角色失敗' });
  }
});

// 管理員功能：刪除用戶
router.delete('/users/:id', authenticateToken, requireMitAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 防止刪除自己
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: '不能刪除自己的帳號' });
    }

    const changes = await dbHelpers.deleteUser(id);
    
    if (changes === 0) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    res.json({ message: '用戶刪除成功' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: '刪除用戶失敗' });
  }
});

module.exports = router; 