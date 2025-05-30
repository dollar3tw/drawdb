import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useLayoutEffect } from "react";
import Editor from "./pages/Editor";
import BugReport from "./pages/BugReport";
import Templates from "./pages/Templates";
import LandingPage from "./pages/LandingPage";
import SettingsContextProvider from "./context/SettingsContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useSettings } from "./hooks";
import NotFound from "./pages/NotFound";
import { Spin } from "@douyinfe/semi-ui";

// 受保護的路由元件
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  // 如果還在載入認證狀態，顯示載入畫面
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  // 如果未認證，重導向到首頁
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // 如果已認證，顯示子元件
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsContextProvider>
        <BrowserRouter>
          <RestoreScroll />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/editor"
              element={
                <ProtectedRoute>
                  <ThemedPage>
                    <Editor />
                  </ThemedPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/bug-report"
              element={
                <ThemedPage>
                  <BugReport />
                </ThemedPage>
              }
            />
            <Route path="/templates" element={<Templates />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SettingsContextProvider>
    </AuthProvider>
  );
}

function ThemedPage({ children }) {
  const { setSettings } = useSettings();

  useLayoutEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
      setSettings((prev) => ({ ...prev, mode: "dark" }));
      const body = document.body;
      if (body.hasAttribute("theme-mode")) {
        body.setAttribute("theme-mode", "dark");
      }
    } else {
      setSettings((prev) => ({ ...prev, mode: "light" }));
      const body = document.body;
      if (body.hasAttribute("theme-mode")) {
        body.setAttribute("theme-mode", "light");
      }
    }
  }, [setSettings]);

  return children;
}

function RestoreScroll() {
  const location = useLocation();
  useLayoutEffect(() => {
    window.scroll(0, 0);
  }, [location.pathname]);
  return null;
}
