import { useEffect, useState } from 'react';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    setIsSupported(isNative);

    if (!isNative || !user) {
      console.log('Push notifications only available on native platforms with authenticated user');
      return;
    }

    initializePushNotifications();
  }, [user]);

  const initializePushNotifications = async () => {
    try {
      // Request permission to use push notifications
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.log('Push notification permission denied');
        return;
      }

      // Register with Apple / Google to receive push notifications
      await PushNotifications.register();

      // On successful registration, save the token
      await PushNotifications.addListener('registration', async (token: Token) => {
        console.log('Push registration success, token:', token.value);
        setPushToken(token.value);
        
        // Save token to database
        if (user) {
          await saveTokenToDatabase(token.value);
        }
      });

      // Handle registration errors
      await PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Error on registration:', error);
        toast.error('Failed to register for push notifications');
      });

      // Handle notification received while app is in foreground
      await PushNotifications.addListener(
        'pushNotificationReceived',
        (notification: PushNotificationSchema) => {
          console.log('Push notification received:', notification);
          
          // Show in-app notification
          toast(notification.title || 'New notification', {
            description: notification.body,
            action: notification.data?.url ? {
              label: 'View',
              onClick: () => {
                if (notification.data?.url) {
                  window.location.href = notification.data.url;
                }
              }
            } : undefined,
          });
          
          // Play notification sound
          playNotificationSound();
        }
      );

      // Handle notification tapped (app was in background or closed)
      await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (notification: ActionPerformed) => {
          console.log('Push notification action performed:', notification);
          
          // Navigate to relevant page if URL provided
          if (notification.notification.data?.url) {
            setTimeout(() => {
              window.location.href = notification.notification.data.url;
            }, 500);
          }
        }
      );

    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  };

  const saveTokenToDatabase = async (token: string) => {
    try {
      if (!user) return;

      const { error } = await supabase
        .from('push_tokens' as any)
        .upsert({
          user_id: user.id,
          token: token,
          platform: Capacitor.getPlatform(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,token',
        });

      if (error) {
        console.error('Error saving push token:', error);
      } else {
        console.log('Push token saved to database');
      }
    } catch (error) {
      console.error('Error in saveTokenToDatabase:', error);
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.play().catch(err => console.error('Error playing notification sound:', err));
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  const unregister = async () => {
    try {
      if (!isSupported) return;

      await PushNotifications.removeAllListeners();
      
      // Remove token from database
      if (user && pushToken) {
        await supabase
          .from('push_tokens' as any)
          .delete()
          .eq('user_id', user.id)
          .eq('token', pushToken);
      }

      console.log('Push notifications unregistered');
    } catch (error) {
      console.error('Error unregistering push notifications:', error);
    }
  };

  return {
    isSupported,
    pushToken,
    unregister,
  };
};
