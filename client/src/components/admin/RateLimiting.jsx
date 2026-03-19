import React, { useState, useEffect } from 'react';
import { 
  FiSave, FiRotateCcw, FiUsers, FiClock, 
  FiDatabase, FiAlertCircle, FiInfo,
  FiX
} from 'react-icons/fi';
import './RateLimiting.css';
import rateLimitService from '../../services/rateLimitService';

const RateLimiting = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  
  // Rate limit settings
  const [settings, setSettings] = useState({
    enabled: true,
    defaultLimits: {
      requestsPerMinute: 10,
      requestsPerHour: 100,
      requestsPerDay: 500,
      tokensPerDay: 50000,
      tokensPerMonth: 500000
    },
    roleLimits: {
      admin: {
        requestsPerMinute: 30,
        requestsPerHour: 300,
        requestsPerDay: 1000,
        tokensPerDay: 200000,
        tokensPerMonth: 2000000
      },
      user: {
        requestsPerMinute: 10,
        requestsPerHour: 100,
        requestsPerDay: 500,
        tokensPerDay: 50000,
        tokensPerMonth: 500000
      }
    },
    userExceptions: []
  });
  
  useEffect(() => {
    // Fetch rate limit settings from the API
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const response = await rateLimitService.getRateLimitConfig();
        if (response.success) {
          // Ensure all required nested objects exist with defaults
          const configData = response.data || {};
          
          // Create a complete settings object with all required properties
          const completeSettings = {
            enabled: configData.enabled !== undefined ? configData.enabled : true,
            defaultLimits: {
              requestsPerMinute: 10,
              requestsPerHour: 100,
              requestsPerDay: 500,
              tokensPerDay: 50000,
              tokensPerMonth: 500000,
              ...(configData.defaultLimits || {})
            },
            roleLimits: {
              admin: {
                requestsPerMinute: 30,
                requestsPerHour: 300,
                requestsPerDay: 1000,
                tokensPerDay: 200000,
                tokensPerMonth: 2000000,
                ...(configData.roleLimits?.admin || {})
              },
              user: {
                requestsPerMinute: 10,
                requestsPerHour: 100,
                requestsPerDay: 500,
                tokensPerDay: 50000,
                tokensPerMonth: 500000,
                ...(configData.roleLimits?.user || {})
              }
            },
            userExceptions: configData.userExceptions || []
          };
          
          setSettings(completeSettings);
          setError(null);
        } else {
          setError('Không thể tải cài đặt giới hạn tốc độ: ' + response.error);
        }
      } catch (err) {
        console.error('Error fetching rate limit settings:', err);
        setError('Đã xảy ra lỗi khi tải cài đặt giới hạn tốc độ');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);
  
  const handleRateLimitChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'enabled') {
      setSettings(prev => ({
        ...prev,
        enabled: checked
      }));
      return;
    }
    
    // Parse the nested property path
    const path = name.split('.');
    
    setSettings(prev => {
      const newSettings = { ...prev };
      let current = newSettings;
      
      // Navigate to the nested property, creating objects if they don't exist
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }
      
      // Set the value
      current[path[path.length - 1]] = type === 'number' ? parseInt(value, 10) : value;
      
      return newSettings;
    });
  };
  
  const handleUserExceptionChange = (index, field, value) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      
      // Ensure userExceptions array exists
      if (!newSettings.userExceptions) {
        newSettings.userExceptions = [];
      }
      
      // Ensure the user exception at the specified index exists
      if (!newSettings.userExceptions[index]) {
        newSettings.userExceptions[index] = {
          username: '',
          requestsPerMinute: newSettings.defaultLimits?.requestsPerMinute || 10,
          requestsPerHour: newSettings.defaultLimits?.requestsPerHour || 100,
          requestsPerDay: newSettings.defaultLimits?.requestsPerDay || 500,
          tokensPerDay: newSettings.defaultLimits?.tokensPerDay || 50000,
          tokensPerMonth: newSettings.defaultLimits?.tokensPerMonth || 500000
        };
      }
      
      newSettings.userExceptions[index][field] = field === 'username' ? value : parseInt(value, 10);
      return newSettings;
    });
  };
  
  const addUserException = () => {
    setSettings(prev => {
      // Get default values from existing settings or use fallbacks
      const defaultLimits = prev.defaultLimits || {
        requestsPerMinute: 10,
        requestsPerHour: 100,
        requestsPerDay: 500,
        tokensPerDay: 50000,
        tokensPerMonth: 500000
      };
      
      return {
        ...prev,
        userExceptions: [
          ...(prev.userExceptions || []),
          {
            username: '',
            requestsPerMinute: defaultLimits.requestsPerMinute,
            requestsPerHour: defaultLimits.requestsPerHour,
            requestsPerDay: defaultLimits.requestsPerDay,
            tokensPerDay: defaultLimits.tokensPerDay,
            tokensPerMonth: defaultLimits.tokensPerMonth
          }
        ]
      };
    });
  };
  
  const removeUserException = (index) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      // Ensure userExceptions array exists
      if (!newSettings.userExceptions) {
        newSettings.userExceptions = [];
        return newSettings;
      }
      
      newSettings.userExceptions = newSettings.userExceptions.filter((_, i) => i !== index);
      return newSettings;
    });
  };
  
  const saveSettings = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);
    
    try {
      // Save the settings to the API
      const response = await rateLimitService.updateRateLimitConfig(settings);
      
      if (response.success) {
        setSuccess('Cài đặt đã được lưu thành công');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Đã xảy ra lỗi khi lưu cài đặt: ' + response.error);
      }
    } catch (err) {
      console.error('Error saving rate limit settings:', err);
      setError('Đã xảy ra lỗi khi lưu cài đặt');
    } finally {
      setSaving(false);
    }
  };
  
  const resetToDefaults = () => {
    if (window.confirm('Bạn có chắc chắn muốn đặt lại tất cả cài đặt về mặc định?')) {
      setSettings({
        enabled: true,
        defaultLimits: {
          requestsPerMinute: 10,
          requestsPerHour: 100,
          requestsPerDay: 500,
          tokensPerDay: 50000,
          tokensPerMonth: 500000
        },
        roleLimits: {
          admin: {
            requestsPerMinute: 30,
            requestsPerHour: 300,
            requestsPerDay: 1000,
            tokensPerDay: 200000,
            tokensPerMonth: 2000000
          },
          user: {
            requestsPerMinute: 10,
            requestsPerHour: 100,
            requestsPerDay: 500,
            tokensPerDay: 50000,
            tokensPerMonth: 500000
          }
        },
        userExceptions: []
      });
      
      // Hiển thị thông báo
      setSuccess('Đã đặt lại cài đặt về mặc định. Nhấn "Lưu cài đặt" để áp dụng.');
      setTimeout(() => setSuccess(null), 3000);
    }
  };
  
  if (loading) {
    return <div className="rate-loading">Đang tải cài đặt...</div>;
  }
  
  return (
    <div className="rate-limiting">
      <div className="rate-header">
        <div className="rate-info">
          <FiInfo />
          <p>
            Cài đặt giới hạn tốc độ giúp bảo vệ hệ thống, kiểm soát việc sử dụng tài nguyên
            và đảm bảo trải nghiệm công bằng cho tất cả người dùng.
          </p>
        </div>
        
        <div className="rate-actions">
          <button 
            className="reset-button"
            onClick={resetToDefaults}
          >
            <FiRotateCcw />
            <span>Đặt lại mặc định</span>
          </button>
          
          <button 
            className="save-button"
            onClick={saveSettings}
            disabled={saving}
          >
            <FiSave />
            <span>{saving ? 'Đang lưu...' : 'Lưu cài đặt'}</span>
          </button>
        </div>
      </div>
      
      {success && (
        <div className="rate-success">
          {success}
        </div>
      )}
      
      {error && (
        <div className="rate-error">
          {error}
        </div>
      )}
      
      {/* Enable/Disable Rate Limiting */}
      <div className="rate-section">
        <div className="rate-toggle">
          <label>
            <input
              type="checkbox"
              name="enabled"
              checked={settings.enabled}
              onChange={handleRateLimitChange}
            />
            <span className="toggle-label">Kích hoạt giới hạn tốc độ</span>
            <span className={`toggle-status ${settings.enabled ? 'enabled' : 'disabled'}`}>
              {settings.enabled ? 'Đang kích hoạt' : 'Đã tắt'}
            </span>
          </label>
        </div>
      </div>
      
      {/* Default Limits
      // <div className={`rate-section ${!settings.enabled ? 'disabled-section' : ''}`}>
      //   <h3 className="section-title">
      //     <FiUsers />
      //     <span>Giới hạn mặc định</span>
      //   </h3>
        
      //   <div className="limits-grid">
      //     <div className="limit-card">
      //       <div className="limit-icon">
      //         <FiClock />
      //       </div>
      //       <div className="limit-content">
      //         <h4>Số yêu cầu mỗi phút</h4>
      //         <input
      //           type="number"
      //           name="defaultLimits.requestsPerMinute"
      //           value={settings.defaultLimits?.requestsPerMinute || 10}
      //           onChange={handleRateLimitChange}
      //           min="1"
      //           disabled={!settings.enabled}
      //         />
      //       </div>
      //     </div>
          
      //     <div className="limit-card">
      //       <div className="limit-icon">
      //         <FiClock />
      //       </div>
      //       <div className="limit-content">
      //         <h4>Số yêu cầu mỗi giờ</h4>
      //         <input
      //           type="number"
      //           name="defaultLimits.requestsPerHour"
      //           value={settings.defaultLimits?.requestsPerHour || 100}
      //           onChange={handleRateLimitChange}
      //           min="1"
      //           disabled={!settings.enabled}
      //         />
      //       </div>
      //     </div>
          
      //     <div className="limit-card">
      //       <div className="limit-icon">
      //         <FiClock />
      //       </div>
      //       <div className="limit-content">
      //         <h4>Số yêu cầu mỗi ngày</h4>
      //         <input
      //           type="number"
      //           name="defaultLimits.requestsPerDay"
      //           value={settings.defaultLimits?.requestsPerDay || 500}
      //           onChange={handleRateLimitChange}
      //           min="1"
      //           disabled={!settings.enabled}
      //         />
      //       </div>
      //     </div>
          
      //     <div className="limit-card">
      //       <div className="limit-icon token-icon">
      //         <span>T</span>
      //       </div>
      //       <div className="limit-content">
      //         <h4>Token mỗi ngày</h4>
      //         <input
      //           type="number"
      //           name="defaultLimits.tokensPerDay"
      //           value={settings.defaultLimits?.tokensPerDay || 50000}
      //           onChange={handleRateLimitChange}
      //           min="1000"
      //           step="1000"
      //           disabled={!settings.enabled}
      //         />
      //       </div>
      //     </div>
          
      //     <div className="limit-card">
      //       <div className="limit-icon token-icon">
      //         <span>T</span>
      //       </div>
      //       <div className="limit-content">
      //         <h4>Token mỗi tháng</h4>
      //         <input
      //           type="number"
      //           name="defaultLimits.tokensPerMonth"
      //           value={settings.defaultLimits?.tokensPerMonth || 500000}
      //           onChange={handleRateLimitChange}
      //           min="1000"
      //           step="1000"
      //           disabled={!settings.enabled}
      //         />
      //       </div>
      //     </div>
      //   </div>
      </div> */}
      
      {/* Role-based Limits */}
      <div className={`rate-section ${!settings.enabled ? 'disabled-section' : ''}`}>
        <h3 className="section-title">
          <FiUsers />
          <span>Giới hạn theo vai trò</span>
        </h3>
        
        <div className="role-limits">
          <div className="role-limit-card">
            <h4 className="role-title admin">Quản trị viên</h4>
            <div className="role-limits-grid">
              <div className="role-limit-item">
                <label>Yêu cầu/phút</label>
                <input
                  type="number"
                  name="roleLimits.admin.requestsPerMinute"
                  value={settings.roleLimits?.admin?.requestsPerMinute || 30}
                  onChange={handleRateLimitChange}
                  min="1"
                  disabled={!settings.enabled}
                />
              </div>
              <div className="role-limit-item">
                <label>Yêu cầu/giờ</label>
                <input
                  type="number"
                  name="roleLimits.admin.requestsPerHour"
                  value={settings.roleLimits?.admin?.requestsPerHour || 300}
                  onChange={handleRateLimitChange}
                  min="1"
                  disabled={!settings.enabled}
                />
              </div>
              <div className="role-limit-item">
                <label>Yêu cầu/ngày</label>
                <input
                  type="number"
                  name="roleLimits.admin.requestsPerDay"
                  value={settings.roleLimits?.admin?.requestsPerDay || 1000}
                  onChange={handleRateLimitChange}
                  min="1"
                  disabled={!settings.enabled}
                />
              </div>
              <div className="role-limit-item">
                <label>Token/ngày</label>
                <input
                  type="number"
                  name="roleLimits.admin.tokensPerDay"
                  value={settings.roleLimits?.admin?.tokensPerDay || 200000}
                  onChange={handleRateLimitChange}
                  min="1000"
                  step="1000"
                  disabled={!settings.enabled}
                />
              </div>
              <div className="role-limit-item">
                <label>Token/tháng</label>
                <input
                  type="number"
                  name="roleLimits.admin.tokensPerMonth"
                  value={settings.roleLimits?.admin?.tokensPerMonth || 2000000}
                  onChange={handleRateLimitChange}
                  min="1000"
                  step="1000"
                  disabled={!settings.enabled}
                />
              </div>
            </div>
          </div>
          
          <div className="role-limit-card">
            <h4 className="role-title user">Người dùng</h4>
            <div className="role-limits-grid">
              <div className="role-limit-item">
                <label>Yêu cầu/phút</label>
                <input
                  type="number"
                  name="roleLimits.user.requestsPerMinute"
                  value={settings.roleLimits?.user?.requestsPerMinute || 10}
                  onChange={handleRateLimitChange}
                  min="1"
                  disabled={!settings.enabled}
                />
              </div>
              <div className="role-limit-item">
                <label>Yêu cầu/giờ</label>
                <input
                  type="number"
                  name="roleLimits.user.requestsPerHour"
                  value={settings.roleLimits?.user?.requestsPerHour || 100}
                  onChange={handleRateLimitChange}
                  min="1"
                  disabled={!settings.enabled}
                />
              </div>
              <div className="role-limit-item">
                <label>Yêu cầu/ngày</label>
                <input
                  type="number"
                  name="roleLimits.user.requestsPerDay"
                  value={settings.roleLimits?.user?.requestsPerDay || 500}
                  onChange={handleRateLimitChange}
                  min="1"
                  disabled={!settings.enabled}
                />
              </div>
              <div className="role-limit-item">
                <label>Token/ngày</label>
                <input
                  type="number"
                  name="roleLimits.user.tokensPerDay"
                  value={settings.roleLimits?.user?.tokensPerDay || 50000}
                  onChange={handleRateLimitChange}
                  min="1000"
                  step="1000"
                  disabled={!settings.enabled}
                />
              </div>
              <div className="role-limit-item">
                <label>Token/tháng</label>
                <input
                  type="number"
                  name="roleLimits.user.tokensPerMonth"
                  value={settings.roleLimits?.user?.tokensPerMonth || 500000}
                  onChange={handleRateLimitChange}
                  min="1000"
                  step="1000"
                  disabled={!settings.enabled}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* User-specific Exceptions */}
      <div className={`rate-section ${!settings.enabled ? 'disabled-section' : ''}`}>
        <h3 className="section-title">
          <FiAlertCircle />
          <span>Ngoại lệ cho người dùng cụ thể</span>
        </h3>
        
        <div className="exceptions-container">
          {settings.userExceptions.map((exception, index) => (
            <div key={index} className="exception-card">
              <div className="exception-header">
                <h4>Ngoại lệ #{index + 1}</h4>
                <button 
                  className="remove-exception"
                  onClick={() => removeUserException(index)}
                  disabled={!settings.enabled}
                >
                  <FiX />
                </button>
              </div>
              
              <div className="exception-content">
                <div className="exception-field">
                  <label>Tên người dùng</label>
                  <input
                    type="text"
                    value={exception.username}
                    onChange={(e) => handleUserExceptionChange(index, 'username', e.target.value)}
                    placeholder="Nhập tên người dùng"
                    disabled={!settings.enabled}
                  />
                </div>
                
                <div className="exception-limits">
                  <div className="exception-limit">
                    <label>Yêu cầu/phút</label>
                    <input
                      type="number"
                      value={exception.requestsPerMinute}
                      onChange={(e) => handleUserExceptionChange(index, 'requestsPerMinute', e.target.value)}
                      min="1"
                      disabled={!settings.enabled}
                    />
                  </div>
                  
                  <div className="exception-limit">
                    <label>Yêu cầu/giờ</label>
                    <input
                      type="number"
                      value={exception.requestsPerHour}
                      onChange={(e) => handleUserExceptionChange(index, 'requestsPerHour', e.target.value)}
                      min="1"
                      disabled={!settings.enabled}
                    />
                  </div>
                  
                  <div className="exception-limit">
                    <label>Yêu cầu/ngày</label>
                    <input
                      type="number"
                      value={exception.requestsPerDay}
                      onChange={(e) => handleUserExceptionChange(index, 'requestsPerDay', e.target.value)}
                      min="1"
                      disabled={!settings.enabled}
                    />
                  </div>
                  
                  <div className="exception-limit">
                    <label>Token/ngày</label>
                    <input
                      type="number"
                      value={exception.tokensPerDay}
                      onChange={(e) => handleUserExceptionChange(index, 'tokensPerDay', e.target.value)}
                      min="1000"
                      step="1000"
                      disabled={!settings.enabled}
                    />
                  </div>
                  
                  <div className="exception-limit">
                    <label>Token/tháng</label>
                    <input
                      type="number"
                      value={exception.tokensPerMonth}
                      onChange={(e) => handleUserExceptionChange(index, 'tokensPerMonth', e.target.value)}
                      min="1000"
                      step="1000"
                      disabled={!settings.enabled}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          <button 
            className="add-exception-button"
            onClick={addUserException}
            disabled={!settings.enabled}
          >
            + Thêm ngoại lệ cho người dùng
          </button>
        </div>
      </div>
    </div>
  );
};

export default RateLimiting;
