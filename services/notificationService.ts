import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    return null;
  }

  // Push only works on physical devices
  if (!Device.isDevice) {
    console.log('[iDonate:Notifications] Not a physical device, skipping push registration');
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
    console.warn('[iDonate:Notifications] Push registration failed:', error);
    return null;
  }
}

export function getConversationIdFromPayload(data: Record<string, any> | null | undefined): string | null {
  if (!data) return null;
  return data.conversationId || data.conversation_id || null;
}

export async function getConversationChatParams(conversationId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      donations:appointment_id (scheduled_date),
      institutions:institution_id (institution_name)
    `)
    .eq('id', conversationId)
    .single();

  if (error || !data) {
    return {
      conversationId,
      institutionName: 'Donation Centre',
      appointmentDate: '',
    };
  }

  const donation = data.donations as { scheduled_date?: string } | null;
  const institution = data.institutions as { institution_name?: string } | null;

  return {
    conversationId,
    institutionName: institution?.institution_name || 'Donation Centre',
    appointmentDate: donation?.scheduled_date
      ? new Date(donation.scheduled_date).toLocaleDateString()
      : '',
  };
}

export async function openAppointmentChat(
  router: { push: (args: any) => void },
  conversationId: string,
  fallbackTitle?: string
) {
  const params = await getConversationChatParams(conversationId);
  router.push({
    pathname: '/chat',
    params: {
      ...params,
      institutionName:
        params.institutionName ||
        fallbackTitle?.replace(' sent a message', '') ||
        'Donation Centre',
    },
  } as any);
}

export async function navigateFromPushData(
  router: { push: (args: any) => void },
  data: Record<string, any>
): Promise<void> {
  const conversationId = getConversationIdFromPayload(data);
  if (conversationId) {
    await openAppointmentChat(router, conversationId);
    return;
  }

  if (data.requestId) {
    router.push({
      pathname: '/blood-request/[id]',
      params: { id: data.requestId },
    } as any);
    return;
  }

  if (data.notificationId) {
    const { data: notif } = await supabase
      .from('notifications')
      .select('id, type, title, data')
      .eq('id', data.notificationId)
      .maybeSingle();

    if (notif) {
      await navigateFromNotification(router, notif);
      return;
    }

    router.push({
      pathname: '/notification-detail',
      params: { id: data.notificationId },
    } as any);
  }
}

export async function navigateFromNotification(
  router: { push: (args: any) => void },
  notification: Pick<Notification, 'id' | 'type' | 'title' | 'data'>
): Promise<void> {
  const conversationId = getConversationIdFromPayload(notification.data);

  if (notification.type === 'appointment_message' && conversationId) {
    await openAppointmentChat(router, conversationId, notification.title);
    return;
  }

  if (notification.data?.requestId) {
    router.push({
      pathname: '/blood-request/[id]',
      params: { id: notification.data.requestId },
    } as any);
    return;
  }

  router.push({
    pathname: '/notification-detail',
    params: { id: notification.id },
  } as any);
}

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

/** Handle notification tap when app was opened from a killed state */
export async function handleInitialNotificationResponse(
  onTap: (data: Record<string, any>) => void
): Promise<void> {
  if (isExpoGo()) return;

  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response) {
      const data = response.notification.request.content.data || {};
      onTap(data);
    }
  } catch (error) {
    console.warn('[iDonate:Notifications] Initial response check failed', error);
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
  console.log('[iDonate:Notifications] Marking all as read for user:', userId);
  const result = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  console.log('[iDonate:Notifications] Mark all as read result:', result);
  return result;
};

export const deleteNotification = async (notificationId: string) => {
  console.log('[iDonate:Notifications] Deleting notification:', notificationId);
  const result = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);
  console.log('[iDonate:Notifications] Delete notification result:', result);
  return result;
};

export const clearAllNotifications = async (userId: string) => {
  console.log('[iDonate:Notifications] Clearing all notifications for user:', userId);
  const result = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId);
  console.log('[iDonate:Notifications] Clear all result:', result);
  return result;
};

/**
 * REMINDER SETTINGS & SCHEDULING
 */

const REMINDER_SETTINGS_KEY = 'reminder_settings';
const REMINDER_ID_PREFIX = 'idonate_reminder_';

export interface ReminderSettings {
  enabled: boolean;
  reminderDays: number[]; // e.g., [30, 7, 1] - days before eligibility to remind
  timeOfDay: string; // e.g., '09:00'
}

const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  reminderDays: [30, 7, 1],
  timeOfDay: '09:00',
};

export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const stored = await AsyncStorage.getItem(REMINDER_SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return DEFAULT_REMINDER_SETTINGS;
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings));
}

export async function scheduleDonationReminders(nextEligibleDate: Date): Promise<void> {
  if (isExpoGo()) return;
  
  // Cancel existing reminders first
  await cancelAllDonationReminders();

  const settings = await getReminderSettings();
  if (!settings.enabled) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eligibilityDate = new Date(nextEligibleDate);
  eligibilityDate.setHours(0, 0, 0, 0);

  // Parse time of day
  const [hours, minutes] = settings.timeOfDay.split(':').map(Number);

  for (const daysBefore of settings.reminderDays) {
    const reminderDate = new Date(eligibilityDate);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);
    reminderDate.setHours(hours, minutes, 0, 0);

    // Only schedule if reminder date is in the future
    if (reminderDate > today) {
      const reminderId = `${REMINDER_ID_PREFIX}${daysBefore}`;
      let message = '';
      
      if (daysBefore === 0) {
        message = 'You are eligible to donate today!';
      } else if (daysBefore === 1) {
        message = 'You will be eligible to donate tomorrow!';
      } else {
        message = `You will be eligible to donate in ${daysBefore} days!`;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'iDonate',
          body: message,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
        },
        identifier: reminderId,
      });
      console.log(`[iDonate:Reminders] Scheduled reminder for ${reminderDate.toISOString()} (${daysBefore} days before)`);
    }
  }
}

export async function cancelAllDonationReminders(): Promise<void> {
  if (isExpoGo()) return;
  
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const donationReminders = scheduled.filter(n => 
    n.identifier.startsWith(REMINDER_ID_PREFIX)
  );
  
  for (const reminder of donationReminders) {
    await Notifications.cancelScheduledNotificationAsync(reminder.identifier);
  }
  console.log(`[iDonate:Reminders] Cancelled ${donationReminders.length} donation reminders`);
}

export async function getScheduledReminders(): Promise<Notifications.NotificationRequest[]> {
  if (isExpoGo()) return [];
  
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.filter(n => n.identifier.startsWith(REMINDER_ID_PREFIX));
}
