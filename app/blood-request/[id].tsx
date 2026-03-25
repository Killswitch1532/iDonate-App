import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { bookDonation } from '@/services/donationService';
import { Ionicons } from '@expo/vector-icons';

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

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      setLoading(true);
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

    } catch (error: any) {
      console.error('[iDonate:RequestDetails] Error fetching data:', error.message);
      Alert.alert('Error', 'Could not load request details.');
      router.back();
    } finally {
      setLoading(false);
    }
  }

  const handleAccept = async () => {
    if (!user || !request || !institution) return;

    Alert.alert(
      'Confirm Donation',
      `Are you sure you want to volunteer for this ${request.blood_type_needed} blood request?`,
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
        <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(request.urgency_level) }]}>
          <Text style={styles.urgencyText}>{request.urgency_level.toUpperCase()}</Text>
        </View>
        <Text style={styles.bloodType}>{request.blood_type_needed}</Text>
        <Text style={styles.units}>{request.units_needed} Unit{request.units_needed > 1 ? 's' : ''} Needed</Text>
      </View>

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

      {/* Description Card */}
      {request.description && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text" size={20} color="#64748B" />
            <Text style={styles.cardTitle}>Notes</Text>
          </View>
          <Text style={styles.description}>{request.description}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.acceptButton, !isCompatible() && styles.disabledButton]} 
          onPress={handleAccept}
          disabled={booking || !isCompatible()}
        >
          {booking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.acceptButtonText}>I want to Donate</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.rejectButton} onPress={() => router.back()}>
          <Text style={styles.rejectButtonText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
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
