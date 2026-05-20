import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, commonStyles } from "../theme";
import { chatApi } from "../api";
import ChatHeaderBar from "../components/ChatHeaderBar";
import ChatSidebar from "../components/ChatSidebar";
import MessageBubble from "../components/MessageBubble";
import FileUploadPanel from "../components/FileUploadPanel";
import UserProfileModal from "../components/UserProfileModal";

const { width } = Dimensions.get("window");

const ChatScreen = ({ user, onLogout }) => {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [fileUploadVisible, setFileUploadVisible] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [userProfileVisible, setUserProfileVisible] = useState(false);
  const [conversations, setConversations] = useState([]);
  const flatListRef = useRef(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await chatApi.getConversations();
      if (response.success) {
        setConversations(response.data || []);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  const handleSelectConversation = async (conversation) => {
    setConversationId(conversation.id);
    setMessages([]);

    try {
      const response = await chatApi.getMessages(conversation.id);
      if (response.success) {
        setMessages(response.data || []);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      Alert.alert("Lỗi", "Không thể tải tin nhắn");
    }
  };

  const handleNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setSelectedFiles([]);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && selectedFiles.length === 0) {
      return;
    }

    const messageText = inputText.trim();
    setInputText("");
    setLoading(true);

    try {
      const response = await chatApi.sendMessage({
        content: messageText,
        conversation_id: conversationId,
        files: selectedFiles,
      });

      if (response.success) {
        // Add user message
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: "user",
            content: messageText,
            files: selectedFiles,
            timestamp: new Date().toISOString(),
          },
        ]);

        // Set conversation ID if new
        if (!conversationId && response.conversation_id) {
          setConversationId(response.conversation_id);
        }

        // Add assistant message if available
        if (response.data?.content) {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              role: "assistant",
              content: response.data.content,
              timestamp: new Date().toISOString(),
            },
          ]);
        }

        setSelectedFiles([]);
        loadConversations();
      } else {
        Alert.alert("Lỗi", response.error || "Gửi tin nhắn thất bại");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Lỗi", "Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    try {
      const response = await chatApi.deleteConversation(conversationId);
      if (response.success) {
        setConversations((prev) =>
          prev.filter((conv) => conv.id !== conversationId),
        );
        if (conversationId === conversationId) {
          handleNewConversation();
        }
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainLayout}>
        {/* Sidebar */}
        {width > 768 && (
          <View style={styles.sidebarContainer}>
            <ChatSidebar
              conversations={conversations}
              currentConversationId={conversationId}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
            />
          </View>
        )}

        {/* Chat Area */}
        <View style={styles.chatArea}>
          {/* Header */}
          <ChatHeaderBar
            user={user}
            onMenuPress={() => setSidebarVisible(!sidebarVisible)}
            onProfilePress={() => setUserProfileVisible(true)}
            onLogout={onLogout}
          />

          {/* Messages List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <MessageBubble message={item} user={user} />
            )}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
              }
            }}
          />

          {/* Input Area */}
          <View style={styles.inputArea}>
            {/* File Preview */}
            {selectedFiles.length > 0 && (
              <View style={styles.filePreview}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.fileScroll}
                >
                  {selectedFiles.map((file, index) => (
                    <View key={index} style={styles.fileChip}>
                      <Text style={styles.fileChipText} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedFiles((prev) =>
                            prev.filter((_, i) => i !== index),
                          );
                        }}
                      >
                        <Text style={styles.fileChipRemove}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Input Row */}
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.attachButton}
                onPress={() => setFileUploadVisible(true)}
                disabled={loading}
              >
                <Text style={styles.attachIcon}>📎</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.messageInput}
                placeholder="Nhập tin nhắn..."
                placeholderTextColor={COLORS.onSurfaceVariant}
                value={inputText}
                onChangeText={setInputText}
                multiline
                editable={!loading}
              />

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (loading ||
                    (!inputText.trim() && selectedFiles.length === 0)) &&
                    styles.sendButtonDisabled,
                ]}
                onPress={handleSendMessage}
                disabled={
                  loading || (!inputText.trim() && selectedFiles.length === 0)
                }
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.surface} size="small" />
                ) : (
                  <Text style={styles.sendIcon}>➜</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* File Upload Modal */}
        <Modal
          visible={fileUploadVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setFileUploadVisible(false)}
        >
          <FileUploadPanel
            onFilesSelected={(files) => {
              setSelectedFiles((prev) => [...prev, ...files]);
              setFileUploadVisible(false);
            }}
            onClose={() => setFileUploadVisible(false)}
          />
        </Modal>

        {/* User Profile Modal */}
        <Modal
          visible={userProfileVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setUserProfileVisible(false)}
        >
          <UserProfileModal
            user={user}
            onClose={() => setUserProfileVisible(false)}
            onLogout={() => {
              setUserProfileVisible(false);
              onLogout();
            }}
          />
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  mainLayout: {
    flex: 1,
    flexDirection: "row",
  },

  sidebarContainer: {
    width: 280,
    borderRightWidth: 1,
    borderRightColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surfaceSecondary,
  },

  chatArea: {
    flex: 1,
    flexDirection: "column",
  },

  messagesList: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },

  inputArea: {
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },

  filePreview: {
    marginBottom: SPACING.md,
  },

  fileScroll: {
    flexDirection: "row",
  },

  fileChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary20,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
  },

  fileChipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    marginRight: SPACING.sm,
    maxWidth: 150,
  },

  fileChipRemove: {
    color: COLORS.primary,
    fontWeight: "600",
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: SPACING.sm,
  },

  attachButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },

  attachIcon: {
    fontSize: 20,
  },

  messageInput: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: COLORS.onSurface,
    fontSize: TYPOGRAPHY.fontSize.base,
    maxHeight: 100,
  },

  sendButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  sendButtonDisabled: {
    opacity: 0.5,
  },

  sendIcon: {
    fontSize: 20,
    color: COLORS.surface,
  },
});

export default ChatScreen;
