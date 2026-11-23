try {
  // Memastikan environment variable dari .env / .env.local dimuat ke process.env
  require('@expo/env').load(process.cwd());
} catch {
  // Abaikan jika @expo/env sudah ditangani oleh Expo CLI
}

module.exports = ({ config }) => {
  // 1. Dukungan Firebase Google Services untuk Android Build (EAS)
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON || config.android?.googleServicesFile;

  // 2. Pencarian Plugin react-native-maps
  const plugins = config.plugins ? [...config.plugins] : [];
  const existingMapsPluginIndex = plugins.findIndex((p) =>
    Array.isArray(p) ? p[0] === 'react-native-maps' : p === 'react-native-maps'
  );
  const existingPlugin =
    existingMapsPluginIndex >= 0 ? plugins[existingMapsPluginIndex] : null;

  const existingPluginKey =
    Array.isArray(existingPlugin) && existingPlugin[1]
      ? existingPlugin[1].androidGoogleMapsApiKey ||
        existingPlugin[1].androidApiKey
      : undefined;

  // 3. Resolusi Google Maps API Key Bertingkat:
  // - Prioritas 1: Environment variable .env (EXPO_PUBLIC_GOOGLE_MAPS_API_KEY)
  // - Prioritas 2: Environment variable sistem (GOOGLE_MAPS_API_KEY)
  // - Prioritas 3: Plugin props di app.json
  // - Prioritas 4: android.config.googleMaps.apiKey di app.json
  // - Fallback Aman: 'NOT_CONFIGURED' (Bukan key asli, mencegah RuntimeException fatal crash di AndroidManifest saat build/startup tanpa .env)
  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    existingPluginKey ||
    config.android?.config?.googleMaps?.apiKey ||
    'NOT_CONFIGURED';

  const mapsPluginConfig = [
    'react-native-maps',
    { androidGoogleMapsApiKey: googleMapsApiKey },
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
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
    plugins,
  };
};
