import { saveAs } from 'file-saver';
import { tableWidth, tableHeaderHeight, tableFieldHeight, tableColorStripHeight, Cardinality } from '../../data/constants';
import { calcPath } from '../calcPath';

/**
 * 計算 table 的高度
 * @param {Object} table - Table 物件
 * @returns {number} Table 的總高度
 */
const calculateTableHeight = (table) => {
  const headerHeight = table.comment && table.comment.trim() !== "" ? 60 : 40;
  const fieldsHeight = table.fields.length * tableFieldHeight;
  return tableColorStripHeight + headerHeight + fieldsHeight;
};

/**
 * 計算所有元素的邊界框
 * @param {Array} tables - 所有 table
 * @param {Array} areas - 所有 area
 * @param {Array} notes - 所有 note
 * @returns {Object} 包含 x, y, width, height 的邊界框
 */
const calculateContentBounds = (tables, areas, notes) => {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  // 如果沒有任何元素，返回預設值
  if (tables.length === 0 && areas.length === 0 && notes.length === 0) {
    return { x: 0, y: 0, width: 800, height: 600 };
  }
  
  // 處理 tables
  tables.forEach(table => {
    if (table.x !== undefined && table.y !== undefined) {
      minX = Math.min(minX, table.x);
      minY = Math.min(minY, table.y);
      const height = calculateTableHeight(table);
      maxX = Math.max(maxX, table.x + tableWidth);
      maxY = Math.max(maxY, table.y + height);
    }
  });
  
  // 處理 areas
  areas.forEach(area => {
    if (area.x !== undefined && area.y !== undefined) {
      minX = Math.min(minX, area.x);
      minY = Math.min(minY, area.y);
      maxX = Math.max(maxX, area.x + (area.width || 200));
      maxY = Math.max(maxY, area.y + (area.height || 200));
    }
  });
  
  // 處理 notes
  notes.forEach(note => {
    if (note.x !== undefined && note.y !== undefined) {
      minX = Math.min(minX, note.x);
      minY = Math.min(minY, note.y);
      // Note 的預設尺寸
      const noteWidth = 200;
      const noteHeight = 150;
      maxX = Math.max(maxX, note.x + noteWidth);
      maxY = Math.max(maxY, note.y + noteHeight);
    }
  });
  
  // 檢查是否有有效的邊界
  if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
    return { x: 0, y: 0, width: 800, height: 600 };
  }
  
  // 加入 padding
  const padding = 50;
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2
  };
};

/**
 * 在 Canvas 上繪製表格
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} table - 表格資料
 * @param {number} offsetX - X 軸偏移
 * @param {number} offsetY - Y 軸偏移
 * @param {boolean} isDarkMode - 是否為深色模式
 */
const drawTable = (ctx, table, offsetX, offsetY, isDarkMode) => {
  const x = table.x - offsetX;
  const y = table.y - offsetY;
  const height = calculateTableHeight(table);
  
  // 設定樣式
  const bgColor = isDarkMode ? '#27272a' : '#f4f4f5';
  const borderColor = isDarkMode ? '#52525b' : '#d4d4d8';
  const textColor = isDarkMode ? '#f4f4f5' : '#18181b';
  const headerBgColor = isDarkMode ? '#18181b' : '#e4e4e7';
  
  // 繪製表格背景
  ctx.fillStyle = bgColor;
  ctx.fillRect(x, y, tableWidth, height);
  
  // 繪製表格邊框
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, tableWidth, height);
  
  // 繪製顏色條
  ctx.fillStyle = table.color || '#175e7a';
  ctx.fillRect(x, y, tableWidth, tableColorStripHeight);
  
  // 繪製表頭背景
  const headerHeight = table.comment && table.comment.trim() !== "" ? 60 : 40;
  ctx.fillStyle = headerBgColor;
  ctx.fillRect(x, y + tableColorStripHeight, tableWidth, headerHeight);
  
  // 繪製表頭邊框
  ctx.strokeStyle = borderColor;
  ctx.beginPath();
  ctx.moveTo(x, y + tableColorStripHeight + headerHeight);
  ctx.lineTo(x + tableWidth, y + tableColorStripHeight + headerHeight);
  ctx.stroke();
  
  // 繪製表名
  ctx.fillStyle = textColor;
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  
  const tableName = table.name || 'Untitled';
  const textY = y + tableColorStripHeight + (table.comment ? 20 : headerHeight / 2);
  ctx.fillText(tableName, x + 10, textY);
  
  // 繪製註解
  if (table.comment && table.comment.trim() !== "") {
    ctx.font = '11px Arial, sans-serif';
    ctx.fillStyle = isDarkMode ? '#a1a1aa' : '#71717a';
    ctx.fillText(table.comment, x + 10, textY + 20);
  }
  
  // 繪製欄位
  let fieldY = y + tableColorStripHeight + headerHeight;
  table.fields.forEach((field, index) => {
    // 繪製欄位背景（交替顏色）
    if (index % 2 === 0) {
      ctx.fillStyle = bgColor;
    } else {
      ctx.fillStyle = isDarkMode ? '#3f3f46' : '#fafafa';
    }
    ctx.fillRect(x, fieldY, tableWidth, tableFieldHeight);
    
    // 繪製欄位分隔線
    if (index < table.fields.length - 1) {
      ctx.strokeStyle = borderColor;
      ctx.beginPath();
      ctx.moveTo(x, fieldY + tableFieldHeight);
      ctx.lineTo(x + tableWidth, fieldY + tableFieldHeight);
      ctx.stroke();
    }
    
    // 繪製欄位名稱
    ctx.fillStyle = textColor;
    ctx.font = '12px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    // 繪製主鍵標記
    if (field.primary) {
      ctx.fillStyle = '#eab308';
      ctx.font = '10px Arial, sans-serif';
      ctx.fillText('🔑', x + 8, fieldY + tableFieldHeight / 2);
    }
    
    // 繪製欄位名稱
    ctx.fillStyle = textColor;
    ctx.font = field.primary ? 'bold 12px Arial, sans-serif' : '12px Arial, sans-serif';
    const fieldNameX = field.primary ? x + 28 : x + 10;
    ctx.fillText(field.name || 'untitled', fieldNameX, fieldY + tableFieldHeight / 2 - 8);
    
    // 繪製資料型別
    ctx.fillStyle = isDarkMode ? '#71717a' : '#a1a1aa';
    ctx.font = '11px Arial, sans-serif';
    let typeText = field.type || '';
    if (field.size) {
      typeText += `(${field.size})`;
    }
    ctx.fillText(typeText, fieldNameX, fieldY + tableFieldHeight / 2 + 8);
    
    // 繪製約束標記（右側）
    let constraintX = x + tableWidth - 10;
    ctx.textAlign = 'right';
    ctx.font = '10px Arial, sans-serif';
    
    if (field.notNull) {
      ctx.fillStyle = '#dc2626';
      ctx.fillText('NOT NULL', constraintX, fieldY + tableFieldHeight / 2);
      constraintX -= 60;
    }
    
    if (field.unique) {
      ctx.fillStyle = '#2563eb';
      ctx.fillText('UNIQUE', constraintX, fieldY + tableFieldHeight / 2);
    }
    
    fieldY += tableFieldHeight;
  });
};

/**
 * 在 Canvas 上繪製關聯線
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} relationship - 關聯資料
 * @param {Array} tables - 所有表格
 * @param {number} offsetX - X 軸偏移
 * @param {number} offsetY - Y 軸偏移
 * @param {Object} settings - 應用程式設定
 */
const drawRelationship = (ctx, relationship, tables, offsetX, offsetY, settings = {}) => {
  // 找到起始和結束表格
  const startTable = tables.find(t => t.id === relationship.startTableId);
  const endTable = tables.find(t => t.id === relationship.endTableId);
  
  if (!startTable || !endTable) return;
  
  // 找到起始和結束欄位的位置
  const startFieldIndex = startTable.fields.findIndex(f => f.id === relationship.startFieldId);
  const endFieldIndex = endTable.fields.findIndex(f => f.id === relationship.endFieldId);
  
  if (startFieldIndex === -1 || endFieldIndex === -1) return;
  
  // 使用 calcPath 函數計算路徑
  const pathData = {
    startTable: { 
      x: startTable.x - offsetX, 
      y: startTable.y - offsetY,
      hasComment: startTable.comment && startTable.comment.trim() !== ""
    },
    endTable: { 
      x: endTable.x - offsetX, 
      y: endTable.y - offsetY,
      hasComment: endTable.comment && endTable.comment.trim() !== ""
    },
    startFieldIndex: startFieldIndex,
    endFieldIndex: endFieldIndex
  };
  
  const pathString = calcPath(pathData, tableWidth, 1);
  
  // 繪製路徑
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  
  // 將 SVG 路徑轉換為 Canvas 路徑
  const path2D = new Path2D(pathString);
  ctx.stroke(path2D);
  
  // 決定關係類型標記
  let cardinalityStart = "1";
  let cardinalityEnd = "1";
  
  switch (relationship.cardinality) {
    case Cardinality.MANY_TO_ONE:
    case "many_to_one":
      cardinalityStart = "n";
      cardinalityEnd = "1";
      break;
    case Cardinality.ONE_TO_MANY:
    case "one_to_many":
      cardinalityStart = "1";
      cardinalityEnd = "n";
      break;
    case Cardinality.ONE_TO_ONE:
    case "one_to_one":
      cardinalityStart = "1";
      cardinalityEnd = "1";
      break;
    default:
      break;
  }
  
  // 從路徑字符串解析起點和終點座標來放置關係標記
  const matches = pathString.match(/M\s*([\d.-]+)\s+([\d.-]+)/);
  const endMatches = pathString.match(/L\s*([\d.-]+)\s+([\d.-]+)\s*$/);
  
  if (matches && endMatches) {
    const startX = parseFloat(matches[1]);
    const startY = parseFloat(matches[2]);
    const endX = parseFloat(endMatches[1]);
    const endY = parseFloat(endMatches[2]);
    
    // 只在設定開啟時繪製關係類型標記
    if (settings.showCardinality !== false) {
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 14px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 起始端標記（偏移一些距離避免重疊）
      const startOffset = 20;
      const startAngle = Math.atan2(endY - startY, endX - startX);
      const startLabelX = startX + Math.cos(startAngle) * startOffset;
      const startLabelY = startY + Math.sin(startAngle) * startOffset;
      ctx.fillText(cardinalityStart, startLabelX, startLabelY - 10);
      
      // 結束端標記
      const endOffset = 20;
      const endAngle = Math.atan2(startY - endY, startX - endX);
      const endLabelX = endX + Math.cos(endAngle) * endOffset;
      const endLabelY = endY + Math.sin(endAngle) * endOffset;
      ctx.fillText(cardinalityEnd, endLabelX, endLabelY - 10);
    }
    
    // 只在設定開啟時繪製關係名稱
    if (settings.showRelationshipLabels === true && relationship.name) {
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      
      // 背景框
      const textMetrics = ctx.measureText(relationship.name);
      const padding = 4;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(
        midX - textMetrics.width / 2 - padding,
        midY - 8 - padding,
        textMetrics.width + padding * 2,
        16 + padding * 2
      );
      
      // 文字
      ctx.fillStyle = '#3b82f6';
      ctx.font = '12px Arial, sans-serif';
      ctx.fillText(relationship.name, midX, midY);
    }
  }
};

/**
 * 在 Canvas 上繪製區域
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} area - 區域資料
 * @param {number} offsetX - X 軸偏移
 * @param {number} offsetY - Y 軸偏移
 */
const drawArea = (ctx, area, offsetX, offsetY) => {
  const x = area.x - offsetX;
  const y = area.y - offsetY;
  const width = area.width || 200;
  const height = area.height || 200;
  
  // 繪製半透明背景
  ctx.fillStyle = area.color ? `${area.color}20` : 'rgba(59, 130, 246, 0.1)';
  ctx.fillRect(x, y, width, height);
  
  // 繪製虛線邊框
  ctx.strokeStyle = area.color || '#3b82f6';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 5]);
  ctx.strokeRect(x, y, width, height);
  
  // 繪製區域名稱
  if (area.name) {
    ctx.fillStyle = area.color || '#3b82f6';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.setLineDash([]);
    ctx.fillText(area.name, x + 10, y + 10);
  }
};

/**
 * 在 Canvas 上繪製註解
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} note - 註解資料
 * @param {number} offsetX - X 軸偏移
 * @param {number} offsetY - Y 軸偏移
 */
const drawNote = (ctx, note, offsetX, offsetY) => {
  const x = note.x - offsetX;
  const y = note.y - offsetY;
  const width = 200;
  const height = 150;
  
  // 繪製便條紙背景
  ctx.fillStyle = note.color || '#fef3c7';
  ctx.fillRect(x, y, width, height);
  
  // 繪製邊框
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.strokeRect(x, y, width, height);
  
  // 繪製標題
  if (note.title) {
    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(note.title, x + 10, y + 10);
  }
  
  // 繪製內容
  if (note.content) {
    ctx.fillStyle = '#78350f';
    ctx.font = '11px Arial, sans-serif';
    const lines = note.content.split('\n');
    let textY = y + (note.title ? 35 : 15);
    
    lines.forEach(line => {
      if (textY < y + height - 10) {
        ctx.fillText(line, x + 10, textY);
        textY += 15;
      }
    });
  }
};

/**
 * 匯出圖表為 PNG
 * @param {Object} params - 匯出參數
 * @param {Array} params.tables - 所有 table
 * @param {Array} params.relationships - 所有關聯
 * @param {Array} params.areas - 所有 area
 * @param {Array} params.notes - 所有 note
 * @param {string} params.title - 圖表標題
 * @param {Object} params.settings - 應用程式設定
 * @param {Function} params.onSuccess - 成功回調
 * @param {Function} params.onError - 錯誤回調
 */
export const exportToPNG = async ({ 
  tables = [], 
  relationships = [],
  areas = [], 
  notes = [], 
  title = "diagram",
  settings = {},
  onSuccess,
  onError 
}) => {
  try {
    // 計算內容邊界
    const bounds = calculateContentBounds(tables, areas, notes);
    
    // 創建 Canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 設定 Canvas 尺寸（使用 devicePixelRatio 提高清晰度）
    const scale = 2; // 提高解析度
    canvas.width = bounds.width * scale;
    canvas.height = bounds.height * scale;
    
    // 設定實際顯示尺寸
    canvas.style.width = bounds.width + 'px';
    canvas.style.height = bounds.height + 'px';
    
    // 縮放 context 以匹配設備像素比
    ctx.scale(scale, scale);
    
    // 檢測是否為深色模式
    const isDarkMode = document.documentElement.classList.contains('dark') || 
                       localStorage.getItem('theme') === 'dark';
    
    // 繪製背景
    ctx.fillStyle = isDarkMode ? '#09090b' : '#ffffff';
    ctx.fillRect(0, 0, bounds.width, bounds.height);
    
    // 繪製區域（最底層）
    areas.forEach(area => {
      drawArea(ctx, area, bounds.x, bounds.y);
    });
    
    // 繪製關聯線（中間層）
    relationships.forEach(relationship => {
      drawRelationship(ctx, relationship, tables, bounds.x, bounds.y, settings);
    });
    
    // 繪製表格（上層）
    tables.forEach(table => {
      drawTable(ctx, table, bounds.x, bounds.y, isDarkMode);
    });
    
    // 繪製註解（最上層）
    notes.forEach(note => {
      drawNote(ctx, note, bounds.x, bounds.y);
    });
    
    // 將 Canvas 轉換為 Blob
    canvas.toBlob((blob) => {
      if (blob) {
        // 生成檔案名稱
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${title}_${timestamp}.png`;
        
        // 下載檔案
        saveAs(blob, filename);
        
        if (onSuccess) {
          onSuccess(filename);
        }
      } else {
        throw new Error('無法生成圖片');
      }
    }, 'image/png', 0.95);
    
  } catch (error) {
    console.error('匯出 PNG 失敗:', error);
    
    if (onError) {
      onError(error);
    }
  }
};