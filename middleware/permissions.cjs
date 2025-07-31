const db = require('../database/database.cjs');

// 檢查使用者對圖表的權限
const checkDiagramPermission = async (req, res, next) => {
  try {
    const diagramId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // 獲取圖表資訊來檢查是否為協作圖表
    const diagram = await db.getDiagramById(diagramId);
    if (!diagram) {
      return res.status(404).json({ error: '圖表不存在' });
    }
    
    // Root 有所有權限，但不能刪除協作圖表
    if (userRole === 'root') {
      req.permission = {
        type: 'root',
        canView: true,
        canEdit: true,
        canDelete: !diagram.is_collaborative, // 協作圖表不能被刪除
        canManagePermissions: true
      };
      return next();
    }
    
    // 檢查權限表
    const permission = await db.getDiagramPermission(diagramId, userId);
    
    if (!permission) {
      return res.status(403).json({ error: '無權限存取此圖表' });
    }
    
    // 根據權限類型設定權限
    req.permission = {
      type: permission.permission_type,
      canView: true,
      canEdit: permission.permission_type === 'owner' || permission.permission_type === 'editor',
      canDelete: permission.permission_type === 'owner' && !diagram.is_collaborative, // 協作圖表不能被刪除
      canManagePermissions: permission.permission_type === 'owner'
    };
    
    next();
  } catch (error) {
    console.error('Permission check error:', error);
    res.status(500).json({ error: '權限檢查失敗' });
  }
};

// 檢查是否可以編輯圖表
const requireEditPermission = (req, res, next) => {
  if (!req.permission || !req.permission.canEdit) {
    return res.status(403).json({ error: '無編輯權限' });
  }
  next();
};

// 檢查是否可以刪除圖表
const requireDeletePermission = (req, res, next) => {
  if (!req.permission || !req.permission.canDelete) {
    return res.status(403).json({ error: '無刪除權限' });
  }
  next();
};

// 檢查是否可以管理權限
const requireManagePermission = (req, res, next) => {
  if (!req.permission || !req.permission.canManagePermissions) {
    return res.status(403).json({ error: '無權限管理權限' });
  }
  next();
};

// 記錄共編歷史
const logCollaborationHistory = (action, targetType) => {
  return async (req, res, next) => {
    // 在原始處理函數執行後記錄
    const originalSend = res.json;
    res.json = async function(data) {
      try {
        // 只在成功的情況下記錄
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const diagramId = req.params.id;
          const userId = req.user.id;
          const targetId = req.params.targetId || null;
          const changes = req.body || null;
          
          await db.createCollaborationHistory(
            diagramId,
            userId,
            action,
            targetType,
            targetId,
            changes
          );
        }
      } catch (error) {
        console.error('Failed to log collaboration history:', error);
        // 不影響原始響應
      }
      
      // 調用原始的 json 方法
      originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  checkDiagramPermission,
  requireEditPermission,
  requireDeletePermission,
  requireManagePermission,
  logCollaborationHistory
};