import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState, useCallback } from "react";
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
  clearAllNotifications, 
  Notification 
} from "@/services/notificationService";

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { unreadCount, refreshUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("All");

  const filters = ["All", "Requests", "Reminders"];

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
    if (!notification.is_read) {
      await markAsRead(notification.id);
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
      refreshUnreadCount();
    }

    if (notification.data?.requestId) {
      router.push({
        pathname: '/blood-request/[id]',
        params: { id: notification.data.requestId }
      } as any);
    }
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
      case 'urgent_request': return { name: 'warning', color: '#E74C3C' };
      case 'appointment_confirmed': return { name: 'check-circle', color: '#27AE60' };
      default: return { name: 'notifications', color: '#4A90E2' };
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (selectedFilter === 'All') return true;
    if (selectedFilter === 'Requests') return n.type === 'urgent_request';
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
          <Ionicons name="close" size={24} color="#7F8C8D" />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#E74C3C"]} />
        }
      >
        <View style={styles.notificationsSection}>
          {loading ? (
            <ActivityIndicator size="large" color="#E74C3C" style={{ marginTop: 50 }} />
          ) : filteredNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="notifications-none" size={64} color="#CBD5E1" />
              <ThemedText style={styles.emptyTitle}>All caught up!</ThemedText>
              <ThemedText style={styles.emptyDescription}>
                New blood requests and updates will appear here.
              </ThemedText>
            </View>
          ) : (
            filteredNotifications.map((n) => {
              const icon = getIcon(n.type);
              return (
                <TouchableOpacity
                  key={n.id}
                  style={[
                    styles.notificationCard,
                    !n.is_read && styles.unreadCard,
                  ]}
                  onPress={() => handleNotificationPress(n)}
                >
                  <View style={styles.notificationContent}>
                    <View style={styles.iconContainer}>
                      <View style={[styles.iconCircle, { backgroundColor: icon.color + '15' }]}>
                        <MaterialIcons name={icon.name as any} size={22} color={icon.color} />
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
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {notifications.length > 0 && (
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionButton} onPress={handleMarkAllRead}>
              <MaterialIcons name="done-all" size={18} color="#4A90E2" />
              <ThemedText style={styles.quickActionText}>Mark all as read</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={handleClearAll}>
              <MaterialIcons name="delete-sweep" size={18} color="#E74C3C" />
              <ThemedText style={styles.quickActionText}>Clear history</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F4F4",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2C3E50",
  },
  countBadge: {
    backgroundColor: "#E74C3C",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  countBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  backBtn: {
    padding: 4,
  },
  filtersSection: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  filtersContainer: {
    paddingHorizontal: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F4F8",
    marginRight: 10,
  },
  selectedFilterButton: {
    backgroundColor: "#E74C3C",
  },
  filterText: {
    fontSize: 14,
    color: "#7F8C8D",
    fontWeight: "600",
  },
  selectedFilterText: {
    color: "#FFFFFF",
  },
  notificationsSection: {
    marginBottom: 20,
  },
  notificationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: "#F9FAFB",
    borderLeftWidth: 4,
    borderLeftColor: "#E74C3C",
  },
  notificationContent: {
    flexDirection: "row",
  },
  iconContainer: {
    position: "relative",
    marginRight: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E74C3C",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  notificationText: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2C3E50",
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    color: "#E74C3C",
  },
  notificationTime: {
    fontSize: 11,
    color: "#94A3B8",
  },
  notificationMessage: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2C3E50",
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickActionText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
});

