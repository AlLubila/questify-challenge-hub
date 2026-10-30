import { Capacitor } from '@capacitor/core';

export const APP_ID = 'com.albilubila.achallenge';
export const MOBILE_AUTH_CALLBACK = `${APP_ID}://auth/callback`;
export const PUBLIC_SITE_URL = 'https://achallenge.vercel.app';
export const isNativeApp = () => Capacitor.isNativePlatform();

export const authRedirectUrl = (path = '/') => isNativeApp()
  ? `${MOBILE_AUTH_CALLBACK}${path.includes('mode=reset') ? '?mode=reset' : ''}`
  : `${window.location.origin}${path}`;

export const publicShareUrl = (path: string) => new URL(path, PUBLIC_SITE_URL).href;

export const readNativeAuthCode = (value: string): string | null => {
  try {
    const url = new URL(value);
    if (url.protocol !== `${APP_ID}:` || url.hostname !== 'auth' || url.pathname !== '/callback') return null;
    return url.searchParams.get('code');
  } catch { return null; }
};
