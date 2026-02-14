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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../../src/lib/theme';
import { useAppStore } from '../../src/lib/store';
import { supabase } from '../../src/lib/supabase';
import type { TradeHistory } from '../../src/types';

export default function TradeHistoryScreen() {
  const router = useRouter();
  const currentLeague = useAppStore((s) => s.currentLeague);
  const teams = useAppStore((s) => s.teams);

  const [trades, setTrades] = useState<TradeHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentLeague) loadTrades();
  }, [currentLeague]);

  const loadTrades = async () => {
    if (!currentLeague) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trade_history')
        .select('*')
        .eq('league_id', currentLeague.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrades((data as TradeHistory[]) || []);
    } catch (err) {
      console.error('Error loading trade history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTeamName = (teamId: string): string => {
    return teams.find((t) => t.id === teamId)?.team_name ?? 'Unknown Team';
  };

  const renderAssets = (assets: Record<string, unknown>[]): string => {
    if (!assets || assets.length === 0) return 'No assets';
    return assets
      .map((a) => {
        if (a.player_name) return a.player_name as string;
        if (a.pick) return a.pick as string;
        if (a.cap_amount) return `$${a.cap_amount} cap`;
        return 'Asset';
      })
      .join(', ');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Trade History</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading && (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
        )}

        {!loading && trades.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No trade history found</Text>
          </View>
        )}

        {!loading && trades.map((trade) => (
          <View key={trade.id} style={styles.tradeCard}>
            <View style={styles.tradeHeader}>
              <View style={styles.tradeBadge}>
                <Text style={styles.tradeBadgeText}>{trade.trade_number}</Text>
              </View>
              <Text style={styles.tradeYear}>{trade.trade_year}</Text>
              <Text style={styles.tradeDate}>
                {new Date(trade.created_at).toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.tradeBody}>
              {/* Team 1 */}
              <View style={styles.tradeSide}>
                <Text style={styles.tradeTeamName}>{getTeamName(trade.team1_id)}</Text>
                <Text style={styles.receivedLabel}>Received:</Text>
                <Text style={styles.receivedAssets}>
                  {renderAssets(trade.team1_received)}
                </Text>
              </View>

              <View style={styles.swapIcon}>
                <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
              </View>

              {/* Team 2 */}
              <View style={styles.tradeSide}>
                <Text style={styles.tradeTeamName}>{getTeamName(trade.team2_id)}</Text>
                <Text style={styles.receivedLabel}>Received:</Text>
                <Text style={styles.receivedAssets}>
                  {renderAssets(trade.team2_received)}
                </Text>
              </View>
            </View>
          </View>
        ))}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1, paddingHorizontal: spacing.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    flex: 1,
  },
  tradeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  tradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  tradeBadge: {
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tradeBadgeText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '700' },
  tradeYear: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  tradeDate: { fontSize: fontSize.xs, color: colors.textMuted, marginLeft: 'auto' },
  tradeBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tradeSide: { flex: 1 },
  tradeTeamName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginBottom: 4 },
  receivedLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 2 },
  receivedAssets: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },
  swapIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: { color: colors.textMuted, fontSize: fontSize.base, marginTop: spacing.sm },
});
