import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

/**
 * Remote push tokens are not supported in Expo Go (SDK 53+).
 * Importing `expo-notifications` at all triggers a fatal error there — skip entirely.
 */
function canUseExpoPush() {
  if (Platform.OS === 'web') return true; // Web push is supported
  if (Constants.appOwnership === 'expo') return false;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  return true;
}

export function usePushRegistration(userId) {
  const tokenRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (!userId || !canUseExpoPush()) return undefined;

    let cancelled = false;
    let responseListener = { remove: () => {} };

    (async () => {
      try {
        // Lazy-load expo-device to prevent top-level native crash (STB-6)
        let Device;
        try {
          Device = require('expo-device');
        } catch (e) {
          console.warn('[Push] expo-device not available in binary');
          return;
        }

        if (Platform.OS === 'web' && typeof window !== 'undefined' && !('Notification' in window)) {
          console.warn('[Push] Browser does not support notifications');
          return;
        }

        if (Platform.OS !== 'web' && !Device.isDevice) return;

        const Notifications = await import('expo-notifications');

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        // Deep Linking Listener
        responseListener = Notifications.addNotificationResponseReceivedListener(response => {
          const data = response.notification.request.content.data;
          if (data?.screen) {
            // Handle parameterized navigation (e.g., /orders/[id])
            if (data.params?.id) {
              router.push(`/${data.screen}/${data.params.id}`);
            } else {
              router.push(`/${data.screen}`);
            }
          }
        });

        const registerForPushNotificationsAsync = async () => {
          if (Platform.OS === 'web') {
            try {
              if (!('Notification' in window)) {
                console.warn('[Push] Browser does not support notifications.');
                return null;
              }

              if (Notification.permission === 'granted') {
                console.log('[Push] Native browser notifications enabled.');
                return null;
              }

              if (Notification.permission !== 'denied') {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                  console.log('[Push] Native browser notification permission granted!');
                }
              }
            } catch (err) {
              console.error('[Push] Error requesting browser notification permission:', err);
            }
            return null;
          }

          if (!Device.isDevice) {
            console.warn('[Push] Must use physical device for native Push Notifications');
            return null;
          }

          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }

          if (finalStatus !== 'granted') {
            console.warn('[Push] Failed to get push token for push notification!');
            return null;
          }

          const projectId =
            process.env.EXPO_PUBLIC_PROJECT_ID ||
            Constants.expoConfig?.extra?.eas?.projectId;

          if (!projectId) {
            console.warn('[Push] Project ID not found');
            return null;
          }

          try {
            const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
            return tokenData.data;
          } catch (e) {
            console.error('[Push] Error getting push token:', e);
            return null;
          }
        };

        const token = await registerForPushNotificationsAsync();
        if (!token || cancelled) return;

        if (tokenRef.current === token) return;
        tokenRef.current = token;

        console.log('[Push] Saving token:', token, 'for user:', userId);

        const { error: upsertError } = await supabase.from('push_tokens').upsert(
          {
            user_id: userId,
            expo_push_token: token,
            platform: Platform.OS,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,expo_push_token' }
        );

        if (upsertError) {
          console.error('[Push] Failed to save token to Supabase:', upsertError.message);
        } else {
          console.log('[Push] Token saved successfully!');
        }
      } catch (e) {
        if (__DEV__) console.warn('push registration error:', e);
      }
    })();

    return () => {
      cancelled = true;
      responseListener.remove();
    };
  }, [userId]);
}
