import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useMemo } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';

export default function SearchScreen() {
  const { colors, isDark } = useTheme();
  const styles = useStyles(colors, isDark);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const filters = [
    { id: 'nearby', label: 'Nearby', icon: 'location-on' },
    { id: 'donors', label: 'Donors', icon: 'favorite' },
    { id: 'hospitals', label: 'Hospitals', icon: 'local-hospital' },
    { id: 'compatible', label: 'Compatible', icon: 'link' },
    { id: 'open-now', label: 'Open now', icon: 'schedule' },
    { id: 'urgent', label: 'Urgent', icon: 'flash-on' },
    { id: 'blood-banks', label: 'Blood banks', icon: 'water-drop' },
    { id: 'requests', label: 'Requests', icon: 'assignment' },
  ];

  const topResults = [
    {
      id: 1,
      name: 'Central City Hospital',
      icon: 'local-hospital',
      distance: '2.1 km',
      status: 'Open until 9 PM',
      type: 'Hospital',
      typeColor: '#E8E8E8',
    },
    {
      id: 2,
      name: 'Sunrise Blood Bank',
      icon: 'water-drop',
      distance: '3.8 km',
      status: 'Stock: O+, A+',
      type: 'Blood bank',
      typeColor: '#E8E8E8',
    },
    {
      id: 3,
      name: 'Receiver request • A+',
      icon: 'group',
      distance: 'Downtown',
      status: 'Needed today',
      type: 'Request',
      typeColor: '#E8E8E8',
    },
    {
      id: 4,
      name: 'Metro Medical Center',
      icon: 'local-hospital',
      distance: '1.5 km',
      status: 'Open 24/7',
      type: 'Hospital',
      typeColor: '#E8E8E8',
    },
    {
      id: 5,
      name: 'Golden Gate Blood Center',
      icon: 'water-drop',
      distance: '4.2 km',
      status: 'Stock: All types',
      type: 'Blood bank',
      typeColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E8E8E8',
    },
  ];

  const toggleFilter = (filterId: string) => {
    setSelectedFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

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
            <ThemedText style={styles.title}>Search</ThemedText>
            <ThemedText style={styles.subtitle}>Hospitals, blood banks, requests</ThemedText>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color={colors.icon} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search hospitals, blood banks, requests"
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
            />
            <TouchableOpacity style={styles.searchActionButton}>
              <ThemedText style={styles.searchActionIcon}>🎤</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.searchActionButton}>
              <ThemedText style={styles.searchActionIcon}>📷</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filtersSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterButton,
                  selectedFilters.includes(filter.id) && styles.selectedFilterButton
                ]}
                onPress={() => toggleFilter(filter.id)}
              >
                <MaterialIcons name={filter.icon as any} size={16} color={selectedFilters.includes(filter.id) ? colors.surface : colors.icon} style={styles.filterIcon} />
                <ThemedText style={[
                  styles.filterText,
                  selectedFilters.includes(filter.id) && styles.selectedFilterText
                ]}>
                  {filter.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardContent}>
              <ThemedText style={styles.summaryIcon}>🩺</ThemedText>
              <View style={styles.summaryText}>
                <ThemedText style={styles.summaryTitle}>Nearest hospital</ThemedText>
                <ThemedText style={styles.summarySubtitle}>Within 5 km</ThemedText>
              </View>
            </View>
            <TouchableOpacity style={styles.summaryButton}>
              <ThemedText style={styles.summaryButtonText}>View</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryCardContent}>
              <ThemedText style={styles.summaryIcon}>📊</ThemedText>
              <View style={styles.summaryText}>
                <ThemedText style={styles.summaryTitle}>Urgent requests</ThemedText>
                <ThemedText style={styles.summarySubtitle}>Priority matches</ThemedText>
              </View>
            </View>
            <TouchableOpacity style={styles.summaryButton}>
              <ThemedText style={styles.summaryButtonText}>Open</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Top Results */}
        <View style={styles.resultsSection}>
          <View style={styles.resultsHeader}>
            <MaterialIcons name="check-circle" size={20} color={colors.accent} style={styles.resultsIcon} />
            <ThemedText style={styles.resultsTitle}>Top results</ThemedText>
          </View>

          <View style={styles.resultsList}>
            {topResults.map((result) => (
              <TouchableOpacity key={result.id} style={styles.resultItem}>
                <View style={styles.resultContent}>
                  <MaterialIcons name={result.icon as any} size={20} color={colors.accent} style={styles.resultIcon} />
                  <View style={styles.resultInfo}>
                    <ThemedText style={styles.resultName}>{result.name}</ThemedText>
                    <ThemedText style={styles.resultDetails}>
                      {result.distance} • {result.status}
                    </ThemedText>
                  </View>
                </View>
                <View style={[styles.resultTag, { backgroundColor: result.typeColor }]}>
                  <ThemedText style={styles.resultTagText}>{result.type}</ThemedText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Map Section */}
        <View style={styles.mapSection}>
          <View style={styles.mapContainer}>
            <View style={styles.mapPlaceholder}>
              <ThemedText style={styles.mapTitle}>Interactive Map</ThemedText>
              <ThemedText style={styles.mapSubtitle}>San Francisco Area</ThemedText>
              <View style={styles.mapFeatures}>
                <View style={styles.mapFeature}>
                  <MaterialIcons name="location-on" size={16} color={colors.icon} style={styles.mapFeatureIcon} />
                  <ThemedText style={styles.mapFeatureText}>Golden Gate Park</ThemedText>
                </View>
                <View style={styles.mapFeature}>
                  <MaterialIcons name="local-hospital" size={16} color={colors.icon} style={styles.mapFeatureIcon} />
                  <ThemedText style={styles.mapFeatureText}>Laguna Honda Hospital</ThemedText>
                </View>
                <View style={styles.mapFeature}>
                  <MaterialIcons name="location-city" size={16} color={colors.icon} style={styles.mapFeatureIcon} />
                  <ThemedText style={styles.mapFeatureText}>Mission District</ThemedText>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
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
    backgroundColor: colors.background,
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
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },

  // Search Section
  searchSection: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  searchActionButton: {
    padding: 8,
    marginLeft: 8,
  },
  searchActionIcon: {
    fontSize: 20,
    color: colors.icon,
  },

  // Filters Section
  filtersSection: {
    marginBottom: 24,
  },
  filtersContainer: {
    paddingHorizontal: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  selectedFilterButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  selectedFilterText: {
    color: colors.surface,
  },

  // Summary Section
  summarySection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  summaryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  summaryIcon: {
    fontSize: 24,
    marginRight: 12,
    width: 32,
    textAlign: 'center',
  },
  summaryText: {
    flex: 1,
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
    lineHeight: 20,
  },
  summarySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  summaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.surface,
  },

  // Results Section
  resultsSection: {
    marginBottom: 24,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  resultsList: {
    gap: 12,
  },
  resultItem: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  resultIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  resultDetails: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  resultTag: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resultTagText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  // Map Section
  mapSection: {
    marginBottom: 24,
  },
  mapContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  mapPlaceholder: {
    height: 300,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  mapSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  mapFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  mapFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  mapFeatureIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  mapFeatureText: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 20,
  },
}), [colors, isDark]);
