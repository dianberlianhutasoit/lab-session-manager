import { Stack } from "expo-router";
import { createContext, useContext, useState } from "react";

// Tipe data untuk menyimpan riwayat { 'id-sesi': 'waktu-hadir' }
type AttendanceRecord = Record<string, string>;

interface AttendanceContextType {
  attendedSessions: AttendanceRecord;
  addAttendance: (sessionId: string, time: string) => void;
}

// Inisialisasi Context
const AttendanceContext = createContext<AttendanceContextType | undefined>(
  undefined,
);

// Custom hook agar lebih mudah dipakai di file lain
export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error(
      "useAttendance harus digunakan di dalam AttendanceProvider",
    );
  }
  return context;
};

export default function PraktikanLayout() {
  const [attendedSessions, setAttendedSessions] = useState<AttendanceRecord>(
    {},
  );

  // Fungsi untuk mencatat presensi, menolak jika sesi sudah ada
  const addAttendance = (sessionId: string, time: string) => {
    setAttendedSessions((prev) => {
      if (prev[sessionId]) {
        return prev; // Mencegah presensi ganda
      }
      return { ...prev, [sessionId]: time };
    });
  };

  return (
    <AttendanceContext.Provider value={{ attendedSessions, addAttendance }}>
      {/* Stack bawaan Expo Router untuk navigasi */}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#1E1E2A" },
          headerTintColor: "#F8F8F2",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Jadwal Praktikum" }} />
        {/* Detail akan mengambil title dinamis di dalam file [id].tsx */}
      </Stack>
    </AttendanceContext.Provider>
  );
}
