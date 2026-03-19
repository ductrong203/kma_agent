import React, { useState } from 'react';
import { FiMessageCircle, FiBook, FiHelpCircle, FiClock, FiDollarSign, FiBarChart2 } from 'react-icons/fi';
import UsageStats from './UsageStats';

const WelcomeScreen = ({ onSendMessage, user, welcomeMessage }) => {
  const [showUsageStats, setShowUsageStats] = useState(false);

  const quickActions = [
    {
      icon: FiBook,
      title: 'Quy định học tập',
      description: 'Tìm hiểu về các quy định và chính sách học tập tại KMA',
      query: 'Cho tôi biết về quy định học tập tại KMA'
    },
    {
      icon: FiClock,
      title: 'Lịch thi và lịch học',
      description: 'Xem lịch thi, lịch học và thời gian biểu',
      query: 'Lịch thi cuối kỳ như thế nào?'
    },
    {
      icon: FiDollarSign,
      title: 'Học phí',
      description: 'Thông tin về học phí và các khoản phí khác',
      query: 'Học phí của KMA là bao nhiêu?'
    },
    {
      icon: FiHelpCircle,
      title: 'Hỏi đáp chung',
      description: 'Các câu hỏi thường gặp về KMA',
      query: 'Tôi muốn hỏi về KMA'
    }
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 pt-8 mt-4">
      {/* Welcome message */}
      <div className="text-center mb-6 lg:mb-8 mt-2">
        <div className="w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-3 lg:mb-4 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center animate-bounce-gentle">
          <FiMessageCircle className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
        </div>
        
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
          Chào mừng đến với KMA Chatbot!
        </h2>
        
        <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-xl lg:max-w-2xl mx-auto px-2">
          Tôi là trợ lý ảo thông minh, sẵn sàng hỗ trợ bạn giải đáp các thắc mắc về 
          Học viện Kỹ thuật Mật mã. Hãy bắt đầu cuộc trò chuyện!
        </p>
      </div>

      {/* Quick actions */}
      <div className="w-full max-w-6xl mb-4 lg:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 lg:mb-4 text-center">
          Bạn có thể hỏi tôi về:
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => onSendMessage(action.query)}
              className="p-4 lg:p-6 bg-white rounded-lg lg:rounded-xl border border-gray-200 hover:border-red-300 hover:shadow-lg transition-all duration-300 text-left group h-full"
            >
              <div className="flex flex-col sm:flex-row lg:flex-col items-start space-y-2 sm:space-y-0 sm:space-x-3 lg:space-x-0 lg:space-y-3">
                <div className="flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 bg-red-50 rounded-lg flex items-center justify-center group-hover:bg-red-100 transition-colors duration-200">
                  <action.icon className="w-5 h-5 lg:w-6 lg:h-6 text-red-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-base lg:text-lg font-semibold text-gray-900 mb-1 lg:mb-2 group-hover:text-red-600 transition-colors duration-200 leading-tight">
                    {action.title}
                  </h4>
                  <p className="text-gray-600 text-xs sm:text-sm lg:text-sm leading-relaxed line-clamp-2">
                    {action.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sample questions */}
      <div className="w-full max-w-4xl mb-4">
        <h4 className="text-base sm:text-lg font-medium text-gray-700 mb-2 lg:mb-3 text-center">
          Hoặc thử những câu hỏi mẫu:
        </h4>
        
        <div className="flex flex-wrap justify-center gap-2">
          {[
            'Điều kiện tốt nghiệp là gì?',
            'Cách tính điểm trung bình?',
            'Quy định về đồ án tốt nghiệp',
            'Thủ tục chuyển ngành học',
            'Học bổng dành cho sinh viên'
          ].map((question, index) => (
            <button
              key={index}
              onClick={() => onSendMessage(question)}
              className="px-3 py-1.5 lg:px-4 lg:py-2 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 rounded-full text-xs sm:text-sm transition-all duration-200 border border-transparent hover:border-red-200"
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div className="text-center text-xs sm:text-sm text-gray-500 mb-4">
        <p>💡 Mẹo: Bạn có thể nhập câu hỏi bằng giọng nói hoặc gõ trực tiếp</p>
      </div>

    </div>
  );
};

export default WelcomeScreen;
