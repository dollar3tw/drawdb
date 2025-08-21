import { Cardinality } from "../../data/constants";
import { dbToTypes } from "../../data/datatypes";
import i18n from "../../i18n/i18n";

export function jsonToMermaid(obj) {
  function getMermaidRelationship(relationship) {
    switch (relationship) {
      case i18n.t(Cardinality.ONE_TO_ONE):
      case Cardinality.ONE_TO_ONE:
        return "||--||";
      case i18n.t(Cardinality.MANY_TO_ONE_TO_ONE):
      case Cardinality.MANY_TO_ONE:
        return "}o--||";
      case i18n.t(Cardinality.ONE_TO_MANY):
      case Cardinality.ONE_TO_MANY:
        return "||--o{";
      default:
        return "--";
    }
  }

  // 清理表格名稱，移除 schema 前綴以避免 Mermaid 解析錯誤
  function cleanTableName(name) {
    // 移除 schema 前綴 (如 public.tablename -> tablename)
    if (name && name.includes('.')) {
      return name.split('.').pop();
    }
    // 替換特殊字符以確保 Mermaid 相容性
    return name ? name.replace(/[^a-zA-Z0-9_]/g, '_') : name;
  }

  const mermaidEntities = obj.tables
    .map((table) => {
      const cleanName = cleanTableName(table.name);
      const fields = table.fields
        .map((field) => {
          const fieldType =
            field.type +
            ((dbToTypes[obj.database][field.type].isSized ||
              dbToTypes[obj.database][field.type].hasPrecision) &&
            field.size &&
            field.size !== ""
              ? "(" + field.size + ")"
              : "");
          // 清理欄位名稱中的特殊字符
          const cleanFieldName = field.name.replace(/[^a-zA-Z0-9_]/g, '_');
          return `\t\t${fieldType} ${cleanFieldName}`;
        })
        .join("\n");
      return `\t${cleanName} {\n${fields}\n\t}`;
    })
    .join("\n\n");

  const mermaidRelationships = obj.relationships?.length
    ? obj.relationships
        .map((r) => {
          const startTableOriginal = obj.tables.find(
            (t) => t.id === r.startTableId,
          ).name;
          const endTableOriginal = obj.tables.find((t) => t.id === r.endTableId).name;
          
          // 清理表格名稱
          const startTable = cleanTableName(startTableOriginal);
          const endTable = cleanTableName(endTableOriginal);
          
          return `\t${startTable} ${getMermaidRelationship(r.cardinality)} ${endTable} : references`;
        })
        .join("\n")
    : "";

  return `erDiagram\n${mermaidRelationships ? `${mermaidRelationships}\n\n` : ""}${mermaidEntities}`;
}
