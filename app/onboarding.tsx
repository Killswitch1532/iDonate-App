import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useMemo } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';


const { height, width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const { colors, isDark } = useTheme();
  const styles = useStyles(colors, isDark);
  const [currentPage, setCurrentPage] = useState(0);

  const onboardingData = [
    {
      id: 1,
      icon: 'favorite',
      iconColor: '#E74C3C',
      title: 'Save Lives Together',
      subtitle: 'Join our community of heroes',
      description: 'Every donation can save up to 3 lives. Your blood type could be the perfect match for someone in need.',
      tip: '💡 Tip: O- blood is the universal donor type and is always in high demand.',
      gradient: ['#FF5F6D', '#FFC371'],
      bgColor: '#FFF5F5',
      image: require('../assets/images/onboarding/people_holding_hands.jpg'),
    },
    {
      id: 2,
      icon: 'local-hospital',
      iconColor: '#4A90E2',
      title: 'Find Nearby Centers',
      subtitle: 'Locate donation centers easily',
      description: 'Discover hospitals and blood banks near you. Get directions, check availability, and book appointments.',
      tip: '💡 Tip: Regular donors can donate every 90 days. Mark your calendar for your next donation!',
      gradient: ['#667eea', '#764ba2'],
      bgColor: '#F0F8FF',
      image: require('../assets/images/onboarding/ongoing_blood_donation.jpg'),
    },
    {
      id: 3,
      icon: 'water-drop',
      iconColor: '#27AE60',
      title: 'Track Your Impact',
      subtitle: 'See the difference you make',
      description: 'Monitor your donation history, track lives saved, and receive notifications for urgent blood requests.',
      tip: '💡 Tip: One pint of blood can help multiple patients when separated into components.',
      gradient: ['#11998e', '#38ef7d'],
      bgColor: '#F0FFF4',
      image: require('../assets/images/onboarding/blood_bag.jpg'),
    },
    {
      id: 4,
      icon: 'security',
      iconColor: '#8E44AD',
      title: 'Safe & Secure',
      subtitle: 'Your privacy matters',
      description: 'All donations are tested for safety. Your personal information is protected, and you can donate anonymously.',
      tip: '💡 Tip: Blood is tested for HIV, hepatitis, and other infectious diseases before use.',
      gradient: ['#a8edea', '#fed6e3'],
      bgColor: '#F8F0FF',
      image: require('../assets/images/onboarding/secure.jpg'),
    },
  ];

  const nextPage = () => {
    if (currentPage < onboardingData.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      router.push('/signin');
    }
  };

  const skipOnboarding = () => {
    router.push('/signin');
  };

  const currentData = onboardingData[currentPage];

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <Image
        source={currentData.image}
        style={styles.backgroundImage}
        key={currentPage}
        resizeMode="cover"
      />
      
      {/* Gradient Overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
        style={styles.gradientOverlay}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={skipOnboarding} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content} key={currentPage}>
            {/* Text Content */}
            <View style={styles.textContainer}>
              <Text style={styles.title}>{currentData.title}</Text>
              <Text style={styles.subtitle}>{currentData.subtitle}</Text>
              <Text style={styles.description}>{currentData.description}</Text>
              
              {/* Health Tip */}
              <View style={styles.tipContainer}>
                <Text style={styles.tipText}>{currentData.tip}</Text>
              </View>
            </View>
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            {/* Page Indicators */}
            <View style={styles.pageIndicators}>
              {onboardingData.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.pageIndicator,
                    index === currentPage && styles.activePageIndicator,
                    { backgroundColor: index === currentPage ? colors.primary : colors.borderLight }
                  ]}
                />
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {currentPage > 0 && (
                 <TouchableOpacity
                   style={styles.backButton}
                   onPress={() => setCurrentPage(currentPage - 1)}
                 >
                   <MaterialIcons name="arrow-back" size={20} color={colors.icon} />
                   <Text style={styles.backButtonText}>Back</Text>
                 </TouchableOpacity>
               )}
               
               <TouchableOpacity
                 style={[styles.nextButton, { backgroundColor: colors.primary }]}
                 onPress={nextPage}
               >
                 <Text style={styles.nextButtonText}>
                   {currentPage === onboardingData.length - 1 ? 'Get Started' : 'Next'}
                 </Text>
                 <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const useStyles = (colors: any, isDark: boolean) => useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height,
    width: width,
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height,
  },
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 16,
    paddingBottom: 24,
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: 'System',
  },

  // Content
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'System',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
    fontFamily: 'System',
  },
  description: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
    fontWeight: '400',
    fontFamily: 'System',
  },
  tipContainer: {
    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  tipText: {
    fontSize: 15,
    color: colors.textPrimary,
    fontStyle: 'italic',
    lineHeight: 22,
    fontWeight: '500',
    fontFamily: 'System',
  },

  // Bottom Section
  bottomSection: {
    paddingBottom: 40,
  },
  pageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 8,
  },
  pageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activePageIndicator: {
    width: 28,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    gap: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: 'System',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderRadius: 30,
    gap: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.surface,
    fontFamily: 'System',
  },
}), [colors, isDark]);
