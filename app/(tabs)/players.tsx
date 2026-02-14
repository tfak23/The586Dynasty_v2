import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, getPositionColor } from '../../src/lib/theme';
import { useAppStore } from '../../src/lib/store';
import { useLeagueData } from '../../src/hooks/useLeagueData';

type SortBy = 'salary' | 'name' | 'team';
const POSITIONS = ['All', 'QB', 'RB', 'WR', 'TE'];

export default function PlayersScreen() {
  const router = useRouter();
  const { refresh } = useLeagueData();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('All');
  const [sortBy, setSortBy] = useState<SortBy>('salary');
  const [refreshing, setRefreshing] = useState(false);

  const allContracts = useAppStore((s) => s.allContracts);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const filteredContracts = useMemo(() => {
    let result = allContracts;

    if (selectedPosition !== 'All') {
      result = result.filter((c) => c.player?.position === selectedPosition);
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((c) => {
        const name = c.player?.full_name?.toLowerCase() ?? '';
        const teamName = (c as any).team?.team_name?.toLowerCase() ?? '';
        const owner = (c as any).team?.owner_name?.toLowerCase() ?? '';
        return name.includes(q) || teamName.includes(q) || owner.includes(q);
      });
    }

    result = [...result].sort((a, b) => {
      if (sortBy === 'salary') return b.salary - a.salary;
      if (sortBy === 'name') return (a.player?.full_name ?? '').localeCompare(b.player?.full_name ?? '');
      if (sortBy === 'team') return ((a as any).team?.team_name ?? '').localeCompare((b as any).team?.team_name ?? '');
      return 0;
    });

    return result;
  }, [allContracts, selectedPosition, debouncedSearch, sortBy]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Players</Text>
          <Text style={styles.countBadge}>{filteredContracts.length}</Text>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search players, teams, owners..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {POSITIONS.map((pos) => (
            <TouchableOpacity
              key={pos}
              style={[
                styles.filterChip,
                selectedPosition === pos && styles.filterChipActive,
                pos !== 'All' && selectedPosition === pos && { backgroundColor: getPositionColor(pos) },
              ]}
              onPress={() => setSelectedPosition(pos)}
            >
              <Text style={[styles.filterChipText, selectedPosition === pos && styles.filterChipTextActive]}>
                {pos}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort by</Text>
          {(['salary', 'name', 'team'] as SortBy[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sortButton, sortBy === s && styles.sortButtonActive]}
              onPress={() => setSortBy(s)}
            >
              <Text style={[styles.sortButtonText, sortBy === s && styles.sortButtonTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredContracts.length > 0 ? (
          filteredContracts.map((contract) => (
            <TouchableOpacity
              key={contract.id}
              style={styles.playerCard}
              onPress={() => router.push(`/contract/${contract.id}` as never)}
            >
              <View style={[styles.posDot, { backgroundColor: getPositionColor(contract.player?.position ?? 'QB') }]}>
                <Text style={styles.posDotText}>{contract.player?.position ?? '?'}</Text>
              </View>
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{contract.player?.full_name ?? 'Unknown'}</Text>
                <Text style={styles.playerMeta}>
                  {contract.player?.team ?? 'FA'} • {(contract as any).team?.team_name ?? ''} • {contract.years_remaining}yr{contract.years_remaining !== 1 ? 's' : ''} left
                </Text>
              </View>
              <Text style={styles.playerSalary}>${contract.salary}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {allContracts.length === 0 ? 'No Players Loaded' : 'No Matches'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {allContracts.length === 0 ? 'Pull to refresh to load player data' : 'Try adjusting your filters'}
            </Text>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.base,
    marginLeft: spacing.sm,
    paddingVertical: 0,
  },
  filterRow: { marginBottom: spacing.md },
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
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sortLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  sortButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  sortButtonActive: { backgroundColor: colors.primary },
  sortButtonText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  sortButtonTextActive: { color: colors.white },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  posDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  posDotText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '700' },
  playerInfo: { flex: 1 },
  playerName: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  playerMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 1 },
  playerSalary: { fontSize: fontSize.base, fontWeight: '700', color: colors.primary, marginRight: spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  emptySubtitle: { fontSize: fontSize.base, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
});
