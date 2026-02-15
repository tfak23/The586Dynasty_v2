import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, getCapStatusColor, getPositionColor } from '../../src/lib/theme';
import { useAppStore, selectCurrentTeamCap } from '../../src/lib/store';
import { useLeagueData } from '../../src/hooks/useLeagueData';
import type { DraftPick } from '../../src/types';

const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE'];

function getPickLabel(pick: DraftPick): string {
  const rd = pick.round;
  const suffix = rd === 1 ? 'st' : rd === 2 ? 'nd' : rd === 3 ? 'rd' : 'th';
  const owner = pick.original_team?.team_name ?? 'Unknown';
  const isOwn = pick.original_team_id === pick.current_team_id;
  return `${pick.season} ${rd}${suffix} Round${isOwn ? '' : ` (${owner})`}`;
}

export default function MyTeamScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showAdjustmentsModal, setShowAdjustmentsModal] = useState(false);
  const { refresh } = useLeagueData();

  const currentTeam = useAppStore((s) => s.currentTeam);
  const currentLeague = useAppStore((s) => s.currentLeague);
  const isLoading = useAppStore((s) => s.isLoading);
  const roster = useAppStore((s) => s.roster);
  const allDraftPicks = useAppStore((s) => s.draftPicks);
  const capAdjustments = useAppStore((s) => s.capAdjustments);
  const capSummary = useAppStore(selectCurrentTeamCap);
  const maxRounds = useAppStore((s) => s.settings.rookieDraftRounds);

  const currentSeason = currentLeague?.current_season ?? 2026;

  // Filter picks to current/past seasons and commissioner round settings
  const draftPicks = allDraftPicks.filter((p) => p.season <= currentSeason && p.round <= maxRounds);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (isLoading && !currentTeam) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptySubtitle, { marginTop: spacing.md }]}>Loading your team...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentTeam) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Team Found</Text>
          <Text style={styles.emptySubtitle}>
            Your Sleeper account couldn't be matched to a team in the database. Contact a commissioner.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const salaryCap = capSummary?.salary_cap ?? 500;
  const baseCapUsed = capSummary?.total_salary ?? 0;
  const deadCap = capSummary?.dead_cap ?? 0;
  const contractCount = capSummary?.contract_count ?? 0;

  // Sum pick salaries for current season picks
  const pickSalaryTotal = draftPicks
    .filter((p) => p.season === currentSeason && p.salary && p.salary > 0)
    .reduce((sum: number, p: DraftPick) => sum + (p.salary ?? 0), 0);
  const pickContractCount = draftPicks.filter((p) => p.season === currentSeason && p.salary && p.salary > 0).length;

  const capUsed = baseCapUsed + pickSalaryTotal;
  const capRoom = salaryCap - capUsed - deadCap;
  const capPct = capUsed / salaryCap;
  const capColor = getCapStatusColor(capRoom, salaryCap);

  // Group roster by position
  const rosterByPosition = POSITION_ORDER.map((pos) => ({
    position: pos,
    players: roster
      .filter((c) => c.player?.position === pos)
      .sort((a, b) => b.salary - a.salary),
  }));

  // Group draft picks by season
  const picksBySeason: Record<number, DraftPick[]> = {};
  draftPicks.forEach((p) => {
    if (!picksBySeason[p.season]) picksBySeason[p.season] = [];
    picksBySeason[p.season].push(p);
  });
  const pickSeasons = Object.keys(picksBySeason).map(Number).sort();

  // Separate dead cap hits vs credits
  const deadCapHits = capAdjustments.filter(
    (a) => a.adjustment_type === 'dead_cap' || a.amount_2026 > 0
  );
  const capCredits = capAdjustments.filter(
    (a) => a.adjustment_type === 'credit' || a.amount_2026 < 0
  );

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
          <Text style={styles.teamName}>{currentTeam.team_name}</Text>
          <Text style={styles.ownerName}>{currentTeam.owner_name}</Text>
        </View>

        {/* Cap Summary Card */}
        <View style={styles.capCard}>
          <View style={styles.capHeader}>
            <Text style={styles.capTitle}>Salary Cap</Text>
            <Text style={[styles.capAvailable, { color: capColor }]}>
              ${capRoom} available
            </Text>
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
              <Text style={styles.capDetailLabel}>Total Cap</Text>
              <Text style={styles.capDetailValue}>${salaryCap}</Text>
            </View>
            <View style={styles.capDetailItem}>
              <Text style={styles.capDetailLabel}>Used</Text>
              <Text style={styles.capDetailValue}>${capUsed}</Text>
            </View>
            <TouchableOpacity
              style={styles.capDetailItem}
              onPress={() => setShowAdjustmentsModal(true)}
            >
              <Text style={styles.capDetailLabel}>Adjustments</Text>
              <Text style={[styles.capDetailValue, { color: deadCap > 0 ? colors.error : colors.primary }]}>
                ${deadCap}
              </Text>
            </TouchableOpacity>
            <View style={styles.capDetailItem}>
              <Text style={styles.capDetailLabel}>Contracts</Text>
              <Text style={styles.capDetailValue}>
                {contractCount}{pickContractCount > 0 ? ` + ${pickContractCount}` : ''}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.projectionsLink}
            onPress={() => router.push('/projections' as never)}
          >
            <Ionicons name="trending-up" size={16} color={colors.primary} />
            <Text style={styles.projectionsLinkText}>View Cap Projections</Text>
          </TouchableOpacity>
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
                    {contract.contract_type === 'tag' ? ' • TAG' : ''}
                  </Text>
                </View>
                <Text style={styles.playerSalary}>${contract.salary}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}

            {players.length === 0 && (
              <Text style={styles.emptyPosition}>No {position}s on roster</Text>
            )}
          </View>
        ))}

        {/* Draft Picks Section */}
        <View style={styles.positionSection}>
          <View style={styles.positionHeader}>
            <View style={[styles.positionBadge, { backgroundColor: colors.gold }]}>
              <Text style={[styles.positionBadgeText, { color: colors.background }]}>PICKS</Text>
            </View>
            <Text style={styles.positionCount}>{draftPicks.length}</Text>
          </View>

          {pickSeasons.map((season) => (
            <View key={season}>
              <Text style={styles.pickSeasonHeader}>{season} Draft</Text>
              {picksBySeason[season].map((pick) => (
                <View key={pick.id} style={styles.playerRow}>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{getPickLabel(pick)}</Text>
                    {pick.salary != null && pick.salary > 0 && (
                      <Text style={styles.playerMeta}>Contract value: ${pick.salary}</Text>
                    )}
                  </View>
                  {pick.pick_number && (
                    <Text style={styles.pickNumber}>#{pick.pick_number}</Text>
                  )}
                </View>
              ))}
            </View>
          ))}

          {draftPicks.length === 0 && (
            <Text style={styles.emptyPosition}>No draft picks</Text>
          )}
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Cap Adjustments Modal */}
      <Modal
        visible={showAdjustmentsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAdjustmentsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cap Adjustments</Text>
              <TouchableOpacity onPress={() => setShowAdjustmentsModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {/* Dead Cap Hits */}
              {deadCapHits.length > 0 && (
                <>
                  <Text style={styles.adjSectionTitle}>Dead Cap Hits</Text>
                  {deadCapHits.map((adj) => (
                    <View key={adj.id} style={styles.adjRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.adjName}>{adj.player_name || adj.description || 'Adjustment'}</Text>
                        {adj.description && adj.player_name && (
                          <Text style={styles.adjDesc}>{adj.description}</Text>
                        )}
                      </View>
                      <View style={styles.adjAmounts}>
                        {adj.amount_2026 !== 0 && <Text style={styles.adjAmount}>'{26}: ${adj.amount_2026}</Text>}
                        {adj.amount_2027 !== 0 && <Text style={styles.adjAmountFuture}>'{27}: ${adj.amount_2027}</Text>}
                        {adj.amount_2028 !== 0 && <Text style={styles.adjAmountFuture}>'{28}: ${adj.amount_2028}</Text>}
                        {adj.amount_2029 !== 0 && <Text style={styles.adjAmountFuture}>'{29}: ${adj.amount_2029}</Text>}
                        {adj.amount_2030 !== 0 && <Text style={styles.adjAmountFuture}>'{30}: ${adj.amount_2030}</Text>}
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* Cap Credits */}
              {capCredits.length > 0 && (
                <>
                  <Text style={[styles.adjSectionTitle, { color: colors.success }]}>Cap Credits</Text>
                  {capCredits.map((adj) => (
                    <View key={adj.id} style={styles.adjRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.adjName}>{adj.player_name || adj.description || 'Credit'}</Text>
                      </View>
                      <Text style={[styles.adjAmount, { color: colors.success }]}>
                        ${Math.abs(adj.amount_2026)}
                      </Text>
                    </View>
                  ))}
                </>
              )}

              {capAdjustments.length === 0 && (
                <Text style={styles.emptyPosition}>No cap adjustments</Text>
              )}

              {/* Summary */}
              {capAdjustments.length > 0 && (
                <View style={[styles.adjRow, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm, paddingTop: spacing.sm }]}>
                  <Text style={[styles.adjName, { fontWeight: '700' }]}>Total {currentSeason} Impact</Text>
                  <Text style={[styles.adjAmount, { fontWeight: '700', color: deadCap > 0 ? colors.error : colors.success }]}>
                    ${deadCap}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1, paddingHorizontal: spacing.md },
  header: { paddingVertical: spacing.lg },
  teamName: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  ownerName: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.xs },
  capCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  capHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
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
  projectionsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  projectionsLinkText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600', marginLeft: spacing.xs },
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
  emptyPosition: { fontSize: fontSize.sm, color: colors.textMuted, fontStyle: 'italic', paddingLeft: spacing.sm },
  pickSeasonHeader: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  pickNumber: { fontSize: fontSize.sm, fontWeight: '600', color: colors.gold, marginRight: spacing.sm },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  emptySubtitle: { fontSize: fontSize.base, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  adjSectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.error,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  adjRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  adjName: { fontSize: fontSize.sm, color: colors.text },
  adjDesc: { fontSize: fontSize.xs, color: colors.textMuted },
  adjAmounts: { alignItems: 'flex-end' },
  adjAmount: { fontSize: fontSize.sm, fontWeight: '600', color: colors.error },
  adjAmountFuture: { fontSize: fontSize.xs, color: colors.textMuted },
});
