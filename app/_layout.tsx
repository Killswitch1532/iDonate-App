import { MaterialIcons } from "@expo/vector-icons";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { setupNotificationListeners } from "@/services/notificationService";
import { ThemeProvider as AppThemeProvider } from "@/contexts/ThemeContext";
import { useTheme } from "@/hooks/useTheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <RootLayoutNav />
        </NotificationProvider>
      </AuthProvider>
    </AppThemeProvider>
  );
}

function RootLayoutNav() {
  const { isDark, colors } = useTheme();
  const colorScheme = isDark ? "dark" : "light";
  const { user, loading } = useAuth();
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn("Error during app preparation:", e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (!appIsReady || loading) return;

    if (user) {
      router.replace('/(tabs)');
    } else {
      router.replace('/onboarding');
    }
  }, [appIsReady, loading, user]);

  // Handle notification taps → navigate to appropriate screen
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    setupNotificationListeners((data) => {
      if (data?.notificationId) {
        // Navigate to notification detail screen if we have notification ID
        router.push({
          pathname: '/notification-detail',
          params: { id: data.notificationId }
        } as any);
      } else if (data?.requestId) {
        // Fall back to blood request detail if no notification ID
        router.push({
          pathname: '/blood-request/[id]',
          params: { id: data.requestId }
        } as any);
      }
    }).then(fn => { cleanup = fn; });
    return () => cleanup?.();
  }, []);

  if (!appIsReady || loading) {
    return (
      <View style={styles.splashContainer}>
        <MaterialIcons
          name="favorite"
          size={80}
          color="#FFFFFF"
          style={styles.splashIcon}
        />
        <Text style={styles.splashTitle}>iDonate</Text>
        <Text style={styles.splashSubtitle}>Care. Connect. Save lives.</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="signin" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
        <Stack.Screen name="request-blood" options={{ headerShown: false }} />
        <Stack.Screen name="donate-blood" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="compatibility" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="notification-detail" options={{ headerShown: false }} />
        <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
        <Stack.Screen name="terms-of-service" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: "#E74C3C",
    justifyContent: "center",
    alignItems: "center",
  },
  splashIcon: {
    marginBottom: 30,
  },
  splashTitle: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },
  splashSubtitle: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "500",
    textAlign: "center",
    opacity: 0.9,
  },
});
