import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View, TouchableOpacity, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/contexts/AuthContext";
import { getReceivedDonations, confirmRecipientDonation, Donation } from "@/services/donationService";

export default function MyRequestsScreen() {
  const { user } = useAuth();
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const loadReceivedDonations = () => {
    if (user?.id) {
      setLoading(true);
      getReceivedDonations(user.id)
        .then(({ data }) => setDonations(data || []))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    loadReceivedDonations();
  }, [user?.id]);

  const handleConfirmReceipt = (donationId: string) => {
    Alert.alert(
      "Confirm Receipt",
      "Have you successfully received blood from this donor?",
      [
        { text: "Not yet", style: "cancel" },
        { 
          text: "Yes, received", 
          onPress: async () => {
            setConfirmingId(donationId);
            const { error } = await confirmRecipientDonation(donationId);
            setConfirmingId(null);
            if (error) {
              Alert.alert("Error", "Could not confirm. Please try again.");
            } else {
              loadReceivedDonations();
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return { bg: '#DBEAFE', text: '#2563EB' };
      case 'confirmed': return { bg: '#FEF3C7', text: '#D97706' };
      case 'completed': return { bg: '#DCFCE7', text: '#16A34A' };
      case 'cancelled': return { bg: '#FEE2E2', text: '#DC2626' };
      default: return { bg: '#F1F5F9', text: '#64748B' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: "Donations Received", headerTitleStyle: { fontWeight: 'bold' } }} />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#DC2626" />
          </View>
        ) : donations.length === 0 ? (
          <View style={styles.centerContainer}>
            <MaterialIcons name="bloodtype" size={64} color="#CBD5E1" />
            <ThemedText style={styles.emptyText}>No donations received yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              When people respond to your blood requests, they will appear here.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {donations.map((donation: any) => {
              const donor = donation.donor;
              const request = donation.blood_requests;
              const statusColors = getStatusColor(donation.status);
              const dateStr = new Date(donation.scheduled_date).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric'
              });

              return (
                <View key={donation.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.donorInfo}>
                      <View style={styles.avatar}>
                        {donor?.avatar_url ? (
                          <Image source={{ uri: donor.avatar_url }} style={styles.avatarImg} />
                        ) : (
                          <Ionicons name="person" size={24} color="#94A3B8" />
                        )}
                      </View>
                      <View>
                        <ThemedText style={styles.donorName}>{donor?.full_name || 'Anonymous Donor'}</ThemedText>
                        <ThemedText style={styles.requestInfo}>For: {request?.patient_name || 'My Request'}</ThemedText>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                      <ThemedText style={[styles.statusText, { color: statusColors.text }]}>
                        {donation.status.toUpperCase()}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={16} color="#64748B" />
                      <ThemedText style={styles.detailText}>Scheduled for {dateStr}</ThemedText>
                    </View>
                    {donor?.phone_number && (
                      <View style={styles.detailRow}>
                        <Ionicons name="call-outline" size={16} color="#64748B" />
                        <ThemedText style={styles.detailText}>{donor.phone_number}</ThemedText>
                      </View>
                    )}
                  </View>

                  {/* Confirmation Actions */}
                  {donation.status !== 'completed' && donation.status !== 'cancelled' && (
                    <View style={styles.actions}>
                      {!donation.recipient_confirmed ? (
                        <TouchableOpacity 
                          style={styles.confirmBtn} 
                          onPress={() => handleConfirmReceipt(donation.id)}
                          disabled={confirmingId === donation.id}
                        >
                          {confirmingId === donation.id ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                              <ThemedText style={styles.confirmBtnText}>I Received the Blood</ThemedText>
                            </>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.waitingBadge}>
                          <Ionicons name="time-outline" size={16} color="#D97706" />
                          <ThemedText style={styles.waitingText}>Waiting for Donor to Confirm</ThemedText>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: '80%',
  },
  listContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  donorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  donorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  requestInfo: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardBody: {
    gap: 8,
    marginBottom: 16,
    paddingLeft: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#475569',
  },
  actions: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 12,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  waitingText: {
    color: '#D97706',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
