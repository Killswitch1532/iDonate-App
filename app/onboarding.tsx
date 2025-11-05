import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
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
      backgroundColor: '#FFF5F5',
    },
    {
      id: 2,
      icon: 'local-hospital',
      iconColor: '#4A90E2',
      title: 'Find Nearby Centers',
      subtitle: 'Locate donation centers easily',
      description: 'Discover hospitals and blood banks near you. Get directions, check availability, and book appointments.',
      tip: '💡 Tip: Regular donors can donate every 56 days. Mark your calendar for your next donation!',
      backgroundColor: '#F0F8FF',
    },
    {
      id: 3,
      icon: 'water-drop',
      iconColor: '#27AE60',
      title: 'Track Your Impact',
      subtitle: 'See the difference you make',
      description: 'Monitor your donation history, track lives saved, and receive notifications for urgent blood requests.',
      tip: '💡 Tip: One pint of blood can help multiple patients when separated into components.',
      backgroundColor: '#F0FFF4',
    },
    {
      id: 4,
      icon: 'security',
      iconColor: '#8E44AD',
      title: 'Safe & Secure',
      subtitle: 'Your privacy matters',
      description: 'All donations are tested for safety. Your personal information is protected, and you can donate anonymously.',
      tip: '💡 Tip: Blood is tested for HIV, hepatitis, and other infectious diseases before use.',
      backgroundColor: '#F8F0FF',
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentData.backgroundColor }]}>
      <View style={styles.container}>
        {/* Header */}
         <View style={styles.header}>
           <TouchableOpacity onPress={skipOnboarding} style={styles.skipButton}>
             <Text style={styles.skipText}>Skip</Text>
           </TouchableOpacity>
         </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <MaterialIcons 
              name={currentData.icon as any} 
              size={120} 
              color={currentData.iconColor} 
              style={styles.icon} 
            />
          </View>

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
                  { backgroundColor: index === currentPage ? currentData.iconColor : '#E5E5E5' }
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
                 <MaterialIcons name="arrow-back" size={20} color="#7F8C8D" />
                 <Text style={styles.backButtonText}>Back</Text>
               </TouchableOpacity>
             )}
             
             <TouchableOpacity
               style={[styles.nextButton, { backgroundColor: currentData.iconColor }]}
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
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
    fontFamily: 'System',
  },

  // Content
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  icon: {
    // Icon styling handled by MaterialIcons component
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 18,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
    fontFamily: 'System',
  },
  description: {
    fontSize: 16,
    color: '#2C3E50',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    fontWeight: '400',
    fontFamily: 'System',
  },
  tipContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F39C12',
  },
  tipText: {
    fontSize: 14,
    color: '#2C3E50',
    fontStyle: 'italic',
    lineHeight: 20,
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
    width: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7F8C8D',
    fontFamily: 'System',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
});
