import React from 'react';

const TypingIndicator = () => {
  return (
    <div className="flex justify-start animate-slide-up">
      <div className="flex items-end space-x-2">
        {/* Bot avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
          <div className="w-4 h-4 bg-white rounded-full"></div>
        </div>

        {/* Typing bubble */}
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
          <div className="flex items-center space-x-1">
            <span className="typing-indicator"></span>
            <span className="typing-indicator"></span>
            <span className="typing-indicator"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
