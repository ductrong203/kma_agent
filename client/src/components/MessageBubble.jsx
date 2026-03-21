// Modern LibreChat-style MessageBubble
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FiUser, FiMessageCircle, FiAlertCircle } from "react-icons/fi";
import { MESSAGE_SENDERS } from "../utils/constants";
import RateLimitMessage from "./RateLimitMessage";
import "./ChatArea.css";

const MessageBubble = ({ message }) => {
  const isUser =
    message.sender === MESSAGE_SENDERS.USER || message.sender === "user";
  const isError = message.isError || message.sender === "error";
  const isRateLimit = message.isRateLimit === true;

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get the message text - handle both 'text' and 'content' properties
  const messageText = message.text || message.content || "";

  const getAvatarIcon = () => {
    if (isUser) {
      return <FiUser className="w-4 h-4" />;
    } else if (isError) {
      return <FiAlertCircle className="w-4 h-4" />;
    } else {
      return <FiMessageCircle className="w-4 h-4" />;
    }
  };

  return (
    <div
      className={`message-container ${isUser ? "user-message" : "bot-message"}`}
    >
      <div className={`message-wrapper ${isUser ? "user" : "bot"}`}>
        {/* Avatar */}
        <div
          className={`message-avatar ${
            isUser ? "user" : isError ? "error" : "bot"
          }`}
        >
          {getAvatarIcon()}
        </div>

        {/* Message bubble */}
        <div
          className={`message-bubble ${
            isUser ? "user" : isError ? "error" : "bot"
          }`}
        >
          {/* Rate limit message special handling */}
          {isRateLimit ? (
            <RateLimitMessage message={messageText} />
          ) : (
            <div className="message-content">
              {isUser ? (
                <p>{messageText}</p>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  className="prose prose-sm max-w-none"
                  components={{
                    p: ({ children }) => (
                      <p className="mb-2 last:mb-0">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside mb-2 space-y-1">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside mb-2 space-y-1">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-sm">{children}</li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic">{children}</em>
                    ),
                    h1: ({ children }) => (
                      <h1 className="text-base font-bold mb-2 mt-2">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-sm font-bold mb-2 mt-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-semibold mb-1 mt-1">
                        {children}
                      </h3>
                    ),
                    code: ({ children }) => (
                      <code className="bg-black/10 px-2 py-1 rounded text-sm font-mono">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-black/5 p-3 rounded-lg overflow-x-auto mb-2 text-xs">
                        {children}
                      </pre>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-current pl-4 my-2 opacity-75">
                        {children}
                      </blockquote>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-2 rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-gray-100">{children}</thead>
                    ),
                    tbody: ({ children }) => (
                      <tbody className="divide-y divide-gray-200">
                        {children}
                      </tbody>
                    ),
                    th: ({ children }) => (
                      <th className="px-4 py-2 text-left text-xs font-semibold">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-4 py-2 text-sm">{children}</td>
                    ),
                    a: ({ node, ...props }) => (
                      <a
                        {...props}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:opacity-80"
                      />
                    ),
                  }}
                >
                  {messageText}
                </ReactMarkdown>
              )}
            </div>
          )}
          <div className="message-timestamp">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
