import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getUnreadCount, Notification } from '@/services/notificationService';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = async () => {
    if (!user?.id) return;
    const { count } = await getUnreadCount(user.id);
    setUnreadCount(count);
  };

  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0);
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
  }, [user?.id]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount }}>
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
