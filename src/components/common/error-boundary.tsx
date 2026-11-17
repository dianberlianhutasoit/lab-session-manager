import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * SRS-15: ErrorBoundary React untuk menangkap uncaught runtime errors
 * dan mencegah terjadinya White Screen of Death (layar putih kosong).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error untuk kebutuhan debugging atau analitik
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>⚠️</Text>
            </View>

            <Text style={styles.title}>
              {this.props.fallbackTitle ?? 'Terjadi Kendala pada Aplikasi'}
            </Text>

            <Text style={styles.subtitle}>
              Sistem mendeteksi kesalahan yang tidak terduga. Komponen ini dicegah dari crash total
              agar Anda dapat memuat ulang aplikasi dengan aman.
            </Text>

            {this.state.error && (
              <View style={styles.detailsBox}>
                <Text style={styles.detailsLabel}>Informasi Teknis:</Text>
                <Text style={styles.detailsText}>
                  {this.state.error.name}: {this.state.error.message}
                </Text>
              </View>
            )}

            <Pressable
              onPress={this.handleReset}
              style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}>
              <Text style={styles.resetButtonText}>🔄 Muat Ulang Halaman</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 380,
    lineHeight: 20,
  },
  detailsBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  detailsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  detailsText: {
    fontSize: 12,
    color: '#DC2626',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  resetButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.8,
  },
});

