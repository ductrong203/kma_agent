import constants from '../utils/constants';
import httpClient from '../utils/httpClient';

const { API_ENDPOINTS } = constants;

const chatService = {
  // Department-specific query
  queryDepartment: async (query, department) => {
    try {
      // Get current user info for context
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // Add student_code to header if available
      if (userInfo.student_code) {
        headers['student_code'] = userInfo.student_code;
      }
      
      const response = await httpClient.post(
        `${API_ENDPOINTS.DEPARTMENT_QUERY}?department=${encodeURIComponent(department)}`,
        {
          content: query
        },
        { headers }
      );
      
      if (response.statusCode === 200 && response.data) {
        return {
          success: true,
          message: {
            id: `dept_${Date.now()}`, // Generate unique ID for department response
            content: response.data.content,
            isUser: false, // This is a bot response
            createdAt: response.data.created_at,
          },
          department: department
        };
      } else {
        throw new Error(response.message || 'Failed to query department');
      }
    } catch (error) {
      console.error('Error in department query:', error);
      return {
        success: false,
        error: error.message || 'Failed to query department'
      };
    }
  },

  // Upload file for chat
  uploadFile: async (formData) => {
    try {
      const response = await httpClient.upload(API_ENDPOINTS.UPLOAD_FILE, formData);
      
      return {
        success: true,
        fileInfo: response.fileInfo
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload file'
      };
    }
  },
  
  // Query uploaded file
  queryFile: async (fileId, query) => {
    try {
      const response = await httpClient.post(API_ENDPOINTS.QUERY_FILE, {
        file_id: fileId,
        query: query
      });
      
      return {
        success: true,
        answer: response.answer,
        sources: response.sources,
        file: response.file,
        timestamp: response.timestamp
      };
    } catch (error) {
      console.error('Error querying file:', error);
      return {
        success: false,
        error: error.message || 'Failed to query file'
      };
    }
  },
  
  // Query uploaded file with multiple questions
  multiQueryFile: async (fileId, queries) => {
    try {
      const response = await httpClient.post(API_ENDPOINTS.MULTI_QUERY_FILE, {
        file_id: fileId,
        queries: queries
      });
      
      return {
        success: true,
        results: response.results,
        file: response.file,
        timestamp: response.timestamp
      };
    } catch (error) {
      console.error('Error multi-querying file:', error);
      return {
        success: false,
        error: error.message || 'Failed to process multiple queries'
      };
    }
  },
  
  // Get information about an uploaded file
  getFileInfo: async (fileId) => {
    try {
      const response = await httpClient.get(`${API_ENDPOINTS.FILE_INFO}/${fileId}`);
      
      return {
        success: true,
        fileInfo: response.fileInfo
      };
    } catch (error) {
      console.error('Error getting file info:', error);
      return {
        success: false,
        error: error.message || 'Failed to get file information'
      };
    }
  },
  
  // List all uploaded files
  listFiles: async () => {
    try {
      const response = await httpClient.get(API_ENDPOINTS.LIST_FILES);
      
      return {
        success: true,
        files: response.files,
        count: response.count
      };
    } catch (error) {
      console.error('Error listing files:', error);
      return {
        success: false,
        error: error.message || 'Failed to list files'
      };
    }
  },
  
  // Delete an uploaded file
  deleteFile: async (fileId) => {
    try {
      const response = await httpClient.delete(`${API_ENDPOINTS.DELETE_FILE}/${fileId}`);
      
      return {
        success: true,
        message: response.message
      };
    } catch (error) {
      console.error('Error deleting file:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete file'
      };
    }
  },

  // Get list of folders (departments)
  getFolders: async () => {
    try {
      const response = await httpClient.get(API_ENDPOINTS.LIST_FOLDERS);
      
      return {
        success: true,
        folders: response.folders || [],
        count: response.count || 0
      };
    } catch (error) {
      console.error('Error getting folders:', error);
      return {
        success: false,
        folders: [],
        error: error.message || 'Failed to get folders'
      };
    }
  },
  
  // Quick chat without saving conversation
  sendQuickMessage: async (message, department = null) => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const headers = {
        'Content-Type': 'application/json',
      };
      if (userInfo.student_code) {
        headers['student_code'] = userInfo.student_code;
      }

      const response = await httpClient.post(API_ENDPOINTS.QUICK_CHAT, {
        content: message,
        department: department
      }, { headers });

      if (response.statusCode === 200 && response.data) {
        return {
          success: true,
          message: {
            id: response.data._id || `quick_${Date.now()}`, // Thêm ID mặc định nếu API không cung cấp
            content: response.data.content,
            isUser: response.data.is_user || false,
            createdAt: response.data.created_at,
          },
          metadata: response.metadata || null,
        };
      } else {
        throw new Error(response.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending quick message:', error);
      return {
        success: false,
        message: {
          id: `error_${Date.now()}`,
          content: 'Xin lỗi, hiện tại hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
          isUser: false,
          createdAt: new Date().toISOString(),
        },
        error: error.message,
      };
    }
  },

  // Create new conversation
  createConversation: async (userId, title = 'Cuộc trò chuyện mới') => {
    try {
      const response = await httpClient.post(API_ENDPOINTS.CONVERSATIONS, {
        user_id: userId,
        title: title,
      });

      if (response.statusCode === 201 && response.data) {
        return {
          success: true,
          conversation: {
            id: response.data._id,
            userId: response.data.user_id,
            title: response.data.title,
            createdAt: response.data.created_at,
            updatedAt: response.data.updated_at,
          },
        };
      } else {
        throw new Error(response.message || 'Failed to create conversation');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Get user conversations
  getConversations: async (userId, skip = 0, limit = 20) => {
    try {
      const response = await httpClient.get(
        `${API_ENDPOINTS.CONVERSATIONS}?user_id=${userId}&skip=${skip}&limit=${limit}`
      );

      if (response.statusCode === 200 && response.data) {
        return {
          success: true,
          conversations: response.data.map(conv => ({
            id: conv._id,
            userId: conv.user_id,
            title: conv.title,
            createdAt: conv.created_at,
            updatedAt: conv.updated_at,
          })),
        };
      } else {
        throw new Error(response.message || 'Failed to get conversations');
      }
    } catch (error) {
      console.error('Error getting conversations:', error);
      return {
        success: false,
        conversations: [],
        error: error.message,
      };
    }
  },

  // Get messages from a conversation
  getMessages: async (conversationId, skip = 0, limit = 50) => {
    try {
      const response = await httpClient.get(
        `${API_ENDPOINTS.MESSAGES}/${conversationId}?skip=${skip}&limit=${limit}`
      );

      if (response.statusCode === 200 && response.data) {
        return {
          success: true,
          messages: response.data.map(msg => ({
            id: msg._id,
            content: msg.content,
            isUser: msg.is_user,
            createdAt: msg.created_at,
          })),
        };
      } else {
        throw new Error(response.message || 'Failed to get messages');
      }
    } catch (error) {
      console.error('Error getting messages:', error);
      return {
        success: false,
        messages: [],
        error: error.message,
      };
    }
  },

  // Send message to a conversation and get AI response
  sendMessage: async (conversationId, message, department = null) => {
    try {
      console.log(conversationId, message, department);
      
      // If specific department is selected, use department-specific query
      if (department && department !== 'default') {
        console.log('Using department-specific query for:', department);
        return await chatService.queryDepartment(message, department);
      }
      
      // Otherwise use regular conversation messaging
      // Get current user info for context
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // Add student_code to header if available
      if (userInfo.student_code) {
        headers['student_code'] = userInfo.student_code;
      }
      
      const requestBody = {
        content: message,
        is_user: true,
      };
      
      // Add department if provided
      if (department) {
        requestBody.department = department;
      }
      
      const response = await httpClient.post(
        `/api/chat/${conversationId}/messages`,
        requestBody,
        { headers }
      );

      if (response.statusCode === 201 && response.data) {
        return {
          success: true,
          message: {
            id: response.data._id,
            content: response.data.content,
            isUser: response.data.is_user,
            createdAt: response.data.created_at,
          },
        };
      } else {
        throw new Error(response.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Kiểm tra nếu là lỗi rate limit (HTTP 429)
      if (error.response && error.response.status === 429) {
        return {
          success: false,
          statusCode: 429,
          message: error.response.data?.message || 'Bạn đã vượt quá giới hạn gửi tin nhắn. Vui lòng thử lại sau.',
          error: error.response.data?.message || error.message,
          isRateLimit: true
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Update conversation title
  updateConversation: async (conversationId, title) => {
    try {
      const response = await httpClient.put(
        `/api/chat/conversations/${conversationId}`,
        { title }
      );

      if (response.statusCode === 200 && response.data) {
        return {
          success: true,
          conversation: {
            id: response.data._id,
            userId: response.data.user_id,
            title: response.data.title,
            createdAt: response.data.created_at,
            updatedAt: response.data.updated_at,
          },
        };
      } else {
        throw new Error(response.message || 'Failed to update conversation');
      }
    } catch (error) {
      console.error('Error updating conversation:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Delete conversation
  deleteConversation: async (conversationId) => {
    try {
      const response = await httpClient.delete(`/api/chat/conversations/${conversationId}`);

      if (response.statusCode === 200) {
        return {
          success: true,
          message: response.message,
        };
      } else {
        throw new Error(response.message || 'Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Get chatbot status
  getStatus: async () => {
    try {
      const response = await httpClient.get(API_ENDPOINTS.HEALTH);
      return {
        success: true,
        status: response.status || 'online',
        data: response,
      };
    } catch (error) {
      console.error('Error getting chatbot status:', error);
      return { 
        success: false,
        status: 'offline',
        error: error.message,
      };
    }
  },

  // Legacy method for backward compatibility
  sendMessageLegacy: async (message, conversationId = null) => {
    if (conversationId) {
      return await chatService.sendMessage(conversationId, message);
    } else {
      return await chatService.sendQuickMessage(message);
    }
  },

  // Get chat history (legacy method for backward compatibility)
  getChatHistory: async (conversationId) => {
    if (conversationId) {
      return await chatService.getMessages(conversationId);
    } else {
      return { success: false, messages: [], error: 'No conversation ID provided' };
    }
  },

  // Feedback on response
  sendFeedback: async (messageId, rating, comment) => {
    try {
      const response = await httpClient.post(API_ENDPOINTS.FEEDBACK, {
        message_id: messageId,
        rating: rating,
        comment: comment,
        timestamp: new Date().toISOString(),
      });
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error sending feedback:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

export default chatService;
