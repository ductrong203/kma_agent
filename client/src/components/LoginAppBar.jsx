import React from 'react';
import './LoginAppBar.css';

const LoginAppBar = () => {
  return (
    <div className="login-appbar">
      <div className="login-appbar-content">
        <div className="login-appbar-left">
          <div className="logo-section">
            <img 
              src="/img/kma.png" 
              alt="KMA Logo" 
              className="appbar-logo"
            />
            <div className="title-section">
              <h1 className="appbar-title">Học viện Kỹ thuật Mật mã</h1>
              <p className="appbar-subtitle">Academy of Cryptography Techniques</p>
            </div>
          </div>
        </div>
        
        <div className="login-appbar-right">
          <div className="system-info">
            <span className="system-name">Hệ thống Chatbot AI</span>
            <span className="system-version">v2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginAppBar;
