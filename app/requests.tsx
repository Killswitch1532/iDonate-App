import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

export default function RequestsScreen() {
  const [selectedFilter, setSelectedFilter] = useState<string>('All');

  const filters = ['All', 'Pending', 'Matched', 'Completed'];

  const requests = [
    {
      id: 1,
      status: 'pending',
      bloodType: 'A+',
      urgency: 'High',
      location: 'City General Hospital',
      distance: '2.4 km',
      postedTime: '1 hour ago',
      patientName: 'Sarah Johnson',
      units: 2,
    },
    {
      id: 2,
      status: 'matched',
      bloodType: 'O-',
      urgency: 'Medium',
      location: 'Regional Medical Center',
      distance: '5.2 km',
      postedTime: '3 hours ago',
      patientName: 'Michael Chen',
      units: 1,
    },
    {
      id: 3,
      status: 'completed',
      bloodType: 'B+',
      urgency: 'Low',
      location: 'Community Hospital',
      distance: '8.1 km',
      postedTime: '1 day ago',
      patientName: 'Emily Davis',
      units: 3,
    },
    {
      id: 4,
      status: 'pending',
      bloodType: 'AB-',
      urgency: 'High',
      location: 'Emergency Clinic',
      distance: '1.8 km',
      postedTime: '30 minutes ago',
      patientName: 'Robert Wilson',
      units: 1,
    },
  ];

  const filteredRequests = selectedFilter === 'All' 
    ? requests 
    : requests.filter(request => request.status === selectedFilter.toLowerCase());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'matched': return '#4A90E2';
      case 'completed': return '#27AE60';
      default: return '#7F8C8D';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'High': return '#E74C3C';
      case 'Medium': return '#F39C12';
      case 'Low': return '#27AE60';
      default: return '#7F8C8D';
    }
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
            <ThemedText style={styles.title}>Blood Requests</ThemedText>
            <ThemedText style={styles.subtitle}>Find and respond to urgent needs</ThemedText>
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
                key={filter}
                style={[
                  styles.filterButton,
                  selectedFilter === filter && styles.selectedFilterButton
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
          </ScrollView>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <ThemedText style={styles.statNumber}>{requests.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Total Requests</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statNumber}>
              {requests.filter(r => r.status === 'pending').length}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Pending</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statNumber}>
              {requests.filter(r => r.status === 'matched').length}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Matched</ThemedText>
          </View>
        </View>

        {/* Requests List */}
        <View style={styles.requestsSection}>
          {filteredRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="assignment" size={48} color="#7F8C8D" style={styles.emptyIcon} />
              <ThemedText style={styles.emptyTitle}>No requests found</ThemedText>
              <ThemedText style={styles.emptyDescription}>
                No requests match your current filter.
              </ThemedText>
            </View>
          ) : (
            filteredRequests.map((request) => (
              <TouchableOpacity 
                key={request.id} 
                style={styles.requestCard}
              >
                <View style={styles.requestHeader}>
                  <View style={styles.requestInfo}>
                    <ThemedText style={styles.patientName}>{request.patientName}</ThemedText>
                    <View style={styles.requestMeta}>
                      <ThemedText style={styles.bloodType}>{request.bloodType}</ThemedText>
                      <ThemedText style={styles.separator}>•</ThemedText>
                      <ThemedText style={styles.units}>{request.units} units</ThemedText>
                    </View>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(request.status) }
                  ]}>
                    <ThemedText style={styles.statusText}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.requestDetails}>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="local-hospital" size={16} color="#7F8C8D" style={styles.detailIcon} />
                    <ThemedText style={styles.detailText}>{request.location}</ThemedText>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="location-on" size={16} color="#7F8C8D" style={styles.detailIcon} />
                    <ThemedText style={styles.detailText}>{request.distance}</ThemedText>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="access-time" size={16} color="#7F8C8D" style={styles.detailIcon} />
                    <ThemedText style={styles.detailText}>{request.postedTime}</ThemedText>
                  </View>
                </View>

                <View style={styles.requestFooter}>
                  <View style={[
                    styles.urgencyBadge,
                    { backgroundColor: getUrgencyColor(request.urgency) }
                  ]}>
                    <ThemedText style={styles.urgencyText}>{request.urgency} Priority</ThemedText>
                  </View>
                  <TouchableOpacity style={styles.actionButton}>
                    <ThemedText style={styles.actionButtonText}>
                      {request.status === 'pending' ? 'Respond' : 'View Details'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  backIcon: {
    // Icon styling handled by MaterialIcons component
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
  },

  // Filters Section
  filtersSection: {
    marginBottom: 24,
  },
  filtersContainer: {
    paddingHorizontal: 4,
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedFilterButton: {
    backgroundColor: '#4A90E2',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  selectedFilterText: {
    color: '#FFFFFF',
  },

  // Stats Section
  statsSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
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
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
  },

  // Requests Section
  requestsSection: {
    marginBottom: 24,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bloodType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E74C3C',
  },
  separator: {
    fontSize: 14,
    color: '#7F8C8D',
    marginHorizontal: 8,
  },
  units: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  requestDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 8,
    width: 20,
    textAlign: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  urgencyBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 20,
  },
});
