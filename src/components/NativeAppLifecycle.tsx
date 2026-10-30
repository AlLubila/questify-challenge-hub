import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isNativeApp, readNativeAuthCode } from '@/lib/mobile';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export const NativeAppLifecycle = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const seenCodes = useRef(new Set<string>());

  useEffect(() => {
    if (!isNativeApp()) return;
    document.documentElement.classList.add('native-app');
    let disposed = false;
    const listeners: PluginListenerHandle[] = [];
    const handleAuthUrl = async (value: string) => {
      const code = readNativeAuthCode(value);
      if (!code || seenCodes.current.has(code)) return;
      seenCodes.current.add(code);
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      await Browser.close().catch(() => undefined);
      if (disposed) return;
      if (error) {
        toast.error(t('mobile.authFailed'));
        navigate('/auth', { replace: true });
      } else {
        navigate(new URL(value).searchParams.get('mode') === 'reset' ? '/auth?mode=reset' : '/', { replace: true });
      }
    };
    const add = async (promise: Promise<PluginListenerHandle>) => {
      const handle = await promise;
      if (disposed) await handle.remove();
      else listeners.push(handle);
    };
    void add(App.addListener('appUrlOpen', ({ url }) => { void handleAuthUrl(url); }));
    if (Capacitor.getPlatform() === 'android') void add(App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) navigate(-1);
      else if (window.location.pathname !== '/') navigate('/', { replace: true });
      else void App.minimizeApp();
    }));
    void App.getLaunchUrl().then((launch) => { if (launch?.url && !disposed) void handleAuthUrl(launch.url); });
    return () => {
      disposed = true;
      for (const listener of listeners) void listener.remove();
      document.documentElement.classList.remove('native-app');
    };
  }, [navigate, t]);

  return null;
};
