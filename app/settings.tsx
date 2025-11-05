import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

export default function SettingsScreen() {
  const [anonymousDonations, setAnonymousDonations] = useState<boolean>(false);
  const [urgentRequests, setUrgentRequests] = useState<boolean>(false);
  const [messages, setMessages] = useState<boolean>(false);
  const [donationReminders, setDonationReminders] = useState<boolean>(false);
  const [biometricLogin, setBiometricLogin] = useState<boolean>(false);

  const SettingItem = ({ 
    icon, 
    title, 
    description, 
    onPress, 
    rightElement, 
    showChevron = false 
  }: {
    icon: string;
    title: string;
    description: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    showChevron?: boolean;
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingItemContent}>
        <MaterialIcons name={icon as any} size={20} color="#7F8C8D" style={styles.settingIcon} />
        <View style={styles.settingText}>
          <ThemedText style={styles.settingTitle}>{title}</ThemedText>
          <ThemedText style={styles.settingDescription}>{description}</ThemedText>
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement}
        {showChevron && (
          <MaterialIcons name="chevron-right" size={18} color="#7F8C8D" style={styles.chevron} />
        )}
      </View>
    </TouchableOpacity>
  );

  const Section = ({ 
    title, 
    icon, 
    children 
  }: {
    title: string;
    icon: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialIcons name={icon as any} size={20} color="#4A90E2" style={styles.sectionIcon} />
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      </View>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

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
            <ThemedText style={styles.title}>Settings</ThemedText>
            <ThemedText style={styles.subtitle}>Account, notifications, privacy</ThemedText>
          </View>
        </View>

        {/* Account Section */}
        <Section title="Account" icon="settings">
          <SettingItem
            icon="person"
            title="Profile information"
            description="Name, blood type, contact"
            showChevron={true}
            onPress={() => console.log('Profile information pressed')}
          />
          <SettingItem
            icon="location-on"
            title="Location & radius"
            description="Current city, search distance"
            rightElement={
              <View style={styles.radiusPill}>
                <ThemedText style={styles.radiusText}>10 km</ThemedText>
              </View>
            }
            showChevron={true}
            onPress={() => console.log('Location & radius pressed')}
          />
          <SettingItem
            icon="security"
            title="Anonymous donations"
            description="Hide identity when donating"
            rightElement={
              <Switch
                value={anonymousDonations}
                onValueChange={setAnonymousDonations}
                trackColor={{ false: '#E8E8E8', true: '#4A90E2' }}
                thumbColor={anonymousDonations ? '#FFFFFF' : '#FFFFFF'}
              />
            }
          />
        </Section>

        {/* Notifications Section */}
        <Section title="Notifications" icon="notifications">
          <SettingItem
            icon="warning"
            title="Urgent requests"
            description="Get alerts for matching urgent needs"
            rightElement={
              <Switch
                value={urgentRequests}
                onValueChange={setUrgentRequests}
                trackColor={{ false: '#E8E8E8', true: '#4A90E2' }}
                thumbColor={urgentRequests ? '#FFFFFF' : '#FFFFFF'}
              />
            }
          />
          <SettingItem
            icon="email"
            title="Messages"
            description="Direct messages from hospitals"
            rightElement={
              <Switch
                value={messages}
                onValueChange={setMessages}
                trackColor={{ false: '#E8E8E8', true: '#4A90E2' }}
                thumbColor={messages ? '#FFFFFF' : '#FFFFFF'}
              />
            }
          />
          <SettingItem
            icon="event"
            title="Donation reminders"
            description="Scheduling and eligibility"
            rightElement={
              <Switch
                value={donationReminders}
                onValueChange={setDonationReminders}
                trackColor={{ false: '#E8E8E8', true: '#4A90E2' }}
                thumbColor={donationReminders ? '#FFFFFF' : '#FFFFFF'}
              />
            }
          />
        </Section>

        {/* Privacy & Security Section */}
        <Section title="Privacy & Security" icon="lock">
          <SettingItem
            icon="visibility-off"
            title="Visibility"
            description="Control who can find you"
            showChevron={true}
            onPress={() => console.log('Visibility pressed')}
          />
          <SettingItem
            icon="vpn-key"
            title="Change password"
            description="Update your credentials"
            showChevron={true}
            onPress={() => console.log('Change password pressed')}
          />
          <SettingItem
            icon="fingerprint"
            title="Biometric login"
            description="Face/Touch ID"
            rightElement={
              <Switch
                value={biometricLogin}
                onValueChange={setBiometricLogin}
                trackColor={{ false: '#E8E8E8', true: '#4A90E2' }}
                thumbColor={biometricLogin ? '#FFFFFF' : '#FFFFFF'}
              />
            }
          />
        </Section>

        {/* Support Section */}
        <Section title="Support" icon="headset">
          <SettingItem
            icon="chat"
            title="Contact support"
            description="Chat or email us"
            showChevron={true}
            onPress={() => console.log('Contact support pressed')}
          />
          <SettingItem
            icon="description"
            title="Terms & privacy policy"
            description="Read the details"
            showChevron={true}
            onPress={() => console.log('Terms & privacy policy pressed')}
          />
        </Section>

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

  // Section
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  sectionContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  // Setting Item
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 18,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chevron: {
    // Icon styling handled by MaterialIcons component
  },

  // Radius Pill
  radiusPill: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  radiusText: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: '600',
  },

  // Bottom spacer
  bottomSpacer: {
    height: 20,
  },
});
