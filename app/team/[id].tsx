import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, getCapStatusColor, getPositionColor } from '../../src/lib/theme';
import { useAppStore } from '../../src/lib/store';
import { useLeagueData } from '../../src/hooks/useLeagueData';

const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE'];

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { refresh } = useLeagueData();
  const [refreshing, setRefreshing] = useState(false);

  const teams = useAppStore((s) => s.teams);
  const capSummaries = useAppStore((s) => s.capSummaries);
  const allContracts = useAppStore((s) => s.allContracts);

  const team = teams.find((t) => t.id === id);
  const capSummary = capSummaries.find((s) => s.team_id === id);

  // Filter contracts for this team
  const teamContracts = useMemo(
    () => allContracts.filter((c) => c.team_id === id),
    [allContracts, id]
  );

  const rosterByPosition = useMemo(
    () =>
      POSITION_ORDER.map((pos) => ({
        position: pos,
        players: teamContracts
          .filter((c) => c.player?.position === pos)
          .sort((a, b) => b.salary - a.salary),
      })),
    [teamContracts]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (!team) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Team Not Found</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  const salaryCap = capSummary?.salary_cap ?? 500;
  const capUsed = capSummary?.total_salary ?? 0;
  const capRoom = capSummary?.cap_room ?? salaryCap;
  const capPct = capUsed / salaryCap;
  const capColor = getCapStatusColor(capRoom, salaryCap);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{team.team_name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={styles.ownerName}>{team.owner_name}</Text>

        {/* Cap Summary */}
        <View style={styles.capCard}>
          <View style={styles.capHeader}>
            <Text style={styles.capTitle}>Salary Cap</Text>
            <Text style={[styles.capAvailable, { color: capColor }]}>${capRoom} available</Text>
          </View>
          <View style={styles.progressBarOuter}>
            <View
              style={[
                styles.progressBarInner,
                { width: `${Math.min(capPct * 100, 100)}%`, backgroundColor: capColor },
              ]}
            />
          </View>
          <View style={styles.capDetails}>
            <View style={styles.capDetailItem}>
              <Text style={styles.capDetailLabel}>Total</Text>
              <Text style={styles.capDetailValue}>${salaryCap}</Text>
            </View>
            <View style={styles.capDetailItem}>
              <Text style={styles.capDetailLabel}>Used</Text>
              <Text style={styles.capDetailValue}>${capUsed}</Text>
            </View>
            <View style={styles.capDetailItem}>
              <Text style={styles.capDetailLabel}>Dead Cap</Text>
              <Text style={[styles.capDetailValue, { color: colors.error }]}>
                ${capSummary?.dead_cap ?? 0}
              </Text>
            </View>
            <View style={styles.capDetailItem}>
              <Text style={styles.capDetailLabel}>Contracts</Text>
              <Text style={styles.capDetailValue}>{capSummary?.contract_count ?? 0}</Text>
            </View>
          </View>
        </View>

        {/* Roster by Position */}
        {rosterByPosition.map(({ position, players }) => (
          <View key={position} style={styles.positionSection}>
            <View style={styles.positionHeader}>
              <View style={[styles.positionBadge, { backgroundColor: getPositionColor(position) }]}>
                <Text style={styles.positionBadgeText}>{position}</Text>
              </View>
              <Text style={styles.positionCount}>{players.length}</Text>
            </View>

            {players.map((contract) => (
              <TouchableOpacity
                key={contract.id}
                style={styles.playerRow}
                onPress={() => router.push(`/contract/${contract.id}` as never)}
              >
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>
                    {contract.player?.full_name ?? 'Unknown'}
                  </Text>
                  <Text style={styles.playerMeta}>
                    {contract.player?.team ?? 'FA'} • ${contract.salary}/yr • {contract.years_remaining}yr{contract.years_remaining !== 1 ? 's' : ''} left
                  </Text>
                </View>
                <Text style={styles.playerSalary}>${contract.salary}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}

            {players.length === 0 && (
              <Text style={styles.emptyText}>No {position}s on roster</Text>
            )}
          </View>
        ))}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  scrollView: { flex: 1, paddingHorizontal: spacing.md },
  ownerName: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.md },
  capCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  capHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  capTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  capAvailable: { fontSize: fontSize.md, fontWeight: '700' },
  progressBarOuter: {
    height: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  progressBarInner: { height: 8, borderRadius: borderRadius.full },
  capDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  capDetailItem: { alignItems: 'center' },
  capDetailLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 2 },
  capDetailValue: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  positionSection: { marginBottom: spacing.lg },
  positionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  positionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  positionBadgeText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '700' },
  positionCount: { fontSize: fontSize.sm, color: colors.textSecondary },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  playerInfo: { flex: 1 },
  playerName: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  playerMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  playerSalary: { fontSize: fontSize.base, fontWeight: '700', color: colors.primary, marginRight: spacing.sm },
  emptyText: { color: colors.textMuted, fontSize: fontSize.sm, fontStyle: 'italic', paddingLeft: spacing.sm },
});
