import React, { useState, useEffect } from 'react';
import { FiMessageSquare, FiPlus, FiTrash2, FiEdit3 } from 'react-icons/fi';
import chatService from '../services/chatService';

const ConversationList = ({ 
  user, 
  selectedConversationId, 
  onConversationSelect, 
  onNewConversation,
  conversations,
  setConversations 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // Load conversations on component mount
  useEffect(() => {
    const loadConversationsOnMount = async () => {
      if (!user || !user.id) return;
      
      setIsLoading(true);
      try {
        const result = await chatService.getConversations(user.id);
        if (result.success) {
          setConversations(result.conversations);
        } else {
          console.error('Failed to load conversations:', result.error);
          alert('Lỗi khi tải danh sách hội thoại: ' + result.error);
        }
      } catch (error) {
        console.error('Error loading conversations:', error.message);
        alert('Lỗi khi tải danh sách hội thoại: ' + error.message);
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
      alert('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }
    
    // Kiểm tra token hết hạn trước khi tạo hội thoại
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const isExpired = !accessToken || window.jwtHelper?.isTokenExpired(accessToken);
    
    if (isExpired) {
      // Nếu có refresh token, thử refresh token trước
      if (refreshToken) {
        try {
          const authService = await import('../services/authService').then(module => module.default);
          const refreshResult = await authService.refreshToken();
          
          if (!refreshResult.success) {
            alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            localStorage.removeItem('userInfo');
            localStorage.removeItem('isLoggedIn');
            window.location.href = '/login';
            return;
          }
          // Refresh token thành công, tiếp tục tạo hội thoại
        } catch (error) {
          console.error('Error refreshing token:', error);
          alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          localStorage.removeItem('userInfo');
          localStorage.removeItem('isLoggedIn');
          window.location.href = '/login';
          return;
        }
      } else {
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('isLoggedIn');
        window.location.href = '/login';
        return;
      }
    }
    
    try {
      setIsLoading(true);
      const result = await chatService.createConversation(
        user.id,
        `Cuộc trò chuyện ${new Date().toLocaleString()}`
      );
      
      if (result.success) {
        const newConversation = result.conversation;
        onConversationSelect(newConversation.id);
        if (onNewConversation) {
          onNewConversation(newConversation);
        }
      } else {
        console.error('Failed to create conversation:', result.error);
        alert('Không thể tạo hội thoại mới: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating conversation:', error.message);
      alert('Lỗi khi tạo hội thoại mới: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    
    if (!window.confirm('Bạn có chắc chắn muốn xóa cuộc trò chuyện này?')) {
      return;
    }

    try {
      const result = await chatService.deleteConversation(conversationId);
      if (result.success) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        
        if (selectedConversationId === conversationId) {
          onConversationSelect(null);
        }
      } else {
        console.error('Failed to delete conversation:', result.error);
        alert('Không thể xóa cuộc trò chuyện: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error.message);
      alert('Có lỗi xảy ra khi xóa cuộc trò chuyện: ' + error.message);
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
      const result = await chatService.updateConversation(conversationId, editTitle.trim());
      if (result.success) {
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, title: editTitle.trim() }
              : conv
          )
        );
        setEditingId(null);
        setEditTitle('');
      } else {
        console.error('Failed to update conversation:', result.error);
        alert('Không thể cập nhật tiêu đề: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating conversation:', error.message);
      alert('Có lỗi xảy ra khi cập nhật tiêu đề: ' + error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
  };

  if (!user) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>Đăng nhập để lưu cuộc trò chuyện</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Cuộc trò chuyện</h2>
          <button
            onClick={handleNewConversation}
            className="flex items-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
            disabled={isLoading}
          >
            <FiPlus className="w-4 h-4" />
            <span>Trò chuyện mới</span>
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2">Đang tải...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <FiMessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Chưa có cuộc trò chuyện nào</p>
            <p className="text-sm">Nhấn "Trò chuyện mới" để bắt đầu</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onConversationSelect(conversation.id)}
                className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedConversationId === conversation.id
                    ? 'bg-blue-100 border border-blue-200'
                    : 'bg-white hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {editingId === conversation.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => handleSaveTitle(conversation.id)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveTitle(conversation.id);
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          className="flex-1 text-sm font-medium bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ) : (
                      <>
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {conversation.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(conversation.updatedAt)}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleEditTitle(conversation.id, conversation.title, e)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      title="Đổi tên"
                    >
                      <FiEdit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteConversation(conversation.id, e)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Xóa"
                    >
                      <FiTrash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;