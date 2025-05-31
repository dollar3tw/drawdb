import { useTranslation } from "react-i18next";
import { useUndoRedo } from "../../../hooks";
import { useAuth } from "../../../context/AuthContext";
import { List, Spin, Empty } from "@douyinfe/semi-ui";
import { useState, useEffect } from "react";
import axios from "axios";

export default function RevisionHistory({ diagramId }) {
  const { undoStack } = useUndoRedo();
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
    const date = new Date(timestamp);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Taipei'
    });
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
      .map((item, index) => ({
        id: `local-${index}`,
        message: item.message,
        username: '本地操作',
        timestamp: new Date().toISOString(),
        isLocal: true
      })),
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
