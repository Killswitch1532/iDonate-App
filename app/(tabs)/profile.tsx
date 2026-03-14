import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/contexts/AuthContext";
import { getDonorProfile, DonorProfile } from "@/services/donorService";
import { getDonorDonations, Donation } from "@/services/donationService";

export default function ProfileScreen() {
  const { signOut, profile, user } = useAuth();
  const [donorData, setDonorData] = useState<DonorProfile | null>(null);
  const [donorLoading, setDonorLoading] = useState(true);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      setDonorLoading(true);
      setDonationsLoading(true);

      getDonorProfile(user.id)
        .then(({ data }) => setDonorData(data))
        .finally(() => setDonorLoading(false));

      getDonorDonations(user.id)
        .then(({ data }) => setDonations(data || []))
        .finally(() => setDonationsLoading(false));
    } else {
      setDonorLoading(false);
      setDonationsLoading(false);
    }
  }, [user?.id]);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'User';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const userType = profile?.user_type || 'donor';
  const phoneNumber = profile?.phone_number || 'Not set';
  const email = user?.email || 'Not set';
  const address = donorData?.address || 'Not set';
  const bloodType = donorData?.blood_type || null;

  // --- Compute summary stats from real data ---
  const completedDonationsList = donations.filter(d => d.status === 'completed');
  
  // Total completed donations
  const completedDonationsCount = completedDonationsList.length;

  // Each unit of blood saves ~3 lives. Default to 1 unit if not specifically recorded.
  const livesSaved = completedDonationsList.reduce((acc, donation) => {
    const units = donation.units_donated ? Number(donation.units_donated) : 1;
    return acc + (units * 3);
  }, 0);

  // Find the most recent completed donation date
  let daysSinceLastDonation: number | null = null;
  if (completedDonationsList.length > 0) {
    // Sort completed donations by date descending, grab the first one
    const sortedCompleted = [...completedDonationsList].sort(
      (a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()
    );
    const mostRecentDate = new Date(sortedCompleted[0].scheduled_date);
    const now = new Date();
    // Calculate difference in days (ignoring negative days if a donation was somehow marked completed in the future)
    const diffTime = Math.max(0, now.getTime() - mostRecentDate.getTime());
    daysSinceLastDonation = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

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

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            console.log('[iDonate:Profile] User logged out');
            router.replace('/signin');
          } catch (e: any) {
            console.error('[iDonate:Profile] Logout failed', e);
            Alert.alert('Error', 'Failed to log out. Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#E74C3C" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        bounces={false}
      >
        {/* Gradient Header & Profile Section combined */}
        <LinearGradient
          colors={['#E74C3C', '#C0392B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          <SafeAreaView edges={['top']} style={styles.safeAreaTop}>
            <View style={styles.header}>
              <ThemedText style={styles.headerTitle}>Profile</ThemedText>
              <TouchableOpacity style={styles.headerEditBtn}>
                <MaterialIcons name="edit" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileContent}>
              <View style={styles.avatarContainer}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <MaterialIcons name="person" size={40} color="#E74C3C" />
                )}
                <View style={styles.onlineBadge} />
              </View>
              <View style={styles.profileInfo}>
                <ThemedText style={styles.userName}>{displayName}</ThemedText>
                <ThemedText style={styles.userDetails}>
                  {userType.charAt(0).toUpperCase() + userType.slice(1)}
                  {bloodType ? ` • ${bloodType}` : ''}
                </ThemedText>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.contentWrapper}>
          {/* Donation Summary Cards (Overlapping the gradient) */}
          <View style={styles.summarySection}>
          <View style={styles.summaryCards}>
            <View style={styles.donationCard}>
              <MaterialIcons
                name="water-drop"
                size={24}
                color="#E74C3C"
                style={styles.cardIcon}
              />
              <ThemedText style={styles.donationNumber}>{completedDonationsCount > 0 ? completedDonationsCount : '—'}</ThemedText>
              <ThemedText style={styles.donationLabel}>
                Total Donations
              </ThemedText>
            </View>
            <View style={styles.livesSavedCard}>
              <MaterialIcons
                name="favorite"
                size={24}
                color="#E74C3C"
                style={styles.cardIcon}
              />
              <ThemedText style={styles.livesSavedNumber}>{livesSaved > 0 ? livesSaved : '—'}</ThemedText>
              <ThemedText style={styles.livesSavedLabel}>
                Lives Saved
              </ThemedText>
            </View>
            <View style={styles.lastDonationCard}>
              <MaterialIcons
                name="schedule"
                size={24}
                color="#4A90E2"
                style={styles.cardIcon}
              />
              <ThemedText style={styles.lastDonationNumber}>
                {daysSinceLastDonation !== null ? daysSinceLastDonation : '—'}
              </ThemedText>
              <ThemedText style={styles.lastDonationLabel}>Days Ago</ThemedText>
            </View>
          </View>
        </View>

        {/* Personal Info Section */}
        <View style={styles.personalInfoSection}>
          <View style={styles.personalInfoCard}>
            <View style={styles.cardHeader}>
              <MaterialIcons
                name="person"
                size={20}
                color="#4A90E2"
                style={styles.cardIcon}
              />
              <ThemedText style={styles.cardTitle}>
                Personal Information
              </ThemedText>
            </View>

            <View style={styles.infoItems}>
              <TouchableOpacity style={styles.infoItem}>
                <View style={styles.infoItemContent}>
                  <MaterialIcons
                    name="phone"
                    size={20}
                    color="#7F8C8D"
                    style={styles.infoIcon}
                  />
                  <View style={styles.infoTextContainer}>
                    <ThemedText style={styles.infoLabel}>Phone</ThemedText>
                    <ThemedText style={styles.infoValue}>
                      {phoneNumber}
                    </ThemedText>
                  </View>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color="#7F8C8D"
                  style={styles.arrowIcon}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.infoItem}>
                <View style={styles.infoItemContent}>
                  <MaterialIcons
                    name="email"
                    size={20}
                    color="#7F8C8D"
                    style={styles.infoIcon}
                  />
                  <View style={styles.infoTextContainer}>
                    <ThemedText style={styles.infoLabel}>Email</ThemedText>
                    <ThemedText style={styles.infoValue}>
                      {email}
                    </ThemedText>
                  </View>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color="#7F8C8D"
                  style={styles.arrowIcon}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.infoItem}>
                <View style={styles.infoItemContent}>
                  <MaterialIcons
                    name="location-on"
                    size={20}
                    color="#7F8C8D"
                    style={styles.infoIcon}
                  />
                  <View style={styles.infoTextContainer}>
                    <ThemedText style={styles.infoLabel}>Location</ThemedText>
                    <ThemedText style={styles.infoValue}>
                      {address}
                    </ThemedText>
                  </View>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color="#7F8C8D"
                  style={styles.arrowIcon}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Donation History Section */}
        <View style={styles.historySection}>
          <View style={styles.historyCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderTitleGroup}>
                <MaterialIcons
                  name="history"
                  size={20}
                  color="#4A90E2"
                  style={styles.cardIcon}
                />
                <ThemedText style={styles.cardTitle}>Recent Donations</ThemedText>
              </View>
              {donations.length > 0 && (
                <TouchableOpacity onPress={() => router.push('/donations')}>
                  <ThemedText style={styles.viewAllText}>View All</ThemedText>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.historyItems}>
              {donationsLoading ? (
                <View style={styles.emptyHistory}>
                  <ActivityIndicator size="large" color="#4A90E2" />
                </View>
              ) : donations.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <MaterialIcons
                    name="volunteer-activism"
                    size={40}
                    color="#BDC3C7"
                  />
                  <ThemedText style={styles.emptyHistoryText}>
                    No donation history yet
                  </ThemedText>
                  <ThemedText style={styles.emptyHistorySubtext}>
                    Your donations will appear here
                  </ThemedText>
                </View>
              ) : (
                donations.slice(0, 3).map((donation: any) => {
                  const statusColors = getStatusColor(donation.status);
                  const institutionName = donation.institutions?.institution_name || 'Unknown center';
                  const dateStr = new Date(donation.scheduled_date).toLocaleDateString();
                  const timeStr = new Date(donation.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <View key={donation.id} style={styles.historyItem}>
                      <View style={styles.historyItemContent}>
                        <MaterialIcons
                          name={donation.status === 'completed' ? 'check-circle' : donation.status === 'scheduled' ? 'event' : 'cancel'}
                          size={24}
                          color={statusColors.text}
                          style={styles.historyIcon}
                        />
                        <View style={styles.historyTextContainer}>
                          <ThemedText style={styles.historyLabel}>{institutionName}</ThemedText>
                          <ThemedText style={styles.historyValue}>{dateStr} at {timeStr}</ThemedText>
                        </View>
                      </View>
                      <ThemedText style={[styles.historyStatus, { backgroundColor: statusColors.bg, color: statusColors.text }]}>
                        {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                      </ThemedText>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>

        {/* Anonymous Donation Section */}
        <View style={styles.anonymousSection}>
          <View style={styles.anonymousCard}>
            <View style={styles.anonymousContent}>
              <View style={styles.shieldContainer}>
                <MaterialIcons
                  name="security"
                  size={24}
                  color="#4A90E2"
                  style={styles.shieldIcon}
                />
                <MaterialIcons
                  name="check"
                  size={16}
                  color="#FFFFFF"
                  style={styles.checkIcon}
                />
              </View>
              <View style={styles.anonymousText}>
                <ThemedText style={styles.anonymousTitle}>
                  Anonymous donation
                </ThemedText>
                <ThemedText style={styles.anonymousDescription}>
                  Hide your identity from receivers
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Buttons */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push("/settings")}
          >
            <MaterialIcons
              name="settings"
              size={20}
              color="#4A90E2"
              style={styles.settingsIcon}
            />
            <ThemedText style={styles.settingsText}>Settings</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <MaterialIcons
              name="logout"
              size={20}
              color="#FFFFFF"
              style={styles.logoutIcon}
            />
            <ThemedText style={styles.logoutText}>Log out</ThemedText>
          </TouchableOpacity>
        </View>

        </View>

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  gradientHeader: {
    paddingBottom: 60, // Extra space for cards to overlap
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  safeAreaTop: {
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerEditBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarImage: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2ECC71',
    borderWidth: 3,
    borderColor: '#C0392B',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  userDetails: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: '500',
  },
  contentWrapper: {
    paddingHorizontal: 16,
    marginTop: -40, // Pull content up to overlap gradient
  },
  // Summary Section
  summarySection: {
    marginBottom: 24,
  },
  summaryCards: {
    flexDirection: "row",
    gap: 12,
  },
  donationCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  livesSavedCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  lastDonationCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardIcon: {
    marginBottom: 12,
    backgroundColor: '#FEF0F0',
    padding: 8,
    borderRadius: 12,
  },
  donationNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2C3E50",
    marginBottom: 4,
  },
  donationLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: "#95A5A6",
    textTransform: 'uppercase',
  },
  livesSavedNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2C3E50",
    marginBottom: 4,
  },
  livesSavedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: "#95A5A6",
    textTransform: 'uppercase',
  },
  lastDonationNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2C3E50",
    marginBottom: 4,
  },
  lastDonationLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: "#95A5A6",
    textTransform: 'uppercase',
  },

  // Personal Info Section
  personalInfoSection: {
    marginBottom: 24,
  },
  personalInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2C3E50",
  },
  infoItems: {
    gap: 20,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  infoIcon: {
    marginRight: 16,
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#95A5A6",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: "#2C3E50",
  },
  arrowIcon: {
    // Icon styling handled by MaterialIcons component
  },

  // History Section
  historySection: {
    marginBottom: 24,
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  cardHeaderTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 14,
    color: "#4A90E2",
    fontWeight: "700",
  },
  historyItems: {
    gap: 16,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  historyItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  historyIcon: {
    marginRight: 16,
  },
  historyTextContainer: {
    flex: 1,
  },
  historyLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 4,
  },
  historyValue: {
    fontSize: 13,
    color: "#95A5A6",
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },

  // Anonymous Section
  anonymousSection: {
    marginBottom: 24,
  },
  anonymousCard: {
    backgroundColor: "#F4F6F8",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8ECEF',
  },
  anonymousContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  shieldContainer: {
    position: "relative",
    marginRight: 16,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  shieldIcon: {
    // Icon styling handled by MaterialIcons component
  },
  checkIcon: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#2ECC71",
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  anonymousText: {
    flex: 1,
  },
  anonymousTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 4,
  },
  anonymousDescription: {
    fontSize: 14,
    color: "#7F8C8D",
  },

  // Bottom Buttons
  bottomButtons: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  settingsButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: '#E8ECEF',
  },
  settingsIcon: {
    // Icon styling handled by MaterialIcons component
  },
  settingsText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2C3E50",
  },
  logoutButton: {
    flex: 1,
    backgroundColor: "#FEF0F0",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutIcon: {
    // Icon styling handled by MaterialIcons component
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E74C3C",
  },

  // Empty History
  emptyHistory: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyHistoryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#7F8C8D",
    marginTop: 12,
  },
  emptyHistorySubtext: {
    fontSize: 13,
    color: "#BDC3C7",
    marginTop: 4,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 20,
  },
});
