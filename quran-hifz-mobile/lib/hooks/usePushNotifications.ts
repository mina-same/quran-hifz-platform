import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useRegisterPushToken } from '@/lib/queries/auth';
import { usePortalStore } from '@/lib/store/portalStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Requests notification permission and registers the device's Expo push token
 * with the backend once per authenticated session — the server sends pushes
 * for parent-notify events (attendance/evaluation) and direct messages. */
export function usePushNotifications() {
  const authUser = usePortalStore((s) => s.authUser);
  const registerToken = useRegisterPushToken();

  useEffect(() => {
    if (!authUser) return;

    let cancelled = false;

    async function register() {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      const { status: existing } = await Notifications.getPermissionsAsync();
      let status = existing;
      if (status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        status = req.status;
      }
      if (status !== 'granted') return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) return; // no EAS project configured yet — nothing to register against

      try {
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (!cancelled) registerToken.mutate(token);
      } catch {
        // best-effort — a device/simulator without push capability shouldn't block the app
      }
    }

    register();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);
}
