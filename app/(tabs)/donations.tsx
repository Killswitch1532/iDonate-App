import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/contexts/AuthContext";
import { getDonorDonations, cancelDonation, confirmDonorDonation, Donation } from "@/services/donationService";
import { getDonorProfile, getCooldownStatus } from "@/services/donorService";

export default function DonationsScreen() {
  const { user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cooldownStatus, setCooldownStatus] = useState<{ isEligible: boolean; nextEligibleDate: Date | null; daysRemaining: number }>({ isEligible: true, nextEligibleDate: null, daysRemaining: 0 });

  const loadDonations = () => {
    if (user?.id) {
      setLoading(true);
      getDonorProfile(user.id).then(({ data: donorProfile }) => {
        if (donorProfile) setCooldownStatus(getCooldownStatus(donorProfile));
      });
      getDonorDonations(user.id)
        .then(({ data }) => setDonations(data || []))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonations();
  }, [user?.id]);

  const filteredDonations = donations.filter(d => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return ['scheduled', 'confirmed'].includes(d.status);
    return d.status === activeFilter;
  });
  const handleCancel = (donationId: string) => {
    Alert.alert(
      "Cancel Appointment",
      "Are you sure you want to cancel this donation appointment?",
      [
        { text: "No, keep it", style: "cancel" },
        { 
          text: "Yes, cancel", 
          style: "destructive",
          onPress: async () => {
            setCancelingId(donationId);
            const { error } = await cancelDonation(donationId);
            setCancelingId(null);
            if (error) {
              Alert.alert("Cancellation Failed", "Could not cancel your appointment. Please try again.");
            } else {
              loadDonations(); // Refresh list to show updated status
            }
          }
        }
      ]
    );
  };

  const handleConfirmDonation = (donationId: string) => {
    Alert.alert(
      "Confirm Donation",
      "By clicking 'Yes', you confirm that you have successfully donated blood for this request.",
      [
        { text: "Not yet", style: "cancel" },
        { 
          text: "Yes, I donated", 
          onPress: async () => {
            setConfirmingId(donationId);
            const { error } = await confirmDonorDonation(donationId);
            setConfirmingId(null);
            if (error) {
              Alert.alert("Error", "Could not confirm your donation. Please try again.");
            } else {
              loadDonations(); // Refresh list to show updated status
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return { bg: '#DBEAFE', text: '#2563EB', icon: 'calendar-outline' };
      case 'confirmed': return { bg: '#FEF3C7', text: '#D97706', icon: 'checkmark-circle-outline' };
      case 'completed': return { bg: '#DCFCE7', text: '#16A34A', icon: 'ribbon-outline' };
      case 'cancelled': return { bg: '#FEE2E2', text: '#DC2626', icon: 'close-circle-outline' };
      case 'no_show': return { bg: '#F1F5F9', text: '#64748B', icon: 'help-circle-outline' };
      default: return { bg: '#F1F5F9', text: '#64748B', icon: 'ellipse-outline' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>My Donations</ThemedText>
        <TouchableOpacity onPress={loadDonations} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
          {['all', 'pending', 'completed', 'cancelled'].map(filter => (
            <TouchableOpacity 
              key={filter} 
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.filterTab, 
                activeFilter === filter && styles.activeFilterTab
              ]}
            >
              <ThemedText style={[
                styles.filterTabText, 
                activeFilter === filter && styles.activeFilterTabText
              ]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#DC2626" />
          </View>
        ) : filteredDonations.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="shield-checkmark-outline" size={64} color="#CBD5E1" />
            <ThemedText style={styles.emptyText}>No donations found</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              {activeFilter === 'all' 
                ? "You haven't booked any donations yet." 
                : `You have no ${activeFilter} donations.`}
            </ThemedText>
            {activeFilter === 'all' && (
              <TouchableOpacity style={styles.donateButton} onPress={() => router.push('/donate-blood')}>
                <ThemedText style={styles.donateButtonText}>Find a Request</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredDonations.map((donation: any) => {
              const statusColors = getStatusColor(donation.status);
              
              let institutionName = donation.institutions?.institution_name;
              if (!institutionName && donation.blood_requests) {
                const req = donation.blood_requests;
                const name = req.profiles?.full_name || 'Individual';
                const locationMatch = req.description?.match(/Location:\s*(.+)$/m);
                const location = locationMatch ? locationMatch[1].trim() : 'Custom Location';
                institutionName = `${name} (${location})`;
              }
              institutionName = institutionName || 'Medical Center';
              
              const dateNeeded = donation.blood_requests?.date_needed;
              const timeNeeded = donation.blood_requests?.time_needed;
              const requestedType = donation.blood_requests?.blood_type_needed;
              
              const dateStr = new Date(donation.scheduled_date).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric'
              });
              const timeStr = new Date(donation.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              return (
                <View key={donation.id} style={styles.historyCard}>
                  {/* Status & Date */}
                  <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                      <Ionicons name={statusColors.icon as any} size={14} color={statusColors.text} />
                      <ThemedText style={[styles.statusText, { color: statusColors.text }]}>
                        {donation.status.toUpperCase()}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.dateText}>{dateStr}</ThemedText>
                  </View>

                  {/* Center Name */}
                  <ThemedText style={styles.institutionName}>{institutionName}</ThemedText>

                  {/* Request Context (if any) */}
                  {requestedType && (
                    <View style={styles.contextRow}>
                      <Ionicons name="water" size={14} color="#DC2626" />
                      <ThemedText style={styles.contextText}>Response to {requestedType} Request</ThemedText>
                    </View>
                  )}

                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <Ionicons name="time-outline" size={14} color="#64748B" />
                      <ThemedText style={styles.detailText}>{timeStr}</ThemedText>
                    </View>
                    {donation.units_donated && (
                      <View style={styles.detailItem}>
                        <Ionicons name="flask-outline" size={14} color="#64748B" />
                        <ThemedText style={styles.detailText}>{donation.units_donated} Unit{donation.units_donated > 1 ? 's' : ''}</ThemedText>
                      </View>
                    )}
                  </View>

                  {/* Notes */}
                  {donation.notes && (
                    <View style={styles.notesSection}>
                      <View style={styles.notesHeader}>
                        <Ionicons name="chatbubble-ellipses-outline" size={12} color="#64748B" />
                        <ThemedText style={styles.notesLabel}>Notes from Hospital</ThemedText>
                      </View>
                      <ThemedText style={styles.notesText}>{donation.notes}</ThemedText>
                    </View>
                  )}

                  {/* Actions (Cancel / Confirm) */}
                  <View style={styles.actionRow}>
                    {donation.status === 'scheduled' && (
                      <TouchableOpacity 
                        style={styles.cancelBtn} 
                        onPress={() => handleCancel(donation.id)}
                        disabled={cancelingId === donation.id}
                      >
                        {cancelingId === donation.id ? (
                          <ActivityIndicator size="small" color="#64748B" />
                        ) : (
                          <>
                            <Ionicons name="close-circle-outline" size={16} color="#64748B" />
                            <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {!donation.donor_confirmed && (donation.status === 'scheduled' || donation.status === 'confirmed') && (
                      <TouchableOpacity 
                        style={styles.confirmBtn} 
                        onPress={() => handleConfirmDonation(donation.id)}
                        disabled={confirmingId === donation.id}
                      >
                        {confirmingId === donation.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                            <ThemedText style={styles.confirmBtnText}>I Have Donated</ThemedText>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {donation.donor_confirmed && donation.status !== 'completed' && (
                      <View style={styles.waitingBadge}>
                        <Ionicons name="time-outline" size={14} color="#D97706" />
                        <ThemedText style={styles.waitingText}>Waiting for Confirmation</ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FAB — Book a Donation */}
      <TouchableOpacity
        style={[styles.fab, !cooldownStatus.isEligible && styles.fabDisabled]}
        activeOpacity={0.85}
        onPress={() => {
          if (!cooldownStatus.isEligible) {
            Alert.alert(
              'Donation Cooldown',
              `You recently completed a donation. Based on platform safety rules, you will be eligible again on ${cooldownStatus.nextEligibleDate?.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}.\n\n${cooldownStatus.daysRemaining} day${cooldownStatus.daysRemaining !== 1 ? 's' : ''} remaining.`
            );
            return;
          }
          router.navigate('/(tabs)/requests');
        }}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
        <ThemedText style={styles.fabText}>
          {cooldownStatus.isEligible ? 'Book Donation' : `Cooldown (${cooldownStatus.daysRemaining}d)`}
        </ThemedText>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  refreshBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },

  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 12,
  },
  filterContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  activeFilterTab: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeFilterTabText: {
    color: '#DC2626',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 120,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: '80%',
  },
  donateButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  donateButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listContainer: {
    gap: 16,
  },
  historyCard: {
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
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  institutionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  contextText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  notesSection: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#E2E8F0',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  cancelBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#16A34A',
    borderRadius: 12,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  waitingBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 12,
  },
  waitingText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E74C3C',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  fabDisabled: {
    backgroundColor: '#9CA3AF',
    shadowColor: '#9CA3AF',
  },
});
