import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, getCapStatusColor } from '../../src/lib/theme';
import { useAppStore } from '../../src/lib/store';

export default function LeagueScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const currentLeague = useAppStore((s) => s.currentLeague);
  const teams = useAppStore((s) => s.teams);
  const capSummaries = useAppStore((s) => s.capSummaries);
  const currentTeam = useAppStore((s) => s.currentTeam);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: Refetch league data
    setRefreshing(false);
  }, []);

  if (!currentLeague) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No League Connected</Text>
          <Text style={styles.emptySubtitle}>Connect your Sleeper account to get started</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sortedTeams = [...capSummaries].sort((a, b) => b.cap_room - a.cap_room);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.leagueName}>{currentLeague.name}</Text>
          <Text style={styles.leagueInfo}>
            {currentLeague.current_season} Season • ${currentLeague.salary_cap} Cap
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/rules' as never)}
          >
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            <Text style={styles.quickActionText}>Rules</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/league-history' as never)}
          >
            <Ionicons name="trophy-outline" size={20} color={colors.primary} />
            <Text style={styles.quickActionText}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/buy-ins' as never)}
          >
            <Ionicons name="cash-outline" size={20} color={colors.primary} />
            <Text style={styles.quickActionText}>Buy-Ins</Text>
          </TouchableOpacity>
        </View>

        {/* Team Standings */}
        <Text style={styles.sectionTitle}>Team Standings</Text>
        {sortedTeams.map((cap, index) => {
          const team = teams.find((t) => t.id === cap.team_id);
          const isCurrentTeam = currentTeam?.id === cap.team_id;
          const capColor = getCapStatusColor(cap.cap_room, cap.salary_cap);
          const capPct = cap.total_salary / cap.salary_cap;

          return (
            <TouchableOpacity
              key={cap.team_id}
              style={[
                styles.teamCard,
                isCurrentTeam && styles.teamCardCurrent,
              ]}
              onPress={() => router.push(`/team/${cap.team_id}` as never)}
            >
              <View style={styles.rankCircle}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={styles.teamInfo}>
                <Text style={styles.teamName}>{cap.team_name}</Text>
                <Text style={styles.teamOwner}>{cap.owner_name}</Text>
                <View style={styles.miniProgressOuter}>
                  <View
                    style={[
                      styles.miniProgressInner,
                      { width: `${Math.min(capPct * 100, 100)}%`, backgroundColor: capColor },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.teamCap}>
                <Text style={[styles.capRoom, { color: capColor }]}>${cap.cap_room}</Text>
                <Text style={styles.capUsedSmall}>${cap.total_salary} used</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          );
        })}

        {sortedTeams.length === 0 && (
          <Text style={styles.noTeams}>No teams loaded yet. Pull to refresh.</Text>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1, paddingHorizontal: spacing.md },
  header: { paddingVertical: spacing.lg },
  leagueName: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  leagueInfo: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.xs },
  quickActions: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  quickActionText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  teamCardCurrent: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  rankCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  rankText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '600' },
  teamInfo: { flex: 1, marginRight: spacing.sm },
  teamName: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  teamOwner: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 1 },
  miniProgressOuter: {
    height: 4,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  miniProgressInner: { height: 4, borderRadius: borderRadius.full },
  teamCap: { alignItems: 'flex-end', marginRight: spacing.sm },
  capRoom: { fontSize: fontSize.base, fontWeight: '700' },
  capUsedSmall: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  noTeams: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  emptySubtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
