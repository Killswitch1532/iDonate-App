import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, ActivityIndicator, Linking, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';

// react-native-maps requires a dev build — gracefully degrade in Expo Go
let MapView: any = null;
let Marker: any = null;
let mapsAvailable = false;
try {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  mapsAvailable = true;
} catch {
  // Native module not available (Expo Go)
}

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import { getDonorProfile } from '@/services/donorService';
import { getActiveRequests, BloodRequest } from '@/services/requestService';
import { canDonateTo } from '@/services/matchingService';
import { getInstitutions, Institution } from '@/services/institutionService';
import { bookDonation } from '@/services/donationService';

export default function DonateBloodScreen() {
  const { user } = useAuth();
  const [selectedBloodType, setSelectedBloodType] = useState<string>('');
  const [selectedRadius, setSelectedRadius] = useState<string>('10 km');
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [realRecipients, setRealRecipients] = useState<BloodRequest[]>([]);
  const [realCenters, setRealCenters] = useState<Institution[]>([]);

  // Location state
  const [locationText, setLocationText] = useState<string>('');
  const [locationLoading, setLocationLoading] = useState<boolean>(true);
  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Center selection
  const [selectedCenter, setSelectedCenter] = useState<string | null>(null);

  // Date & time selection
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [dateChosen, setDateChosen] = useState<boolean>(false);
  const [timeChosen, setTimeChosen] = useState<boolean>(false);
  const [booking, setBooking] = useState<boolean>(false);

  const detectLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);
    setLocationText('');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        setLocationLoading(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      setLocationCoords({ latitude, longitude });

      // Default to coordinates
      let displayText = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

      // Try reverse geocoding (may fail if Google Play Services is unavailable)
      try {
        const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (address) {
          const parts = [
            address.street,
            address.city || address.subregion,
            address.region,
          ].filter(Boolean);
          if (parts.length > 0) displayText = parts.join(', ');
        }
      } catch (geoErr) {
        console.warn('[iDonate:DonateBlood] Reverse geocode unavailable, using coordinates');
      }

      setLocationText(displayText);
    } catch (err: any) {
      console.error('[iDonate:DonateBlood] Location error:', err);
      setLocationError('Could not detect location');
    } finally {
      setLocationLoading(false);
    }
  }, []);

  // Detect location on mount
  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  const cycleRadius = () => {
    const radiusOptions = ['5 km', '10 km', '20 km', '50 km'];
    const currentIndex = radiusOptions.indexOf(selectedRadius);
    const nextIndex = (currentIndex + 1) % radiusOptions.length;
    setSelectedRadius(radiusOptions[nextIndex]);
  };

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

              <View style={styles.bloodTypeBadgeRow}>
                <MaterialIcons name="water-drop" size={20} color="#E74C3C" style={styles.sectionIcon} />
                <ThemedText style={styles.bloodTypeBadgeLabel}>Your blood type</ThemedText>
                <View style={styles.bloodTypeBadge}>
                  <ThemedText style={styles.bloodTypeBadgeText}>
                    {selectedBloodType || '—'}
                  </ThemedText>
                </View>
                {!selectedBloodType && (
                  <ThemedText style={styles.bloodTypeMissing}>
                    Update your profile to set blood type
                  </ThemedText>
                )}
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>Your location</ThemedText>
                  <TouchableOpacity
                    style={styles.inputField}
                    onPress={detectLocation}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="location-on"
                      size={20}
                      color={locationError ? '#E74C3C' : '#27AE60'}
                      style={styles.inputIcon}
                    />
                    {locationLoading ? (
                      <View style={styles.locationLoadingRow}>
                        <ActivityIndicator size="small" color="#4A90E2" />
                        <ThemedText style={styles.locationLoadingText}>Detecting location...</ThemedText>
                      </View>
                    ) : locationError ? (
                      <View style={styles.locationErrorRow}>
                        <ThemedText style={styles.locationErrorText}>{locationError}</ThemedText>
                        <ThemedText style={styles.locationRetryHint}>Tap to retry</ThemedText>
                      </View>
                    ) : (
                      <ThemedText style={styles.textInput} numberOfLines={1}>
                        {locationText}
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.radiusButton} onPress={cycleRadius}>
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

              {/* Interactive Map */}
              <View style={styles.mapContainer}>
                {locationCoords && mapsAvailable ? (
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: locationCoords.latitude,
                      longitude: locationCoords.longitude,
                      latitudeDelta: 0.05,
                      longitudeDelta: 0.05,
                    }}
                    showsUserLocation
                    showsMyLocationButton
                  >
                    {/* Institution center markers */}
                    {realCenters
                      .filter((c: any) => c.location)
                      .map((center: any) => {
                        const coords = center.location?.coordinates;
                        if (!coords || coords.length < 2) return null;
                        return (
                          <Marker
                            key={center.id}
                            coordinate={{
                              latitude: coords[1],
                              longitude: coords[0],
                            }}
                            title={center.institution_name}
                            description={center.address || ''}
                            pinColor={center.profiles?.user_type === 'blood_bank' ? '#E74C3C' : '#4A90E2'}
                          />
                        );
                      })}
                  </MapView>
                ) : locationCoords && !mapsAvailable ? (
                  /* Fallback when react-native-maps is not available (Expo Go) */
                  <View style={styles.mapPlaceholder}>
                    <MaterialIcons name="map" size={40} color="#4A90E2" />
                    <ThemedText style={styles.mapText}>
                      {locationText || `${locationCoords.latitude.toFixed(4)}, ${locationCoords.longitude.toFixed(4)}`}
                    </ThemedText>
                    <TouchableOpacity
                      onPress={() => {
                        const url = Platform.select({
                          ios: `maps:0,0?q=${locationCoords.latitude},${locationCoords.longitude}`,
                          default: `geo:${locationCoords.latitude},${locationCoords.longitude}?q=${locationCoords.latitude},${locationCoords.longitude}`,
                        });
                        Linking.openURL(url);
                      }}
                      style={styles.mapRetryButton}
                    >
                      <ThemedText style={styles.mapRetryText}>Open in Maps</ThemedText>
                    </TouchableOpacity>
                    <ThemedText style={[styles.mapText, { fontSize: 11, marginTop: 4 }]}>
                      Interactive map requires a development build
                    </ThemedText>
                  </View>
                ) : (
                  <View style={styles.mapPlaceholder}>
                    {locationLoading ? (
                      <>
                        <ActivityIndicator size="large" color="#4A90E2" />
                        <ThemedText style={styles.mapText}>Loading map...</ThemedText>
                      </>
                    ) : (
                      <>
                        <MaterialIcons name="map" size={40} color="#7F8C8D" />
                        <ThemedText style={styles.mapText}>Enable location to view map</ThemedText>
                        <TouchableOpacity onPress={detectLocation} style={styles.mapRetryButton}>
                          <ThemedText style={styles.mapRetryText}>Detect location</ThemedText>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>

              {/* Centers List — selectable */}
              <View style={styles.centersList}>
                <ThemedText style={styles.inputLabel}>Choose a center</ThemedText>
                {realCenters.length === 0 ? (
                  <ThemedText style={styles.emptyText}>No verified centers found nearby.</ThemedText>
                ) : (
                  realCenters.map((center) => (
                    <TouchableOpacity
                      key={center.id}
                      style={[
                        styles.centerCard,
                        selectedCenter === center.id && styles.centerCardSelected,
                      ]}
                      onPress={() => setSelectedCenter(
                        selectedCenter === center.id ? null : center.id
                      )}
                      activeOpacity={0.7}
                    >
                      <View style={styles.centerAvatar}>
                        <MaterialIcons
                          name={(center as any).profiles?.user_type === 'blood_bank' ? 'local-hospital' : 'business'}
                          size={24}
                          color={selectedCenter === center.id ? '#FFFFFF' : '#7F8C8D'}
                        />
                      </View>
                      <View style={styles.centerInfo}>
                        <ThemedText style={styles.centerName}>{center.institution_name}</ThemedText>
                        <ThemedText style={styles.centerDetails}>
                          {center.address || 'Address not listed'}
                        </ThemedText>
                      </View>
                      {selectedCenter === center.id ? (
                        <View style={styles.centerCheckmark}>
                          <MaterialIcons name="check-circle" size={24} color="#27AE60" />
                        </View>
                      ) : (
                        <View style={styles.centerBloodTypes}>
                          <View style={styles.bloodTypeTag}>
                            <ThemedText style={styles.bloodTypeTagText}>
                              {(center as any).profiles?.user_type === 'blood_bank' ? 'Blood Bank' : 'Hospital'}
                            </ThemedText>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>

            {/* Date & Time Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="event" size={20} color="#4A90E2" style={styles.sectionIcon} />
                <ThemedText style={styles.sectionTitle}>Preferred Date & Time</ThemedText>
              </View>

              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <MaterialIcons name="calendar-today" size={20} color="#4A90E2" />
                  <ThemedText style={dateChosen ? styles.dateTimeValue : styles.dateTimePlaceholder}>
                    {dateChosen ? selectedDate.toLocaleDateString() : 'Select date'}
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <MaterialIcons name="access-time" size={20} color="#4A90E2" />
                  <ThemedText style={timeChosen ? styles.dateTimeValue : styles.dateTimePlaceholder}>
                    {timeChosen ? selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Select time'}
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(event: any, date?: Date) => {
                    setShowDatePicker(false);
                    if (event.type === 'set' && date) {
                      setSelectedDate(prev => {
                        const updated = new Date(date);
                        updated.setHours(prev.getHours(), prev.getMinutes());
                        return updated;
                      });
                      setDateChosen(true);
                    }
                  }}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="time"
                  is24Hour={false}
                  onChange={(event: any, date?: Date) => {
                    setShowTimePicker(false);
                    if (event.type === 'set' && date) {
                      setSelectedDate(prev => {
                        const updated = new Date(prev);
                        updated.setHours(date.getHours(), date.getMinutes());
                        return updated;
                      });
                      setTimeChosen(true);
                    }
                  }}
                />
              )}
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

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!selectedCenter || !dateChosen || !timeChosen || booking) && styles.submitButtonDisabled,
              ]}
              disabled={!selectedCenter || !dateChosen || !timeChosen || booking}
              onPress={async () => {
                if (!user || !selectedCenter) return;
                setBooking(true);
                const { data, error: bookError } = await bookDonation({
                  donorId: user.id,
                  institutionId: selectedCenter,
                  scheduledDate: selectedDate,
                });
                setBooking(false);
                if (bookError) {
                  Alert.alert('Booking Failed', bookError.message || 'Could not book your appointment. Please try again.');
                } else {
                  Alert.alert(
                    'Appointment Booked!',
                    `Your donation appointment has been scheduled for ${selectedDate.toLocaleDateString()} at ${selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
                    [{ text: 'OK', onPress: () => router.back() }]
                  );
                }
              }}
            >
              {booking ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
              ) : (
                <MaterialIcons name="event-available" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              )}
              <ThemedText style={styles.submitButtonText}>
                {booking ? 'Booking...' : 'Book Appointment'}
              </ThemedText>
            </TouchableOpacity>
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

  // Location detection
  locationLoadingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationLoadingText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  locationErrorRow: {
    flex: 1,
  },
  locationErrorText: {
    fontSize: 14,
    color: '#E74C3C',
  },
  locationRetryHint: {
    fontSize: 12,
    color: '#7F8C8D',
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Blood type badge
  bloodTypeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  bloodTypeBadgeLabel: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  bloodTypeBadge: {
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  bloodTypeBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  bloodTypeMissing: {
    fontSize: 12,
    color: '#E74C3C',
    fontStyle: 'italic',
    width: '100%',
    marginTop: 4,
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
  map: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    height: 250,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    gap: 8,
  },
  mapText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 8,
  },
  mapRetryButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  mapRetryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  centerCardSelected: {
    borderColor: '#27AE60',
    backgroundColor: '#F0FFF4',
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
  centerCheckmark: {
    marginLeft: 8,
  },

  // Date & Time
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F4F4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  dateTimeValue: {
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '500',
  },
  dateTimePlaceholder: {
    fontSize: 15,
    color: '#7F8C8D',
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

  // Action Button
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  submitButtonText: {
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
