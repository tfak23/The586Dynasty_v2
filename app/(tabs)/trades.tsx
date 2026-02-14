import React, { useState, useCallback } from 'react';
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
import { TRADE_HISTORY, getTradeSeasons } from '../../src/lib/tradeHistory';

type TradeFilter = 'all' | '2026' | '2024' | '2023';

export default function TradesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<TradeFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshing(false);
  }, []);

  const seasons = getTradeSeasons();
  const filters: { key: TradeFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    ...seasons.map((s) => ({ key: String(s) as TradeFilter, label: String(s) })),
  ];

  const filteredTrades = filter === 'all'
    ? TRADE_HISTORY
    : TRADE_HISTORY.filter((t) => t.season === Number(filter));

  // Group by season for display
  const tradesBySeason: Record<number, typeof TRADE_HISTORY> = {};
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
          <Text style={styles.countBadge}>{filteredTrades.length}</Text>
        </View>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
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
                    <Text style={styles.teamName}>{trade.team1}</Text>
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
                    <Text style={styles.teamName}>{trade.team2}</Text>
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
  countBadge: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  filterRow: { marginBottom: spacing.lg },
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
  seasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
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
