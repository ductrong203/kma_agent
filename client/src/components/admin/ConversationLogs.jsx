import React, { useState, useEffect } from 'react';
import { 
  FiSearch, FiCalendar, FiUser, FiMessageCircle, 
  FiChevronDown, FiChevronRight, FiDownload, FiFilter 
} from 'react-icons/fi';
import './ConversationLogs.css';
import userService from '../../services/userService';
import httpClient from '../../utils/httpClient';
import constants from '../../utils/constants';

const ConversationLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    username: '',
    status: 'all'
  });
  const [expandedConversationId, setExpandedConversationId] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        // Fetch user data for matching IDs to usernames
        const userResponse = await userService.getAllUsers();
        const users = userResponse.success ? userResponse.data.data : [];
        const userMap = {};
        
        if (users && users.length > 0) {
          users.forEach(user => {
            userMap[user.id] = user.username;
          });
        }

        // Create query parameters for filtering
        const queryParams = new URLSearchParams();
        
        if (filters.startDate) queryParams.append('startDate', filters.startDate);
        if (filters.endDate) queryParams.append('endDate', filters.endDate);
        if (filters.username) queryParams.append('username', filters.username);
        if (filters.status !== 'all') queryParams.append('status', filters.status);
        
        // Fetch conversations using httpClient
        const { API_ENDPOINTS } = constants;
        console.log('Calling API:', `${API_ENDPOINTS.CONVERSATIONS}?${queryParams.toString()}&trace=1`);
        const response = await httpClient.get(`${API_ENDPOINTS.CONVERSATIONS}?${queryParams.toString()}&trace=1`);
        console.log('API response:', response);
        
        // Phản hồi API có thể có cấu trúc khác nhau, xử lý cả hai trường hợp
        const conversationsData = response.data || 
                                 (response.statusCode === 200 && response.data ? response.data : []);
                                 
        if (conversationsData && conversationsData.length > 0) {
          // Convert API response to our format
          const conversationPromises = conversationsData.map(async (conv) => {
            // Fetch messages for each conversation
            let messages = [];
            try {
              const messagesResponse = await httpClient.get(`${API_ENDPOINTS.MESSAGES}/${conv._id}`);
              messages = messagesResponse.data || 
                        (messagesResponse.statusCode === 200 && messagesResponse.data ? 
                          messagesResponse.data : []);
            } catch (error) {
              console.error(`Error fetching messages for conversation ${conv._id}:`, error);
            }
            
            // Calculate total tokens and find errors
            const totalTokens = messages
              .filter(m => !m.is_user)
              .reduce((sum, m) => {
                // Estimate token count (4 chars per token)
                const tokens = Math.ceil(m.content.length / 4);
                return sum + tokens;
              }, 0);
            
            // Check if any errors in conversation
            const hasError = messages.some(m => 
              m.content.toLowerCase().includes('error') || 
              m.content.toLowerCase().includes('lỗi')
            );
            
            return {
              id: conv._id,
              username: userMap[conv.user_id] || conv.user_id, // Use username if found, otherwise use ID
              startTime: conv.created_at,
              endTime: conv.updated_at,
              messageCount: messages.length,
              status: hasError ? 'error' : 'success',
              totalTokens: totalTokens,
              messages: messages.map(m => ({
                id: m._id,
                sender: m.is_user ? 'user' : 'bot',
                content: m.content,
                timestamp: m.created_at,
                tokens: m.is_user ? 0 : Math.ceil(m.content.length / 4) // Estimate tokens
              }))
            };
          });
          
          const processedLogs = await Promise.all(conversationPromises);
          
          // Apply search filter
          const filteredLogs = processedLogs.filter(log => {
            if (!search) return true;
            
            // Search in username and message content
            return log.username.includes(search) || 
                  log.messages.some(m => 
                    m.content.toLowerCase().includes(search.toLowerCase())
                  );
          });
          
          setLogs(filteredLogs);
        } else {
          console.warn('No conversations found in API response');
          setLogs([]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching logs:', error);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    // Thêm độ trễ nhỏ để đảm bảo token đã được thiết lập đúng
    const timer = setTimeout(() => {
      fetchLogs();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [filters, search]); // Removed constants from dependencies

  const toggleConversation = (id) => {
    if (expandedConversationId === id) {
      setExpandedConversationId(null);
    } else {
      setExpandedConversationId(id);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleFilterPanel = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      username: '',
      status: 'all'
    });
    setSearch('');
  };

  const exportLogs = () => {
    try {
      // Convert logs to CSV format
      const headers = [
        'ID hội thoại', 
        'Người dùng', 
        'Thời gian bắt đầu', 
        'Thời gian kết thúc', 
        'Số tin nhắn', 
        'Tokens sử dụng', 
        'Trạng thái'
      ];
      
      const csvRows = [];
      
      // Add header row
      csvRows.push(headers.join(','));
      
      // Add data rows
      filteredLogs.forEach(log => {
        const row = [
          log.id,
          log.username,
          formatDateTime(log.startTime),
          formatDateTime(log.endTime),
          log.messageCount,
          log.totalTokens,
          log.status === 'success' ? 'Thành công' : 'Lỗi'
        ];
        
        // Escape commas in content
        const escapedRow = row.map(value => {
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        });
        
        csvRows.push(escapedRow.join(','));
      });
      
      const csvString = csvRows.join('\n');
      
      // Create a blob and download
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `conversation_logs_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting logs:', error);
      alert('Có lỗi khi xuất logs. Vui lòng thử lại sau.');
    }
  };

  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN');
  };

  // Filter logs based on search and filters
  const filteredLogs = logs.filter(log => {
    if (search && !log.username.includes(search) && 
        !log.messages.some(m => m.content.toLowerCase().includes(search.toLowerCase()))) {
      return false;
    }
    
    if (filters.username && !log.username.includes(filters.username)) {
      return false;
    }
    
    if (filters.status !== 'all' && log.status !== filters.status) {
      return false;
    }
    
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      const logDate = new Date(log.startTime);
      if (logDate < startDate) return false;
    }
    
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // End of the day
      const logDate = new Date(log.startTime);
      if (logDate > endDate) return false;
    }
    
    return true;
  });

  if (loading) {
    return <div className="logs-loading">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="conversation-logs">
      <div className="logs-header">
        <div className="logs-search">
          <FiSearch />
          <input
            type="text"
            placeholder="Tìm kiếm hội thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="logs-actions">
          <button 
            className="filter-button"
            onClick={toggleFilterPanel}
          >
            <FiFilter />
            <span>Bộ lọc</span>
          </button>
          
          <button 
            className="export-button"
            onClick={exportLogs}
          >
            <FiDownload />
            <span>Xuất logs</span>
          </button>
        </div>
      </div>
      
      {isFilterOpen && (
        <div className="logs-filter-panel">
          <div className="filter-row">
            <div className="filter-group">
              <label>
                <FiCalendar />
                <span>Từ ngày</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
              />
            </div>
            
            <div className="filter-group">
              <label>
                <FiCalendar />
                <span>Đến ngày</span>
              </label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
              />
            </div>
            
            <div className="filter-group">
              <label>
                <FiUser />
                <span>Người dùng</span>
              </label>
              <input
                type="text"
                name="username"
                value={filters.username}
                onChange={handleFilterChange}
                placeholder="Tên người dùng"
              />
            </div>
            
            <div className="filter-group">
              <label>
                <FiMessageCircle />
                <span>Trạng thái</span>
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="all">Tất cả</option>
                <option value="success">Thành công</option>
                <option value="error">Lỗi</option>
              </select>
            </div>
          </div>
          
          <div className="filter-actions">
            <button onClick={resetFilters}>
              Đặt lại bộ lọc
            </button>
          </div>
        </div>
      )}
      
      <div className="logs-table-container">
        <table className="logs-table">
          <thead>
            <tr>
              <th></th>
              <th>ID hội thoại</th>
              <th>Người dùng</th>
              <th>Thời gian bắt đầu</th>
              <th>Số tin nhắn</th>
              <th>Tokens sử dụng</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map(log => (
                <React.Fragment key={log.id}>
                  <tr 
                    className={`log-row ${expandedConversationId === log.id ? 'expanded' : ''}`}
                    onClick={() => toggleConversation(log.id)}
                  >
                    <td className="expand-cell">
                      {expandedConversationId === log.id ? <FiChevronDown /> : <FiChevronRight />}
                    </td>
                    <td>{log.id}</td>
                    <td>{log.username}</td>
                    <td>{formatDateTime(log.startTime)}</td>
                    <td>{log.messageCount}</td>
                    <td>{log.totalTokens}</td>
                    <td>
                      <span className={`status-badge ${log.status}`}>
                        {log.status === 'success' ? 'Thành công' : 'Lỗi'}
                      </span>
                    </td>
                  </tr>
                  
                  {expandedConversationId === log.id && (
                    <tr className="log-detail-row">
                      <td colSpan="7">
                        <div className="conversation-detail">
                          <div className="conversation-messages">
                            {log.messages.map(message => (
                              <div 
                                key={message.id} 
                                className={`conversation-message ${message.sender}`}
                              >
                                <div className="message-header">
                                  <span className="message-sender">
                                    {message.sender === 'user' ? 'Người dùng' : 'Chatbot'}
                                  </span>
                                  <span className="message-time">
                                    {formatDateTime(message.timestamp)}
                                  </span>
                                  {message.sender === 'bot' && (
                                    <span className="message-tokens">
                                      {message.tokens} tokens
                                    </span>
                                  )}
                                </div>
                                <div className="message-content">
                                  {message.content}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-results">
                  Không tìm thấy kết quả phù hợp
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ConversationLogs;
