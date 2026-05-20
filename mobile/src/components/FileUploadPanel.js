import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../theme";

const FileUploadPanel = ({ onFilesSelected, onClose }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
          "text/markdown",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "image/png",
          "image/jpeg",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newFiles = result.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/octet-stream",
          size: asset.size,
        }));

        setSelectedFiles((prev) => [...prev, ...newFiles]);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Lỗi", "Không thể chọn file");
    }
  };

  const handleConfirm = () => {
    if (selectedFiles.length === 0) {
      Alert.alert("Thông báo", "Vui lòng chọn ít nhất một file");
      return;
    }

    onFilesSelected(selectedFiles);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i)) + " " + sizes[i];
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đính kèm file</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Upload Button */}
        <TouchableOpacity style={styles.uploadBox} onPress={handlePickDocument}>
          <Text style={styles.uploadIcon}>📁</Text>
          <Text style={styles.uploadText}>Chọn file</Text>
          <Text style={styles.uploadSubtext}>PDF, Word, Excel, Ảnh, Text</Text>
        </TouchableOpacity>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <View style={styles.filesSection}>
            <Text style={styles.sectionTitle}>
              Đã chọn ({selectedFiles.length} file)
            </Text>
            {selectedFiles.map((file, index) => (
              <View key={index} style={styles.fileItem}>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {file.name}
                  </Text>
                  <Text style={styles.fileSize}>
                    {formatFileSize(file.size)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveFile(index)}
                >
                  <Text style={styles.removeIcon}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Hủy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.confirmButton,
            selectedFiles.length === 0 && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={selectedFiles.length === 0}
        >
          <Text style={styles.confirmButtonText}>
            Xác nhận ({selectedFiles.length})
          </Text>
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

  content: {
    flex: 1,
    padding: SPACING.lg,
  },

  uploadBox: {
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    borderStyle: "dashed",
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xl * 2,
    alignItems: "center",
    marginBottom: SPACING.xl,
  },

  uploadIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },

  uploadText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: "600",
    color: COLORS.onSurface,
    marginBottom: SPACING.xs,
  },

  uploadSubtext: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.onSurfaceVariant,
  },

  filesSection: {
    marginTop: SPACING.lg,
  },

  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: "600",
    color: COLORS.onSurface,
    marginBottom: SPACING.md,
  },

  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },

  fileInfo: {
    flex: 1,
  },

  fileName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: "500",
    color: COLORS.onSurface,
    marginBottom: SPACING.xs,
  },

  fileSize: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.onSurfaceVariant,
  },

  removeButton: {
    padding: SPACING.sm,
  },

  removeIcon: {
    fontSize: 18,
    color: COLORS.error,
  },

  footer: {
    flexDirection: "row",
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },

  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    justifyContent: "center",
    alignItems: "center",
  },

  cancelButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: "600",
    color: COLORS.onSurface,
  },

  confirmButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  confirmButtonDisabled: {
    opacity: 0.5,
  },

  confirmButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: "600",
    color: COLORS.surface,
  },
});

export default FileUploadPanel;
