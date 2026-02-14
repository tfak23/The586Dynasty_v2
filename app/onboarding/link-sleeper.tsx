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
      const leaguesRes = await fetch(
        `${SLEEPER_API_BASE}/user/${sleeperUser.user_id}/leagues/nfl/2025`
      );
      if (!leaguesRes.ok) {
        setError('Could not verify league membership. Try again later.');
        return;
      }
      const leagues = await leaguesRes.json();
      const inLeague = Array.isArray(leagues) &&
        leagues.some((l: any) => l.league_id === SLEEPER_LEAGUE_ID);

      if (!inLeague) {
        setError('Sorry, you are not a member of the 586 Dynasty League.');
        return;
      }

      // 3. Find matching team in our DB
      const { data: team } = await supabase
        .from('teams')
        .select('id, owner_name')
        .eq('owner_name', sleeperUser.display_name || trimmed)
        .single();

      // Try by sleeper_user_id if display_name didn't match
      let teamId = team?.id;
      if (!teamId) {
        const { data: team2 } = await supabase
          .from('teams')
          .select('id, owner_name')
          .eq('sleeper_user_id', sleeperUser.user_id)
          .single();
        teamId = team2?.id;
      }
      // Also try matching owner_name by username
      if (!teamId) {
        const { data: team3 } = await supabase
          .from('teams')
          .select('id, owner_name')
          .eq('owner_name', trimmed)
          .single();
        teamId = team3?.id;
      }

      // 4. Update user profile with Sleeper info
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user!.id,
          sleeper_username: trimmed,
          sleeper_user_id: sleeperUser.user_id,
          display_name: sleeperUser.display_name || trimmed,
          onboarding_completed: true,
        });

      if (profileError) {
        setError('Failed to save profile. Please try again.');
        console.error('Profile upsert error:', profileError);
        return;
      }

      // 5. Link user to team if found
      if (teamId) {
        await supabase
          .from('teams')
          .update({ user_id: user!.id })
          .eq('id', teamId);
      }

      // 6. Check if commissioner
      const isCommish = COMMISSIONER_USERNAMES.includes(trimmed);
      if (isCommish && teamId) {
        // Store commissioner team IDs
        const { data: commTeams } = await supabase
          .from('teams')
          .select('id, owner_name')
          .in('owner_name', COMMISSIONER_USERNAMES);

        if (commTeams) {
          const commIds = commTeams.map((t: any) => t.id);
          // Commissioner IDs will be loaded from DB in the app
        }
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
