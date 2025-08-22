/**
 * SQL 預處理器
 * 自動過濾掉不支援的 SQL 語句，只保留 CREATE TABLE 和相關的 ALTER TABLE
 */

/**
 * 預處理 SQL 內容，移除不支援的語句
 * @param {string} sqlContent - 原始 SQL 內容
 * @returns {string} - 清理後的 SQL
 */
export function preprocessSQL(sqlContent) {
  // 移除註解
  let cleanedSQL = sqlContent
    // 移除單行註解 (-- comment)
    .replace(/--.*$/gm, '')
    // 移除多行註解 (/* comment */)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // 移除 TOC entry 註解
    .replace(/^--\s*TOC entry.*$/gm, '');

  // 需要過濾的語句模式
  const patternsToRemove = [
    // SET 語句
    /^SET\s+.*;$/gmi,
    // SELECT 語句（通常是設定用）
    /^SELECT\s+.*;$/gmi,
    // CREATE SCHEMA
    /^CREATE\s+SCHEMA\s+.*;$/gmi,
    // CREATE EXTENSION
    /^CREATE\s+EXTENSION\s+.*;$/gmi,
    // CREATE FUNCTION (改進的正規表達式，處理 $$ 定界符)
    /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+[\s\S]*?(?:\$[^$]*\$[\s\S]*?\$[^$]*\$|AS\s*'[\s\S]*?')\s*;/gmi,
    // CREATE PROCEDURE (改進的正規表達式)
    /CREATE\s+(OR\s+REPLACE\s+)?PROCEDURE\s+[\s\S]*?(?:\$[^$]*\$[\s\S]*?\$[^$]*\$|AS\s*'[\s\S]*?')\s*;/gmi,
    // CREATE TRIGGER
    /^CREATE\s+TRIGGER\s+[\s\S]*?;/gmi,
    // CREATE VIEW
    /^CREATE\s+(OR\s+REPLACE\s+)?VIEW\s+[\s\S]*?;/gmi,
    // CREATE SEQUENCE
    /^CREATE\s+SEQUENCE\s+[\s\S]*?;/gmi,
    // CREATE INDEX (保留，但如果造成問題可以移除)
    // /^CREATE\s+(UNIQUE\s+)?INDEX\s+[\s\S]*?;/gmi,
    // CREATE SERVER
    /^CREATE\s+SERVER\s+[\s\S]*?;/gmi,
    // CREATE USER MAPPING
    /^CREATE\s+USER\s+MAPPING\s+[\s\S]*?;/gmi,
    // CREATE FOREIGN TABLE
    /^CREATE\s+FOREIGN\s+TABLE\s+[\s\S]*?;/gmi,
    // ALTER SEQUENCE
    /^ALTER\s+SEQUENCE\s+[\s\S]*?;/gmi,
    // GRANT/REVOKE 權限語句
    /^(GRANT|REVOKE)\s+[\s\S]*?;/gmi,
    // COMMENT ON
    /^COMMENT\s+ON\s+[\s\S]*?;/gmi,
    // ANALYZE
    /^ANALYZE\s+[\s\S]*?;/gmi,
    // VACUUM
    /^VACUUM\s+[\s\S]*?;/gmi,
    // BEGIN/COMMIT/ROLLBACK
    /^(BEGIN|COMMIT|ROLLBACK)(\s+[\s\S]*?)?;/gmi,
    // DROP 語句
    /^DROP\s+[\s\S]*?;/gmi,
    // USE 語句
    /^USE\s+[\s\S]*?;/gmi,
    // INSERT/UPDATE/DELETE 資料操作
    /^(INSERT|UPDATE|DELETE)\s+[\s\S]*?;/gmi,
    // COPY 語句
    /^COPY\s+[\s\S]*?;/gmi,
    // \\. (PostgreSQL COPY 資料結束標記)
    /^\\\.$/gmi,
    // SET default_table_access_method
    /^SET\s+default_table_access_method\s*=.*?;/gmi,
    // ALTER TABLE OWNER TO
    /^ALTER\s+TABLE\s+.*?\s+OWNER\s+TO\s+.*?;/gmi,
    // ALTER FUNCTION/PROCEDURE OWNER TO
    /^ALTER\s+(FUNCTION|PROCEDURE)\s+.*?\s+OWNER\s+TO\s+.*?;/gmi,
    // ALTER SCHEMA OWNER TO
    /^ALTER\s+SCHEMA\s+.*?\s+OWNER\s+TO\s+.*?;/gmi,
    // TOC 註解
    /^--\s*TOC entry[\s\S]*?$/gmi,
    // PostgreSQL 特定的 SET 語句
    /^SET\s+(statement_timeout|lock_timeout|idle_in_transaction_session_timeout|client_encoding|standard_conforming_strings|check_function_bodies|xmloption|client_min_messages|row_security)\s*=.*;$/gmi,
    // SELECT pg_catalog.set_config
    /^SELECT\s+pg_catalog\.set_config\s*\([\s\S]*?\)\s*;/gmi,
    // COMMENT ON
    /^COMMENT\s+ON\s+[\s\S]*?;/gmi,
    // GRANT 權限語句
    /^GRANT\s+[\s\S]*?;/gmi,
    // REVOKE 權限語句  
    /^REVOKE\s+[\s\S]*?;/gmi,
    // CREATE TRIGGER
    /^CREATE\s+TRIGGER\s+[\s\S]*?;/gmi,
    // 任何包含 ACL 的語句
    /^.*ACL.*$/gmi,
    // TOC entry 註解（更完整的匹配）
    /^--\s*TOC\s+entry[\s\S]*$/gmi,
    // Dependencies 註解
    /^--\s*Dependencies:[\s\S]*$/gmi,
    // Name: ... Type: ... 註解
    /^--\s*Name:[\s\S]*?Type:[\s\S]*$/gmi,
    // Dumped from/by 註解
    /^--\s*Dumped\s+(from|by)[\s\S]*$/gmi,
    // Started on 註解
    /^--\s*Started\s+on[\s\S]*$/gmi,
    // Completed on 註解  
    /^--\s*Completed\s+on[\s\S]*$/gmi,
  ];

  // 特殊處理：先移除所有 $$ 定界的函數/程序
  cleanedSQL = removePostgresFunctions(cleanedSQL);
  
  // 應用所有過濾模式
  patternsToRemove.forEach(pattern => {
    cleanedSQL = cleanedSQL.replace(pattern, '');
  });

  // 特殊處理：移除 DEFAULT 中的某些函數呼叫
  cleanedSQL = cleanedSQL.replace(/DEFAULT\s+nextval\([^)]+\)/gi, '');
  
  // 移除 PostgreSQL 的類型轉換語法 (::type)
  cleanedSQL = cleanedSQL.replace(/::[a-zA-Z_][a-zA-Z0-9_]*(\s+varying)?(\[\])?/gi, '');
  
  // 移除 PostgreSQL 特定的 ALTER COLUMN ... SET AUTO_INCREMENT 語句
  cleanedSQL = cleanedSQL.replace(/ALTER\s+TABLE\s+[^;]*ALTER\s+COLUMN\s+[^;]*SET\s+AUTO_INCREMENT\s*;/gmi, '');
  
  // 清理可能剩下的不完整 ALTER COLUMN SET 語句
  cleanedSQL = cleanedSQL.replace(/ALTER\s+TABLE\s+[^;]*ALTER\s+COLUMN\s+[^;]*SET\s*;/gmi, '');
  
  // 特殊處理：為 SQL 保留字添加引號
  cleanedSQL = fixReservedWords(cleanedSQL);
  
  // 清理多餘的空行
  cleanedSQL = cleanedSQL
    .split('\n')
    .filter(line => line.trim() !== '')
    .join('\n');

  // 確保每個語句都以分號結尾
  cleanedSQL = cleanedSQL
    .split(';')
    .filter(statement => {
      const trimmed = statement.trim();
      // 只保留 CREATE TABLE 和 ALTER TABLE
      return trimmed.length > 0 && (
        /^CREATE\s+TABLE/i.test(trimmed) ||
        /^ALTER\s+TABLE/i.test(trimmed) && !/OWNER\s+TO/i.test(trimmed)
      );
    })
    .map(statement => {
      let stmt = statement.trim();
      // 處理保留字作為表名的情況（如 hangfire.set）
      // PostgreSQL 保留字列表（擴展）
      const reservedWords = 'set|order|group|select|insert|update|delete|from|where|join|left|right|inner|outer|on|as|table|column|index|key|primary|foreign|references|constraint|unique|not|null|default|check|view|trigger|function|procedure|begin|end|if|then|else|case|when|between|in|like|is|and|or|having|order|by|asc|desc|limit|offset|union|all|distinct|count|sum|avg|max|min|lock|schema|state|user|password|role|grant|revoke|execute|create|alter|drop|database|sequence|type|domain|cast|operator|aggregate|language|conversion|extension|server|wrapper|mapping|publication|subscription|policy|rule|event|statistics|collation|family|access|method|tablespace|configuration|dictionary|parser|template';
      
      // 為包含 schema 的保留字表名添加引號
      const reservedPattern = new RegExp(
        `CREATE\\s+TABLE\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\.(${reservedWords})\\s*\\(`,
        'gi'
      );
      stmt = stmt.replace(reservedPattern, (match, schema, keyword) => 
        `CREATE TABLE ${schema}."${keyword}" (`
      );
      
      // 同樣處理 ALTER TABLE
      const alterPattern = new RegExp(
        `ALTER\\s+TABLE\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\.(${reservedWords})\\s+`,
        'gi'
      );
      stmt = stmt.replace(alterPattern, (match, schema, keyword) => 
        `ALTER TABLE ${schema}."${keyword}" `
      );
      
      return stmt + ';';
    })
    .join('\n\n');

  return cleanedSQL;
}

/**
 * 檢查 SQL 是否包含不支援的語句
 * @param {string} sqlContent - SQL 內容
 * @returns {object} - { hasUnsupported: boolean, unsupportedTypes: string[] }
 */
export function detectUnsupportedStatements(sqlContent) {
  const unsupportedTypes = new Set();
  
  const checks = [
    { pattern: /CREATE\s+FUNCTION/i, type: 'FUNCTION' },
    { pattern: /CREATE\s+PROCEDURE/i, type: 'PROCEDURE' },
    { pattern: /CREATE\s+VIEW/i, type: 'VIEW' },
    { pattern: /CREATE\s+TRIGGER/i, type: 'TRIGGER' },
    { pattern: /CREATE\s+SEQUENCE/i, type: 'SEQUENCE' },
    { pattern: /CREATE\s+SCHEMA/i, type: 'SCHEMA' },
    { pattern: /CREATE\s+EXTENSION/i, type: 'EXTENSION' },
    { pattern: /CREATE\s+SERVER/i, type: 'SERVER' },
    { pattern: /CREATE\s+FOREIGN\s+TABLE/i, type: 'FOREIGN TABLE' },
  ];

  checks.forEach(({ pattern, type }) => {
    if (pattern.test(sqlContent)) {
      unsupportedTypes.add(type);
    }
  });

  return {
    hasUnsupported: unsupportedTypes.size > 0,
    unsupportedTypes: Array.from(unsupportedTypes)
  };
}

/**
 * 提取表格名稱列表
 * @param {string} sqlContent - SQL 內容
 * @returns {string[]} - 表格名稱陣列
 */
export function extractTableNames(sqlContent) {
  const tableNames = new Set();
  
  // 匹配 CREATE TABLE 語句
  const createTablePattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(?:"([^"]+)")|(?:([^\s(]+)))/gi;
  let match;
  
  while ((match = createTablePattern.exec(sqlContent)) !== null) {
    const tableName = match[1] || match[2];
    if (tableName) {
      // 移除 schema 前綴（如 public.table_name）
      const cleanName = tableName.includes('.') ? 
        tableName.split('.').pop() : 
        tableName;
      tableNames.add(cleanName);
    }
  }
  
  return Array.from(tableNames);
}

/**
 * 提取並統計 SQL 內容
 * @param {string} sqlContent - SQL 內容
 * @returns {object} - 統計資訊
 */
export function analyzeSQLContent(sqlContent) {
  const cleaned = preprocessSQL(sqlContent);
  const tables = extractTableNames(cleaned);
  
  // 計算 ALTER TABLE 語句
  const alterTableCount = (cleaned.match(/ALTER\s+TABLE/gi) || []).length;
  
  // 計算外鍵約束
  const foreignKeyCount = (cleaned.match(/FOREIGN\s+KEY/gi) || []).length;
  
  return {
    tableCount: tables.length,
    tableNames: tables,
    alterTableCount,
    foreignKeyCount,
    cleanedSQL: cleaned
  };
}

/**
 * 移除 PostgreSQL 的函數和程序定義（使用 $$ 定界符）
 * @param {string} sql - SQL 內容
 * @returns {string} - 清理後的 SQL
 */
function removePostgresFunctions(sql) {
  // 處理 PostgreSQL 函數/程序定義
  let result = sql;
  
  // 多次處理，直到沒有更多的函數
  let hasChanges = true;
  while (hasChanges) {
    const before = result.length;
    
    // 處理單一 $ 定界符的函數（不完整的語法，但 pg_dump 可能產生）
    result = result.replace(
      /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+[\s\S]*?AS\s+\$[\s\S]*?\$\s*;/gmi,
      ''
    );
    
    // 處理標準 $$ 定界符的函數
    result = result.replace(
      /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+[\s\S]*?\$\$[\s\S]*?\$\$\s*;/gmi,
      ''
    );
    
    // 處理自定義標籤的函數 $tag$ ... $tag$
    result = result.replace(
      /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+[\s\S]*?\$[a-zA-Z0-9_]*\$[\s\S]*?\$[a-zA-Z0-9_]*\$\s*;/gmi,
      ''
    );
    
    // 特別處理 $_$ 定界符（pgAdmin 常用）
    result = result.replace(
      /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+[\s\S]*?\$_\$[\s\S]*?\$_\$\s*;/gmi,
      ''
    );
    
    // 處理 PROCEDURE
    result = result.replace(
      /CREATE\s+(OR\s+REPLACE\s+)?PROCEDURE\s+[\s\S]*?AS\s+\$[\s\S]*?\$\s*;/gmi,
      ''
    );
    
    result = result.replace(
      /CREATE\s+(OR\s+REPLACE\s+)?PROCEDURE\s+[\s\S]*?\$\$[\s\S]*?\$\$\s*;/gmi,
      ''
    );
    
    result = result.replace(
      /CREATE\s+(OR\s+REPLACE\s+)?PROCEDURE\s+[\s\S]*?\$[a-zA-Z0-9_]*\$[\s\S]*?\$[a-zA-Z0-9_]*\$\s*;/gmi,
      ''
    );
    
    // 特別處理 $_$ 定界符（pgAdmin 常用）
    result = result.replace(
      /CREATE\s+(OR\s+REPLACE\s+)?PROCEDURE\s+[\s\S]*?\$_\$[\s\S]*?\$_\$\s*;/gmi,
      ''
    );
    
    // 處理 ALTER FUNCTION
    result = result.replace(
      /ALTER\s+FUNCTION\s+[\s\S]*?AS\s+\$[\s\S]*?\$\s*;/gmi,
      ''
    );
    
    result = result.replace(
      /ALTER\s+FUNCTION\s+[\s\S]*?\$\$[\s\S]*?\$\$\s*;/gmi,
      ''
    );
    
    result = result.replace(
      /ALTER\s+FUNCTION\s+[\s\S]*?\$[a-zA-Z0-9_]*\$[\s\S]*?\$[a-zA-Z0-9_]*\$\s*;/gmi,
      ''
    );
    
    result = result.replace(
      /ALTER\s+FUNCTION\s+[\s\S]*?\$_\$[\s\S]*?\$_\$\s*;/gmi,
      ''
    );
    
    // 處理 ALTER PROCEDURE
    result = result.replace(
      /ALTER\s+PROCEDURE\s+[\s\S]*?AS\s+\$[\s\S]*?\$\s*;/gmi,
      ''
    );
    
    result = result.replace(
      /ALTER\s+PROCEDURE\s+[\s\S]*?\$\$[\s\S]*?\$\$\s*;/gmi,
      ''
    );
    
    result = result.replace(
      /ALTER\s+PROCEDURE\s+[\s\S]*?\$[a-zA-Z0-9_]*\$[\s\S]*?\$[a-zA-Z0-9_]*\$\s*;/gmi,
      ''
    );
    
    result = result.replace(
      /ALTER\s+PROCEDURE\s+[\s\S]*?\$_\$[\s\S]*?\$_\$\s*;/gmi,
      ''
    );
    
    hasChanges = result.length < before;
  }
  
  return result;
}

/**
 * 修復 SQL 保留字問題，為保留字添加引號
 * @param {string} sql - SQL 內容
 * @returns {string} - 修復後的 SQL
 */
function fixReservedWords(sql) {
  // 常見的 SQL 保留字列表
  const reservedWords = [
    'show', 'order', 'group', 'select', 'insert', 'update', 'delete', 'from', 'where',
    'join', 'left', 'right', 'inner', 'outer', 'on', 'as', 'table', 'column', 'index',
    'key', 'primary', 'foreign', 'references', 'constraint', 'unique', 'not', 'null',
    'default', 'auto_increment', 'timestamp', 'date', 'time', 'year', 'month', 'day',
    'hour', 'minute', 'second', 'case', 'when', 'then', 'else', 'end', 'if', 'exists',
    'between', 'in', 'like', 'is', 'and', 'or', 'having', 'order', 'by', 'asc', 'desc',
    'limit', 'offset', 'union', 'all', 'distinct', 'count', 'sum', 'avg', 'max', 'min'
  ];

  // 為每個保留字添加引號（如果它們作為欄位名稱出現）
  reservedWords.forEach(word => {
    // 匹配欄位名稱（在 CREATE TABLE 語句中）
    const fieldPattern = new RegExp(`(^\\s*|,\\s*)${word}(\\s+)`, 'gmi');
    sql = sql.replace(fieldPattern, `$1"${word}"$2`);
    
    // 匹配已經在括號中但沒有引號的情況
    const parenthesesPattern = new RegExp(`\\(\\s*${word}\\s*\\)`, 'gmi');
    sql = sql.replace(parenthesesPattern, `("${word}")`);
  });

  return sql;
}