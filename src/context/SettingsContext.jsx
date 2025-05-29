import { createContext, useEffect, useState } from "react";
import { tableWidth } from "../data/constants";

const defaultSettings = {
  strictMode: false,
  showFieldSummary: true,
  showGrid: false,
  showDataTypes: true,
  mode: "light",
  autosave: true,
  panning: true,
  showCardinality: true,
  showRelationshipLabels: true,
  tableWidth: tableWidth,
  showDebugCoordinates: false,
};

export const SettingsContext = createContext(defaultSettings);

export default function SettingsContextProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings);

  // 暫時保留 localStorage 作為備用，但主要依賴後端儲存
  // 未來可以擴展為使用者個人設定 API
  useEffect(() => {
    const settings = localStorage.getItem("settings");
    if (settings) {
      setSettings(JSON.parse(settings));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("settings", JSON.stringify(settings));
    // TODO: 未來可以在這裡添加 API 呼叫來儲存使用者設定到後端
    // saveUserSettingsAPI(settings);
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
