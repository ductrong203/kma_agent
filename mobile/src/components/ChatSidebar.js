import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../theme";

const ChatSidebar = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}) => {
  const handleDelete = (conversationId) => {
    onDeleteConversation(conversationId);
  };

  return (
    <View style={styles.sidebar}>
      {/* Header */}
      <View style={styles.sidebarHeader}>
        <Text style={styles.sidebarTitle}>Lịch sử trò chuyện</Text>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={onNewConversation}
        >
          <Text style={styles.newChatIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Conversations List */}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.conversationItem,
              currentConversationId === item.id &&
                styles.conversationItemActive,
            ]}
            onPress={() => onSelectConversation(item)}
          >
            <View style={styles.conversationContent}>
              <Text
                style={[
                  styles.conversationTitle,
                  currentConversationId === item.id &&
                    styles.conversationTitleActive,
                ]}
                numberOfLines={2}
              >
                {item.title || "Trò chuyện mới"}
              </Text>
              <Text style={styles.conversationTime}>
                {new Date(item.created_at).toLocaleDateString("vi-VN")}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item.id)}
            >
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    backgroundColor: COLORS.surfaceSecondary,
  },

  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },

  sidebarTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: "600",
    color: COLORS.onSurface,
  },

  newChatButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  newChatIcon: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: "600",
  },

  listContent: {
    paddingVertical: SPACING.sm,
  },

  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginHorizontal: SPACING.sm,
    marginVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },

  conversationItemActive: {
    backgroundColor: COLORS.primary20,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },

  conversationContent: {
    flex: 1,
  },

  conversationTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: "500",
    color: COLORS.onSurface,
    marginBottom: SPACING.xs,
  },

  conversationTitleActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },

  conversationTime: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.onSurfaceVariant,
  },

  deleteButton: {
    padding: SPACING.sm,
  },

  deleteIcon: {
    fontSize: 16,
  },
});

export default ChatSidebar;
