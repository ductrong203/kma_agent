// Modern LibreChat-style MessageBubble
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FiUser, FiAlertCircle } from "react-icons/fi";
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

  const convertPipeRowsToMarkdownTables = (rawText) => {
    if (!rawText || typeof rawText !== "string") return rawText;

    const lines = rawText.split("\n");
    const output = [];
    let i = 0;

    // Check if line is only dashes and spaces (table separator)
    const isSeparatorLine = (line) => {
      const trimmed = line.trim();
      return /^[-\s]+$/.test(trimmed) && trimmed.includes("-");
    };

    // Check if line contains pipe characters (markdown table row)
    const isPipeRow = (line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      return (trimmed.match(/\|/g) || []).length >= 2;
    };

    // Parse cells from pipe-separated row
    const parseCells = (line) =>
      line
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

    while (i < lines.length) {
      // Skip separator lines (all dashes)
      if (isSeparatorLine(lines[i])) {
        i += 1;
        continue;
      }

      if (!isPipeRow(lines[i])) {
        output.push(lines[i]);
        i += 1;
        continue;
      }

      // Collect table rows
      const block = [];
      while (i < lines.length && !isSeparatorLine(lines[i])) {
        if (isPipeRow(lines[i])) {
          const cells = parseCells(lines[i]);
          if (cells.length >= 2) block.push(cells);
          i += 1;
        } else {
          break;
        }
      }

      // Skip separator if present
      if (i < lines.length && isSeparatorLine(lines[i])) {
        i += 1;
      }

      if (block.length >= 1) {
        const colCount = Math.max(...block.map((r) => r.length));

        // Auto-detect headers and content
        let headers = block[0];
        let dataRows = block.slice(1);

        // Check if it's a score mapping table
        const isScoreTable =
          colCount === 3 &&
          dataRows.some((row) =>
            /^(từ|A\+|A|B\+|B|C\+|C|D\+|D|F|Xuất [^|]|Giỏi|Khá|Trung|Kém)/i.test(
              row[0],
            ),
          );

        if (isScoreTable && dataRows.length > 0) {
          // Swap: first row goes to data, auto-generate better headers
          dataRows = block;
          headers = ["Xếp loại", "Thang điểm 10", "Thang điểm chữ"];
        }

        // Output markdown table
        output.push(`| ${headers.map((h) => h || "").join(" | ")} |`);
        output.push(`| ${Array(colCount).fill("---").join(" | ")} |`);

        dataRows.forEach((row) => {
          const normalized = [...row];
          while (normalized.length < colCount) normalized.push("");
          output.push(`| ${normalized.join(" | ")} |`);
        });
      }
    }

    return output.join("\n");
  };

  const processedMessageText = isUser
    ? messageText
    : convertPipeRowsToMarkdownTables(messageText);

  const getAvatarIcon = () => {
    if (isUser) {
      return <FiUser className="w-4 h-4" />;
    } else if (isError) {
      return <FiAlertCircle className="w-4 h-4" />;
    } else {
      return (
        <img src="/img/kma.png" alt="KMA" className="message-avatar-image" />
      );
    }
  };

  // Helper to split message text by <think> tags
  const renderMessageContent = (text) => {
    if (isUser) return <p>{text}</p>;

    const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/gi;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = thinkRegex.exec(text)) !== null) {
      const beforeStr = text.substring(lastIndex, match.index);
      if (beforeStr) {
        parts.push({ type: "text", content: beforeStr });
      }

      parts.push({ type: "think", content: match[1] });
      lastIndex = thinkRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ type: "text", content: text.substring(lastIndex) });
    }

    if (parts.length === 0) {
      parts.push({ type: "text", content: text });
    }

    const commonComponents = {
      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
      ul: ({ children }) => (
        <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
      ),
      ol: ({ children }) => (
        <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
      ),
      li: ({ children }) => <li className="text-sm">{children}</li>,
      strong: ({ children }) => (
        <strong className="font-semibold">{children}</strong>
      ),
      em: ({ children }) => <em className="italic">{children}</em>,
      h1: ({ children }) => (
        <h1 className="text-base font-bold mb-2 mt-2">{children}</h1>
      ),
      h2: ({ children }) => (
        <h2 className="text-sm font-bold mb-2 mt-2">{children}</h2>
      ),
      h3: ({ children }) => (
        <h3 className="text-sm font-semibold mb-1 mt-1">{children}</h3>
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
        <table className="markdown-table message-content-table">
          {children}
        </table>
      ),
      thead: ({ children }) => <thead>{children}</thead>,
      tbody: ({ children }) => <tbody>{children}</tbody>,
      tr: ({ children }) => <tr>{children}</tr>,
      th: ({ children }) => <th>{children}</th>,
      td: ({ children }) => <td>{children}</td>,
      a: ({ node, children, ...props }) => (
        <a
          {...props}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:opacity-80"
          aria-label={typeof children === "string" ? children : "Link"}
        >
          {children}
        </a>
      ),
    };

    return parts.map((part, index) => {
      if (part.type === "think") {
        return (
          <details
            key={index}
            className="think-block my-2 border border-gray-200 rounded bg-white"
          >
            <summary className="cursor-pointer bg-gray-50 p-2 text-xs text-gray-500 font-semibold hover:bg-gray-100 transition-colors select-none">
              💭 Quá trình suy nghĩ...
            </summary>
            <div className="p-3 text-sm text-gray-600 bg-white border-t border-gray-200 font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                className="prose prose-sm max-w-none opacity-80"
                components={commonComponents}
              >
                {part.content}
              </ReactMarkdown>
            </div>
          </details>
        );
      } else {
        return (
          <ReactMarkdown
            key={index}
            remarkPlugins={[remarkGfm]}
            className="prose prose-sm max-w-none"
            components={commonComponents}
          >
            {part.content}
          </ReactMarkdown>
        );
      }
    });
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
              {renderMessageContent(processedMessageText)}
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="message-attachments">
              {message.attachments.map((attachment, idx) => {
                const fileName =
                  attachment.filename || attachment.name || "File";
                const fileSize = attachment.size
                  ? `${(attachment.size / 1024).toFixed(1)} KB`
                  : "N/A";
                return (
                  <div key={idx} className="attachment-item">
                    <div className="attachment-icon">📎</div>
                    <div className="attachment-info">
                      <div className="attachment-name">{fileName}</div>
                      <div className="attachment-size">{fileSize}</div>
                    </div>
                  </div>
                );
              })}
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
