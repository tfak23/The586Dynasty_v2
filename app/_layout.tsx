import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../src/lib/AuthContext';
import { colors } from '../src/lib/theme';
import 'react-native-url-polyfill/auto';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

function AuthGate() {
  const { session, profile, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!session) {
      // Not logged in -> go to login
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else if (!profile?.onboarding_completed) {
      // Logged in but not onboarded -> go to onboarding
      if (!inOnboarding) {
        router.replace('/onboarding/link-sleeper');
      }
    } else {
      // Logged in and onboarded -> go to tabs
      if (inAuthGroup || inOnboarding) {
        router.replace('/(tabs)');
      }
    }
  }, [session, profile, isLoading, segments, mounted]);

  // Show loading screen during SSR or while checking auth
  if (!mounted || isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="team/[id]"
        options={{ presentation: 'card', headerShown: false }}
      />
      <Stack.Screen
        name="contract/[id]"
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="freeagent/[id]"
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="trade/[id]"
        options={{ presentation: 'card', headerShown: false }}
      />
      <Stack.Screen
        name="trade/new"
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen name="commissioner" options={{ headerShown: false }} />
      <Stack.Screen name="rules" options={{ headerShown: false }} />
      <Stack.Screen name="buy-ins" options={{ headerShown: false }} />
      <Stack.Screen name="league-history" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <AuthGate />
      </QueryClientProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
