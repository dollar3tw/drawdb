import { useTranslation } from "react-i18next";
import { useUndoRedo } from "../../../hooks";
import { useAuth } from "../../../context/AuthContext";
import { useDiagram } from "../../../hooks";
import { List, Spin, Empty } from "@douyinfe/semi-ui";
import { useState, useEffect } from "react";
import axios from "axios";
import { generateDetailedMessage } from "../../../utils/revisionMessages";

export default function RevisionHistory({ diagramId }) {
  const { undoStack } = useUndoRedo();
  const { tables } = useDiagram();
  const { t } = useTranslation();
  const { API_BASE_URL } = useAuth();
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (diagramId) {
      fetchRevisions();
    }
  }, [diagramId]);

  const fetchRevisions = async () => {
    if (!diagramId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/diagrams/${diagramId}/revisions`);
      setRevisions(response.data.revisions || []);
    } catch (error) {
      console.error('Failed to fetch revision history:', error);
      setRevisions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      // 確保日期有效
      if (isNaN(date.getTime())) {
        return '無效時間';
      }
      
      return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Taipei',
        hour12: false // 使用24小時制
      });
    } catch (error) {
      console.error('時間格式化錯誤:', error);
      return '時間格式錯誤';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Spin size="large" />
      </div>
    );
  }

  // 合併本地 undoStack 和遠端修訂歷程，並過濾掉移動操作
  const allRevisions = [
    // 本地未儲存的操作（過濾掉移動和平移操作）
    ...undoStack
      .filter(item => {
        // 過濾掉移動操作和平移操作
        if (item.action === 'MOVE' || item.action === 'PAN') return false;
        if (item.message && (item.message.includes('移動') || item.message.includes('移動至'))) return false;
        return true;
      })
      .map((item, index) => {
        // 生成詳細的訊息
        let detailedMessage = item.message;
        
        try {
          // 如果有足夠的資訊，生成詳細訊息
          if (item.action !== undefined && item.element !== undefined && item.component) {
            // 從 tables 中找到實際的表格名稱
            let tableName = '未知表格';
            if (item.tid !== undefined) {
              const table = tables.find(t => t.id === item.tid);
              tableName = table ? table.name : `table_${item.tid}`;
            }
            
            // 從 undo/redo 中找到欄位名稱
            let fieldName = '';
            if (item.fid !== undefined && item.tid !== undefined) {
              const table = tables.find(t => t.id === item.tid);
              if (table) {
                const field = table.fields.find(f => f.id === item.fid);
                if (field) {
                  fieldName = field.name;
                } else if (item.undo && item.undo.name) {
                  fieldName = item.undo.name;
                } else if (item.redo && item.redo.name) {
                  fieldName = item.redo.name;
                }
              }
            }
            
            detailedMessage = generateDetailedMessage(item.action, item.element, item.component, {
              tableName,
              fieldName,
              undo: item.undo,
              redo: item.redo,
              extra: item.extra
            });
          }
        } catch (error) {
          console.warn('Failed to generate detailed message:', error);
          // 如果生成詳細訊息失敗，使用原始訊息
        }
        
        // 生成台北時間的時間戳記
        const now = new Date();
        const taipeiTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Taipei"}));
        
        return {
          id: `local-${index}`,
          message: detailedMessage,
          username: '本地操作',
          timestamp: taipeiTime.toISOString(),
          isLocal: true
        };
      }),
    // 遠端已儲存的修訂歷程（已在後端過濾）
    ...revisions.map(revision => ({
      ...revision,
      isLocal: false
    }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (allRevisions.length === 0) {
    return (
      <div className="m-5 sidesheet-theme">
        <Empty 
          description="目前尚無修訂歷程記錄"
          style={{ padding: '20px 0' }}
        />
      </div>
    );
  }

  return (
    <List className="sidesheet-theme">
      {allRevisions.map((revision, i) => (
        <List.Item
          key={revision.id || i}
          style={{ padding: "8px 18px" }}
          className="hover-1"
        >
          <div className="flex flex-col py-1 w-full">
            <div className="flex items-center mb-1">
              <i className={`block fa-regular ${revision.isLocal ? 'fa-clock' : 'fa-circle'} fa-xs`} 
                 style={{ color: revision.isLocal ? '#f39c12' : '#3498db' }} />
              <div className="ms-2 font-medium text-sm">{revision.message}</div>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500 ml-4">
              <span className="font-medium">{revision.username}</span>
              <span>{formatTimestamp(revision.timestamp)}</span>
            </div>
            {revision.isLocal && (
              <div className="ml-4 mt-1">
                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
                  未儲存
                </span>
              </div>
            )}
          </div>
        </List.Item>
      ))}
    </List>
  );
}
