const APP_ENV = process.env.APP_ENV || 'production';

const IS_DEV = APP_ENV === 'development';
const IS_PREVIEW = APP_ENV === 'preview';

let name = 'iDonate';
let bundleIdentifier = 'com.henry33y.iDonate';
let androidPackage = 'com.henry33y.idonate';
let scheme = 'idonateapp';

if (IS_DEV) {
  name = 'iDonate (Dev)';
  bundleIdentifier = 'com.henry33y.iDonate.dev';
  androidPackage = 'com.henry33y.idonate.dev';
  scheme = 'idonateapp-dev';
} else if (IS_PREVIEW) {
  name = 'iDonate (Preview)';
  bundleIdentifier = 'com.henry33y.iDonate.preview';
  androidPackage = 'com.henry33y.idonate.preview';
  scheme = 'idonateapp-preview';
}

module.exports = {
  expo: {
    name: name,
    slug: 'iDonate-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: scheme,
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: bundleIdentifier,
    },
    android: {
      config: {
        googleMaps: {
          apiKey: 'AIzaSyAaangDOqoYGZ9YlZ-7IE0TO3vGFAWddZw',
        },
      },
      adaptiveIcon: {
        backgroundColor: '#FFFFFF',
        foregroundImage: './assets/images/android-icon-foreground.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      softwareKeyboardLayoutMode: 'resize',
      predictiveBackGestureEnabled: false,
      package: androidPackage,
      googleServicesFile: './google-services.json',
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#F8F4F4',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#DC2626',
        },
      ],
      '@react-native-google-signin/google-signin',
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: '8778c660-6c82-48ba-8e6a-fe609274d28f',
      },
    },
  },
};
