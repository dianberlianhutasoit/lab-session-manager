import React, { useMemo, useState } from 'react';
import { Stack, useRouter, type Href } from 'expo-router';
import {
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Schedule, Session } from '@/types';
import { useSessionContext } from '@/context/session-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCALE = Math.min(Math.max(SCREEN_WIDTH / 402, 0.85), 1.25);
const s = (val: number) => Math.round(val * SCALE);

// Color tokens matching modern brand system
const COLOR_BG = '#F8F5F2';
const COLOR_MAROON = '#64102A';
const COLOR_BUTTON = '#791636';
const COLOR_TEXT_DARK = '#1E293B';
const COLOR_TEXT_MUTED = '#64748B';

type ScheduledSession = { session: Session; schedule: Schedule };
type FilterType = 'all' | 'today' | 'thisWeek';

const MONTH_NAMES_INDO = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES_INDO = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function formatDateIndo(dateStr?: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = DAY_NAMES_INDO[d.getDay()];
      const dateNum = d.getDate();
      const month = MONTH_NAMES_INDO[d.getMonth()].slice(0, 3);
      const year = d.getFullYear();
      return `${day}, ${dateNum} ${month} ${year}`;
    }
  } catch {}
  return dateStr;
}

function getWeekDates(refDate: Date) {
  const current = new Date(refDate);
  const dayOfWeek = current.getDay() === 0 ? 7 : current.getDay();
  const monday = new Date(current);
  monday.setDate(current.getDate() - (dayOfWeek - 1));

  const week = [];
  const dayHeaders = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    week.push({
      date: d,
      dateStr: d.toISOString().slice(0, 10),
      dayLabel: dayHeaders[i],
      dateNumber: d.getDate(),
    });
  }
  return week;
}

export default function PraktikanJadwalScreen() {
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const { schedules, sessions, loading } = useSessionContext();
  const [refreshing, setRefreshing] = useState(false);

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Calendar strip state - tanggal hari ini langsung terpilih di awal
  const [currentWeekRef, setCurrentWeekRef] = useState<Date>(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(todayStr);
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);

  const weekDays = useMemo(() => getWeekDates(currentWeekRef), [currentWeekRef]);
  const monthYearLabel = useMemo(() => {
    return `${MONTH_NAMES_INDO[currentWeekRef.getMonth()]} ${currentWeekRef.getFullYear()}`;
  }, [currentWeekRef]);

  // Combine sessions with schedules
  const scheduledSessions: ScheduledSession[] = useMemo(() => {
    const list = sessions.flatMap((session) => {
      const schedule = schedules.find((item) => item.id === session.scheduleId);
      return schedule ? [{ session, schedule }] : [];
    });

    if (list.length === 0) {
      return [
        {
          session: {
            id: 'mock-session-1',
            classId: 'class-mock-1',
            scheduleId: 'mock-sched-1',
            assistantId: 'asisten-1',
            status: 'OPEN',
            openedAt: new Date().toISOString(),
          },
          schedule: {
            id: 'mock-sched-1',
            classId: 'class-mock-1',
            className: 'Kelas A',
            sessionNumber: 1,
            topic: 'Pengembangan Platform Khusus',
            title: 'Pengembangan Platform Khusus',
            courseCode: 'PPK301',
            date: todayStr,
            startTime: '10.00',
            endTime: '12.00',
            room: 'Lab D',
          },
        },
      ];
    }
    return list;
  }, [sessions, schedules, todayStr]);

  // Set of dates that have sessions for calendar dots
  const datesWithSessions = useMemo(() => {
    const set = new Set<string>();
    scheduledSessions.forEach((item) => {
      if (item.schedule.date) {
        set.add(item.schedule.date);
      }
    });
    return set;
  }, [scheduledSessions]);

  // Filtered schedules: jika tidak ada praktikum di hari tertentu, jangan fallback ke hari lain!
  const filteredSessions = useMemo(() => {
    // 1. Jika tanggal tertentu dipilih
    if (selectedDateStr) {
      return scheduledSessions.filter((s) => s.schedule.date === selectedDateStr);
    }

    // 2. Filter 'today'
    if (activeFilter === 'today') {
      return scheduledSessions.filter((s) => s.schedule.date === todayStr);
    }

    // 3. Filter 'thisWeek'
    if (activeFilter === 'thisWeek') {
      const weekDateStrs = new Set(weekDays.map((w) => w.dateStr));
      return scheduledSessions.filter((s) => weekDateStrs.has(s.schedule.date));
    }

    // 4. 'all'
    return scheduledSessions;
  }, [scheduledSessions, selectedDateStr, activeFilter, todayStr, weekDays]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  const handlePrevWeek = () => {
    const prev = new Date(currentWeekRef);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekRef(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekRef);
    next.setDate(next.getDate() + 7);
    setCurrentWeekRef(next);
  };

  const handleDaySelect = (dateStr: string) => {
    if (selectedDateStr === dateStr) {
      // Jika diklik lagi, tetap aktif atau reset ke semua
      setSelectedDateStr(null);
      setActiveFilter('all');
    } else {
      setSelectedDateStr(dateStr);
      setActiveFilter(null);
    }
  };

  const handleFilterPress = (filter: FilterType) => {
    setActiveFilter(filter);
    if (filter === 'all') {
      setSelectedDateStr(null);
    } else if (filter === 'today') {
      setSelectedDateStr(todayStr);
    } else {
      setSelectedDateStr(null);
    }
  };

  const handleSessionPress = (sessionId: string) => {
    router.push(`/praktikan/${sessionId}` as Href);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* ================= BAGIAN ATAS TETAP (HEADER + KALENDER + FILTER) ================= */}
      <View style={styles.fixedTopSection}>
        {/* 1. Header Batik */}
        <View
          style={[
            styles.headerBackground,
            { paddingTop: Math.max(safeAreaInsets.top, s(20)) + s(14) },
          ]}
        >
          <Image
            source={require('@/assets/images/bg_batik.png')}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Jadwal Praktikum</Text>
          </View>
        </View>

        {/* 2. Calendar Strip Card */}
        <View style={styles.calendarCard}>
          {/* Month / Year Navigator */}
          <View style={styles.monthNavRow}>
            <TouchableOpacity
              onPress={handlePrevWeek}
              style={styles.navArrowBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={20} color={COLOR_MAROON} />
            </TouchableOpacity>

            <Text style={styles.monthNavTitle}>{monthYearLabel}</Text>

            <TouchableOpacity
              onPress={handleNextWeek}
              style={styles.navArrowBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-forward" size={20} color={COLOR_MAROON} />
            </TouchableOpacity>
          </View>

          {/* 7 Days Strip */}
          <View style={styles.daysStripRow}>
            {weekDays.map((item) => {
              // Blok maroon aktif jika tanggal ini dipilih, atau jika di awal tanggal hari ini langsung terpilih
              const isSelected = selectedDateStr === item.dateStr;
              const isToday = item.dateStr === todayStr;
              const hasDot = datesWithSessions.has(item.dateStr);

              return (
                <TouchableOpacity
                  key={item.dateStr}
                  style={[
                    styles.dayPill,
                    isSelected && styles.dayPillSelected,
                  ]}
                  onPress={() => handleDaySelect(item.dateStr)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.dayLabelText,
                      isSelected && styles.dayLabelTextSelected,
                    ]}
                  >
                    {item.dayLabel}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumberText,
                      isSelected && styles.dayNumberTextSelected,
                    ]}
                  >
                    {item.dateNumber}
                  </Text>

                  {/* Indicator Dot: putih jika terpilih, marun jika ada sesi, atau dot hari ini */}
                  <View
                    style={[
                      styles.indicatorDot,
                      isSelected
                        ? styles.indicatorDotWhite
                        : hasDot || isToday
                        ? styles.indicatorDotActive
                        : styles.indicatorDotHidden,
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. Filter Pills Row - Selalu Diam di Bawah Kalender */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              activeFilter === 'all' && styles.filterPillActive,
            ]}
            onPress={() => handleFilterPress('all')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterPillText,
                activeFilter === 'all' && styles.filterPillTextActive,
              ]}
            >
              Semua
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              (activeFilter === 'today' || (selectedDateStr === todayStr && !activeFilter)) &&
                styles.filterPillActive,
            ]}
            onPress={() => handleFilterPress('today')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterPillText,
                (activeFilter === 'today' || (selectedDateStr === todayStr && !activeFilter)) &&
                  styles.filterPillTextActive,
              ]}
            >
              Hari ini
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              activeFilter === 'thisWeek' && styles.filterPillActive,
            ]}
            onPress={() => handleFilterPress('thisWeek')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterPillText,
                activeFilter === 'thisWeek' && styles.filterPillTextActive,
              ]}
            >
              Minggu Ini
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= 4. LIST JADWAL PRAKTIKUM (SCROLLABLE) ================= */}
      <FlatList
        data={filteredSessions}
        keyExtractor={(item) => `sched-card-${item.session.id}`}
        contentContainerStyle={styles.listContentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loading}
            onRefresh={onRefresh}
            tintColor={COLOR_MAROON}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Tidak ada praktikum</Text>
            <Text style={styles.emptySubtitle}>
              {selectedDateStr
                ? `Tidak ada jadwal praktikum pada ${formatDateIndo(selectedDateStr)}.`
                : 'Tidak ada jadwal praktikum pada periode ini.'}
            </Text>
            {selectedDateStr && (
              <TouchableOpacity
                style={styles.emptyResetBtn}
                onPress={() => handleFilterPress('all')}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyResetText}>Lihat Semua Jadwal</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const formattedDate =
            formatDateIndo(item.schedule.date) || 'Rab, 12 Mar 2025';

          return (
            <TouchableOpacity
              style={styles.scheduleCard}
              onPress={() => handleSessionPress(item.session.id)}
              activeOpacity={0.75}
            >
              {/* Modern Lab Flask Avatar */}
              <View style={styles.flaskAvatar}>
                <Ionicons name="flask-outline" size={24} color={COLOR_BUTTON} />
              </View>

              {/* Info Column */}
              <View style={styles.cardInfoCol}>
                <Text style={styles.courseTitle} numberOfLines={1}>
                  {item.schedule.title}
                </Text>
                <Text style={styles.sessionSubtitle}>
                  Pertemuan {item.schedule.sessionNumber ?? 1}
                </Text>

                {/* Metadata with Icons */}
                <View style={styles.metaRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={13}
                    color={COLOR_TEXT_MUTED}
                  />
                  <Text style={styles.metaText}>{formattedDate}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons
                    name="time-outline"
                    size={13}
                    color={COLOR_TEXT_MUTED}
                  />
                  <Text style={styles.metaText}>
                    {item.schedule.startTime} – {item.schedule.endTime}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons
                    name="location-outline"
                    size={13}
                    color={COLOR_TEXT_MUTED}
                  />
                  <Text style={styles.metaText}>{item.schedule.room}</Text>
                </View>
              </View>

              {/* Right Chevron */}
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLOR_BG,
  },
  fixedTopSection: {
    backgroundColor: COLOR_BG,
    zIndex: 10,
  },

  /* ================= 1. HEADER BATIK ================= */
  headerBackground: {
    width: '100%',
    backgroundColor: '#64102A',
    paddingHorizontal: s(20),
    paddingBottom: s(22),
    position: 'relative',
    overflow: 'hidden',
  },
  headerTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: s(20),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  /* ================= 2. CALENDAR STRIP ================= */
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: s(16),
    marginHorizontal: s(16),
    marginTop: s(14),
    paddingVertical: s(14),
    paddingHorizontal: s(12),
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(6),
    marginBottom: s(14),
  },
  navArrowBtn: {
    padding: s(4),
  },
  monthNavTitle: {
    fontSize: s(16),
    fontWeight: '700',
    color: COLOR_MAROON,
    letterSpacing: 0.2,
    includeFontPadding: false,
  },
  daysStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: s(6),
    paddingHorizontal: s(6),
    borderRadius: s(12),
    minWidth: s(40),
  },
  dayPillSelected: {
    backgroundColor: COLOR_MAROON,
  },
  dayLabelText: {
    fontSize: s(12),
    fontWeight: '500',
    color: COLOR_TEXT_MUTED,
    marginBottom: s(4),
    includeFontPadding: false,
  },
  dayLabelTextSelected: {
    color: '#FFFFFF',
  },
  dayNumberText: {
    fontSize: s(14),
    fontWeight: '700',
    color: COLOR_TEXT_DARK,
    includeFontPadding: false,
  },
  dayNumberTextSelected: {
    color: '#FFFFFF',
  },
  indicatorDot: {
    width: s(4),
    height: s(4),
    borderRadius: s(2),
    marginTop: s(4),
  },
  indicatorDotWhite: {
    backgroundColor: '#FFFFFF',
  },
  indicatorDotActive: {
    backgroundColor: COLOR_MAROON,
  },
  indicatorDotHidden: {
    backgroundColor: 'transparent',
  },

  /* ================= 3. FILTER PILLS - SELALU DIAM DI BAWAH KALENDER ================= */
  filterPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(16),
    marginTop: s(12),
    marginBottom: s(6),
    gap: s(6),
  },
  filterPill: {
    flex: 1,
    paddingVertical: s(8),
    paddingHorizontal: s(4),
    borderRadius: s(20),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: COLOR_MAROON,
    borderColor: COLOR_MAROON,
  },
  filterPillText: {
    fontSize: s(11.5),
    fontWeight: '600',
    color: COLOR_TEXT_MUTED,
    includeFontPadding: false,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },

  /* ================= 4. SCHEDULE CARDS LIST ================= */
  listContentContainer: {
    paddingHorizontal: s(16),
    paddingTop: s(6),
    paddingBottom: s(36),
    gap: s(12),
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: s(16),
    padding: s(14),
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  flaskAvatar: {
    width: s(44),
    height: s(44),
    borderRadius: s(22),
    backgroundColor: '#FDE8EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: s(12),
  },
  cardInfoCol: {
    flex: 1,
    paddingRight: s(8),
  },
  courseTitle: {
    fontSize: s(14.5),
    fontWeight: '700',
    color: COLOR_TEXT_DARK,
    marginBottom: s(2),
    includeFontPadding: false,
  },
  sessionSubtitle: {
    fontSize: s(12),
    fontWeight: '500',
    color: COLOR_TEXT_MUTED,
    marginBottom: s(4),
    includeFontPadding: false,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: s(2),
    gap: s(6),
  },
  metaText: {
    fontSize: s(12),
    fontWeight: '400',
    color: COLOR_TEXT_MUTED,
    includeFontPadding: false,
  },

  /* ================= EMPTY STATE ================= */
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: s(16),
    padding: s(24),
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: s(12),
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyTitle: {
    fontSize: s(16),
    fontWeight: '700',
    color: COLOR_TEXT_DARK,
    marginTop: s(10),
    marginBottom: s(4),
  },
  emptySubtitle: {
    fontSize: s(12.5),
    color: COLOR_TEXT_MUTED,
    textAlign: 'center',
    lineHeight: s(18),
    marginBottom: s(14),
  },
  emptyResetBtn: {
    backgroundColor: '#FDE8EC',
    paddingVertical: s(8),
    paddingHorizontal: s(16),
    borderRadius: s(20),
  },
  emptyResetText: {
    fontSize: s(12.5),
    fontWeight: '600',
    color: COLOR_MAROON,
  },
});
