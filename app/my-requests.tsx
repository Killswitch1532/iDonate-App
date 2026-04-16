import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View, TouchableOpacity, Alert, Image, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/contexts/AuthContext";
import { confirmRecipientDonation } from "@/services/donationService";
import { getUserRequestsWithDonors, updateRequestStatus } from "@/services/requestService";

export default function MyRequestsScreen() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadData = async () => {
    if (user?.id) {
      setLoading(true);
      const { data } = await getUserRequestsWithDonors(user.id);
      setRequests(data || []);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const { data } = await getUserRequestsWithDonors(user?.id || "");
    setRequests(data || []);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const handleConfirmDonation = async (donationId: string) => {
    Alert.alert(
      "Confirm Donation",
      "Have you successfully received blood from this donor?",
      [
        { text: "Not yet", style: "cancel" },
        { 
          text: "Yes, received", 
          onPress: async () => {
            setActionId(donationId);
            const { error } = await confirmRecipientDonation(donationId);
            setActionId(null);
            if (error) {
              Alert.alert("Error", "Could not confirm. Please try again.");
            } else {
              onRefresh();
            }
          }
        }
      ]
    );
  };

  const handleCompleteRequest = async (requestId: string) => {
    Alert.alert(
      "Complete Request",
      "Are you sure you want to mark this request as completed? This will stop further volunteers from seeing it.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Mark Completed", 
          onPress: async () => {
            setActionId(requestId);
            const { error } = await updateRequestStatus(requestId, 'completed');
            setActionId(null);
            if (error) {
              Alert.alert("Error", "Failed to update status.");
            } else {
              onRefresh();
            }
          }
        }
      ]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return { bg: '#DBEAFE', text: '#2563EB', label: 'OPEN' };
      case 'matched': return { bg: '#FEF3C7', text: '#D97706', label: 'MATCHED' };
      case 'in_progress': return { bg: '#FDE68A', text: '#B45309', label: 'IN PROGRESS' };
      case 'completed': return { bg: '#DCFCE7', text: '#16A34A', label: 'COMPLETED' };
      case 'cancelled': return { bg: '#F1F5F9', text: '#64748B', label: 'CANCELLED' };
      default: return { bg: '#F1F5F9', text: '#64748B', label: status.toUpperCase() };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: "My Requests", headerTitleStyle: { fontWeight: 'bold' } }} />
      
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#DC2626"]} />}
      >
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#DC2626" />
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.centerContainer}>
            <MaterialIcons name="bloodtype" size={64} color="#CBD5E1" />
            <ThemedText style={styles.emptyText}>No requests created yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              When you create a blood request, it will appear here so you can track responses.
            </ThemedText>
            <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/request-blood')}>
              <ThemedText style={styles.createBtnText}>Create Request</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {requests.map((request: any) => {
              const badge = getStatusBadge(request.status);
              const progress = request.max_donors > 0 ? (request.donors_confirmed_count / request.max_donors) : 0;
              const isFulfilling = request.donors_confirmed_count > 0 && request.status !== 'completed';

              return (
                <View key={request.id} style={styles.requestCard}>
                  {/* Request Header */}
                  <View style={styles.requestHeader}>
                    <View>
                      <ThemedText style={styles.bloodType}>{request.blood_type_needed}</ThemedText>
                      <ThemedText style={styles.patientName}>{request.patient_name || "Patient Name Not Specified"}</ThemedText>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <ThemedText style={[styles.statusText, { color: badge.text }]}>{badge.label}</ThemedText>
                    </View>
                  </View>

                  {/* Progress Section */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressLabelRow}>
                      <ThemedText style={styles.progressLabel}>Donation Progress</ThemedText>
                      <ThemedText style={styles.progressValue}>{request.donors_confirmed_count} / {request.max_donors} Confirmed</ThemedText>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
                    </View>
                  </View>

                  {/* Donors List */}
                  <View style={styles.donorsList}>
                    <ThemedText style={styles.sectionTitle}>Volunteers ({request.donations?.length || 0})</ThemedText>
                    {request.donations?.length === 0 ? (
                      <ThemedText style={styles.noneText}>No volunteers yet. We're spreading the word!</ThemedText>
                    ) : (
                      request.donations.map((donation: any) => (
                        <View key={donation.id} style={styles.donorRow}>
                          <View style={styles.donorAvatar}>
                            {donation.donor?.avatar_url ? (
                              <Image source={{ uri: donation.donor.avatar_url }} style={styles.avatarImg} />
                            ) : (
                              <Ionicons name="person" size={16} color="#94A3B8" />
                            )}
                          </View>
                          <View style={styles.donorInfo}>
                            <ThemedText style={styles.donorName}>{donation.donor?.full_name || "Anonymous Donor"}</ThemedText>
                            <View style={styles.donorStatusRow}>
                              {donation.status === 'completed' ? (
                                <View style={styles.inlineBadgeSuccess}>
                                  <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                                  <ThemedText style={styles.inlineBadgeTextSuccess}>Donation Complete</ThemedText>
                                </View>
                              ) : donation.recipient_confirmed ? (
                                <View style={styles.inlineBadgeWarning}>
                                  <Ionicons name="time" size={12} color="#D97706" />
                                  <ThemedText style={styles.inlineBadgeTextWarning}>Waiting for Donor</ThemedText>
                                </View>
                              ) : (
                                <View style={styles.inlineBadgeInfo}>
                                  <Ionicons name="calendar" size={12} color="#2563EB" />
                                  <ThemedText style={styles.inlineBadgeTextInfo}>{donation.status.toUpperCase()}</ThemedText>
                                </View>
                              )}
                            </View>
                          </View>
                          
                          {/* Item Actions */}
                          <View style={styles.donorActions}>
                            {donation.status !== 'completed' && donation.status !== 'cancelled' && !donation.recipient_confirmed && (
                              <TouchableOpacity 
                                style={styles.miniConfirmBtn} 
                                onPress={() => handleConfirmDonation(donation.id)}
                                disabled={actionId === donation.id}
                              >
                                {actionId === donation.id ? (
                                  <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                  <ThemedText style={styles.miniConfirmBtnText}>Confirm</ThemedText>
                                )}
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Request Actions */}
                  {request.status !== 'completed' && request.status !== 'cancelled' && (
                    <View style={styles.requestActions}>
                      <TouchableOpacity 
                        style={styles.completeBtn} 
                        onPress={() => handleCompleteRequest(request.id)}
                        disabled={actionId === request.id}
                      >
                        {actionId === request.id ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ThemedText style={styles.completeBtnText}>Mark Request as Fulfilled</ThemedText>}
                      </TouchableOpacity>
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
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, maxWidth: '80%', marginBottom: 24 },
  createBtn: { backgroundColor: '#DC2626', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  createBtnText: { color: '#FFFFFF', fontWeight: 'bold' },
  listContainer: { gap: 16 },
  requestCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  bloodType: { fontSize: 24, fontWeight: '900', color: '#DC2626' },
  patientName: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  progressSection: { marginBottom: 20 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  progressValue: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' },
  progressBarBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#16A34A', borderRadius: 4 },
  donorsList: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 12 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginBottom: 12 },
  noneText: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
  donorRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  donorAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginRight: 10, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  donorInfo: { flex: 1 },
  donorName: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  donorStatusRow: { flexDirection: 'row', marginTop: 2 },
  inlineBadgeSuccess: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inlineBadgeTextSuccess: { fontSize: 11, color: '#16A34A', fontWeight: '700' },
  inlineBadgeWarning: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inlineBadgeTextWarning: { fontSize: 11, color: '#D97706', fontWeight: '700' },
  inlineBadgeInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inlineBadgeTextInfo: { fontSize: 11, color: '#2563EB', fontWeight: '700' },
  donorActions: { marginLeft: 8 },
  miniConfirmBtn: { backgroundColor: '#16A34A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  miniConfirmBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  requestActions: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 },
  completeBtn: { backgroundColor: '#0F172A', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  completeBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});


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
