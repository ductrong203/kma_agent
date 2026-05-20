import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, commonStyles } from "../theme";
import { authApi } from "../api";
import KMALogo from "../components/KMALogo";

const RegisterScreen = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    studentCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateForm = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError("");
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError("Vui lòng nhập username");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Vui lòng nhập email");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Email không hợp lệ");
      return false;
    }
    if (!formData.password.trim()) {
      setError("Vui lòng nhập mật khẩu");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return false;
    }
    if (!formData.studentCode.trim()) {
      setError("Vui lòng nhập mã sinh viên");
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      const response = await authApi.register(formData);

      if (response.success) {
        onRegisterSuccess(response.user);
      } else {
        setError(response.error || "Đăng ký thất bại");
      }
    } catch (err) {
      setError(err.message || "Lỗi kết nối");
      console.error("Register error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <KMALogo size="normal" showText={false} />
            <Text style={styles.tagline}>ACTVN AI</Text>
            <Text style={styles.subtitle}>Học viện Kỹ thuật Mật mã</Text>
            <Text style={styles.description}>Tạo tài khoản mới</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            {/* Error Message */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Username Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập username"
                placeholderTextColor={COLORS.onSurfaceVariant}
                value={formData.username}
                onChangeText={(text) => updateForm("username", text)}
                editable={!loading}
              />
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập email"
                placeholderTextColor={COLORS.onSurfaceVariant}
                keyboardType="email-address"
                value={formData.email}
                onChangeText={(text) => updateForm("email", text)}
                editable={!loading}
              />
            </View>

            {/* Student Code Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mã sinh viên</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập mã sinh viên"
                placeholderTextColor={COLORS.onSurfaceVariant}
                value={formData.studentCode}
                onChangeText={(text) => updateForm("studentCode", text)}
                editable={!loading}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                placeholderTextColor={COLORS.onSurfaceVariant}
                secureTextEntry
                value={formData.password}
                onChangeText={(text) => updateForm("password", text)}
                editable={!loading}
              />
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Xác nhận mật khẩu</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor={COLORS.onSurfaceVariant}
                secureTextEntry
                value={formData.confirmPassword}
                onChangeText={(text) => updateForm("confirmPassword", text)}
                editable={!loading}
              />
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.registerButton, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.surface} size="small" />
              ) : (
                <Text style={styles.registerButtonText}>Đăng ký</Text>
              )}
            </TouchableOpacity>

            {/* Switch to Login */}
            <View style={styles.switchSection}>
              <Text style={styles.switchText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={onSwitchToLogin}>
                <Text style={styles.switchLink}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              © 2025 KMA Academy. All rights reserved.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: "space-between",
  },

  headerSection: {
    alignItems: "center",
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },

  logoText: {
    fontSize: TYPOGRAPHY.fontSize["4xl"],
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },

  tagline: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },

  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
  },

  description: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.md,
    fontWeight: "500",
  },

  formSection: {
    width: "100%",
  },

  inputGroup: {
    marginBottom: SPACING.md,
  },

  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: "600",
    color: COLORS.onSurface,
    marginBottom: SPACING.xs,
  },

  input: {
    ...commonStyles.input,
    minHeight: 44,
  },

  errorBox: {
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },

  errorText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: "500",
  },

  registerButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: SPACING.lg,
    minHeight: 48,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  registerButtonText: {
    color: COLORS.surface,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: "600",
  },

  switchSection: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: SPACING.lg,
  },

  switchText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.onSurfaceVariant,
  },

  switchLink: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: "600",
  },

  infoSection: {
    alignItems: "center",
    marginTop: SPACING.lg,
  },

  infoText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.onSurfaceVariant,
    textAlign: "center",
  },
});

export default RegisterScreen;
