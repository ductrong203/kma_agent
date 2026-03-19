import React, { useState, useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import AppBar from "./components/AppBar";
import ChatMessages from "./components/ChatMessages";
import ChatInput from "./components/ChatInput";
import WelcomeScreen from "./components/WelcomeScreen";
import Login from "./components/Login";
import FileChat from "./components/FileChat";
import UsageStats from "./components/UsageStats";
import chatService from "./services/chatService";
import authService from "./services/authService";
import { v4 as uuidv4 } from "uuid";
import { FiMenu, FiX } from "react-icons/fi";
import ConversationList from "./components/ConversationList";
import AdminDashboard from "./components/admin/AdminDashboard";
import "./components/LoadingApp.css";
import "./components/StatsPanel.css";
import constants from "./utils/constants";

const { API_BASE_URL, WEBUI_URL } = constants;
function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState("chat"); // 'chat' or 'file-chat'
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('all'); // Default to 'all'
  const [folders, setFolders] = useState([]);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for the showRateLimitStats event
  useEffect(() => {
    const handleShowStats = () => {
      setShowStatsPanel(true);
    };

    window.addEventListener("showRateLimitStats", handleShowStats);

    return () => {
      window.removeEventListener("showRateLimitStats", handleShowStats);
    };
  }, []);

  // Check authentication status on app start
  useEffect(() => {
    const checkAndRefreshAuth = async () => {
      if (authService.isAuthenticated()) {
        const currentUser = authService.getCurrentUser();
        if (
          currentUser &&
          currentUser.id &&
          /^[0-9a-fA-F]{24}$/.test(currentUser.id)
        ) {
          console.log("Authenticated user:", currentUser);
          setUser(currentUser);
          setError(null);
        } else {
          console.error("Invalid or missing user ID:", currentUser);
          setError(
            "Không thể xác thực người dùng: ID người dùng không hợp lệ. Vui lòng đăng nhập lại."
          );
        }
      } else {
        // Kiểm tra xem access token có hết hạn không nhưng refresh token vẫn hợp lệ
        const accessToken = localStorage.getItem("accessToken");
        const refreshToken = localStorage.getItem("refreshToken");

        // Nếu có refresh token và access token đã hết hạn, thử refresh
        if (
          refreshToken &&
          (!accessToken || window.jwtHelper?.isTokenExpired(accessToken))
        ) {
          console.log("Access token expired, trying to refresh...");
          try {
            // Thử refresh token
            const refreshResult = await authService.refreshToken();
            if (refreshResult.success) {
              console.log("Token refreshed successfully");
              // Lấy thông tin user sau khi refresh token thành công
              const userResponse = await authService.getCurrentUserInfo();
              if (userResponse.success) {
                setUser({
                  id: userResponse.data._id || userResponse.data.user_id,
                  username: userResponse.data.username,
                  name:
                    userResponse.data.student_name ||
                    userResponse.data.username,
                  studentCode: userResponse.data.student_code,
                  studentClass: userResponse.data.student_class,
                  loginTime: new Date().toISOString(),
                });
                localStorage.setItem("isLoggedIn", "true");
                setError(null);
              }
            } else {
              console.log("Failed to refresh token, logging out");
              authService.logout();
              setUser(null);
              setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
            }
          } catch (error) {
            console.error("Error refreshing token:", error);
            authService.logout();
            setUser(null);
            setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
          }
        }
      }
    };

    checkAndRefreshAuth();
  }, []);

  // Initialize conversations and conversation
  useEffect(() => {
    const init = async () => {
      if (user && user.id) {
        try {
          const convResponse = await chatService.getConversations(user.id);
          if (convResponse.success) {
            setConversations(convResponse.conversations);
            if (convResponse.conversations.length > 0) {
              setConversationId(convResponse.conversations[0].id);
            }
          } else {
            console.error("Failed to load conversations:", convResponse.error);
            setError("Lỗi khi tải danh sách hội thoại: " + convResponse.error);
          }
          
          // Load folders list from API
          console.log('Loading folders from API...');
          const foldersResponse = await chatService.getFolders();
          console.log('Folders API response:', foldersResponse);
          
          if (foldersResponse.success && foldersResponse.folders.length > 0) {
            // Map folders to include display names (optional, will show folder name if no mapping)
            const folderMappings = {
              'default': 'Mặc định',
              'phongdaotao': 'Phòng Đào tạo',
              'phongdaotao/daihoc': 'Phòng Đào tạo - Đại học',
              'phongdaotao/giangvien': 'Phòng Đào tạo - Giảng viên',
              'phongdaotao/thacsi': 'Phòng Đào tạo - Thạc sĩ',
              'phongdaotao/tiensi': 'Phòng Đào tạo - Tiến sĩ',
              'phongkhaothi': 'Phòng Khảo thí',
              'khoa': 'Các Khoa',
              'viennghiencuuvahoptacphattrien': 'Viện Nghiên cứu',
              'thongtinHVKTMM': 'Thông tin Học viện',
              'test': 'Test'
            };
            
            const mappedFolders = foldersResponse.folders.map(folder => ({
              name: folder,
              displayName: folderMappings[folder] || folder // Use folder name if no mapping found
            }));
            
            console.log('Mapped folders:', mappedFolders);
            setFolders(mappedFolders);
          } else {
            console.error('Failed to load folders from API:', foldersResponse.error);
            // Don't set any folders - dropdown will only show "Tất cả"
            setFolders([]);
          }
        } catch (error) {
          console.error("Error initializing conversations:", error.message);
          setError("Lỗi khi khởi tạo danh sách hội thoại: " + error.message);
        }
      }
    };
    init();
  }, [user]);

  // Load messages when conversationId changes
  useEffect(() => {
    const loadMessages = async () => {
      if (conversationId) {
        try {
          setIsLoading(true);
          const result = await chatService.getMessages(conversationId);
          if (result.success) {
            const formattedMessages = result.messages.map((msg) => ({
              id: msg.id || uuidv4(),
              content: msg.content,
              sender: msg.isUser ? "user" : "bot",
              timestamp: new Date(msg.createdAt),
            }));
            setMessages(formattedMessages);
          } else {
            console.error("Failed to load messages:", result.error);
            setError("Lỗi khi tải tin nhắn: " + result.error);
          }
        } catch (error) {
          console.error("Error loading messages:", error);
          setError("Lỗi khi tải tin nhắn: " + error.message);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadMessages();
  }, [conversationId]);

  // Save messages to localStorage with debounce
  useEffect(() => {
    const debounceSave = setTimeout(() => {
      if (messages.length > 0) {
        localStorage.setItem("chatMessages", JSON.stringify(messages));
      }
    }, 500);
    return () => clearTimeout(debounceSave);
  }, [messages]);

  const handleLogin = (userData) => {
    if (userData && userData.id) {
      console.log("Login successful, user:", userData);
      setUser(userData);

      // If user is admin, redirect to admin dashboard
      if (userData.role === "admin") {
        window.location.href = "/admin";
      }

      setError(null);
    } else {
      console.error("Login failed or invalid user data:", userData);
      setError(
        userData.error ||
          "Đăng nhập thất bại: Dữ liệu người dùng không hợp lệ. Vui lòng thử lại."
      );
    }
  };

  // Handle switch between chat modes
  const handleSwitchMode = (mode) => {
    setViewMode(mode);
    // Reset any other state if needed when switching modes
  };
  const handleSummaryClick = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/auth/generate_sso_token?user_id=${user.id}&email=${user.email}`
      );
      const data = await res.json();
      const token = data.token;
      // redirect sang WebUI với token
      window.location.href = `${WEBUI_URL}/sso?token=${token}`;
    } catch (err) {
      console.error("Error generating SSO token", err);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setMessages([]);
    setConversationId(null);
    setConversations([]);
    setError(null);
    localStorage.removeItem("chatMessages");
    setIsSidebarOpen(false);
  };

  const handleSendMessage = async (messageText, department = null) => {
    if (!messageText.trim()) {
      console.error("Cannot send message: Missing message text");
      setError("Không thể gửi tin nhắn: Nội dung trống.");
      return;
    }

    const userMessage = {
      id: uuidv4(),
      content: messageText,
      sender: "user",
      timestamp: new Date().toISOString(),
      department: department,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Nếu chưa có conversationId, tạo hội thoại mới trước
      let currentConversationId = conversationId;
      if (!currentConversationId) {
        if (!user || !user.id) {
          throw new Error("Không tìm thấy thông tin người dùng.");
        }
        console.log("Creating new conversation for user:", user.id);
        const response = await chatService.createConversation(
          user.id,
          `Cuộc trò chuyện ${new Date().toLocaleString()}`
        );
        if (!response.success) {
          throw new Error("Không thể tạo hội thoại mới: " + response.error);
        }
        const newConversation = response.conversation;
        currentConversationId = newConversation.id;
        setConversationId(currentConversationId); // Gán ngay giá trị mới
        setConversations((prev) => [newConversation, ...prev]);
        console.log("New conversation created, ID:", currentConversationId);
      } else {
        console.log("Using existing conversationId:", currentConversationId);
      }

      // Gửi tin nhắn với conversationId đã xác định
      console.log('Sending message with conversationId:', currentConversationId);
      const response = await chatService.sendMessage(
        currentConversationId, 
        messageText,
        selectedFolder === 'all' ? null : selectedFolder // Send null for 'all', otherwise send the selected folder
      );
      if (response.success) {
        const botMessage = {
          id: uuidv4(),
          content:
            response.message.content ||
            "Xin lỗi, tôi không hiểu câu hỏi của bạn.",
          sender: "bot",
          timestamp: response.message.createdAt || new Date().toISOString(),
        };
        setMessages((prev) => [...prev, botMessage]);
        setError(null);
      } else {
        // Kiểm tra nếu là lỗi rate limit (status code 429)
        console.log('Response error:', response);
        
        // Safely convert error to string
        let errorMsg = '';
        if (typeof response.error === 'string') {
          errorMsg = response.error;
        } else if (response.error && typeof response.error === 'object') {
          // Check if it's a validation error array
          if (Array.isArray(response.error)) {
            errorMsg = response.error.map(err => {
              if (typeof err === 'string') return err;
              if (err.msg) return err.msg;
              return JSON.stringify(err);
            }).join(', ');
          } else {
            errorMsg = JSON.stringify(response.error);
          }
        }
        
        let responseMsg = '';
        if (typeof response.message === 'string') {
          responseMsg = response.message;
        } else if (response.message && typeof response.message === 'object') {
          responseMsg = JSON.stringify(response.message);
        }
        
        if (response.statusCode === 429 || errorMsg?.includes('giới hạn') || errorMsg?.includes('limit')) {
          // Hiển thị thông báo giới hạn tốc độ chính xác từ API
          const rateLimitMessage = {
            id: uuidv4(),
            content: `⚠️ ${responseMsg || errorMsg || 'Bạn đã vượt quá giới hạn gửi tin nhắn. Vui lòng thử lại sau.'}`,
            sender: 'bot',
            timestamp: new Date().toISOString(),
            isError: true,
            isRateLimit: true,
          };
          setMessages((prev) => [...prev, rateLimitMessage]);

          // Không hiển thị bảng thống kê sử dụng
          // window.dispatchEvent(new Event('showRateLimitStats'));
          
          setError(responseMsg || errorMsg);
        } else {
          throw new Error(errorMsg || responseMsg || 'Failed to send message');
        }
      }
    } catch (error) {
      console.error("Error sending message:", error.message);
      let errorText =
        "Xin lỗi, có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại sau.";
      let isRateLimit = false;

      // Kiểm tra lỗi rate limit
      if (error.response && error.response.status === 429) {
        errorText =
          error.response.data?.message ||
          "Bạn đã vượt quá giới hạn gửi tin nhắn. Vui lòng thử lại sau.";
        isRateLimit = true;
        // Không hiển thị bảng thống kê sử dụng
        // window.dispatchEvent(new Event('showRateLimitStats'));
      } else if (error.response && error.response.status === 403) {
        // Lỗi phân quyền hoặc giới hạn phạm vi truy vấn
        const detailData = error.response.data?.detail || error.response.data?.message;
        errorText = typeof detailData === 'string' ? detailData : 
                   JSON.stringify(detailData) || 'Câu hỏi này vượt ngoài phạm vi được phép. Vui lòng chọn phạm vi phù hợp hoặc hỏi câu hỏi khác.';
      } else if (error.response && error.response.status === 401) {
        errorText = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (error.response && error.response.status === 400) {
        const detailData = error.response.data?.detail || error.response.data?.message;
        errorText = typeof detailData === 'string' ? detailData : 
                   JSON.stringify(detailData) || 'Dữ liệu gửi không hợp lệ. Vui lòng kiểm tra lại.';
      } else if (error.response && error.response.status === 500) {
        errorText = 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau hoặc liên hệ với quản trị viên.';
      } else if (error.message.includes('Invalid ID format')) {
        errorText = 'Lỗi: ID hội thoại không hợp lệ. Vui lòng thử lại.';
      } else if (error.message.includes('Unprocessable')) {
        errorText = 'Lỗi: Dữ liệu gửi không hợp lệ. Vui lòng kiểm tra lại.';
      } else if (error.message.includes('giới hạn') || error.message.includes('limit')) {
        errorText = error.message;
        isRateLimit = true;
        // Không hiển thị bảng thống kê sử dụng
        // window.dispatchEvent(new Event('showRateLimitStats'));
      } else if (error.message.includes("Network Error")) {
        errorText =
          "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.";
      } else if (error.message.includes("timeout")) {
        errorText = "Yêu cầu bị hết thời gian chờ. Vui lòng thử lại sau.";
      } else {
        // Sử dụng thông báo lỗi chi tiết từ error.message hoặc response
        const detailData = error.response?.data?.detail || error.response?.data?.message;
        errorText = typeof detailData === 'string' ? detailData :
                   (detailData ? JSON.stringify(detailData) : '') ||
                   error.message || 
                   'Có lỗi không xác định xảy ra. Vui lòng thử lại sau.';
      }

      const errorMessage = {
        id: uuidv4(),
        content: errorText,
        sender: "bot",
        timestamp: new Date().toISOString(),
        isError: true,
        isRateLimit: isRateLimit,
      };
      setMessages((prev) => [...prev, errorMessage]);
      setError(errorText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = async (newConversation) => {
    if (!user || !user.id) {
      console.error("User or user.id is not available");
      setError("Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.");
      return;
    }
    if (!/^[0-9a-fA-F]{24}$/.test(user.id)) {
      console.error("Invalid user ID format:", user.id);
      setError("ID người dùng không hợp lệ. Vui lòng đăng nhập lại.");
      return;
    }
    try {
      let conversation = newConversation;
      if (!conversation) {
        console.log("Creating new conversation for user:", user.id);
        const response = await chatService.createConversation(
          user.id,
          `Cuộc trò chuyện ${new Date().toLocaleString()}`
        );
        if (!response.success) {
          console.error("Failed to create new conversation:", response.error);
          setError("Không thể tạo hội thoại mới: " + response.error);
          return;
        }
        conversation = response.conversation;
      }
      setMessages([]);
      setConversationId(conversation.id);
      setConversations((prev) => [conversation, ...prev]);
      setError(null);
      localStorage.removeItem("chatMessages");

      // Scroll to top when creating a new conversation
      window.scrollTo(0, 0);

      // Also ensure the chat area scrolls to top
      const chatArea = document.querySelector(".chat-area");
      if (chatArea) {
        chatArea.scrollTop = 0;
      }
    } catch (error) {
      console.error("Error creating new conversation:", error.message);
      setError("Lỗi khi tạo hội thoại mới: " + error.message);
    }
  };

  const handleConversationSelect = (selectedId) => {
    setConversationId(selectedId);
    setMessages([]); // Reset messages when switching conversation
    setIsSidebarOpen(false); // Close sidebar on mobile after selection

    // Scroll to top when selecting a new conversation
    window.scrollTo(0, 0);

    // Also ensure the chat area scrolls to top
    const chatArea = document.querySelector(".chat-area");
    if (chatArea) {
      chatArea.scrollTop = 0;
    }
  };

  const getWelcomeMessage = () => {
    if (user) {
      return `Xin chào ${
        user.name || "người dùng"
      }! Tôi là trợ lý AI của Học viện Kỹ thuật Mật mã. Tôi có thể giúp bạn về các thông tin học tập, quy định nhà trường, và nhiều câu hỏi khác. Hãy hỏi tôi bất cứ điều gì bạn muốn biết!`;
    }
    return "Xin chào! Tôi là trợ lý AI của Học viện Kỹ thuật Mật mã.";
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* AppBar luôn ở trên cùng */}
      <AppBar
        user={user}
        onLogout={handleLogout}
        viewMode={viewMode}
        onSwitchMode={handleSwitchMode}
        handleSummaryClick={handleSummaryClick}
      />

      {viewMode === "file-chat" ? (
        <div className="flex-1 p-4 mt-2">
          <FileChat onBack={() => setViewMode("chat")} />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div
            className={`
              ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
              lg:translate-x-0 lg:static lg:inset-0
              fixed inset-y-0 left-0 z-50 w-80
              transition duration-300 ease-in-out transform
              bg-white border-r border-gray-200
            `}
          >
            <ConversationList
              user={user}
              selectedConversationId={conversationId}
              onConversationSelect={handleConversationSelect}
              onNewConversation={handleNewConversation}
              conversations={conversations}
              setConversations={setConversations}
            />
          </div>
          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile header */}
            <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                <FiMenu className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                Chatbot KMA
              </h1>
              <div className="w-10"></div>
            </div>
            {/* Chat Content */}
            <main className="flex-1 overflow-hidden pt-2">
              {error && (
                <div
                  className="error-message"
                  style={{ color: "red", padding: "10px", textAlign: "center" }}
                >
                  {error}
                </div>
              )}

              {/* Rate Limit Stats Panel */}
              {showStatsPanel && (
                <div className="stats-panel-container">
                  <div className="stats-panel-header">
                    <h3>Thống kê sử dụng</h3>
                    <button
                      className="close-button"
                      onClick={() => setShowStatsPanel(false)}
                    >
                      <FiX />
                    </button>
                  </div>
                  <UsageStats />
                </div>
              )}

              <div
                className="chat-area flex-1 overflow-y-auto"
                style={{
                  maxHeight: "calc(100vh - 120px)", // Điều chỉnh dựa trên chiều cao AppBar (60px) + header di động (60px)
                  paddingBottom: "80px", // Đảm bảo không bị che bởi ChatInput (chiều cao ~60px + padding)
                  paddingTop: "10px", // Thêm padding-top để tránh bị AppBar che khi tạo cuộc trò chuyện mới
                }}
              >
                {messages.length === 0 ? (
                  <WelcomeScreen
                    user={user}
                    onSendMessage={handleSendMessage}
                    welcomeMessage={getWelcomeMessage()}
                  />
                ) : (
                  <ChatMessages messages={messages} isLoading={isLoading} />
                )}
                <div ref={messagesEndRef} />
              </div>
            </main>
            {/* ChatInput cố định ở dưới cùng */}
            <ChatInput
              onSendMessage={handleSendMessage}
              disabled={isLoading || !user} // Chỉ disabled khi loading hoặc chưa đăng nhập
              selectedFolder={selectedFolder}
              onFolderChange={setSelectedFolder}
              folders={folders}
            />
          </div>
          {/* Overlay for mobile sidebar */}
          {isSidebarOpen && (
            <div
              className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
              onClick={() => setIsSidebarOpen(false)}
            >
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg text-white hover:bg-white hover:bg-opacity-20"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if user is logged in and get role
    const checkAuth = async () => {
      setIsCheckingAuth(true);
      if (authService.isAuthenticated()) {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      }
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, []);

  const handleLogin = (userData) => {
    if (userData && userData.id) {
      console.log("App: Login successful, user:", userData);
      setUser(userData);

      // If user is admin, redirect to admin dashboard
      if (userData.role === "admin") {
        // Already on admin page, no need to redirect
        console.log("User is admin, staying on admin page");
      }
    } else {
      console.error("App: Login failed or invalid user data:", userData);
    }
  };

  // Show loading indicator while checking authentication
  if (isCheckingAuth) {
    return <div className="loading-app">Đang tải...</div>;
  }

  // Redirect based on user role
  return (
    <Router>
      <Routes>
        <Route
          path="/admin/*"
          element={
            user && user.role === "admin" ? (
              <AdminDashboard />
            ) : (
              <Login onLogin={handleLogin} adminMode={true} />
            )
          }
        />
        <Route path="/*" element={<ChatApp />} />
      </Routes>
    </Router>
  );
}

export default App;
