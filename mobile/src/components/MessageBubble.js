import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Markdown from "react-native-markdown-display";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../theme";

const MessageBubble = ({ message, user }) => {
  const isUserMessage = message.role === "user";

  const markdownRules = {
    text: (node, children, parent) => (
      <Text
        key={node.key}
        style={{
          color: isUserMessage ? COLORS.surface : COLORS.onSurface,
          fontSize: TYPOGRAPHY.fontSize.sm,
        }}
      >
        {children}
      </Text>
    ),
    code_inline: (node, children) => (
      <Text
        key={node.key}
        style={{
          backgroundColor: isUserMessage
            ? "rgba(255, 255, 255, 0.2)"
            : COLORS.surfaceSecondary,
          paddingHorizontal: 4,
          borderRadius: 4,
          fontFamily: "monospace",
          color: isUserMessage ? COLORS.surface : COLORS.onSurface,
        }}
      >
        {children}
      </Text>
    ),
    code_block: (node, children) => (
      <View
        key={node.key}
        style={{
          backgroundColor: isUserMessage
            ? "rgba(255, 255, 255, 0.2)"
            : COLORS.surfaceSecondary,
          padding: SPACING.md,
          borderRadius: RADIUS.md,
          marginVertical: SPACING.sm,
        }}
      >
        <Text
          style={{
            fontFamily: "monospace",
            fontSize: TYPOGRAPHY.fontSize.xs,
            color: isUserMessage ? COLORS.surface : COLORS.onSurface,
          }}
        >
          {children}
        </Text>
      </View>
    ),
    table: (node, children) => (
      <View
        key={node.key}
        style={{
          marginVertical: SPACING.md,
          borderRadius: RADIUS.md,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: isUserMessage
            ? "rgba(255, 255, 255, 0.2)"
            : COLORS.outlineVariant,
        }}
      >
        {children}
      </View>
    ),
    blockquote: (node, children) => (
      <View
        key={node.key}
        style={{
          borderLeftWidth: 3,
          borderLeftColor: isUserMessage
            ? "rgba(255, 255, 255, 0.5)"
            : COLORS.primary,
          paddingLeft: SPACING.md,
          marginVertical: SPACING.sm,
          opacity: 0.8,
        }}
      >
        {children}
      </View>
    ),
  };

  return (
    <View
      style={[
        styles.messageBubble,
        isUserMessage ? styles.userBubble : styles.assistantBubble,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUserMessage ? styles.userBubbleStyle : styles.assistantBubbleStyle,
        ]}
      >
        {/* Files if any */}
        {message.files && message.files.length > 0 && (
          <View style={styles.filesContainer}>
            {message.files.map((file, index) => (
              <Text
                key={index}
                style={[
                  styles.fileText,
                  isUserMessage
                    ? styles.fileTextUser
                    : styles.fileTextAssistant,
                ]}
                numberOfLines={1}
              >
                📎 {file.name}
              </Text>
            ))}
          </View>
        )}

        {/* Message Content */}
        <Markdown rules={markdownRules} style={styles.markdownStyle}>
          {message.content}
        </Markdown>
      </View>

      {/* Timestamp */}
      <Text style={styles.timestamp}>
        {new Date(message.timestamp).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  messageBubble: {
    marginVertical: SPACING.sm,
    alignItems: "flex-start",
  },

  userBubble: {
    alignItems: "flex-end",
  },

  bubble: {
    maxWidth: "85%",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },

  userBubbleStyle: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: RADIUS.sm,
  },

  assistantBubbleStyle: {
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderBottomLeftRadius: RADIUS.sm,
  },

  filesContainer: {
    marginBottom: SPACING.sm,
  },

  fileText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: "500",
    marginBottom: SPACING.xs,
  },

  fileTextUser: {
    color: COLORS.surface,
  },

  fileTextAssistant: {
    color: COLORS.primary,
  },

  timestamp: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
  },

  markdownStyle: {
    body: {
      color: COLORS.onSurface,
    },
  },
});

export default MessageBubble;
