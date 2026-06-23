import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useMemo, useEffect } from 'react';
import { ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/donorService';

export default function SettingsScreen() {
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const styles = useStyles(colors, isDark);
  const { profile, user, refreshProfile } = useAuth();
  const [anonymousDonations, setAnonymousDonations] = useState<boolean>(false);
  const [urgentRequests, setUrgentRequests] = useState<boolean>(false);
  const [messages, setMessages] = useState<boolean>(false);
  const [donationReminders, setDonationReminders] = useState<boolean>(false);
  const [biometricLogin, setBiometricLogin] = useState<boolean>(false);

  // Load anonymous preference from profile
  useEffect(() => {
    if (profile?.default_anonymous !== undefined) {
      setAnonymousDonations(profile.default_anonymous);
    }
  }, [profile]);

  const handleAnonymousChange = async (value: boolean) => {
    setAnonymousDonations(value);
    if (user?.id) {
      await updateProfile(user.id, { default_anonymous: value });
      await refreshProfile();
    }
  };

  const ThemeOption = ({ mode, label }: { mode: 'light' | 'dark' | 'system', label: string }) => {
    const isSelected = themeMode === mode;
    return (
      <TouchableOpacity
        style={[styles.themeOption, isSelected && styles.themeOptionSelected]}
        onPress={() => setThemeMode(mode)}
      >
        <ThemedText style={[styles.themeOptionText, isSelected && styles.themeOptionTextSelected]}>
          {label}
        </ThemedText>
      </TouchableOpacity>
    );
  };

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
        <MaterialIcons name={icon as any} size={20} color={colors.icon} style={styles.settingIcon} />
        <View style={styles.settingText}>
          <ThemedText style={styles.settingTitle}>{title}</ThemedText>
          <ThemedText style={styles.settingDescription}>{description}</ThemedText>
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement}
        {showChevron && (
          <MaterialIcons name="chevron-right" size={18} color={colors.iconMuted} style={styles.chevron} />
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
        <MaterialIcons name={icon as any} size={20} color={colors.accent} style={styles.sectionIcon} />
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
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} style={styles.backIcon} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <ThemedText style={styles.title}>Settings</ThemedText>
            <ThemedText style={styles.subtitle}>Account, notifications, privacy</ThemedText>
          </View>
        </View>

        {/* Appearance Section */}
        <Section title="Appearance" icon="palette">
          <View style={styles.themeOptions}>
            <ThemeOption mode="light" label="Light" />
            <ThemeOption mode="dark" label="Dark" />
            <ThemeOption mode="system" label="System" />
          </View>
        </Section>

        {/* Account Section */}
        <Section title="Account" icon="settings">
          <SettingItem
            icon="person"
            title="Profile information"
            description="Name, blood type, contact"
            showChevron={true}
            onPress={() => router.push('/edit-profile')}
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
                onValueChange={handleAnonymousChange}
                trackColor={{ false: colors.borderLight, true: colors.accent }}
                thumbColor={anonymousDonations ? '#FFFFFF' : '#FFFFFF'}
              />
            }
          />
        </Section>

        {/* Legal Section */}
        <Section title="Legal" icon="gavel">
          <SettingItem
            icon="description"
            title="Privacy Policy"
            description="Read how we handle your data"
            showChevron={true}
            onPress={() => router.push('/privacy-policy')}
          />
          <SettingItem
            icon="article"
            title="Terms of Service"
            description="Read the platform rules"
            showChevron={true}
            onPress={() => router.push('/terms-of-service')}
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
                trackColor={{ false: colors.borderLight, true: colors.accent }}
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
                trackColor={{ false: colors.borderLight, true: colors.accent }}
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
                trackColor={{ false: colors.borderLight, true: colors.accent }}
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
                trackColor={{ false: colors.borderLight, true: colors.accent }}
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
    // Icon styling handled by MaterialIcons component
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

  // Section
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
    color: colors.textPrimary,
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
    borderBottomColor: colors.borderLight,
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
    color: colors.textPrimary,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
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
    backgroundColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  radiusText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  // Theme Options
  themeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  themeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  themeOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '20',
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  themeOptionTextSelected: {
    color: colors.accent,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 20,
  },
}), [colors, isDark]);
