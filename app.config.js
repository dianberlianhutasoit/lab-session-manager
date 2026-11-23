try {
  // Memastikan environment variable dari .env / .env.local dimuat ke process.env
  require('@expo/env').load(process.cwd());
} catch {
  // Abaikan jika @expo/env sudah ditangani oleh Expo CLI
}

module.exports = ({ config }) => {
  // Cari plugin react-native-maps yang ada di app.json
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

  // Prioritas pengambilan API Key:
  // 1. Environment variable (EXPO_PUBLIC_GOOGLE_MAPS_API_KEY)
  // 2. Environment variable (GOOGLE_MAPS_API_KEY)
  // 3. Plugin props di app.json
  // 4. android.config.googleMaps.apiKey di app.json
  // 5. Fallback hardcoded API Key yang sudah dibuat oleh user
  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    existingPluginKey ||
    config.android?.config?.googleMaps?.apiKey ||
    'AIzaSyD0SFGH8uXCvrc4Q8uguyIOIFY5Rp5oUfY';

  const mapsPluginConfig = [
    'react-native-maps',
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
