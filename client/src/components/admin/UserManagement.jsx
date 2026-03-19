import React, { useState, useEffect } from 'react';
import { 
  FiSearch, FiEdit2, FiTrash2, FiUserPlus, 
  FiAlertTriangle, FiCheck, FiX, FiUser, FiLock, 
  FiShield
} from 'react-icons/fi';
import './UserManagement.css';
import userService from '../../services/userService';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Form state for adding/editing users
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    studentCode: '',
    studentClass: '',
    role: 'user',
    maxTokens: 50000,
    isActive: true,
    password: '',
    confirmPassword: ''
  });
  
  // Form errors
  const [formErrors, setFormErrors] = useState({});
  
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        // Gọi API lấy danh sách người dùng
        const response = await userService.getAllUsers();
        
        if (response.success) {
          setUsers(response.data || []);
        } else {
          setError('Không thể tải danh sách người dùng: ' + (response.error || 'Lỗi không xác định'));
          // Fallback to empty array if there's an error
          setUsers([]);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Không thể tải danh sách người dùng: ' + (error.message || 'Lỗi không xác định'));
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);
  
  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    const searchLower = search.toLowerCase();
    return (
      (user.username && user.username.toLowerCase().includes(searchLower)) ||
      (user.name && user.name.toLowerCase().includes(searchLower)) ||
      (user.studentCode && user.studentCode.toLowerCase().includes(searchLower)) ||
      (user.studentClass && user.studentClass.toLowerCase().includes(searchLower))
    );
  });
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  // Validate form before submission
  const validateForm = () => {
    const errors = {};
    
    if (!formData.username) errors.username = 'Tên đăng nhập là bắt buộc';
    if (!formData.name) errors.name = 'Tên người dùng là bắt buộc';
    
    // If adding new user or changing password
    if (!selectedUser || formData.password) {
      if (!formData.password) errors.password = 'Mật khẩu là bắt buộc';
      else if (formData.password.length < 6) errors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
      
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Mật khẩu không khớp';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Open modal to add new user
  const handleAddUser = () => {
    setFormData({
      username: '',
      name: '',
      email: '',
      studentCode: '',
      studentClass: '',
      role: 'user',
      maxTokens: 50000,
      isActive: true,
      password: '',
      confirmPassword: ''
    });
    setFormErrors({});
    setSelectedUser(null);
    setIsUserModalOpen(true);
  };
  
  // Open modal to edit user
  const handleEditUser = (user) => {
    setFormData({
      username: user.username,
      name: user.name || '',
      email: user.email || '',
      studentCode: user.studentCode || '',
      studentClass: user.studentClass || '',
      role: user.role || 'user',
      maxTokens: user.maxTokens || 50000,
      isActive: user.isActive !== undefined ? user.isActive : true,
      password: '',
      confirmPassword: ''
    });
    setFormErrors({});
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      if (selectedUser) {
        // Cập nhật người dùng hiện có
        const userData = {
          username: formData.username,
          name: formData.name,
          email: formData.email,
          studentCode: formData.studentCode,
          studentClass: formData.studentClass,
          role: formData.role,
          maxTokens: parseInt(formData.maxTokens),
          isActive: formData.isActive
        };
        
        // Chỉ gửi mật khẩu nếu người dùng đã nhập
        if (formData.password) {
          userData.password = formData.password;
        }
        
        const response = await userService.updateUser(selectedUser.id, userData);
        
        if (response.success) {
          // Cập nhật UI
          const updatedUsers = users.map(user => 
            user.id === selectedUser.id 
              ? { ...user, ...formData } 
              : user
          );
          setUsers(updatedUsers);
          setIsUserModalOpen(false);
          setSuccessMessage('Cập nhật người dùng thành công!');
          setTimeout(() => setSuccessMessage(null), 3000);
        } else {
          // Hiển thị lỗi - convert object to string if needed
          let errorMessage = response.error || 'Lỗi khi cập nhật người dùng';
          if (typeof errorMessage === 'object') {
            if (Array.isArray(errorMessage)) {
              errorMessage = errorMessage.map(err => {
                if (typeof err === 'string') return err;
                if (err.msg) return err.msg;
                return JSON.stringify(err);
              }).join(', ');
            } else {
              errorMessage = JSON.stringify(errorMessage);
            }
          }
          setFormErrors({ general: errorMessage });
        }
      } else {
        // Thêm người dùng mới
        const userData = {
          username: formData.username,
          password: formData.password,
          student_name: formData.name,
          role: formData.role
        };
        
        // Thêm các trường optional nếu có giá trị
        if (formData.email) userData.email = formData.email;
        if (formData.studentCode) userData.student_code = formData.studentCode;
        if (formData.studentClass) userData.student_class = formData.studentClass;
        
        const response = await userService.createUser(userData);
        
        if (response.success) {
          // Tạo một đối tượng người dùng mới từ phản hồi API
          const newUser = {
            id: response.data._id,
            username: response.data.username,
            studentCode: response.data.student_code || '',
            name: response.data.student_name || '',
            studentClass: response.data.student_class || '',
            role: response.data.role || 'user',
            maxTokens: response.data.max_tokens || 50000,
            usedTokens: 0,
            isActive: response.data.is_active !== undefined ? response.data.is_active : true,
            lastLogin: null,
            createdAt: response.data.created_at
          };
          
          setUsers([...users, newUser]);
          setIsUserModalOpen(false);
          setSuccessMessage('Tạo người dùng mới thành công!');
          setTimeout(() => setSuccessMessage(null), 3000);
        } else {
          // Hiển thị lỗi - convert object to string if needed
          let errorMessage = response.error || 'Lỗi khi tạo người dùng';
          if (typeof errorMessage === 'object') {
            if (Array.isArray(errorMessage)) {
              errorMessage = errorMessage.map(err => {
                if (typeof err === 'string') return err;
                if (err.msg) return err.msg;
                return JSON.stringify(err);
              }).join(', ');
            } else {
              errorMessage = JSON.stringify(errorMessage);
            }
          }
          setFormErrors({ general: errorMessage });
        }
      }
    } catch (error) {
      console.error('Error saving user:', error);
      setFormErrors({ general: error.message || 'Có lỗi xảy ra khi lưu người dùng' });
    } finally {
      setLoading(false);
    }
  };
  
  // Confirm user deletion
  const confirmDeleteUser = (user) => {
    setUserToDelete(user);
    setIsConfirmDeleteOpen(true);
  };
  
  // Delete user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      setLoading(true);
      
      // Gọi API xóa người dùng
      const response = await userService.deleteUser(userToDelete.id);
      
      if (response.success) {
        // Cập nhật UI
        const updatedUsers = users.filter(user => user.id !== userToDelete.id);
        setUsers(updatedUsers);
        setIsConfirmDeleteOpen(false);
        setUserToDelete(null);
        setSuccessMessage('Xóa người dùng thành công!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        // Hiển thị lỗi
        setError(response.error || 'Không thể xóa người dùng');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setError(error.message || 'Không thể xóa người dùng');
    } finally {
      setLoading(false);
      setIsConfirmDeleteOpen(false);
    }
  };
  
  // Format date to readable string
  const formatDate = (date) => {
    if (!date) return 'Chưa đăng nhập';
    return new Date(date).toLocaleString('vi-VN');
  };
  
  if (loading) {
    return <div className="users-loading">Đang tải dữ liệu người dùng...</div>;
  }
  
  return (
    <div className="user-management">
      {error && (
        <div className="error-message">
          <FiAlertTriangle />
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <FiX />
          </button>
        </div>
      )}
      
      {successMessage && (
        <div className="success-message">
          <FiCheck />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)}>
            <FiX />
          </button>
        </div>
      )}
      
      <div className="users-header">
        <div className="users-search">
          <FiSearch />
          <input
            type="text"
            placeholder="Tìm kiếm người dùng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <button 
          className="add-user-button"
          onClick={handleAddUser}
        >
          <FiUserPlus />
          <span>Thêm người dùng</span>
        </button>
      </div>
      
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Tên đăng nhập</th>
              <th>Mã SV</th>
              <th>Họ tên</th>
              <th>Lớp</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Đăng nhập cuối</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.studentCode}</td>
                  <td>{user.name}</td>
                  <td>{user.studentClass || '-'}</td>
                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                    </span>
                  </td>
                  
                  <td>
                    <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                      {user.isActive ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </td>
                  <td>{formatDate(user.lastLogin)}</td>
                  <td>
                    <div className="user-actions">
                      <button 
                        className="edit-button"
                        onClick={() => handleEditUser(user)}
                      >
                        <FiEdit2 />
                      </button>
                      <button 
                        className="delete-button"
                        onClick={() => confirmDeleteUser(user)}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="no-results">
                  Không tìm thấy người dùng phù hợp
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* User Form Modal */}
      {isUserModalOpen && (
        <div className="modal-overlay">
          <div className="user-modal">
            <div className="modal-header">
              <h2>{selectedUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}</h2>
              <button 
                className="close-modal"
                onClick={() => setIsUserModalOpen(false)}
              >
                <FiX />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-columns">
                <div className="form-column">
                  <div className="form-group">
                    <label>
                      <FiUser />
                      <span>Tên đăng nhập</span>
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="Nhập tên đăng nhập"
                    />
                    {formErrors.username && <div className="form-error">{formErrors.username}</div>}
                  </div>
                  
                  <div className="form-group">
                    <label>
                      <FiUser />
                      <span>Họ tên</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Nhập họ tên"
                    />
                    {formErrors.name && <div className="form-error">{formErrors.name}</div>}
                  </div>
                  
                  <div className="form-group">
                    <label>
                      <FiUser />
                      <span>Email</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Nhập email (không bắt buộc)"
                    />
                    {formErrors.email && <div className="form-error">{formErrors.email}</div>}
                  </div>
                  
                  <div className="form-group">
                    <label>
                      <FiUser />
                      <span>Mã sinh viên</span>
                    </label>
                    <input
                      type="text"
                      name="studentCode"
                      value={formData.studentCode}
                      onChange={handleInputChange}
                      placeholder="Nhập mã sinh viên (không bắt buộc)"
                    />
                    {formErrors.studentCode && <div className="form-error">{formErrors.studentCode}</div>}
                  </div>
                  
                  <div className="form-group">
                    <label>
                      <FiUser />
                      <span>Lớp</span>
                    </label>
                    <input
                      type="text"
                      name="studentClass"
                      value={formData.studentClass}
                      onChange={handleInputChange}
                      placeholder="Nhập lớp (không bắt buộc)"
                    />
                    {formErrors.studentClass && <div className="form-error">{formErrors.studentClass}</div>}
                  </div>
                </div>
                
                <div className="form-column">
                  <div className="form-group">
                    <label>
                      <FiLock />
                      <span>Mật khẩu {selectedUser && '(để trống nếu không đổi)'}</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder={selectedUser ? 'Nhập mật khẩu mới' : 'Nhập mật khẩu'}
                    />
                    {formErrors.password && <div className="form-error">{formErrors.password}</div>}
                  </div>
                  
                  <div className="form-group">
                    <label>
                      <FiLock />
                      <span>Xác nhận mật khẩu</span>
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Xác nhận mật khẩu"
                    />
                    {formErrors.confirmPassword && <div className="form-error">{formErrors.confirmPassword}</div>}
                  </div>
                  
                  <div className="form-group">
                    <label>
                      <FiShield />
                      <span>Vai trò</span>
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                    >
                      <option value="user">Người dùng</option>
                      <option value="admin">Quản trị viên</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => setIsUserModalOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="save-button"
                  disabled={loading}
                >
                  {loading ? 'Đang xử lý...' : (selectedUser ? 'Cập nhật' : 'Thêm mới')}
                </button>
              </div>
              
              {formErrors.general && (
                <div className="form-general-error">
                  <FiAlertTriangle />
                  <span>{formErrors.general}</span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
      
      {/* Confirm Delete Modal */}
      {isConfirmDeleteOpen && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <div className="confirm-icon">
              <FiAlertTriangle />
            </div>
            <h3>Xác nhận xóa người dùng</h3>
            <p>
              Bạn có chắc chắn muốn xóa người dùng <strong>{userToDelete?.name}</strong>?
              Hành động này không thể hoàn tác.
            </p>
            <div className="confirm-actions">
              <button 
                className="cancel-button"
                onClick={() => setIsConfirmDeleteOpen(false)}
                disabled={loading}
              >
                <FiX />
                <span>Hủy bỏ</span>
              </button>
              <button 
                className="confirm-delete-button"
                onClick={handleDeleteUser}
                disabled={loading}
              >
                <FiTrash2 />
                <span>{loading ? 'Đang xóa...' : 'Xác nhận xóa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
