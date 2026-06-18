import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { getNearbyInstitutions } from "@/services/institutionService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type InstitutionWithDistance = {
  id: string;
  institution_name: string;
  address: string | null;
  phone?: string | null;
  institution_type?: "hospital" | "blood_bank";
  distance: number;
  latitude: number;
  longitude: number;
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [institutions, setInstitutions] = useState<InstitutionWithDistance[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<InstitutionWithDistance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Location permission denied. Please enable it in settings.");
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);

      // Fetch nearby institutions (50km radius to get plenty of results)
      const { data, error } = await getNearbyInstitutions(coords.latitude, coords.longitude, 50);

      if (!error && data) {
        const parsed: InstitutionWithDistance[] = data.map((inst: any) => ({
          id: inst.id,
          institution_name: inst.institution_name,
          address: inst.address,
          phone: inst.profiles?.phone_number || null,
          institution_type: inst.institution_type,
          distance: inst.distance,
          latitude: inst.latitude,
          longitude: inst.longitude,
        }));
        setInstitutions(parsed);
      }
    } catch (e: any) {
      console.error("[iDonate:Map] Error loading data:", e.message);
      setLocationError("Could not fetch your location. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const centerOnUser = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 500);
    }
  }, [userLocation]);

  const focusMarker = useCallback((inst: InstitutionWithDistance) => {
    setSelectedCenter(inst);
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: inst.latitude,
        longitude: inst.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 400);
    }
  }, []);

  const openDirections = (inst: InstitutionWithDistance) => {
    const destination = `${inst.latitude},${inst.longitude}`;
    const label = encodeURIComponent(inst.institution_name);
    
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${destination}&address=${label}&directionsmode=driving`,
      android: `google.navigation:q=${destination}&mode=d`,
    });
    
    if (url) {
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Fallback to Google Maps URL if native app is not available
          const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
          Linking.openURL(fallbackUrl);
        }
      }).catch(() => {
        const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
        Linking.openURL(fallbackUrl);
      });
    }
  };

  const callCenter = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E74C3C" />
          <ThemedText style={styles.loadingText}>Finding nearby donation centers...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (locationError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Ionicons name="location-outline" size={48} color="#BDC3C7" />
          <ThemedText style={styles.errorTitle}>Location Required</ThemedText>
          <ThemedText style={styles.errorText}>{locationError}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Map */}
        {userLocation && (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              ...userLocation,
              latitudeDelta: 0.06,
              longitudeDelta: 0.06,
            }}
            showsUserLocation
            showsMyLocationButton={false}
            onPress={() => setSelectedCenter(null)}
          >
            {institutions.map((inst) => (
              <Marker
                key={inst.id}
                coordinate={{ latitude: inst.latitude, longitude: inst.longitude }}
                title={inst.institution_name}
                description={`${inst.distance} km away`}
                pinColor={inst.institution_type === "blood_bank" ? "#2563EB" : "#DC2626"}
                onPress={() => focusMarker(inst)}
              />
            ))}

            {/* Polyline to show route from user to selected center */}
            {selectedCenter && userLocation && (
              <Polyline
                coordinates={[
                  { latitude: userLocation.latitude, longitude: userLocation.longitude },
                  { latitude: selectedCenter.latitude, longitude: selectedCenter.longitude }
                ]}
                strokeColor="#DC2626"
                strokeWidth={4}
                lineDashPattern={[10, 5]}
              />
            )}
          </MapView>
        )}

        {/* Floating header */}
        <View style={styles.floatingHeader}>
          <View style={styles.headerPill}>
            <Ionicons name="heart" size={18} color="#DC2626" />
            <ThemedText style={styles.headerTitle}>Donation Centers</ThemedText>
            <View style={styles.countBadge}>
              <ThemedText style={styles.countText}>{institutions.length}</ThemedText>
            </View>
          </View>
        </View>

        {/* Refresh FAB */}
        <TouchableOpacity
          style={styles.refreshFab}
          onPress={() => {
            setRefreshing(true);
            Animated.loop(
              Animated.timing(spinAnim, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true })
            ).start();
            loadData().finally(() => {
              spinAnim.stopAnimation();
              spinAnim.setValue(0);
              setRefreshing(false);
            });
          }}
          disabled={refreshing}
        >
          <Animated.View style={{ transform: [{ rotate: spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
            <MaterialIcons name="refresh" size={22} color={refreshing ? '#93C5FD' : '#2563EB'} />
          </Animated.View>
        </TouchableOpacity>

        {/* My Location FAB */}
        <TouchableOpacity style={styles.locationFab} onPress={centerOnUser}>
          <MaterialIcons name="my-location" size={22} color="#2563EB" />
        </TouchableOpacity>

        {/* Selected Center Card */}
        {selectedCenter && (
          <View style={styles.selectedCard}>
            <View style={styles.selectedCardHeader}>
              <View style={[styles.typeIcon, { backgroundColor: selectedCenter.institution_type === 'blood_bank' ? '#DBEAFE' : '#FEE2E2' }]}>
                <Ionicons
                  name={selectedCenter.institution_type === 'blood_bank' ? 'water' : 'medkit'}
                  size={20}
                  color={selectedCenter.institution_type === 'blood_bank' ? '#2563EB' : '#DC2626'}
                />
              </View>
              <View style={styles.selectedCardInfo}>
                <ThemedText style={styles.selectedCardName} numberOfLines={1}>
                  {selectedCenter.institution_name}
                </ThemedText>
                <ThemedText style={styles.selectedCardAddress} numberOfLines={1}>
                  {selectedCenter.address || "Address not available"}
                </ThemedText>
              </View>
              <View style={styles.distancePill}>
                <ThemedText style={styles.distanceText}>{selectedCenter.distance} km</ThemedText>
              </View>
            </View>
            <View style={styles.selectedCardActions}>
              <TouchableOpacity
                style={styles.directionsBtn}
                onPress={() => openDirections(selectedCenter)}
              >
                <MaterialIcons name="directions" size={18} color="#2563EB" />
                <ThemedText style={styles.directionsBtnText}>Directions</ThemedText>
              </TouchableOpacity>
              {selectedCenter.phone && (
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => callCenter(selectedCenter.phone!)}
                >
                  <Ionicons name="call" size={16} color="#FFF" />
                  <ThemedText style={styles.callBtnText}>Call</ThemedText>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedCenter(null)}
              >
                <MaterialIcons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Bottom Sheet - Nearby list */}
        <View style={styles.bottomSheet}>
          <View style={styles.bottomSheetHandle} />
          <ThemedText style={styles.bottomSheetTitle}>Nearby Centers</ThemedText>
          <ScrollView
            style={styles.centersList}
            contentContainerStyle={styles.centersListContent}
            showsVerticalScrollIndicator={false}
          >
            {institutions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={32} color="#BDC3C7" />
                <ThemedText style={styles.emptyText}>No donation centers found nearby</ThemedText>
              </View>
            ) : (
              institutions.map((inst) => {
                const isSelected = selectedCenter?.id === inst.id;
                return (
                  <TouchableOpacity
                    key={inst.id}
                    style={[styles.centerCard, isSelected && styles.centerCardSelected]}
                    activeOpacity={0.7}
                    onPress={() => focusMarker(inst)}
                  >
                    <View style={[styles.centerIcon, { backgroundColor: inst.institution_type === 'blood_bank' ? '#DBEAFE' : '#FEE2E2' }]}>
                      <Ionicons
                        name={inst.institution_type === 'blood_bank' ? 'water' : 'medkit'}
                        size={18}
                        color={inst.institution_type === 'blood_bank' ? '#2563EB' : '#DC2626'}
                      />
                    </View>
                    <View style={styles.centerInfo}>
                      <ThemedText style={styles.centerName} numberOfLines={1}>
                        {inst.institution_name}
                      </ThemedText>
                      <ThemedText style={styles.centerAddress} numberOfLines={1}>
                        {inst.address || "No address listed"}
                      </ThemedText>
                    </View>
                    <View style={styles.centerDistance}>
                      <ThemedText style={styles.centerDistanceText}>{inst.distance} km</ThemedText>
                      <MaterialIcons name="chevron-right" size={16} color="#BDC3C7" />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F4F4",
  },
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },

  // Loading / Error
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: "#7F8C8D",
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2C3E50",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#7F8C8D",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#DC2626",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Floating header
  floatingHeader: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    alignItems: "center",
  },
  headerPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E293B",
  },
  countBadge: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#64748B",
  },

  // FABs
  refreshFab: {
    position: "absolute",
    right: 16,
    bottom: 340,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  locationFab: {
    position: "absolute",
    right: 16,
    bottom: 280,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },

  // Selected card overlay
  selectedCard: {
    position: "absolute",
    bottom: 260,
    left: 16,
    right: 16,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  selectedCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedCardInfo: {
    flex: 1,
  },
  selectedCardName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 2,
  },
  selectedCardAddress: {
    fontSize: 13,
    color: "#64748B",
  },
  distancePill: {
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#16A34A",
  },
  selectedCardActions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  directionsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingVertical: 10,
  },
  directionsBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  callBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#DC2626",
    borderRadius: 10,
    paddingVertical: 10,
  },
  callBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },

  // Bottom sheet
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 240,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  bottomSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 12,
  },
  bottomSheetTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E293B",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  centersList: {
    flex: 1,
  },
  centersListContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  // Center cards in list
  centerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: "#FAFAFA",
  },
  centerCardSelected: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#93C5FD",
  },
  centerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  centerInfo: {
    flex: 1,
  },
  centerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  centerAddress: {
    fontSize: 12,
    color: "#64748B",
  },
  centerDistance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  centerDistanceText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7F8C8D",
  },

  // Empty state
  emptyState: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#7F8C8D",
    marginTop: 8,
  },
});
