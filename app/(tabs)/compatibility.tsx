import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

export default function CompatibilityScreen() {
  const [selectedBloodType, setSelectedBloodType] = useState<string>('');
  const [showMatrix, setShowMatrix] = useState<boolean>(false);

  const bloodTypes = [
    { type: 'O-', color: '#E74C3C', description: 'Universal Donor', percentage: '7%' },
    { type: 'O+', color: '#C0392B', description: 'Most Common', percentage: '37%' },
    { type: 'A-', color: '#3498DB', description: 'Rare Type', percentage: '6%' },
    { type: 'A+', color: '#2980B9', description: 'Common Type', percentage: '34%' },
    { type: 'B-', color: '#27AE60', description: 'Rare Type', percentage: '2%' },
    { type: 'B+', color: '#229954', description: 'Common Type', percentage: '9%' },
    { type: 'AB-', color: '#8E44AD', description: 'Rarest Type', percentage: '1%' },
    { type: 'AB+', color: '#9B59B6', description: 'Universal Receiver', percentage: '4%' },
  ];

  const compatibilityMatrix = {
    'O-': { canDonateTo: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], canReceiveFrom: ['O-'] },
    'O+': { canDonateTo: ['O+', 'A+', 'B+', 'AB+'], canReceiveFrom: ['O-', 'O+'] },
    'A-': { canDonateTo: ['A-', 'A+', 'AB-', 'AB+'], canReceiveFrom: ['O-', 'A-'] },
    'A+': { canDonateTo: ['A+', 'AB+'], canReceiveFrom: ['O-', 'O+', 'A-', 'A+'] },
    'B-': { canDonateTo: ['B-', 'B+', 'AB-', 'AB+'], canReceiveFrom: ['O-', 'B-'] },
    'B+': { canDonateTo: ['B+', 'AB+'], canReceiveFrom: ['O-', 'O+', 'B-', 'B+'] },
    'AB-': { canDonateTo: ['AB-', 'AB+'], canReceiveFrom: ['O-', 'A-', 'B-', 'AB-'] },
    'AB+': { canDonateTo: ['AB+'], canReceiveFrom: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] },
  };

  const getCompatibilityInfo = (bloodType: string) => {
    return compatibilityMatrix[bloodType as keyof typeof compatibilityMatrix];
  };

  const renderBloodTypeCard = (bloodType: any) => {
    const isSelected = selectedBloodType === bloodType.type;
    const compatibility = getCompatibilityInfo(bloodType.type);
    
    return (
      <TouchableOpacity
        key={bloodType.type}
        style={[
          styles.bloodTypeCard,
          { backgroundColor: bloodType.color },
          isSelected && styles.selectedCard
        ]}
        onPress={() => setSelectedBloodType(isSelected ? '' : bloodType.type)}
      >
        <View style={styles.cardContent}>
          <Text style={styles.bloodTypeText}>{bloodType.type}</Text>
          <Text style={styles.bloodTypeDescription}>{bloodType.description}</Text>
          <Text style={styles.bloodTypePercentage}>{bloodType.percentage} of population</Text>
          
          {isSelected && (
            <View style={styles.compatibilityInfo}>
              <View style={styles.compatibilitySection}>
                <Text style={styles.compatibilityTitle}>Can Donate To:</Text>
                <View style={styles.compatibilityTags}>
                  {compatibility.canDonateTo.map((type) => (
                    <View key={type} style={styles.compatibilityTag}>
                      <Text style={styles.compatibilityTagText}>{type}</Text>
                    </View>
                  ))}
                </View>
              </View>
              
              <View style={styles.compatibilitySection}>
                <Text style={styles.compatibilityTitle}>Can Receive From:</Text>
                <View style={styles.compatibilityTags}>
                  {compatibility.canReceiveFrom.map((type) => (
                    <View key={type} style={styles.compatibilityTag}>
                      <Text style={styles.compatibilityTagText}>{type}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderMatrix = () => {
    return (
      <View style={styles.matrixContainer}>
        <Text style={styles.matrixTitle}>Blood Compatibility Matrix</Text>
        <View style={styles.matrix}>
          <View style={styles.matrixHeader}>
            <Text style={styles.matrixHeaderText}>Donor →</Text>
            <Text style={styles.matrixHeaderText}>Recipient ↓</Text>
          </View>
          
          {bloodTypes.map((donor) => (
            <View key={donor.type} style={styles.matrixRow}>
              <Text style={[styles.matrixLabel, { color: donor.color }]}>{donor.type}</Text>
              {bloodTypes.map((recipient) => {
                const canDonate = compatibilityMatrix[donor.type as keyof typeof compatibilityMatrix]
                  .canDonateTo.includes(recipient.type);
                return (
                  <View
                    key={`${donor.type}-${recipient.type}`}
                    style={[
                      styles.matrixCell,
                      canDonate ? styles.compatibleCell : styles.incompatibleCell
                    ]}
                  >
                    <MaterialIcons 
                      name={canDonate ? 'check' : 'close'} 
                      size={12} 
                      color={canDonate ? '#27AE60' : '#E74C3C'} 
                      style={styles.matrixCellText} 
                    />
                  </View>
                );
              })}
            </View>
          ))}
        </View>
        
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.compatibleCell]} />
            <Text style={styles.legendText}>Compatible</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.incompatibleCell]} />
            <Text style={styles.legendText}>Incompatible</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <MaterialIcons name="favorite" size={24} color="#E74C3C" style={styles.heartIcon} />
            <ThemedText style={styles.logoText}>iDonate</ThemedText>
          </View>
          <ThemedText style={styles.headerSubtitle}>Blood Compatibility</ThemedText>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <ThemedText style={styles.title}>Blood Type Compatibility</ThemedText>
          <ThemedText style={styles.subtitle}>
            Learn which blood types can donate to and receive from each other
          </ThemedText>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statLabel}>Blood Types</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>64</Text>
            <Text style={styles.statLabel}>Combinations</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>O-</Text>
            <Text style={styles.statLabel}>Universal Donor</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>AB+</Text>
            <Text style={styles.statLabel}>Universal Receiver</Text>
          </View>
        </View>

        {/* Blood Type Cards */}
        <View style={styles.bloodTypesSection}>
          <ThemedText style={styles.sectionTitle}>Blood Types</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>
            Tap on a blood type to see compatibility details
          </ThemedText>
          
          <View style={styles.bloodTypesGrid}>
            {bloodTypes.map(renderBloodTypeCard)}
          </View>
        </View>

        {/* Matrix Toggle */}
        <TouchableOpacity
          style={styles.matrixToggle}
          onPress={() => setShowMatrix(!showMatrix)}
        >
          <ThemedText style={styles.matrixToggleText}>
            {showMatrix ? 'Hide' : 'Show'} Compatibility Matrix
          </ThemedText>
          <ThemedText style={styles.matrixToggleIcon}>
            {showMatrix ? '▲' : '▼'}
          </ThemedText>
        </TouchableOpacity>

        {/* Compatibility Matrix */}
        {showMatrix && renderMatrix()}

        {/* Educational Content */}
        <View style={styles.educationSection}>
          <ThemedText style={styles.sectionTitle}>Did You Know?</ThemedText>
          
          <View style={styles.factCard}>
            <MaterialIcons name="water-drop" size={24} color="#E74C3C" style={styles.factIcon} />
            <View style={styles.factContent}>
              <Text style={styles.factTitle}>Universal Donor</Text>
              <Text style={styles.factDescription}>
                O- blood can be donated to anyone, making it the most valuable blood type for emergencies.
              </Text>
            </View>
          </View>
          
          <View style={styles.factCard}>
            <MaterialIcons name="favorite" size={24} color="#E74C3C" style={styles.factIcon} />
            <View style={styles.factContent}>
              <Text style={styles.factTitle}>Universal Receiver</Text>
              <Text style={styles.factDescription}>
                AB+ blood can receive from any blood type, but can only donate to other AB+ recipients.
              </Text>
            </View>
          </View>
          
          <View style={styles.factCard}>
            <MaterialIcons name="flash-on" size={24} color="#F39C12" style={styles.factIcon} />
            <View style={styles.factContent}>
              <Text style={styles.factTitle}>Rh Factor</Text>
              <Text style={styles.factDescription}>
                The + or - indicates the presence of Rh factor. Rh- can donate to Rh+, but not vice versa.
              </Text>
            </View>
          </View>

          <View style={styles.factCard}>
            <MaterialIcons name="schedule" size={24} color="#3498DB" style={styles.factIcon} />
            <View style={styles.factContent}>
              <Text style={styles.factTitle}>Blood Shelf Life</Text>
              <Text style={styles.factDescription}>
                Red blood cells can be stored for up to 42 days, platelets for 5 days, and plasma for up to 1 year when frozen.
              </Text>
            </View>
          </View>

          <View style={styles.factCard}>
            <MaterialIcons name="science" size={24} color="#8E44AD" style={styles.factIcon} />
            <View style={styles.factContent}>
              <Text style={styles.factTitle}>Blood Components</Text>
              <Text style={styles.factDescription}>
                One donation can be separated into red cells, plasma, platelets, and cryoprecipitate, helping multiple patients.
              </Text>
            </View>
          </View>

          <View style={styles.factCard}>
            <MaterialIcons name="group" size={24} color="#27AE60" style={styles.factIcon} />
            <View style={styles.factContent}>
              <Text style={styles.factTitle}>Population Distribution</Text>
              <Text style={styles.factDescription}>
                O+ is the most common blood type (37%), while AB- is the rarest (1%). Blood type distribution varies by ethnicity.
              </Text>
            </View>
          </View>

          <View style={styles.factCard}>
            <MaterialIcons name="local-hospital" size={24} color="#E67E22" style={styles.factIcon} />
            <View style={styles.factContent}>
              <Text style={styles.factTitle}>Emergency Situations</Text>
              <Text style={styles.factDescription}>
                In emergencies, O- blood is used when the patient's blood type is unknown, as it's safe for everyone.
              </Text>
            </View>
          </View>

          <View style={styles.factCard}>
            <MaterialIcons name="pregnant-woman" size={24} color="#E91E63" style={styles.factIcon} />
            <View style={styles.factContent}>
              <Text style={styles.factTitle}>Pregnancy & Blood Type</Text>
              <Text style={styles.factDescription}>
                Rh incompatibility between mother and baby can cause complications, which is why Rh- mothers need special care.
              </Text>
            </View>
          </View>

          <View style={styles.factCard}>
            <MaterialIcons name="fitness-center" size={24} color="#795548" style={styles.factIcon} />
            <View style={styles.factContent}>
              <Text style={styles.factTitle}>Donation Frequency</Text>
              <Text style={styles.factDescription}>
                Healthy adults can donate whole blood every 56 days, platelets every 7 days, and plasma every 28 days.
              </Text>
            </View>
          </View>

          <View style={styles.factCard}>
            <MaterialIcons name="security" size={24} color="#607D8B" style={styles.factIcon} />
            <View style={styles.factContent}>
              <Text style={styles.factTitle}>Blood Safety</Text>
              <Text style={styles.factDescription}>
                All donated blood is tested for infectious diseases including HIV, hepatitis B and C, and syphilis.
              </Text>
            </View>
          </View>

          <View style={styles.factCard}>
            <MaterialIcons name="trending-up" size={24} color="#FF5722" style={styles.factIcon} />
            <View style={styles.factContent}>
              <Text style={styles.factTitle}>Global Demand</Text>
              <Text style={styles.factDescription}>
                Every 2 seconds, someone in the US needs blood. A single car accident victim may require up to 100 pints of blood.
              </Text>
            </View>
          </View>

          <View style={styles.factCard}>
            <MaterialIcons name="history-edu" size={24} color="#3F51B5" style={styles.factIcon} />
            <View style={styles.factContent}>
              <Text style={styles.factTitle}>Blood Type History</Text>
              <Text style={styles.factDescription}>
                Blood types were discovered in 1901 by Karl Landsteiner, who won the Nobel Prize for this breakthrough.
              </Text>
            </View>
          </View>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
  },

  // Blood Types Section
  bloodTypesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 16,
  },
  bloodTypesGrid: {
    gap: 12,
  },
  bloodTypeCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedCard: {
    transform: [{ scale: 1.02 }],
  },
  cardContent: {
    alignItems: 'center',
  },
  bloodTypeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bloodTypeDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
  },
  bloodTypePercentage: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  compatibilityInfo: {
    marginTop: 16,
    width: '100%',
  },
  compatibilitySection: {
    marginBottom: 12,
  },
  compatibilityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  compatibilityTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  compatibilityTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  compatibilityTagText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Matrix Toggle
  matrixToggle: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  matrixToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  matrixToggleIcon: {
    fontSize: 16,
    color: '#7F8C8D',
  },

  // Matrix
  matrixContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  matrixTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
    textAlign: 'center',
  },
  matrix: {
    marginBottom: 16,
  },
  matrixHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  matrixHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
    flex: 1,
    textAlign: 'center',
  },
  matrixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  matrixLabel: {
    fontSize: 14,
    fontWeight: '600',
    width: 30,
    textAlign: 'center',
  },
  matrixCell: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    borderRadius: 4,
  },
  compatibleCell: {
    backgroundColor: '#D5F4E6',
  },
  incompatibleCell: {
    backgroundColor: '#FADBD8',
  },
  matrixCellText: {
    // Icon styling handled by MaterialIcons component
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    color: '#7F8C8D',
  },

  // Education Section
  educationSection: {
    marginBottom: 24,
  },
  factCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  factIcon: {
    marginRight: 12,
  },
  factContent: {
    flex: 1,
  },
  factTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  factDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 20,
  },
});
