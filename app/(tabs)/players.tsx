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
import { getSleeperSeasonStats, type PlayerSeasonStats } from '../../src/lib/sleeperStats';
import { estimateFreeAgentValue, type MarketComp } from '../../src/lib/marketValue';
import { computeBulkRatings, ratingSortIndex } from '../../src/lib/bulkRatings';
import type { ContractRating } from '../../src/lib/contractCalculations';
import { RATING_COLORS } from '../../src/lib/constants';

type SortBy = 'salary' | 'name' | 'team' | 'rating' | 'contract';
type FaSortBy = 'projected' | 'name';
type StatusFilter = 'signed' | 'free_agents';
const POSITIONS = ['All', 'QB', 'RB', 'WR', 'TE'];
const FA_PAGE_SIZE = 300;
const STATS_SEASON = '2025';

// Grouping order for the contract-type sort
const CONTRACT_TYPE_ORDER: Record<string, number> = {
  tag: 0,
  extension: 1,
  standard: 2,
  free_agent: 3,
  rookie: 4,
};

const SORT_LABELS: Record<SortBy, string> = {
  salary: 'Salary',
  name: 'Name',
  team: 'Team',
  rating: 'Rating',
  contract: 'Contract',
};

export default function PlayersScreen() {
  const router = useRouter();
  const { refresh } = useLeagueData();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('signed');
  const [sortBy, setSortBy] = useState<SortBy>('salary');
  const [faSortBy, setFaSortBy] = useState<FaSortBy>('projected');
  const [refreshing, setRefreshing] = useState(false);
  const [faVisibleCount, setFaVisibleCount] = useState(FA_PAGE_SIZE);
  const [statsMap, setStatsMap] = useState<Record<string, PlayerSeasonStats>>({});
  const [ratings, setRatings] = useState<Record<string, ContractRating>>({});

  const allContracts = useAppStore((s) => s.allContracts);
  const allPlayers = useAppStore((s) => s.allPlayers);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Season stats (cached) — used for free-agent salary projections
  useEffect(() => {
    let cancelled = false;
    getSleeperSeasonStats(STATS_SEASON).then((stats) => {
      if (!cancelled) setStatsMap(stats);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Contract ratings (Rookie / Cornerstone / Bust, etc.) for signed players
  useEffect(() => {
    if (allContracts.length === 0) return;
    let cancelled = false;
    computeBulkRatings(allContracts).then((r) => {
      if (!cancelled) setRatings(r);
    });
    return () => {
      cancelled = true;
    };
  }, [allContracts]);

  // Reset FA paging when filters change
  useEffect(() => {
    setFaVisibleCount(FA_PAGE_SIZE);
  }, [selectedPosition, debouncedSearch, faSortBy, statusFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Set of player IDs that have active contracts
  const signedPlayerIds = useMemo(
    () => new Set(allContracts.map((c) => c.player_id)),
    [allContracts]
  );

  // Free agents: players in allPlayers who don't have contracts
  const freeAgents = useMemo(
    () => allPlayers.filter((p) => !signedPlayerIds.has(p.id)),
    [allPlayers, signedPlayerIds]
  );

  // Filtered signed players
  const filteredContracts = useMemo(() => {
    if (statusFilter !== 'signed') return [];
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
      if (sortBy === 'rating') {
        const diff = ratingSortIndex(ratings[a.id]) - ratingSortIndex(ratings[b.id]);
        return diff !== 0 ? diff : b.salary - a.salary;
      }
      if (sortBy === 'contract') {
        const diff =
          (CONTRACT_TYPE_ORDER[a.contract_type] ?? 99) - (CONTRACT_TYPE_ORDER[b.contract_type] ?? 99);
        return diff !== 0 ? diff : b.salary - a.salary;
      }
      return 0;
    });

    return result;
  }, [allContracts, selectedPosition, debouncedSearch, sortBy, statusFilter, ratings]);

  // Per-position pools of signed contracts (PPG + salary) — the comparables
  // pool used to project free-agent market value, matching the FA profile page
  const positionPools = useMemo(() => {
    const pools: Record<string, MarketComp[]> = {};
    allContracts.forEach((c) => {
      const p = c.player;
      if (!p) return;
      const ppg = statsMap[p.id]?.ppg_ppr ?? 0;
      if (!pools[p.position]) pools[p.position] = [];
      pools[p.position].push({ id: c.player_id, ppg, salary: c.salary });
    });
    return pools;
  }, [allContracts, statsMap]);

  // Free agents with projected salaries (comparables-based market estimate,
  // consistent with the estimate shown on the free-agent profile)
  const freeAgentsWithProjections = useMemo(() => {
    return freeAgents.map((p) => {
      const stats = statsMap[p.id];
      const ppg = stats?.ppg_ppr ?? 0;
      const projected = estimateFreeAgentValue(
        p.position,
        ppg,
        p.age ?? 25,
        positionPools[p.position] ?? []
      );
      return { player: p, projected, ppg };
    });
  }, [freeAgents, statsMap, positionPools]);

  // Filtered free agents
  const filteredFreeAgents = useMemo(() => {
    if (statusFilter !== 'free_agents') return [];
    let result = freeAgentsWithProjections;

    if (selectedPosition !== 'All') {
      result = result.filter((fa) => fa.player.position === selectedPosition);
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((fa) => {
        const name = fa.player.full_name?.toLowerCase() ?? '';
        const nflTeam = fa.player.team?.toLowerCase() ?? '';
        return name.includes(q) || nflTeam.includes(q);
      });
    }

    result = [...result].sort((a, b) => {
      if (faSortBy === 'projected') {
        return b.projected - a.projected || (a.player.full_name ?? '').localeCompare(b.player.full_name ?? '');
      }
      return (a.player.full_name ?? '').localeCompare(b.player.full_name ?? '');
    });

    return result;
  }, [freeAgentsWithProjections, selectedPosition, debouncedSearch, statusFilter, faSortBy]);

  const displayCount = statusFilter === 'signed' ? filteredContracts.length : filteredFreeAgents.length;

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
          <Text style={styles.countBadge}>{displayCount}</Text>
        </View>

        {/* Signed / Free Agents Toggle */}
        <View style={styles.statusToggle}>
          <TouchableOpacity
            style={[styles.statusBtn, statusFilter === 'signed' && styles.statusBtnActive]}
            onPress={() => setStatusFilter('signed')}
          >
            <Text style={[styles.statusBtnText, statusFilter === 'signed' && styles.statusBtnTextActive]}>
              Signed ({allContracts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statusBtn, statusFilter === 'free_agents' && styles.statusBtnActive]}
            onPress={() => setStatusFilter('free_agents')}
          >
            <Text style={[styles.statusBtnText, statusFilter === 'free_agents' && styles.statusBtnTextActive]}>
              Free Agents ({freeAgents.length})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={statusFilter === 'signed' ? 'Search players, teams, owners...' : 'Search free agents...'}
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

        {/* Position Filter */}
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

        {/* Sort row (signed only) */}
        {statusFilter === 'signed' && (
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Sort by</Text>
            {(['salary', 'name', 'team', 'rating', 'contract'] as SortBy[]).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.sortButton, sortBy === s && styles.sortButtonActive]}
                onPress={() => setSortBy(s)}
              >
                <Text style={[styles.sortButtonText, sortBy === s && styles.sortButtonTextActive]}>
                  {SORT_LABELS[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Sort row (free agents) */}
        {statusFilter === 'free_agents' && (
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Sort by</Text>
            {(['projected', 'name'] as FaSortBy[]).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.sortButton, faSortBy === s && styles.sortButtonActive]}
                onPress={() => setFaSortBy(s)}
              >
                <Text style={[styles.sortButtonText, faSortBy === s && styles.sortButtonTextActive]}>
                  {s === 'projected' ? 'Proj. Salary' : 'Name'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Signed Players List */}
        {statusFilter === 'signed' && (
          <>
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
                    <View style={styles.playerNameRow}>
                      <Text style={styles.playerName}>{contract.player?.full_name ?? 'Unknown'}</Text>
                      {ratings[contract.id] && (
                        <View
                          style={[
                            styles.ratingBadge,
                            { backgroundColor: RATING_COLORS[ratings[contract.id]]?.bg ?? colors.surface },
                          ]}
                        >
                          <Text
                            style={[
                              styles.ratingBadgeText,
                              { color: RATING_COLORS[ratings[contract.id]]?.text ?? colors.text },
                            ]}
                          >
                            {ratings[contract.id]}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.playerMeta}>
                      {contract.player?.team ?? 'FA'} • {(contract as any).team?.team_name ?? ''} • {contract.years_remaining}yr{contract.years_remaining !== 1 ? 's' : ''} left
                      {sortBy === 'contract' ? ` • ${contract.contract_type.replace('_', ' ')}` : ''}
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
          </>
        )}

        {/* Free Agents List */}
        {statusFilter === 'free_agents' && (
          <>
            {filteredFreeAgents.length > 0 ? (
              filteredFreeAgents.slice(0, faVisibleCount).map(({ player, projected }) => (
                <TouchableOpacity
                  key={player.id}
                  style={styles.playerCard}
                  onPress={() => router.push(`/freeagent/${player.id}` as never)}
                >
                  <View style={[styles.posDot, { backgroundColor: getPositionColor(player.position) }]}>
                    <Text style={styles.posDotText}>{player.position}</Text>
                  </View>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{player.full_name}</Text>
                    <Text style={styles.playerMeta}>
                      {player.team ?? 'FA'} • Age {player.age ?? '?'} • {player.years_exp ?? 0} yrs exp
                    </Text>
                  </View>
                  <Text style={styles.projSalary}>~${projected}</Text>
                  <View style={styles.faBadge}>
                    <Text style={styles.faBadgeText}>FA</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="person-add-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>
                  {freeAgents.length === 0 ? 'No Free Agents Loaded' : 'No Matches'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {freeAgents.length === 0 ? 'Pull to refresh to load player data' : 'Try adjusting your filters'}
                </Text>
              </View>
            )}

            {filteredFreeAgents.length > faVisibleCount && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => setFaVisibleCount((c) => c + FA_PAGE_SIZE)}
              >
                <Text style={styles.loadMoreText}>
                  Show more ({filteredFreeAgents.length - faVisibleCount} remaining)
                </Text>
              </TouchableOpacity>
            )}
          </>
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
  statusToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  statusBtnActive: { backgroundColor: colors.primary },
  statusBtnText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  statusBtnTextActive: { color: colors.white },
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
  playerNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  playerName: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  playerMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 1 },
  playerSalary: { fontSize: fontSize.base, fontWeight: '700', color: colors.primary, marginRight: spacing.sm },
  projSalary: { fontSize: fontSize.base, fontWeight: '700', color: colors.textSecondary, marginRight: spacing.sm },
  ratingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  ratingBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  loadMoreBtn: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  loadMoreText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  faBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  faBadgeText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.success },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  emptySubtitle: { fontSize: fontSize.base, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
});
