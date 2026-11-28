import { Stack } from "expo-router";

export default function PraktikanLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#1E1E2A" },
        headerTintColor: "#F8F8F2",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Beranda Praktikan", headerShown: false }} />
      <Stack.Screen name="jadwal" options={{ title: "Jadwal Praktikum", headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: "Detail Praktikum", headerShown: false }} />
      <Stack.Screen name="riwayat" options={{ title: "Riwayat Kehadiran" }} />
    </Stack>
  );
}
