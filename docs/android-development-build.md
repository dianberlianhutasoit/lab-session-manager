# Android development builds

The `development` and `preview` EAS profiles both produce internal APKs. The
development APK includes `expo-dev-client`; the preview APK is a standalone
build for testing the app without a development server.
Use Node.js 24.12.0 locally, matching the pinned EAS build profiles and the
minimum engine version required by the resolved Firebase packages.

## Provision project configuration

Never commit `.env`, `google-services.json`, or Firebase admin service account
files. `.easignore` excludes them and the generated `android/` directory from
the EAS archive. EAS uses a secret file environment variable for Firebase's
Android configuration.

An Expo project administrator should configure the following variables in the
Expo project settings for both the `development` and `preview` environments:

- `GOOGLE_SERVICES_JSON`: secret file variable containing the Firebase Android
  `google-services.json` file.
- `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_APP_ID`,
  `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`,
  `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`,
  `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, and
  `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`: Firebase app configuration values.
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`: Google Maps Android SDK key, restricted to
  this Android application and its signing certificate.

The `EXPO_PUBLIC_` values are bundled into the client app and are visible to
app users. Restrict the Maps key in Google Cloud and never use an admin or
server credential for these values.

For local development, each teammate should obtain the Firebase Android
configuration and app values through the team's approved secret sharing
channel, put `google-services.json` at the repository root, and create a local
`.env` using `.env.example` as the key list. These local files remain ignored
by Git and EAS. Do not paste their contents into issues, chat, or build logs.

## Build APKs

After pulling `dev`, installing dependencies, and provisioning the local files:

```sh
npm ci
npx expo start --dev-client
```

Build the installable development client APK with:

```sh
npx eas-cli@latest build --platform android --profile development
```

Build the standalone internal preview APK with:

```sh
npx eas-cli@latest build --platform android --profile preview
```

The preview APK does not connect to Metro. Use the development APK with the
development server for live iteration.
