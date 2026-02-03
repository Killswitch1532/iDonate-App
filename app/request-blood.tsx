import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";

export default function RequestBloodScreen() {
  const [selectedBloodType, setSelectedBloodType] = useState<string>("");
  const [selectedUrgency, setSelectedUrgency] = useState<string>("");
  const [selectedContactMethod, setSelectedContactMethod] =
    useState<string>("In-app chat");
  const [discoveryEnabled, setDiscoveryEnabled] = useState<boolean>(true);
  const [autoShareEnabled, setAutoShareEnabled] = useState<boolean>(true);

  // Form data
  const [unitsNeeded, setUnitsNeeded] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Date and time pickers
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

  // Validation state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const bloodTypes = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
  const urgencyOptions = ["Routine", "Soon", "Urgent"];
  const contactMethods = ["In-app chat", "Phone", "Email"];

  // Validation function
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!selectedBloodType) {
      newErrors.bloodType = "Please select a blood type";
    }

    if (
      !unitsNeeded ||
      isNaN(Number(unitsNeeded)) ||
      Number(unitsNeeded) <= 0
    ) {
      newErrors.unitsNeeded = "Please enter a valid number of units";
    }

    if (!selectedUrgency) {
      newErrors.urgency = "Please select urgency level";
    }

    if (!purpose.trim()) {
      newErrors.purpose = "Please specify the purpose";
    }

    if (!location.trim()) {
      newErrors.location = "Please specify the location";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle continue button
  const handleContinue = () => {
    if (validateForm()) {
      Alert.alert(
        "Request Submitted",
        "Your blood request has been submitted successfully! We will notify you when donors are matched.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
      );
    } else {
      Alert.alert(
        "Validation Error",
        "Please fill in all required fields correctly.",
      );
    }
  };

  // Handle save draft
  const handleSaveDraft = () => {
    Alert.alert("Draft Saved", "Your request has been saved as a draft.");
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Handle date change
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
  };

  // Handle time change
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setSelectedTime(selectedTime);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color="#2C3E50"
              style={styles.backIcon}
            />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <ThemedText type="display" style={styles.appName}>
              iDonate
            </ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Create a blood request
            </ThemedText>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <ThemedText style={styles.title}>Request Blood</ThemedText>
          <ThemedText style={styles.subtitle}>
            Fill in the details below to create your blood request
          </ThemedText>
        </View>

        {/* Blood Type Selection */}
        <View style={styles.card}>
          <ThemedText style={styles.label}>
            Blood type needed <ThemedText style={styles.required}>*</ThemedText>
          </ThemedText>
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
                  if (errors.bloodType) {
                    setErrors((prev) => ({ ...prev, bloodType: "" }));
                  }
                }}
              >
                <MaterialIcons
                  name="water-drop"
                  size={16}
                  color={selectedBloodType === type ? "#FFFFFF" : "#E74C3C"}
                  style={styles.bloodTypeIcon}
                />
                <ThemedText
                  style={[
                    styles.bloodTypeText,
                    selectedBloodType === type && styles.selectedBloodTypeText,
                  ]}
                >
                  {type}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          {errors.bloodType && (
            <ThemedText style={styles.errorText}>{errors.bloodType}</ThemedText>
          )}
          <ThemedText style={styles.helperText}>
            Select one blood type required for this request.
          </ThemedText>
        </View>

        {/* Units Needed */}
        <View style={styles.card}>
          <ThemedText style={styles.label}>
            Units needed <ThemedText style={styles.required}>*</ThemedText>
          </ThemedText>
          <View style={styles.inputContainer}>
            <MaterialIcons
              name="bloodtype"
              size={20}
              color="#7F8C8D"
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, errors.unitsNeeded && styles.errorInput]}
              placeholder="e.g., 2 units"
              placeholderTextColor="#9AA4AB"
              value={unitsNeeded}
              onChangeText={(text) => {
                setUnitsNeeded(text);
                if (errors.unitsNeeded) {
                  setErrors((prev) => ({ ...prev, unitsNeeded: "" }));
                }
              }}
              keyboardType="numeric"
            />
          </View>
          {errors.unitsNeeded && (
            <ThemedText style={styles.errorText}>
              {errors.unitsNeeded}
            </ThemedText>
          )}
        </View>

        {/* Urgency */}
        <View style={styles.card}>
          <ThemedText style={styles.label}>
            Urgency <ThemedText style={styles.required}>*</ThemedText>
          </ThemedText>
          <View style={styles.urgencyButtons}>
            {urgencyOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.urgencyButton,
                  selectedUrgency === option && styles.selectedUrgencyButton,
                  errors.urgency && styles.errorBorder,
                ]}
                onPress={() => {
                  setSelectedUrgency(option);
                  if (errors.urgency) {
                    setErrors((prev) => ({ ...prev, urgency: "" }));
                  }
                }}
              >
                <MaterialIcons
                  name={
                    option === "Urgent"
                      ? "warning"
                      : option === "Soon"
                        ? "schedule"
                        : "event"
                  }
                  size={16}
                  color={
                    selectedUrgency === option
                      ? "#FFFFFF"
                      : option === "Urgent"
                        ? "#E74C3C"
                        : "#4A90E2"
                  }
                  style={styles.urgencyIcon}
                />
                <ThemedText
                  style={[
                    styles.urgencyText,
                    selectedUrgency === option && styles.selectedUrgencyText,
                  ]}
                >
                  {option}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          {errors.urgency && (
            <ThemedText style={styles.errorText}>{errors.urgency}</ThemedText>
          )}
        </View>

        {/* Purpose */}
        <View style={styles.card}>
          <ThemedText style={styles.label}>
            Purpose <ThemedText style={styles.required}>*</ThemedText>
          </ThemedText>
          <View style={styles.inputContainer}>
            <MaterialIcons
              name="assignment"
              size={20}
              color="#7F8C8D"
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, errors.purpose && styles.errorInput]}
              placeholder="Surgery / Accident / Transfusion / Other"
              placeholderTextColor="#9AA4AB"
              value={purpose}
              onChangeText={(text) => {
                setPurpose(text);
                if (errors.purpose) {
                  setErrors((prev) => ({ ...prev, purpose: "" }));
                }
              }}
            />
          </View>
          {errors.purpose && (
            <ThemedText style={styles.errorText}>{errors.purpose}</ThemedText>
          )}
        </View>

        {/* Preferred Date & Time */}
        <View style={styles.card}>
          <ThemedText style={styles.label}>Preferred date & time</ThemedText>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <MaterialIcons
                name="calendar-today"
                size={20}
                color="#4A90E2"
                style={styles.dateTimeIcon}
              />
              <View style={styles.dateTimeContent}>
                <ThemedText style={styles.dateTimeLabel}>Date</ThemedText>
                <ThemedText style={styles.dateTimeValue}>
                  {formatDate(selectedDate)}
                </ThemedText>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#7F8C8D" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <MaterialIcons
                name="access-time"
                size={20}
                color="#4A90E2"
                style={styles.dateTimeIcon}
              />
              <View style={styles.dateTimeContent}>
                <ThemedText style={styles.dateTimeLabel}>Time</ThemedText>
                <ThemedText style={styles.dateTimeValue}>
                  {formatTime(selectedTime)}
                </ThemedText>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#7F8C8D" />
            </TouchableOpacity>
          </View>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {/* Time Picker */}
          {showTimePicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </View>

        {/* Location */}
        <View style={styles.card}>
          <ThemedText style={styles.label}>
            Location <ThemedText style={styles.required}>*</ThemedText>
          </ThemedText>
          <View style={styles.inputContainer}>
            <MaterialIcons
              name="location-on"
              size={20}
              color="#7F8C8D"
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, errors.location && styles.errorInput]}
              placeholder="Add hospital or donation center"
              placeholderTextColor="#9AA4AB"
              value={location}
              onChangeText={(text) => {
                setLocation(text);
                if (errors.location) {
                  setErrors((prev) => ({ ...prev, location: "" }));
                }
              }}
            />
          </View>
          {errors.location && (
            <ThemedText style={styles.errorText}>{errors.location}</ThemedText>
          )}
          <ThemedText style={styles.helperText}>
            Faster matching when a precise center is set.
          </ThemedText>
        </View>

        {/* Discovery Toggle */}
        <View style={styles.card}>
          <ThemedText style={styles.label}>
            Allow nearby donors to see this
          </ThemedText>
          <View style={styles.toggleContainer}>
            <ThemedText style={styles.toggleLabel}>Discovery</ThemedText>
            <Switch
              value={discoveryEnabled}
              onValueChange={setDiscoveryEnabled}
              trackColor={{ false: "#E5E5E5", true: "#E74C3C" }}
              thumbColor={discoveryEnabled ? "#FFFFFF" : "#FFFFFF"}
            />
            <ThemedText
              style={[
                styles.toggleLabel,
                discoveryEnabled && styles.activeToggleLabel,
              ]}
            >
              Enabled
            </ThemedText>
          </View>
        </View>

        {/* Contact Preferences */}
        <View style={styles.card}>
          <ThemedText style={styles.label}>Contact preferences</ThemedText>
          <View style={styles.contactButtons}>
            {contactMethods.map((method) => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.contactButton,
                  selectedContactMethod === method &&
                    styles.selectedContactButton,
                ]}
                onPress={() => setSelectedContactMethod(method)}
              >
                <ThemedText
                  style={[
                    styles.contactText,
                    selectedContactMethod === method &&
                      styles.selectedContactText,
                  ]}
                >
                  {method}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <ThemedText style={styles.label}>Notes for donors</ThemedText>
          <View style={styles.inputContainer}>
            <MaterialIcons
              name="note"
              size={20}
              color="#7F8C8D"
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any special instructions or patient details (kept private)"
              placeholderTextColor="#9AA4AB"
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </View>

        {/* Matching Settings */}
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <ThemedText style={styles.label}>Matching radius</ThemedText>
            <ThemedText style={styles.settingValue}>Up to 10 km</ThemedText>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <ThemedText style={styles.label}>Anonymity</ThemedText>
            <ThemedText style={styles.settingValue}>
              Anonymous to donors
            </ThemedText>
          </View>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.label}>Auto share with centers</ThemedText>
          <View style={styles.toggleContainer}>
            <Switch
              value={autoShareEnabled}
              onValueChange={setAutoShareEnabled}
              trackColor={{ false: "#E5E5E5", true: "#E74C3C" }}
              thumbColor={autoShareEnabled ? "#FFFFFF" : "#FFFFFF"}
            />
            <ThemedText
              style={[
                styles.toggleLabel,
                autoShareEnabled && styles.activeToggleLabel,
              ]}
            >
              Enabled
            </ThemedText>
          </View>
        </View>

        {/* Bottom Buttons */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={styles.saveDraftButton}
            onPress={handleSaveDraft}
          >
            <MaterialIcons
              name="save"
              size={20}
              color="#2C3E50"
              style={styles.buttonIcon}
            />
            <ThemedText style={styles.saveDraftText}>Save Draft</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <MaterialIcons
              name="arrow-forward"
              size={20}
              color="#FFFFFF"
              style={styles.buttonIcon}
            />
            <ThemedText style={styles.continueText}>Submit Request</ThemedText>
          </TouchableOpacity>
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
    backgroundColor: "#F8F4F4",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F4F4",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  backIcon: {
    fontSize: 24,
    color: "#2C3E50",
  },
  headerContent: {
    flex: 1,
  },
  appName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2C3E50",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#7F8C8D",
  },

  // Title
  titleSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#7F8C8D",
    lineHeight: 20,
  },

  // Cards
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Labels and Inputs
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 12,
  },
  required: {
    color: "#E74C3C",
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F4F4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#2C3E50",
  },
  errorInput: {
    borderColor: "#E74C3C",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: 12,
    color: "#7F8C8D",
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#E74C3C",
    marginTop: 4,
  },

  // Blood Type Grid
  bloodTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  bloodTypeButton: {
    backgroundColor: "#F8F4F4",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 60,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    flexDirection: "row",
  },
  selectedBloodTypeButton: {
    backgroundColor: "#E74C3C",
    borderColor: "#E74C3C",
  },
  errorBorder: {
    borderColor: "#E74C3C",
  },
  bloodTypeIcon: {
    marginRight: 4,
  },
  bloodTypeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E50",
  },
  selectedBloodTypeText: {
    color: "#FFFFFF",
  },

  // Urgency Buttons
  urgencyButtons: {
    flexDirection: "row",
    gap: 8,
  },
  urgencyButton: {
    backgroundColor: "#F8F4F4",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    flexDirection: "row",
  },
  selectedUrgencyButton: {
    backgroundColor: "#E74C3C",
    borderColor: "#E74C3C",
  },
  urgencyIcon: {
    marginRight: 4,
  },
  urgencyText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E50",
  },
  selectedUrgencyText: {
    color: "#FFFFFF",
  },

  // Date & Time
  dateTimeRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: "#F8F4F4",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    flexDirection: "row",
    alignItems: "center",
  },
  dateTimeIcon: {
    marginRight: 8,
  },
  dateTimeContent: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 12,
    color: "#7F8C8D",
    marginBottom: 2,
  },
  dateTimeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E50",
  },

  // Toggle Container
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  toggleLabel: {
    fontSize: 14,
    color: "#7F8C8D",
    fontWeight: "500",
  },
  activeToggleLabel: {
    color: "#E74C3C",
    fontWeight: "600",
  },

  // Contact Buttons
  contactButtons: {
    flexDirection: "row",
    gap: 8,
  },
  contactButton: {
    backgroundColor: "#F8F4F4",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  selectedContactButton: {
    backgroundColor: "#E74C3C",
    borderColor: "#E74C3C",
  },
  contactText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E50",
  },
  selectedContactText: {
    color: "#FFFFFF",
  },

  // Setting Rows
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingValue: {
    fontSize: 14,
    color: "#7F8C8D",
  },

  // Bottom Buttons
  bottomButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  saveDraftButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    flexDirection: "row",
    justifyContent: "center",
  },
  saveDraftText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
  },
  continueButton: {
    flex: 1,
    backgroundColor: "#E74C3C",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  continueText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  buttonIcon: {
    marginRight: 8,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 20,
  },
});
