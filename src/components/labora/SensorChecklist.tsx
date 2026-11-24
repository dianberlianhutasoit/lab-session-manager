import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LaboraColors } from '@/constants/theme';

interface SensorItem {
  id: string;
  title: string;
  subtitle: string;
  statusText: string;
  isPassed: boolean;
  iconName: keyof typeof Feather.glyphMap;
}

interface SensorChecklistProps {
  gpsAccuracyMeters?: number | null;
  isMockGpsDetected?: boolean;
  isLocationAccurate?: boolean;
  isMockDetected?: boolean;
}

export function SensorChecklist({
  gpsAccuracyMeters = 3.2,
  isMockGpsDetected = false,
  isLocationAccurate = true,
  isMockDetected = false,
}: SensorChecklistProps) {
  const items: SensorItem[] = [
    {
      id: 'gps',
      title: 'GPS Presisi Tinggi',
      subtitle: `Estimasi akurasi ±${gpsAccuracyMeters ? Math.round(gpsAccuracyMeters) : 3} meter`,
      statusText: 'Terpenuhi',
      isPassed: true,
      iconName: 'crosshair',
    },
    {
      id: 'ntp',
      title: 'Sinkronisasi Waktu Server',
      subtitle: 'Sinkron dengan NTP Server Lab',
      statusText: 'Terpenuhi',
      isPassed: true,
      iconName: 'clock',
    },
    {
      id: 'wifi',
      title: 'Jaringan Wi-Fi Lab',
      subtitle: 'Eduroam / Anchor BSSID valid',
      statusText: 'Terhubung',
      isPassed: true,
      iconName: 'wifi',
    },
    {
      id: 'mock',
      title: 'Anti Mock GPS',
      subtitle: isMockGpsDetected ? 'Terdeteksi Mock Location' : 'Tidak ada aplikasi spoofing aktif',
      statusText: isMockGpsDetected ? 'Bahaya' : 'Aman',
      isPassed: !isMockGpsDetected,
      iconName: 'shield',
    },
  ];

  const passedCount = items.filter((i) => i.isPassed).length;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Feather name="shield" size={16} color={LaboraColors.primary} />
          <Text style={styles.headerTitle}>Verifikasi Sensor & Perangkat</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {passedCount}/{items.length} Aman
          </Text>
        </View>
      </View>

      <View style={styles.itemList}>
        {items.map((item, idx) => (
          <View key={item.id} style={[styles.itemRow, idx !== items.length - 1 && styles.itemBorder]}>
            <View style={styles.iconCircle}>
              <Feather name={item.iconName} size={15} color={LaboraColors.primary} />
            </View>
            <View style={styles.textColumn}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={[styles.statusText, { color: item.isPassed ? '#059669' : LaboraColors.danger }]}>
                {item.statusText}
              </Text>
              <Feather
                name={item.isPassed ? 'check' : 'x'}
                size={13}
                color={item.isPassed ? '#059669' : LaboraColors.danger}
                style={{ marginLeft: 3 }}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  countBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#A7F3D0',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  itemList: {
    backgroundColor: '#FAF5F7',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F3E8EC',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0E2E7',
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  textColumn: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  itemSubtitle: {
    fontSize: 10,
    color: LaboraColors.textSecondary,
    marginTop: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
