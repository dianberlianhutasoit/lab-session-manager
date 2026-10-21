import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface PresensiModalProps {
  visible: boolean;
  sessionTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PresensiModal({
  visible,
  sessionTitle,
  onConfirm,
  onCancel,
}: PresensiModalProps) {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Konfirmasi Presensi</Text>
          <Text style={styles.message}>
            Apakah Anda yakin ingin melakukan presensi untuk praktikum{" "}
            <Text style={styles.highlight}>{sessionTitle}</Text>?
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmButtonText}>Ya, Presensi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#1E1E2A",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#2D2D3D",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F8F8F2",
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: "#8BE9FD",
    lineHeight: 22,
    marginBottom: 24,
  },
  highlight: {
    color: "#F1FA8C",
    fontWeight: "bold",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 90,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#6272A4",
  },
  confirmButton: {
    backgroundColor: "#50FA7B",
  },
  cancelButtonText: {
    color: "#F8F8F2",
    fontWeight: "600",
  },
  confirmButtonText: {
    color: "#12121A",
    fontWeight: "bold",
  },
});
