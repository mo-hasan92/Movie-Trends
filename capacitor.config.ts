import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'modern-app',
  webDir: 'www' ,
    server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    includePlugins: [
      '@capacitor/geolocation'
    ]
  },
  plugins: {
    Geolocation: {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }
  }
};

export default config;
