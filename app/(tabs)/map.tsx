import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

export default function MapScreen() {
  const [selectedFilter, setSelectedFilter] = useState<string>('Hospitals');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filters = ['All', 'Hospitals', 'Blood banks', 'Open now'];

  const nearbyCenters = [
    {
      id: 1,
      name: 'Sunrise Blood Bank',
      avatar: 'person',
      details: 'Accepts O+, O-, A+ • Closes 7 pm',
      distance: '2.4 km',
    },
    {
      id: 2,
      name: 'Metro Clinic',
      avatar: 'person',
      details: 'AB+ drive • Today 3-6 pm',
      distance: '3.1 km',
    },
    {
      id: 3,
      name: 'City Community Center',
      avatar: 'person',
      details: 'Drive this weekend • All types',
      distance: '4.0 km',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <MaterialIcons name="favorite" size={24} color="#E74C3C" style={styles.heartIcon} />
            <ThemedText style={styles.logoText}>iDonate</ThemedText>
          </View>
          <ThemedText style={styles.headerSubtitle}>Donation centers map</ThemedText>
        </View>

        {/* Navigation and Title */}
        <View style={styles.titleSection}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#2C3E50" style={styles.backIcon} />
          </TouchableOpacity>
          <View style={styles.titleContent}>
            <ThemedText style={styles.title}>Nearby Centers</ThemedText>
            <ThemedText style={styles.titleSubtitle}>Find hospitals & blood banks</ThemedText>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color="#7F8C8D" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search location or center"
              placeholderTextColor="#9AA4AB"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.locationButton}>
            <MaterialIcons name="my-location" size={20} color="#4A90E2" style={styles.locationIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <MaterialIcons name="menu" size={20} color="#7F8C8D" style={styles.filterIcon} />
          </TouchableOpacity>
        </View>

        {/* Map View */}
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <ThemedText style={styles.mapText}>Map View</ThemedText>
            <ThemedText style={styles.mapSubtext}>JAPANTOWN • GOLDEN GATE PARK • HAIGHT-ASHBURY</ThemedText>
            <ThemedText style={styles.mapSubtext}>MISSION DISTRICT • STONESTOWN</ThemedText>
            
            {/* Map markers */}
            <View style={styles.mapMarkers}>
              <View style={styles.marker}>
                <MaterialIcons name="local-hospital" size={16} color="#E74C3C" style={styles.markerIcon} />
                <ThemedText style={styles.markerText}>Laguna Honda Hospital</ThemedText>
              </View>
              <View style={styles.marker}>
                <MaterialIcons name="shopping-cart" size={16} color="#4A90E2" style={styles.markerIcon} />
                <ThemedText style={styles.markerText}>Trader Joe's</ThemedText>
              </View>
              <View style={styles.marker}>
                <MaterialIcons name="museum" size={16} color="#8E44AD" style={styles.markerIcon} />
                <ThemedText style={styles.markerText}>Asian Art Museum</ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filtersSection}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                selectedFilter === filter && styles.selectedFilterChip
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <ThemedText style={[
                styles.filterText,
                selectedFilter === filter && styles.selectedFilterText
              ]}>
                {filter}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Selected Center Card */}
        <View style={styles.selectedCenterCard}>
          <ThemedText style={styles.centerName}>Central City Hospital</ThemedText>
          <View style={styles.centerDetails}>
            <ThemedText style={styles.centerInfo}>A+ • O- accepted • 1.2 km away</ThemedText>
            <ThemedText style={styles.openStatus}>Open</ThemedText>
          </View>
          <View style={styles.donationInfo}>
            <View style={styles.avatarContainer}>
              <MaterialIcons name="person" size={24} color="#FFFFFF" style={styles.centerAvatar} />
            </View>
            <ThemedText style={styles.donationType}>Walk-in donation</ThemedText>
          </View>
          <ThemedText style={styles.operatingHours}>Mon-Sat • 9:00-18:00</ThemedText>
          
          <View style={styles.centerActions}>
            <TouchableOpacity style={styles.directionsButton}>
              <ThemedText style={styles.directionsIcon}>📤</ThemedText>
              <ThemedText style={styles.directionsText}>Directions</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.callButton}>
              <ThemedText style={styles.callIcon}>📞</ThemedText>
              <ThemedText style={styles.callText}>Call</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Nearby Options */}
        <ThemedText style={styles.sectionTitle}>Nearby options</ThemedText>
        <View style={styles.nearbyCentersList}>
          {nearbyCenters.map((center) => (
            <View key={center.id} style={styles.nearbyCenterCard}>
              <View style={styles.nearbyCenterContent}>
                <View style={styles.nearbyAvatar}>
                  <ThemedText style={styles.nearbyAvatarEmoji}>{center.avatar}</ThemedText>
                </View>
                <View style={styles.nearbyCenterInfo}>
                  <ThemedText style={styles.nearbyCenterName}>{center.name}</ThemedText>
                  <ThemedText style={styles.nearbyCenterDetails}>{center.details}</ThemedText>
                </View>
                <ThemedText style={styles.nearbyDistance}>{center.distance}</ThemedText>
              </View>
            </View>
          ))}
        </View>

        {/* Bottom Buttons */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity 
            style={styles.backButtonBottom}
            onPress={() => router.back()}
          >
            <ThemedText style={styles.backButtonText}>Back</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.registerButton}>
            <ThemedText style={styles.registerButtonText}>Register to donate</ThemedText>
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
    fontSize: 24,
    marginRight: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },

  // Title Section
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F4FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  backIcon: {
    fontSize: 20,
    color: '#4A90E2',
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  titleSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },

  // Search Section
  searchSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  searchBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
    color: '#9AA4AB',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
  },
  locationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  locationIcon: {
    fontSize: 20,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterIcon: {
    fontSize: 20,
    color: '#2C3E50',
  },

  // Map Container
  mapContainer: {
    marginBottom: 20,
  },
  mapPlaceholder: {
    height: 300,
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mapText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  mapSubtext: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 4,
  },
  mapMarkers: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  marker: {
    alignItems: 'center',
  },
  markerIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  markerText: {
    fontSize: 10,
    color: '#7F8C8D',
    textAlign: 'center',
  },

  // Filter Buttons
  filtersSection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedFilterChip: {
    backgroundColor: '#E8F4FD',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  selectedFilterText: {
    color: '#4A90E2',
  },

  // Selected Center Card
  selectedCenterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  centerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  centerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  centerInfo: {
    fontSize: 14,
    color: '#7F8C8D',
    flex: 1,
  },
  openStatus: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  donationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarContainer: {
    marginRight: 8,
  },
  centerAvatar: {
    fontSize: 20,
  },
  donationType: {
    fontSize: 14,
    color: '#2C3E50',
  },
  operatingHours: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 16,
  },
  centerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  directionsButton: {
    flex: 1,
    backgroundColor: '#E8F4FD',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  directionsIcon: {
    fontSize: 16,
  },
  directionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  callButton: {
    flex: 1,
    backgroundColor: '#E74C3C',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callIcon: {
    fontSize: 16,
  },
  callText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Nearby Options
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  nearbyCentersList: {
    marginBottom: 24,
  },
  nearbyCenterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  nearbyCenterContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nearbyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F4F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nearbyAvatarEmoji: {
    fontSize: 20,
  },
  nearbyCenterInfo: {
    flex: 1,
  },
  nearbyCenterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  nearbyCenterDetails: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  nearbyDistance: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },

  // Bottom Buttons
  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  backButtonBottom: {
    flex: 1,
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  registerButton: {
    flex: 1,
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Bottom spacer
  bottomSpacer: {
    height: 20,
  },
});
