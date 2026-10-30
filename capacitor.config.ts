import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.albilubila.achallenge',
  appName: 'A Challenge',
  webDir: 'dist',
  // Ship the reviewed bundle inside the app. Production never loads a remote
  // development server and does not allow unencrypted HTTP.
  backgroundColor: '#0b2852',
  server: { androidScheme: 'https', cleartext: false },
  ios: { contentInset: 'never' },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
