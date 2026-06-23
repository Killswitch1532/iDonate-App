import React, { useEffect, useState, useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View, TouchableOpacity, Alert, Linking, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/contexts/AuthContext";
import { getDonorDonations, cancelDonation, confirmDonorDonation, Donation } from "@/services/donationService";
import { getDonorProfile, getCooldownStatus } from "@/services/donorService";
import { extractCoords } from "@/services/institutionService";
import { getCache, setCache } from "@/services/offlineCache";
import { useTheme } from "@/hooks/useTheme";
import { getOrCreateConversation } from "@/services/messageService";

export default function DonationsScreen() {
  const { colors, isDark } = useTheme();
  const styles = useStyles(colors, isDark);
  const { user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cooldownStatus, setCooldownStatus] = useState<{ isEligible: boolean; nextEligibleDate: Date | null; daysRemaining: number }>({ isEligible: true, nextEligibleDate: null, daysRemaining: 0 });

  const loadDonations = (showLoadingIndicator = true) => {
    if (user?.id) {
      if (showLoadingIndicator) setLoading(true);
      getDonorProfile(user.id).then(({ data: donorProfile }) => {
        if (donorProfile) {
          setCooldownStatus(getCooldownStatus(donorProfile));
          setCache(`donor_profile:${user.id}`, donorProfile);
        }
      });
      getDonorDonations(user.id)
        .then(({ data }) => {
          if (data) {
            setDonations(data);
            setCache(`donations:${user.id}`, data);
          }
        })
        .finally(() => {
          if (showLoadingIndicator) setLoading(false);
        });
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      // Load cache first for instant layout rendering
      getCache(`donations:${user.id}`).then(cached => {
        if (cached) {
          setDonations(cached);
          setLoading(false);
        }
      });
      getCache(`donor_profile:${user.id}`).then(cachedProfile => {
        if (cachedProfile) {
          setCooldownStatus(getCooldownStatus(cachedProfile));
        }
      });
    }
    loadDonations(true);
  }, [user?.id]);

  const filteredDonations = donations.filter(d => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return ['scheduled', 'confirmed'].includes(d.status);
    return d.status === activeFilter;
  });
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

  const handleConfirmDonation = (donationId: string) => {
    Alert.alert(
      "Confirm Donation",
      "By clicking 'Yes', you confirm that you have successfully donated blood for this request.",
      [
        { text: "Not yet", style: "cancel" },
        { 
          text: "Yes, I donated", 
          onPress: async () => {
            setConfirmingId(donationId);
            const { error } = await confirmDonorDonation(donationId);
            setConfirmingId(null);
            if (error) {
              Alert.alert("Error", "Could not confirm your donation. Please try again.");
            } else {
              loadDonations(); // Refresh list to show updated status
            }
          }
        }
      ]
    );
  };
  const handleGetDirections = (lat: number, lng: number, label: string) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `${scheme}${encodeURIComponent(label)}@${latLng}`,
      android: `${scheme}${latLng}(${encodeURIComponent(label)})`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Navigation Error', 'Could not open mapping application.');
      });
    }
  };

  const handleCallCenter = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Call Error', 'Could not open phone application.');
    });
  };

  const handleMessageCenter = async (donation: any) => {
    if (!user?.id) return;
    
    // Check if this is an institution-linked donation
    if (!donation.institution_id) {
      Alert.alert('Not Available', 'Messaging is only available for donations at institutions.');
      return;
    }

    try {
      const { data: conversation, error } = await getOrCreateConversation(
        donation.id,
        donation.institution_id,
        user.id
      );

      if (error) {
        Alert.alert('Error', 'Could not start conversation. Please try again.');
        return;
      }

      if (conversation) {
        router.push({
          pathname: '/chat',
          params: {
            conversationId: conversation.id,
            institutionName: donation.institutions?.institution_name || 'Institution',
            appointmentDate: new Date(donation.scheduled_date).toLocaleDateString()
          }
        });
      }
    } catch (e) {
      Alert.alert('Error', 'Could not start conversation. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return { bg: isDark ? '#1E3A8A' : '#DBEAFE', text: isDark ? '#60A5FA' : '#2563EB', icon: 'calendar-outline' };
      case 'confirmed': return { bg: isDark ? '#78350F' : '#FEF3C7', text: isDark ? '#FBBF24' : '#D97706', icon: 'checkmark-circle-outline' };
      case 'completed': return { bg: isDark ? '#14532D' : '#DCFCE7', text: isDark ? '#4ADE80' : '#16A34A', icon: 'ribbon-outline' };
      case 'cancelled': return { bg: colors.error + '20', text: colors.error, icon: 'close-circle-outline' };
      case 'no_show': return { bg: colors.borderLight, text: colors.textSecondary, icon: 'help-circle-outline' };
      default: return { bg: colors.borderLight, text: colors.textSecondary, icon: 'ellipse-outline' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>My Donations</ThemedText>
        <TouchableOpacity onPress={() => loadDonations(true)} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color={colors.icon} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
          {['all', 'pending', 'completed', 'cancelled'].map(filter => (
            <TouchableOpacity 
              key={filter} 
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.filterTab, 
                activeFilter === filter && styles.activeFilterTab
              ]}
            >
              <ThemedText style={[
                styles.filterTabText, 
                activeFilter === filter && styles.activeFilterTabText
              ]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredDonations.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="shield-checkmark-outline" size={64} color={colors.iconMuted} />
            <ThemedText style={styles.emptyText}>No donations found</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              {activeFilter === 'all' 
                ? "You haven't booked any donations yet." 
                : `You have no ${activeFilter} donations.`}
            </ThemedText>
            {activeFilter === 'all' && (
              <TouchableOpacity style={styles.donateButton} onPress={() => router.push('/donate-blood')}>
                <ThemedText style={styles.donateButtonText}>Find a Request</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredDonations.map((donation: any) => {
              const statusColors = getStatusColor(donation.status);
              
              let institutionName = donation.institutions?.institution_name;
              if (!institutionName && donation.blood_requests) {
                const req = donation.blood_requests;
                const name = req.profiles?.full_name || 'Individual';
                const locationMatch = req.description?.match(/Location:\s*(.+)$/m);
                const location = locationMatch ? locationMatch[1].trim() : 'Custom Location';
                institutionName = `${name} (${location})`;
              }
              institutionName = institutionName || 'Medical Center';
              const institutionPhone = donation.institutions?.profiles?.phone_number || null;
              
              const requestedType = donation.blood_requests?.blood_type_needed;
              const coords = extractCoords(donation.institutions?.location || donation.blood_requests?.hospital_location);
              
              const dateStr = new Date(donation.scheduled_date).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric'
              });
              const timeStr = new Date(donation.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              return (
                <View key={donation.id} style={styles.historyCard}>
                  {/* Status & Date */}
                  <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                      <Ionicons name={statusColors.icon as any} size={14} color={statusColors.text} />
                      <ThemedText style={[styles.statusText, { color: statusColors.text }]}>
                        {donation.status.toUpperCase()}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.dateText}>{dateStr}</ThemedText>
                  </View>

                  {/* Center Name + Call Icon */}
                  <View style={styles.institutionRow}>
                    <ThemedText style={styles.institutionName}>{institutionName}</ThemedText>
                    {institutionPhone && (
                      <TouchableOpacity
                        style={styles.callIconBtn}
                        onPress={() => handleCallCenter(institutionPhone)}
                        accessibilityLabel="Call donation centre"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="call" size={16} color={colors.success} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Request Context (if any) */}
                  {requestedType && (
                    <View style={styles.contextRow}>
                      <Ionicons name="water" size={14} color={colors.primary} />
                      <ThemedText style={styles.contextText}>Response to {requestedType} Request</ThemedText>
                    </View>
                  )}

                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <Ionicons name="time-outline" size={14} color={colors.icon} />
                      <ThemedText style={styles.detailText}>{timeStr}</ThemedText>
                    </View>
                    {donation.units_donated && (
                      <View style={styles.detailItem}>
                        <Ionicons name="flask-outline" size={14} color={colors.icon} />
                        <ThemedText style={styles.detailText}>{donation.units_donated} Unit{donation.units_donated > 1 ? 's' : ''}</ThemedText>
                      </View>
                    )}
                  </View>

                  {/* Directions Button */}
                  {(donation.status === 'scheduled' || donation.status === 'confirmed') && coords && (
                    <TouchableOpacity 
                      style={styles.navigateBtn}
                      onPress={() => handleGetDirections(coords.lat, coords.lng, institutionName)}
                    >
                      <Ionicons name="navigate-outline" size={16} color={colors.accent} />
                      <ThemedText style={styles.navigateBtnText}>Get Directions</ThemedText>
                    </TouchableOpacity>
                  )}

                  {/* Contact Donation Center Section */}
                  {donation.institutions && (
                    <View style={styles.contactSection}>
                      <View style={styles.contactSectionHeader}>
                        <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.textSecondary} />
                        <ThemedText style={styles.contactSectionTitle}>Contact Donation Center</ThemedText>
                      </View>
                      <TouchableOpacity 
                        style={styles.contactBtn}
                        onPress={() => handleMessageCenter(donation)}
                      >
                        <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
                        <ThemedText style={[styles.contactBtnText, { color: colors.primary }]}>Message Centre</ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Notes */}
                  {donation.notes && (
                    <View style={styles.notesSection}>
                      <View style={styles.notesHeader}>
                        <Ionicons name="chatbubble-ellipses-outline" size={12} color={colors.icon} />
                        <ThemedText style={styles.notesLabel}>Notes from Hospital</ThemedText>
                      </View>
                      <ThemedText style={styles.notesText}>{donation.notes}</ThemedText>
                    </View>
                  )}

                  {/* Actions (Cancel / Confirm) */}
                  <View style={styles.actionRow}>
                    {donation.status === 'scheduled' && (
                      <TouchableOpacity 
                        style={styles.cancelBtn} 
                        onPress={() => handleCancel(donation.id)}
                        disabled={cancelingId === donation.id}
                      >
                        {cancelingId === donation.id ? (
                          <ActivityIndicator size="small" color={colors.icon} />
                        ) : (
                          <>
                            <Ionicons name="close-circle-outline" size={16} color={colors.icon} />
                            <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {!donation.donor_confirmed && (donation.status === 'scheduled' || donation.status === 'confirmed') && (
                      <TouchableOpacity 
                        style={styles.confirmBtn} 
                        onPress={() => handleConfirmDonation(donation.id)}
                        disabled={confirmingId === donation.id}
                      >
                        {confirmingId === donation.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                            <ThemedText style={styles.confirmBtnText}>I Have Donated</ThemedText>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {donation.donor_confirmed && donation.status !== 'completed' && (
                      <View style={styles.waitingBadge}>
                        <Ionicons name="time-outline" size={14} color={colors.warning} />
                        <ThemedText style={styles.waitingText}>Waiting for Confirmation</ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FAB — Book a Donation */}
      <TouchableOpacity
        style={[styles.fab, !cooldownStatus.isEligible && styles.fabDisabled]}
        activeOpacity={0.85}
        onPress={() => {
          if (!cooldownStatus.isEligible) {
            Alert.alert(
              'Donation Cooldown',
              `You recently completed a donation. Based on platform safety rules, you will be eligible again on ${cooldownStatus.nextEligibleDate?.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}.\n\n${cooldownStatus.daysRemaining} day${cooldownStatus.daysRemaining !== 1 ? 's' : ''} remaining.`
            );
            return;
          }
          router.navigate('/(tabs)/requests');
        }}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
        <ThemedText style={styles.fabText}>
          {cooldownStatus.isEligible ? 'Book Donation' : `Cooldown (${cooldownStatus.daysRemaining}d)`}
        </ThemedText>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const useStyles = (colors: any, isDark: boolean) => {
  return useMemo(() => StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    refreshBtn: {
      padding: 8,
      borderRadius: 10,
      backgroundColor: colors.background,
    },
    filterSection: {
      backgroundColor: colors.card,
      paddingBottom: 12,
    },
    filterContainer: {
      paddingHorizontal: 20,
      gap: 10,
    },
    filterTab: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    activeFilterTab: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary + '50',
    },
    filterTabText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    activeFilterTabText: {
      color: colors.primary,
    },
    container: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
      paddingBottom: 120,
      flexGrow: 1,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      maxWidth: '80%',
    },
    donateButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    donateButtonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 16,
    },
    listContainer: {
      gap: 16,
    },
    historyCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 10,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    dateText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    institutionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 6,
    },
    institutionName: {
      flex: 1,
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    callIconBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#14532D' : '#DCFCE7',
      borderWidth: 1,
      borderColor: isDark ? '#166534' : '#BBF7D0',
    },
    contextRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    contextText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    detailsGrid: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 16,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    detailText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    notesSection: {
      backgroundColor: colors.background,
      padding: 12,
      borderRadius: 12,
      marginBottom: 12,
      borderLeftWidth: 3,
      borderLeftColor: colors.border,
    },
    notesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    notesLabel: {
      fontSize: 11,
      fontWeight: 'bold',
      color: colors.textSecondary,
      textTransform: 'uppercase',
    },
    notesText: {
      fontSize: 13,
      color: colors.textPrimary,
      lineHeight: 18,
      fontStyle: 'italic',
    },
    cancelBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: 12,
    },
    cancelBtnText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    confirmBtn: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      backgroundColor: colors.success,
      borderRadius: 12,
    },
    confirmBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
    },
    waitingBadge: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      backgroundColor: isDark ? '#451A03' : '#FFFBEB',
      borderWidth: 1,
      borderColor: isDark ? '#78350F' : '#FEF3C7',
      borderRadius: 12,
    },
    waitingText: {
      color: isDark ? '#FDE68A' : '#D97706',
      fontSize: 12,
      fontWeight: '700',
    },
    navigateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      backgroundColor: isDark ? '#172554' : '#EFF6FF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? '#1E3A8A' : '#BFDBFE',
      marginBottom: 12,
    },
    navigateBtnText: {
      color: isDark ? '#60A5FA' : '#2563EB',
      fontSize: 13,
      fontWeight: '700',
    },
    fab: {
      position: 'absolute',
      bottom: 100,
      right: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 28,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    fabText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    fabDisabled: {
      backgroundColor: colors.iconMuted,
      shadowColor: colors.iconMuted,
    },
    contactSection: {
      marginTop: 12,
      marginBottom: 12,
      padding: 12,
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    contactSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    contactSectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    contactBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    contactBtnText: {
      fontSize: 14,
      fontWeight: '700',
    },
  }), [colors, isDark]);
};
