import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../theme";
import { authApi } from "../api";

const UserProfileModal = ({ user, onClose, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    username: user?.username || "",
    email: user?.email || "",
    studentCode: user?.studentCode || "",
  });

  const handleSaveProfile = async () => {
    if (!editData.username.trim() || !editData.email.trim()) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
      return;
    }

    setIsSaving(true);
    try {
      const response = await authApi.updateProfile(editData);
      if (response.success) {
        Alert.alert("Thành công", "Cập nhật thông tin thành công");
        setIsEditing(false);
      } else {
        Alert.alert("Lỗi", response.error || "Cập nhật thất bại");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Lỗi kết nối");
      console.error("Error updating profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
          <Text style={styles.editButton}>{isEditing ? "✓" : "✏️"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.username || "Người dùng"}</Text>
          <Text style={styles.userRole}>
            {user?.role === "admin" ? "Quản trị viên" : "Người dùng"}
          </Text>
        </View>

        {/* Profile Info Section */}
        <View style={styles.infoSection}>
          {/* Username */}
          <View style={styles.infoGroup}>
            <Text style={styles.label}>Username</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editData.username}
                onChangeText={(text) =>
                  setEditData((prev) => ({ ...prev, username: text }))
                }
                editable={!isSaving}
              />
            ) : (
              <Text style={styles.value}>{editData.username}</Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.infoGroup}>
            <Text style={styles.label}>Email</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editData.email}
                onChangeText={(text) =>
                  setEditData((prev) => ({ ...prev, email: text }))
                }
                keyboardType="email-address"
                editable={!isSaving}
              />
            ) : (
              <Text style={styles.value}>{editData.email}</Text>
            )}
          </View>

          {/* Student Code */}
          <View style={styles.infoGroup}>
            <Text style={styles.label}>Mã sinh viên</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editData.studentCode}
                onChangeText={(text) =>
                  setEditData((prev) => ({ ...prev, studentCode: text }))
                }
                editable={!isSaving}
              />
            ) : (
              <Text style={styles.value}>
                {editData.studentCode || "Chưa cập nhật"}
              </Text>
            )}
          </View>

          {/* User ID (Read-only) */}
          <View style={styles.infoGroup}>
            <Text style={styles.label}>User ID</Text>
            <Text style={[styles.value, styles.greyText]}>
              {user?.id?.substring(0, 12)}...
            </Text>
          </View>

          {/* Joined Date */}
          <View style={styles.infoGroup}>
            <Text style={styles.label}>Tham gia</Text>
            <Text style={[styles.value, styles.greyText]}>
              {new Date(user?.createdAt).toLocaleDateString("vi-VN")}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        {isEditing && (
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.buttonDisabled]}
            onPress={handleSaveProfile}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.surface} size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert("Xác nhận", "Bạn có chắc chắn muốn đăng xuất?", [
              { text: "Hủy", onPress: () => {} },
              {
                text: "Đăng xuất",
                onPress: onLogout,
                style: "destructive",
              },
            ]);
          }}
        >
          <Text style={styles.logoutButtonText}>🚪 Đăng xuất</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },

  closeButton: {
    fontSize: 24,
    color: COLORS.onSurface,
  },

  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: "600",
    color: COLORS.onSurface,
  },

  editButton: {
    fontSize: 20,
  },

  content: {
    flex: 1,
    padding: SPACING.lg,
  },

  avatarSection: {
    alignItems: "center",
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.xl,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },

  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.surface,
  },

  userName: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: "700",
    color: COLORS.onSurface,
    marginBottom: SPACING.sm,
  },

  userRole: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: "600",
  },

  infoSection: {
    gap: SPACING.lg,
  },

  infoGroup: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },

  label: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: "600",
    color: COLORS.onSurfaceVariant,
    textTransform: "uppercase",
    marginBottom: SPACING.sm,
    letterSpacing: 0.5,
  },

  value: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.onSurface,
    fontWeight: "500",
  },

  greyText: {
    color: COLORS.onSurfaceVariant,
  },

  input: {
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.onSurface,
    fontSize: TYPOGRAPHY.fontSize.base,
    backgroundColor: COLORS.surface,
  },

  footer: {
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },

  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    justifyContent: "center",
    alignItems: "center",
  },

  saveButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: "600",
    color: COLORS.surface,
  },

  logoutButton: {
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    justifyContent: "center",
    alignItems: "center",
  },

  logoutButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: "600",
    color: COLORS.error,
  },

  buttonDisabled: {
    opacity: 0.6,
  },
});

export default UserProfileModal;
