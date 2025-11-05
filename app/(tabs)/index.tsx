import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <MaterialIcons name="favorite" size={24} color="#E74C3C" style={styles.heartIcon} />
            <ThemedText style={styles.logoText}>iDonate</ThemedText>
          </View>
          <ThemedText style={styles.tagline}>
          Care. Connect. Save lives.
          </ThemedText>

          <TouchableOpacity 
            style={styles.searchBox}
            onPress={() => router.push('/search')}
          >
            <MaterialIcons name="search" size={20} color="#7F8C8D" style={styles.searchIcon} />
            <ThemedText style={styles.searchPlaceholder}>Search hospitals, blood banks, requests</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Donate or Request Section */}
        <View style={styles.donateRequestCard}>
          <View style={styles.cardContent}>
            <ThemedText style={styles.sectionTitle}>Donate or Request</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>
              Fast matching by blood type and location.
            </ThemedText>
            <View style={styles.buttonsRow}>
                 <TouchableOpacity 
                   style={styles.donateButton}
                   onPress={() => router.push('/donate-blood')}
                 >
                   <ThemedText style={styles.donateButtonText}>Donate Blood</ThemedText>
              </TouchableOpacity>
                 <TouchableOpacity 
                   style={styles.requestButton}
                   onPress={() => router.push('/request-blood')}
                 >
                   <ThemedText style={styles.requestButtonText}>Request Blood</ThemedText>
              </TouchableOpacity>
               </View>
          </View>
          <View style={styles.bloodCellImage}>
            <MaterialIcons name="water-drop" size={40} color="#E74C3C" style={styles.bloodCellIcon} />
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <ThemedText style={styles.summaryLabel}>Nearby centers</ThemedText>
            <View style={styles.summaryContent}>
              <MaterialIcons name="location-on" size={20} color="#7F8C8D" style={styles.summaryIcon} />
              <ThemedText style={styles.summaryText}>5 within 5km</ThemedText>
            </View>
          </View>
          <View style={styles.summaryCard}>
            <ThemedText style={styles.summaryLabel}>Your blood type</ThemedText>
            <View style={styles.summaryContent}>
              <MaterialIcons name="water-drop" size={20} color="#E74C3C" style={styles.summaryIcon} />
              <ThemedText style={styles.summaryText}>O+</ThemedText>
            </View>
          </View>
        </View>

        {/* Your Requests Section */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Your requests</ThemedText>
          <TouchableOpacity 
            style={styles.requestsButton}
            onPress={() => router.push('/requests')}
          >
            <ThemedText style={styles.requestsButtonText}>Requests</ThemedText>
          </TouchableOpacity>
      </View>

        <View style={styles.requestCard}>
        <View style={styles.requestRow}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={24} color="#FFFFFF" style={styles.avatarIcon} />
            </View>
            <View style={styles.requestContent}>
              <ThemedText style={styles.requestTitle}>Pending match</ThemedText>
              <ThemedText style={styles.requestSubtitle}>A+ • 2km away • Posted 1h ago</ThemedText>
            </View>
            <View style={styles.matchingStatus}>
              <ThemedText style={styles.statusText}>Matching</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.requestCard}>
          <View style={styles.requestRow}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={24} color="#FFFFFF" style={styles.avatarIcon} />
          </View>
          <View style={styles.requestContent}>
              <ThemedText style={styles.requestTitle}>Upcoming donation</ThemedText>
              <ThemedText style={styles.requestSubtitle}>O+ • City Hospital • Tomorrow 10:00</ThemedText>
            </View>
            <View style={styles.scheduledStatus}>
              <ThemedText style={styles.statusText}>Scheduled</ThemedText>
            </View>
          </View>
        </View>

        {/* Nearby Donation Centers */}
        <View style={styles.mapSection}>
          <View style={styles.mapHeader}>
            <ThemedText style={styles.sectionTitle}>Nearby donation centers</ThemedText>
            <TouchableOpacity style={styles.filterButton}>
              <MaterialIcons name="filter-list" size={16} color="#7F8C8D" style={styles.filterIcon} />
              <ThemedText style={styles.filterText}>Filters</ThemedText>
            </TouchableOpacity>
          </View>
          
          <View style={styles.mapPlaceholder}>
            <ThemedText style={styles.mapText}>Map View</ThemedText>
          </View>
          
          <View style={styles.mapButtons}>
            <TouchableOpacity style={styles.mapButton}>
              <MaterialIcons name="local-hospital" size={20} color="#4A90E2" style={styles.mapButtonIcon} />
              <ThemedText style={styles.mapButtonText}>Hospitals</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapButton}>
              <MaterialIcons name="water-drop" size={20} color="#E74C3C" style={styles.mapButtonIcon} />
              <ThemedText style={styles.mapButtonText}>Blood banks</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapButton}>
              <MaterialIcons name="location-on" size={20} color="#27AE60" style={styles.mapButtonIcon} />
              <ThemedText style={styles.mapButtonText}>Near me</ThemedText>
            </TouchableOpacity>
          </View>
          
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <ThemedText style={styles.liveText}>Live availability updates</ThemedText>
          </View>
        </View>

        {/* Blood Compatibility */}
        <ThemedText style={styles.sectionTitle}>Blood compatibility</ThemedText>
        <View style={styles.compatibilityGrid}>
          {[
            { type: 'O-', compatibility: 'Donate to All' },
            { type: 'O+', compatibility: 'Donate to O+, A+, B+, AB+' },
            { type: 'A-', compatibility: 'To A-, A+, AB-, AB+' },
            { type: 'A+', compatibility: 'To A+, AB+' },
            { type: 'B-', compatibility: 'To B-, B+, AB-, AB+' },
            { type: 'B+', compatibility: 'To B+, AB+' },
            { type: 'AB-', compatibility: 'To AB-, AB+' },
            { type: 'AB+', compatibility: 'Receive from All' },
          ].map((item) => (
            <View key={item.type} style={styles.compatibilityCard}>
              <ThemedText style={styles.bloodType}>{item.type}</ThemedText>
              <ThemedText style={styles.compatibilityText}>{item.compatibility}</ThemedText>
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
    backgroundColor: '#F8F4F4',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F4F4',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100, // Space for tab bar
  },
  
  // Header styles
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 24,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  heartIcon: {
    marginRight: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  tagline: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 16,
  },
  searchBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: '#7F8C8D',
  },
  searchActionIcon: {
    fontSize: 18,
    color: '#7F8C8D',
    marginLeft: 8,
  },

  // Donate/Request section
  donateRequestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardContent: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  requestsButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  requestsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  donateButton: {
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
  },
  donateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  requestButton: {
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
  },
  requestButtonText: {
    color: '#2C3E50',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  bloodCellImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F8F4F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  bloodCellIcon: {
    // Icon styling handled by MaterialIcons component
  },

  // Summary cards
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    marginRight: 8,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },

  // Requests section
  requestCard: {
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F4F4',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  requestSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  matchingStatus: {
    backgroundColor: '#FFE5E5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scheduledStatus: {
    backgroundColor: '#E8F4FD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E74C3C',
  },

  // Map section
  mapSection: {
    marginBottom: 24,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterIcon: {
    marginRight: 4,
  },
  filterText: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapText: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  mapButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  mapButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  mapButtonIcon: {
    marginBottom: 4,
  },
  mapButtonText: {
    fontSize: 12,
    color: '#2C3E50',
    fontWeight: '500',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E74C3C',
    marginRight: 8,
  },
  liveText: {
    fontSize: 12,
    color: '#7F8C8D',
  },

  // Blood compatibility
  compatibilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  compatibilityCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bloodType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  compatibilityText: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 20,
  },
});
