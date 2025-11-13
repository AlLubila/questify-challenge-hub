import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.d985fe2fad17429990932e6efeb7e6b6',
  appName: 'Questify',
  webDir: 'dist',
  server: {
    url: 'https://d985fe2f-ad17-4299-9093-2e6efeb7e6b6.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Camera: {
      ios: {
        photoLibraryAccess: 'all'
      },
      android: {
        permissions: ['camera', 'photos']
      }
    }
  }
};

export default config;
