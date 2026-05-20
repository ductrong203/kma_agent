import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../theme";
import KMALogo from "./KMALogo";

const { width } = Dimensions.get("window");
const isSmallScreen = width < 480;

const ChatHeaderBar = ({ user, onMenuPress, onProfilePress, onLogout }) => {
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);

  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          {isSmallScreen && (
            <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
              <Text style={styles.menuIcon}>☰</Text>
            </TouchableOpacity>
          )}
          <KMALogo
            size={isSmallScreen ? "small" : "normal"}
            showText={!isSmallScreen}
          />
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={onProfilePress}
          >
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitial}>
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => setMoreMenuVisible(true)}
          >
            <Text style={styles.moreIcon}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusIndicator} />
        <Text style={styles.statusText}>Ready to assist</Text>
      </View>

      {/* More Menu Modal */}
      <Modal
        visible={moreMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMoreMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setMoreMenuVisible(false)}
          activeOpacity={1}
        >
          <View style={styles.moreMenu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMoreMenuVisible(false);
                onProfilePress();
              }}
            >
              <Text style={styles.menuItemText}>👤 Thông tin cá nhân</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMoreMenuVisible(false);
                onLogout();
              }}
            >
              <Text style={[styles.menuItemText, styles.dangerText]}>
                🚪 Đăng xuất
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surface,
  },

  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: SPACING.md,
    minWidth: 0,
  },

  menuButton: {
    padding: SPACING.sm,
    marginRight: SPACING.sm,
  },

  menuIcon: {
    fontSize: 24,
    color: COLORS.onSurface,
  },

  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: "600",
    color: COLORS.onSurface,
  },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },

  profileButton: {
    padding: SPACING.sm,
  },

  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  profileInitial: {
    color: COLORS.surface,
    fontWeight: "600",
    fontSize: TYPOGRAPHY.fontSize.sm,
  },

  moreButton: {
    padding: SPACING.sm,
  },

  moreIcon: {
    fontSize: 20,
    color: COLORS.onSurface,
  },

  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    backgroundColor: COLORS.primary50,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },

  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },

  statusText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.onSurfaceVariant,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    paddingTop: 60,
    paddingRight: SPACING.lg,
  },

  moreMenu: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    minWidth: 200,
    alignSelf: "flex-end",
    marginRight: SPACING.lg,
    shadowColor: COLORS.shadowLg,
    elevation: 5,
  },

  menuItem: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },

  menuItemText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.onSurface,
    fontWeight: "500",
  },

  dangerText: {
    color: COLORS.error,
  },

  menuDivider: {
    height: 1,
    backgroundColor: COLORS.outlineVariant,
  },
});

export default ChatHeaderBar;
