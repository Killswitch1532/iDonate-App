import { Tabs, useSegments } from 'expo-router';
import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const isProfile = segments.includes('profile');

  return (
    <>
      <StatusBar 
        barStyle={isProfile ? 'light-content' : 'dark-content'} 
        backgroundColor={isProfile ? '#E74C3C' : 'transparent'} 
        translucent 
      />
      <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#E74C3C',
        tabBarInactiveTintColor: '#9AA4AB',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 80,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowOffset: { width: 0, height: -3 },
          shadowRadius: 12,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name={focused ? "home" : "home"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="bloodtype" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="map" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="donations"
        options={{
          title: 'Donations',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="favorite" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="person" size={26} color={color} />
          ),
        }}
      />
    </Tabs>
    </>
  );
}
