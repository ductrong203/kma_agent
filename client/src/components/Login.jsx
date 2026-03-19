import React, { useState, useEffect } from "react";
import "./Login.css";
import LoginAppBar from "./LoginAppBar";
import authService from "../services/authService";
import { useLocation } from "react-router-dom";

const Login = ({ onLogin, adminMode = false }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(adminMode);
  const location = useLocation();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Kiểm tra nếu đang ở trang admin từ URL
  useEffect(() => {
    const path = location?.pathname || "";
    console.log("Current path:", path);

    if (path.includes("/admin") || adminMode) {
      console.log("Setting admin mode to true");
      setIsAdminMode(true);
      setIsLoginMode(true); // Admin luôn ở chế độ đăng nhập
    } else {
      console.log("Setting admin mode to false");
      setIsAdminMode(false);
    }
  }, [location, adminMode]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(""); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (isLoginMode) {
        // Login validation
        if (!formData.username?.trim() || !formData.password?.trim()) {
          setError("Vui lòng nhập đầy đủ username và password");
          setIsLoading(false);
          return;
        }

        const result = await authService.login({
          username: formData.username.trim(),
          password: formData.password,
        });

        if (result.success) {
          const user = result.data;

          // Kiểm tra quyền admin nếu đang ở trang admin
          if (isAdminMode && user.role !== "admin") {
            setError("Bạn không có quyền truy cập vào trang quản trị");
            setIsLoading(false);
            return;
          }

          onLogin(user);
        } else {
          setError(result.error);
        }
      } else {
        // Registration validation
        if (
          !formData.username?.trim() ||
          !formData.email?.trim() ||
          !formData.password?.trim() ||
          !formData.confirmPassword?.trim()
        ) {
          setError("Vui lòng điền đầy đủ thông tin bắt buộc");
          return;
        }
        // Kiểm tra email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          setError("Email không hợp lệ");
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setError("Mật khẩu xác nhận không khớp");
          return;
        }

        if (formData.password.length < 6) {
          setError("Mật khẩu phải có ít nhất 6 ký tự");
          return;
        }

        const result = await authService.register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        });

        if (result.success) {
          // Reset form và chuyển về login mode
          setFormData({
            username: "",
            email: "",
            password: "",
            confirmPassword: "",
          });
          setIsLoginMode(true);
          setError("");
          alert("Đăng ký thành công! Hãy đăng nhập với username vừa đăng ký.");
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    // Không cho phép chuyển sang chế độ đăng ký nếu đang ở trang admin
    if (isAdminMode) {
      return;
    }

    setIsLoginMode(!isLoginMode);
    setFormData({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setError("");
  };

  return (
    <div className="login-page">
      <LoginAppBar />

      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h2 className="login-title">
              {isAdminMode
                ? "Đăng nhập quản trị"
                : isLoginMode
                ? "Đăng nhập hệ thống"
                : "Đăng ký tài khoản"}
            </h2>
            <p className="login-subtitle">
              {isAdminMode
                ? "Quản trị hệ thống Chatbot - Học viện Kỹ thuật Mật mã"
                : isLoginMode
                ? "Chatbot AI - Học viện Kỹ thuật Mật mã"
                : "Tạo tài khoản mới để sử dụng hệ thống"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Tên đăng nhập
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username || ""}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Nhập tên đăng nhập..."
                required
              />
            </div>
            {!isLoginMode && (
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email || ""}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Nhập email..."
                  required={!isLoginMode}
                />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Mật khẩu
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password || ""}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Nhập mật khẩu..."
                required
              />
            </div>
            {!isLoginMode && (
              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Xác nhận mật khẩu *
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword || ""}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Nhập lại mật khẩu..."
                  required={!isLoginMode}
                />
              </div>
            )}

            <button
              type="submit"
              className={`login-button ${isLoading ? "loading" : ""}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  {isLoginMode ? "Đang đăng nhập..." : "Đang đăng ký..."}
                </>
              ) : isLoginMode ? (
                "Đăng nhập"
              ) : (
                "Đăng ký"
              )}
            </button>
          </form>

          {/* Form Switch - Chỉ hiển thị khi KHÔNG ở chế độ admin và ở chế độ đăng nhập */}
          <div className="form-switch">
            {!isAdminMode && (
              <p>
                {isLoginMode ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="switch-mode-btn"
                >
                  {isLoginMode ? "Đăng ký ngay" : "Đăng nhập"}
                </button>
              </p>
            )}
          </div>

          <div className="login-footer">
            <p className="help-text">
              Cần hỗ trợ? Liên hệ:
              <a href="mailto:support@kma.edu.vn" className="help-link">
                support@kma.edu.vn
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
