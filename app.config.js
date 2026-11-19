module.exports = ({ config }) => {
  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY;

  const plugins = config.plugins ? [...config.plugins] : [];

  // Pastikan react-native-maps plugin terdaftar dengan benar
  const existingMapsPluginIndex = plugins.findIndex((p) =>
    Array.isArray(p) ? p[0] === 'react-native-maps' : p === 'react-native-maps'
  );

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
