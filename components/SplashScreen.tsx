import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';

export default function CustomSplashScreen() {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.icon}>❤️</ThemedText>
      <ThemedText style={styles.title}>iDonate</ThemedText>
      <ThemedText style={styles.subtitle}>Care. Connect. Save lives.</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
  },
});
