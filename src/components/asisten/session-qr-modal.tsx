import React, { useMemo } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Pressable,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { QRDisplay } from '@/components/common/qr-display';
import { Spacing } from '@/constants/theme';
import type { SessionWithDetails } from '@/context/session-context';

interface SessionQRModalProps {
  visible: boolean;
  session: SessionWithDetails | null;
  onClose: () => void;
}

export function SessionQRModal({
  visible,
  session,
  onClose,
}: SessionQRModalProps) {
  const qrToken = useMemo(() => {
    if (!session) return '';
    return JSON.stringify({
      sessionId: session.id,
      scheduleId: session.scheduleId,
      room: session.schedule?.room ?? '',
      code: `QR-${session.id}`,
    });
  }, [session]);

  if (!session) return null;

  const isOpen = session.status === 'OPEN';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ThemedView type="backgroundElement" style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <ThemedText type="subtitle" style={styles.title}>
                QR Code Presensi
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Tampilkan QR ini ke praktikan di laboratorium
              </ThemedText>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <ThemedText style={styles.closeIcon}>✕</ThemedText>
            </Pressable>
          </View>

          {/* Sesi Info */}
          <View style={styles.sessionBox}>
            <ThemedText type="defaultSemiBold" style={styles.sessionTitle}>
              {session.schedule?.title ?? 'Sesi Praktikum'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {session.schedule?.courseCode} • Ruang: {session.schedule?.room}
            </ThemedText>
            <View style={[styles.statusBadge, isOpen ? styles.statusOpen : styles.statusClosed]}>
              <ThemedText style={[styles.statusText, isOpen ? styles.textOpen : styles.textClosed]}>
                {isOpen ? 'SESI AKTIF (OPEN)' : 'SESI DITUTUP (CLOSED)'}
              </ThemedText>
            </View>
          </View>

          {/* QR Display */}
          <View style={styles.qrWrapper}>
            {isOpen ? (
              <QRDisplay value={qrToken} size={210} />
            ) : (
              <View style={styles.qrDisabled}>
                <ThemedText style={styles.lockIcon}>🔒</ThemedText>
                <ThemedText type="smallBold" style={styles.disabledText}>
                  Sesi praktikum belum dibuka.
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.disabledSubText}>
                  Buka status sesi (OPEN) untuk mengaktifkan QR presensi.
                </ThemedText>
              </View>
            )}
          </View>

          {/* Token String */}
          <View style={styles.tokenBox}>
            <ThemedText type="small" themeColor="textSecondary">
              Kode Sesi:
            </ThemedText>
            <ThemedText type="smallBold" style={styles.tokenText}>
              {session.id}
            </ThemedText>
          </View>

          {/* Footer Action */}
          <Pressable onPress={onClose} style={styles.dismissButton}>
            <ThemedText style={styles.dismissButtonText}>Tutup</ThemedText>
          </Pressable>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    gap: Spacing.three,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: Spacing.two,
  },
  closeIcon: {
    fontSize: 18,
    color: '#94A3B8',
  },
  sessionBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: Spacing.three,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  sessionTitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  statusBadge: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusOpen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusClosed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textOpen: {
    color: '#10B981',
  },
  textClosed: {
    color: '#EF4444',
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginVertical: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  qrDisabled: {
    width: 210,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  lockIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  disabledText: {
    color: '#334155',
    textAlign: 'center',
  },
  disabledSubText: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 4,
  },
  tokenBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tokenText: {
    color: '#8BE9FD',
    fontFamily: 'monospace',
  },
  dismissButton: {
    width: '100%',
    backgroundColor: '#4F8EF7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  dismissButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
