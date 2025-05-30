import { useAuth } from "../context/AuthContext";
import axios from "axios";

export default function useRevisionHistory() {
  const { API_BASE_URL, user } = useAuth();

  // 生成具體的變更描述
  const generateChangeDescription = (prevData, currentData) => {
    const changes = [];
    
    // 檢查表格變更
    if (prevData.tables && currentData.tables) {
      const prevTables = prevData.tables || [];
      const currentTables = currentData.tables || [];
      
      // 新增的表格
      const addedTables = currentTables.filter(t => 
        !prevTables.find(pt => pt.id === t.id)
      );
      addedTables.forEach(table => {
        changes.push(`新增資料表「${table.name}」`);
      });
      
      // 刪除的表格
      const deletedTables = prevTables.filter(t => 
        !currentTables.find(ct => ct.id === t.id)
      );
      deletedTables.forEach(table => {
        changes.push(`刪除資料表「${table.name}」`);
      });
      
      // 修改的表格
      currentTables.forEach(currentTable => {
        const prevTable = prevTables.find(pt => pt.id === currentTable.id);
        if (prevTable) {
          // 檢查表格名稱變更
          if (prevTable.name !== currentTable.name) {
            changes.push(`重新命名資料表「${prevTable.name}」為「${currentTable.name}」`);
          }
          
          // 檢查欄位變更
          const prevFields = prevTable.fields || [];
          const currentFields = currentTable.fields || [];
          
          // 新增的欄位
          const addedFields = currentFields.filter(f => 
            !prevFields.find(pf => pf.id === f.id)
          );
          addedFields.forEach(field => {
            changes.push(`在資料表「${currentTable.name}」中新增欄位「${field.name}」`);
          });
          
          // 刪除的欄位
          const deletedFields = prevFields.filter(f => 
            !currentFields.find(cf => cf.id === f.id)
          );
          deletedFields.forEach(field => {
            changes.push(`從資料表「${currentTable.name}」中刪除欄位「${field.name}」`);
          });
          
          // 修改的欄位
          currentFields.forEach(currentField => {
            const prevField = prevFields.find(pf => pf.id === currentField.id);
            if (prevField) {
              if (prevField.name !== currentField.name) {
                changes.push(`在資料表「${currentTable.name}」中重新命名欄位「${prevField.name}」為「${currentField.name}」`);
              }
              if (prevField.type !== currentField.type) {
                changes.push(`修改資料表「${currentTable.name}」中欄位「${currentField.name}」的型別從「${prevField.type}」改為「${currentField.type}」`);
              }
            }
          });
        }
      });
    }
    
    // 檢查關聯變更
    if (prevData.relationships && currentData.relationships) {
      const prevRels = prevData.relationships || [];
      const currentRels = currentData.relationships || [];
      
      const addedRels = currentRels.filter(r => 
        !prevRels.find(pr => pr.id === r.id)
      );
      addedRels.forEach(rel => {
        changes.push(`新增關聯「${rel.name}」`);
      });
      
      const deletedRels = prevRels.filter(r => 
        !currentRels.find(cr => cr.id === r.id)
      );
      deletedRels.forEach(rel => {
        changes.push(`刪除關聯「${rel.name}」`);
      });
    }
    
    // 檢查註解變更
    if (prevData.notes && currentData.notes) {
      const prevNotes = prevData.notes || [];
      const currentNotes = currentData.notes || [];
      
      const addedNotes = currentNotes.filter(n => 
        !prevNotes.find(pn => pn.id === n.id)
      );
      addedNotes.forEach(note => {
        changes.push(`新增註解「${note.title || '無標題'}」`);
      });
      
      const deletedNotes = prevNotes.filter(n => 
        !currentNotes.find(cn => cn.id === n.id)
      );
      deletedNotes.forEach(note => {
        changes.push(`刪除註解「${note.title || '無標題'}」`);
      });
    }
    
    // 檢查區域變更
    if (prevData.areas && currentData.areas) {
      const prevAreas = prevData.areas || [];
      const currentAreas = currentData.areas || [];
      
      const addedAreas = currentAreas.filter(a => 
        !prevAreas.find(pa => pa.id === a.id)
      );
      addedAreas.forEach(area => {
        changes.push(`新增區域「${area.name}」`);
      });
      
      const deletedAreas = prevAreas.filter(a => 
        !currentAreas.find(ca => ca.id === a.id)
      );
      deletedAreas.forEach(area => {
        changes.push(`刪除區域「${area.name}」`);
      });
    }
    
    return changes.length > 0 ? changes.join('；') : '更新圖表內容';
  };

  const recordRevision = async (diagramId, action, element, message) => {
    if (!diagramId || !user) return;

    // 過濾掉移動操作，移動不需要記錄到修訂歷程
    if (action === 'MOVE' || message.includes('移動')) {
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/api/diagrams/${diagramId}/revisions`, {
        action,
        element,
        message
      });
    } catch (error) {
      console.error('Failed to record revision history:', error);
      // 不拋出錯誤，因為修訂歷程記錄失敗不應該影響主要功能
    }
  };

  const recordDetailedRevision = async (diagramId, prevData, currentData, action = 'UPDATE') => {
    if (!diagramId || !user) return;

    const changeDescription = generateChangeDescription(prevData, currentData);
    
    try {
      await axios.post(`${API_BASE_URL}/api/diagrams/${diagramId}/revisions`, {
        action,
        element: 'DIAGRAM',
        message: changeDescription
      });
    } catch (error) {
      console.error('Failed to record detailed revision history:', error);
    }
  };

  return {
    recordRevision,
    recordDetailedRevision,
    generateChangeDescription
  };
} 