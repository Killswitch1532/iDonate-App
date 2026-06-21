import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { useTheme } from "@/hooks/useTheme";

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

type RouteInfo = {
  coordinates: { latitude: number; longitude: number }[];
  distanceKm: number;
  durationMin: number;
};

export default function MapScreen() {
  const { colors, isDark } = useTheme();
  const styles = useStyles(colors, isDark);
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [institutions, setInstitutions] = useState<InstitutionWithDistance[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<InstitutionWithDistance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Route state
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

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

  // Fetch driving route via OSRM when a center is selected
  useEffect(() => {
    async function fetchRoute() {
      if (!selectedCenter || !userLocation) {
        setRouteInfo(null);
        return;
      }

      setRouteLoading(true);
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.longitude},${userLocation.latitude};${selectedCenter.longitude},${selectedCenter.latitude}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map((c: [number, number]) => ({
            latitude: c[1],
            longitude: c[0],
          }));
          const distanceKm = parseFloat((route.distance / 1000).toFixed(1));
          const durationMin = Math.round(route.duration / 60);

          setRouteInfo({ coordinates: coords, distanceKm, durationMin });

          // Fit map to show the full route
          if (mapRef.current && coords.length > 0) {
            mapRef.current.fitToCoordinates(coords, {
              edgePadding: { top: 80, right: 60, bottom: 300, left: 60 },
              animated: true,
            });
          }
        } else {
          // OSRM returned no route, fall back to straight line
          setRouteInfo({
            coordinates: [
              { latitude: userLocation.latitude, longitude: userLocation.longitude },
              { latitude: selectedCenter.latitude, longitude: selectedCenter.longitude },
            ],
            distanceKm: selectedCenter.distance,
            durationMin: 0,
          });
        }
      } catch (err) {
        console.error("[iDonate:Map] OSRM routing error:", err);
        // Fall back to straight line on error
        setRouteInfo({
          coordinates: [
            { latitude: userLocation.latitude, longitude: userLocation.longitude },
            { latitude: selectedCenter.latitude, longitude: selectedCenter.longitude },
          ],
          distanceKm: selectedCenter.distance,
          durationMin: 0,
        });
      } finally {
        setRouteLoading(false);
      }
    }

    fetchRoute();
  }, [selectedCenter, userLocation]);

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

  // Format duration for display
  const formatDuration = (minutes: number): string => {
    if (minutes <= 0) return '';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText style={styles.loadingText}>Finding nearby donation centers...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (locationError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Ionicons name="location-outline" size={48} color={colors.iconMuted} />
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
            userInterfaceStyle={isDark ? "dark" : "light"}
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
                pinColor={inst.institution_type === "blood_bank" ? colors.accent : colors.primary}
                onPress={() => focusMarker(inst)}
              />
            ))}

            {/* Driving route polyline from OSRM */}
            {routeInfo && routeInfo.coordinates.length > 0 && (
              <Polyline
                coordinates={routeInfo.coordinates}
                strokeColor={colors.accent}
                strokeWidth={4}
              />
            )}
          </MapView>
        )}

        {/* Floating header */}
        <View style={styles.floatingHeader}>
          <View style={styles.headerPill}>
            <Ionicons name="heart" size={18} color={colors.primary} />
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
            <MaterialIcons name="refresh" size={22} color={refreshing ? colors.accent + '80' : colors.accent} />
          </Animated.View>
        </TouchableOpacity>

        {/* My Location FAB */}
        <TouchableOpacity style={styles.locationFab} onPress={centerOnUser}>
          <MaterialIcons name="my-location" size={22} color={colors.accent} />
        </TouchableOpacity>

        {/* Selected Center Card */}
        {selectedCenter && (
          <View style={styles.selectedCard}>
            <View style={styles.selectedCardHeader}>
              <View style={[styles.typeIcon, { backgroundColor: selectedCenter.institution_type === 'blood_bank' ? (isDark ? '#1E3A8A' : '#DBEAFE') : (isDark ? '#7F1D1D' : '#FEE2E2') }]}>
                <Ionicons
                  name={selectedCenter.institution_type === 'blood_bank' ? 'water' : 'medkit'}
                  size={20}
                  color={selectedCenter.institution_type === 'blood_bank' ? (isDark ? '#60A5FA' : '#2563EB') : (isDark ? '#FCA5A5' : '#DC2626')}
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

            {/* Route info row */}
            {routeLoading ? (
              <View style={styles.routeInfoRow}>
                <ActivityIndicator size="small" color={colors.accent} />
                <ThemedText style={styles.routeInfoText}>Calculating route...</ThemedText>
              </View>
            ) : routeInfo && routeInfo.durationMin > 0 ? (
              <View style={styles.routeInfoRow}>
                <MaterialIcons name="directions-car" size={16} color={colors.accent} />
                <ThemedText style={styles.routeInfoText}>
                  {routeInfo.distanceKm} km · {formatDuration(routeInfo.durationMin)} drive
                </ThemedText>
              </View>
            ) : null}

            <View style={styles.selectedCardActions}>
              <TouchableOpacity
                style={styles.directionsBtn}
                onPress={() => openDirections(selectedCenter)}
              >
                <MaterialIcons name="directions" size={18} color={colors.accent} />
                <ThemedText style={styles.directionsBtnText}>Directions</ThemedText>
              </TouchableOpacity>
              {selectedCenter.phone && (
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => callCenter(selectedCenter.phone!)}
                >
                  <Ionicons name="call" size={16} color={colors.surface} />
                  <ThemedText style={styles.callBtnText}>Call</ThemedText>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedCenter(null)}
              >
                <MaterialIcons name="close" size={18} color={colors.icon} />
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
                <Ionicons name="search-outline" size={32} color={colors.iconMuted} />
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
                    <View style={[styles.centerIcon, { backgroundColor: inst.institution_type === 'blood_bank' ? (isDark ? '#1E3A8A' : '#DBEAFE') : (isDark ? '#7F1D1D' : '#FEE2E2') }]}>
                      <Ionicons
                        name={inst.institution_type === 'blood_bank' ? 'water' : 'medkit'}
                        size={18}
                        color={inst.institution_type === 'blood_bank' ? (isDark ? '#60A5FA' : '#2563EB') : (isDark ? '#FCA5A5' : '#DC2626')}
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
                      <MaterialIcons name="chevron-right" size={16} color={colors.iconMuted} />
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

const useStyles = (colors: any, isDark: boolean) => useMemo(() => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.textSecondary,
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.primary,
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
    backgroundColor: colors.card,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.textSecondary,
  },

  // FABs
  refreshFab: {
    position: "absolute",
    right: 16,
    bottom: 340,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.15,
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
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.15,
    shadowRadius: 6,
    elevation: 5,
  },

  // Selected card overlay
  selectedCard: {
    position: "absolute",
    bottom: 260,
    left: 16,
    right: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.15,
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
    color: colors.textPrimary,
    marginBottom: 2,
  },
  selectedCardAddress: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  distancePill: {
    backgroundColor: colors.success + '20',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.success,
  },

  // Route info
  routeInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.accent + '15',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  routeInfoText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
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
    backgroundColor: colors.accent + '15',
    borderRadius: 10,
    paddingVertical: 10,
  },
  directionsBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accent,
  },
  callBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
  },
  callBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.surface,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.borderLight,
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
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  bottomSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 12,
  },
  bottomSheetTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.textPrimary,
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
    backgroundColor: isDark ? colors.background : "#FAFAFA",
  },
  centerCardSelected: {
    backgroundColor: colors.accent + '15',
    borderWidth: 1,
    borderColor: colors.accent + '50',
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
    color: colors.textPrimary,
    marginBottom: 2,
  },
  centerAddress: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  centerDistance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  centerDistanceText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  // Empty state
  emptyState: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
}), [colors, isDark]);
