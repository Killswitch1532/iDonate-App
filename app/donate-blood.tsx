import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, ActivityIndicator, Linking, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';

// react-native-maps requires a dev build — gracefully degrade in Expo Go
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let mapsAvailable = false;
try {
  const maps = require('react-native-maps');
  if (maps) {
    MapView = maps.default || maps.MapView || maps;
    Marker = maps.Marker;
    Polyline = maps.Polyline;
    mapsAvailable = !!MapView && !!Marker;
  }
} catch (e) {
  console.log('[iDonate:DonateBlood] Maps module not available, falling back to static view');
}
const GOOGLE_MAPS_APIKEY = Constants.expoConfig?.android?.config?.googleMaps?.apiKey || '';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import { getDonorProfile, upsertDonorProfile, getCooldownStatus } from '@/services/donorService';
import { Institution, getNearbyInstitutions } from '@/services/institutionService';
import { bookDonation, getAvailableSlots } from '@/services/donationService';

export default function DonateBloodScreen() {
  const { user } = useAuth();
  const [selectedBloodType, setSelectedBloodType] = useState<string>('');
  const [selectedRadius, setSelectedRadius] = useState<string>('10 km');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [realCenters, setRealCenters] = useState<(Institution & { distance: number; latitude: number; longitude: number })[]>([]);
  const [isSavingBloodType, setIsSavingBloodType] = useState<boolean>(false);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const mapRef = useRef<any>(null);

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
  const [cooldownStatus, setCooldownStatus] = useState<{ isEligible: boolean; nextEligibleDate: Date | null; daysRemaining: number }>({ isEligible: true, nextEligibleDate: null, daysRemaining: 0 });

  // Slots state
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const loadSlots = useCallback(async (centerId: string, date: Date) => {
    setSlotsLoading(true);
    try {
      const { data, error } = await getAvailableSlots(centerId, date);
      if (error) {
        console.error('[iDonate:DonateBlood] Error loading slots:', error);
        setAvailableSlots([]);
      } else {
        setAvailableSlots(data || []);
      }
    } catch (err) {
      console.error('[iDonate:DonateBlood] Error loading slots:', err);
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCenter) {
      setSelectedSlotId(null);
      setTimeChosen(false);
      loadSlots(selectedCenter, selectedDate);
    } else {
      setAvailableSlots([]);
      setSelectedSlotId(null);
      setTimeChosen(false);
    }
  }, [selectedCenter, selectedDate.toDateString(), loadSlots]);

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
        // Check cooldown
        if (profile) {
          setCooldownStatus(getCooldownStatus(profile));
        }

        // Fetch Institutions (Centers) - Use nearby service if coords available
        const radiusNum = parseInt(selectedRadius);
        if (locationCoords) {
          const { data: institutions, error: instError } = await getNearbyInstitutions(
            locationCoords.latitude,
            locationCoords.longitude,
            radiusNum
          );
          if (instError) throw instError;
          setRealCenters(institutions || []);
        } else {
          // No location yet, wait for detectLocation to trigger another load or just show nothing yet
          setRealCenters([]);
        }

      } catch (err: any) {
        console.error('[iDonate:DonateBlood] Error loading data:', err);
        setError(err.message || 'Failed to load donation data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, locationCoords, selectedRadius]);

  // Fit map to show all centers when they load
  useEffect(() => {
    if (mapsAvailable && mapRef.current && realCenters.length > 0 && locationCoords) {
      const coordinates = [
        { latitude: locationCoords.latitude, longitude: locationCoords.longitude },
        ...realCenters.map(c => ({ latitude: c.latitude, longitude: c.longitude }))
      ];
      
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [realCenters]);

  // Fetch route when a center is selected
  useEffect(() => {
    async function fetchRoute() {
      if (!selectedCenter || !locationCoords || !mapsAvailable) {
        setRouteCoords([]);
        return;
      }

      const center = realCenters.find(c => c.id === selectedCenter);
      if (!center) return;

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${locationCoords.longitude},${locationCoords.latitude};${center.longitude},${center.latitude}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map((c: any) => ({
            latitude: c[1],
            longitude: c[0],
          }));
          setRouteCoords(coords);

          // Fit map to route
          if (mapRef.current) {
            mapRef.current.fitToCoordinates(coords, {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true,
            });
          }
        }
      } catch (err) {
        console.error('[iDonate:DonateBlood] OSRM routing error:', err);
      }
    }

    fetchRoute();
  }, [selectedCenter, locationCoords]);

  const handleSetBloodType = async (type: string) => {
    if (!user) return;
    setIsSavingBloodType(true);
    try {
      const { error: updateError } = await upsertDonorProfile(user.id, { blood_type: type });
      if (updateError) throw updateError;
      setSelectedBloodType(type);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to update blood type. Please try again.');
    } finally {
      setIsSavingBloodType(false);
    }
  };

  const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

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
            {/* Cooldown Banner */}
            {!cooldownStatus.isEligible && (
              <View style={styles.cooldownBanner}>
                <MaterialIcons name="hourglass-empty" size={28} color="#D97706" />
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.cooldownTitle}>Donation Cooldown Active</ThemedText>
                  <ThemedText style={styles.cooldownText}>
                    You recently completed a donation. Based on platform safety rules, you will be eligible to donate again on{' '}
                    {cooldownStatus.nextEligibleDate?.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}.
                  </ThemedText>
                  <ThemedText style={styles.cooldownDays}>
                    {cooldownStatus.daysRemaining} day{cooldownStatus.daysRemaining !== 1 ? 's' : ''} remaining
                  </ThemedText>
                </View>
              </View>
            )}
            {/* Donation Details Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="water-drop" size={20} color="#E74C3C" style={styles.sectionIcon} />
                <ThemedText style={styles.sectionTitle}>Donation Details</ThemedText>
              </View>

              <View style={styles.bloodTypeBadgeRow}>
                <MaterialIcons name="water-drop" size={20} color="#E74C3C" style={styles.sectionIcon} />
                <ThemedText style={styles.bloodTypeBadgeLabel}>Your blood type</ThemedText>
                <View style={[styles.bloodTypeBadge, isSavingBloodType && { opacity: 0.5 }]}>
                  <ThemedText style={styles.bloodTypeBadgeText}>
                    {selectedBloodType || '—'}
                  </ThemedText>
                </View>
                {isSavingBloodType && <ActivityIndicator size="small" color="#E74C3C" style={{ marginLeft: 8 }} />}
              </View>

              {!selectedBloodType && !isSavingBloodType && (
                <View style={styles.bloodTypeSelection}>
                  <ThemedText style={styles.bloodTypeSelectionLabel}>
                    Select your blood type to get started:
                  </ThemedText>
                  <View style={styles.bloodTypeGrid}>
                    {BLOOD_TYPES.map(type => (
                      <TouchableOpacity
                        key={type}
                        style={styles.bloodTypeOption}
                        onPress={() => handleSetBloodType(type)}
                      >
                        <ThemedText style={styles.bloodTypeOptionText}>{type}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

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
                {locationCoords && mapsAvailable && MapView && Marker ? (
                  <MapView
                    ref={mapRef}
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
                    {/* Directions route */}
                    {routeCoords.length > 0 && Polyline && (
                      <Polyline
                        coordinates={routeCoords}
                        strokeWidth={4}
                        strokeColor="#4A90E2"
                      />
                    )}

                    {/* Institution center markers */}
                    {realCenters.map((center) => (
                      <Marker
                        key={center.id}
                        coordinate={{
                          latitude: center.latitude,
                          longitude: center.longitude,
                        }}
                        title={center.institution_name}
                        description={center.address || ''}
                        pinColor={(center as any).profiles?.user_type === 'blood_bank' ? '#E74C3C' : '#4A90E2'}
                        onPress={() => setSelectedCenter(center.id)}
                      />
                    ))}
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
                          {center.distance != null ? `${center.distance} km away` : (center.address || 'Address not listed')}
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

              {!selectedCenter ? (
                <ThemedText style={styles.emptyText}>Please select a donation center first to choose a date and view available slots.</ThemedText>
              ) : (
                <>
                  <View style={styles.dateTimeRow}>
                    <TouchableOpacity
                      style={[styles.dateTimeButton, { flex: 0, width: '100%' }]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <MaterialIcons name="calendar-today" size={20} color="#4A90E2" />
                      <ThemedText style={dateChosen ? styles.dateTimeValue : styles.dateTimePlaceholder}>
                        {dateChosen ? selectedDate.toLocaleDateString() : 'Select date'}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>

                  <ThemedText style={styles.slotsLabel}>Available Slots</ThemedText>

                  {slotsLoading ? (
                    <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#4A90E2" />
                    </View>
                  ) : !dateChosen ? (
                    <ThemedText style={styles.emptyText}>Choose a date above to check slot availability.</ThemedText>
                  ) : availableSlots.length === 0 ? (
                    <ThemedText style={[styles.emptyText, { color: '#C0392B' }]}>
                      No slots configured or available for this day. Please select another date.
                    </ThemedText>
                  ) : (
                    <View style={styles.slotsContainer}>
                      {availableSlots.map((slot) => {
                        const isSelected = selectedSlotId === slot.id;
                        const isFull = slot.slots_left <= 0;
                        const startTimeStr = slot.start_time ? slot.start_time.substring(0, 5) : '';
                        const endTimeStr = slot.end_time ? slot.end_time.substring(0, 5) : '';

                        return (
                          <TouchableOpacity
                            key={slot.id}
                            style={[
                              styles.slotButton,
                              isSelected && styles.slotButtonSelected,
                              isFull && !isSelected && styles.slotButtonBusy,
                            ]}
                            onPress={() => {
                              setSelectedSlotId(slot.id);
                              if (slot.start_time) {
                                const [hours, minutes] = slot.start_time.split(':').map(Number);
                                setSelectedDate(prev => {
                                  const updated = new Date(prev);
                                  updated.setHours(hours, minutes, 0, 0);
                                  return updated;
                                });
                                setTimeChosen(true);
                              }
                            }}
                          >
                            <ThemedText style={[styles.slotTimeText, isSelected && styles.slotTimeTextSelected, isFull && !isSelected && { color: '#92400E' }]}>
                              {startTimeStr} - {endTimeStr}
                            </ThemedText>
                            <ThemedText
                              style={[
                                styles.slotCapacityText,
                                isSelected && styles.slotCapacityTextSelected,
                                isFull && !isSelected && styles.slotCapacityTextBusy,
                                isFull && isSelected && styles.slotCapacityTextSelected,
                              ]}
                            >
                              {isFull ? 'High Demand' : `${slot.slots_left} slot${slot.slots_left !== 1 ? 's' : ''} left`}
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </>
              )}

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
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!selectedCenter || !dateChosen || !timeChosen || booking || !cooldownStatus.isEligible) && styles.submitButtonDisabled,
              ]}
              disabled={!selectedCenter || !dateChosen || !timeChosen || booking || !cooldownStatus.isEligible}
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
  bloodTypeSelection: {
    backgroundColor: '#FDF2F2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  bloodTypeSelectionLabel: {
    fontSize: 14,
    color: '#E74C3C',
    fontWeight: '600',
    marginBottom: 12,
  },
  bloodTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bloodTypeOption: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E74C3C',
    borderRadius: 8,
    width: '22%',
    aspectRatio: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bloodTypeOptionText: {
    color: '#E74C3C',
    fontWeight: 'bold',
    fontSize: 16,
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

  // Cooldown Banner
  cooldownBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  cooldownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 4,
  },
  cooldownText: {
    fontSize: 14,
    color: '#A16207',
    lineHeight: 20,
  },
  cooldownDays: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginTop: 4,
  },
  slotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  slotButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotButtonSelected: {
    borderColor: '#27AE60',
    backgroundColor: '#F0FFF4',
  },
  slotButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E8E8E8',
    opacity: 0.6,
  },
  slotButtonBusy: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  slotTimeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
  },
  slotTimeTextSelected: {
    color: '#27AE60',
  },
  slotCapacityText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  slotCapacityTextSelected: {
    color: '#27AE60',
    fontWeight: '500',
  },
  slotCapacityTextFull: {
    color: '#C0392B',
    fontWeight: '600',
  },
  slotCapacityTextBusy: {
    color: '#D97706',
    fontWeight: '700',
  },
  slotsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
    marginTop: 12,
  },
});
