import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { getUnreadCount, getUnreadCountSince, Notification } from '@/services/notificationService';
import { useAuth } from './AuthContext';

const LAST_SEEN_KEY = 'notification_last_seen';

interface NotificationContextType {
  /** Total unread count (all time) — used on the notifications screen */
  unreadCount: number;
  /** New notifications since the user last opened the home screen — used for the home badge */
  newCount: number;
  refreshUnreadCount: () => Promise<void>;
  /** Call this when the home screen is opened to reset the badge */
  resetBadgeCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [newCount, setNewCount] = useState(0);

  // Use a ref so refreshUnreadCount always reads the latest value
  // without needing to be recreated (which would churn the realtime subscription)
  const lastSeenRef = useRef<string | null>(null);
  const [lastSeenLoaded, setLastSeenLoaded] = useState(false);

  // Load the persisted last-seen timestamp on mount
  useEffect(() => {
    AsyncStorage.getItem(LAST_SEEN_KEY).then((value) => {
      if (value) lastSeenRef.current = value;
      setLastSeenLoaded(true);
    });
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!user?.id) return;

    // Total unread (for the notifications screen)
    const { count } = await getUnreadCount(user.id);
    setUnreadCount(count);

    // New since last seen (for the home badge)
    const since = lastSeenRef.current;
    if (since) {
      const { count: sinceCount } = await getUnreadCountSince(user.id, since);
      setNewCount(sinceCount);
    } else {
      // First time ever — show all unread
      setNewCount(count);
    }
  }, [user?.id]); // stable — only changes when user changes

  const resetBadgeCount = useCallback(async () => {
    const now = new Date().toISOString();
    lastSeenRef.current = now;
    setNewCount(0);
    await AsyncStorage.setItem(LAST_SEEN_KEY, now);
  }, []);

  useEffect(() => {
    if (!user?.id || !lastSeenLoaded) {
      setUnreadCount(0);
      setNewCount(0);
      return;
    }

    // Initial fetch
    refreshUnreadCount();

    // Subscribe to new notifications
    console.log(`[iDonate:Notifications] Subscribing to user-notifications-${user.id}`);
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[iDonate:Notifications] Realtime change received:', payload.eventType);
          refreshUnreadCount();
        }
      )
      .subscribe((status) => {
        console.log(`[iDonate:Notifications] Subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log('[iDonate:Notifications] Successfully connected to realtime notifications!');
        }
      });

    return () => {
      console.log('[iDonate:Notifications] Unsubscribing from notifications');
      supabase.removeChannel(channel);
    };
  }, [user?.id, lastSeenLoaded, refreshUnreadCount]);

  return (
    <NotificationContext.Provider value={{ unreadCount, newCount, refreshUnreadCount, resetBadgeCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
