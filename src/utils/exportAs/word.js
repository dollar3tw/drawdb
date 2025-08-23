import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType, HeadingLevel, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

/**
 * 匯出資料表清單及欄位說明為 Word 檔案
 * @param {Object} diagram - 圖表資料
 * @param {string} title - 文件標題
 */
export const exportToWord = async (diagram, title = "資料庫設計文件") => {
  try {
    const { tables = [], relationships = [] } = diagram;
    
    // 建立文件區段
    const sections = [];
    
    // 標題頁
    sections.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),
      new Paragraph({
        text: `生成時間：${new Date().toLocaleString('zh-TW')}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        text: `共 ${tables.length} 個資料表`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 }
      })
    );
    
    // 目錄
    sections.push(
      new Paragraph({
        text: "目錄",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );
    
    tables.forEach((table, index) => {
      sections.push(
        new Paragraph({
          text: `${index + 1}. ${table.name}${table.comment ? ` - ${table.comment}` : ''}`,
          spacing: { before: 100 },
          indent: { left: 360 }
        })
      );
    });
    
    // 分頁
    sections.push(
      new Paragraph({
        text: "",
        pageBreakBefore: true
      })
    );
    
    // 每個資料表的詳細內容
    tables.forEach((table, tableIndex) => {
      // 資料表標題
      sections.push(
        new Paragraph({
          text: `${tableIndex + 1}. ${table.name}`,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        })
      );
      
      // 資料表註解
      if (table.comment) {
        sections.push(
          new Paragraph({
            text: `說明：${table.comment}`,
            spacing: { after: 200 }
          })
        );
      }
      
      // 建立欄位表格
      const tableRows = [];
      
      // 表格標題列
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                text: "欄位名稱",
                alignment: AlignmentType.CENTER,
                bold: true
              })],
              width: { size: 20, type: WidthType.PERCENTAGE },
              shading: { fill: "E0E0E0" }
            }),
            new TableCell({
              children: [new Paragraph({ 
                text: "資料型態",
                alignment: AlignmentType.CENTER,
                bold: true
              })],
              width: { size: 15, type: WidthType.PERCENTAGE },
              shading: { fill: "E0E0E0" }
            }),
            new TableCell({
              children: [new Paragraph({ 
                text: "允許空值",
                alignment: AlignmentType.CENTER,
                bold: true
              })],
              width: { size: 10, type: WidthType.PERCENTAGE },
              shading: { fill: "E0E0E0" }
            }),
            new TableCell({
              children: [new Paragraph({ 
                text: "主鍵",
                alignment: AlignmentType.CENTER,
                bold: true
              })],
              width: { size: 8, type: WidthType.PERCENTAGE },
              shading: { fill: "E0E0E0" }
            }),
            new TableCell({
              children: [new Paragraph({ 
                text: "唯一",
                alignment: AlignmentType.CENTER,
                bold: true
              })],
              width: { size: 8, type: WidthType.PERCENTAGE },
              shading: { fill: "E0E0E0" }
            }),
            new TableCell({
              children: [new Paragraph({ 
                text: "預設值",
                alignment: AlignmentType.CENTER,
                bold: true
              })],
              width: { size: 12, type: WidthType.PERCENTAGE },
              shading: { fill: "E0E0E0" }
            }),
            new TableCell({
              children: [new Paragraph({ 
                text: "註解說明",
                alignment: AlignmentType.CENTER,
                bold: true
              })],
              width: { size: 27, type: WidthType.PERCENTAGE },
              shading: { fill: "E0E0E0" }
            })
          ]
        })
      );
      
      // 欄位資料列
      table.fields.forEach((field) => {
        const dataType = field.type + (field.size ? `(${field.size})` : '');
        
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: field.name || '' })],
                width: { size: 20, type: WidthType.PERCENTAGE }
              }),
              new TableCell({
                children: [new Paragraph({ text: dataType })],
                width: { size: 15, type: WidthType.PERCENTAGE }
              }),
              new TableCell({
                children: [new Paragraph({ 
                  text: field.notNull ? "否" : "是",
                  alignment: AlignmentType.CENTER
                })],
                width: { size: 10, type: WidthType.PERCENTAGE }
              }),
              new TableCell({
                children: [new Paragraph({ 
                  text: field.primary ? "✓" : "",
                  alignment: AlignmentType.CENTER
                })],
                width: { size: 8, type: WidthType.PERCENTAGE }
              }),
              new TableCell({
                children: [new Paragraph({ 
                  text: field.unique ? "✓" : "",
                  alignment: AlignmentType.CENTER
                })],
                width: { size: 8, type: WidthType.PERCENTAGE }
              }),
              new TableCell({
                children: [new Paragraph({ text: field.default || '' })],
                width: { size: 12, type: WidthType.PERCENTAGE }
              }),
              new TableCell({
                children: [new Paragraph({ text: field.comment || '' })],
                width: { size: 27, type: WidthType.PERCENTAGE }
              })
            ]
          })
        );
      });
      
      // 將表格加入文件
      sections.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
            insideVertical: { style: BorderStyle.SINGLE, size: 1 }
          }
        })
      );
      
      // 索引資訊
      if (table.indices && table.indices.length > 0) {
        sections.push(
          new Paragraph({
            text: "索引：",
            bold: true,
            spacing: { before: 200, after: 100 }
          })
        );
        
        table.indices.forEach((index) => {
          sections.push(
            new Paragraph({
              text: `• ${index.name || 'unnamed'} (${index.fields.join(', ')})${index.unique ? ' - 唯一索引' : ''}`,
              indent: { left: 360 }
            })
          );
        });
      }
      
      // 關聯資訊
      const relatedRelationships = relationships.filter(
        r => r.startTableId === table.id || r.endTableId === table.id
      );
      
      if (relatedRelationships.length > 0) {
        sections.push(
          new Paragraph({
            text: "關聯：",
            bold: true,
            spacing: { before: 200, after: 100 }
          })
        );
        
        relatedRelationships.forEach((rel) => {
          const startTable = tables.find(t => t.id === rel.startTableId);
          const endTable = tables.find(t => t.id === rel.endTableId);
          const startField = startTable?.fields.find(f => f.id === rel.startFieldId);
          const endField = endTable?.fields.find(f => f.id === rel.endFieldId);
          
          if (startTable && endTable && startField && endField) {
            sections.push(
              new Paragraph({
                text: `• ${startTable.name}.${startField.name} → ${endTable.name}.${endField.name} (${rel.cardinality || 'one-to-one'})`,
                indent: { left: 360 }
              })
            );
          }
        });
      }
      
      // 如果不是最後一個表格，加入分頁
      if (tableIndex < tables.length - 1) {
        sections.push(
          new Paragraph({
            text: "",
            pageBreakBefore: true
          })
        );
      }
    });
    
    // 建立文件
    const doc = new Document({
      sections: [{
        properties: {},
        children: sections
      }],
      creator: "MiTDB",
      title: title,
      description: "資料庫設計文件"
    });
    
    // 生成檔案
    const blob = await Packer.toBlob(doc);
    
    // 下載檔案
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `${title}_${timestamp}.docx`;
    saveAs(blob, filename);
    
    return { success: true, filename };
    
  } catch (error) {
    console.error('匯出 Word 檔案失敗:', error);
    return { success: false, error: error.message };
  }
};