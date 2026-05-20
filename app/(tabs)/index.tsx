import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Location from "expo-location";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { ThemedText } from "@/components/themed-text";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { getDonorProfile } from "@/services/donorService";
import { getNearbyInstitutionCount, getNearbyInstitutions } from "@/services/institutionService";
import { getActiveRequests } from "@/services/requestService";
import { getDonorDonations, getDonorRequestStatuses, DonationStatus } from "@/services/donationService";

// Status config for visual indicators on home cards
const STATUS_CONFIG: Record<DonationStatus, { label: string; color: string; bg: string; borderColor: string; cardBg: string }> = {
  scheduled: { label: 'Scheduled', color: '#2563EB', bg: '#DBEAFE', borderColor: '#93C5FD', cardBg: '#EFF6FF' },
  confirmed: { label: 'Confirmed', color: '#D97706', bg: '#FEF3C7', borderColor: '#FDE68A', cardBg: '#FFFBEB' },
  completed: { label: 'Donated', color: '#16A34A', bg: '#DCFCE7', borderColor: '#BBF7D0', cardBg: '#F0FDF4' },
  cancelled: { label: 'Cancelled', color: '#64748B', bg: '#F1F5F9', borderColor: '#E2E8F0', cardBg: '#F8FAFC' },
  no_show: { label: 'No Show', color: '#64748B', bg: '#F1F5F9', borderColor: '#E2E8F0', cardBg: '#F8FAFC' },
};

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { newCount } = useNotifications();

  const [bloodType, setBloodType] = useState<string | null>(null);
  const [nearbyCenters, setNearbyCenters] = useState<{ count: number; radiusKm: number } | null>(null);
  const [nearbyInstitutions, setNearbyInstitutions] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [requestStatuses, setRequestStatuses] = useState<Map<string, DonationStatus>>(new Map());
  const [loading, setLoading] = useState(true);


  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function fetchData() {
        setLoading(true);

        // Fetch blood type
        const bloodTypePromise = (async () => {
          if (!user?.id) return;
          const { data } = await getDonorProfile(user.id);
          if (!cancelled && data?.blood_type) {
            setBloodType(data.blood_type);
          }
        })();

        // Fetch active requests
        const requestsPromise = (async () => {
          try {
            const { data } = await getActiveRequests();
            if (!cancelled && data) setRequests(data.slice(0, 5));
          } catch (e) {
            console.error('[iDonate:Home] Requests error', e);
          }
        })();

        // Fetch user's donations + request statuses
        const donationsPromise = (async () => {
          if (!user?.id) return;
          try {
            const [donationsResult, statusesResult] = await Promise.all([
              getDonorDonations(user.id),
              getDonorRequestStatuses(user.id),
            ]);
            if (!cancelled && donationsResult.data) {
              const upcoming = donationsResult.data.filter((d: any) => d.status === 'scheduled' || d.status === 'confirmed');
              setDonations(upcoming.slice(0, 3));
            }
            if (!cancelled) {
              setRequestStatuses(statusesResult.statuses);
            }
          } catch (e) {
            console.error('[iDonate:Home] Donations error', e);
          }
        })();

        // Fetch nearby centers
        const nearbyPromise = (async () => {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") return;
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const [countResult, listResult] = await Promise.all([
              getNearbyInstitutionCount(loc.coords.latitude, loc.coords.longitude),
              getNearbyInstitutions(loc.coords.latitude, loc.coords.longitude, 10),
            ]);
            if (!cancelled) {
              if (!countResult.error) setNearbyCenters({ count: countResult.count, radiusKm: countResult.radiusKm });
              if (listResult.data) setNearbyInstitutions(listResult.data.slice(0, 5));
            }
          } catch (e) {
            console.error('[iDonate:Home] Nearby centers error', e);
          }
        })();

        await Promise.all([bloodTypePromise, requestsPromise, donationsPromise, nearbyPromise]);
        if (!cancelled) setLoading(false);
      }

      fetchData();
      return () => { cancelled = true; };
    }, [user?.id])
  );
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.logoContainer}>
              <MaterialIcons
                name="favorite"
                size={24}
                color="#E74C3C"
                style={styles.heartIcon}
              />
              <ThemedText type="logo" style={styles.logoText}>
                iDonate
              </ThemedText>
            </View>

            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => router.push("/notifications")}
            >
              <MaterialIcons name="notifications-none" size={28} color="#2C3E50" />
              {newCount > 0 && (
                <View style={styles.notificationBadge}>
                  <ThemedText style={styles.badgeText}>{newCount}</ThemedText>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <ThemedText style={styles.tagline}>
            Care. Connect. Save lives.
          </ThemedText>

          <TouchableOpacity
            style={styles.searchBox}
            onPress={() => router.push("/search")}
          >
            <MaterialIcons
              name="search"
              size={20}
              color="#7F8C8D"
              style={styles.searchIcon}
            />
            <ThemedText style={styles.searchPlaceholder}>
              Search hospitals, blood banks, requests
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Donate or Request Section */}
        <Card style={styles.donateRequestCard}>
          <View style={styles.cardContent}>
            <ThemedText style={styles.sectionTitle}>
              Donate or Request
            </ThemedText>
            <ThemedText style={styles.sectionSubtitle}>
              Fast matching by blood type and location.
            </ThemedText>
            <View style={styles.buttonsRow}>
              <Button
                style={styles.donateButton}
                onPress={() => router.push("/donate-blood")}
              >
                Donate Blood
              </Button>
              <Button
                variant="secondary"
                style={styles.requestButton}
                onPress={() => router.push("/request-blood")}
              >
                Request Blood
              </Button>
            </View>
          </View>
          <View style={styles.bloodCellImage}>
            <MaterialIcons
              name="water-drop"
              size={40}
              color="#E74C3C"
              style={styles.bloodCellIcon}
            />
          </View>
        </Card>

        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <ThemedText style={styles.summaryLabel}>Nearby centers</ThemedText>
            <View style={styles.summaryContent}>
              <MaterialIcons
                name="location-on"
                size={20}
                color="#7F8C8D"
                style={styles.summaryIcon}
              />
              {loading ? (
                <ActivityIndicator size="small" color="#7F8C8D" />
              ) : (
                <ThemedText style={styles.summaryText}>
                  {nearbyCenters
                    ? `${nearbyCenters.count} within ${nearbyCenters.radiusKm}km`
                    : "—"}
                </ThemedText>
              )}
            </View>
          </View>
          <View style={styles.summaryCard}>
            <ThemedText style={styles.summaryLabel}>Your blood type</ThemedText>
            <View style={styles.summaryContent}>
              <MaterialIcons
                name="water-drop"
                size={20}
                color="#E74C3C"
                style={styles.summaryIcon}
              />
              {loading ? (
                <ActivityIndicator size="small" color="#E74C3C" />
              ) : (
                <ThemedText style={styles.summaryText}>
                  {bloodType ?? "Not set"}
                </ThemedText>
              )}
            </View>
          </View>
        </View>

        {/* Active Blood Requests */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Blood requests</ThemedText>
          <TouchableOpacity
            style={styles.requestsButton}
            onPress={() => router.navigate("/(tabs)/requests")}
          >
            <ThemedText style={styles.requestsButtonText}>View all</ThemedText>
          </TouchableOpacity>
        </View>

        {(() => {
          const HIDDEN_STATUSES = new Set(['completed', 'cancelled', 'no_show']);
          const visibleRequests = requests.filter(r => !HIDDEN_STATUSES.has(requestStatuses.get(r.id) as string));
          return loading ? (
          <ActivityIndicator size="small" color="#E74C3C" style={{ marginBottom: 16 }} />
        ) : visibleRequests.length === 0 ? (
          <View style={styles.requestCard}>
            <ThemedText style={{ color: '#7F8C8D', textAlign: 'center', padding: 8 }}>
              No active requests right now
            </ThemedText>
          </View>
        ) : (
          <>
            {visibleRequests.map((req: any) => {
              const urgencyColors: Record<string, string> = {
                critical: '#E74C3C', high: '#E67E22', moderate: '#F1C40F', low: '#27AE60',
              };
              const timeAgo = getTimeAgo(req.created_at);
              const isOwnRequest = user?.id === req.requester_id;
              const requesterName = isOwnRequest ? 'You' : (req.institution_name || req.profiles?.full_name || 'Unknown');
              const donationStatus = requestStatuses.get(req.id);
              const statusCfg = donationStatus ? STATUS_CONFIG[donationStatus] : null;
              return (
                <TouchableOpacity
                  key={req.id}
                  style={[styles.requestCard, statusCfg && { backgroundColor: statusCfg.cardBg, borderWidth: 1.5, borderColor: statusCfg.borderColor }]}
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/blood-request/[id]', params: { id: req.id } } as any)}
                >
                  <View style={styles.requestRow}>
                    <View style={[styles.avatar, { backgroundColor: statusCfg ? statusCfg.color : (urgencyColors[req.urgency_level] || '#E74C3C') }]}>
                      {donationStatus === 'completed' ? (
                        <MaterialIcons name="check" size={20} color="#FFF" />
                      ) : donationStatus === 'cancelled' ? (
                        <MaterialIcons name="close" size={20} color="#FFF" />
                      ) : (
                        <ThemedText style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>
                          {req.blood_type_needed}
                        </ThemedText>
                      )}
                    </View>
                    <View style={styles.requestContent}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ThemedText style={styles.requestTitle} numberOfLines={1}>
                          {requesterName}
                        </ThemedText>
                        {isOwnRequest && (
                          <View style={styles.ownRequestBadge}>
                            <ThemedText style={styles.ownRequestBadgeText}>Your Request</ThemedText>
                          </View>
                        )}
                        {statusCfg && (
                          <View style={[styles.statusMiniTag, { backgroundColor: statusCfg.bg }]}>
                            <ThemedText style={[styles.statusMiniTagText, { color: statusCfg.color }]}>{statusCfg.label}</ThemedText>
                          </View>
                        )}
                      </View>
                      <ThemedText style={styles.requestSubtitle}>
                        {req.blood_type_needed} · {req.units_needed} unit{req.units_needed > 1 ? 's' : ''} · {timeAgo}
                      </ThemedText>
                      {req.description ? (
                        <ThemedText style={{ fontSize: 12, color: '#95A5A6', marginTop: 2 }} numberOfLines={1}>
                          {req.description}
                        </ThemedText>
                      ) : req.date_needed ? (
                        <ThemedText style={{ fontSize: 12, color: '#95A5A6', marginTop: 2 }}>
                          Needed by {new Date(req.date_needed).toLocaleDateString()}
                        </ThemedText>
                      ) : null}
                    </View>
                    <View style={[styles.matchingStatus, { backgroundColor: statusCfg ? statusCfg.bg : urgencyColors[req.urgency_level] + '20' }]}>
                      <ThemedText style={[styles.statusText, { color: statusCfg ? statusCfg.color : urgencyColors[req.urgency_level] }]}>
                        {statusCfg ? statusCfg.label.toLowerCase() : req.urgency_level}
                      </ThemedText>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        );
        })()}

        {/* Nearby Donation Centers */}
        <View style={styles.mapSection}>
          <View style={styles.mapHeader}>
            <ThemedText style={styles.sectionTitle}>
              Nearby donation centers
            </ThemedText>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#7F8C8D" style={{ marginVertical: 20 }} />
          ) : nearbyInstitutions.length === 0 ? (
            <View style={styles.mapPlaceholder}>
              <MaterialIcons name="location-off" size={32} color="#BDC3C7" />
              <ThemedText style={[styles.mapText, { marginTop: 8 }]}>No institutions found nearby</ThemedText>
            </View>
          ) : (
            nearbyInstitutions.map((inst: any) => (
              <TouchableOpacity
                key={inst.id}
                style={styles.institutionCard}
                onPress={() => { /* TODO: navigate to institution detail */ }}
              >
                <View style={styles.institutionIconWrap}>
                  <MaterialIcons
                    name={inst.institution_type === 'blood_bank' ? 'water-drop' : 'local-hospital'}
                    size={24}
                    color={inst.institution_type === 'blood_bank' ? '#E74C3C' : '#4A90E2'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.institutionName}>{inst.institution_name}</ThemedText>
                  <ThemedText style={styles.institutionDetail}>
                    {inst.address || 'No address'} · {inst.distance} km away
                  </ThemedText>
                </View>
                <View style={styles.institutionTypeBadge}>
                  <ThemedText style={styles.institutionTypeText}>
                    {inst.institution_type === 'blood_bank' ? 'Blood Bank' : 'Hospital'}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            ))
          )}

          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <ThemedText style={styles.liveText}>
              Live availability updates
            </ThemedText>
          </View>
        </View>

        {/* Blood Compatibility */}
        <ThemedText style={styles.sectionTitle}>Blood compatibility</ThemedText>
        <View style={styles.compatibilityGrid}>
          {[
            { type: "O-", compatibility: "Donate to All" },
            { type: "O+", compatibility: "Donate to O+, A+, B+, AB+" },
            { type: "A-", compatibility: "To A-, A+, AB-, AB+" },
            { type: "A+", compatibility: "To A+, AB+" },
            { type: "B-", compatibility: "To B-, B+, AB-, AB+" },
            { type: "B+", compatibility: "To B+, AB+" },
            { type: "AB-", compatibility: "To AB-, AB+" },
            { type: "AB+", compatibility: "Receive from All" },
          ].map((item) => (
            <View key={item.type} style={styles.compatibilityCard}>
              <ThemedText style={styles.bloodType}>{item.type}</ThemedText>
              <ThemedText style={styles.compatibilityText}>
                {item.compatibility}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Bottom spacer for tab bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
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
    backgroundColor: "#F8F4F4",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100, // Space for tab bar
  },

  // Header styles
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: "#F8F4F4",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  heartIcon: {
    marginRight: 8,
  },
  logoText: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "bold",
    color: "#2C3E50",
  },
  notificationButton: {
    position: 'relative',
    padding: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F8F4F4',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tagline: {
    fontSize: 14,
    color: "#7F8C8D",
    marginBottom: 16,
  },
  searchBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  searchIcon: {
    marginRight: 12,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: "#7F8C8D",
  },
  searchActionIcon: {
    fontSize: 18,
    color: "#7F8C8D",
    marginLeft: 8,
  },

  // Donate/Request section
  donateRequestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardContent: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2C3E50",
  },
  requestsButton: {
    backgroundColor: "#4A90E2",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  requestsButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#7F8C8D",
    marginBottom: 16,
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  donateButton: {
    backgroundColor: "#E74C3C",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
  },
  donateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  requestButton: {
    backgroundColor: "#E8F4FD",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
  },
  requestButtonText: {
    color: "#2C3E50",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  bloodCellImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#F8F4F4",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
  },
  bloodCellIcon: {
    // Icon styling handled by MaterialIcons component
  },

  // Summary cards
  summaryCards: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#7F8C8D",
    marginBottom: 8,
  },
  summaryContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryIcon: {
    marginRight: 8,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
  },

  // Requests section
  requestCard: {
    backgroundColor: "#E8F4FD",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F8F4F4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarIcon: {
    // Icon styling handled by MaterialIcons component
  },
  requestContent: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 4,
  },
  ownRequestBadge: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93C5FD',
    marginBottom: 4,
  },
  ownRequestBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2563EB',
    textTransform: 'uppercase',
  },
  requestSubtitle: {
    fontSize: 14,
    color: "#7F8C8D",
  },
  matchingStatus: {
    backgroundColor: "#FFE5E5",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scheduledStatus: {
    backgroundColor: "#E8F4FD",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E74C3C",
  },

  // Map section
  mapSection: {
    marginBottom: 24,
  },
  mapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  filterButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  filterIcon: {
    marginRight: 4,
  },
  filterText: {
    fontSize: 14,
    color: "#2C3E50",
    fontWeight: "500",
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: "#E8F4FD",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  mapText: {
    fontSize: 16,
    color: "#7F8C8D",
  },
  mapButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  mapButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  mapButtonIcon: {
    marginBottom: 4,
  },
  mapButtonText: {
    fontSize: 12,
    color: "#2C3E50",
    fontWeight: "500",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E74C3C",
    marginRight: 8,
  },
  liveText: {
    fontSize: 12,
    color: "#7F8C8D",
  },

  // Institution cards
  institutionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  institutionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0F4F8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  institutionName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 2,
  },
  institutionDetail: {
    fontSize: 12,
    color: "#7F8C8D",
  },
  institutionTypeBadge: {
    backgroundColor: "#F0F4F8",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  institutionTypeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4A90E2",
  },

  // Blood compatibility
  compatibilityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  compatibilityCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bloodType: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 8,
  },
  compatibilityText: {
    fontSize: 12,
    color: "#7F8C8D",
    textAlign: "center",
    lineHeight: 16,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 20,
  },

  // Donation status indicators
  statusMiniTag: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusMiniTagText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
