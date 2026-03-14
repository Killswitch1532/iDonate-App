import { MaterialIcons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/contexts/AuthContext";
import { getDonorDonations, cancelDonation, Donation } from "@/services/donationService";

export default function DonationsScreen() {
  const { user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const loadDonations = () => {
    if (user?.id) {
      setLoading(true);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return { bg: '#E8F4FD', text: '#4A90E2' };
      case 'confirmed': return { bg: '#FFF3CD', text: '#F39C12' };
      case 'completed': return { bg: '#E8F5E8', text: '#27AE60' };
      case 'cancelled': return { bg: '#FDE8E8', text: '#E74C3C' };
      case 'no_show': return { bg: '#F0F0F0', text: '#7F8C8D' };
      default: return { bg: '#F0F0F0', text: '#7F8C8D' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Donation History</ThemedText>
        <View style={{ width: 40 }} /> {/* For centering */}
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
          </View>
        ) : donations.length === 0 ? (
          <View style={styles.centerContainer}>
            <MaterialIcons name="volunteer-activism" size={60} color="#BDC3C7" style={styles.emptyIcon} />
            <ThemedText style={styles.emptyText}>No donation history yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>Your past and upcoming donations will appear here.</ThemedText>
            <TouchableOpacity style={styles.donateButton} onPress={() => router.push('/donate-blood')}>
              <ThemedText style={styles.donateButtonText}>Schedule a Donation</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {donations.map((donation: any) => {
              const statusColors = getStatusColor(donation.status);
              const institutionName = donation.institutions?.institution_name || 'Unknown center';
              const address = donation.institutions?.address;
              const phone = donation.institutions?.profiles?.phone_number;
              const notes = donation.notes;
              const dateStr = new Date(donation.scheduled_date).toLocaleDateString();
              const timeStr = new Date(donation.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const isCanceling = cancelingId === donation.id;
              
              return (
                <View key={donation.id} style={styles.historyCard}>
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardHeaderLeft}>
                      <MaterialIcons
                        name={donation.status === 'completed' ? 'check-circle' : donation.status === 'scheduled' ? 'event' : 'cancel'}
                        size={24}
                        color={statusColors.text}
                        style={styles.historyIcon}
                      />
                      <ThemedText style={styles.institutionName}>{institutionName}</ThemedText>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                      <ThemedText style={[styles.statusText, { color: statusColors.text }]}>
                        {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                      </ThemedText>
                    </View>
                  </View>
                  
                  <View style={styles.cardDetails}>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="calendar-today" size={16} color="#7F8C8D" />
                      <ThemedText style={styles.detailText}>{dateStr}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="access-time" size={16} color="#7F8C8D" />
                      <ThemedText style={styles.detailText}>{timeStr}</ThemedText>
                    </View>
                    {address && (
                      <View style={styles.detailRowFull}>
                        <MaterialIcons name="location-on" size={16} color="#7F8C8D" />
                        <ThemedText style={styles.detailText}>{address}</ThemedText>
                      </View>
                    )}
                    {phone && (
                      <View style={styles.detailRowFull}>
                        <MaterialIcons name="phone" size={16} color="#7F8C8D" />
                        <ThemedText style={styles.detailText}>{phone}</ThemedText>
                      </View>
                    )}
                    {donation.units_donated && (
                      <View style={styles.detailRow}>
                        <MaterialIcons name="water-drop" size={16} color="#E74C3C" />
                        <ThemedText style={styles.detailText}>{donation.units_donated} units collected</ThemedText>
                      </View>
                    )}
                    {notes && (
                      <View style={styles.notesBox}>
                        <ThemedText style={styles.notesLabel}>Notes from center:</ThemedText>
                        <ThemedText style={styles.notesText}>{notes}</ThemedText>
                      </View>
                    )}
                  </View>

                  {donation.status === 'scheduled' && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity 
                        style={styles.cancelButton} 
                        onPress={() => handleCancel(donation.id)}
                        disabled={isCanceling}
                      >
                        {isCanceling ? (
                          <ActivityIndicator size="small" color="#E74C3C" />
                        ) : (
                          <ThemedText style={styles.cancelButtonText}>Cancel Appointment</ThemedText>
                        )}
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
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F4F4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 24,
  },
  donateButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  donateButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  listContainer: {
    gap: 16,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyIcon: {
    marginRight: 8,
  },
  institutionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailRowFull: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  detailText: {
    fontSize: 13,
    color: '#7F8C8D',
    flexShrink: 1,
  },
  notesBox: {
    width: '100%',
    backgroundColor: '#F8F4F4',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 13,
    color: '#7F8C8D',
    fontStyle: 'italic',
  },
  actionRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    alignItems: 'center',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FDE8E8',
  },
  cancelButtonText: {
    color: '#E74C3C',
    fontWeight: '600',
    fontSize: 14,
  },
});
