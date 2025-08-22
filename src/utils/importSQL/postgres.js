import { nanoid } from "nanoid";
import { Cardinality, DB } from "../../data/constants.js";
import { dbToTypes } from "../../data/datatypes.js";
import { buildSQLFromAST } from "./shared";

// PostgreSQL 型別對應處理函數
function mapPostgreSQLType(dataType, diagramDb, affinity) {
  const normalizedType = dataType.toLowerCase();
  
  if (normalizedType === 'character varying' || normalizedType === 'varchar') {
    return 'VARCHAR';
  } else if (normalizedType === 'character' || normalizedType === 'char') {
    return 'CHAR';
  } else if (normalizedType === 'integer' || normalizedType === 'int4') {
    return 'INTEGER';
  } else if (normalizedType === 'bigint' || normalizedType === 'int8') {
    return 'BIGINT';
  } else if (normalizedType === 'smallint' || normalizedType === 'int2') {
    return 'SMALLINT';
  } else if (normalizedType === 'boolean' || normalizedType === 'bool') {
    return 'BOOLEAN';
  } else if (normalizedType === 'text') {
    return 'TEXT';
  } else if (normalizedType === 'numeric' || normalizedType === 'decimal') {
    return 'NUMERIC';
  } else if (normalizedType === 'real' || normalizedType === 'float4') {
    return 'REAL';
  } else if (normalizedType === 'double precision' || normalizedType === 'float8') {
    return 'DOUBLE PRECISION';
  } else if (normalizedType === 'timestamp' || normalizedType === 'timestamp without time zone') {
    return 'TIMESTAMP';
  } else if (normalizedType === 'timestamptz' || normalizedType === 'timestamp with time zone') {
    return 'TIMESTAMPTZ';
  } else if (normalizedType === 'date') {
    return 'DATE';
  } else if (normalizedType === 'time' || normalizedType === 'time without time zone') {
    return 'TIME';
  } else if (normalizedType === 'timetz' || normalizedType === 'time with time zone') {
    return 'TIMETZ';
  } else if (normalizedType === 'uuid') {
    return 'UUID';
  } else if (normalizedType === 'json') {
    return 'JSON';
  } else if (normalizedType === 'jsonb') {
    return 'JSONB';
  } else if (normalizedType === 'bytea') {
    return 'BYTEA';
  } else if (dbToTypes[diagramDb][dataType]) {
    return dataType;
  } else {
    return affinity[diagramDb][dataType.toUpperCase()];
  }
}

const affinity = {
  [DB.POSTGRES]: new Proxy(
    { INT: "INTEGER" },
    { get: (target, prop) => (prop in target ? target[prop] : "BLOB") },
  ),
  [DB.GENERIC]: new Proxy(
    {
      INTEGER: "INT",
      MEDIUMINT: "INTEGER",
      BIT: "BOOLEAN",
    },
    { get: (target, prop) => (prop in target ? target[prop] : "BLOB") },
  ),
};

export function fromPostgres(ast, diagramDb = DB.GENERIC) {
  const tables = [];
  const relationships = [];
  const types = [];
  const enums = [];
  
  // 追蹤表格名稱以檢測重複
  const tableNameCount = new Map(); // 記錄每個表格名稱出現的次數

  const parseSingleStatement = (e) => {
    try {
    if (e.type === "create") {
      if (e.keyword === "table") {
        const table = {};
        const schemaName = e.table[0].db;
        const tableName = e.table[0].table;
        
        // 取得當前的出現次數（在增加之前）
        const currentCount = tableNameCount.get(tableName) || 0;
        
        // 儲存表格的完整名稱（含 schema）
        const fullName = schemaName ? `${schemaName}.${tableName}` : tableName;
        
        // 如果是第一次出現
        if (currentCount === 0) {
          table.name = tableName; // 使用簡單名稱
          console.log(`第一次出現表格 ${tableName}，schema: ${schemaName || 'none'}，使用簡單名稱: ${table.name}`);
        } else {
          // 這是重複的表格名稱，第二個及之後才加上 schema 前綴
          table.name = fullName;
          console.log(`發現重複表格 ${tableName}（第 ${currentCount + 1} 次），使用完整名稱: ${table.name}`);
        }
        
        // 更新出現次數
        tableNameCount.set(tableName, currentCount + 1);
        table.comment = "";
        table.color = "#175e7a";
        table.fields = [];
        table.indices = [];
        table.id = nanoid();
        table.x = 0;
        table.y = 0;
        e.create_definitions.forEach((d) => {
          const field = {};
          if (d.resource === "column") {
            field.id = nanoid();
            field.name = d.column.column.expr.value;

            let type = types.find((t) =>
              new RegExp(`^(${t.name}|"${t.name}")$`).test(
                d.definition.dataType,
              ),
            )?.name;
            type ??= enums.find((t) =>
              new RegExp(`^(${t.name}|"${t.name}")$`).test(
                d.definition.dataType,
              ),
            )?.name;
            
            // PostgreSQL 型別對應處理
            if (!type) {
              type = mapPostgreSQLType(d.definition.dataType, diagramDb, affinity);
            }
            field.type = type;

            if (d.definition.expr && d.definition.expr.type === "expr_list") {
              field.values = d.definition.expr.value.map((v) => v.value);
            }
            field.comment = d.comment ? d.comment.value.value : "";
            field.unique = false;
            if (d.unique) field.unique = true;
            field.increment = false;
            if (d.auto_increment) field.increment = true;
            field.notNull = false;
            if (d.nullable) field.notNull = true;
            field.primary = false;
            if (d.primary_key) field.primary = true;
            field.default = "";
            if (d.default_val) {
              let defaultValue = "";
              if (d.default_val.value.type === "function") {
                defaultValue = d.default_val.value.name.name[0].value;
                if (d.default_val.value.args) {
                  defaultValue +=
                    "(" +
                    d.default_val.value.args.value
                      .map((v) => {
                        if (
                          v.type === "single_quote_string" ||
                          v.type === "double_quote_string"
                        )
                          return "'" + v.value + "'";
                        return v.value;
                      })
                      .join(", ") +
                    ")";
                }
              } else if (d.default_val.value.type === "null") {
                defaultValue = "NULL";
              } else if (d.default_val.value.type === "cast") {
                defaultValue = d.default_val.value.expr.value;
              } else {
                defaultValue = d.default_val.value.value.toString();
              }
              field.default = defaultValue;
            }
            if (d.definition["length"]) {
              if (d.definition.scale) {
                field.size = d.definition["length"] + "," + d.definition.scale;
              } else {
                field.size = d.definition["length"];
              }
            }
            field.check = "";
            if (d.check) {
              field.check = buildSQLFromAST(d.check.definition[0], DB.POSTGRES);
            }

            table.fields.push(field);
          } else if (d.resource === "constraint") {
            // 使用小寫比較以處理大小寫差異
            if (d.constraint_type && d.constraint_type.toLowerCase() === "primary key") {
              d.definition.forEach((c) => {
                table.fields.forEach((f) => {
                  if (f.name === c.column.expr.value && !f.primary) {
                    f.primary = true;
                  }
                });
              });
            } else if (d.constraint_type && d.constraint_type.toLowerCase() === "foreign key") {
              const relationship = {};
              const startTableId = table.id;
              const startTableName = e.table[0].table;
              const startFieldName = d.definition[0].column.expr.value;
              const endTableName = d.reference_definition.table[0].table;
              const endFieldName =
                d.reference_definition.definition[0].column.expr.value;

              const endTable = tables.find((t) => t.name === endTableName);
              if (!endTable) return;

              const endField = endTable.fields.find(
                (f) => f.name === endFieldName,
              );
              if (!endField) return;

              const startField = table.fields.find(
                (f) => f.name === startFieldName,
              );
              if (!startField) return;

              relationship.name = `fk_${startTableName}_${startFieldName}_${endTableName}`;
              relationship.startTableId = startTableId;
              relationship.endTableId = endTable.id;
              relationship.endFieldId = endField.id;
              relationship.startFieldId = startField.id;
              let updateConstraint = "No action";
              let deleteConstraint = "No action";
              d.reference_definition.on_action.forEach((c) => {
                if (c.type === "on update") {
                  updateConstraint = c.value.value;
                  updateConstraint =
                    updateConstraint[0].toUpperCase() +
                    updateConstraint.substring(1);
                } else if (c.type === "on delete") {
                  deleteConstraint = c.value.value;
                  deleteConstraint =
                    deleteConstraint[0].toUpperCase() +
                    deleteConstraint.substring(1);
                }
              });

              relationship.updateConstraint = updateConstraint;
              relationship.deleteConstraint = deleteConstraint;
              if (startField.unique) {
                relationship.cardinality = Cardinality.ONE_TO_ONE;
              } else {
                relationship.cardinality = Cardinality.MANY_TO_ONE;
              }
              relationships.push(relationship);
            }
          }

          if (d.reference_definition) {
            const relationship = {};
            const startTableName = table.name;
            const startFieldName = field.name;
            const endTableName = d.reference_definition.table[0].table;
            const endFieldName =
              d.reference_definition.definition[0].column.expr.value;
            let updateConstraint = "No action";
            let deleteConstraint = "No action";
            d.reference_definition.on_action.forEach((c) => {
              if (c.type === "on update") {
                updateConstraint = c.value.value;
                updateConstraint =
                  updateConstraint[0].toUpperCase() +
                  updateConstraint.substring(1);
              } else if (c.type === "on delete") {
                deleteConstraint = c.value.value;
                deleteConstraint =
                  deleteConstraint[0].toUpperCase() +
                  deleteConstraint.substring(1);
              }
            });

            const startTableId = tables.length;

            const endTable = tables.find((t) => t.name === endTableName);
            if (!endTable) return;

            const endField = endTable.fields.findIndex(
              (f) => f.name === endFieldName,
            );
            if (!endField) return;

            const startField = table.fields.find(
              (f) => f.name === startFieldName,
            );
            if (!startField) return;

            relationship.name = `fk_${startTableName}_${startFieldName}_${endTableName}`;
            relationship.startTableId = startTableId;
            relationship.startFieldId = startField.id;
            relationship.endTableId = endTable.id;
            relationship.endFieldId = endField.id;
            relationship.updateConstraint = updateConstraint;
            relationship.deleteConstraint = deleteConstraint;

            if (startField.unique) {
              relationship.cardinality = Cardinality.ONE_TO_ONE;
            } else {
              relationship.cardinality = Cardinality.MANY_TO_ONE;
            }

            relationships.push(relationship);

            relationships.forEach((r, i) => (r.id = i));
          }
        });
        tables.push(table);
      } else if (e.keyword === "index") {
        const index = {
          name: e.index,
          unique: e.index_type === "unique",
          fields: e.index_columns.map((f) => f.column.expr.value),
        };

        const table = tables.find((t) => t.name === e.table.table);

        if (table) {
          table.indices.push(index);
          table.indices.forEach((i, j) => {
            i.id = j;
          });
        }
      } else if (e.keyword === "type") {
        if (e.resource === "enum") {
          const newEnum = {
            name: e.name.name,
            values: e.create_definitions.value.map((x) => x.value),
          };
          enums.push(newEnum);
        } else if (Array.isArray(e.create_definitions)) {
          const type = {
            name: e.name.name,
            fields: [],
          };
          e.create_definitions.forEach((d) => {
            const field = {};
            if (d.resource === "column") {
              field.name = d.column.column.expr.value;

              let type = d.definition.dataType;
              if (!dbToTypes[diagramDb][type]) {
                type = mapPostgreSQLType(type, diagramDb, affinity);
              }
              field.type = type;
            }
            if (d.definition["length"]) {
              if (d.definition.scale) {
                field.size = d.definition["length"] + "," + d.definition.scale;
              } else {
                field.size = d.definition["length"];
              }
            }

            type.fields.push(field);
          });
          types.push(type);
        }
      }
    } else if (e.type === "alter") {
      e.expr.forEach((expr) => {
        // 處理 ALTER TABLE ADD CONSTRAINT PRIMARY KEY
        if (
          expr.action === "add" &&
          expr.create_definitions &&
          expr.create_definitions.constraint_type &&
          expr.create_definitions.constraint_type.toLowerCase() === "primary key"
        ) {
          // 處理可能包含 schema 的表名（如 public.table_name）
          const tableName = e.table[0].table;
          const schemaName = e.table[0].db;
          const fullName = schemaName ? `${schemaName}.${tableName}` : tableName;
          
          // 根據重複情況決定要尋找的表格名稱
          let table;
          const duplicateCount = tableNameCount.get(tableName) || 0;
          
          if (duplicateCount <= 1) {
            // 沒有重複，使用簡單名稱
            table = tables.find((t) => t.name === tableName);
          } else {
            // 有重複，需要使用完整名稱尋找
            table = tables.find((t) => t.name === fullName);
            if (!table) {
              // 如果找不到，可能第一個表格還沒更新名稱，再試試簡單名稱
              table = tables.find((t) => t.name === tableName);
            }
          }
          
          if (table && expr.create_definitions.definition) {
            // 設定 PRIMARY KEY 欄位
            expr.create_definitions.definition.forEach((c) => {
              // 處理不同的欄位格式
              const columnName = c.column?.expr?.value || c.column?.column || c.column || c;
              
              table.fields.forEach((f) => {
                if (f.name === columnName && !f.primary) {
                  f.primary = true;
                }
              });
            });
          }
        }
        // 處理 ALTER TABLE ADD CONSTRAINT FOREIGN KEY
        else if (
          expr.action === "add" &&
          expr.create_definitions &&
          expr.create_definitions.constraint_type &&
          expr.create_definitions.constraint_type.toLowerCase() === "foreign key"
        ) {
          const relationship = {};
          const startTableName = e.table[0].table;
          const startFieldName =
            expr.create_definitions.definition[0].column.expr.value;
          const endTableName =
            expr.create_definitions.reference_definition.table[0].table;
          const endFieldName =
            expr.create_definitions.reference_definition.definition[0].column
              .expr.value;
          let updateConstraint = "No action";
          let deleteConstraint = "No action";
          expr.create_definitions.reference_definition.on_action.forEach(
            (c) => {
              if (c.type === "on update") {
                updateConstraint = c.value.value;
                updateConstraint =
                  updateConstraint[0].toUpperCase() +
                  updateConstraint.substring(1);
              } else if (c.type === "on delete") {
                deleteConstraint = c.value.value;
                deleteConstraint =
                  deleteConstraint[0].toUpperCase() +
                  deleteConstraint.substring(1);
              }
            },
          );

          const startTable = tables.find((t) => t.name === startTableName);
          if (!startTable) return;

          const endTable = tables.find((t) => t.name === endTableName);
          if (!endTable) return;

          const endField = endTable.fields.find((f) => f.name === endFieldName);
          if (!endField) return;

          const startField = startTable.fields.find(
            (f) => f.name === startFieldName,
          );
          if (!startField) return;

          relationship.name = `fk_${startTableName}_${startFieldName}_${endTableName}`;
          relationship.startTableId = startTable.id;
          relationship.startFieldId = startField.id;
          relationship.endTableId = endTable.id;
          relationship.endFieldId = endField.id;
          relationship.updateConstraint = updateConstraint;
          relationship.deleteConstraint = deleteConstraint;
          relationship.cardinality = Cardinality.ONE_TO_ONE;

          if (startField.unique) {
            relationship.cardinality = Cardinality.ONE_TO_ONE;
          } else {
            relationship.cardinality = Cardinality.MANY_TO_ONE;
          }

          relationships.push(relationship);

          relationships.forEach((r, i) => (r.id = i));
        }
      });
    }
    } catch (error) {
      console.warn(`跳過無法解析的語句:`, e?.type || 'unknown', error.message);
      // 繼續處理其他語句而不中斷
    }
  };

  try {
    if (Array.isArray(ast)) {
      ast.forEach((e) => parseSingleStatement(e));
    } else {
      parseSingleStatement(ast);
    }
  } catch (error) {
    console.error('PostgreSQL 解析發生嚴重錯誤:', error);
    throw new Error(`解析失敗: ${error.message}`);
  }

  relationships.forEach((r, i) => (r.id = i));

  return { tables, relationships, types, enums };
}
