/**
 * 智能合併邏輯
 * 將新的 SQL 資料與現有圖表資料合併，保留使用者的編輯
 */

import { nanoid } from "nanoid";

/**
 * 比較兩個欄位是否相同（忽略 id 和 comment）
 */
function areFieldsEqual(field1, field2) {
  return (
    field1.name === field2.name &&
    field1.type === field2.type &&
    field1.size === field2.size &&
    field1.primary === field2.primary &&
    field1.unique === field2.unique &&
    field1.notNull === field2.notNull &&
    field1.increment === field2.increment &&
    field1.default === field2.default &&
    field1.check === field2.check
  );
}

/**
 * 合併單一表格
 * @param {object} existingTable - 現有的表格
 * @param {object} newTable - 新匯入的表格
 * @returns {object} - 合併後的表格
 */
function mergeTable(existingTable, newTable) {
  const mergedTable = {
    ...existingTable,
    // 保留使用者設定的 comment 和 color
    comment: existingTable.comment || newTable.comment || "",
    color: existingTable.color || newTable.color || "#175e7a",
  };

  // 合併欄位
  const mergedFields = [];
  const existingFieldNames = new Set();
  
  // 首先處理現有欄位
  existingTable.fields.forEach(existingField => {
    existingFieldNames.add(existingField.name);
    
    // 查找新表格中對應的欄位
    const newField = newTable.fields.find(f => f.name === existingField.name);
    
    if (newField) {
      // 欄位存在於兩邊，合併屬性但保留使用者的 comment
      mergedFields.push({
        ...newField,
        id: existingField.id, // 保留原有 ID
        comment: existingField.comment || newField.comment || "", // 優先保留使用者的 comment
        // 如果結構改變，使用新的定義
        type: newField.type,
        size: newField.size,
        primary: newField.primary,
        unique: newField.unique,
        notNull: newField.notNull,
        increment: newField.increment,
        default: newField.default,
        check: newField.check,
        values: newField.values,
      });
    } else {
      // 欄位只存在於現有表格（可能已被刪除），保留它
      mergedFields.push(existingField);
    }
  });
  
  // 新增新欄位
  newTable.fields.forEach(newField => {
    if (!existingFieldNames.has(newField.name)) {
      // 這是一個新欄位，添加它
      mergedFields.push({
        ...newField,
        id: nanoid(), // 產生新 ID
      });
    }
  });
  
  mergedTable.fields = mergedFields;
  
  // 合併索引
  const mergedIndices = [];
  const existingIndexNames = new Set();
  
  // 保留現有索引
  if (existingTable.indices) {
    existingTable.indices.forEach(existingIndex => {
      existingIndexNames.add(existingIndex.name);
      mergedIndices.push(existingIndex);
    });
  }
  
  // 新增新索引
  if (newTable.indices) {
    newTable.indices.forEach(newIndex => {
      if (!existingIndexNames.has(newIndex.name)) {
        mergedIndices.push({
          ...newIndex,
          id: mergedIndices.length,
        });
      }
    });
  }
  
  mergedTable.indices = mergedIndices;
  
  return mergedTable;
}

/**
 * 合併關聯
 * @param {array} existingRelationships - 現有的關聯
 * @param {array} newRelationships - 新的關聯
 * @param {object} tableIdMap - 表格 ID 映射
 * @returns {array} - 合併後的關聯
 */
function mergeRelationships(existingRelationships, newRelationships, tableIdMap) {
  const mergedRelationships = [];
  const existingRelationshipKeys = new Set();
  
  // 建立現有關聯的鍵值集合
  existingRelationships.forEach(rel => {
    const key = `${rel.startTableId}_${rel.startFieldId}_${rel.endTableId}_${rel.endFieldId}`;
    existingRelationshipKeys.add(key);
    mergedRelationships.push(rel);
  });
  
  // 添加新關聯
  newRelationships.forEach(newRel => {
    // 更新表格 ID
    const mappedRel = {
      ...newRel,
      startTableId: tableIdMap[newRel.startTableId] || newRel.startTableId,
      endTableId: tableIdMap[newRel.endTableId] || newRel.endTableId,
    };
    
    const key = `${mappedRel.startTableId}_${mappedRel.startFieldId}_${mappedRel.endTableId}_${mappedRel.endFieldId}`;
    
    if (!existingRelationshipKeys.has(key)) {
      mergedRelationships.push({
        ...mappedRel,
        id: mergedRelationships.length,
      });
    }
  });
  
  return mergedRelationships;
}

/**
 * 智能合併匯入的資料與現有資料
 * @param {object} existingData - 現有的圖表資料
 * @param {object} importedData - 新匯入的資料
 * @returns {object} - 合併後的資料與變更報告
 */
export function smartMerge(existingData, importedData) {
  const mergedTables = [];
  const tableIdMap = {}; // 新表格 ID 到合併後 ID 的映射
  const changes = {
    tablesAdded: [],
    tablesModified: [],
    fieldsAdded: [],
    fieldsModified: [],
    fieldsRemoved: [],
    relationshipsAdded: [],
  };
  
  // 建立現有表格的名稱映射
  const existingTablesByName = {};
  existingData.tables.forEach(table => {
    existingTablesByName[table.name] = table;
  });
  
  // 處理現有表格
  existingData.tables.forEach(existingTable => {
    const importedTable = importedData.tables.find(t => t.name === existingTable.name);
    
    if (importedTable) {
      // 表格存在於兩邊，進行合併
      const mergedTable = mergeTable(existingTable, importedTable);
      mergedTables.push(mergedTable);
      
      // 記錄 ID 映射
      tableIdMap[importedTable.id] = existingTable.id;
      
      // 記錄變更
      changes.tablesModified.push(existingTable.name);
      
      // 比較欄位變更
      const existingFieldNames = new Set(existingTable.fields.map(f => f.name));
      const importedFieldNames = new Set(importedTable.fields.map(f => f.name));
      
      importedTable.fields.forEach(field => {
        if (!existingFieldNames.has(field.name)) {
          changes.fieldsAdded.push(`${existingTable.name}.${field.name}`);
        } else {
          const existingField = existingTable.fields.find(f => f.name === field.name);
          if (!areFieldsEqual(existingField, field)) {
            changes.fieldsModified.push(`${existingTable.name}.${field.name}`);
          }
        }
      });
      
      existingTable.fields.forEach(field => {
        if (!importedFieldNames.has(field.name)) {
          changes.fieldsRemoved.push(`${existingTable.name}.${field.name}`);
        }
      });
    } else {
      // 表格只存在於現有資料，保留它
      mergedTables.push(existingTable);
    }
  });
  
  // 添加新表格
  importedData.tables.forEach(importedTable => {
    if (!existingTablesByName[importedTable.name]) {
      // 這是一個新表格
      const newTable = {
        ...importedTable,
        id: nanoid(), // 產生新 ID
      };
      mergedTables.push(newTable);
      tableIdMap[importedTable.id] = newTable.id;
      changes.tablesAdded.push(importedTable.name);
      
      // 記錄新增的欄位
      importedTable.fields.forEach(field => {
        changes.fieldsAdded.push(`${importedTable.name}.${field.name}`);
      });
    }
  });
  
  // 合併關聯
  const mergedRelationships = mergeRelationships(
    existingData.relationships || [],
    importedData.relationships || [],
    tableIdMap
  );
  
  // 記錄新增的關聯
  const relationshipsBefore = existingData.relationships?.length || 0;
  const relationshipsAfter = mergedRelationships.length;
  if (relationshipsAfter > relationshipsBefore) {
    changes.relationshipsAdded.push(`新增 ${relationshipsAfter - relationshipsBefore} 個關聯`);
  }
  
  // 合併類型和列舉
  const mergedTypes = mergeCustomTypes(existingData.types || [], importedData.types || []);
  const mergedEnums = mergeCustomTypes(existingData.enums || [], importedData.enums || []);
  
  return {
    data: {
      tables: mergedTables,
      relationships: mergedRelationships,
      types: mergedTypes,
      enums: mergedEnums,
      // 保留其他現有資料
      areas: existingData.areas || [],
      notes: existingData.notes || [],
    },
    changes,
  };
}

/**
 * 合併自定義類型或列舉
 */
function mergeCustomTypes(existingTypes, newTypes) {
  const merged = [...existingTypes];
  const existingNames = new Set(existingTypes.map(t => t.name));
  
  newTypes.forEach(newType => {
    if (!existingNames.has(newType.name)) {
      merged.push(newType);
    }
  });
  
  return merged;
}

/**
 * 產生變更摘要
 * @param {object} changes - 變更記錄
 * @returns {string} - 變更摘要文字
 */
export function generateChangeSummary(changes) {
  const parts = [];
  
  if (changes.tablesAdded.length > 0) {
    parts.push(`新增 ${changes.tablesAdded.length} 個表格`);
  }
  
  if (changes.tablesModified.length > 0) {
    parts.push(`修改 ${changes.tablesModified.length} 個表格`);
  }
  
  if (changes.fieldsAdded.length > 0) {
    parts.push(`新增 ${changes.fieldsAdded.length} 個欄位`);
  }
  
  if (changes.fieldsModified.length > 0) {
    parts.push(`修改 ${changes.fieldsModified.length} 個欄位`);
  }
  
  if (changes.fieldsRemoved.length > 0) {
    parts.push(`${changes.fieldsRemoved.length} 個欄位已從資料庫移除但保留在圖表中`);
  }
  
  if (changes.relationshipsAdded.length > 0) {
    parts.push(changes.relationshipsAdded[0]);
  }
  
  if (parts.length === 0) {
    return "沒有變更";
  }
  
  return parts.join("、");
}

/**
 * 產生詳細變更報告
 * @param {object} changes - 變更記錄
 * @returns {object} - 詳細報告
 */
export function generateDetailedReport(changes) {
  return {
    summary: generateChangeSummary(changes),
    details: {
      tablesAdded: changes.tablesAdded,
      tablesModified: changes.tablesModified,
      fieldsAdded: changes.fieldsAdded,
      fieldsModified: changes.fieldsModified,
      fieldsRemoved: changes.fieldsRemoved,
      relationshipsAdded: changes.relationshipsAdded,
    },
  };
}