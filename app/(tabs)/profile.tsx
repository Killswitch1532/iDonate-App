import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/contexts/AuthContext";
import { getDonorProfile, DonorProfile } from "@/services/donorService";

export default function ProfileScreen() {
  const { signOut, profile, user } = useAuth();
  const [donorData, setDonorData] = useState<DonorProfile | null>(null);
  const [donorLoading, setDonorLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      setDonorLoading(true);
      getDonorProfile(user.id)
        .then(({ data }) => setDonorData(data))
        .finally(() => setDonorLoading(false));
    } else {
      setDonorLoading(false);
    }
  }, [user?.id]);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'User';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const userType = profile?.user_type || 'donor';
  const phoneNumber = profile?.phone_number || 'Not set';
  const email = user?.email || 'Not set';
  const address = donorData?.address || 'Not set';
  const bloodType = donorData?.blood_type || null;

  // Calculate days since last donation
  const daysSinceLastDonation = donorData?.last_donation_date
    ? Math.floor((Date.now() - new Date(donorData.last_donation_date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <View style={styles.header}>
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
          <ThemedText style={styles.headerSubtitle}>Your profile</ThemedText>
        </View>

        {/* User Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <View style={styles.profileContent}>
              <View style={styles.avatarContainer}>
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <MaterialIcons
                    name="person"
                    size={40}
                    color="#FFFFFF"
                    style={styles.avatarIcon}
                  />
                )}
              </View>
              <View style={styles.profileInfo}>
                <ThemedText style={styles.userName}>{displayName}</ThemedText>
                <ThemedText style={styles.userDetails}>
                  {userType.charAt(0).toUpperCase() + userType.slice(1)}
                  {bloodType ? ` • ${bloodType}` : ''}
                </ThemedText>
              </View>
              <TouchableOpacity style={styles.editButton}>
                <MaterialIcons
                  name="edit"
                  size={16}
                  color="#4A90E2"
                  style={styles.editIcon}
                />
                <ThemedText style={styles.editText}>Edit</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Donation Summary Cards */}
        <View style={styles.summarySection}>
          <View style={styles.summaryCards}>
            <View style={styles.donationCard}>
              <MaterialIcons
                name="water-drop"
                size={24}
                color="#E74C3C"
                style={styles.cardIcon}
              />
              <ThemedText style={styles.donationNumber}>—</ThemedText>
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
              <ThemedText style={styles.livesSavedNumber}>—</ThemedText>
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
            <View style={styles.cardHeader}>
              <MaterialIcons
                name="history"
                size={20}
                color="#4A90E2"
                style={styles.cardIcon}
              />
              <ThemedText style={styles.cardTitle}>Recent Donations</ThemedText>
            </View>

            <View style={styles.historyItems}>
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

        {/* Bottom spacer */}
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
    paddingBottom: 100,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 24,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
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
  headerSubtitle: {
    fontSize: 14,
    color: "#7F8C8D",
  },

  // Profile Section
  profileSection: {
    marginBottom: 24,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F8F4F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarIcon: {
    // Icon styling handled by MaterialIcons component
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 4,
  },
  userDetails: {
    fontSize: 14,
    color: "#7F8C8D",
  },
  editButton: {
    backgroundColor: "#E8F4FD",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editIcon: {
    // Icon styling handled by MaterialIcons component
  },
  editText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4A90E2",
  },

  // Summary Section
  summarySection: {
    marginBottom: 24,
  },
  summaryCards: {
    flexDirection: "row",
    gap: 8,
  },
  donationCard: {
    flex: 1,
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
  livesSavedCard: {
    flex: 1,
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
  lastDonationCard: {
    flex: 1,
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
  cardIcon: {
    marginBottom: 8,
  },
  donationNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 4,
  },
  donationLabel: {
    fontSize: 12,
    color: "#7F8C8D",
    textAlign: "center",
  },
  livesSavedNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 4,
  },
  livesSavedLabel: {
    fontSize: 12,
    color: "#7F8C8D",
    textAlign: "center",
  },
  lastDonationNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 4,
  },
  lastDonationLabel: {
    fontSize: 12,
    color: "#7F8C8D",
    textAlign: "center",
  },

  // Personal Info Section
  personalInfoSection: {
    marginBottom: 24,
  },
  personalInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
  },
  infoItems: {
    gap: 16,
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
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: "#7F8C8D",
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
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyItems: {
    gap: 12,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  historyItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  historyIcon: {
    marginRight: 12,
  },
  historyTextContainer: {
    flex: 1,
  },
  historyLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 2,
  },
  historyValue: {
    fontSize: 12,
    color: "#7F8C8D",
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: "600",
    color: "#27AE60",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  // Anonymous Section
  anonymousSection: {
    marginBottom: 24,
  },
  anonymousCard: {
    backgroundColor: "#E8F4FD",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  anonymousContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  shieldContainer: {
    position: "relative",
    marginRight: 12,
  },
  shieldIcon: {
    // Icon styling handled by MaterialIcons component
  },
  checkIcon: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  anonymousText: {
    flex: 1,
  },
  anonymousTitle: {
    fontSize: 16,
    fontWeight: "600",
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
    gap: 12,
    marginTop: 24,
  },
  settingsButton: {
    flex: 1,
    backgroundColor: "#E8F4FD",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  settingsIcon: {
    // Icon styling handled by MaterialIcons component
  },
  settingsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A90E2",
  },
  logoutButton: {
    flex: 1,
    backgroundColor: "#E74C3C",
    borderRadius: 12,
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
    fontWeight: "600",
    color: "#FFFFFF",
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
