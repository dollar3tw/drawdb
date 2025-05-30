import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import SimpleCanvas from "../components/SimpleCanvas";
import Navbar from "../components/Navbar";
import { diagram } from "../data/heroDiagram";
import mysql_icon from "../assets/mysql.png";
import postgres_icon from "../assets/postgres.png";
import sqlite_icon from "../assets/sqlite.png";
import mariadb_icon from "../assets/mariadb.png";
import oraclesql_icon from "../assets/oraclesql.png";
import sql_server_icon from "../assets/sql-server.png";
import discord from "../assets/discord.png";
import github from "../assets/github.png";
import warp from "../assets/warp.png";
import screenshot from "../assets/screenshot.png";
import FadeIn from "../animations/FadeIn";
import axios from "axios";
import { getAllDiagramsAPI, deleteDiagramAPI } from "../data/db"; // Fixed import path
import { languages } from "../i18n/i18n";
import { socials } from "../data/socials";
import { databases } from "../data/databases";
import { useAuth } from "../context/AuthContext";
import { Button, Tag, Popconfirm, Toast } from "@douyinfe/semi-ui";
import { IconDelete } from "@douyinfe/semi-icons";

function shortenNumber(number) {
  if (number < 1000) return number;

  if (number >= 1000 && number < 1_000_000)
    return `${(number / 1000).toFixed(1)}k`;
}

export default function LandingPage() {
  const [stats, setStats] = useState({ stars: 18000, forks: 1200 });
  const [diagrams, setDiagrams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // Initialize useNavigate
  const { isAuthenticated, isMitAdmin, API_BASE_URL, loading, user } = useAuth();

  const handleDiagramClick = (diagramId) => {
    if (diagramId) {
      window.name = `d ${diagramId}`; // Set window.name to indicate which diagram to load
      navigate("/editor");          // Navigate to the editor page
    } else {
      console.error("Diagram ID is undefined. Cannot navigate.");
      // Optionally, show an error to the user via Toast or similar
    }
  };

  const handleNewDiagramClick = () => {
    window.name = "new"; // Set window.name to indicate a new diagram should be created
    navigate("/editor");
  };

  const handleDeleteDiagram = async (diagramId, event) => {
    event.stopPropagation(); // 防止觸發點擊事件
    
    try {
      await deleteDiagramAPI(diagramId);
      Toast.success('圖表刪除成功');
      fetchDiagrams(); // 重新獲取圖表列表
    } catch (error) {
      console.error('Failed to delete diagram:', error);
      Toast.error('刪除圖表失敗');
    }
  };

  const fetchDiagrams = async () => {
    try {
      setIsLoading(true);
      
      console.log('Fetching diagrams...', { isAuthenticated, loading, user });
      
      // 使用修正過的 API 函數
      const diagrams = await getAllDiagramsAPI();
      console.log('Fetched diagrams:', diagrams);
      setDiagrams(diagrams || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching diagrams:", err);
      setError("Failed to load diagrams. Please try again later.");
      setDiagrams([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      // 在開發環境中跳過 GitHub API 請求以避免 CORS 錯誤
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('開發環境：跳過 GitHub 統計資料請求');
        return;
      }
      
      try {
        const res = await axios.get("https://api.github-star-counter.workers.dev/user/drawdb-io");
        setStats(res.data);
      } catch (err) {
        console.log("GitHub 統計資料載入失敗，使用預設值");
        // Keep default stats or set to a specific error state if needed
      }
    };

    document.body.setAttribute("theme-mode", "light");
    document.title =
      "drawDB | Online database diagram editor and SQL generator";

    fetchStats();
  }, []);

  // 專門監聽認證狀態變更的 useEffect
  useEffect(() => {
    console.log('Auth state changed:', { isAuthenticated, loading, user });
    
    // 只有在認證狀態穩定且已登入時才獲取圖表
    if (!loading && isAuthenticated) {
      console.log('User authenticated, fetching diagrams...');
      fetchDiagrams();
    } else if (!loading && !isAuthenticated) {
      // 如果用戶登出，清空圖表列表
      console.log('User not authenticated, clearing diagrams...');
      setDiagrams([]);
      setIsLoading(false);
      setError(null);
    }
  }, [isAuthenticated, loading, user]); // 添加 user 作為依賴項

  return (
    <div>
      <div className="flex flex-col h-screen bg-zinc-100">
        <div className="text-white font-semibold py-1 text-sm text-center bg-linear-to-r from-[#12495e] from-10% via-slate-500 to-[#12495e]" />

        <FadeIn duration={0.6}>
          <Navbar />
        </FadeIn>

        {/* Hero section */}
        <div className="flex-1 flex-col relative mx-4 md:mx-0 mb-4 rounded-3xl bg-white">
          <div className="h-full md:hidden">
            <SimpleCanvas diagram={diagram} zoom={0.85} />
          </div>
          <div className="hidden md:block h-full bg-dots" />
          <div className="absolute left-12 w-[45%] top-[50%] translate-y-[-54%] md:left-[50%] md:translate-x-[-50%] p-8 md:p-3 md:w-full text-zinc-800">
            <FadeIn duration={0.75}>
              {!isAuthenticated && (
                <div className="text-center">
                  <h2 className="text-2xl mt-1 font-medium mb-6">歡迎使用 DrawDB</h2>
                  <p className="text-gray-600 mb-6">請登入以查看和管理您的圖表</p>
                </div>
              )}
              
              {isAuthenticated && isLoading && <p className="text-center">Loading diagrams...</p>}
              {isAuthenticated && error && <p className="text-center text-red-500">{error}</p>}
              {isAuthenticated && !isLoading && !error && diagrams.length === 0 && (
                <div className="text-center">
                  <h2 className="text-2xl mt-1 font-medium mb-6">開始創建您的第一個圖表</h2>
                  <p className="text-gray-600 mb-6">還沒有任何圖表，點擊下方按鈕開始創建！</p>
                </div>
              )}
              {isAuthenticated && !isLoading && !error && diagrams.length > 0 && (
                <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-lg border border-zinc-200">
                  <div className="px-6 py-3 border-b border-zinc-200 bg-gray-50 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-800">已儲存的圖表</h3>
                      <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                        {diagrams.length} 個圖表
                      </span>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <ul className="divide-y divide-zinc-200">
                      {diagrams.map(diagram => (
                        <li 
                          key={diagram.id} 
                          className="px-6 py-4 hover:bg-zinc-100 transition-colors duration-150 cursor-pointer"
                          onClick={() => handleDiagramClick(diagram.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {/* 資料庫類型圖示 */}
                              {databases[diagram.databaseType]?.image && (
                                <div className="p-1 bg-gray-100 rounded">
                                  <img
                                    src={databases[diagram.databaseType].image}
                                    className="h-4 w-4 object-contain brightness-110 contrast-125"
                                    alt={databases[diagram.databaseType].name + " icon"}
                                    title={databases[diagram.databaseType].name}
                                  />
                                </div>
                              )}
                              {/* 如果沒有圖示，顯示預設圖示 */}
                              {!databases[diagram.databaseType]?.image && (
                                <div 
                                  className="h-6 w-6 bg-gray-300 rounded flex items-center justify-center text-xs font-bold text-gray-600"
                                  title="Generic Database"
                                >
                                  DB
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-sky-700 text-lg truncate">
                                  {diagram.name || "Untitled Diagram"}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Last Modified: {new Date(diagram.lastModified).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="text-sm text-gray-400 flex-shrink-0">
                                {databases[diagram.databaseType]?.name ?? "Generic"}
                              </div>
                              {/* mitadmin 可以刪除任何圖表 */}
                              {isMitAdmin && (
                                <Popconfirm
                                  title="確定要刪除此圖表嗎？"
                                  content="此操作不可撤銷"
                                  onConfirm={(event) => handleDeleteDiagram(diagram.id, event)}
                                >
                                  <Button
                                    icon={<IconDelete />}
                                    type="danger"
                                    size="small"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </Popconfirm>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {diagrams.length > 6 && (
                    <div className="px-6 py-2 border-t border-zinc-200 bg-gray-50 rounded-b-lg">
                      <div className="text-xs text-gray-500 text-center">
                        <i className="bi bi-arrow-up-down mr-1"></i>
                        滾動查看更多圖表
                      </div>
                    </div>
                  )}
                </div>
              )}
            </FadeIn>
            <div className="mt-4 font-semibold md:mt-12">
              <button
                onClick={handleNewDiagramClick}
                className="inline-block py-3 text-white transition-all duration-300 rounded-full shadow-lg bg-sky-900 ps-7 pe-6 hover:bg-sky-800"
                disabled={!isAuthenticated}
              >
                新增圖表 <i className="bi bi-arrow-right ms-1"></i>
              </button>
              {!isAuthenticated && (
                <p className="text-sm text-gray-500 mt-2">請先登入以創建圖表</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Learn more */}
      <div id="learn-more">
      </div>

      {/* Contact us */}
      <div className="text-center text-sm py-3">
        &copy; 2024 <strong>drawDB</strong> - All right reserved.
      </div>
    </div>
  );
}

const dbs = [
  { icon: mysql_icon, height: 80 },
  { icon: postgres_icon, height: 48 },
  { icon: sqlite_icon, height: 64 },
  { icon: mariadb_icon, height: 64 },
  { icon: sql_server_icon, height: 64 },
  { icon: oraclesql_icon, height: 172 },
];

const features = [
  {
    title: "Export",
    content: (
      <div>
        Export the DDL script to run on your database or export the diagram as a
        JSON or an image.
      </div>
    ),
    footer: "",
  },
  {
    title: "Reverse engineer",
    content: (
      <div>
        Already have a schema? Import a DDL script to generate a diagram.
      </div>
    ),
    footer: "",
  },
  {
    title: "Customizable workspace",
    content: (
      <div>
        Customize the UI to fit your preferences. Select the components you want
        in your view.
      </div>
    ),
    footer: "",
  },
  {
    title: "Keyboard shortcuts",
    content: (
      <div>
        Speed up development with keyboard shortcuts. See all available
        shortcuts
        <Link
          to={`${socials.docs}/shortcuts`}
          className="ms-1.5 text-blue-500 hover:underline"
        >
          here
        </Link>
        .
      </div>
    ),
    footer: "",
  },
  {
    title: "Templates",
    content: (
      <div>
        Start off with pre-built templates. Get a quick start or get inspiration
        for your design.
      </div>
    ),
    footer: "",
  },
  {
    title: "Custom Templates",
    content: (
      <div>
        Have boilerplate structures? Save time by saving them as templates and
        load them when needed.
      </div>
    ),
    footer: "",
  },
  {
    title: "Robust editor",
    content: (
      <div>
        Undo, redo, copy, paste, duplicate and more. Add tables, subject areas,
        and notes.
      </div>
    ),
    footer: "",
  },
  {
    title: "Issue detection",
    content: (
      <div>
        Detect and tackle errors in the diagram to make sure the scripts are
        correct.
      </div>
    ),
    footer: "",
  },
  {
    title: "Relational databases",
    content: (
      <div>
        We support 5 relational databases - MySQL, PostgreSQL, SQLite, MariaDB,
        SQL Server.
      </div>
    ),
    footer: "",
  },
  {
    title: "Object-Relational databases",
    content: (
      <div>
        Add custom types for object-relational databases, or create custom JSON
        schemes.
      </div>
    ),
    footer: "",
  },
  {
    title: "Presentation mode",
    content: (
      <div>
        Present your diagrams on a big screen during team meetings and
        discussions.
      </div>
    ),
    footer: "",
  },
  {
    title: "Track todos",
    content: <div>Keep track of tasks and mark them done when finished.</div>,
    footer: "",
  },
];
