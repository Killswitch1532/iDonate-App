import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import { getDonorProfile } from '@/services/donorService';
import { getActiveRequests, BloodRequest } from '@/services/requestService';
import { canDonateTo } from '@/services/matchingService';
import { getInstitutions, Institution } from '@/services/institutionService';

export default function DonateBloodScreen() {
  const { user } = useAuth();
  const [selectedBloodType, setSelectedBloodType] = useState<string>('');
  const [selectedDonationType, setSelectedDonationType] = useState<string>('Whole');
  const [selectedRadius, setSelectedRadius] = useState<string>('10 km');
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [showBloodTypeOptions, setShowBloodTypeOptions] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [realRecipients, setRealRecipients] = useState<BloodRequest[]>([]);
  const [realCenters, setRealCenters] = useState<Institution[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch Donor Profile
        const { data: profile, error: profileError } = await getDonorProfile(user.id);
        if (profileError) throw profileError;
        if (profile?.blood_type) {
          setSelectedBloodType(profile.blood_type);
        }

        // Fetch Requests (Recipients)
        const { data: requests, error: requestsError } = await getActiveRequests();
        if (requestsError) throw requestsError;
        setRealRecipients(requests || []);

        // Fetch Institutions (Centers)
        const { data: institutions, error: institutionsError } = await getInstitutions();
        if (institutionsError) throw institutionsError;
        setRealCenters(institutions || []);

      } catch (err: any) {
        console.error('[iDonate:DonateBlood] Error loading data:', err);
        setError(err.message || 'Failed to load donation data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const bloodTypes = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
  const donationTypes = ['Whole', 'Plasma'];
  const radiusOptions = ['5 km', '10 km', '20 km', '50 km'];
  const filters = ['Urgent', 'Nearby', 'My Type', 'All'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#2C3E50" style={styles.backIcon} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <ThemedText style={styles.title}>Donate Blood</ThemedText>
            <ThemedText style={styles.subtitle}>Match by type and nearby centers</ThemedText>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E74C3C" />
            <ThemedText style={styles.loadingText}>Loading donation opportunities...</ThemedText>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={40} color="#E74C3C" />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <TouchableOpacity style={styles.retryButton} onPress={() => router.replace('/donate-blood')}>
              <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && (
          <>
            {/* Donation Details Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="water-drop" size={20} color="#E74C3C" style={styles.sectionIcon} />
                <ThemedText style={styles.sectionTitle}>Donation Details</ThemedText>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>Select blood type</ThemedText>
                  <TouchableOpacity
                    style={styles.inputField}
                    onPress={() => setShowBloodTypeOptions(!showBloodTypeOptions)}
                  >
                    <MaterialIcons name="water-drop" size={20} color="#7F8C8D" style={styles.inputIcon} />
                    <ThemedText style={[
                      styles.textInput,
                      !selectedBloodType && styles.placeholderText
                    ]}>
                      {selectedBloodType || 'Choose your blood type'}
                    </ThemedText>
                    <ThemedText style={styles.dropdownIcon}>
                      {showBloodTypeOptions ? '▲' : '▼'}
                    </ThemedText>
                  </TouchableOpacity>

                  {showBloodTypeOptions && (
                    <View style={styles.bloodTypeOptions}>
                      <ScrollView
                        style={styles.bloodTypeScrollView}
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                      >
                        {bloodTypes.map((type) => (
                          <TouchableOpacity
                            key={type}
                            style={[
                              styles.bloodTypeOption,
                              selectedBloodType === type && styles.selectedBloodTypeOption
                            ]}
                            onPress={() => {
                              setSelectedBloodType(type);
                              setShowBloodTypeOptions(false);
                            }}
                          >
                            <ThemedText style={[
                              styles.bloodTypeOptionText,
                              selectedBloodType === type && styles.selectedBloodTypeOptionText
                            ]}>
                              {type}
                            </ThemedText>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.buttonRow}>
                {donationTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.pillButton,
                      selectedDonationType === type ? styles.selectedPill : styles.unselectedPill
                    ]}
                    onPress={() => setSelectedDonationType(type)}
                  >
                    <ThemedText style={[
                      styles.pillText,
                      selectedDonationType === type ? styles.selectedPillText : styles.unselectedPillText
                    ]}>
                      {type}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>Use current location</ThemedText>
                  <View style={styles.inputField}>
                    <MaterialIcons name="location-on" size={20} color="#7F8C8D" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Detecting location..."
                      editable={false}
                    />
                  </View>
                </View>
                <TouchableOpacity style={styles.radiusButton}>
                  <ThemedText style={styles.radiusText}>{selectedRadius}</ThemedText>
                  <MaterialIcons name="my-location" size={16} color="#4A90E2" style={styles.radiusIcon} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Nearby Centers Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="map" size={20} color="#4A90E2" style={styles.sectionIcon} />
                <ThemedText style={styles.sectionTitle}>Nearby Centers</ThemedText>
              </View>

              {/* Map Placeholder */}
              <View style={styles.mapContainer}>
                <View style={styles.mapPlaceholder}>
                  <ThemedText style={styles.mapText}>Interactive Map</ThemedText>
                  <ThemedText style={styles.mapSubtext}>San Francisco Area</ThemedText>
                </View>
              </View>

              {/* Centers List */}
              <View style={styles.centersList}>
                {realCenters.length === 0 ? (
                  <ThemedText style={styles.emptyText}>No verified centers found nearby.</ThemedText>
                ) : (
                  realCenters.map((center) => (
                    <View key={center.id} style={styles.centerCard}>
                      <View style={styles.centerAvatar}>
                        <MaterialIcons
                          name={(center as any).profiles?.user_type === 'blood_bank' ? 'local-hospital' : 'business'}
                          size={24}
                          color="#7F8C8D"
                        />
                      </View>
                      <View style={styles.centerInfo}>
                        <ThemedText style={styles.centerName}>{center.institution_name}</ThemedText>
                        <ThemedText style={styles.centerDetails}>
                          {center.address || 'Address not listed'}
                        </ThemedText>
                      </View>
                      <View style={styles.centerBloodTypes}>
                        <View style={styles.bloodTypeTag}>
                          <ThemedText style={styles.bloodTypeTagText}>
                            {(center as any).profiles?.user_type === 'blood_bank' ? 'Blood Bank' : 'Hospital'}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* Match Recipients Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="group" size={20} color="#4A90E2" style={styles.sectionIcon} />
                <ThemedText style={styles.sectionTitle}>Match Recipients</ThemedText>
              </View>

              <View style={styles.filterRow}>
                {filters.map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterButton,
                      selectedFilter === filter ? styles.selectedFilter : styles.unselectedFilter
                    ]}
                    onPress={() => setSelectedFilter(selectedFilter === filter ? '' : filter)}
                  >
                    <ThemedText style={[
                      styles.filterText,
                      selectedFilter === filter ? styles.selectedFilterText : styles.unselectedFilterText
                    ]}>
                      {filter}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.recipientsList}>
                {realRecipients.length === 0 ? (
                  <ThemedText style={styles.emptyText}>No active requests found at the moment.</ThemedText>
                ) : (
                  realRecipients
                    .filter(r => {
                      if (selectedFilter === 'Urgent') return r.urgency_level === 'critical' || r.urgency_level === 'high';
                      if (selectedFilter === 'My Type') {
                        if (!selectedBloodType) return true;
                        return canDonateTo(selectedBloodType, r.blood_type_needed);
                      }
                      return true;
                    })
                    .map((recipient) => (
                      <View key={recipient.id} style={styles.recipientCard}>
                        <View style={styles.recipientInfo}>
                          <ThemedText style={styles.recipientName}>{(recipient as any).profiles?.full_name || 'Anonymous'}</ThemedText>
                          <ThemedText style={styles.recipientDetails}>
                            {recipient.blood_type_needed} • {recipient.units_needed} units • {recipient.patient_name || 'Patient'}
                          </ThemedText>
                          <ThemedText style={styles.recipientTime}>
                            {recipient.created_at ? new Date(recipient.created_at).toLocaleDateString() : 'Recently'}
                          </ThemedText>
                        </View>
                        <View style={styles.recipientUrgency}>
                          <View style={[
                            styles.urgencyTag,
                            (recipient.urgency_level === 'critical' || recipient.urgency_level === 'high') ? styles.urgentTag : styles.normalTag
                          ]}>
                            <ThemedText style={styles.urgencyText}>
                              {recipient.urgency_level.charAt(0).toUpperCase() + recipient.urgency_level.slice(1)}
                            </ThemedText>
                          </View>
                        </View>
                      </View>
                    ))
                )}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.scheduleButton}>
                <ThemedText style={styles.scheduleButtonText}>Schedule later</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.findMatchButton}
                onPress={() => setSelectedFilter('My Type')}
              >
                <ThemedText style={styles.findMatchButtonText}>Find match</ThemedText>
              </TouchableOpacity>
            </View>
          </>
        )}

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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  backIcon: {
    fontSize: 24,
    color: '#2C3E50',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },

  // Section
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    gap: 12,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F4F4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
  },
  placeholderText: {
    color: '#7F8C8D',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#7F8C8D',
    marginLeft: 8,
  },
  bloodTypeOptions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginTop: 4,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: 200,
  },
  bloodTypeScrollView: {
    maxHeight: 180,
  },
  bloodTypeOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedBloodTypeOption: {
    backgroundColor: '#4A90E2',
  },
  bloodTypeOptionText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  selectedBloodTypeOptionText: {
    color: '#FFFFFF',
  },

  // Pills
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  pillButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  selectedPill: {
    backgroundColor: '#4A90E2',
  },
  unselectedPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedPillText: {
    color: '#FFFFFF',
  },
  unselectedPillText: {
    color: '#7F8C8D',
  },

  // Radius Button
  radiusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  radiusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginRight: 4,
  },
  radiusIcon: {
    fontSize: 14,
  },

  // Map
  mapContainer: {
    marginBottom: 16,
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  mapText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 4,
  },
  mapSubtext: {
    fontSize: 14,
    color: '#7F8C8D',
  },

  // Centers
  centersList: {
    gap: 12,
  },
  centerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F4F4',
    borderRadius: 12,
  },
  centerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
  },
  centerInfo: {
    flex: 1,
  },
  centerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  centerDetails: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  centerBloodTypes: {
    flexDirection: 'row',
    gap: 4,
  },
  bloodTypeTag: {
    backgroundColor: '#E74C3C',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bloodTypeTagText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  selectedFilter: {
    backgroundColor: '#4A90E2',
  },
  unselectedFilter: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedFilterText: {
    color: '#FFFFFF',
  },
  unselectedFilterText: {
    color: '#7F8C8D',
  },

  // Recipients
  recipientsList: {
    gap: 12,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F4F4',
    borderRadius: 12,
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  recipientDetails: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 2,
  },
  recipientTime: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  recipientUrgency: {
    marginLeft: 12,
  },
  urgencyTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgentTag: {
    backgroundColor: '#E74C3C',
  },
  normalTag: {
    backgroundColor: '#27AE60',
  },
  urgencyText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  scheduleButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  scheduleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  findMatchButton: {
    flex: 1,
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  findMatchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Bottom spacer
  bottomSpacer: {
    height: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#7F8C8D',
    fontSize: 16,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 12,
    color: '#E74C3C',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#7F8C8D',
    padding: 20,
    fontStyle: 'italic',
  },
});
