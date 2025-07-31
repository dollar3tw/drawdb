const express = require('express');
const router = express.Router();
const { authenticateToken, requireRoot } = require('../middleware/auth.cjs');
const { checkDiagramPermission, requireManagePermission, logCollaborationHistory } = require('../middleware/permissions.cjs');
const db = require('../database/database.cjs');

// GET /api/diagrams/:id/permissions - 獲取圖表的權限列表
router.get('/:id/permissions', authenticateToken, checkDiagramPermission, async (req, res) => {
  try {
    const { id } = req.params;
    
    const permissions = await db.getDiagramPermissions(id);
    res.json({ permissions });
    
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: '獲取權限列表失敗' });
  }
});

// POST /api/diagrams/:id/permissions - 授予權限
router.post('/:id/permissions', authenticateToken, checkDiagramPermission, requireManagePermission, logCollaborationHistory('grant_permission', 'permission'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, permissionType } = req.body;
    
    // 驗證參數
    if (!userId || !permissionType) {
      return res.status(400).json({ error: '缺少必要參數' });
    }
    
    if (!['viewer', 'editor'].includes(permissionType)) {
      return res.status(400).json({ error: '無效的權限類型' });
    }
    
    // 檢查使用者是否存在
    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: '使用者不存在' });
    }
    
    // 檢查是否已有權限
    const existingPermission = await db.getDiagramPermission(id, userId);
    if (existingPermission) {
      // 更新現有權限
      await db.updateDiagramPermission(id, userId, permissionType);
    } else {
      // 創建新權限
      await db.createDiagramPermission(id, userId, permissionType, req.user.id);
    }
    
    res.json({ 
      message: '權限授予成功',
      userId,
      permissionType 
    });
    
  } catch (error) {
    console.error('Grant permission error:', error);
    res.status(500).json({ error: '授予權限失敗' });
  }
});

// DELETE /api/diagrams/:id/permissions/:userId - 撤銷權限
router.delete('/:id/permissions/:userId', authenticateToken, checkDiagramPermission, requireManagePermission, logCollaborationHistory('revoke_permission', 'permission'), async (req, res) => {
  try {
    const { id, userId } = req.params;
    
    // 不能撤銷擁有者權限
    const permission = await db.getDiagramPermission(id, userId);
    if (!permission) {
      return res.status(404).json({ error: '權限不存在' });
    }
    
    if (permission.permission_type === 'owner') {
      return res.status(400).json({ error: '不能撤銷擁有者權限' });
    }
    
    const changes = await db.deleteDiagramPermission(id, userId);
    
    if (changes > 0) {
      res.json({ message: '權限撤銷成功' });
    } else {
      res.status(404).json({ error: '權限不存在' });
    }
    
  } catch (error) {
    console.error('Revoke permission error:', error);
    res.status(500).json({ error: '撤銷權限失敗' });
  }
});

// PUT /api/diagrams/:id/promote - Root 提升圖表為共編狀態
router.put('/:id/promote', authenticateToken, requireRoot, logCollaborationHistory('promote', 'diagram'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // 檢查圖表是否存在
    const diagram = await db.getDiagramById(id);
    if (!diagram) {
      return res.status(404).json({ error: '圖表不存在' });
    }
    
    // 檢查是否已經是共編狀態
    if (diagram.is_collaborative) {
      return res.status(400).json({ error: '圖表已經是共編狀態' });
    }
    
    // 提升為共編狀態
    await db.promoteDiagramToCollaborative(id, req.user.id);
    
    res.json({ 
      message: '圖表已提升為共編狀態',
      diagramId: id
    });
    
  } catch (error) {
    console.error('Promote diagram error:', error);
    res.status(500).json({ error: '提升圖表失敗' });
  }
});

// GET /api/diagrams/:id/collaboration-history - 獲取共編歷史
router.get('/:id/collaboration-history', authenticateToken, checkDiagramPermission, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100 } = req.query;
    
    const history = await db.getCollaborationHistory(id, parseInt(limit));
    
    res.json({ history });
    
  } catch (error) {
    console.error('Get collaboration history error:', error);
    res.status(500).json({ error: '獲取共編歷史失敗' });
  }
});

// GET /api/users/:userId/collaboration-history - 獲取使用者的共編歷史
router.get('/users/:userId/collaboration-history', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 只有本人或 root 可以查看
    if (req.user.id !== parseInt(userId) && req.user.role !== 'root') {
      return res.status(403).json({ error: '無權限查看此使用者的共編歷史' });
    }
    
    // 這裡需要實作一個新的資料庫函數來獲取特定使用者的共編歷史
    const sql = `
      SELECT ch.*, d.name as diagram_name
      FROM collaboration_history ch
      JOIN diagrams d ON ch.diagram_id = d.id
      WHERE ch.user_id = ?
      ORDER BY ch.timestamp DESC
      LIMIT 100
    `;
    
    db.db.all(sql, [userId], (err, rows) => {
      if (err) {
        console.error('Get user collaboration history error:', err);
        return res.status(500).json({ error: '獲取使用者共編歷史失敗' });
      }
      
      // Parse changes JSON
      rows.forEach(row => {
        try {
          row.changes = JSON.parse(row.changes);
        } catch (e) {
          row.changes = {};
        }
      });
      
      res.json({ history: rows });
    });
    
  } catch (error) {
    console.error('Get user collaboration history error:', error);
    res.status(500).json({ error: '獲取使用者共編歷史失敗' });
  }
});

module.exports = router;