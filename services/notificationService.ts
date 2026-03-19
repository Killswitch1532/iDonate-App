import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

/**
 * Check if we're running in Expo Go (push notifications are not supported)
 */
function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/**
 * Register for push notifications and return the Expo push token.
 * Returns null if running in Expo Go, not a physical device, or permission denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications are not supported in Expo Go since SDK 53
  if (isExpoGo()) {
    console.log('[iDonate:Notifications] Running in Expo Go — push notifications skipped');
    return null;
  }

  // Push only works on physical devices
  if (!Device.isDevice) {
    console.log('[iDonate:Notifications] Not a physical device, skipping push registration');
    return null;
  }

  try {
    // Lazy import to avoid crash in Expo Go
    const Notifications = await import('expo-notifications');

    // Configure foreground behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Check / request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[iDonate:Notifications] Permission not granted');
      return null;
    }

    // Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('blood-requests', {
        name: 'Blood Requests',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF0000',
        sound: 'default',
      });
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // Uses the projectId from app.json automatically
    });
    const token = tokenData.data;
    console.log('[iDonate:Notifications] Push token:', token);
    return token;
  } catch (error) {
    console.warn('[iDonate:Notifications] Push registration failed (expected in Expo Go):', error);
    return null;
  }
}

/**
 * Set up notification tap listener. Returns a cleanup function.
 * Safe to call in Expo Go (no-ops gracefully).
 */
export async function setupNotificationListeners(
  onTap: (data: Record<string, any>) => void
): Promise<() => void> {
  if (isExpoGo()) return () => {};

  try {
    const Notifications = await import('expo-notifications');
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('[iDonate:Notifications] Tapped notification', data);
      onTap(data);
    });
    return () => subscription.remove();
  } catch {
    return () => {};
  }
}

/**
 * Save the push token to the user's profile in Supabase.
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
  console.log('[iDonate:Notifications] Saving push token for user', userId);

  const { error } = await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);

  if (error) {
    console.error('[iDonate:Notifications] Failed to save push token:', error.message);
  } else {
    console.log('[iDonate:Notifications] Push token saved');
  }
}

/**
 * Clear the push token when user logs out.
 */
export async function clearPushToken(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ push_token: null })
    .eq('id', userId);

  if (error) {
    console.error('[iDonate:Notifications] Failed to clear push token:', error.message);
  }
}
