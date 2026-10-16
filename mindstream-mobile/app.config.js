export default {
  expo: {
    name: 'MindStream',
    slug: 'mindstream-mobile',
    scheme: 'mindstream',
    version: '1.0.0',
    plugins: ['expo-web-browser'],
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0a0a0a',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.mindstream.app',
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#0a0a0a',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      package: 'com.mindstream.app',
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || '',
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  },
};
