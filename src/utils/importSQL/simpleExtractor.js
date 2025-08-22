/**
 * 簡單的 SQL 資訊提取器
 * 不依賴 SQL 解析器，直接從文本中提取所需資訊
 */

import { nanoid } from "nanoid";
import { Cardinality } from "../../data/constants.js";

/**
 * 從 PostgreSQL/pgAdmin 匯出的 SQL 中提取表格結構
 * @param {string} sqlContent - SQL 內容
 * @returns {object} - { tables, relationships }
 */
export function extractFromSQL(sqlContent) {
  const tables = [];
  const relationships = [];
  const tableMap = new Map(); // 用於快速查找表格
  
  // 移除註解行
  const lines = sqlContent.split('\n');
  const cleanLines = lines.filter(line => !line.trim().startsWith('--'));
  const cleanedContent = cleanLines.join('\n');
  
  // 分割成語句（用分號分割）
  const statements = cleanedContent.split(';');
  
  statements.forEach(statement => {
    // 提取 CREATE TABLE
    if (/^\s*CREATE\s+TABLE/i.test(statement)) {
      const table = extractTable(statement);
      if (table) {
        tables.push(table);
        tableMap.set(table.name, table);
      }
    }
    
    // 提取 ALTER TABLE ADD CONSTRAINT PRIMARY KEY
    const pkMatch = statement.match(/ALTER\s+TABLE\s+(?:ONLY\s+)?([^\s]+)\s+ADD\s+CONSTRAINT\s+[^\s]+\s+PRIMARY\s+KEY\s*\(([^)]+)\)/i);
    if (pkMatch) {
      const tableName = cleanTableName(pkMatch[1]);
      const columns = pkMatch[2].split(',').map(c => c.trim().replace(/"/g, ''));
      
      const table = tableMap.get(tableName);
      if (table) {
        columns.forEach(colName => {
          const field = table.fields.find(f => f.name === colName);
          if (field) field.primary = true;
        });
      }
    }
    
    // 提取 ALTER TABLE ADD CONSTRAINT FOREIGN KEY
    const fkMatch = statement.match(/ALTER\s+TABLE\s+(?:ONLY\s+)?([^\s]+)\s+ADD\s+CONSTRAINT\s+([^\s]+)\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)/i);
    if (fkMatch) {
      const startTableName = cleanTableName(fkMatch[1]);
      const constraintName = fkMatch[2];
      const startColumns = fkMatch[3].split(',').map(c => c.trim().replace(/"/g, ''));
      const endTableName = cleanTableName(fkMatch[4]);
      const endColumns = fkMatch[5].split(',').map(c => c.trim().replace(/"/g, ''));
      
      const startTable = tableMap.get(startTableName);
      const endTable = tableMap.get(endTableName);
      
      if (startTable && endTable && startColumns.length === 1 && endColumns.length === 1) {
        const startField = startTable.fields.find(f => f.name === startColumns[0]);
        const endField = endTable.fields.find(f => f.name === endColumns[0]);
        
        if (startField && endField) {
          relationships.push({
            id: nanoid(),
            name: constraintName,
            startTableId: startTable.id,
            startFieldId: startField.id,
            endTableId: endTable.id,
            endFieldId: endField.id,
            cardinality: startField.unique ? Cardinality.ONE_TO_ONE : Cardinality.MANY_TO_ONE,
            updateConstraint: "No action",
            deleteConstraint: "No action"
          });
        }
      }
    }
    
    // 提取 COMMENT ON TABLE
    const tableCommentMatch = statement.match(/COMMENT\s+ON\s+TABLE\s+([^\s]+)\s+IS\s+'([^']*)'|COMMENT\s+ON\s+TABLE\s+([^\s]+)\s+IS\s+"([^"]*)"/i);
    if (tableCommentMatch) {
      const tableName = cleanTableName(tableCommentMatch[1] || tableCommentMatch[3]);
      const comment = tableCommentMatch[2] || tableCommentMatch[4];
      
      const table = tableMap.get(tableName);
      if (table) {
        table.comment = comment;
      }
    }
    
    // 提取 COMMENT ON COLUMN
    const colCommentMatch = statement.match(/COMMENT\s+ON\s+COLUMN\s+([^\s]+)\.([^\s]+)\s+IS\s+'([^']*)'|COMMENT\s+ON\s+COLUMN\s+([^\s]+)\.([^\s]+)\s+IS\s+"([^"]*)"/i);
    if (colCommentMatch) {
      const tableName = cleanTableName(colCommentMatch[1] || colCommentMatch[4]);
      const columnName = (colCommentMatch[2] || colCommentMatch[5]).replace(/"/g, '');
      const comment = colCommentMatch[3] || colCommentMatch[6];
      
      const table = tableMap.get(tableName);
      if (table) {
        const field = table.fields.find(f => f.name === columnName);
        if (field) {
          field.comment = comment;
        }
      }
    }
  });
  
  // 設定位置
  tables.forEach((table, index) => {
    table.x = (index % 5) * 250;
    table.y = Math.floor(index / 5) * 300;
  });
  
  // 重新編號關聯
  relationships.forEach((rel, index) => {
    rel.id = index;
  });
  
  return { tables, relationships, types: [], enums: [] };
}

/**
 * 從 CREATE TABLE 語句中提取表格資訊
 */
function extractTable(statement) {
  // 匹配表名
  const tableMatch = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)/i);
  if (!tableMatch) return null;
  
  const fullTableName = tableMatch[1];
  const tableName = cleanTableName(fullTableName);
  
  // 提取欄位定義（在括號內）
  const fieldsMatch = statement.match(/\(([\s\S]+)\)/);
  if (!fieldsMatch) return null;
  
  const table = {
    id: nanoid(),
    name: tableName,
    comment: "",
    color: "#175e7a",
    fields: [],
    indices: [],
    x: 0,
    y: 0
  };
  
  // 分割欄位定義（簡單分割，可能不完美）
  const fieldDefs = fieldsMatch[1].split(/,(?![^(]*\))/);
  
  fieldDefs.forEach(def => {
    def = def.trim();
    
    // 跳過約束定義
    if (/^\s*(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK)/i.test(def)) {
      // 處理內聯的 PRIMARY KEY
      const pkMatch = def.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        const columns = pkMatch[1].split(',').map(c => c.trim().replace(/"/g, ''));
        columns.forEach(colName => {
          const field = table.fields.find(f => f.name === colName);
          if (field) field.primary = true;
        });
      }
      return;
    }
    
    // 提取欄位資訊
    const field = extractField(def);
    if (field) {
      table.fields.push(field);
    }
  });
  
  return table;
}

/**
 * 從欄位定義中提取欄位資訊
 */
function extractField(definition) {
  // 基本模式：欄位名 類型 [其他屬性]
  // 特別處理 character varying, double precision 等複合類型
  const match = definition.match(/^\s*"?([^"\s]+)"?\s+((?:character\s+varying|double\s+precision|timestamp\s+with(?:out)?\s+time\s+zone|time\s+with(?:out)?\s+time\s+zone|[^\s(]+))(?:\(([^)]+)\))?\s*(.*)/i);
  if (!match) return null;
  
  const field = {
    id: nanoid(),
    name: match[1].replace(/"/g, ''),
    type: normalizeType(match[2]),
    size: match[3] || "",
    comment: "",
    unique: false,
    increment: false,
    notNull: false,
    primary: false,
    default: ""
  };
  
  // 解析其他屬性
  const attributes = match[4] || "";
  
  if (/NOT\s+NULL/i.test(attributes)) field.notNull = true;
  if (/PRIMARY\s+KEY/i.test(attributes)) field.primary = true;
  if (/UNIQUE/i.test(attributes)) field.unique = true;
  if (/AUTO_INCREMENT|IDENTITY|SERIAL/i.test(definition)) field.increment = true;
  
  // 提取預設值
  const defaultMatch = attributes.match(/DEFAULT\s+([^\s,]+(?:\s*::[^\s,]+)?)/i);
  if (defaultMatch) {
    let defaultValue = defaultMatch[1].trim();
    // 清理預設值（移除類型轉換等）
    defaultValue = defaultValue.replace(/::[a-zA-Z_]+(\s+varying)?/gi, '');
    // 保留字串類型的引號，不要移除
    // defaultValue = defaultValue.replace(/^'(.*)'$/, '$1');
    // 移除可能誤包含的 NOT NULL
    defaultValue = defaultValue.replace(/\s+(NOT\s+)?NULL$/i, '');
    field.default = defaultValue;
  }
  
  return field;
}

/**
 * 清理表名（移除 schema 前綴，處理引號）
 */
function cleanTableName(fullName) {
  // 移除 schema 前綴
  let name = fullName;
  if (name.includes('.')) {
    name = name.split('.').pop();
  }
  // 移除引號
  name = name.replace(/"/g, '');
  return name;
}

/**
 * 標準化類型名稱
 */
function normalizeType(type) {
  const typeUpper = type.toUpperCase();
  
  // PostgreSQL 到通用類型的映射
  const typeMap = {
    'SERIAL': 'INTEGER',
    'BIGSERIAL': 'BIGINT',
    'SMALLSERIAL': 'SMALLINT',
    'INT2': 'SMALLINT',
    'INT4': 'INTEGER',
    'INT8': 'BIGINT',
    'FLOAT4': 'REAL',
    'FLOAT8': 'DOUBLE PRECISION',
    'BOOL': 'BOOLEAN',
    'TIMESTAMPTZ': 'TIMESTAMP WITH TIME ZONE',
    'TIMETZ': 'TIME WITH TIME ZONE',
    'CHARACTER VARYING': 'VARCHAR',
    'CHARACTER': 'CHAR',
    'BPCHAR': 'CHAR'
  };
  
  return typeMap[typeUpper] || typeUpper;
}