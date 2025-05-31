import { useAuth } from "../context/AuthContext";
import axios from "axios";

export default function useRevisionHistory() {
  const { API_BASE_URL, user } = useAuth();

  // 生成具體的變更描述
  const generateChangeDescription = (prevData, currentData) => {
    const changes = [];
    
    // 如果 prevData 為 null 或 undefined，表示這是第一次儲存，不記錄變更
    if (!prevData) {
      return null;
    }
    
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
          
          // 檢查表格註解變更
          if ((prevTable.comment || '') !== (currentTable.comment || '')) {
            const prevComment = prevTable.comment || '無註解';
            const currentComment = currentTable.comment || '無註解';
            changes.push(`修改資料表「${currentTable.name}」的註解：「${prevComment}」→「${currentComment}」`);
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
              const fieldChanges = [];
              
              if (prevField.name !== currentField.name) {
                fieldChanges.push(`名稱：「${prevField.name}」→「${currentField.name}」`);
              }
              if (prevField.type !== currentField.type) {
                fieldChanges.push(`型別：「${prevField.type}」→「${currentField.type}」`);
              }
              if ((prevField.comment || '') !== (currentField.comment || '')) {
                const prevComment = prevField.comment || '無註解';
                const currentComment = currentField.comment || '無註解';
                fieldChanges.push(`註解：「${prevComment}」→「${currentComment}」`);
              }
              if (prevField.notNull !== currentField.notNull) {
                fieldChanges.push(`允許空值：${prevField.notNull ? '否' : '是'}→${currentField.notNull ? '否' : '是'}`);
              }
              if (prevField.primary !== currentField.primary) {
                fieldChanges.push(`主鍵：${prevField.primary ? '是' : '否'}→${currentField.primary ? '是' : '否'}`);
              }
              if (prevField.unique !== currentField.unique) {
                fieldChanges.push(`唯一值：${prevField.unique ? '是' : '否'}→${currentField.unique ? '是' : '否'}`);
              }
              if ((prevField.default || '') !== (currentField.default || '')) {
                const prevDefault = prevField.default || '無預設值';
                const currentDefault = currentField.default || '無預設值';
                fieldChanges.push(`預設值：「${prevDefault}」→「${currentDefault}」`);
              }
              
              if (fieldChanges.length > 0) {
                changes.push(`修改資料表「${currentTable.name}」中欄位「${currentField.name}」的${fieldChanges.join('、')}`);
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
      
      // 修改的註解
      currentNotes.forEach(currentNote => {
        const prevNote = prevNotes.find(pn => pn.id === currentNote.id);
        if (prevNote) {
          const noteChanges = [];
          
          if ((prevNote.title || '') !== (currentNote.title || '')) {
            const prevTitle = prevNote.title || '無標題';
            const currentTitle = currentNote.title || '無標題';
            noteChanges.push(`標題：「${prevTitle}」→「${currentTitle}」`);
          }
          
          if ((prevNote.content || '') !== (currentNote.content || '')) {
            const prevContent = prevNote.content || '無內容';
            const currentContent = currentNote.content || '無內容';
            noteChanges.push(`內容：「${prevContent}」→「${currentContent}」`);
          }
          
          if (noteChanges.length > 0) {
            changes.push(`修改註解「${currentNote.title || '無標題'}」的${noteChanges.join('、')}`);
          }
        }
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
    
    return changes.length > 0 ? changes.join('；') : null;
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
    
    // 只有在有實際變更時才記錄修訂歷程
    if (!changeDescription) {
      return;
    }
    
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