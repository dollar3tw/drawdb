import { Collapse, Button } from "@douyinfe/semi-ui";
import { IconPlus } from "@douyinfe/semi-icons";
import { useSelect, useDiagram, useSaveState, useTransform, useSettings } from "../../../hooks";
import { ObjectType, State } from "../../../data/constants";
import { useTranslation } from "react-i18next";
import { DragHandle } from "../../SortableList/DragHandle";
import { SortableList } from "../../SortableList/SortableList";
import SearchBar from "./SearchBar";
import Empty from "../Empty";
import TableInfo from "./TableInfo";
import { useEffect, useRef } from "react";

export default function TablesTab() {
  const { tables, addTable, setTables } = useDiagram();
  const { selectedElement, setSelectedElement } = useSelect();
  const { t } = useTranslation();
  const { setSaveState } = useSaveState();
  const { setTransform } = useTransform();
  const { settings } = useSettings();
  const prevSelectedRef = useRef(null);
  
  // 監聽選中的表格變化，只在從側邊欄觸發時平移畫布
  useEffect(() => {
    if (
      selectedElement.element === ObjectType.TABLE &&
      selectedElement.open &&
      selectedElement.fromSidebar && // 只在從側邊欄觸發時執行
      selectedElement.id !== prevSelectedRef.current
    ) {
      const selectedTable = tables.find(t => t.id === selectedElement.id);
      if (selectedTable) {
        // 計算表格的中心位置
        const tableWidth = settings.tableWidth || 300;
        const tableHeight = selectedTable.fields ? selectedTable.fields.length * 30 + 100 : 200;
        const tableCenterX = selectedTable.x + tableWidth / 2;
        const tableCenterY = selectedTable.y + tableHeight / 2;
        
        // 延遲執行以確保動畫流暢
        setTimeout(() => {
          setTransform({
            zoom: 1.2,  // 從 1.5 改為 1.2（縮小 20%）
            pan: {
              x: tableCenterX,
              y: tableCenterY
            }
          });
        }, 100);
        
        // 清除 fromSidebar 標記
        setSelectedElement((prev) => ({
          ...prev,
          fromSidebar: false
        }));
      }
      prevSelectedRef.current = selectedElement.id;
    }
  }, [selectedElement, tables, settings.tableWidth, setTransform, setSelectedElement]);

  return (
    <>
      <div className="flex gap-2">
        <SearchBar tables={tables} />
        <div>
          <Button icon={<IconPlus />} block onClick={() => addTable()}>
            {t("add_table")}
          </Button>
        </div>
      </div>
      {tables.length === 0 ? (
        <Empty title={t("no_tables")} text={t("no_tables_text")} />
      ) : (
        <Collapse
          activeKey={
            // 使用保存的 activeKey 或者嘗試匹配
            selectedElement.activeKey 
              ? [selectedElement.activeKey]
              : selectedElement.open && 
                selectedElement.element === ObjectType.TABLE && 
                selectedElement.id
                ? [`${selectedElement.id}`]  // 保持向後兼容
                : []
          }
          keepDOM={false}
          lazyRender
          onChange={(k) => {
            // k 是字串陣列，包含所有展開的 panel key
            const isExpanding = k && k.length > 0;
            
            if (isExpanding) {
              const expandedKey = k[0];
              // 直接使用 expandedKey 作為 table id（看起來 table.id 本身就是這個格式）
              const selectedTable = tables.find(t => t.id === expandedKey);
              
              if (selectedTable) {
                setSelectedElement((prev) => ({
                  ...prev,
                  open: true,
                  id: selectedTable.id,
                  element: ObjectType.TABLE,
                  fromSidebar: true, // 標記這是從側邊欄觸發的
                  activeKey: expandedKey, // 保存實際的 key 用於匹配
                }));
              }
            } else {
              // 收合時保留當前的 id，只改變 open 狀態
              setSelectedElement((prev) => ({
                ...prev,
                open: false,
                fromSidebar: false,
                activeKey: null,
              }));
            }
          }}
          accordion
        >
          <SortableList
            keyPrefix="tables-tab"
            items={tables}
            onChange={(newTables) => setTables(newTables)}
            afterChange={() => setSaveState(State.SAVING)}
            renderItem={(item) => <TableListItem table={item} />}
          />
        </Collapse>
      )}
    </>
  );
}

function TableListItem({ table }) {
  const { selectedElement } = useSelect();
  const isSelected = selectedElement.id === table.id && 
                     selectedElement.element === ObjectType.TABLE && 
                     selectedElement.open;
  
  return (
    <div id={`scroll_table_${table.id}`}>
      <Collapse.Panel
        className={`relative transition-all duration-200 ${
          isSelected 
            ? "border-2 border-blue-500 rounded-md" 
            : ""
        }`}
        header={
          <>
            <div className="flex items-center gap-2">
              <DragHandle id={table.id} />
              <div className={`overflow-hidden text-ellipsis whitespace-nowrap ${
                isSelected ? "font-semibold" : ""
              }`}>
                {table.name}
              </div>
            </div>
            <div
              className={`h-full absolute top-0 left-0 bottom-0 transition-all duration-200 ${
                isSelected ? "w-2" : "w-1"
              }`}
              style={{ 
                backgroundColor: table.color
              }}
            />
          </>
        }
        itemKey={`${table.id}`}
      >
        <TableInfo data={table} />
      </Collapse.Panel>
    </div>
  );
}
