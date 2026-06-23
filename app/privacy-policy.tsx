import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';

export default function PrivacyPolicyScreen() {
  const { colors, isDark } = useTheme();
  const styles = useStyles(colors, isDark);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Privacy Policy</ThemedText>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>1. Introduction</ThemedText>
          <ThemedText style={styles.paragraph}>
            Welcome to iDonate! Your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
          </ThemedText>
          <ThemedText style={styles.paragraph}>
            iDonate is a digital blood coordination and emergency response platform that connects donors, recipients, hospitals, and blood banks. We are committed to protecting your personal information and your right to privacy.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>2. Information We Collect</ThemedText>
          <ThemedText style={styles.subtitle}>Personal Information</ThemedText>
          <ThemedText style={styles.listItem}>• Full Name</ThemedText>
          <ThemedText style={styles.listItem}>• Email Address</ThemedText>
          <ThemedText style={styles.listItem}>• Phone Number</ThemedText>
          <ThemedText style={styles.listItem}>• Blood Type</ThemedText>
          <ThemedText style={styles.listItem}>• Genotype (optional)</ThemedText>
          <ThemedText style={styles.listItem}>• Date of Birth</ThemedText>
          <ThemedText style={styles.listItem}>• Address (optional)</ThemedText>
          <ThemedText style={styles.listItem}>• Weight (optional)</ThemedText>
          <ThemedText style={styles.listItem}>• Profile Photo (optional)</ThemedText>

          <ThemedText style={[styles.subtitle, { marginTop: 16 }]}>Usage Information</ThemedText>
          <ThemedText style={styles.listItem}>• Donation History</ThemedText>
          <ThemedText style={styles.listItem}>• Request History</ThemedText>
          <ThemedText style={styles.listItem}>• Location Data (for matching nearby donors/institutions)</ThemedText>
          <ThemedText style={styles.listItem}>• Device Information</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>3. How We Use Your Information</ThemedText>
          <ThemedText style={styles.listItem}>• To manage your account</ThemedText>
          <ThemedText style={styles.listItem}>• To match donors with recipients</ThemedText>
          <ThemedText style={styles.listItem}>• To coordinate blood requests and donations</ThemedText>
          <ThemedText style={styles.listItem}>• To send notifications about urgent blood needs</ThemedText>
          <ThemedText style={styles.listItem}>• To improve our platform</ThemedText>
          <ThemedText style={styles.listItem}>• To ensure platform security and prevent abuse</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>4. Location Data</ThemedText>
          <ThemedText style={styles.paragraph}>
            Location data is used to match nearby donors and institutions. Your exact location is not publicly displayed. We use approximate distance calculations to facilitate matches.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>5. Data Sharing</ThemedText>
          <ThemedText style={styles.paragraph}>
            We do not sell your data. Your information may be shared in the following cases:
          </ThemedText>
          <ThemedText style={styles.listItem}>• With institutions/hospitals for coordination purposes</ThemedText>
          <ThemedText style={styles.listItem}>• With matched donors/recipients (if you're not donating anonymously)</ThemedText>
          <ThemedText style={styles.listItem}>• With administrators for moderation and support</ThemedText>
          <ThemedText style={styles.listItem}>• When required by law or to protect our rights</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>6. Security Measures</ThemedText>
          <ThemedText style={styles.listItem}>• Secure authentication</ThemedText>
          <ThemedText style={styles.listItem}>• Encrypted data transmission</ThemedText>
          <ThemedText style={styles.listItem}>• Role-based access control</ThemedText>
          <ThemedText style={styles.listItem}>• Secure cloud infrastructure</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>7. User Rights</ThemedText>
          <ThemedText style={styles.listItem}>• Update your personal information</ThemedText>
          <ThemedText style={styles.listItem}>• Request deletion of your account</ThemedText>
          <ThemedText style={styles.listItem}>• Manage your privacy settings</ThemedText>
          <ThemedText style={styles.listItem}>• Control notification preferences</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>8. Anonymous Donations</ThemedText>
          <ThemedText style={styles.paragraph}>
            Users may choose to donate anonymously. When anonymous, your identity is hidden from recipients and other users, but remains visible to platform administrators for safety, moderation, and accountability purposes.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>9. Data Retention</ThemedText>
          <ThemedText style={styles.paragraph}>
            We retain your information for as long as necessary to provide our services and comply with legal obligations. If you delete your account, we will remove your personal information while retaining necessary records for audit and security purposes.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>10. Contact Information</ThemedText>
          <ThemedText style={styles.paragraph}>
            If you have questions about this Privacy Policy, please contact us at: support@idonate.app
          </ThemedText>
        </View>

        <View style={styles.lastUpdated}>
          <ThemedText style={styles.lastUpdatedText}>Last Updated: June 23, 2026</ThemedText>
        </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 12,
  },
  listItem: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    marginLeft: 4,
  },
  lastUpdated: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  lastUpdatedText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  bottomSpacer: {
    height: 40,
  },
}), [colors, isDark]);
