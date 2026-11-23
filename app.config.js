try {
  // Memastikan environment variable dari .env / .env.local dimuat ke process.env
  require("@expo/env").load(process.cwd());
} catch {
  // Abaikan jika @expo/env sudah ditangani oleh Expo CLI
}

module.exports = ({ config }) => {
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON || config.android?.googleServicesFile;
  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY;

  const plugins = config.plugins ? [...config.plugins] : [];

  // Pastikan react-native-maps plugin terdaftar dengan benar
  const existingMapsPluginIndex = plugins.findIndex((p) =>
    Array.isArray(p) ? p[0] === "react-native-maps" : p === "react-native-maps",
  );

  const mapsPluginConfig = [
    "react-native-maps",
    googleMapsApiKey ? { androidGoogleMapsApiKey: googleMapsApiKey } : {},
  ];

  if (existingMapsPluginIndex >= 0) {
    plugins[existingMapsPluginIndex] = mapsPluginConfig;
  } else {
    plugins.push(mapsPluginConfig);
  }

  return {
    ...config,
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
      config: {
        ...config.android?.config,
        ...(googleMapsApiKey
          ? {
              googleMaps: {
                apiKey: googleMapsApiKey,
              },
            }
          : {}),
      },
    },
    plugins,
  };
};
