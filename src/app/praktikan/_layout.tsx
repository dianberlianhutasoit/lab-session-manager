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
      <Stack.Screen name="index" options={{ title: "Jadwal Praktikum" }} />
      <Stack.Screen name="[id]" options={{ title: "Detail Praktikum" }} />
      <Stack.Screen name="riwayat" options={{ title: "Riwayat Kehadiran" }} />
    </Stack>
  );
}
