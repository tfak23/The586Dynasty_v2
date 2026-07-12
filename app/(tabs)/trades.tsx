import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../../src/lib/theme';
import { TRADE_HISTORY, type HistoricalTrade } from '../../src/lib/tradeHistory';
import { fetchTradeHistory } from '../../src/lib/tradeSync';
import { useAppStore } from '../../src/lib/store';
import { fetchTrades, TRADE_STATUS_COLORS, type TradeDetail } from '../../src/lib/trades';

type SeasonFilter = 'all' | string;
type TeamFilter = 'all' | string;

export default function TradesScreen() {
  const router = useRouter();
  const [seasonFilter, setSeasonFilter] = useState<SeasonFilter>('all');
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTrades, setActiveTrades] = useState<TradeDetail[]>([]);
  const [history, setHistory] = useState<HistoricalTrade[]>(TRADE_HISTORY);

  const currentLeague = useAppStore((s) => s.currentLeague);
  const currentTeam = useAppStore((s) => s.currentTeam);

  const loadActiveTrades = useCallback(async () => {
    if (!currentLeague) return;
    try {
      const trades = await fetchTrades(currentLeague.id);
      // Show pending offers plus recently resolved ones (last 14 days)
      const cutoff = Date.now() - 14 * 24 * 3600 * 1000;
      setActiveTrades(
        trades.filter(
          (t) =>
            t.status === 'pending' ||
            new Date(t.created_at).getTime() > cutoff
        )
      );
    } catch {
      // trades RPC/tables may not be migrated yet — fail quietly
    }
  }, [currentLeague?.id]);

  useEffect(() => {
    loadActiveTrades();
  }, [loadActiveTrades]);

  // Live trade history from the sheet (Sleeper-checked), fallback bundled.
  useEffect(() => {
    fetchTradeHistory().then((r) => setHistory(r.trades)).catch(() => {});
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadActiveTrades();
    setRefreshing(false);
  }, [loadActiveTrades]);

  const seasons = useMemo(
    () => [...new Set(history.map((t) => t.season))].sort((a, b) => b - a),
    [history]
  );
  const teams = useMemo(
    () => [...new Set(history.flatMap((t) => [t.team1, t.team2]))].sort(),
    [history]
  );

  const filteredTrades = useMemo(() => {
    let result = history;

    if (seasonFilter !== 'all') {
      result = result.filter((t) => t.season === Number(seasonFilter));
    }

    if (teamFilter !== 'all') {
      result = result.filter((t) => t.team1 === teamFilter || t.team2 === teamFilter);
    }

    return result;
  }, [seasonFilter, teamFilter, history]);

  // Group by season for display
  const tradesBySeason: Record<number, HistoricalTrade[]> = {};
  filteredTrades.forEach((t) => {
    if (!tradesBySeason[t.season]) tradesBySeason[t.season] = [];
    tradesBySeason[t.season].push(t);
  });
  const displaySeasons = Object.keys(tradesBySeason).map(Number).sort((a, b) => b - a);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Trades</Text>
          <TouchableOpacity
            style={styles.proposeButton}
            onPress={() => router.push('/trade/new' as never)}
          >
            <Ionicons name="add" size={16} color={colors.white} />
            <Text style={styles.proposeButtonText}>Propose Trade</Text>
          </TouchableOpacity>
        </View>

        {/* Active offers */}
        {activeTrades.length > 0 && (
          <View style={styles.activeSection}>
            <Text style={styles.activeSectionTitle}>Trade Offers</Text>
            {activeTrades.map((t) => {
              const statusColor = TRADE_STATUS_COLORS[t.status] ?? colors.textMuted;
              const names = t.trade_teams
                .map((tt) => tt.team?.team_name ?? '?')
                .join(' ↔ ');
              const needsMe =
                t.status === 'pending' &&
                t.trade_teams.some(
                  (tt) => tt.team_id === currentTeam?.id && tt.status === 'pending'
                );
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.activeTradeCard, needsMe && styles.activeTradeCardHighlight]}
                  onPress={() => router.push(`/trade/${t.id}` as never)}
                >
                  <View style={styles.activeTradeInfo}>
                    <Text style={styles.activeTradeTeams}>{names}</Text>
                    <Text style={styles.activeTradeMeta}>
                      {t.trade_assets.length} asset{t.trade_assets.length !== 1 ? 's' : ''} •{' '}
                      {new Date(t.created_at).toLocaleDateString()}
                      {needsMe ? ' • awaiting your response' : ''}
                    </Text>
                  </View>
                  <View style={[styles.activeStatusBadge, { backgroundColor: statusColor + '22' }]}>
                    <Text style={[styles.activeStatusText, { color: statusColor }]}>
                      {t.status.toUpperCase()}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.historyTitle}>Trade History ({filteredTrades.length})</Text>

        {/* Season Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, seasonFilter === 'all' && styles.filterChipActive]}
            onPress={() => setSeasonFilter('all')}
          >
            <Text style={[styles.filterChipText, seasonFilter === 'all' && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {seasons.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, seasonFilter === String(s) && styles.filterChipActive]}
              onPress={() => setSeasonFilter(String(s))}
            >
              <Text style={[styles.filterChipText, seasonFilter === String(s) && styles.filterChipTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Team Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.teamChip, teamFilter === 'all' && styles.teamChipActive]}
            onPress={() => setTeamFilter('all')}
          >
            <Text style={[styles.teamChipText, teamFilter === 'all' && styles.teamChipTextActive]}>All Teams</Text>
          </TouchableOpacity>
          {teams.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.teamChip, teamFilter === t && styles.teamChipActive]}
              onPress={() => setTeamFilter(t)}
            >
              <Text style={[styles.teamChipText, teamFilter === t && styles.teamChipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {displaySeasons.map((season) => (
          <View key={season}>
            <View style={styles.seasonHeader}>
              <Text style={styles.seasonTitle}>{season} Season</Text>
              <Text style={styles.seasonCount}>{tradesBySeason[season].length} trades</Text>
            </View>

            {tradesBySeason[season].map((trade) => (
              <View key={trade.id} style={styles.tradeCard}>
                <View style={styles.tradeId}>
                  <Text style={styles.tradeIdText}>#{trade.id}</Text>
                </View>

                <View style={styles.tradeBody}>
                  {/* Team 1 side */}
                  <View style={styles.tradeSide}>
                    <Text style={[
                      styles.teamName,
                      teamFilter !== 'all' && trade.team1 === teamFilter && styles.teamNameHighlight,
                    ]}>{trade.team1}</Text>
                    <Text style={styles.receivesLabel}>receives</Text>
                    {trade.team1Receives.length > 0 ? (
                      trade.team1Receives.map((item, i) => (
                        <Text key={i} style={styles.tradeItem}>{item}</Text>
                      ))
                    ) : (
                      <Text style={styles.tradeItemEmpty}>Nothing</Text>
                    )}
                  </View>

                  <View style={styles.swapIcon}>
                    <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
                  </View>

                  {/* Team 2 side */}
                  <View style={styles.tradeSide}>
                    <Text style={[
                      styles.teamName,
                      teamFilter !== 'all' && trade.team2 === teamFilter && styles.teamNameHighlight,
                    ]}>{trade.team2}</Text>
                    <Text style={styles.receivesLabel}>receives</Text>
                    {trade.team2Receives.length > 0 ? (
                      trade.team2Receives.map((item, i) => (
                        <Text key={i} style={styles.tradeItem}>{item}</Text>
                      ))
                    ) : (
                      <Text style={styles.tradeItemEmpty}>Nothing</Text>
                    )}
                  </View>
                </View>

                {trade.notes && (
                  <Text style={styles.tradeNotes}>{trade.notes}</Text>
                )}
              </View>
            ))}
          </View>
        ))}

        {filteredTrades.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="swap-horizontal-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Trades</Text>
            <Text style={styles.emptySubtitle}>No trades found for this filter</Text>
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1, paddingHorizontal: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  proposeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  proposeButtonText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '700' },
  activeSection: { marginBottom: spacing.md },
  activeSectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  activeTradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  activeTradeCardHighlight: { borderWidth: 1, borderColor: colors.warning },
  activeTradeInfo: { flex: 1 },
  activeTradeTeams: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  activeTradeMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  activeStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  activeStatusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  historyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  filterRow: { marginBottom: spacing.sm },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  filterChipTextActive: { color: colors.white },
  teamChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  teamChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  teamChipText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '600' },
  teamChipTextActive: { color: colors.white },
  seasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  seasonTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  seasonCount: { fontSize: fontSize.sm, color: colors.textMuted },
  tradeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  tradeId: { marginBottom: spacing.sm },
  tradeIdText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary },
  tradeBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tradeSide: { flex: 1 },
  swapIcon: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  teamName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  teamNameHighlight: { color: colors.primary },
  receivesLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 4 },
  tradeItem: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 2 },
  tradeItemEmpty: { fontSize: fontSize.sm, color: colors.textMuted, fontStyle: 'italic' },
  tradeNotes: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  emptySubtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
