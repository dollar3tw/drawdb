const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth, requireRoot } = require('../middleware/auth.cjs');
const { checkDiagramPermission, requireEditPermission, requireDeletePermission, requireManagePermission, logCollaborationHistory } = require('../middleware/permissions.cjs');
const dbHelpers = require('../database/database.cjs');

// POST /api/diagrams - Create Diagram (需要認證)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const diagramData = req.body;
    // 添加用戶 ID 到圖表數據
    diagramData.userId = req.user.id;
    
    const newDiagram = await dbHelpers.createDiagram(diagramData);
    
    // 為創建者新增擁有者權限
    await dbHelpers.createDiagramPermission(newDiagram.id, req.user.id, 'owner', req.user.id);
    
    res.status(201).json(newDiagram);
  } catch (error) {
    console.error("Error creating diagram:", error);
    res.status(500).json({ error: 'Failed to create diagram' });
  }
});

// GET /api/diagrams - List All Diagrams (可選認證)
router.get('/', optionalAuth, async (req, res) => {
  try {
    let diagrams;
    const { type } = req.query; // 'personal' or 'collaborative'
    
    console.log('GET /api/diagrams - req.user:', req.user); // 調試日誌
    console.log('GET /api/diagrams - type:', type); // 調試日誌
    
    if (req.user) {
      if (type === 'personal') {
        // 只返回個人圖表（擁有者且非協作）
        const allDiagrams = await dbHelpers.getUserDiagramsByPermission(req.user.id);
        diagrams = allDiagrams.filter(d => d.permission_type === 'owner' && !d.is_collaborative);
      } else if (type === 'collaborative') {
        // 返回協作圖表（使用者有權限的協作圖表或有編輯權限的圖表）
        const allDiagrams = await dbHelpers.getUserDiagramsByPermission(req.user.id);
        diagrams = allDiagrams.filter(d => d.is_collaborative || d.permission_type === 'editor');
      } else {
        // 默認返回所有有權限的圖表
        if (req.user.role === 'root') {
          // root 可以看到所有圖表
          diagrams = await dbHelpers.getAllDiagrams();
        } else {
          // 其他用戶只能看到自己有權限的圖表
          console.log('Getting diagrams for user:', req.user.id); // 調試日誌
          diagrams = await dbHelpers.getUserDiagramsByPermission(req.user.id);
          console.log('Found diagrams:', diagrams.length); // 調試日誌
        }
      }
    } else {
      // 未登入用戶返回空數組或公共圖表
      diagrams = [];
    }
    
    res.status(200).json(diagrams);
  } catch (error) {
    console.error("Error listing diagrams:", error);
    res.status(500).json({ error: 'Failed to retrieve diagrams' });
  }
});

// GET /api/diagrams/all - 管理員獲取所有圖表
router.get('/all', authenticateToken, requireRoot, async (req, res) => {
  try {
    const diagrams = await dbHelpers.getAllDiagrams();
    res.status(200).json(diagrams);
  } catch (error) {
    console.error("Error listing all diagrams:", error);
    res.status(500).json({ error: 'Failed to retrieve all diagrams' });
  }
});

// GET /api/diagrams/:id - Get Specific Diagram
router.get('/:id', authenticateToken, checkDiagramPermission, async (req, res) => {
  try {
    const { id } = req.params;
    const diagram = await dbHelpers.getDiagramById(id);
    
    if (!diagram) {
      return res.status(404).json({ error: 'Diagram not found' });
    }

    res.status(200).json(diagram);
  } catch (error) {
    console.error("Error getting diagram by ID:", error);
    res.status(500).json({ error: 'Failed to retrieve diagram' });
  }
});

// PUT /api/diagrams/:id - Update Diagram
router.put('/:id', authenticateToken, checkDiagramPermission, requireEditPermission, logCollaborationHistory('update', 'diagram'), async (req, res) => {
  try {
    const { id } = req.params;
    const diagramData = req.body;

    const updatedDiagram = await dbHelpers.updateDiagram(id, diagramData);
    if (updatedDiagram) {
      res.status(200).json(updatedDiagram);
    } else {
      res.status(404).json({ error: 'Diagram not found or no changes made' });
    }
  } catch (error) {
    console.error("Error updating diagram:", error);
    res.status(500).json({ error: 'Failed to update diagram' });
  }
});

// DELETE /api/diagrams/:id - Delete Diagram
router.delete('/:id', authenticateToken, checkDiagramPermission, requireDeletePermission, async (req, res) => {
  try {
    const { id } = req.params;

    let changes;

    // 如果是 root，使用特殊的刪除函數
    if (req.user.role === 'root') {
      changes = await dbHelpers.deleteDiagramByAdmin(id, req.user.id);
    } else {
      changes = await dbHelpers.deleteDiagram(id);
    }

    if (changes > 0) {
      res.status(204).send(); // No Content
    } else {
      res.status(404).json({ error: 'Diagram not found' });
    }
  } catch (error) {
    console.error("Error deleting diagram:", error);
    if (error.message.includes('Unauthorized')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete diagram' });
    }
  }
});

// GET /api/diagrams/user/:userId - 獲取特定用戶的圖表（僅 root）
router.get('/user/:userId', authenticateToken, requireRoot, async (req, res) => {
  try {
    const { userId } = req.params;
    const diagrams = await dbHelpers.getDiagramsByUserId(userId);
    res.status(200).json(diagrams);
  } catch (error) {
    console.error("Error getting diagrams by user ID:", error);
    res.status(500).json({ error: 'Failed to retrieve user diagrams' });
  }
});

// 獲取圖表的修訂歷程
router.get('/:id/revisions', authenticateToken, checkDiagramPermission, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 獲取修訂歷程
    const revisions = await dbHelpers.getRevisionHistoryByDiagramId(id);
    res.json({ revisions });

  } catch (error) {
    console.error('Get revision history error:', error);
    res.status(500).json({ error: '獲取修訂歷程失敗' });
  }
});

// 添加修訂歷程記錄
router.post('/:id/revisions', authenticateToken, checkDiagramPermission, requireEditPermission, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, element, message } = req.body;
    
    // 創建修訂歷程記錄
    const revisionId = await dbHelpers.createRevisionHistory(
      id,
      req.user.id,
      req.user.username,
      action,
      element,
      message
    );

    res.status(201).json({ 
      message: '修訂歷程記錄已創建',
      revisionId 
    });

  } catch (error) {
    console.error('Create revision history error:', error);
    res.status(500).json({ error: '創建修訂歷程記錄失敗' });
  }
});

module.exports = router;
