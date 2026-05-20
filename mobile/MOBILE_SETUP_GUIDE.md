# 📱 KBot Mobile App - Setup & Run Guide

## 📋 Yêu cầu

- Node.js 18+ và npm 8+
- Expo CLI (`npm install -g expo-cli`)
- Android Emulator hoặc iOS Simulator (hoặc Expo Go app trên điện thoại)
- API server chạy tại `http://192.168.0.102:8000` (thay đổi trong `.env` nếu cần)

## 🚀 Cài đặt

1. **Cài đặt dependencies:**

```bash
cd mobile
npm install
```

2. **Cấu hình API Base URL (nếu cần):**
   - Mở file `.env`
   - Thay đổi `EXPO_PUBLIC_API_BASE_URL` theo địa chỉ server của bạn

3. **Bắt đầu Expo:**

```bash
npm start
```

## ▶️ Chạy trên các nền tảng

### Android Emulator:

```bash
npm run android
```

### iOS Simulator (macOS only):

```bash
npm run ios
```

### Web Browser:

```bash
npm run web
```

### Expo Go (điện thoại thực):

- Quét QR code hiển thị trong terminal bằng Expo Go app
- Hoặc chạy `npm start` và nhấn `a` cho Android hoặc `i` cho iOS

## 📁 Cấu trúc dự án

```
mobile/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.js       # Màn hình đăng nhập
│   │   ├── RegisterScreen.js    # Màn hình đăng ký
│   │   └── ChatScreen.js        # Màn hình chat chính
│   ├── components/
│   │   ├── ChatHeaderBar.js     # Header với menu & profle
│   │   ├── ChatSidebar.js       # Sidebar lịch sử trò chuyện
│   │   ├── MessageBubble.js     # Component hiển thị tin nhắn
│   │   ├── FileUploadPanel.js   # Panel upload file
│   │   └── UserProfileModal.js  # Modal thông tin người dùng
│   ├── theme.js                 # Theme colors & typography
│   ├── api.js                   # API integration
│   ├── storage.js               # Local storage (AsyncStorage)
│   └── config.js                # Configuration & endpoints
├── App.js                        # Entry point
├── babel.config.js               # Babel configuration
└── package.json                  # Dependencies

client/
app/
...
```

## ✨ Tính năng

### 🔐 Authentication

- ✅ Đăng nhập với username/password
- ✅ Đăng ký tài khoản mới
- ✅ Lưu session tự động
- ✅ Logout an toàn

### 💬 Chat

- ✅ Giao diện chat hiện đại, responsive
- ✅ Hiển thị lịch sử trò chuyện
- ✅ Tạo cuộc trò chuyện mới
- ✅ Xóa cuộc trò chuyện
- ✅ Tìm kiếm tin nhắn

### 📎 File Management

- ✅ Đính kèm file (PDF, Word, Excel, ảnh, v.v.)
- ✅ Hỏi câu hỏi với file đã chọn
- ✅ Hiển thị preview file
- ✅ Xóa file đã chọn

### 👤 User Profile

- ✅ Xem thông tin cá nhân
- ✅ Chỉnh sửa thông tin (username, email, mã sinh viên)
- ✅ Lưu thay đổi
- ✅ Đăng xuất

### 🎨 UI/UX

- ✅ Thiết kế giống client (KMA brand colors)
- ✅ Responsive layout (mobile, tablet)
- ✅ Keyboard-aware input
- ✅ Loading states & error handling
- ✅ Markdown support cho tin nhắn
- ✅ Code formatting & table support

## 🔧 Cấu hình nâng cao

### Thay đổi API Base URL

Mở `.env` và cập nhật:

```env
EXPO_PUBLIC_API_BASE_URL=http://your-server:port
```

### Thêm Custom Fonts

1. Tải fonts từ Google Fonts
2. Đặt vào thư mục `assets/fonts/`
3. Cập nhật `App.js`:

```javascript
await Font.loadAsync({
  FontName: require("./assets/fonts/FontName.ttf"),
});
```

### Thay đổi Theme Colors

Sửa `src/theme.js`:

```javascript
export const COLORS = {
  primary: "#your-color",
  // ... other colors
};
```

## 🐛 Troubleshooting

### Lỗi "Cannot find module 'babel-preset-expo'"

```bash
npm install babel-preset-expo --save-dev
npm install
```

### Lỗi kết nối API

- Kiểm tra xem API server đang chạy
- Đảm bảo IP address trong `.env` đúng với server
- Trên Android emulator, dùng `10.0.2.2` thay cho `localhost`

### Metro bundler không phản hồi

```bash
# Xóa cache
npm start -- --reset-cache
```

### Vấn đề AsyncStorage

```bash
npm install @react-native-async-storage/async-storage@latest
npm install
```

## 📚 Technologies Used

- **React Native** - UI framework
- **Expo** - Development platform
- **AsyncStorage** - Local data persistence
- **Markdown Display** - Format & display tin nhắn
- **expo-document-picker** - File selection
- **React Native Safe Area Context** - Safe area handling

## 📝 Development Notes

- Tất cả styling sử dụng React Native `StyleSheet`
- Theme colors được centralize trong `src/theme.js`
- API calls được quản lý trong `src/api.js`
- Local storage sử dụng AsyncStorage
- Responsive design dựa trên Dimensions API

## 🤝 Support

Để báo cáo lỗi hoặc yêu cầu tính năng:

1. Kiểm tra lỗi console
2. Xem logs trong Expo DevTools
3. Liên hệ team development

---

**Version:** 1.0.0  
**Last Updated:** 2025  
**Status:** ✅ Production Ready
