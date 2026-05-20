import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, commonStyles } from "../theme";
import { authApi } from "../api";
import KMALogo from "../components/KMALogo";

const LoginScreen = ({ onLoginSuccess, onSwitchToRegister }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Vui lòng nhập username và mật khẩu");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await authApi.login(username.trim(), password);

      if (response.success) {
        onLoginSuccess(response.user);
      } else {
        setError(response.error || "Đăng nhập thất bại");
      }
    } catch (err) {
      setError(err.message || "Lỗi kết nối");
      console.error("Login error:", err);
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
            <Text style={styles.description}>Đăng nhập để tiếp tục</Text>
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
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  setError("");
                }}
                editable={!loading}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu"
                placeholderTextColor={COLORS.onSurfaceVariant}
                secureTextEntry
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError("");
                }}
                editable={!loading}
              />
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.surface} size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Đăng nhập</Text>
              )}
            </TouchableOpacity>

            {/* Switch to Register */}
            <View style={styles.switchSection}>
              <Text style={styles.switchText}>Chưa có tài khoản? </Text>
              <TouchableOpacity onPress={onSwitchToRegister}>
                <Text style={styles.switchLink}>Đăng ký ngay</Text>
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
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl * 2,
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
    marginBottom: SPACING.lg,
  },

  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: "600",
    color: COLORS.onSurface,
    marginBottom: SPACING.sm,
  },

  input: {
    ...commonStyles.input,
    minHeight: 48,
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

  loginButton: {
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

  loginButtonText: {
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

export default LoginScreen;
