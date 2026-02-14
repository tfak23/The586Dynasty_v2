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

type TradeFilter = 'all' | 'pending' | 'completed' | 'past';

const STATUS_ICONS: Record<string, string> = {
  pending: 'time-outline',
  accepted: 'checkmark-circle-outline',
  completed: 'checkmark-done-outline',
  rejected: 'close-circle-outline',
  expired: 'hourglass-outline',
  cancelled: 'ban-outline',
};

const STATUS_COLORS: Record<string, string> = {
  pending: colors.warning,
  accepted: colors.success,
  completed: colors.success,
  rejected: colors.error,
  expired: colors.textMuted,
  cancelled: colors.textMuted,
};

export default function TradesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<TradeFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: Refetch trades
    setRefreshing(false);
  }, []);

  const filters: { key: TradeFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'completed', label: 'Completed' },
    { key: 'past', label: 'Past' },
  ];

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
          <Text style={styles.title}>Trades</Text>
          <TouchableOpacity
            style={styles.newTradeButton}
            onPress={() => router.push('/trade/new' as never)}
          >
            <Ionicons name="add" size={20} color={colors.white} />
            <Text style={styles.newTradeButtonText}>New Trade</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Trades Placeholder */}
        <View style={styles.emptyState}>
          <Ionicons name="swap-horizontal-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Trades</Text>
          <Text style={styles.emptySubtitle}>
            {filter === 'pending'
              ? 'No pending trades at this time'
              : 'Trade proposals and history will appear here'}
          </Text>
        </View>

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
  newTradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  newTradeButtonText: { color: colors.white, fontWeight: '600', fontSize: fontSize.sm },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 2,
    marginBottom: spacing.lg,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md - 2,
  },
  filterTabActive: { backgroundColor: colors.primary },
  filterTabText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  filterTabTextActive: { color: colors.white },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  emptySubtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
