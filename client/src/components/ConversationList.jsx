import React, { useState, useEffect } from "react";
import {
  FiMessageSquare,
  FiPlus,
  FiTrash2,
  FiEdit3,
  FiLogOut,
  FiSettings,
  FiMoon,
  FiSun,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import chatService from "../services/chatService";
import "./ConversationList.css";

const ConversationList = ({
  user,
  selectedConversationId,
  onConversationSelect,
  onNewConversation,
  conversations,
  setConversations,
  onLogout,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    const loadConversationsOnMount = async () => {
      if (!user || !user.id) return;

      setIsLoading(true);
      try {
        const result = await chatService.getConversations(user.id);
        if (result.success) {
          setConversations(result.conversations);
        } else {
          console.error("Failed to load conversations:", result.error);
        }
      } catch (error) {
        console.error("Error loading conversations:", error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (user && user.id) {
      loadConversationsOnMount();
    }
  }, [user, setConversations]);

  const handleNewConversation = async () => {
    if (!user || !user.id) {
      alert("Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.");
      return;
    }

    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");
    const isExpired =
      !accessToken || window.jwtHelper?.isTokenExpired(accessToken);

    if (isExpired) {
      if (refreshToken) {
        try {
          const authService = await import("../services/authService").then(
            (module) => module.default,
          );
          const refreshResult = await authService.refreshToken();
          if (!refreshResult.success) {
            alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
            localStorage.removeItem("userInfo");
            localStorage.removeItem("isLoggedIn");
            window.location.href = "/login";
            return;
          }
        } catch (error) {
          console.error("Error refreshing token:", error);
          alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
          localStorage.removeItem("userInfo");
          localStorage.removeItem("isLoggedIn");
          window.location.href = "/login";
          return;
        }
      } else {
        alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        localStorage.removeItem("userInfo");
        localStorage.removeItem("isLoggedIn");
        window.location.href = "/login";
        return;
      }
    }

    try {
      setIsLoading(true);
      const result = await chatService.createConversation(
        user.id,
        `Cuộc trò chuyện ${new Date().toLocaleString()}`,
      );

      if (result.success) {
        const newConversation = result.conversation;
        onConversationSelect(newConversation.id);
        if (onNewConversation) {
          onNewConversation(newConversation);
        }
      } else {
        console.error("Failed to create conversation:", result.error);
        alert("Không thể tạo hội thoại mới: " + result.error);
      }
    } catch (error) {
      console.error("Error creating conversation:", error.message);
      alert("Lỗi khi tạo hội thoại mới: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    if (!window.confirm("Bạn có chắc chắn muốn xóa cuộc trò chuyện này?"))
      return;

    try {
      const result = await chatService.deleteConversation(conversationId);
      if (result.success) {
        setConversations((prev) =>
          prev.filter((conv) => conv.id !== conversationId),
        );
        if (selectedConversationId === conversationId) {
          onConversationSelect(null);
        }
      } else {
        alert("Không thể xóa cuộc trò chuyện: " + result.error);
      }
    } catch (error) {
      alert("Có lỗi xảy ra khi xóa cuộc trò chuyện: " + error.message);
    }
  };

  const handleEditTitle = (conversationId, currentTitle, e) => {
    e.stopPropagation();
    setEditingId(conversationId);
    setEditTitle(currentTitle);
  };

  const handleSaveTitle = async (conversationId) => {
    if (!editTitle.trim()) return;
    try {
      const result = await chatService.updateConversation(
        conversationId,
        editTitle.trim(),
      );
      if (result.success) {
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId
              ? { ...conv, title: editTitle.trim() }
              : conv,
          ),
        );
        setEditingId(null);
        setEditTitle("");
      } else {
        alert("Không thể cập nhật tiêu đề: " + result.error);
      }
    } catch (error) {
      alert("Có lỗi xảy ra: " + error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const getUserInitials = () => {
    if (!user?.name) return "U";
    const parts = user.name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return user.name[0].toUpperCase();
  };

  if (!user) {
    return (
      <div className="sidebar-login-msg">
        <p>Đăng nhập để lưu cuộc trò chuyện</p>
      </div>
    );
  }

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <button
          onClick={handleNewConversation}
          className="new-chat-button"
          disabled={isLoading}
        >
          <FiPlus size={18} />
          <span>Cuộc trò chuyện mới</span>
        </button>
      </div>

      {/* Conversations */}
      <div className="sidebar-conversations">
        {isLoading ? (
          <div className="sidebar-loading">
            <div className="sidebar-spinner" />
            <p>Đang tải...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="sidebar-empty">
            <FiMessageSquare size={28} />
            <p>Chưa có cuộc trò chuyện nào</p>
            <span>Nhấn nút ở trên để bắt đầu</span>
          </div>
        ) : (
          <div className="sidebar-list">
            <div className="sidebar-section-label">Gần đây</div>
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onConversationSelect(conversation.id)}
                className={`sidebar-item ${
                  selectedConversationId === conversation.id ? "active" : ""
                }`}
              >
                <div className="sidebar-item-content">
                  {editingId === conversation.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleSaveTitle(conversation.id)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") handleSaveTitle(conversation.id);
                        else if (e.key === "Escape") handleCancelEdit();
                      }}
                      className="sidebar-edit-input"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <FiMessageSquare
                        size={14}
                        className="sidebar-item-icon"
                      />
                      <div className="sidebar-item-text">
                        <h3 title={conversation.preview || conversation.title}>
                          {conversation.title}
                        </h3>
                        {conversation.preview && (
                          <p className="sidebar-item-preview">
                            {conversation.preview}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="sidebar-item-actions">
                  <button
                    onClick={(e) =>
                      handleEditTitle(conversation.id, conversation.title, e)
                    }
                    className="sidebar-action-btn"
                    title="Đổi tên"
                  >
                    <FiEdit3 size={13} />
                  </button>
                  <button
                    onClick={(e) =>
                      handleDeleteConversation(conversation.id, e)
                    }
                    className="sidebar-action-btn danger"
                    title="Xóa"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - User Info */}
      <div className="sidebar-footer">
        <div className="sidebar-user-info">
          <div className="sidebar-user-avatar">{getUserInitials()}</div>
          <span className="sidebar-user-name">
            {user.name || user.username || "Người dùng"}
          </span>
          <div className="sidebar-user-actions">
            <button
              className="sidebar-action-btn"
              onClick={onToggleDarkMode}
              title={isDarkMode ? "Chế độ sáng" : "Chế độ tối"}
            >
              {isDarkMode ? <FiSun size={14} /> : <FiMoon size={14} />}
            </button>
            {user.role === "admin" && (
              <Link to="/admin" className="sidebar-action-btn" title="Quản trị">
                <FiSettings size={14} />
              </Link>
            )}
            <button
              className="sidebar-action-btn"
              onClick={onLogout}
              title="Đăng xuất"
            >
              <FiLogOut size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationList;
