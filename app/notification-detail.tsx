import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/themed-text';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Notification } from '@/services/notificationService';

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotification();
  }, [id]);

  async function fetchNotification() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setNotification(data);

      // Mark as read
      if (data && !data.is_read) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', id);
      }
    } catch (error: any) {
      console.error('[iDonate:NotificationDetail] Error:', error);
      Alert.alert('Error', 'Could not load notification details.');
      router.back();
    } finally {
      setLoading(false);
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'urgent_request':
        return { name: 'warning', color: '#E74C3C' };
      case 'appointment_confirmed':
        return { name: 'check-circle', color: '#27AE60' };
      case 'system_broadcast':
      default:
        return { name: 'notifications', color: '#4A90E2' };
    }
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
    return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleGoToRequest = () => {
    if (notification?.data?.requestId) {
      router.push({
        pathname: '/blood-request/[id]',
        params: { id: notification.data.requestId }
      } as any);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  if (!notification) return null;
  const icon = getIcon(notification.type);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Notification', headerBackTitle: 'Back' }} />
      
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={[styles.iconCircle, { backgroundColor: icon.color + '20' }]}>
          <MaterialIcons name={icon.name as any} size={36} color={icon.color} />
        </View>
        <View style={styles.headerText}>
          <ThemedText style={styles.title}>{notification.title}</ThemedText>
          <ThemedText style={styles.time}>{getTimeAgo(notification.created_at)}</ThemedText>
        </View>
      </View>

      {/* Message Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="chatbox-outline" size={20} color="#64748B" />
          <Text style={styles.cardTitle}>Message</Text>
        </View>
        <Text style={styles.message}>{notification.message}</Text>
      </View>

      {/* Additional Info Card (for broadcasts) */}
      {notification.data?.audience && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="people-outline" size={20} color="#64748B" />
            <Text style={styles.cardTitle}>Audience</Text>
          </View>
          <Text style={styles.infoText}>
            This broadcast was sent to {notification.data.audience === 'all' ? 'all users' : notification.data.audience}.
          </Text>
        </View>
      )}

      {/* Action Button */}
      {notification.data?.requestId && (
        <TouchableOpacity style={styles.actionButton} onPress={handleGoToRequest}>
          <Ionicons name="eye-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>View Blood Request</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 4,
  },
  time: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  message: {
    fontSize: 16,
    color: '#1E293B',
    lineHeight: 24,
  },
  infoText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  actionButton: {
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
