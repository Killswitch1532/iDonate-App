import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from 'expo-location';
import { router } from "expo-router";
import React, { useState, useMemo } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/contexts/AuthContext";
import { createBloodRequest } from "@/services/requestService";
import { isBloodTypeComplete } from "@/services/donorService";
import { BloodTypeGatingModal } from "@/components/BloodTypeGatingModal";
import { Institution, getInstitutions } from "@/services/institutionService";
import { useTheme } from '@/hooks/useTheme';

export default function RequestBloodScreen() {
  const { colors, isDark } = useTheme();
  const styles = useStyles(colors, isDark);
  const { user, profile } = useAuth();
  
  const [selectedBloodType, setSelectedBloodType] = useState<string>("");
  const [selectedUrgency, setSelectedUrgency] = useState<string>("");
  
  // Form data
  const [purpose, setPurpose] = useState<string>("");
  const [locationText, setLocationText] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [maxDonors, setMaxDonors] = useState<string>("1");
  
  // Center selection
  const [centers, setCenters] = useState<Institution[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);
  const [isOtherSelected, setIsOtherSelected] = useState<boolean>(false);
  const [loadingCenters, setLoadingCenters] = useState<boolean>(false);

  // Date and time pickers
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

  // Validation & Loading state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [showGatingModal, setShowGatingModal] = useState(false);

  const bloodTypes = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
  // Mapped to DB enum ('low', 'moderate', 'high', 'critical')
  const urgencyOptions = [
    { label: "Low", value: "low" },
    { label: "Moderate", value: "moderate" },
    { label: "High", value: "high" },
    { label: "Critical", value: "critical" }
  ];

  // Fetch verified centers
  React.useEffect(() => {
    async function fetchCenters() {
      setLoadingCenters(true);
      try {
        const { data, error } = await getInstitutions();
        if (data) setCenters(data);
      } catch (err) {
        console.error('Failed to fetch centers:', err);
      } finally {
        setLoadingCenters(false);
      }
    }
    fetchCenters();
  }, []);

  // Fetch location automatically
  const handleGetLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to auto-fill your current address.');
        setIsLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });
      
      if (geocode && geocode.length > 0) {
        const g = geocode[0];
        
        // Filter out Google Plus Codes (e.g., JPGG+5JM)
        let locName = g.name || '';
        if (locName.match(/^[A-Z0-9]{2,8}\+[A-Z0-9]{2,8}/)) {
          locName = '';
        }
        
        let street = g.street || '';
        // Prevent duplicate name and street
        if (locName === street) street = '';
        
        // Gather available parts in order of specificity
        const parts = [
          locName,
          g.streetNumber ? `${g.streetNumber} ${street}`.trim() : street,
          g.district,
          g.city,
          g.subregion,
          g.region
        ].filter(Boolean); // Removes empty/null strings
        
        // Remove duplicates adjacently or generally
        const uniqueParts = [...new Set(parts)];
        
        setIsOtherSelected(true);
        setSelectedCenterId(null);
        setLocationText(uniqueParts.join(', '));
      }
    } catch (error) {
      Alert.alert('Location Error', 'Failed to fetch location automatically.');
    } finally {
      setIsLocating(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!selectedBloodType) newErrors.bloodType = "Please select a blood type";
    if (!selectedUrgency) newErrors.urgency = "Please select urgency level";
    if (!purpose.trim()) newErrors.purpose = "Please specify the reason for request";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit button
  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fill in all required fields correctly.");
      return;
    }
    
    if (!user?.id) {
      Alert.alert("Authentication Error", "You must be logged in to create a request.");
      return;
    }

    // --- BLOOD TYPE GATING CHECK ---
    if (!isBloodTypeComplete(profile)) {
      setShowGatingModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      let finalLocation = locationText || 'Not specified';
      if (selectedCenterId && !isOtherSelected) {
        const center = centers.find(c => c.id === selectedCenterId);
        if (center) {
           finalLocation = `${center.institution_name}${center.address ? `, ${center.address}` : ''}`;
        }
      }
      
      const descriptionText = `Reason: ${purpose}\nLocation: ${finalLocation}`;
      
      let finalCenterId = selectedCenterId && !isOtherSelected ? selectedCenterId : undefined;
      
      // Auto-match if they used GPS or typed it manually
      if (isOtherSelected && locationText) {
        const match = centers.find(c => locationText.toLowerCase().includes(c.institution_name.toLowerCase()));
        if (match) {
          finalCenterId = match.id;
        }
      }

      const { error } = await createBloodRequest({
        requester_id: user.id,
        request_type: 'individual',
        institution_id: finalCenterId,
        blood_type_needed: selectedBloodType,
        units_needed: null,
        urgency_level: selectedUrgency as 'low' | 'moderate' | 'high' | 'critical',
        description: descriptionText,
        max_donors: parseInt(maxDonors, 10) || 1,
        date_needed: selectedDate.toISOString(),
        time_needed: selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        contact_phone: contactPhone || undefined,
      });

      if (error) throw error;

      Alert.alert(
        "Request Submitted",
        "Your blood request has been submitted successfully! We will notify donors immediately.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert("Submission Failed", error.message || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  };

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <ThemedText type="display" style={styles.appName}>iDonate</ThemedText>
            <ThemedText style={styles.headerSubtitle}>Create a blood request</ThemedText>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <ThemedText style={styles.title}>Request Blood</ThemedText>
          <ThemedText style={styles.subtitle}>Fill in the details below. This will notify nearby donors immediately.</ThemedText>
        </View>

        {/* Blood Type Selection */}
        <View style={styles.card}>
          <ThemedText style={styles.label}>Blood type needed <ThemedText style={styles.required}>*</ThemedText></ThemedText>
          <View style={styles.bloodTypeGrid}>
            {bloodTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.bloodTypeButton,
                  selectedBloodType === type && styles.selectedBloodTypeButton,
                  errors.bloodType && styles.errorBorder,
                ]}
                onPress={() => {
                  setSelectedBloodType(type);
                  if (errors.bloodType) setErrors((prev) => ({ ...prev, bloodType: "" }));
                }}
              >
                <MaterialIcons name="water-drop" size={16} color={selectedBloodType === type ? colors.surface : colors.primary} style={{ marginRight: 4 }} />
                <ThemedText style={[styles.bloodTypeText, selectedBloodType === type && styles.selectedBloodTypeText]}>{type}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          {errors.bloodType && <ThemedText style={styles.errorText}>{errors.bloodType}</ThemedText>}
        </View>

        {/* Urgency */}
        <View style={styles.card}>
          <ThemedText style={styles.label}>Urgency <ThemedText style={styles.required}>*</ThemedText></ThemedText>
          <View style={styles.urgencyButtons}>
            {urgencyOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.urgencyButton,
                  selectedUrgency === option.value && styles.selectedUrgencyButton,
                  errors.urgency && styles.errorBorder,
                ]}
                onPress={() => {
                  setSelectedUrgency(option.value);
                  if (errors.urgency) setErrors((prev) => ({ ...prev, urgency: "" }));
                }}
              >
                <MaterialIcons
                  name={option.value === "critical" || option.value === "high" ? "warning" : option.value === "moderate" ? "schedule" : "event"}
                  size={14}
                  color={selectedUrgency === option.value ? colors.surface : option.value === "critical" ? colors.primary : colors.accent}
                  style={{ marginRight: 4 }}
                />
                <ThemedText style={[styles.urgencyText, selectedUrgency === option.value && styles.selectedUrgencyText]}>
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          {errors.urgency && <ThemedText style={styles.errorText}>{errors.urgency}</ThemedText>}
        </View>

        {/* Number of Donors Needed */}
        <View style={styles.card}>
          <ThemedText style={styles.label}>Number of donors needed</ThemedText>
          <ThemedText style={styles.subtitle}>How many people do you need to donate? (Default is 1)</ThemedText>
          <View style={[styles.inputContainer, { marginTop: 12 }]}>
            <MaterialIcons name="people" size={20} color={colors.icon} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. 1"
              placeholderTextColor={colors.textSecondary}
              value={maxDonors}
              onChangeText={(text) => setMaxDonors(text.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Preferred Date & Time */}
        <View style={styles.card}>
          <ThemedText style={styles.label}>Date & time needed</ThemedText>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity style={styles.dateTimeButton} onPress={() => setShowDatePicker(true)}>
              <MaterialIcons name="calendar-today" size={20} color={colors.accent} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.dateTimeLabel}>Date</ThemedText>
                <ThemedText style={styles.dateTimeValue}>{formatDate(selectedDate)}</ThemedText>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.icon} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateTimeButton} onPress={() => setShowTimePicker(true)}>
              <MaterialIcons name="access-time" size={20} color={colors.accent} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.dateTimeLabel}>Time</ThemedText>
                <ThemedText style={styles.dateTimeValue}>{formatTime(selectedTime)}</ThemedText>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.icon} />
            </TouchableOpacity>
          </View>
          {showDatePicker && <DateTimePicker value={selectedDate} mode="date" display="default" onChange={(e, d) => { setShowDatePicker(false); if(d) setSelectedDate(d); }} minimumDate={new Date()} />}
          {showTimePicker && <DateTimePicker value={selectedTime} mode="time" display="default" onChange={(e, t) => { setShowTimePicker(false); if(t) setSelectedTime(t); }} />}
        </View>

        {/* Alternative Contact */}
        <View style={styles.card}>
          <ThemedText style={styles.label}>Alternative contact (phone)</ThemedText>
          <View style={styles.inputContainer}>
            <MaterialIcons name="phone" size={20} color={colors.icon} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. +1 234 567 8900 (Optional)"
              placeholderTextColor={colors.textSecondary}
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Location Section */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <ThemedText style={styles.label}>Location <ThemedText style={styles.required}>*</ThemedText></ThemedText>
            <TouchableOpacity onPress={handleGetLocation} disabled={isLocating} style={{ flexDirection: 'row', alignItems: 'center' }}>
              {isLocating ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialIcons name="my-location" size={16} color={colors.primary} />}
              <ThemedText style={{ color: colors.primary, fontSize: 12, fontWeight: '600', marginLeft: 4 }}>{isLocating ? 'Locating...' : 'Get current'}</ThemedText>
            </TouchableOpacity>
          </View>

          <ThemedText style={styles.subtitle}>Select a donation center or specify another location</ThemedText>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.centersScroll}>
            {loadingCenters ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                {centers.map((center) => (
                  <TouchableOpacity
                    key={center.id}
                    style={[
                      styles.centerOption,
                      selectedCenterId === center.id && !isOtherSelected && styles.selectedCenterOption
                    ]}
                    onPress={() => {
                      setSelectedCenterId(center.id);
                      setIsOtherSelected(false);
                    }}
                  >
                    <ThemedText style={[
                      styles.centerOptionText,
                      selectedCenterId === center.id && !isOtherSelected && styles.selectedCenterOptionText
                    ]}>
                      {center.institution_name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.centerOption,
                    isOtherSelected && styles.selectedCenterOption
                  ]}
                  onPress={() => {
                    setIsOtherSelected(true);
                    setSelectedCenterId(null);
                  }}
                >
                  <ThemedText style={[
                    styles.centerOptionText,
                    isOtherSelected && styles.selectedCenterOptionText
                  ]}>
                    Other / Custom
                  </ThemedText>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>

          {isOtherSelected && (
            <View style={[styles.inputContainer, { marginTop: 12 }]}>
              <MaterialIcons name="location-city" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter center or address"
                placeholderTextColor={colors.textSecondary}
                value={locationText}
                onChangeText={setLocationText}
                autoFocus
              />
            </View>
          )}
        </View>

        {/* Reason for Request */}
        <View style={styles.card}>
          <ThemedText style={styles.label}>Reason for Request <ThemedText style={styles.required}>*</ThemedText></ThemedText>
          <View style={[styles.inputContainer, { alignItems: 'flex-start', paddingTop: 10 }]}>
            <MaterialIcons name="assignment" size={20} color={colors.icon} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.textArea, errors.purpose && styles.errorInput]}
              placeholder="Surgery, accident victim, thalassemia patient..."
              placeholderTextColor={colors.textSecondary}
              value={purpose}
              onChangeText={(text) => {
                setPurpose(text);
                if (errors.purpose) setErrors((prev) => ({ ...prev, purpose: "" }));
              }}
              multiline
              numberOfLines={3}
            />
          </View>
          {errors.purpose && <ThemedText style={styles.errorText}>{errors.purpose}</ThemedText>}
        </View>

        {/* Bottom Buttons */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.continueButton} onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color={colors.surface} size="small" />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={20} color={colors.surface} style={{ marginRight: 8 }} />
                <ThemedText style={styles.continueText}>Submit Request</ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <BloodTypeGatingModal 
        isVisible={showGatingModal}
        onClose={() => setShowGatingModal(false)}
        onSuccess={() => {
          setShowGatingModal(false);
          handleSubmit(); // Retry the original action
        }}
      />
    </SafeAreaView>
  );
}

const useStyles = (colors: any, isDark: boolean) => useMemo(() => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { padding: 16, paddingBottom: 60 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  backButton: { marginRight: 16 },
  headerContent: { flex: 1 },
  appName: { fontSize: 20, fontWeight: "bold", color: colors.textPrimary },
  headerSubtitle: { fontSize: 14, color: colors.textSecondary },
  titleSection: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: "bold", color: colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0.3 : 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: colors.borderLight },
  label: { fontSize: 16, fontWeight: "600", color: colors.textPrimary, marginBottom: 12 },
  required: { color: colors.primary, fontSize: 16 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 12 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: colors.textPrimary },
  errorInput: { borderColor: colors.primary },
  textArea: { height: 70, textAlignVertical: "top" },
  errorText: { fontSize: 12, color: colors.primary, marginTop: 4 },
  bloodTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bloodTypeButton: { backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, minWidth: 60, alignItems: "center", borderWidth: 1, borderColor: colors.borderLight, flexDirection: "row" },
  selectedBloodTypeButton: { backgroundColor: colors.primary, borderColor: colors.primary },
  errorBorder: { borderColor: colors.primary },
  bloodTypeText: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  selectedBloodTypeText: { color: colors.surface },
  urgencyButtons: { flexDirection: "row", gap: 8 },
  urgencyButton: { backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 4, paddingVertical: 12, flex: 1, alignItems: "center", borderWidth: 1, borderColor: colors.borderLight, flexDirection: "row", justifyContent: "center" },
  selectedUrgencyButton: { backgroundColor: colors.primary, borderColor: colors.primary },
  urgencyText: { fontSize: 12, fontWeight: "600", color: colors.textPrimary },
  selectedUrgencyText: { color: colors.surface },
  dateTimeRow: { flexDirection: "row", gap: 12 },
  dateTimeButton: { flex: 1, backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: colors.borderLight, flexDirection: "row", alignItems: "center" },
  dateTimeLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  dateTimeValue: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  centersScroll: { marginTop: 12, marginBottom: 4 },
  centerOption: { backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, marginRight: 8, borderWidth: 1, borderColor: colors.borderLight, marginBottom: 8 },
  selectedCenterOption: { backgroundColor: colors.primary, borderColor: colors.primary },
  centerOptionText: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  selectedCenterOptionText: { color: colors.surface },
  bottomButtons: { flexDirection: "row", gap: 12, marginTop: 16 },
  continueButton: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  continueText: { fontSize: 16, fontWeight: "600", color: colors.surface }
}), [colors, isDark]);
