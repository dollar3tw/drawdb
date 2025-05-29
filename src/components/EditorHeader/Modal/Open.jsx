import { useState, useEffect } from "react";
import { getAllDiagramsAPI } from "../../../data/db";
import { Banner } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { databases } from "../../../data/databases";

export default function Open({ selectedDiagramId, setSelectedDiagramId }) {
  const [diagrams, setDiagrams] = useState([]);
  const { t } = useTranslation();

  useEffect(() => {
    const loadDiagrams = async () => {
      try {
        const fetchedDiagrams = await getAllDiagramsAPI();
        setDiagrams(fetchedDiagrams || []);
      } catch (error) {
        console.error("Error loading diagrams:", error);
        setDiagrams([]);
      }
    };
    
    loadDiagrams();
  }, []);

  const getDiagramSize = (d) => {
    const size = JSON.stringify(d).length;
    let sizeStr;
    if (size >= 1024 && size < 1024 * 1024)
      sizeStr = (size / 1024).toFixed(1) + "KB";
    else if (size >= 1024 * 1024)
      sizeStr = (size / (1024 * 1024)).toFixed(1) + "MB";
    else sizeStr = size + "B";

    return sizeStr;
  };
  return (
    <div>
      {diagrams?.length === 0 ? (
        <Banner
          fullMode={false}
          type="info"
          bordered
          icon={null}
          closeIcon={null}
          description={<div>You have no saved diagrams.</div>}
        />
      ) : (
        <div className="max-h-[360px]">
          <table className="w-full text-left border-separate border-spacing-x-0">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("last_modified")}</th>
                <th>{t("size")}</th>
                <th>{t("type")}</th>
              </tr>
            </thead>
            <tbody>
              {diagrams?.map((d) => {
                return (
                  <tr
                    key={d.id}
                    className={`${
                      selectedDiagramId === d.id
                        ? "bg-blue-300/30"
                        : "hover-1"
                    }`}
                    onClick={() => {
                      setSelectedDiagramId(d.id);
                    }}
                  >
                    <td className="py-1">
                      <div className="flex items-center space-x-2">
                        {/* 資料庫類型圖示 */}
                        {databases[d.databaseType]?.image && (
                          <img
                            src={databases[d.databaseType].image}
                            className="h-4 w-4 object-contain brightness-110 contrast-125"
                            alt={databases[d.databaseType].name + " icon"}
                            title={databases[d.databaseType].name}
                          />
                        )}
                        {/* 如果沒有圖示，顯示預設圖示 */}
                        {!databases[d.databaseType]?.image && (
                          <div 
                            className="h-4 w-4 bg-gray-300 rounded flex items-center justify-center text-xs font-bold text-gray-600"
                            title="Generic Database"
                          >
                            <i className="bi bi-file-earmark-text text-[12px] opacity-60" />
                          </div>
                        )}
                        <span>{d.name}</span>
                      </div>
                    </td>
                    <td className="py-1">
                      {d.lastModified.toLocaleDateString() +
                        " " +
                        d.lastModified.toLocaleTimeString()}
                    </td>
                    <td className="py-1">{getDiagramSize(d)}</td>
                    <td className="py-1">
                      {databases[d.databaseType]?.name ?? "Generic"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
