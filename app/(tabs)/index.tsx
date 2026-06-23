import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Location from "expo-location";
import React, { useState, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { getDonorProfile, getCooldownStatus } from "@/services/donorService";
import { getNearbyInstitutionCount, getNearbyInstitutions } from "@/services/institutionService";
import { getActiveRequests } from "@/services/requestService";
import { getDonorRequestStatuses, DonationStatus } from "@/services/donationService";
import { getCache, setCache } from "@/services/offlineCache";

const getStatusConfig = (colors: any, isDark: boolean): Record<DonationStatus, { label: string; color: string; bg: string; borderColor: string; cardBg: string }> => ({
  scheduled: { label: 'Scheduled', color: isDark ? '#60A5FA' : '#2563EB', bg: isDark ? '#1E3A8A' : '#DBEAFE', borderColor: isDark ? '#1E40AF' : '#93C5FD', cardBg: isDark ? '#172554' : '#EFF6FF' },
  confirmed: { label: 'Confirmed', color: isDark ? '#FBBF24' : '#D97706', bg: isDark ? '#78350F' : '#FEF3C7', borderColor: isDark ? '#92400E' : '#FDE68A', cardBg: isDark ? '#451A03' : '#FFFBEB' },
  completed: { label: 'Donated', color: isDark ? '#4ADE80' : '#16A34A', bg: isDark ? '#14532D' : '#DCFCE7', borderColor: isDark ? '#166534' : '#BBF7D0', cardBg: isDark ? '#052E16' : '#F0FDF4' },
  cancelled: { label: 'Cancelled', color: colors.textSecondary, bg: colors.borderLight, borderColor: colors.border, cardBg: colors.background },
  no_show: { label: 'No Show', color: colors.textSecondary, bg: colors.borderLight, borderColor: colors.border, cardBg: colors.background },
});

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

const BLOOD_COMPAT = [
  { type: 'O-', info: 'Donate to all', color: '#DC2626' },
  { type: 'O+', info: 'To O+, A+, B+, AB+', color: '#EA580C' },
  { type: 'A-', info: 'To A-, A+, AB-, AB+', color: '#16A34A' },
  { type: 'A+', info: 'To A+, AB+', color: '#2563EB' },
  { type: 'B-', info: 'To B-, B+, AB-, AB+', color: '#7C3AED' },
  { type: 'B+', info: 'To B+, AB+', color: '#0891B2' },
  { type: 'AB-', info: 'To AB-, AB+', color: '#BE185D' },
  { type: 'AB+', info: 'Receive from all', color: '#4338CA' },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const { newCount } = useNotifications();
  const { colors, isDark } = useTheme();
  const s = useStyles(colors, isDark);

  const [bloodType, setBloodType] = useState<string | null>(null);
  const [nearbyCenters, setNearbyCenters] = useState<{ count: number; radiusKm: number } | null>(null);
  const [nearbyInstitutions, setNearbyInstitutions] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [requestStatuses, setRequestStatuses] = useState<Map<string, DonationStatus>>(new Map());
  const [cooldownInfo, setCooldownInfo] = useState<{ isEligible: boolean; nextEligibleDate: Date | null; daysRemaining: number }>({ isEligible: true, nextEligibleDate: null, daysRemaining: 0 });
  const [loading, setLoading] = useState(true);

  // Progress fraction for the ring (0 = just donated, 1 = eligible)
  const cooldownProgress = cooldownInfo.isEligible ? 1 : Math.max(0, 1 - (cooldownInfo.daysRemaining / 90));

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      // Load cache first for instant layout rendering
      if (user?.id) {
        getCache(`donor_profile:${user.id}`).then(cached => {
          if (cached && !cancelled) {
            if (cached.blood_type) setBloodType(cached.blood_type);
            setCooldownInfo(getCooldownStatus(cached));
          }
        });
        getCache(`request_statuses:${user.id}`).then(cachedStatuses => {
          if (cachedStatuses && !cancelled) {
            setRequestStatuses(new Map(cachedStatuses));
          }
        });
      }
      getCache('active_requests').then(cachedRequests => {
        if (cachedRequests && !cancelled) {
          setRequests(cachedRequests);
          setLoading(false);
        }
      });

      async function fetchData() {
        setLoading(true);
        const bloodTypePromise = (async () => {
          if (!user?.id) return;
          const { data } = await getDonorProfile(user.id);
          if (!cancelled && data) {
            if (data.blood_type) setBloodType(data.blood_type);
            setCooldownInfo(getCooldownStatus(data));
            setCache(`donor_profile:${user.id}`, data);
          }
        })();
        const requestsPromise = (async () => {
          try {
            const { data } = await getActiveRequests();
            if (!cancelled && data) {
              const sliced = data.slice(0, 5);
              setRequests(sliced);
              setCache('active_requests', sliced);
            }
          } catch (e) { console.error('[iDonate:Home] Requests error', e); }
        })();
        const statusesPromise = (async () => {
          if (!user?.id) return;
          try {
            const result = await getDonorRequestStatuses(user.id);
            if (!cancelled) {
              setRequestStatuses(result.statuses);
              setCache(`request_statuses:${user.id}`, Array.from(result.statuses.entries()));
            }
          } catch (e) { console.error('[iDonate:Home] Statuses error', e); }
        })();
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
              if (listResult.data) setNearbyInstitutions(listResult.data.slice(0, 3));
            }
          } catch (e) { console.error('[iDonate:Home] Nearby error', e); }
        })();
        await Promise.all([bloodTypePromise, requestsPromise, statusesPromise, nearbyPromise]);
        if (!cancelled) setLoading(false);
      }
      fetchData();
      return () => { cancelled = true; };
    }, [user?.id])
  );

  const HIDDEN_STATUSES = new Set(['completed', 'cancelled', 'no_show']);
  const visibleRequests = requests.filter(r => !HIDDEN_STATUSES.has(requestStatuses.get(r.id) as string));
  const urgencyColors: Record<string, string> = { critical: colors.error, high: colors.warning, moderate: '#F59E0B', low: colors.success };
  const STATUS_CONFIG = getStatusConfig(colors, isDark);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <View style={s.logoRow}>
              <MaterialIcons name="water-drop" size={26} color={colors.primary} />
              <ThemedText style={s.logoText}>iDonate</ThemedText>
            </View>
            <TouchableOpacity style={s.bellBtn} onPress={() => router.push("/notifications")}>
              <MaterialIcons name="notifications-none" size={26} color={colors.textPrimary} />
              {newCount > 0 && (
                <View style={s.badge}><ThemedText style={s.badgeText}>{newCount}</ThemedText></View>
              )}
            </TouchableOpacity>
          </View>
          <ThemedText style={s.tagline}>
            Care. Connect. <ThemedText style={s.taglineAccent}>Save lives.</ThemedText>
          </ThemedText>
        </View>

        {/* ── What would you like to do? ── */}
        <View style={s.actionSection}>
          <ThemedText style={s.sectionTitle}>What would you like to do?</ThemedText>
          <View style={s.actionCards}>
            <TouchableOpacity style={s.donateCardWrap} activeOpacity={0.85} onPress={() => router.push("/donate-blood")}>
              <LinearGradient colors={['#EF4444', '#DC2626']} style={s.donateCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={s.donateIconCircle}>
                  <MaterialIcons name="water-drop" size={28} color="#FFFFFF" />
                </View>
                <ThemedText style={s.donateTitle}>Donate Blood</ThemedText>
                <ThemedText style={s.donateSubtitle}>Help someone in need</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={s.requestCardWrap} activeOpacity={0.85} onPress={() => router.push("/request-blood")}>
              <View style={s.requestCard}>
                <View style={s.requestIconCircle}>
                  <Ionicons name="hand-left" size={26} color={colors.accent} />
                </View>
                <ThemedText style={s.requestTitle}>Request Blood</ThemedText>
                <ThemedText style={s.requestSubtitle}>Get help from donors</ThemedText>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Summary Pills ── */}
        <View style={s.pills}>
          <TouchableOpacity style={s.pill} onPress={() => router.navigate("/(tabs)/map")}>
            <MaterialIcons name="location-on" size={18} color={colors.primary} />
            <ThemedText style={s.pillLabel}>Nearby</ThemedText>
            <ThemedText style={s.pillValue}>
              {loading ? '…' : nearbyCenters ? `${nearbyCenters.count}` : '—'}
            </ThemedText>
            <ThemedText style={s.pillSub}>centers</ThemedText>
            <ThemedText style={s.pillLink}>View all ›</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={s.pill} onPress={() => router.push("/donate-blood")}>
            <MaterialIcons name="water-drop" size={18} color={colors.primary} />
            <ThemedText style={s.pillLabel}>Your blood type</ThemedText>
            <ThemedText style={s.pillValue}>{loading ? '…' : bloodType ?? '—'}</ThemedText>
            <ThemedText style={s.pillSub}> </ThemedText>
            <ThemedText style={[s.pillLink, { color: colors.primary }]}>Edit ›</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={s.pill} onPress={() => router.navigate("/(tabs)/profile")}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : cooldownInfo.isEligible ? (
              <>
                <MaterialIcons name="check-circle" size={22} color={colors.success} />
                <ThemedText style={s.pillLabel}>Eligible to donate</ThemedText>
                <ThemedText style={[s.pillValue, { color: colors.success }]}>Yes</ThemedText>
                <ThemedText style={s.pillSub}> </ThemedText>
                <ThemedText style={[s.pillLink, { color: colors.success }]}>Learn more ›</ThemedText>
              </>
            ) : (
              <>
                {/* SVG ring countdown */}
                <View style={{ width: 50, height: 50, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ transform: [{ rotate: '-90deg' }] }}>
                    <Svg width={50} height={50}>
                      <Circle cx={25} cy={25} r={20.25} stroke="#FEF3C7" strokeWidth={4.5} fill="none" />
                      <Circle
                        cx={25} cy={25} r={20.25}
                        stroke={colors.warning} strokeWidth={4.5} fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 20.25}`}
                        strokeDashoffset={`${2 * Math.PI * 20.25 * (1 - cooldownProgress)}`}
                      />
                    </Svg>
                  </View>
                  <View style={s.ringCenter}>
                    <ThemedText style={s.ringText}>{cooldownInfo.daysRemaining}</ThemedText>
                  </View>
                </View>
                <ThemedText style={s.pillLabel}>Days left</ThemedText>
                <ThemedText style={[s.pillValue, { fontSize: 16, color: colors.warning }]}>
                  {cooldownInfo.nextEligibleDate?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </ThemedText>
                <ThemedText style={[s.pillLink, { color: colors.warning }]}>Details ›</ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Active Blood Requests ── */}
        <View style={s.sectionHeader}>
          <ThemedText style={s.sectionTitle}>Active Blood Requests</ThemedText>
          <TouchableOpacity onPress={() => router.navigate("/(tabs)/requests")}>
            <ThemedText style={s.viewAll}>View all</ThemedText>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 16 }} />
        ) : visibleRequests.length === 0 ? (
          <View style={s.emptyCard}>
            <ThemedText style={s.emptyText}>No active requests right now</ThemedText>
          </View>
        ) : (
          visibleRequests.slice(0, 2).map((req: any) => {
            const timeAgo = getTimeAgo(req.created_at);
            const isOwn = user?.id === req.requester_id;
            const name = isOwn ? 'You' : (req.institution_name || req.profiles?.full_name || 'Unknown');
            const donationStatus = requestStatuses.get(req.id);
            const statusCfg = donationStatus ? STATUS_CONFIG[donationStatus] : null;
            const urgColor = urgencyColors[req.urgency_level] || colors.primary;
            return (
              <TouchableOpacity key={req.id} style={[s.reqCard, statusCfg && { backgroundColor: statusCfg.cardBg, borderWidth: 1.5, borderColor: statusCfg.borderColor }]} activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/blood-request/[id]', params: { id: req.id } } as any)}>
                <View style={[s.reqAvatar, { backgroundColor: statusCfg ? statusCfg.color : urgColor }]}>
                  <ThemedText style={s.reqAvatarText}>{req.blood_type_needed}</ThemedText>
                </View>
                <View style={s.reqContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ThemedText style={s.reqName} numberOfLines={1}>{name}</ThemedText>
                    {statusCfg && (
                      <View style={[s.miniTag, { backgroundColor: statusCfg.bg }]}>
                        <ThemedText style={[s.miniTagText, { color: statusCfg.color }]}>{statusCfg.label}</ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText style={s.reqMeta}>
                    {req.blood_type_needed} · {req.units_needed} unit{req.units_needed > 1 ? 's' : ''} · {timeAgo}
                  </ThemedText>
                  {req.description && <ThemedText style={s.reqDesc} numberOfLines={1}>{req.description}</ThemedText>}
                </View>
                <View style={[s.urgencyBadge, { backgroundColor: statusCfg ? statusCfg.bg : urgColor + '18' }]}>
                  <ThemedText style={[s.urgencyText, { color: statusCfg ? statusCfg.color : urgColor }]}>
                    {statusCfg ? statusCfg.label : req.urgency_level?.charAt(0).toUpperCase() + req.urgency_level?.slice(1)}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* ── Find Donation Centers ── */}
        <View style={s.sectionHeader}>
          <ThemedText style={s.sectionTitle}>Find Donation Centers</ThemedText>
          <TouchableOpacity onPress={() => router.navigate("/(tabs)/map")}>
            <ThemedText style={s.viewAll}>View all</ThemedText>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.textSecondary} style={{ marginVertical: 16 }} />
        ) : nearbyInstitutions.length === 0 ? (
          <View style={s.emptyCard}>
            <MaterialIcons name="location-off" size={28} color={colors.iconMuted} />
            <ThemedText style={s.emptyText}>No centers found nearby</ThemedText>
          </View>
        ) : (
          nearbyInstitutions.map((inst: any) => (
            <View key={inst.id} style={s.centerCard}>
              <View style={s.centerIcon}>
                <MaterialIcons
                  name={inst.institution_type === 'blood_bank' ? 'water-drop' : 'local-hospital'}
                  size={22}
                  color={inst.institution_type === 'blood_bank' ? colors.primary : colors.accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={s.centerName}>{inst.institution_name}</ThemedText>
                <ThemedText style={s.centerMeta}>{inst.address || 'No address'} · {inst.distance} km away</ThemedText>
              </View>
              <TouchableOpacity
                style={s.navBtn}
                onPress={() => {
                  const url = Platform.select({
                    ios: `maps:0,0?q=${inst.latitude},${inst.longitude}`,
                    default: `geo:${inst.latitude},${inst.longitude}?q=${inst.latitude},${inst.longitude}(${inst.institution_name})`,
                  });
                  if (url) Linking.openURL(url);
                }}
              >
                <MaterialIcons name="navigation" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* ── Blood Compatibility ── */}
        <View style={s.sectionHeader}>
          <ThemedText style={s.sectionTitle}>Blood Compatibility</ThemedText>
          <TouchableOpacity onPress={() => router.push("/compatibility")}>
            <ThemedText style={s.viewAll}>See guide</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.compatRow}>
          {BLOOD_COMPAT.slice(0, 3).map((item) => (
            <View key={item.type} style={s.compatCard}>
              <MaterialIcons name="water-drop" size={18} color={item.color} />
              <ThemedText style={s.compatType}>{item.type}</ThemedText>
              <ThemedText style={s.compatInfo}>{item.info}</ThemedText>
            </View>
          ))}
          <TouchableOpacity style={s.compatMore} onPress={() => Linking.openURL('https://www.redcrossblood.org/donate-blood/blood-types.html')}>
            <ThemedText style={s.compatMoreCount}>+5 more</ThemedText>
            <ThemedText style={s.compatMoreLink}>View all</ThemedText>
          </TouchableOpacity>
        </ScrollView>

        {/* ── Motivational Banner ── */}
        <TouchableOpacity style={s.motiveBanner} activeOpacity={0.8} onPress={() => router.push("/donate-blood")}>
          <MaterialIcons name="favorite" size={22} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <ThemedText style={s.motiveTitle}>Every drop counts.</ThemedText>
            <ThemedText style={s.motiveSub}>Your donation can save up to 3 lives.</ThemedText>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = (colors: any, isDark: boolean) => useMemo(() => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 100 },

  // Header
  header: { paddingTop: 12, marginBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  bellBtn: { position: 'relative', padding: 4 },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: colors.primary, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.background },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  tagline: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  taglineAccent: { color: colors.primary, fontWeight: '600' },

  // Action cards
  actionSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
  actionCards: { flexDirection: 'row', gap: 12 },
  donateCardWrap: { flex: 1.15 },
  donateCard: { borderRadius: 20, padding: 20, height: 150, justifyContent: 'flex-end' },
  donateIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  donateTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  donateSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  requestCardWrap: { flex: 1 },
  requestCard: { borderRadius: 20, padding: 20, height: 150, justifyContent: 'flex-end', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0.2 : 0.05, shadowRadius: 8, elevation: 2 },
  requestIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accentLight, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  requestTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, marginBottom: 2 },
  requestSubtitle: { fontSize: 12, color: colors.textSecondary },

  // Pills
  pills: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  pill: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0.2 : 0.04, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: colors.borderLight },
  pillLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
  pillValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },
  pillSub: { fontSize: 11, color: colors.textSecondary },
  pillLink: { fontSize: 11, fontWeight: '600', color: colors.accent, marginTop: 4 },

  // Cooldown ring
  ringCenter: { position: 'absolute', width: 38, height: 38, borderRadius: 19, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  ringText: { fontSize: 14, fontWeight: '800', color: colors.warning },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  viewAll: { fontSize: 14, fontWeight: '600', color: colors.primary },

  // Request cards
  reqCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0.2 : 0.04, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: colors.borderLight },
  reqAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  reqAvatarText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  reqContent: { flex: 1 },
  reqName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  reqMeta: { fontSize: 12, color: colors.textSecondary },
  reqDesc: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  miniTag: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  miniTagText: { fontSize: 10, fontWeight: '700' },
  urgencyBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, marginLeft: 8 },
  urgencyText: { fontSize: 11, fontWeight: '700' },

  // Empty
  emptyCard: { backgroundColor: colors.card, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: colors.borderLight },
  emptyText: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },

  // Center cards
  centerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0.2 : 0.04, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: colors.borderLight },
  centerIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.borderLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  centerName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  centerMeta: { fontSize: 12, color: colors.textSecondary },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },

  // Compatibility
  compatRow: { paddingBottom: 4, gap: 10, marginBottom: 20 },
  compatCard: { width: 120, backgroundColor: colors.card, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0.2 : 0.04, shadowRadius: 4, elevation: 1 },
  compatType: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginTop: 6 },
  compatInfo: { fontSize: 10, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
  compatMore: { width: 100, backgroundColor: colors.background, borderRadius: 16, padding: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  compatMoreCount: { fontSize: 16, fontWeight: '700', color: colors.icon },
  compatMoreLink: { fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 4 },

  // Motivational
  motiveBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primary + '30' },
  motiveTitle: { fontSize: 14, fontWeight: '700', color: colors.primary },
  motiveSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
}), [colors, isDark]);
