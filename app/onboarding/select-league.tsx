import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../src/lib/theme';

interface SleeperLeague {
  league_id: string;
  name: string;
  total_rosters: number;
  season: string;
  status: 'convert' | 'join' | 'view';
  registered: boolean;
}

export default function SelectLeagueScreen() {
  const router = useRouter();
  const [leagues, setLeagues] = useState<SleeperLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadLeagues();
  }, []);

  const loadLeagues = async () => {
    try {
      // TODO: Call sleeper-get-leagues edge function
      setLeagues([]);
    } catch (err) {
      console.error('Failed to load leagues:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (league: SleeperLeague) => {
    setProcessing(league.league_id);
    try {
      // TODO: Handle convert/join/view actions
      router.replace('/(tabs)' as never);
    } catch (err) {
      console.error('League action failed:', err);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your leagues...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Select League</Text>
          <Text style={styles.subtitle}>Choose a league to manage</Text>
        </View>

        {leagues.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Leagues Found</Text>
            <Text style={styles.emptySubtitle}>
              No Sleeper leagues found for your account
            </Text>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => router.replace('/(tabs)' as never)}
            >
              <Text style={styles.continueButtonText}>Continue to App</Text>
            </TouchableOpacity>
          </View>
        ) : (
          leagues.map((league) => (
            <View key={league.league_id} style={styles.leagueCard}>
              <View style={styles.leagueInfo}>
                <Text style={styles.leagueName}>{league.name}</Text>
                <Text style={styles.leagueDetail}>
                  {league.total_rosters} teams • {league.season}
                </Text>
                {league.registered && (
                  <View style={styles.registeredBadge}>
                    <Text style={styles.registeredBadgeText}>Registered</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  league.status === 'convert' && { backgroundColor: colors.warning },
                  league.status === 'join' && { backgroundColor: colors.success },
                  league.status === 'view' && { backgroundColor: colors.primary },
                ]}
                onPress={() => handleAction(league)}
                disabled={processing === league.league_id}
              >
                {processing === league.league_id ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.actionButtonText}>
                    {league.status === 'convert' ? 'Convert' : league.status === 'join' ? 'Join' : 'View'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.skipLink}
          onPress={() => router.replace('/(tabs)' as never)}
        >
          <Text style={styles.skipLinkText}>Skip for Now</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1, paddingHorizontal: spacing.md },
  header: { paddingVertical: spacing.lg },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.xs },
  leagueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  leagueInfo: { flex: 1 },
  leagueName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  leagueDetail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  registeredBadge: {
    backgroundColor: colors.success + '30',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  registeredBadgeText: { fontSize: fontSize.xs, color: colors.success, fontWeight: '600' },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  actionButtonText: { color: colors.white, fontWeight: '600', fontSize: fontSize.sm },
  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary, marginTop: spacing.md },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  emptySubtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  continueButtonText: { color: colors.white, fontWeight: '600' },
  skipLink: { alignItems: 'center', paddingVertical: spacing.lg },
  skipLinkText: { color: colors.textMuted, fontSize: fontSize.sm },
});
