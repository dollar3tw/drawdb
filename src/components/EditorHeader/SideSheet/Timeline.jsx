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
      
      // 使用用戶的本地時區顯示時間
      return date.toLocaleString(navigator.language || 'zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
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

  // 只顯示遠端已儲存的修訂歷程
  // 移除 undoStack 的顯示，因為它會造成混淆
  // undoStack 是用於復原/重做功能，不是用來顯示未儲存的變更
  const allRevisions = revisions.map(revision => ({
    ...revision,
    isLocal: false
  })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

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
              <i className="block fa-regular fa-circle fa-xs" 
                 style={{ color: '#3498db' }} />
              <div className="ms-2 font-medium text-sm">{revision.message}</div>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500 ml-4">
              <span className="font-medium">{revision.username}</span>
              <span>{formatTimestamp(revision.timestamp)}</span>
            </div>
          </div>
        </List.Item>
      ))}
    </List>
  );
}
