import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and return the Expo push token.
 * Returns null if permission denied or not a physical device.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push only works on physical devices
  if (!Device.isDevice) {
    console.log('[iDonate:Notifications] Not a physical device, skipping push registration');
    return null;
  }

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
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // Uses the projectId from app.json automatically
    });
    const token = tokenData.data;
    console.log('[iDonate:Notifications] Push token:', token);
    return token;
  } catch (error) {
    console.error('[iDonate:Notifications] Failed to get push token:', error);
    return null;
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
