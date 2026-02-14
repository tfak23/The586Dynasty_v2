import React, { useState, useEffect, useMemo } from 'react';
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
import { colors, spacing, fontSize, borderRadius } from '../src/lib/theme';
import { useAppStore } from '../src/lib/store';
import { supabase } from '../src/lib/supabase';

interface OwnerStats {
  teamId: string;
  teamName: string;
  ownerName: string;
  championships: number;
  runnerUps: number;
  playoffAppearances: number;
  totalWins: number;
  totalLosses: number;
  winPct: number;
}

interface SeasonRecord {
  id: string;
  league_id: string;
  season: number;
  team_id: string;
  wins: number;
  losses: number;
  ties: number;
  points_for: number;
  points_against: number;
  playoff_finish: string | null;
  champion: boolean;
  runner_up: boolean;
}

type SortKey = 'championships' | 'winPct' | 'totalWins' | 'playoffAppearances';

export default function LeagueHistoryScreen() {
  const router = useRouter();
  const currentLeague = useAppStore((s) => s.currentLeague);
  const teams = useAppStore((s) => s.teams);

  const [records, setRecords] = useState<SeasonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('championships');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (currentLeague) loadHistory();
  }, [currentLeague]);

  const loadHistory = async () => {
    if (!currentLeague) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('season_records')
        .select('*')
        .eq('league_id', currentLeague.id)
        .order('season', { ascending: false });

      if (error) throw error;
      setRecords((data as SeasonRecord[]) || []);
    } catch (err) {
      console.error('Error loading league history:', err);
    } finally {
      setLoading(false);
    }
  };

  const ownerStats: OwnerStats[] = useMemo(() => {
    const statsMap = new Map<string, OwnerStats>();

    // Initialize from teams
    teams.forEach((team) => {
      statsMap.set(team.id, {
        teamId: team.id,
        teamName: team.team_name,
        ownerName: team.owner_name,
        championships: 0,
        runnerUps: 0,
        playoffAppearances: 0,
        totalWins: 0,
        totalLosses: 0,
        winPct: 0,
      });
    });

    // Aggregate records
    records.forEach((rec) => {
      const existing = statsMap.get(rec.team_id);
      if (!existing) return;

      existing.totalWins += rec.wins;
      existing.totalLosses += rec.losses;
      if (rec.champion) existing.championships += 1;
      if (rec.runner_up) existing.runnerUps += 1;
      if (rec.playoff_finish) existing.playoffAppearances += 1;

      const totalGames = existing.totalWins + existing.totalLosses;
      existing.winPct = totalGames > 0 ? existing.totalWins / totalGames : 0;
    });

    return Array.from(statsMap.values());
  }, [teams, records]);

  const sortedStats = useMemo(() => {
    const sorted = [...ownerStats].sort((a, b) => {
      const diff = a[sortBy] - b[sortBy];
      return sortAsc ? diff : -diff;
    });
    return sorted;
  }, [ownerStats, sortBy, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(key);
      setSortAsc(false);
    }
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortBy !== key) return null;
    return (
      <Ionicons
        name={sortAsc ? 'caret-up' : 'caret-down'}
        size={12}
        color={colors.primary}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>League History</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading && (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
        )}

        {!loading && (
          <>
            {/* Sort Headers */}
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.nameCell]}>Owner</Text>
              <TouchableOpacity
                style={styles.headerCellTouch}
                onPress={() => handleSort('championships')}
              >
                <Text style={styles.headerCellText}>Titles</Text>
                {renderSortIcon('championships')}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerCellTouch}
                onPress={() => handleSort('playoffAppearances')}
              >
                <Text style={styles.headerCellText}>Playoffs</Text>
                {renderSortIcon('playoffAppearances')}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerCellTouch}
                onPress={() => handleSort('totalWins')}
              >
                <Text style={styles.headerCellText}>W-L</Text>
                {renderSortIcon('totalWins')}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerCellTouch}
                onPress={() => handleSort('winPct')}
              >
                <Text style={styles.headerCellText}>Win%</Text>
                {renderSortIcon('winPct')}
              </TouchableOpacity>
            </View>

            {/* Table Rows */}
            {sortedStats.map((stat, index) => (
              <View
                key={stat.teamId}
                style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}
              >
                <View style={styles.nameCell}>
                  <Text style={styles.rowTeamName} numberOfLines={1}>
                    {stat.teamName}
                  </Text>
                  <Text style={styles.rowOwnerName} numberOfLines={1}>
                    {stat.ownerName}
                  </Text>
                </View>
                <View style={styles.dataCell}>
                  {stat.championships > 0 ? (
                    <View style={styles.championBadge}>
                      <Ionicons name="trophy" size={12} color={colors.gold} />
                      <Text style={[styles.dataCellText, { color: colors.gold }]}>
                        {stat.championships}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.dataCellText}>0</Text>
                  )}
                </View>
                <View style={styles.dataCell}>
                  <Text style={styles.dataCellText}>{stat.playoffAppearances}</Text>
                </View>
                <View style={styles.dataCell}>
                  <Text style={styles.dataCellText}>
                    {stat.totalWins}-{stat.totalLosses}
                  </Text>
                </View>
                <View style={styles.dataCell}>
                  <Text style={styles.dataCellText}>
                    {(stat.winPct * 100).toFixed(1)}%
                  </Text>
                </View>
              </View>
            ))}

            {sortedStats.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="trophy-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No historical data available yet</Text>
              </View>
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
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerCell: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  headerCellTouch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  headerCellText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  nameCell: { flex: 2, paddingRight: spacing.xs },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  tableRowAlt: {
    backgroundColor: colors.surface + '60',
  },
  rowTeamName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  rowOwnerName: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  dataCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataCellText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  championBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: { color: colors.textMuted, fontSize: fontSize.base, marginTop: spacing.sm },
});
