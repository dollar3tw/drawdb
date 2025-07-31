import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import SimpleCanvas from "../components/SimpleCanvas";
import Navbar from "../components/Navbar";
import { diagram } from "../data/heroDiagram";
import FadeIn from "../animations/FadeIn";
import axios from "axios";
import { getAllDiagramsAPI, deleteDiagramAPI, promoteDiagramToCollaborativeAPI } from "../data/db"; // Fixed import path
import { socials } from "../data/socials";
import { databases } from "../data/databases";
import { useAuth } from "../context/AuthContext";
import { Toast, Tabs, TabPane, Badge } from "@douyinfe/semi-ui";
import { IconUserGroup } from "@douyinfe/semi-icons";
import DiagramListItem from "../components/DiagramListItem";
import InviteCollaboratorModal from "../components/InviteCollaboratorModal";


export default function LandingPage() {
  const [personalDiagrams, setPersonalDiagrams] = useState([]);
  const [collaborativeDiagrams, setCollaborativeDiagrams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('collaborative');
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [selectedDiagramForInvite, setSelectedDiagramForInvite] = useState(null);
  const navigate = useNavigate(); // Initialize useNavigate
  const { isAuthenticated, isRoot, loading, user } = useAuth();

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

  const handlePromoteDiagram = async (diagramId, event) => {
    event.stopPropagation(); // 防止觸發點擊事件
    
    try {
      await promoteDiagramToCollaborativeAPI(diagramId);
      Toast.success('圖表已提升為協作狀態');
      
      // 重新獲取圖表列表
      await fetchDiagrams();
    } catch (error) {
      console.error('Error promoting diagram:', error);
      Toast.error('提升圖表失敗');
    }
  };
  
  const handleInviteCollaborator = (diagramId) => {
    const diagram = [...personalDiagrams, ...collaborativeDiagrams].find(d => d.id === diagramId);
    setSelectedDiagramForInvite(diagram);
    setInviteModalVisible(true);
  };

  const fetchDiagrams = useCallback(async () => {
    try {
      setIsLoading(true);
      
      console.log('Fetching diagrams...', { isAuthenticated, loading, user });
      
      // 同時獲取個人和協作圖表
      const [personal, collaborative] = await Promise.all([
        getAllDiagramsAPI('personal'),
        getAllDiagramsAPI('collaborative')
      ]);
      
      console.log('Fetched personal diagrams:', personal);
      console.log('Fetched collaborative diagrams:', collaborative);
      
      setPersonalDiagrams(personal || []);
      setCollaborativeDiagrams(collaborative || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching diagrams:", err);
      setError("Failed to load diagrams. Please try again later.");
      setPersonalDiagrams([]);
      setCollaborativeDiagrams([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    document.body.setAttribute("theme-mode", "light");
    document.title =
      "drawDB | Online database diagram editor and SQL generator";
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
      setPersonalDiagrams([]);
      setCollaborativeDiagrams([]);
      setIsLoading(false);
      setError(null);
    }
  }, [isAuthenticated, loading, user, fetchDiagrams]); // 添加 user 作為依賴項

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
              {isAuthenticated && !isLoading && !error && personalDiagrams.length === 0 && collaborativeDiagrams.length === 0 && (
                <div className="text-center">
                  <h2 className="text-2xl mt-1 font-medium mb-6">開始創建您的第一個圖表</h2>
                  <p className="text-gray-600 mb-6">還沒有任何圖表，點擊下方按鈕開始創建！</p>
                </div>
              )}
              {isAuthenticated && !isLoading && !error && (personalDiagrams.length > 0 || collaborativeDiagrams.length > 0) && (
                <div className="max-w-3xl mx-auto">
                  <Tabs 
                    type="card" 
                    activeKey={activeTab} 
                    onChange={setActiveTab}
                    size="large"
                    style={{ fontSize: '18px' }}
                  >
                    <TabPane
                      tab={
                        <span className="flex items-center space-x-2 text-lg">
                          <span>個人</span>
                          <Badge count={personalDiagrams.length} type="primary" />
                        </span>
                      }
                      itemKey="personal"
                    >
                      {personalDiagrams.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-500">沒有個人圖表</p>
                        </div>
                      ) : (
                        <div className="bg-white shadow-lg rounded-lg border border-zinc-200">
                          <div className="max-h-96 overflow-y-auto">
                            <ul className="divide-y divide-zinc-200">
                              {personalDiagrams.map(diagram => (
                                <DiagramListItem
                                  key={diagram.id}
                                  diagram={diagram}
                                  onDiagramClick={handleDiagramClick}
                                  onDeleteDiagram={handleDeleteDiagram}
                                  onPromoteDiagram={handlePromoteDiagram}
                                  onInviteCollaborator={handleInviteCollaborator}
                                  canDelete={true}
                                  canPromote={true}
                                  canInvite={false}
                                />
                              ))}
                            </ul>
                          </div>
                          {personalDiagrams.length > 6 && (
                            <div className="px-6 py-2 border-t border-zinc-200 bg-gray-50 rounded-b-lg">
                              <div className="text-xs text-gray-500 text-center">
                                <i className="bi bi-arrow-up-down mr-1"></i>
                                滾動查看更多圖表
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </TabPane>
                    
                    <TabPane
                      tab={
                        <span className="flex items-center space-x-2 text-lg">
                          <IconUserGroup />
                          <span>協作</span>
                          <Badge count={collaborativeDiagrams.length} type="warning" />
                        </span>
                      }
                      itemKey="collaborative"
                    >
                      {collaborativeDiagrams.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-500">沒有協作圖表</p>
                          <p className="text-sm text-gray-400 mt-2">個人圖表可以被提升為協作圖表</p>
                        </div>
                      ) : (
                        <div className="bg-white shadow-lg rounded-lg border border-zinc-200">
                          <div className="max-h-96 overflow-y-auto">
                            <ul className="divide-y divide-zinc-200">
                              {collaborativeDiagrams.map(diagram => (
                                <DiagramListItem
                                  key={diagram.id}
                                  diagram={diagram}
                                  onDiagramClick={handleDiagramClick}
                                  onDeleteDiagram={handleDeleteDiagram}
                                  onPromoteDiagram={handlePromoteDiagram}
                                  onInviteCollaborator={handleInviteCollaborator}
                                  canDelete={false} // 協作圖表不能被任何人刪除，包括 root
                                  canPromote={false}
                                  canInvite={diagram.permission_type === 'owner' || isRoot}
                                />
                              ))}
                            </ul>
                          </div>
                          {collaborativeDiagrams.length > 6 && (
                            <div className="px-6 py-2 border-t border-zinc-200 bg-gray-50 rounded-b-lg">
                              <div className="text-xs text-gray-500 text-center">
                                <i className="bi bi-arrow-up-down mr-1"></i>
                                滾動查看更多圖表
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </TabPane>
                  </Tabs>
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
      
      {/* Invite Collaborator Modal */}
      {selectedDiagramForInvite && (
        <InviteCollaboratorModal
          visible={inviteModalVisible}
          onCancel={() => {
            setInviteModalVisible(false);
            setSelectedDiagramForInvite(null);
          }}
          diagramId={selectedDiagramForInvite.id}
          diagramName={selectedDiagramForInvite.name || "Untitled Diagram"}
          currentUserEmail={user?.email}
          onSuccess={() => {
            fetchDiagrams();
          }}
        />
      )}
    </div>
  );
}

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
