import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

export default function NotificationsScreen() {
  const [selectedFilter, setSelectedFilter] = useState<string>('All');

  const filters = ['All', 'Urgent', 'Messages', 'Reminders'];

  const notifications = [
    {
      id: 1,
      type: 'urgent',
      title: 'Urgent Blood Request',
      message: 'A+ blood needed urgently at City Hospital',
      time: '2 minutes ago',
      isRead: false,
      icon: 'warning',
    },
    {
      id: 2,
      type: 'message',
      title: 'New Message',
      message: 'Dr. Sarah Johnson sent you a message',
      time: '15 minutes ago',
      isRead: false,
      icon: 'chat',
    },
    {
      id: 3,
      type: 'reminder',
      title: 'Donation Reminder',
      message: 'You can donate blood again in 3 days',
      time: '1 hour ago',
      isRead: true,
      icon: 'event',
    },
    {
      id: 4,
      type: 'urgent',
      title: 'Emergency Request',
      message: 'O- blood needed for emergency surgery',
      time: '2 hours ago',
      isRead: true,
      icon: 'warning',
    },
    {
      id: 5,
      type: 'message',
      title: 'Appointment Confirmed',
      message: 'Your donation appointment is confirmed for tomorrow',
      time: '3 hours ago',
      isRead: true,
      icon: 'check-circle',
    },
    {
      id: 6,
      type: 'reminder',
      title: 'Health Check Reminder',
      message: 'Don\'t forget your annual health checkup',
      time: '1 day ago',
      isRead: true,
      icon: 'local-hospital',
    },
  ];

  const filteredNotifications = selectedFilter === 'All' 
    ? notifications 
    : notifications.filter(notification => notification.type === selectedFilter.toLowerCase());

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <MaterialIcons name="notifications" size={24} color="#4A90E2" style={styles.bellIcon} />
            <ThemedText style={styles.logoText}>iDonate</ThemedText>
          </View>
          <ThemedText style={styles.headerSubtitle}>Notifications</ThemedText>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>{unreadCount}</ThemedText>
            </View>
          )}
        </View>

        {/* Filter Buttons */}
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
                  selectedFilter === filter && styles.selectedFilterButton
                ]}
                onPress={() => setSelectedFilter(filter)}
              >
                <ThemedText style={[
                  styles.filterText,
                  selectedFilter === filter && styles.selectedFilterText
                ]}>
                  {filter}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Notifications List */}
        <View style={styles.notificationsSection}>
          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="notifications-off" size={48} color="#7F8C8D" style={styles.emptyIcon} />
              <ThemedText style={styles.emptyTitle}>No notifications</ThemedText>
              <ThemedText style={styles.emptyDescription}>
                You're all caught up! New notifications will appear here.
              </ThemedText>
            </View>
          ) : (
            filteredNotifications.map((notification) => (
              <TouchableOpacity 
                key={notification.id} 
                style={[
                  styles.notificationCard,
                  !notification.isRead && styles.unreadCard
                ]}
              >
                <View style={styles.notificationContent}>
                  <View style={styles.notificationIcon}>
                    <MaterialIcons 
                      name={notification.icon as any}
                      size={20} 
                      color={notification.type === 'urgent' ? '#E74C3C' : '#4A90E2'} 
                      style={styles.iconText} 
                    />
                    {!notification.isRead && <View style={styles.unreadDot} />}
                  </View>
                  <View style={styles.notificationText}>
                    <ThemedText style={[
                      styles.notificationTitle,
                      !notification.isRead && styles.unreadTitle
                    ]}>
                      {notification.title}
                    </ThemedText>
                    <ThemedText style={styles.notificationMessage}>
                      {notification.message}
                    </ThemedText>
                    <ThemedText style={styles.notificationTime}>
                      {notification.time}
                    </ThemedText>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionButton}>
              <MaterialIcons name="done-all" size={16} color="#4A90E2" style={styles.quickActionIcon} />
              <ThemedText style={styles.quickActionText}>Mark all as read</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <MaterialIcons name="delete-sweep" size={16} color="#E74C3C" style={styles.quickActionIcon} />
              <ThemedText style={styles.quickActionText}>Clear all</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F4F4',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F4F4',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
    paddingTop: 24,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bellIcon: {
    marginRight: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Filters Section
  filtersSection: {
    marginBottom: 24,
  },
  filtersContainer: {
    paddingHorizontal: 4,
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedFilterButton: {
    backgroundColor: '#4A90E2',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  selectedFilterText: {
    color: '#FFFFFF',
  },

  // Notifications Section
  notificationsSection: {
    marginBottom: 24,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    position: 'relative',
    marginRight: 12,
  },
  iconText: {
    // Icon styling handled by MaterialIcons component
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E74C3C',
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#7F8C8D',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Quick Actions
  quickActionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    marginRight: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },

  // Bottom spacer
  bottomSpacer: {
    height: 20,
  },
});