import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function EditProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodType, setBloodType] = useState<string | null>(null);
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
      if (bloodType) donorUpdates.blood_type = bloodType;
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
          <ActivityIndicator size="large" color="#E74C3C" />
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
              <MaterialIcons name="arrow-back" size={24} color="#2C3E50" />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>Edit Profile</ThemedText>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.saveButtonText}>Save</ThemedText>
              )}
            </TouchableOpacity>
          </View>

          {/* Personal Info Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="person" size={20} color="#4A90E2" />
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
                placeholderTextColor="#BDC3C7"
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Phone Number</ThemedText>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                placeholderTextColor="#BDC3C7"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <View style={styles.readOnlyField}>
                <ThemedText style={styles.readOnlyText}>
                  {user?.email || 'Not set'}
                </ThemedText>
                <MaterialIcons name="lock" size={16} color="#BDC3C7" />
              </View>
              <ThemedText style={styles.helperText}>
                Email cannot be changed here
              </ThemedText>
            </View>
          </View>

          {/* Health & Donation Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="favorite" size={20} color="#E74C3C" />
              <ThemedText style={styles.sectionTitle}>
                Health & Donation
              </ThemedText>
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Blood Type</ThemedText>
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
              <ThemedText style={styles.label}>Weight (kg)</ThemedText>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="e.g. 70"
                placeholderTextColor="#BDC3C7"
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
                placeholderTextColor="#BDC3C7"
              />
              <ThemedText style={styles.helperText}>
                Format: YYYY-MM-DD (e.g. 1995-06-15)
              </ThemedText>
            </View>
          </View>

          {/* Address Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="location-on" size={20} color="#27AE60" />
              <ThemedText style={styles.sectionTitle}>Address</ThemedText>
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Address</ThemedText>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter your address"
                placeholderTextColor="#BDC3C7"
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  saveButton: {
    backgroundColor: '#E74C3C',
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
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Sections
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
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
    color: '#2C3E50',
  },

  // Fields
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E8ECEF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2C3E50',
    backgroundColor: '#FAFBFC',
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
    borderColor: '#E8ECEF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F0F2F4',
  },
  readOnlyText: {
    fontSize: 16,
    color: '#95A5A6',
  },
  helperText: {
    fontSize: 12,
    color: '#BDC3C7',
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
    borderColor: '#E8ECEF',
    backgroundColor: '#FAFBFC',
    minWidth: 60,
    alignItems: 'center',
  },
  bloodTypeChipSelected: {
    borderColor: '#E74C3C',
    backgroundColor: '#FEF0F0',
  },
  bloodTypeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  bloodTypeTextSelected: {
    color: '#E74C3C',
  },

  bottomSpacer: {
    height: 40,
  },
});
