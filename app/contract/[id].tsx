import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, getPositionColor } from '../../src/lib/theme';
import { RATING_COLORS, RATING_ICONS } from '../../src/lib/constants';
import { calculateDeadCap, calculateCapSavings } from '../../src/lib/contractCalculations';
import { useAppStore } from '../../src/lib/store';
import { evaluateContract, type FullContractEvaluation } from '../../src/lib/contractEvaluation';
import type { Contract } from '../../src/types';

const CONFIDENCE_COLORS: Record<string, string> = {
  high: colors.success,
  medium: colors.warning,
  low: colors.error,
};

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const allContracts = useAppStore((s) => s.allContracts);
  const currentLeague = useAppStore((s) => s.currentLeague);

  const [evaluation, setEvaluation] = useState<FullContractEvaluation | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Find contract from store
  const contract = allContracts.find((c) => c.id === id) ?? null;

  // Load evaluation when contract is available
  useEffect(() => {
    if (!contract || !currentLeague) return;
    let cancelled = false;

    async function loadEval() {
      setEvalLoading(true);
      setEvalError(null);
      try {
        const result = await evaluateContract(contract!.id, currentLeague!.id);
        if (!cancelled) setEvaluation(result);
      } catch (err: any) {
        if (!cancelled) setEvalError(err.message ?? 'Failed to evaluate');
      } finally {
        if (!cancelled) setEvalLoading(false);
      }
    }

    loadEval();
    return () => { cancelled = true; };
  }, [contract?.id, currentLeague?.id]);

  if (!contract) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contract Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Contract Not Found</Text>
          <Text style={styles.emptySubtitle}>This contract may have been released or traded</Text>
        </View>
      </SafeAreaView>
    );
  }

  const player = contract.player;
  const position = player?.position ?? 'QB';
  const posColor = getPositionColor(position);
  const deadCapSchedule = calculateDeadCap(contract.salary, contract.years_remaining);
  const capSavings = calculateCapSavings(contract.salary, contract.years_remaining);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contract Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Player Header */}
        <View style={styles.playerHeader}>
          <View style={[styles.posBadge, { backgroundColor: posColor }]}>
            <Text style={styles.posBadgeText}>{position}</Text>
          </View>
          <View style={styles.playerHeaderInfo}>
            <Text style={styles.playerName}>{player?.full_name ?? 'Unknown'}</Text>
            <Text style={styles.playerMeta}>
              {player?.team ?? 'FA'} • Age {player?.age ?? '?'}
            </Text>
          </View>
        </View>

        {/* Contract Terms */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contract Terms</Text>
          <View style={styles.termsGrid}>
            <View style={styles.termItem}>
              <Text style={styles.termValue}>${contract.salary}</Text>
              <Text style={styles.termLabel}>Salary/yr</Text>
            </View>
            <View style={styles.termItem}>
              <Text style={styles.termValue}>{contract.years_remaining}</Text>
              <Text style={styles.termLabel}>Yrs Left</Text>
            </View>
            <View style={styles.termItem}>
              <Text style={styles.termValue}>{contract.years_total}</Text>
              <Text style={styles.termLabel}>Total Yrs</Text>
            </View>
            <View style={styles.termItem}>
              <Text style={[styles.termValue, { textTransform: 'capitalize' }]}>
                {contract.contract_type}
              </Text>
              <Text style={styles.termLabel}>Type</Text>
            </View>
          </View>
          <View style={styles.termRow}>
            <Text style={styles.termRowLabel}>Seasons</Text>
            <Text style={styles.termRowValue}>{contract.start_season}–{contract.end_season}</Text>
          </View>
        </View>

        {/* ═══ Contract Evaluation ═══ */}
        {evalLoading && (
          <View style={styles.card}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.evalLoadingText]}>Analyzing contract value...</Text>
          </View>
        )}

        {evalError && (
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.error }]}>Evaluation Error</Text>
            <Text style={styles.reasoningText}>{evalError}</Text>
          </View>
        )}

        {evaluation && (
          <>
            {/* Rating Badge */}
            <View style={styles.card}>
              <View style={styles.ratingRow}>
                <View style={[
                  styles.ratingBadge,
                  { backgroundColor: RATING_COLORS[evaluation.rating]?.bg ?? colors.surface },
                ]}>
                  <Ionicons
                    name={(RATING_ICONS[evaluation.rating] ?? 'help-circle') as any}
                    size={18}
                    color={RATING_COLORS[evaluation.rating]?.text ?? colors.text}
                  />
                  <Text style={[
                    styles.ratingBadgeText,
                    { color: RATING_COLORS[evaluation.rating]?.text ?? colors.text },
                  ]}>
                    {evaluation.rating}
                  </Text>
                </View>

                {/* Value Score */}
                <View style={styles.valueScoreContainer}>
                  <Text style={[
                    styles.valueScoreText,
                    { color: evaluation.value_score >= 0 ? colors.success : colors.error },
                  ]}>
                    {evaluation.value_score >= 0 ? '+' : ''}{evaluation.value_score.toFixed(1)}%
                  </Text>
                  <Text style={styles.valueScoreLabel}>Value Score</Text>
                </View>
              </View>

              {/* Confidence */}
              <View style={styles.confidenceRow}>
                <View style={[
                  styles.confidenceDot,
                  { backgroundColor: CONFIDENCE_COLORS[evaluation.comparable_contracts.length >= 3 && evaluation.player_stats.games_played >= 10 ? 'high' : evaluation.comparable_contracts.length >= 1 || evaluation.player_stats.games_played >= 6 ? 'medium' : 'low'] },
                ]} />
                <Text style={styles.confidenceText}>
                  {evaluation.comparable_contracts.length >= 3 && evaluation.player_stats.games_played >= 10
                    ? 'High'
                    : evaluation.comparable_contracts.length >= 1 || evaluation.player_stats.games_played >= 6
                      ? 'Medium'
                      : 'Low'} Confidence
                </Text>
              </View>
            </View>

            {/* Salary Comparison */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Salary Comparison</Text>
              <View style={styles.salaryCompare}>
                <View style={styles.salaryCol}>
                  <Text style={styles.salaryLabel}>Actual</Text>
                  <Text style={styles.salaryActual}>${evaluation.actual_salary}</Text>
                </View>
                <View style={styles.salaryVs}>
                  <Ionicons name="swap-horizontal" size={20} color={colors.textMuted} />
                </View>
                <View style={styles.salaryCol}>
                  <Text style={styles.salaryLabel}>Estimated</Text>
                  <Text style={styles.salaryEstimated}>${evaluation.estimated_salary}</Text>
                </View>
                <View style={styles.salaryCol}>
                  <Text style={styles.salaryLabel}>Difference</Text>
                  <Text style={[
                    styles.salaryDiff,
                    { color: evaluation.salary_difference >= 0 ? colors.success : colors.error },
                  ]}>
                    {evaluation.salary_difference >= 0 ? '+' : ''}${evaluation.salary_difference}
                  </Text>
                </View>
              </View>
            </View>

            {/* Rankings */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Rankings</Text>
              <View style={styles.rankingsRow}>
                {evaluation.position_rank !== null && (
                  <View style={styles.rankItem}>
                    <View style={[styles.rankCircle, { backgroundColor: posColor + '30' }]}>
                      <Text style={[styles.rankNumber, { color: posColor }]}>
                        #{evaluation.position_rank}
                      </Text>
                    </View>
                    <Text style={styles.rankLabel}>{position} Rank</Text>
                    <Text style={styles.rankSublabel}>by PPG</Text>
                  </View>
                )}
                {evaluation.league_rank !== null && (
                  <View style={styles.rankItem}>
                    <View style={[styles.rankCircle, { backgroundColor: colors.primary + '30' }]}>
                      <Text style={[styles.rankNumber, { color: colors.primary }]}>
                        #{evaluation.league_rank}
                      </Text>
                    </View>
                    <Text style={styles.rankLabel}>League Rank</Text>
                    <Text style={styles.rankSublabel}>
                      of {evaluation.total_contracts} contracts
                    </Text>
                  </View>
                )}
                <View style={styles.rankItem}>
                  <View style={[styles.rankCircle, { backgroundColor: colors.gold + '30' }]}>
                    <Text style={[styles.rankNumber, { color: colors.gold }]}>
                      {evaluation.player_stats.ppg.toFixed(1)}
                    </Text>
                  </View>
                  <Text style={styles.rankLabel}>PPG</Text>
                  <Text style={styles.rankSublabel}>
                    {evaluation.player_stats.games_played} games
                  </Text>
                </View>
              </View>
            </View>

            {/* Comparable Players */}
            {evaluation.comparable_contracts.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Comparable Contracts</Text>
                {evaluation.comparable_contracts.map((comp) => (
                  <View key={comp.player_id} style={styles.compRow}>
                    <View style={[styles.compPosDot, { backgroundColor: getPositionColor(comp.position) }]}>
                      <Text style={styles.compPosDotText}>{comp.position}</Text>
                    </View>
                    <View style={styles.compInfo}>
                      <Text style={styles.compName}>{comp.full_name}</Text>
                      <Text style={styles.compMeta}>
                        {comp.team ?? 'FA'} • {comp.ppg.toFixed(1)} PPG • {comp.games_played} GP
                      </Text>
                    </View>
                    <Text style={styles.compSalary}>${comp.salary}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Reasoning */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Analysis</Text>
              <Text style={styles.reasoningText}>{evaluation.reasoning}</Text>
            </View>
          </>
        )}

        {/* Dead Cap Schedule */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Release Analysis</Text>
          <View style={styles.termRow}>
            <Text style={styles.termRowLabel}>Cap Savings if Released</Text>
            <Text style={[styles.termRowValue, { color: capSavings > 0 ? colors.success : colors.error }]}>
              ${capSavings}
            </Text>
          </View>
          <Text style={styles.deadCapHeader}>Dead Cap Schedule</Text>
          {deadCapSchedule.map((year) => (
            <View key={year.year} style={styles.deadCapRow}>
              <Text style={styles.deadCapYear}>Year {year.year}</Text>
              <Text style={styles.deadCapPct}>{Math.round(year.percentage * 100)}%</Text>
              <Text style={[styles.deadCapAmt, { color: colors.error }]}>${year.amount}</Text>
            </View>
          ))}
        </View>

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
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  emptySubtitle: { fontSize: fontSize.base, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },

  // Player Header
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  posBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  posBadgeText: { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },
  playerHeaderInfo: { flex: 1 },
  playerName: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  playerMeta: { fontSize: fontSize.base, color: colors.textSecondary, marginTop: 2 },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },

  // Contract Terms
  termsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  termItem: { alignItems: 'center', flex: 1 },
  termValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  termLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  termRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  termRowLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  termRowValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },

  // Evaluation Loading
  evalLoadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  // Rating
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  ratingBadgeText: { fontSize: fontSize.sm, fontWeight: '700' },
  valueScoreContainer: { alignItems: 'flex-end' },
  valueScoreText: { fontSize: fontSize.xl, fontWeight: '700' },
  valueScoreLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },

  // Confidence
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confidenceDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm },
  confidenceText: { fontSize: fontSize.sm, color: colors.textSecondary },

  // Salary Comparison
  salaryCompare: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  salaryCol: { alignItems: 'center', flex: 1 },
  salaryVs: { paddingHorizontal: spacing.xs },
  salaryLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 4 },
  salaryActual: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  salaryEstimated: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary },
  salaryDiff: { fontSize: fontSize.lg, fontWeight: '700' },

  // Rankings
  rankingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rankItem: { alignItems: 'center' },
  rankCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  rankNumber: { fontSize: fontSize.md, fontWeight: '700' },
  rankLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  rankSublabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },

  // Comparable Players
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  compPosDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  compPosDotText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '700' },
  compInfo: { flex: 1 },
  compName: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  compMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 1 },
  compSalary: { fontSize: fontSize.base, fontWeight: '700', color: colors.primary },

  // Reasoning
  reasoningText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },

  // Dead Cap
  deadCapHeader: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  deadCapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  deadCapYear: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
  deadCapPct: { fontSize: fontSize.sm, color: colors.textMuted, width: 50, textAlign: 'center' },
  deadCapAmt: { fontSize: fontSize.sm, fontWeight: '600', width: 50, textAlign: 'right' },
});
