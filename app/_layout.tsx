import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/lib/AuthContext';
import { colors } from '../src/lib/theme';
import 'react-native-url-polyfill/auto';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
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
      </QueryClientProvider>
    </AuthProvider>
  );
}
