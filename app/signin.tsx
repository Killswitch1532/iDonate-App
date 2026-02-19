import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/contexts/AuthContext";
import { upsertDonorProfile } from "@/services/donorService";

export default function SignInScreen() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const bloodTypes = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password.trim()) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (isSignUp) {
      if (!fullName.trim()) {
        newErrors.fullName = "Full name is required";
      }

      if (!bloodType) {
        newErrors.bloodType = "Blood type is required";
      }

      if (!phoneNumber.trim()) {
        newErrors.phoneNumber = "Phone number is required";
      }

      if (!dateOfBirth.trim()) {
        newErrors.dateOfBirth = "Date of birth is required";
      }

      if (!confirmPassword.trim()) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      if (isSignUp) {
        console.log('[iDonate:SignIn] Starting signup flow', { email, fullName, bloodType, phoneNumber, dateOfBirth });

        const { error } = await signUp(email, password, {
          full_name: fullName,
          user_type: 'donor',
          phone_number: phoneNumber,
        });
        if (error) {
          console.error('[iDonate:SignIn] signUp returned error', {
            code: error.code,
            message: error.message,
            status: error.status,
            name: error.name,
            fullError: JSON.stringify(error),
          });
          Alert.alert(
            'Sign Up Failed',
            `${error.message}${error.code ? `\n\nError code: ${error.code}` : ''}`
          );
          return;
        }

        // Create donor profile row with signup details
        console.log('[iDonate:SignIn] signUp succeeded, fetching user for donor profile...');
        const { supabase } = await import('@/lib/supabase');
        const { data: userData, error: getUserError } = await supabase.auth.getUser();

        if (getUserError) {
          console.error('[iDonate:SignIn] getUser() failed after signUp', {
            code: getUserError.code,
            message: getUserError.message,
            status: getUserError.status,
            fullError: JSON.stringify(getUserError),
          });
        }

        const user = userData?.user;
        if (user) {
          // Update profiles table with phone_number (trigger saves full_name & user_type)
          console.log('[iDonate:SignIn] Updating profile with phone_number', { userId: user.id });
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({ phone_number: phoneNumber || null })
            .eq('id', user.id);

          if (profileUpdateError) {
            console.error('[iDonate:SignIn] profiles update failed', {
              userId: user.id,
              code: profileUpdateError.code,
              message: profileUpdateError.message,
              details: profileUpdateError.details,
              hint: profileUpdateError.hint,
            });
          }

          // Create donor row with blood_type and birth_date
          console.log('[iDonate:SignIn] Creating donor profile for user', { userId: user.id });
          const { error: profileError } = await upsertDonorProfile(user.id, {
            blood_type: bloodType || null,
            birth_date: dateOfBirth ? formatDateForDB(dateOfBirth) : null,
          });
          if (profileError) {
            console.error('[iDonate:SignIn] upsertDonorProfile failed', {
              userId: user.id,
              code: profileError.code,
              message: profileError.message,
              details: profileError.details,
              hint: profileError.hint,
              fullError: JSON.stringify(profileError),
            });
            Alert.alert(
              'Profile Creation Failed',
              `Account created but profile could not be saved.\n\n${profileError.message}${profileError.hint ? `\nHint: ${profileError.hint}` : ''
              }${profileError.code ? `\nCode: ${profileError.code}` : ''}`
            );
            return;
          }
        } else {
          console.warn('[iDonate:SignIn] No user returned after signUp — profile not created');
        }

        // Signup complete — navigate to the app
        router.replace('/(tabs)');
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          console.error('[iDonate:SignIn] signIn returned error', {
            code: error.code,
            message: error.message,
            status: error.status,
            fullError: JSON.stringify(error),
          });
          Alert.alert('Sign In Failed', error.message);
          return;
        }
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      console.error('[iDonate:SignIn] Unexpected exception in handleSubmit', {
        message: e?.message,
        stack: e?.stack,
        name: e?.name,
        fullError: JSON.stringify(e, Object.getOwnPropertyNames(e)),
      });
      Alert.alert('Error', e.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  /** Convert DD/MM/YYYY to YYYY-MM-DD for Postgres */
  const formatDateForDB = (dateStr: string): string => {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setErrors({});
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setBloodType("");
    setPhoneNumber("");
    setDateOfBirth("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <MaterialIcons
              name="favorite"
              size={32}
              color="#E74C3C"
              style={styles.heartIcon}
            />
            <ThemedText type="logo" style={styles.logoText}>
              iDonate
            </ThemedText>
          </View>
          <ThemedText style={styles.headerSubtitle}>
            {isSignUp ? "Create your account" : "Welcome back"}
          </ThemedText>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {isSignUp && (
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>
                Full Name <ThemedText style={styles.required}>*</ThemedText>
              </ThemedText>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="person"
                  size={20}
                  color="#7F8C8D"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, errors.fullName && styles.errorInput]}
                  placeholder="Enter your full name"
                  placeholderTextColor="#9AA4AB"
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    if (errors.fullName) {
                      setErrors((prev) => ({ ...prev, fullName: "" }));
                    }
                  }}
                />
              </View>
              {errors.fullName && (
                <ThemedText style={styles.errorText}>
                  {errors.fullName}
                </ThemedText>
              )}
            </View>
          )}

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>
              Email <ThemedText style={styles.required}>*</ThemedText>
            </ThemedText>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="email"
                size={20}
                color="#7F8C8D"
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, errors.email && styles.errorInput]}
                placeholder="Enter your email"
                placeholderTextColor="#9AA4AB"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) {
                    setErrors((prev) => ({ ...prev, email: "" }));
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email && (
              <ThemedText style={styles.errorText}>{errors.email}</ThemedText>
            )}
          </View>

          {isSignUp && (
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>
                Blood Type <ThemedText style={styles.required}>*</ThemedText>
              </ThemedText>
              <View style={styles.bloodTypeGrid}>
                {bloodTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.bloodTypeButton,
                      bloodType === type && styles.selectedBloodTypeButton,
                      errors.bloodType && styles.errorBorder,
                    ]}
                    onPress={() => {
                      setBloodType(type);
                      if (errors.bloodType) {
                        setErrors((prev) => ({ ...prev, bloodType: "" }));
                      }
                    }}
                  >
                    <MaterialIcons
                      name="water-drop"
                      size={16}
                      color={bloodType === type ? "#FFFFFF" : "#E74C3C"}
                      style={styles.bloodTypeIcon}
                    />
                    <ThemedText
                      style={[
                        styles.bloodTypeText,
                        bloodType === type && styles.selectedBloodTypeText,
                      ]}
                    >
                      {type}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.bloodType && (
                <ThemedText style={styles.errorText}>
                  {errors.bloodType}
                </ThemedText>
              )}
            </View>
          )}

          {isSignUp && (
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>
                Phone Number <ThemedText style={styles.required}>*</ThemedText>
              </ThemedText>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="phone"
                  size={20}
                  color="#7F8C8D"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    errors.phoneNumber && styles.errorInput,
                  ]}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#9AA4AB"
                  value={phoneNumber}
                  onChangeText={(text) => {
                    setPhoneNumber(text);
                    if (errors.phoneNumber) {
                      setErrors((prev) => ({ ...prev, phoneNumber: "" }));
                    }
                  }}
                  keyboardType="phone-pad"
                />
              </View>
              {errors.phoneNumber && (
                <ThemedText style={styles.errorText}>
                  {errors.phoneNumber}
                </ThemedText>
              )}
            </View>
          )}

          {isSignUp && (
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>
                Date of Birth <ThemedText style={styles.required}>*</ThemedText>
              </ThemedText>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="calendar-today"
                  size={20}
                  color="#7F8C8D"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    errors.dateOfBirth && styles.errorInput,
                  ]}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#9AA4AB"
                  value={dateOfBirth}
                  onChangeText={(text) => {
                    // Auto-format: insert slashes at DD/ and DD/MM/ positions
                    const digits = text.replace(/[^0-9]/g, '').slice(0, 8);
                    let formatted = '';
                    for (let i = 0; i < digits.length; i++) {
                      if (i === 2 || i === 4) formatted += '/';
                      formatted += digits[i];
                    }
                    setDateOfBirth(formatted);
                    if (errors.dateOfBirth) {
                      setErrors((prev) => ({ ...prev, dateOfBirth: "" }));
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
              {errors.dateOfBirth && (
                <ThemedText style={styles.errorText}>
                  {errors.dateOfBirth}
                </ThemedText>
              )}
            </View>
          )}

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>
              Password <ThemedText style={styles.required}>*</ThemedText>
            </ThemedText>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="lock"
                size={20}
                color="#7F8C8D"
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, errors.password && styles.errorInput]}
                placeholder="Enter your password"
                placeholderTextColor="#9AA4AB"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: "" }));
                  }
                }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <MaterialIcons
                  name={showPassword ? "visibility-off" : "visibility"}
                  size={20}
                  color="#7F8C8D"
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <ThemedText style={styles.errorText}>
                {errors.password}
              </ThemedText>
            )}
          </View>

          {isSignUp && (
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>
                Confirm Password{" "}
                <ThemedText style={styles.required}>*</ThemedText>
              </ThemedText>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="lock"
                  size={20}
                  color="#7F8C8D"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    errors.confirmPassword && styles.errorInput,
                  ]}
                  placeholder="Confirm your password"
                  placeholderTextColor="#9AA4AB"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword) {
                      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                    }
                  }}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <MaterialIcons
                    name={showConfirmPassword ? "visibility-off" : "visibility"}
                    size={20}
                    color="#7F8C8D"
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <ThemedText style={styles.errorText}>
                  {errors.confirmPassword}
                </ThemedText>
              )}
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons
                  name="arrow-forward"
                  size={20}
                  color="#FFFFFF"
                  style={styles.submitIcon}
                />
                <ThemedText style={styles.submitText}>
                  {isSignUp ? "Create Account" : "Sign In"}
                </ThemedText>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <ThemedText style={styles.dividerText}>or</ThemedText>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In */}
          <TouchableOpacity
            style={[styles.googleButton, isGoogleLoading && { opacity: 0.7 }]}
            disabled={isGoogleLoading || isLoading}
            onPress={async () => {
              setIsGoogleLoading(true);
              try {
                const { error } = await signInWithGoogle();
                if (error) {
                  Alert.alert('Google Sign-In Failed', error.message || 'Something went wrong');
                  return;
                }
                // Auth state listener will pick up the session and navigate
                router.replace('/(tabs)');
              } catch (e: any) {
                Alert.alert('Error', e?.message || 'Google sign-in failed');
              } finally {
                setIsGoogleLoading(false);
              }
            }}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#4285F4" style={{ marginRight: 8 }} />
            ) : (
              <MaterialIcons
                name="login"
                size={20}
                color="#4285F4"
                style={styles.googleIcon}
              />
            )}
            <ThemedText style={styles.googleText}>
              {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
            </ThemedText>
          </TouchableOpacity>

          {/* Toggle Auth Mode */}
          <View style={styles.toggleContainer}>
            <ThemedText style={styles.toggleText}>
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
            </ThemedText>
            <TouchableOpacity onPress={toggleAuthMode}>
              <ThemedText style={styles.toggleLink}>
                {isSignUp ? "Sign In" : "Sign Up"}
              </ThemedText>
            </TouchableOpacity>
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
    backgroundColor: "#F8F4F4",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F4F4",
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 100,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 32,
    paddingTop: 32,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  heartIcon: {
    marginRight: 12,
  },
  logoText: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "bold",
    color: "#2C3E50",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#7F8C8D",
    textAlign: "center",
  },

  // Form
  form: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 8,
  },
  required: {
    color: "#E74C3C",
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#2C3E50",
  },
  errorInput: {
    borderColor: "#E74C3C",
  },
  eyeIcon: {
    padding: 4,
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
  },
  bloodTypeButton: {
    backgroundColor: "#FFFFFF",
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

  // Submit Button
  submitButton: {
    backgroundColor: "#E74C3C",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  submitIcon: {
    // Icon styling handled by MaterialIcons component
  },
  submitText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Divider
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E5E5",
  },
  dividerText: {
    fontSize: 14,
    color: "#7F8C8D",
    marginHorizontal: 16,
  },

  // Google Button
  googleButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleIcon: {
    // Icon styling handled by MaterialIcons component
  },
  googleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
  },

  // Toggle
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    gap: 8,
  },
  toggleText: {
    fontSize: 14,
    color: "#7F8C8D",
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E74C3C",
  },

  // Bottom spacer
  bottomSpacer: {
    height: 20,
  },
});
