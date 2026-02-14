import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../src/lib/theme';
import { useAuth } from '../../src/lib/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { SLEEPER_API_BASE, SLEEPER_LEAGUE_ID, COMMISSIONER_USERNAMES } from '../../src/lib/constants';

export default function LinkSleeperScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLink = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Please enter your Sleeper username');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // 1. Verify the Sleeper user exists
      const userRes = await fetch(`${SLEEPER_API_BASE}/user/${trimmed}`);
      if (!userRes.ok || userRes.status === 404) {
        setError('Sleeper username not found. Please check and try again.');
        return;
      }
      const sleeperUser = await userRes.json();
      if (!sleeperUser || !sleeperUser.user_id) {
        setError('Sleeper username not found. Please check and try again.');
        return;
      }

      // 2. Check if this user is in league 1315789488873553920
      // Check current and previous season (league may have rolled over)
      const currentYear = new Date().getFullYear();
      let inLeague = false;
      for (const year of [currentYear, currentYear - 1]) {
        const leaguesRes = await fetch(
          `${SLEEPER_API_BASE}/user/${sleeperUser.user_id}/leagues/nfl/${year}`
        );
        if (!leaguesRes.ok) continue;
        const leagues = await leaguesRes.json();
        if (Array.isArray(leagues) &&
            leagues.some((l: any) => l.league_id === SLEEPER_LEAGUE_ID)) {
          inLeague = true;
          break;
        }
      }

      if (!inLeague) {
        setError('Sorry, you are not a member of the 586 Dynasty League.');
        return;
      }

      // 3. Find matching team in our DB via edge function
      // (Teams table RLS requires league membership, which we don't have yet)
      const fnUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/sleeper-link-account`;
      const linkRes = await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'find-team',
          sleeper_username: trimmed,
          sleeper_user_id: sleeperUser.user_id,
          display_name: sleeperUser.display_name || trimmed,
        }),
      });
      const linkData = linkRes.ok ? await linkRes.json() : null;
      const teamId = linkData?.team_id ?? null;

      // 4. Complete onboarding via edge function (bypasses RLS)
      const completeRes = await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete-onboarding',
          user_id: user!.id,
          sleeper_username: trimmed,
          sleeper_user_id: sleeperUser.user_id,
          display_name: sleeperUser.display_name || trimmed,
          team_id: teamId,
        }),
      });

      if (!completeRes.ok) {
        const errData = await completeRes.json().catch(() => ({}));
        setError(errData.error || 'Failed to save profile. Please try again.');
        return;
      }

      // Refresh profile so AuthGate picks up onboarding_completed
      await refreshProfile();

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../../assets/images/logo.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Link Your Sleeper Account</Text>
        <Text style={styles.subtitle}>
          Enter your Sleeper username to connect to the 586 Dynasty League
        </Text>

        {error ? (
          <View style={[
            styles.errorBox,
            error.includes('not a member') && styles.warningBox,
          ]}>
            <Ionicons
              name={error.includes('not a member') ? 'close-circle' : 'alert-circle'}
              size={20}
              color={error.includes('not a member') ? colors.warning : colors.error}
            />
            <Text style={[
              styles.errorText,
              error.includes('not a member') && { color: colors.warning },
            ]}>
              {error}
            </Text>
          </View>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Sleeper Username"
          placeholderTextColor={colors.textMuted}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleLink}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Connect Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.helpBox}>
          <Text style={styles.helpTitle}>How to find your username:</Text>
          <Text style={styles.helpText}>1. Open the Sleeper app</Text>
          <Text style={styles.helpText}>2. Tap your profile picture</Text>
          <Text style={styles.helpText}>3. Your username is shown under your display name</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    width: '100%',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  warningBox: {
    backgroundColor: colors.warning + '20',
  },
  errorText: {
    flex: 1,
    color: colors.error,
    fontSize: fontSize.sm,
  },
  input: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSize.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: { color: '#ffffff', fontSize: fontSize.md, fontWeight: '600' },
  helpBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    width: '100%',
    marginTop: spacing.xl,
  },
  helpTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.xs },
  helpText: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 },
});
