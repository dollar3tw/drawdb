import { useMemo, useState } from "react";
import {
  Tab,
  ObjectType,
  tableFieldHeight,
  tableHeaderHeight,
  tableColorStripHeight,
} from "../../data/constants";
import {
  IconMinus,
  IconKeyStroked,
} from "@douyinfe/semi-icons";
import { SideSheet, Input } from "@douyinfe/semi-ui";
import { useLayout, useSettings, useDiagram, useSelect, useUndoRedo } from "../../hooks";
import TableInfo from "../EditorSidePanel/TablesTab/TableInfo";
import { useTranslation } from "react-i18next";
import { dbToTypes } from "../../data/datatypes";
import { isRtl } from "../../i18n/utils/rtl";
import i18n from "../../i18n/i18n";
import { Action } from "../../data/constants";

export default function Table(props) {
  const [hoveredField, setHoveredField] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState("");
  const { database } = useDiagram();
  const {
    tableData,
    onPointerDown,
    setHoveredTable,
    handleGripField,
    setLinkingLine,
  } = props;
  const { layout } = useLayout();
  const { deleteField, updateTable } = useDiagram();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const { selectedElement, setSelectedElement, bulkSelectedElements } =
    useSelect();
  const { setUndoStack, setRedoStack } = useUndoRedo();

  // 輔助函數：建立帶有時間戳記的 undo 項目
  const createUndoItem = (item) => ({
    ...item,
    timestamp: new Date().toISOString()
  });

  const borderColor = useMemo(
    () => (settings.mode === "light" ? "border-zinc-300" : "border-zinc-600"),
    [settings.mode],
  );

  const height =
    tableData.fields.length * tableFieldHeight + 
    (tableData.comment && tableData.comment.trim() !== "" ? tableHeaderHeight + 20 : tableHeaderHeight) + 
    7;

  const isSelected = useMemo(() => {
    return (
      (selectedElement.id == tableData.id &&
        selectedElement.element === ObjectType.TABLE) ||
      bulkSelectedElements.some(
        (e) => e.type === ObjectType.TABLE && e.id === tableData.id,
      )
    );
  }, [selectedElement, tableData, bulkSelectedElements]);

  const openEditor = () => {
    if (!layout.sidebar) {
      setSelectedElement((prev) => ({
        ...prev,
        element: ObjectType.TABLE,
        id: tableData.id,
        open: true,
      }));
    } else {
      setSelectedElement((prev) => ({
        ...prev,
        currentTab: Tab.TABLES,
        element: ObjectType.TABLE,
        id: tableData.id,
        open: true,
        activeKey: tableData.id, // 設置 activeKey 以便側邊欄的 Collapse 能正確展開
        fromSidebar: false, // 標記這不是從側邊欄觸發的
      }));
      if (selectedElement.currentTab !== Tab.TABLES) return;
      document
        .getElementById(`scroll_table_${tableData.id}`)
        .scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleNameDoubleClick = (e) => {
    e.stopPropagation();
    setIsEditingName(true);
    setEditingName(tableData.name);
  };

  const handleNameEdit = (value) => {
    setEditingName(value);
  };

  const handleNameConfirm = () => {
    if (editingName.trim() === "") {
      setEditingName(tableData.name);
      setIsEditingName(false);
      return;
    }
    
    if (editingName !== tableData.name) {
      setUndoStack((prev) => [
        ...prev,
        createUndoItem({
          action: Action.EDIT,
          element: ObjectType.TABLE,
          component: "self",
          tid: tableData.id,
          undo: { name: tableData.name },
          redo: { name: editingName },
          message: t("edit_table", {
            tableName: editingName,
            extra: "[name]",
          }),
        }),
      ]);
      setRedoStack([]);
      updateTable(tableData.id, { name: editingName });
    }
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setEditingName(tableData.name);
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleNameConfirm();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleNameCancel();
    }
  };

  return (
    <>
      <foreignObject
        key={tableData.id}
        x={tableData.x}
        y={tableData.y}
        width={settings.tableWidth}
        height={height}
        className="group drop-shadow-lg rounded-md cursor-move"
        onPointerDown={onPointerDown}
      >
        <div
          className={`select-none rounded-lg w-full transition-all duration-200 ${
                 settings.mode === "light"
                   ? "bg-zinc-100 text-zinc-800"
                   : "bg-zinc-800 text-zinc-200"
               } ${
                 isSelected 
                   ? "border-4 border-blue-500 shadow-xl" 
                   : `border-2 ${borderColor} hover:border-dashed hover:border-blue-500`
               }`}
          style={{ 
            direction: "ltr"
          }}
          onClick={openEditor}
        >
          <div
            className="h-[10px] w-full rounded-t-md"
            style={{ 
              backgroundColor: tableData.color
            }}
          />
          <div
            className={`overflow-hidden font-bold flex flex-col justify-center border-b border-gray-400 ${
              settings.mode === "light" ? "bg-zinc-200" : "bg-zinc-900"
            }`}
            style={{ 
              minHeight: tableData.comment && tableData.comment.trim() !== "" ? "60px" : "40px"
            }}
          >
            <div className="flex justify-between items-start px-3 py-2">
              <div className="flex-1 overflow-hidden">
                <div 
                  className="overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer"
                  onDoubleClick={handleNameDoubleClick}
                >
                  {isEditingName ? (
                    <Input
                      value={editingName}
                      onChange={handleNameEdit}
                      onBlur={handleNameConfirm}
                      onKeyDown={handleNameKeyDown}
                      autoFocus
                      className="h-8 text-sm font-bold"
                      style={{ 
                        backgroundColor: 'transparent',
                        border: '1px solid #3b82f6',
                        borderRadius: '4px'
                      }}
                    />
                  ) : (
                    <span className="select-none font-bold">{tableData.name}</span>
                  )}
                </div>
                {tableData.comment && tableData.comment.trim() !== "" && (
                  <div className="text-xs text-gray-500 mt-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {tableData.comment}
                  </div>
                )}
              </div>
            </div>
          </div>
          {tableData.fields.map((e, i) => field(e, i))}
        </div>
      </foreignObject>
      <SideSheet
        title={t("edit")}
        size="small"
        visible={
          selectedElement.element === ObjectType.TABLE &&
          selectedElement.id === tableData.id &&
          selectedElement.open &&
          !layout.sidebar
        }
        onCancel={() =>
          setSelectedElement((prev) => ({
            ...prev,
            open: !prev.open,
          }))
        }
        style={{ paddingBottom: "16px" }}
      >
        <div className="sidesheet-theme">
          <TableInfo data={tableData} />
        </div>
      </SideSheet>
    </>
  );

  function field(fieldData, index) {
    const hasComment = fieldData.comment && fieldData.comment.trim() !== "";
    const fieldHeight = tableFieldHeight;
    
    // 取得資料型別顯示
    const typeDisplay = fieldData.type +
      ((dbToTypes[database][fieldData.type]?.isSized ||
        dbToTypes[database][fieldData.type]?.hasPrecision) &&
      fieldData.size &&
      fieldData.size !== ""
        ? "(" + fieldData.size + ")"
        : "");
    
    return (
      <div
        className={`${
          index === tableData.fields.length - 1
            ? ""
            : "border-b border-gray-400"
        } group px-2 py-1 w-full overflow-hidden`}
        style={{ height: `${fieldHeight}px` }}
        onPointerEnter={(e) => {
          if (!e.isPrimary) return;

          setHoveredField(index);
          setHoveredTable({
            tableId: tableData.id,
            fieldId: fieldData.id,
          });
        }}
        onPointerLeave={(e) => {
          if (!e.isPrimary) return;

          setHoveredField(null);
          setHoveredTable({
            tableId: null,
            fieldId: null,
          });
        }}
        onPointerDown={(e) => {
          // Required for onPointerLeave to trigger when a touch pointer leaves
          // https://stackoverflow.com/a/70976017/1137077
          e.target.releasePointerCapture(e.pointerId);
        }}
      >
        {/* 第一行：欄位名稱、資料型別、主鍵、非空標記 */}
        <div className="flex items-center justify-between h-6">
          <div
            className={`${
              hoveredField === index ? "text-zinc-400" : ""
            } flex items-center gap-2 overflow-hidden flex-1`}
          >
            <button
              className="shrink-0 w-[10px] h-[10px] bg-[#2f68adcc] rounded-full"
              onPointerDown={(e) => {
                if (!e.isPrimary) return;

                handleGripField();
                setLinkingLine((prev) => ({
                  ...prev,
                  startFieldId: fieldData.id,
                  startTableId: tableData.id,
                  startX: tableData.x + 15,
                  startY:
                    tableData.y +
                    index * fieldHeight +
                    tableHeaderHeight +
                    tableColorStripHeight +
                    24, // 調整為欄位中心
                  endX: tableData.x + 15,
                  endY:
                    tableData.y +
                    index * fieldHeight +
                    tableHeaderHeight +
                    tableColorStripHeight +
                    24,
                }));
              }}
            />
            {/* 欄位名稱 */}
            <span className="font-medium whitespace-nowrap">
              {fieldData.name}
            </span>
            {/* 資料型別 */}
            <span className={`text-xs font-mono ${
              dbToTypes[database][fieldData.type]?.color || "text-gray-500"
            }`}>
              {typeDisplay}
            </span>
          </div>
          {/* 右側標記：主鍵和非空 */}
          <div className="flex items-center gap-1 ml-2">
            {fieldData.primary && (
              <IconKeyStroked 
                size="small" 
                className="text-amber-500"
                style={{ width: "14px", height: "14px" }}
              />
            )}
            {!fieldData.notNull && (
              <span className="text-xs text-gray-400">NULL</span>
            )}
          </div>
        </div>
        {/* 第二行：註解 */}
        {hasComment && (
          <div className="h-5 flex items-center">
            <span className="text-xs text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap pl-3">
              {fieldData.comment}
            </span>
          </div>
        )}
      </div>
    );
  }
}
