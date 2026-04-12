import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';

/**
 * Check if we're running in Expo Go (push notifications are not supported)
 */
function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/**
 * Register for push notifications and return the Expo push token.
 * Returns null if running in Expo Go, not a physical device, or permission denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications are not supported in Expo Go since SDK 53
  if (isExpoGo()) {
    console.log('[iDonate:Notifications] Running in Expo Go — push notifications skipped');
    Alert.alert('Push Not Supported', 'Push notifications do not work in Expo Go. Please use your Development Build.');
    return null;
  }

  // Push only works on physical devices
  if (!Device.isDevice) {
    console.log('[iDonate:Notifications] Not a physical device, skipping push registration');
    Alert.alert('Device Required', 'Push notifications require a physical device.');
    return null;
  }

  try {
    // Configure foreground behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
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
      Alert.alert('Permission Denied', 'You need to allow notifications for this to work.');
      return null;
    }

    // Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('blood-requests', {
        name: 'Blood Requests',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF0000',
      });
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId || '8778c660-6c82-48ba-8e6a-fe609274d28f',
    });
    const token = tokenData.data;
    console.log('[iDonate:Notifications] Push token:', token);
    return token;
  } catch (error: any) {
    console.warn('[iDonate:Notifications] Push registration failed (expected in Expo Go):', error);
    Alert.alert('Push Registration Failed', `Error: ${error.message}`);
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
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data || {};
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
    Alert.alert('Push Token Error', `Failed to save to database: ${error.message}`);
  } else {
    console.log('[iDonate:Notifications] Push token saved');
    Alert.alert('Push Token Success', 'Your device is now registered for notifications!');
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

/**
 * DATABASE BACKED NOTIFICATIONS
 */

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

export const getNotifications = async (userId: string) => {
  return await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
};

export const getUnreadCount = async (userId: string) => {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  
  return { count: count || 0, error };
};

export const getUnreadCountSince = async (userId: string, since: string) => {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .gt('created_at', since);
  
  return { count: count || 0, error };
};

export const markAsRead = async (notificationId: string) => {
  return await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
};

export const markAllAsRead = async (userId: string) => {
  return await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
};

export const deleteNotification = async (notificationId: string) => {
  return await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);
};

export const clearAllNotifications = async (userId: string) => {
  return await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId);
};
