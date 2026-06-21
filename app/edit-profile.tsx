import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import {
  getDonorProfile,
  updateProfile,
  upsertDonorProfile,
} from '@/services/donorService';
import { useTheme } from '@/hooks/useTheme';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENOTYPES = ['AA', 'AS', 'SS', 'AC', 'SC'];

export default function EditProfileScreen() {
  const { colors, isDark } = useTheme();
  const styles = useStyles(colors, isDark);
  const { user, profile, refreshProfile } = useAuth();

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodType, setBloodType] = useState<string | null>(null);
  const [genotype, setGenotype] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [weight, setWeight] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing data
  useEffect(() => {
    async function load() {
      setLoading(true);

      // Profile data
      if (profile) {
        setFullName(profile.full_name || '');
        setPhone(profile.phone_number || '');
      }

      // Donor data
      if (user?.id) {
        const { data } = await getDonorProfile(user.id);
        if (data) {
          setBloodType(data.blood_type || null);
          setGenotype(data.genotype || null);
          setAddress(data.address || '');
          setWeight(data.weight_kg ? String(data.weight_kg) : '');
          setBirthDate(data.birth_date || '');
        }
      }

      setLoading(false);
    }
    load();
  }, [user?.id, profile]);

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      // Update profiles table
      const profileUpdates: any = {};
      if (fullName.trim()) profileUpdates.full_name = fullName.trim();
      if (phone.trim()) profileUpdates.phone_number = phone.trim();

      if (Object.keys(profileUpdates).length > 0) {
        const { error } = await updateProfile(user.id, profileUpdates);
        if (error) throw new Error(error.message);
      }

      // Update donors table
      const donorUpdates: any = {};
      const rhFactor = bloodType?.includes('+') ? '+' : bloodType?.includes('-') ? '-' : null;
      
      donorUpdates.blood_type = bloodType;
      donorUpdates.rh_factor = rhFactor;
      donorUpdates.genotype = genotype;
      if (address.trim()) donorUpdates.address = address.trim();
      if (weight.trim()) donorUpdates.weight_kg = parseFloat(weight);
      if (birthDate.trim()) donorUpdates.birth_date = birthDate.trim();

      if (Object.keys(donorUpdates).length > 0) {
        const { error } = await upsertDonorProfile(user.id, donorUpdates);
        if (error) throw new Error(error.message);
      }

      // Refresh profile in AuthContext
      if (refreshProfile) await refreshProfile();

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      console.error('[iDonate:EditProfile] Save failed', e);
      Alert.alert('Error', e.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>Edit Profile</ThemedText>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <ThemedText style={styles.saveButtonText}>Save</ThemedText>
              )}
            </TouchableOpacity>
          </View>

          {/* Personal Info Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="person" size={20} color={colors.accent} />
              <ThemedText style={styles.sectionTitle}>
                Personal Information
              </ThemedText>
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Full Name</ThemedText>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Phone Number</ThemedText>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <View style={styles.readOnlyField}>
                <ThemedText style={styles.readOnlyText}>
                  {user?.email || 'Not set'}
                </ThemedText>
                <MaterialIcons name="lock" size={16} color={colors.textSecondary} />
              </View>
              <ThemedText style={styles.helperText}>
                Email cannot be changed here
              </ThemedText>
            </View>
          </View>

          {/* Health & Donation Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="favorite" size={20} color={colors.primary} />
              <ThemedText style={styles.sectionTitle}>
                Health & Donation
              </ThemedText>
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Blood Group</ThemedText>
              <View style={styles.bloodTypeGrid}>
                {BLOOD_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.bloodTypeChip,
                      bloodType === type && styles.bloodTypeChipSelected,
                    ]}
                    onPress={() => setBloodType(type)}
                  >
                    <ThemedText
                      style={[
                        styles.bloodTypeText,
                        bloodType === type && styles.bloodTypeTextSelected,
                      ]}
                    >
                      {type}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Genotype (Optional)</ThemedText>
              <View style={styles.bloodTypeGrid}>
                {GENOTYPES.map((gt) => (
                  <TouchableOpacity
                    key={gt}
                    style={[
                      styles.bloodTypeChip,
                      genotype === gt && styles.bloodTypeChipSelected,
                    ]}
                    onPress={() => setGenotype(genotype === gt ? null : gt)}
                  >
                    <ThemedText
                      style={[
                        styles.bloodTypeText,
                        genotype === gt && styles.bloodTypeTextSelected,
                      ]}
                    >
                      {gt}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Weight (kg)</ThemedText>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="e.g. 70"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Date of Birth</ThemedText>
              <TextInput
                style={styles.input}
                value={birthDate}
                onChangeText={setBirthDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
              <ThemedText style={styles.helperText}>
                Format: YYYY-MM-DD (e.g. 1995-06-15)
              </ThemedText>
            </View>
          </View>

          {/* Address Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="location-on" size={20} color={colors.success} />
              <ThemedText style={styles.sectionTitle}>Address</ThemedText>
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Address</ThemedText>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter your address"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = (colors: any, isDark: boolean) => useMemo(() => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },

  // Header
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
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '700',
  },

  // Sections
  section: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },

  // Fields
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FAFBFC',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : '#F0F2F4',
  },
  readOnlyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },

  // Blood Type Grid
  bloodTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bloodTypeChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FAFBFC',
    minWidth: 60,
    alignItems: 'center',
  },
  bloodTypeChipSelected: {
    borderColor: colors.primary,
    backgroundColor: isDark ? 'rgba(231, 76, 60, 0.15)' : '#FEF0F0',
  },
  bloodTypeText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  bloodTypeTextSelected: {
    color: colors.primary,
  },

  bottomSpacer: {
    height: 40,
  },
}), [colors, isDark]);
