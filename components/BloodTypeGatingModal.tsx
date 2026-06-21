import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { useAuth } from '@/contexts/AuthContext';
import { upsertDonorProfile } from '@/services/donorService';
import { useTheme } from '@/hooks/useTheme';

interface BloodTypeGatingModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENOTYPES = ['AA', 'AS', 'SS', 'AC', 'SC'];

export function BloodTypeGatingModal({ isVisible, onClose, onSuccess }: BloodTypeGatingModalProps) {
  const { colors, isDark } = useTheme();
  const styles = useStyles(colors, isDark);
  const { user, profile, refreshProfile } = useAuth();
  
  const [bloodType, setBloodType] = useState<string | null>(null);
  const [genotype, setGenotype] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize from profile if exists
  useEffect(() => {
    if (profile) {
      if (profile.blood_type) setBloodType(profile.blood_type);
      if (profile.genotype) setGenotype(profile.genotype);
    }
  }, [profile, isVisible]);

  const handleSave = async () => {
    if (!bloodType) {
      Alert.alert('Missing Information', 'Please select your blood group to continue.');
      return;
    }

    if (!user?.id) return;

    setIsSaving(true);
    try {
      // Split blood group for the database (optional, but keep it for consistency)
      const rhFactor = bloodType.includes('+') ? '+' : bloodType.includes('-') ? '-' : null;

      const { error } = await upsertDonorProfile(user.id, {
        blood_type: bloodType,
        rh_factor: rhFactor,
        genotype: genotype,
      });

      if (error) throw error;

      if (refreshProfile) await refreshProfile();
      
      onSuccess();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update blood information.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="water-drop" size={24} color={colors.primary} />
            </View>
            <ThemedText style={styles.title}>Complete Your Profile</ThemedText>
            <ThemedText style={styles.subtitle}>
              Select your blood group to proceed with this action.
            </ThemedText>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            {/* Blood Group Selection */}
            <View style={styles.section}>
              <ThemedText style={styles.label}>Blood Group</ThemedText>
              <View style={styles.grid}>
                {BLOOD_GROUPS.map((group) => (
                  <TouchableOpacity
                    key={group}
                    style={[
                      styles.chip,
                      bloodType === group && styles.chipSelected,
                    ]}
                    onPress={() => setBloodType(group)}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        bloodType === group && styles.chipTextSelected,
                      ]}
                    >
                      {group}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Genotype Selection (Optional) */}
            <View style={styles.section}>
              <ThemedText style={styles.label}>Genotype (Optional)</ThemedText>
              <View style={styles.grid}>
                {GENOTYPES.map((gt) => (
                  <TouchableOpacity
                    key={gt}
                    style={[
                      styles.chip,
                      genotype === gt && styles.chipSelected,
                    ]}
                    onPress={() => setGenotype(genotype === gt ? null : gt)}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        genotype === gt && styles.chipTextSelected,
                      ]}
                    >
                      {gt}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, !bloodType && styles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={isSaving || !bloodType}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <ThemedText style={styles.saveButtonText}>Save & Continue</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = (colors: any, isDark: boolean) => useMemo(() => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    padding: 24,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: isDark ? 0.3 : 0.2,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
    minWidth: 70,
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
  },
}), [colors, isDark]);
