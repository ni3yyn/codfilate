import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { supabase } from '../lib/supabase';

/**
 * Remote push tokens are not supported in Expo Go (SDK 53+).
 * Importing `expo-notifications` at all triggers a fatal error there — skip entirely.
 */
function canUseExpoPush() {
  if (Platform.OS === 'web') return false;
  if (Constants.appOwnership === 'expo') return false;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  return true;
}

export function usePushRegistration(userId) {
  const tokenRef = useRef(null);

  useEffect(() => {
    if (!userId || !Device.isDevice || !canUseExpoPush()) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const Notifications = await import('expo-notifications');

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted' || cancelled) return;

        const projectId =
          process.env.EXPO_PUBLIC_PROJECT_ID ||
          Constants.expoConfig?.extra?.eas?.projectId;

        const tokenData = projectId
          ? await Notifications.getExpoPushTokenAsync({ projectId })
          : await Notifications.getExpoPushTokenAsync();

        const token = tokenData?.data;
        if (!token || cancelled) return;

        if (tokenRef.current === token) return;
        tokenRef.current = token;

        await supabase.from('push_tokens').upsert(
          {
            user_id: userId,
            expo_push_token: token,
            platform: Platform.OS,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,expo_push_token' }
        );
      } catch (e) {
        if (__DEV__) console.warn('push registration', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);
}
