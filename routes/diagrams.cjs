const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth, requireMitAdmin } = require('../middleware/auth.cjs');
const dbHelpers = require('../database/database.cjs');

// POST /api/diagrams - Create Diagram (需要認證)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const diagramData = req.body;
    // 添加用戶 ID 到圖表數據
    diagramData.userId = req.user.id;
    
    const newDiagram = await dbHelpers.createDiagram(diagramData);
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
    
    if (req.user) {
      // 如果用戶已登入，根據角色返回不同的圖表
      if (req.user.role === 'mitadmin') {
        // mitadmin 可以看到所有圖表
        diagrams = await dbHelpers.getAllDiagrams();
      } else {
        // 其他用戶只能看到自己的圖表
        diagrams = await dbHelpers.getDiagramsByUserId(req.user.id);
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
router.get('/all', authenticateToken, requireMitAdmin, async (req, res) => {
  try {
    const diagrams = await dbHelpers.getAllDiagrams();
    res.status(200).json(diagrams);
  } catch (error) {
    console.error("Error listing all diagrams:", error);
    res.status(500).json({ error: 'Failed to retrieve all diagrams' });
  }
});

// GET /api/diagrams/:id - Get Specific Diagram
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const diagram = await dbHelpers.getDiagramById(id);
    
    if (!diagram) {
      return res.status(404).json({ error: 'Diagram not found' });
    }

    // 檢查權限：圖表擁有者、mitadmin 或未設置 userId 的圖表（舊數據）
    if (diagram.userId && req.user) {
      if (diagram.userId !== req.user.id && req.user.role !== 'mitadmin') {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (diagram.userId && !req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    res.status(200).json(diagram);
  } catch (error) {
    console.error("Error getting diagram by ID:", error);
    res.status(500).json({ error: 'Failed to retrieve diagram' });
  }
});

// PUT /api/diagrams/:id - Update Diagram
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const diagramData = req.body;

    // 首先檢查圖表是否存在
    const existingDiagram = await dbHelpers.getDiagramById(id);
    if (!existingDiagram) {
      return res.status(404).json({ error: 'Diagram not found' });
    }

    // 檢查權限：只有圖表擁有者或 mitadmin 可以更新
    if (existingDiagram.userId && existingDiagram.userId !== req.user.id && req.user.role !== 'mitadmin') {
      return res.status(403).json({ error: 'Access denied' });
    }

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
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 首先檢查圖表是否存在
    const existingDiagram = await dbHelpers.getDiagramById(id);
    if (!existingDiagram) {
      return res.status(404).json({ error: 'Diagram not found' });
    }

    let changes;

    // 如果是 mitadmin，使用特殊的刪除函數
    if (req.user.role === 'mitadmin') {
      changes = await dbHelpers.deleteDiagramByAdmin(id, req.user.id);
    } else {
      // 普通用戶只能刪除自己的圖表
      if (existingDiagram.userId && existingDiagram.userId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
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

// GET /api/diagrams/user/:userId - 獲取特定用戶的圖表（僅 mitadmin）
router.get('/user/:userId', authenticateToken, requireMitAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const diagrams = await dbHelpers.getDiagramsByUserId(userId);
    res.status(200).json(diagrams);
  } catch (error) {
    console.error("Error getting diagrams by user ID:", error);
    res.status(500).json({ error: 'Failed to retrieve user diagrams' });
  }
});

module.exports = router;
