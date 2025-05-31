// 生成詳細的修訂歷程訊息
export const generateDetailedMessage = (action, element, component, data) => {
  const { tableName, fieldName, undo, redo, extra } = data;

  // 格式化值的顯示
  const formatValue = (value) => {
    if (value === null || value === undefined) return '空值';
    if (value === '') return '空字串';
    if (typeof value === 'boolean') return value ? '是' : '否';
    return `「${value}」`;
  };

  // 根據不同的操作類型生成訊息
  // 使用數字比較而不是字串比較
  switch (action) {
    case 3: // Action.EDIT
      if (element === 1) { // ObjectType.TABLE
        switch (component) {
          case 'field':
            // 欄位編輯
            if (undo && redo) {
              const changes = [];
              Object.keys(redo).forEach(key => {
                const oldValue = undo[key];
                const newValue = redo[key];
                
                switch (key) {
                  case 'name':
                    changes.push(`名稱：${formatValue(oldValue)} → ${formatValue(newValue)}`);
                    break;
                  case 'type':
                    changes.push(`型別：${formatValue(oldValue)} → ${formatValue(newValue)}`);
                    break;
                  case 'comment':
                    changes.push(`註解：${formatValue(oldValue)} → ${formatValue(newValue)}`);
                    break;
                  case 'primary':
                    changes.push(`主鍵：${formatValue(oldValue)} → ${formatValue(newValue)}`);
                    break;
                  case 'notNull':
                    changes.push(`不允許空值：${formatValue(oldValue)} → ${formatValue(newValue)}`);
                    break;
                  case 'unique':
                    changes.push(`唯一值：${formatValue(oldValue)} → ${formatValue(newValue)}`);
                    break;
                  case 'increment':
                    changes.push(`自動遞增：${formatValue(oldValue)} → ${formatValue(newValue)}`);
                    break;
                  case 'default':
                    changes.push(`預設值：${formatValue(oldValue)} → ${formatValue(newValue)}`);
                    break;
                  case 'size':
                    changes.push(`大小：${formatValue(oldValue)} → ${formatValue(newValue)}`);
                    break;
                  case 'check':
                    changes.push(`檢查條件：${formatValue(oldValue)} → ${formatValue(newValue)}`);
                    break;
                  default:
                    changes.push(`${key}：${formatValue(oldValue)} → ${formatValue(newValue)}`);
                }
              });
              
              if (fieldName) {
                return `修改資料表「${tableName}」中欄位「${fieldName}」的${changes.join('、')}`;
              } else {
                return `修改資料表「${tableName}」中欄位的${changes.join('、')}`;
              }
            }
            break;
            
          case 'self':
          case 'comment':
            // 表格本身的編輯
            if (undo && redo) {
              const changes = [];
              Object.keys(redo).forEach(key => {
                const oldValue = undo[key];
                const newValue = redo[key];
                
                switch (key) {
                  case 'name':
                    changes.push(`名稱：${formatValue(oldValue)} → ${formatValue(newValue)}`);
                    break;
                  case 'comment':
                    changes.push(`註解：${formatValue(oldValue)} → ${formatValue(newValue)}`);
                    break;
                  default:
                    changes.push(`${key}：${formatValue(oldValue)} → ${formatValue(newValue)}`);
                }
              });
              
              return `修改資料表「${tableName}」的${changes.join('、')}`;
            }
            break;
            
          case 'field_add':
            return `在資料表「${tableName}」中新增欄位`;
            
          case 'field_delete':
            return `從資料表「${tableName}」中刪除欄位「${fieldName}」`;
            
          case 'index':
            return `修改資料表「${tableName}」的索引`;
            
          default:
            return `編輯資料表「${tableName}」${extra || ''}`;
        }
      }
      break;
      
    case 0: // Action.ADD
      if (element === 1) { // ObjectType.TABLE
        return `新增資料表「${tableName}」`;
      } else if (element === 4) { // ObjectType.RELATIONSHIP
        return `新增關聯`;
      } else if (element === 3) { // ObjectType.NOTE
        return `新增註解`;
      } else if (element === 2) { // ObjectType.AREA
        return `新增區域`;
      }
      break;
      
    case 2: // Action.DELETE
      if (element === 1) { // ObjectType.TABLE
        return `刪除資料表「${tableName}」`;
      } else if (element === 4) { // ObjectType.RELATIONSHIP
        return `刪除關聯`;
      } else if (element === 3) { // ObjectType.NOTE
        return `刪除註解`;
      } else if (element === 2) { // ObjectType.AREA
        return `刪除區域`;
      }
      break;
      
    default:
      return `${action} ${element} ${extra || ''}`;
  }
  
  // 預設回傳
  return `編輯資料表「${tableName}」${extra || ''}`;
}; 