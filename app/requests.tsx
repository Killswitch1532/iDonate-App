import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { getActiveRequests } from '@/services/requestService';

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export default function RequestsScreen() {
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const filters = ['All', 'Critical', 'High', 'Moderate', 'Low'];

  const loadRequests = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data, error } = await getActiveRequests();
      if (error) throw error;
      setRequests(data || []);
    } catch (e) {
      console.error('[iDonate:Requests] Load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests(false);
  };

  const filteredRequests = selectedFilter === 'All'
    ? requests
    : requests.filter(r => r.urgency_level === selectedFilter.toLowerCase());

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return '#E74C3C';
      case 'high': return '#E67E22';
      case 'moderate': return '#F1C40F';
      case 'low': return '#27AE60';
      default: return '#7F8C8D';
    }
  };

  const criticalCount = requests.filter(r => r.urgency_level === 'critical' || r.urgency_level === 'high').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E74C3C']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#2C3E50" />
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
            <ThemedText style={styles.statLabel}>Active</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={[styles.statNumber, { color: '#E74C3C' }]}>{criticalCount}</ThemedText>
            <ThemedText style={styles.statLabel}>Urgent</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statNumber}>{filteredRequests.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Showing</ThemedText>
          </View>
        </View>

        {/* Requests List */}
        <View style={styles.requestsSection}>
          {loading ? (
            <ActivityIndicator size="large" color="#E74C3C" style={{ marginTop: 40 }} />
          ) : filteredRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="assignment" size={48} color="#BDC3C7" />
              <ThemedText style={styles.emptyTitle}>No requests found</ThemedText>
              <ThemedText style={styles.emptyDescription}>
                {selectedFilter === 'All'
                  ? 'No active blood requests right now. Pull to refresh.'
                  : `No ${selectedFilter.toLowerCase()} urgency requests. Try another filter.`}
              </ThemedText>
            </View>
          ) : (
            filteredRequests.map((req: any) => {
              const urgencyColor = getUrgencyColor(req.urgency_level);
              const timeAgo = getTimeAgo(req.created_at);
              const requesterName = req.institution_name || req.profiles?.full_name || 'Unknown';

              return (
                <TouchableOpacity
                  key={req.id}
                  style={styles.requestCard}
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/blood-request/[id]', params: { id: req.id } } as any)}
                >
                  {/* Card Header */}
                  <View style={styles.requestHeader}>
                    <View style={styles.requestInfo}>
                      <ThemedText style={styles.patientName} numberOfLines={1}>{requesterName}</ThemedText>
                      <View style={styles.requestMeta}>
                        <ThemedText style={styles.bloodType}>{req.blood_type_needed}</ThemedText>
                        <ThemedText style={styles.separator}>•</ThemedText>
                        <ThemedText style={styles.units}>{req.units_needed} unit{req.units_needed > 1 ? 's' : ''}</ThemedText>
                        {req.patient_name && (
                          <>
                            <ThemedText style={styles.separator}>•</ThemedText>
                            <ThemedText style={styles.units} numberOfLines={1}>{req.patient_name}</ThemedText>
                          </>
                        )}
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: urgencyColor }]}>
                      <ThemedText style={styles.statusText}>
                        {req.urgency_level.charAt(0).toUpperCase() + req.urgency_level.slice(1)}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Description */}
                  {req.description && (
                    <ThemedText style={styles.descriptionText} numberOfLines={2}>
                      {req.description}
                    </ThemedText>
                  )}

                  {/* Details Row */}
                  <View style={styles.requestDetails}>
                    {req.date_needed && (
                      <View style={styles.detailRow}>
                        <MaterialIcons name="event" size={14} color="#7F8C8D" style={styles.detailIcon} />
                        <ThemedText style={styles.detailText}>
                          Needed by {new Date(req.date_needed).toLocaleDateString()}
                          {req.time_needed ? ` at ${req.time_needed}` : ''}
                        </ThemedText>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <MaterialIcons name="access-time" size={14} color="#7F8C8D" style={styles.detailIcon} />
                      <ThemedText style={styles.detailText}>Posted {timeAgo}</ThemedText>
                    </View>
                  </View>

                  {/* Footer */}
                  <View style={styles.requestFooter}>
                    <View style={styles.footerLeft}>
                      <View style={[styles.bloodTypeCircle, { borderColor: urgencyColor }]}>
                        <ThemedText style={[styles.bloodTypeCircleText, { color: urgencyColor }]}>{req.blood_type_needed}</ThemedText>
                      </View>
                    </View>
                    <View style={styles.actionButton}>
                      <ThemedText style={styles.actionButtonText}>View Details</ThemedText>
                      <MaterialIcons name="chevron-right" size={16} color="#FFFFFF" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
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
    marginBottom: 20,
  },
  filtersContainer: {
    paddingHorizontal: 4,
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedFilterButton: {
    backgroundColor: '#E74C3C',
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
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 2,
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
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestInfo: {
    flex: 1,
    marginRight: 12,
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
    flexWrap: 'wrap',
  },
  bloodType: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E74C3C',
  },
  separator: {
    fontSize: 14,
    color: '#BDC3C7',
    marginHorizontal: 6,
  },
  units: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },

  // Description
  descriptionText: {
    fontSize: 13,
    color: '#7F8C8D',
    lineHeight: 18,
    marginBottom: 10,
    fontStyle: 'italic',
  },

  // Details
  requestDetails: {
    marginBottom: 12,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 6,
    width: 18,
    textAlign: 'center',
  },
  detailText: {
    fontSize: 13,
    color: '#95A5A6',
  },

  // Footer
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bloodTypeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bloodTypeCircleText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 20,
  },
});
