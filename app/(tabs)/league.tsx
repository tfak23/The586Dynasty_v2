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
import { useLeagueData } from '../../src/hooks/useLeagueData';
import {
  OWNER_RECORDS,
  LEGACY_SCORES,
  PLAYOFF_BRACKETS,
  FORMER_OWNERS,
  CHAMPIONS,
} from '../../src/lib/leagueHistory';

type TabKey = 'standings' | 'history' | 'records';

export default function LeagueScreen() {
  const router = useRouter();
  const { refresh } = useLeagueData();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('standings');
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);

  const currentLeague = useAppStore((s) => s.currentLeague);
  const teams = useAppStore((s) => s.teams);
  const capSummaries = useAppStore((s) => s.capSummaries);
  const currentTeam = useAppStore((s) => s.currentTeam);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

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
  const seasons = Object.keys(CHAMPIONS).map(Number).sort((a, b) => b - a);

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
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/rules' as never)}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            <Text style={styles.quickActionText}>Rules</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/buy-ins' as never)}>
            <Ionicons name="cash-outline" size={20} color={colors.primary} />
            <Text style={styles.quickActionText}>Buy-Ins</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabRow}>
          {(['standings', 'history', 'records'] as TabKey[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'standings' ? 'Standings' : tab === 'history' ? 'History' : 'Records'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'standings' && (
          <>
            {sortedTeams.map((cap, index) => {
              const isCurrentTeam = currentTeam?.id === cap.team_id;
              const capColor = getCapStatusColor(cap.cap_room, cap.salary_cap);
              const capPct = cap.total_salary / cap.salary_cap;

              return (
                <TouchableOpacity
                  key={cap.team_id}
                  style={[styles.teamCard, isCurrentTeam && styles.teamCardCurrent]}
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
          </>
        )}

        {activeTab === 'history' && (
          <>
            {/* Champions */}
            <Text style={styles.sectionTitle}>Champions</Text>
            {seasons.map((season) => {
              const champ = CHAMPIONS[season];
              return (
                <View key={season} style={styles.championCard}>
                  <View style={styles.championTrophy}>
                    <Ionicons name="trophy" size={28} color={colors.gold} />
                  </View>
                  <View style={styles.championInfo}>
                    <Text style={styles.championSeason}>{season}</Text>
                    <Text style={styles.championName}>{champ.champion}</Text>
                    <Text style={styles.championRunner}>def. {champ.runnerUp}</Text>
                  </View>
                </View>
              );
            })}

            {/* Legacy Scores */}
            <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Legacy Rankings</Text>
            <Text style={styles.sectionSubtitle}>All-time composite score</Text>
            {LEGACY_SCORES.map((entry) => {
              const barWidth = LEGACY_SCORES[0].score > 0 ? (entry.score / LEGACY_SCORES[0].score) * 100 : 0;
              const isTop3 = entry.rank <= 3;
              const medalColor = entry.rank === 1 ? colors.gold : entry.rank === 2 ? colors.silver : entry.rank === 3 ? '#cd7f32' : undefined;

              return (
                <View key={entry.rank} style={styles.legacyRow}>
                  <View style={[styles.legacyRank, isTop3 && { backgroundColor: medalColor + '30' }]}>
                    {isTop3 ? (
                      <Ionicons name="medal" size={16} color={medalColor} />
                    ) : (
                      <Text style={styles.legacyRankText}>{entry.rank}</Text>
                    )}
                  </View>
                  <View style={styles.legacyInfo}>
                    <Text style={[styles.legacyName, isTop3 && { color: colors.text }]}>{entry.name}</Text>
                    <View style={styles.legacyBarOuter}>
                      <View style={[styles.legacyBarInner, { width: `${barWidth}%` }]} />
                    </View>
                  </View>
                  <Text style={[styles.legacyScore, isTop3 && { color: colors.primary }]}>
                    {entry.score.toFixed(1)}
                  </Text>
                </View>
              );
            })}

            {/* Playoff Brackets */}
            <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Playoff History</Text>
            {PLAYOFF_BRACKETS.slice().reverse().map((bracket) => {
              const isExpanded = expandedSeason === bracket.season;
              return (
                <View key={bracket.season}>
                  <TouchableOpacity
                    style={styles.bracketHeader}
                    onPress={() => setExpandedSeason(isExpanded ? null : bracket.season)}
                  >
                    <Text style={styles.bracketSeason}>{bracket.season} Playoffs</Text>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.bracketBody}>
                      <View style={styles.bracketRound}>
                        <Text style={styles.roundLabel}>Wild Card</Text>
                        {bracket.wildcard.map((game, i) => (
                          <Text key={i} style={styles.bracketGame}>{game}</Text>
                        ))}
                      </View>
                      <View style={styles.bracketRound}>
                        <Text style={styles.roundLabel}>Semifinals</Text>
                        {bracket.semiFinals.map((game, i) => (
                          <Text key={i} style={styles.bracketGame}>{game}</Text>
                        ))}
                      </View>
                      <View style={styles.bracketRound}>
                        <Text style={styles.roundLabel}>3rd Place</Text>
                        <Text style={styles.bracketGame}>{bracket.thirdPlace}</Text>
                      </View>
                      <View style={styles.bracketRound}>
                        <Text style={styles.roundLabel}>Championship</Text>
                        <Text style={[styles.bracketGame, { color: colors.gold, fontWeight: '700' }]}>
                          {bracket.championship}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Former Owners */}
            <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Former Owners</Text>
            {FORMER_OWNERS.map((owner) => (
              <View key={owner.name} style={styles.formerCard}>
                <View style={styles.formerIcon}>
                  <Ionicons name="swap-horizontal" size={18} color={colors.textMuted} />
                </View>
                <View style={styles.formerInfo}>
                  <Text style={styles.formerName}>{owner.name}</Text>
                  <Text style={styles.formerMeta}>
                    Replaced by {owner.replacedBy} • {owner.seasons}
                  </Text>
                  <Text style={styles.formerMeta}>
                    {owner.record} • {owner.pts} pts
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {activeTab === 'records' && (
          <>
            {/* Owner Records Table */}
            <Text style={styles.sectionTitle}>All-Time Records</Text>
            {[...OWNER_RECORDS]
              .filter((o) => o.overall.w + o.overall.l > 0)
              .sort((a, b) => parseFloat(b.overall.pct) - parseFloat(a.overall.pct))
              .map((owner, idx) => (
                <View key={owner.name} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <Text style={styles.recordRank}>#{idx + 1}</Text>
                    <Text style={styles.recordName}>{owner.name}</Text>
                    <Text style={styles.recordPct}>{owner.overall.pct}</Text>
                  </View>
                  <View style={styles.recordStats}>
                    <View style={styles.recordStat}>
                      <Text style={styles.statValue}>{owner.overall.w}-{owner.overall.l}{owner.overall.t > 0 ? `-${owner.overall.t}` : ''}</Text>
                      <Text style={styles.statLabel}>Record</Text>
                    </View>
                    <View style={styles.recordStat}>
                      <Text style={styles.statValue}>{owner.overall.pts}</Text>
                      <Text style={styles.statLabel}>Points</Text>
                    </View>
                    <View style={styles.recordStat}>
                      <Text style={styles.statValue}>{owner.titles}</Text>
                      <Text style={styles.statLabel}>Titles</Text>
                    </View>
                    <View style={styles.recordStat}>
                      <Text style={styles.statValue}>{owner.playoffAppearances}</Text>
                      <Text style={styles.statLabel}>Playoffs</Text>
                    </View>
                  </View>

                  {/* Season breakdown */}
                  {Object.entries(owner.seasons)
                    .sort(([a], [b]) => Number(b) - Number(a))
                    .map(([season, rec]) => (
                      <View key={season} style={styles.seasonRow}>
                        <Text style={styles.seasonYear}>{season}</Text>
                        <Text style={styles.seasonRecord}>{rec.w}-{rec.l}</Text>
                        <Text style={styles.seasonPts}>{rec.pts} pts</Text>
                        <View style={styles.placeBadge}>
                          <Text style={styles.placeText}>
                            {rec.place}{rec.place === 1 ? 'st' : rec.place === 2 ? 'nd' : rec.place === 3 ? 'rd' : 'th'}
                          </Text>
                        </View>
                      </View>
                    ))}

                  {/* Money */}
                  <View style={styles.moneyRow}>
                    <Text style={styles.moneyLabel}>Money Won:</Text>
                    <Text style={styles.moneyValue}>{owner.moneyWon}</Text>
                    <Text style={styles.moneyLabel}>Net:</Text>
                    <Text style={[
                      styles.moneyValue,
                      { color: owner.netMoney.startsWith('-') ? colors.error : owner.netMoney === '$0' ? colors.textSecondary : colors.success },
                    ]}>{owner.netMoney}</Text>
                  </View>
                </View>
              ))}

            {/* Owners with no record (Tony) */}
            {OWNER_RECORDS.filter((o) => o.overall.w + o.overall.l === 0).map((owner) => (
              <View key={owner.name} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <Text style={styles.recordRank}>-</Text>
                  <Text style={styles.recordName}>{owner.name}</Text>
                  <Text style={[styles.recordPct, { color: colors.textMuted }]}>New Owner</Text>
                </View>
              </View>
            ))}

            {/* Accolades Summary */}
            <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Accolades</Text>
            <View style={styles.accoladesGrid}>
              {OWNER_RECORDS.filter((o) => o.divisionTitles > 0)
                .sort((a, b) => b.divisionTitles - a.divisionTitles)
                .map((owner) => (
                  <View key={owner.name} style={styles.accoladeCard}>
                    <Ionicons name="ribbon" size={20} color={colors.primary} />
                    <Text style={styles.accoladeCount}>{owner.divisionTitles}</Text>
                    <Text style={styles.accoladeName}>{owner.name}</Text>
                    <Text style={styles.accoladeLabel}>Div. Titles</Text>
                  </View>
                ))}
            </View>
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

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.white },

  // Standings
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  teamCardCurrent: { borderWidth: 2, borderColor: colors.primary },
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

  // Section
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
    marginTop: -4,
  },

  // Champions
  championCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
  },
  championTrophy: { marginRight: spacing.md },
  championInfo: { flex: 1 },
  championSeason: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '600' },
  championName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.gold, marginTop: 2 },
  championRunner: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },

  // Legacy Scores
  legacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  legacyRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  legacyRankText: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: '600' },
  legacyInfo: { flex: 1, marginRight: spacing.sm },
  legacyName: { fontSize: fontSize.base, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
  legacyBarOuter: {
    height: 4,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.full,
  },
  legacyBarInner: {
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  legacyScore: { fontSize: fontSize.base, fontWeight: '700', color: colors.textSecondary, width: 50, textAlign: 'right' },

  // Playoff Brackets
  bracketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  bracketSeason: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  bracketBody: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    marginTop: -4,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  bracketRound: { marginBottom: spacing.sm },
  roundLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', marginBottom: 4 },
  bracketGame: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 2, paddingLeft: spacing.sm },

  // Former Owners
  formerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  formerIcon: { marginRight: spacing.md },
  formerInfo: { flex: 1 },
  formerName: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  formerMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },

  // Records Tab
  recordCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  recordRank: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textMuted, width: 28 },
  recordName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, flex: 1 },
  recordPct: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  recordStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recordStat: { alignItems: 'center' },
  statValue: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  seasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
  },
  seasonYear: { fontSize: fontSize.sm, color: colors.textMuted, width: 40 },
  seasonRecord: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, width: 40 },
  seasonPts: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
  placeBadge: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  placeText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '600' },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  moneyLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  moneyValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },

  // Accolades
  accoladesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  accoladeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    width: '31%' as any,
  },
  accoladeCount: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginTop: 4 },
  accoladeName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginTop: 2 },
  accoladeLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },

  // Empty
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
