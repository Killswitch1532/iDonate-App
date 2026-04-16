import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { bookDonation, getActiveDonation, getDonationForRequest, DonationStatus } from '@/services/donationService';
import { isBloodTypeComplete } from '@/services/donorService';
import { BloodTypeGatingModal } from '@/components/BloodTypeGatingModal';
import { Ionicons } from '@expo/vector-icons';

// Visual config per donation status
const DETAIL_STATUS_CONFIG: Record<DonationStatus, { icon: string; title: string; subtitle: string; iconColor: string; bannerBg: string; bannerBorder: string; titleColor: string; subtitleColor: string; buttonBg: string; buttonBorder: string; buttonTextColor: string; buttonLabel: string }> = {
  scheduled: {
    icon: 'time-outline', title: 'Donation Scheduled', subtitle: 'The hospital will contact you soon. View your donations for details.',
    iconColor: '#2563EB', bannerBg: '#DBEAFE', bannerBorder: '#93C5FD', titleColor: '#1E40AF', subtitleColor: '#2563EB',
    buttonBg: '#DBEAFE', buttonBorder: '#93C5FD', buttonTextColor: '#1E40AF', buttonLabel: 'Scheduled',
  },
  confirmed: {
    icon: 'checkmark-done-outline', title: 'Donation Confirmed', subtitle: 'Your donation is confirmed by the hospital. Please arrive on time.',
    iconColor: '#D97706', bannerBg: '#FEF3C7', bannerBorder: '#FDE68A', titleColor: '#92400E', subtitleColor: '#A16207',
    buttonBg: '#FEF3C7', buttonBorder: '#FDE68A', buttonTextColor: '#92400E', buttonLabel: 'Confirmed',
  },
  completed: {
    icon: 'ribbon-outline', title: 'Donation Completed', subtitle: 'Thank you for donating! You helped save a life.',
    iconColor: '#16A34A', bannerBg: '#DCFCE7', bannerBorder: '#BBF7D0', titleColor: '#166534', subtitleColor: '#15803D',
    buttonBg: '#DCFCE7', buttonBorder: '#BBF7D0', buttonTextColor: '#166534', buttonLabel: 'Donated ✓',
  },
  cancelled: {
    icon: 'close-circle-outline', title: 'Donation Cancelled', subtitle: 'This donation was cancelled. You can accept this request again if needed.',
    iconColor: '#64748B', bannerBg: '#F1F5F9', bannerBorder: '#E2E8F0', titleColor: '#334155', subtitleColor: '#64748B',
    buttonBg: '#F1F5F9', buttonBorder: '#E2E8F0', buttonTextColor: '#64748B', buttonLabel: 'Cancelled',
  },
  no_show: {
    icon: 'help-circle-outline', title: 'Marked as No Show', subtitle: 'You were marked as a no-show for this donation.',
    iconColor: '#64748B', bannerBg: '#F1F5F9', bannerBorder: '#E2E8F0', titleColor: '#334155', subtitleColor: '#64748B',
    buttonBg: '#F1F5F9', buttonBorder: '#E2E8F0', buttonTextColor: '#64748B', buttonLabel: 'No Show',
  },
};

// Medical Compatibility Map (Who can donate to whom)
const COMPATIBILITY_MAP: Record<string, string[]> = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-']
};

export default function BloodRequestDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [request, setRequest] = useState<any>(null);
  const [institution, setInstitution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  // Donation state for THIS request
  const [thisRequestStatus, setThisRequestStatus] = useState<DonationStatus | null>(null);
  const [activeDonation, setActiveDonation] = useState<any>(null); // active donation for another request
  const [acceptanceLoading, setAcceptanceLoading] = useState(true);
  const [showGatingModal, setShowGatingModal] = useState(false);
  const [requestDonors, setRequestDonors] = useState<any[]>([]);
  const [fetchingDonors, setFetchingDonors] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      setLoading(true);
      setAcceptanceLoading(true);

      // Fetch request details
      const { data: requestData, error: requestError } = await supabase
        .from('blood_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (requestError) throw requestError;
      setRequest(requestData);

      // Fetch institution details
      const { data: instData, error: instError } = await supabase
        .from('institutions')
        .select('*')
        .eq('id', requestData.requester_id)
        .single();

      if (instError) throw instError;
      setInstitution(instData);

      // Check if user already has a donation for this request or another active
      if (user?.id && requestData?.id) {
        const [thisReq, activeReq] = await Promise.all([
          getDonationForRequest(user.id, requestData.id),
          getActiveDonation(user.id),
        ]);

        if (thisReq.data) {
          setThisRequestStatus(thisReq.data.status as DonationStatus);
        } else if (activeReq.data && activeReq.data.blood_request_id !== requestData.id) {
          setActiveDonation(activeReq.data);
        }

        // Fetch all donors for this request
        setFetchingDonors(true);
        const { data: donors } = await supabase
          .from('donations')
          .select('*, profiles:donor_id(full_name, avatar_url)')
          .eq('blood_request_id', requestData.id)
          .in('status', ['scheduled', 'confirmed', 'completed']);
        setRequestDonors(donors || []);
        setFetchingDonors(false);
      }

    } catch (error: any) {
      console.error('[iDonate:RequestDetails] Error fetching data:', error.message);
      Alert.alert('Error', 'Could not load request details.');
      router.back();
    } finally {
      setLoading(false);
      setAcceptanceLoading(false);
    }
  }

  const handleAccept = async () => {
    if (!user || !request || !institution) return;

    // --- BLOOD TYPE GATING CHECK ---
    if (!isBloodTypeComplete(profile)) {
      setShowGatingModal(true);
      return;
    }

    Alert.alert(
      'Confirm Donation',
      `Are you sure you want to volunteer for this ${request.blood_type_needed} blood request?\n\nYou will not be able to accept other requests until this one is completed or cancelled.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setBooking(true);
              // Combine requested date and time
              let scheduledDate = new Date();
              if (request.date_needed) {
                const [year, month, day] = request.date_needed.split('-').map(Number);
                scheduledDate = new Date(year, month - 1, day);
                
                if (request.time_needed) {
                  const [hours, minutes] = request.time_needed.split(':').map(Number);
                  scheduledDate.setHours(hours, minutes, 0, 0);
                } else {
                  // If no time is set, use current time on the requested date
                  const now = new Date();
                  scheduledDate.setHours(now.getHours(), now.getMinutes(), 0, 0);
                }
              }

              const { error } = await bookDonation({
                donorId: user.id,
                institutionId: institution.id,
                scheduledDate: scheduledDate,
                bloodRequestId: request.id as string,
              });

              if (error) throw error;

              setThisRequestStatus('scheduled');

              Alert.alert(
                'Success!',
                'Your donation intent has been registered. The hospital will contact you soon.',
                [{ text: 'OK', onPress: () => router.push('/(tabs)/donations') }]
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to book donation.');
            } finally {
              setBooking(false);
            }
          }
        }
      ]
    );
  };

  const isCompatible = () => {
    if (!profile?.blood_type || !request?.blood_type_needed) return false;
    const compatibleDonors = COMPATIBILITY_MAP[request.blood_type_needed] || [];
    return compatibleDonors.includes(profile.blood_type);
  };

  const getCompatibilityExplanation = () => {
    if (!profile?.blood_type || !request?.blood_type_needed) return '';
    if (profile.blood_type === request.blood_type_needed) {
      return `Your blood type (${profile.blood_type}) is an exact match for this request!`;
    }
    if (profile.blood_type === 'O-') {
      return `Your blood type (O-) is the universal donor, making you a match for this ${request.blood_type_needed} request!`;
    }
    return `Your blood type (${profile.blood_type}) is compatible with ${request.blood_type_needed} patients.`;
  };

  // Can accept if: 
  // 1. Compatible 
  // 2. No current commitment to THIS request (or can re-accept)
  // 3. No active donation elsewhere
  // 4. Request is NOT yet full (confirmed + scheduled < max_donors)
  const isFull = (request.donors_confirmed_count || 0) + requestDonors.filter((d: any) => d.status === 'scheduled' || d.status === 'confirmed').length >= (request.max_donors || 1);
  const canAccept = isCompatible() && !hasActiveCommitment && !isTerminalState && !activeDonation && !acceptanceLoading && !isFull && request.status !== 'completed';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  if (!request || !institution) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Request Details', headerBackTitle: 'Back' }} />
      
      {/* Header Info */}
      <View style={styles.header}>
        <Text style={styles.bloodType}>{request.blood_type_needed}</Text>
        <Text style={styles.units}>
          {request.max_donors > 1 ? `${request.max_donors} Donors Needed` : 'Blood Needed'}
        </Text>
      </View>

      {/* Multi-Donor Progress Bar */}
      {request.max_donors > 0 && (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <ThemedText style={styles.progressTitle}>Request Progress</ThemedText>
            <ThemedText style={styles.progressCount}>
              {request.donors_confirmed_count || 0} / {request.max_donors} Donors Confirmed
            </ThemedText>
          </View>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${Math.min(((request.donors_confirmed_count || 0) / request.max_donors) * 100, 100)}%` }
              ]} 
            />
          </View>
          {request.status === 'completed' ? (
            <View style={styles.progressNote}>
              <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
              <ThemedText style={styles.progressNoteText}>This request has been successfully fulfilled!</ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.progressSubtext}>
              {requestDonors.length} volunteer{requestDonors.length !== 1 ? 's' : ''} currently coordinating.
            </ThemedText>
          )}
        </View>
      )}

      {/* Donation status banner */}
      {thisRequestStatus && DETAIL_STATUS_CONFIG[thisRequestStatus] && (
        <View style={[styles.statusBanner, { backgroundColor: DETAIL_STATUS_CONFIG[thisRequestStatus].bannerBg, borderColor: DETAIL_STATUS_CONFIG[thisRequestStatus].bannerBorder }]}>
          <Ionicons name={DETAIL_STATUS_CONFIG[thisRequestStatus].icon as any} size={24} color={DETAIL_STATUS_CONFIG[thisRequestStatus].iconColor} />
          <View style={styles.bannerContent}>
            <Text style={[styles.bannerTitle, { color: DETAIL_STATUS_CONFIG[thisRequestStatus].titleColor }]}>
              {DETAIL_STATUS_CONFIG[thisRequestStatus].title}
            </Text>
            <Text style={[styles.bannerSubtitle, { color: DETAIL_STATUS_CONFIG[thisRequestStatus].subtitleColor }]}>
              {DETAIL_STATUS_CONFIG[thisRequestStatus].subtitle}
            </Text>
            {(hasActiveCommitment || isTerminalState) && (
              <TouchableOpacity
                style={styles.viewDonationsLink}
                onPress={() => router.push('/(tabs)/donations')}
              >
                <Text style={styles.viewDonationsLinkText}>View My Donations</Text>
                <Ionicons name="arrow-forward" size={14} color="#2563EB" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Already has an active donation for another request */}
      {!thisRequestStatus && activeDonation && (
        <View style={styles.blockedBanner}>
          <Ionicons name="information-circle" size={24} color="#D97706" />
          <View style={styles.acceptedBannerContent}>
            <Text style={styles.blockedBannerTitle}>You already have an active donation</Text>
            <Text style={styles.blockedBannerSubtitle}>
              You accepted a {activeDonation.blood_requests?.blood_type_needed || ''} request
              {activeDonation.institutions?.institution_name
                ? ` at ${activeDonation.institutions.institution_name}`
                : ''}. Complete or cancel it before accepting another.
            </Text>
            <TouchableOpacity
              style={styles.viewDonationsLink}
              onPress={() => router.push('/(tabs)/donations')}
            >
              <Text style={styles.viewDonationsLinkText}>View My Donations</Text>
              <Ionicons name="arrow-forward" size={14} color="#2563EB" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Schedule Card */}
      {(request.date_needed || request.time_needed) && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar" size={20} color="#64748B" />
            <Text style={styles.cardTitle}>Schedule</Text>
          </View>
          <View style={styles.scheduleRow}>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>Date</Text>
              <Text style={styles.scheduleValue}>
                {request.date_needed ? new Date(request.date_needed).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'As soon as possible'}
              </Text>
            </View>
            {request.time_needed && (
              <View style={styles.scheduleItem}>
                <Text style={styles.scheduleLabel}>Preferred Time</Text>
                <Text style={styles.scheduleValue}>{request.time_needed}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Compatibility Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="medical" size={20} color="#DC2626" />
          <Text style={styles.cardTitle}>Compatibility</Text>
        </View>
        <Text style={styles.cardText}>
          {isCompatible() ? getCompatibilityExplanation() : "Your blood type is not compatible with this request."}
        </Text>
        <TouchableOpacity 
          onPress={() => Linking.openURL('https://www.redcrossblood.org/donate-blood/blood-types.html')}
          style={styles.chartLink}
        >
          <Text style={styles.chartLinkText}>View Compatibility Chart</Text>
          <Ionicons name="open-outline" size={14} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* Institution Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="business" size={20} color="#64748B" />
          <Text style={styles.cardTitle}>Hospital Information</Text>
        </View>
        <Text style={styles.institutionName}>{institution.institution_name}</Text>
        <Text style={styles.address}>{institution.address || 'Location information not available.'}</Text>
        {institution.phone && (
          <TouchableOpacity 
            style={styles.phoneLink}
            onPress={() => Linking.openURL(`tel:${institution.phone}`)}
          >
            <Ionicons name="call" size={16} color="#2563EB" />
            <Text style={styles.phoneLinkText}>{institution.phone}</Text>
          </TouchableOpacity>
        )}
      </View>

          <Text style={styles.description}>{request.description}</Text>
        </View>
      )}

      {/* Volunteer List (Social Proof / Progress) */}
      {requestDonors.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="people" size={20} color="#64748B" />
            <Text style={styles.cardTitle}>Current Volunteers</Text>
          </View>
          <View style={styles.donorAvatarList}>
            {requestDonors.map((d, i) => (
              <View key={d.id} style={[styles.miniAvatar, { marginLeft: i > 0 ? -12 : 0, zIndex: 10 - i }]}>
                {d.profiles?.avatar_url ? (
                  <Image source={{ uri: d.profiles.avatar_url }} style={styles.miniAvatarImg} />
                ) : (
                  <View style={styles.miniAvatarPlaceholder}>
                    <Text style={styles.miniAvatarInitial}>{d.profiles?.full_name?.charAt(0) || '?'}</Text>
                  </View>
                )}
              </View>
            ))}
            <ThemedText style={styles.volunteerCountText}>
              {requestDonors.length} person responded
            </ThemedText>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {hasActiveCommitment || isTerminalState ? (
          // Show status state button
          <View style={[styles.stateButton, { backgroundColor: DETAIL_STATUS_CONFIG[thisRequestStatus!].buttonBg, borderColor: DETAIL_STATUS_CONFIG[thisRequestStatus!].buttonBorder }]}>
            <Ionicons name={DETAIL_STATUS_CONFIG[thisRequestStatus!].icon as any} size={20} color={DETAIL_STATUS_CONFIG[thisRequestStatus!].buttonTextColor} />
            <Text style={[styles.stateButtonText, { color: DETAIL_STATUS_CONFIG[thisRequestStatus!].buttonTextColor }]}>
              {DETAIL_STATUS_CONFIG[thisRequestStatus!].buttonLabel}
            </Text>
          </View>
        ) : (
          // Normal donate button (disabled if incompatible or has another active donation)
          <TouchableOpacity 
            style={[styles.acceptButton, (!canAccept) && styles.disabledButton]} 
            onPress={handleAccept}
            disabled={booking || !canAccept}
          >
            {booking ? (
              <ActivityIndicator color="#fff" />
            ) : acceptanceLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.acceptButtonText}>
                {activeDonation ? 'Already Committed' : canReAccept ? 'Accept Again' : 'I want to Donate'}
              </Text>
            )}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.rejectButton} onPress={() => router.back()}>
          <Text style={styles.rejectButtonText}>
            {hasActiveCommitment || isTerminalState ? 'Go Back' : 'Dismiss'}
          </Text>
        </TouchableOpacity>
      </View>

      <BloodTypeGatingModal 
        isVisible={showGatingModal}
        onClose={() => setShowGatingModal(false)}
        onSuccess={() => {
          setShowGatingModal(false);
          handleAccept(); // Retry original action
        }}
      />
    </ScrollView>
  );
}

function getUrgencyColor(urgency: string) {
  switch (urgency) {
    case 'critical': return '#DC2626';
    case 'high': return '#EA580C';
    case 'moderate': return '#CA8A04';
    default: return '#16A34A';
  }
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
  progressCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
  },
  progressCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#16A34A',
    borderRadius: 5,
  },
  progressSubtext: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  progressNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressNoteText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: 'bold',
  },
  donorAvatarList: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  miniAvatarImg: {
    width: '100%',
    height: '100%',
  },
  miniAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarInitial: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
  },
  volunteerCountText: {
    marginLeft: 12,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
  },
  urgencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  urgencyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bloodType: {
    fontSize: 64,
    fontWeight: '900',
    color: '#DC2626',
  },
  units: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '600',
  },

  // Generic status banner (replaces acceptedBanner)
  statusBanner: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Blocked banner (already has active donation)
  blockedBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  acceptedBannerContent: {
    flex: 1,
  },
  blockedBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 4,
  },
  blockedBannerSubtitle: {
    fontSize: 14,
    color: '#A16207',
    lineHeight: 20,
  },
  viewDonationsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  viewDonationsLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },

  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  cardText: {
    fontSize: 16,
    color: '#1E293B',
    lineHeight: 24,
  },
  chartLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  chartLinkText: {
    color: '#2563EB',
    fontWeight: '600',
    marginRight: 4,
  },
  institutionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  address: {
    color: '#64748B',
    lineHeight: 20,
  },
  phoneLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  phoneLinkText: {
    color: '#2563EB',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  description: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scheduleItem: {
    flex: 1,
  },
  scheduleLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  scheduleValue: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
  },
  actions: {
    marginTop: 10,
  },
  acceptButton: {
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stateButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  stateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#CBD5E1',
  },
  rejectButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  rejectButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
});
