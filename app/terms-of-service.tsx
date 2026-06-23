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

export default function TermsOfServiceScreen() {
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
          <ThemedText style={styles.headerTitle}>Terms of Service</ThemedText>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>1. Acceptance of Terms</ThemedText>
          <ThemedText style={styles.paragraph}>
            By creating an account and using iDonate, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our platform.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>2. Eligibility</ThemedText>
          <ThemedText style={styles.listItem}>• You must provide accurate information</ThemedText>
          <ThemedText style={styles.listItem}>• You must meet legal age requirements for blood donation in your region</ThemedText>
          <ThemedText style={styles.listItem}>• You must be medically eligible to donate blood</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>3. Account Responsibilities</ThemedText>
          <ThemedText style={styles.listItem}>• You are responsible for maintaining the security of your account</ThemedText>
          <ThemedText style={styles.listItem}>• You are responsible for all activities under your account</ThemedText>
          <ThemedText style={styles.listItem}>• Keep your login credentials secure</ThemedText>
          <ThemedText style={styles.listItem}>• Notify us immediately of any unauthorized access</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>4. Blood Donation Disclaimer</ThemedText>
          <ThemedText style={styles.paragraph}>
            iDonate is a coordination platform. We do not provide medical advice, diagnosis, or treatment. The platform coordinates blood donation opportunities, but final medical eligibility remains the responsibility of healthcare professionals and institutions.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>5. Institution Responsibilities</ThemedText>
          <ThemedText style={styles.listItem}>• Provide valid licenses and certifications</ThemedText>
          <ThemedText style={styles.listItem}>• Maintain accurate and up-to-date information</ThemedText>
          <ThemedText style={styles.listItem}>• Use the platform responsibly and ethically</ThemedText>
          <ThemedText style={styles.listItem}>• Comply with all applicable laws and regulations</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>6. Prohibited Activities</ThemedText>
          <ThemedText style={styles.listItem}>• Fraud or misrepresentation</ThemedText>
          <ThemedText style={styles.listItem}>• Impersonation of others</ThemedText>
          <ThemedText style={styles.listItem}>• Harassment or abuse of other users</ThemedText>
          <ThemedText style={styles.listItem}>• Creating false blood requests</ThemedText>
          <ThemedText style={styles.listItem}>• Unauthorized access to accounts or data</ThemedText>
          <ThemedText style={styles.listItem}>• Abuse of donor or recipient information</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>7. Suspension & Termination</ThemedText>
          <ThemedText style={styles.paragraph}>
            We reserve the right to:
          </ThemedText>
          <ThemedText style={styles.listItem}>• Suspend or terminate user accounts</ThemedText>
          <ThemedText style={styles.listItem}>• Reject or remove institutions</ThemedText>
          <ThemedText style={styles.listItem}>• Remove harmful or inappropriate content</ThemedText>
          <ThemedText style={styles.paragraph}>
            This may be done at our discretion, with or without notice, for violations of these terms or for the safety and well-being of our community.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>8. Limitation of Liability</ThemedText>
          <ThemedText style={styles.paragraph}>
            iDonate does not guarantee:
          </ThemedText>
          <ThemedText style={styles.listItem}>• The availability of specific blood types</ThemedText>
          <ThemedText style={styles.listItem}>• That all donation requests will be fulfilled</ThemedText>
          <ThemedText style={styles.listItem}>• Emergency response times</ThemedText>
          <ThemedText style={styles.listItem}>• The outcomes of any donations</ThemedText>
          <ThemedText style={styles.paragraph}>
            iDonate is not responsible for medical decisions, outcomes, or any damages arising from the use of the platform.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>9. Updates to Terms</ThemedText>
          <ThemedText style={styles.paragraph}>
            We may update these Terms of Service from time to time. When we do, we will notify users through the platform or by email. Continued use of the platform after changes constitutes acceptance of the new terms.
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
