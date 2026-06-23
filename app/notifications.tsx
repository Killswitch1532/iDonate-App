import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  View, 
  ActivityIndicator, 
  RefreshControl, 
  Alert 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification,
  clearAllNotifications,
  navigateFromNotification,
  Notification,
} from "@/services/notificationService";
import { useTheme } from '@/hooks/useTheme';

export default function NotificationsScreen() {
  const { colors, isDark } = useTheme();
  const styles = useStyles(colors, isDark);
  const { user } = useAuth();
  const { unreadCount, refreshUnreadCount, resetBadgeCount } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("All");

  // Reset the badge counter when leaving the notifications screen
  useEffect(() => {
    return () => {
      resetBadgeCount();
    };
  }, [resetBadgeCount]);

  const filters = ["All", "Messages", "Requests", "Broadcasts", "Reminders"];

  const loadNotifications = useCallback(async (showLoading = true) => {
    if (!user?.id) return;
    if (showLoading) setLoading(true);
    
    try {
      const { data, error } = await getNotifications(user.id);
      if (error) throw error;
      setNotifications(data || []);
      refreshUnreadCount();
    } catch (error) {
      console.error('[iDonate:Notifications] Load error', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, refreshUnreadCount]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read first if unread
    if (!notification.is_read) {
      const { error } = await markAsRead(notification.id);
      if (!error) {
        setNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, is_read: true } : n
        ));
        refreshUnreadCount();
      }
    }

    await navigateFromNotification(router, notification);
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    const { error } = await markAllAsRead(user.id);
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      refreshUnreadCount();
    }
  };

  const handleClearAll = async () => {
    Alert.alert(
      "Clear Notifications",
      "Are you sure you want to delete all notification history?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear All", 
          style: "destructive",
          onPress: async () => {
            if (!user?.id) return;
            const { error } = await clearAllNotifications(user.id);
            if (!error) {
              setNotifications([]);
              refreshUnreadCount();
            }
          }
        }
      ]
    );
  };

  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return 'Yesterday';
    return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'urgent_request': return { name: 'warning', color: colors.primary };
      case 'appointment_confirmed': return { name: 'check-circle', color: colors.success };
      case 'appointment_message': return { name: 'chatbubble-ellipses', color: colors.primary };
      case 'system_broadcast': return { name: 'campaign', color: colors.accent };
      default: return { name: 'notifications', color: colors.accent };
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (selectedFilter === 'All') return true;
    if (selectedFilter === 'Messages') return n.type === 'appointment_message';
    if (selectedFilter === 'Requests') return n.type === 'urgent_request';
    if (selectedFilter === 'Broadcasts') return n.type === 'system_broadcast';
    if (selectedFilter === 'Reminders') return n.type === 'reminder';
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <ThemedText style={styles.headerTitle}>Notifications</ThemedText>
          {unreadCount > 0 && (
            <View style={styles.countBadge}>
              <ThemedText style={styles.countBadgeText}>{unreadCount}</ThemedText>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={colors.icon} />
        </TouchableOpacity>
      </View>

      <View style={styles.filtersSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                selectedFilter === filter && styles.selectedFilterButton,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <ThemedText
                style={[
                  styles.filterText,
                  selectedFilter === filter && styles.selectedFilterText,
                ]}
              >
                {filter}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <View style={styles.notificationsSection}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
          ) : filteredNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <MaterialIcons name="notifications-none" size={72} color={colors.primary} />
              </View>
              <ThemedText style={styles.emptyTitle}>All caught up!</ThemedText>
              <ThemedText style={styles.emptyDescription}>
                New blood requests and updates will appear here.
              </ThemedText>
            </View>
          ) : (
            filteredNotifications.map((n) => {
              const icon = getIcon(n.type);
              const handleDelete = async () => {
                setNotifications(prev => prev.filter(x => x.id !== n.id));
                await deleteNotification(n.id);
                refreshUnreadCount();
              };
              
              return (
                <View
                  key={n.id}
                  style={[
                    styles.notificationCard,
                    !n.is_read && styles.unreadCard,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.notificationContent}
                    onPress={() => handleNotificationPress(n)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconContainer}>
                      <View style={[styles.iconCircle, { backgroundColor: icon.color + '20' }]}>
                        <MaterialIcons name={icon.name as any} size={26} color={icon.color} />
                      </View>
                      {!n.is_read && <View style={styles.unreadDot} />}
                    </View>
                    <View style={styles.notificationText}>
                      <View style={styles.cardHeaderRow}>
                        <ThemedText style={[styles.notificationTitle, !n.is_read && styles.unreadTitle]}>
                          {n.title}
                        </ThemedText>
                        <ThemedText style={styles.notificationTime}>
                          {getTimeAgo(n.created_at)}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.notificationMessage} numberOfLines={2}>
                        {n.message}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={handleDelete}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MaterialIcons name="delete-outline" size={22} color={colors.icon} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {notifications.length > 0 && (
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionButton} onPress={handleMarkAllRead}>
              <View style={[styles.quickActionIconContainer, { backgroundColor: isDark ? 'rgba(49, 130, 206, 0.1)' : '#EBF8FF' }]}>
                <MaterialIcons name="done-all" size={20} color={isDark ? '#63B3ED' : '#3182CE'} />
              </View>
              <ThemedText style={styles.quickActionText}>Mark all as read</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={handleClearAll}>
              <View style={[styles.quickActionIconContainer, { backgroundColor: isDark ? 'rgba(231, 76, 60, 0.1)' : '#FFF5F5' }]}>
                <MaterialIcons name="delete-sweep" size={20} color={colors.primary} />
              </View>
              <ThemedText style={styles.quickActionText}>Clear all notifications</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = (colors: any, isDark: boolean) => useMemo(() => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  countBadgeText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "800",
  },
  backBtn: {
    padding: 8,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : "#F8F9FA",
    borderRadius: 12,
  },
  filtersSection: {
    backgroundColor: colors.card,
    paddingVertical: 16,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filtersContainer: {
    paddingHorizontal: 24,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : "#F0F2F5",
    marginRight: 12,
  },
  selectedFilterButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: isDark ? 0.3 : 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  filterText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: "700",
  },
  selectedFilterText: {
    color: colors.surface,
  },
  notificationsSection: {
    marginBottom: 24,
  },
  notificationCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  unreadCard: {
    backgroundColor: isDark ? 'rgba(231, 76, 60, 0.1)' : "#FFF5F5",
    borderColor: isDark ? 'rgba(231, 76, 60, 0.3)' : "#FECACA",
  },
  notificationContent: {
    flexDirection: "row",
    flex: 1,
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 8,
  },
  iconContainer: {
    position: "relative",
    marginRight: 16,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.card,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 2,
  },
  notificationText: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  unreadTitle: {
    color: colors.primary,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  notificationMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: isDark ? 'rgba(231, 76, 60, 0.1)' : "#FFF5F5",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 24,
  },
  emptyDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 48,
    lineHeight: 22,
  },
  quickActions: {
    flexDirection: "column",
    gap: 12,
    marginTop: 12,
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: colors.card,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  quickActionText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
}), [colors, isDark]);

