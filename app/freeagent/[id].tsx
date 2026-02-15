import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, getPositionColor } from '../../src/lib/theme';
import { useAppStore } from '../../src/lib/store';
import { estimateContract, type ContractEstimate } from '../../src/lib/contractEstimation';

export default function FreeAgentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [showSignModal, setShowSignModal] = useState(false);
  const [salary, setSalary] = useState('');
  const [years, setYears] = useState(1);
  const [estimate, setEstimate] = useState<ContractEstimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  const allPlayers = useAppStore((s) => s.allPlayers);
  const currentLeague = useAppStore((s) => s.currentLeague);

  const player = allPlayers.find((p) => p.id === id);

  // Full contract estimate
  useEffect(() => {
    if (!player || !currentLeague) return;
    let cancelled = false;
    setEstimateLoading(true);

    estimateContract(
      currentLeague.id,
      player.id,
      player.position,
      player.age,
      null,
      currentLeague.current_season
    ).then((est) => {
      if (!cancelled) {
        setEstimate(est);
        setSalary(String(est.estimated_salary));
        setEstimateLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setEstimateLoading(false);
    });

    return () => { cancelled = true; };
  }, [player?.id, currentLeague?.id]);

  if (!player) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Free Agent</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={styles.scrollView}>
          <View style={styles.emptyState}>
            <Ionicons name="person-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Player Not Found</Text>
            <Text style={styles.emptySubtitle}>This player could not be found in the database</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const posColor = getPositionColor(player.position);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Free Agent</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Player Info Card */}
        <View style={styles.playerCard}>
          <View style={[styles.posDot, { backgroundColor: posColor }]}>
            <Text style={styles.posDotText}>{player.position}</Text>
          </View>
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>{player.full_name}</Text>
            <Text style={styles.playerMeta}>
              {player.team ?? 'Free Agent'} • Age {player.age ?? '?'} • {player.years_exp ?? 0} yrs experience
            </Text>
          </View>
        </View>

        {/* Contract Estimate Card */}
        <View style={styles.estimateCard}>
          <View style={styles.estimateHeader}>
            <Ionicons name="calculator-outline" size={20} color={colors.primary} />
            <Text style={styles.estimateTitle}>Contract Estimate</Text>
          </View>

          {estimateLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
          ) : estimate ? (
            <>
              <View style={styles.estimateRow}>
                <Text style={styles.estimateLabel}>Estimated Salary</Text>
                <Text style={styles.estimateValue}>${estimate.estimated_salary}</Text>
              </View>
              <View style={styles.estimateRow}>
                <Text style={styles.estimateLabel}>Range</Text>
                <Text style={styles.estimateRange}>
                  ${estimate.salary_range.min} – ${estimate.salary_range.max}
                </Text>
              </View>
              <View style={styles.estimateRow}>
                <Text style={styles.estimateLabel}>Confidence</Text>
                <View style={[
                  styles.confidenceBadge,
                  {
                    backgroundColor:
                      estimate.confidence === 'high' ? colors.success + '20' :
                      estimate.confidence === 'medium' ? colors.warning + '20' :
                      colors.error + '20',
                  },
                ]}>
                  <Text style={[
                    styles.confidenceText,
                    {
                      color:
                        estimate.confidence === 'high' ? colors.success :
                        estimate.confidence === 'medium' ? colors.warning :
                        colors.error,
                    },
                  ]}>
                    {estimate.confidence.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Comparable Players */}
              {estimate.comparable_players.length > 0 && (
                <>
                  <Text style={styles.compsTitle}>Comparable Contracts</Text>
                  {estimate.comparable_players.map((comp) => (
                    <View key={comp.player_id} style={styles.compRow}>
                      <View style={styles.compInfo}>
                        <Text style={styles.compName}>{comp.full_name}</Text>
                        <Text style={styles.compMeta}>
                          {comp.team ?? 'FA'} • {comp.ppg.toFixed(1)} PPG • {comp.games_played} GP
                        </Text>
                      </View>
                      <Text style={styles.compSalary}>${comp.salary}</Text>
                    </View>
                  ))}
                </>
              )}

              {/* Reasoning */}
              <TouchableOpacity
                style={styles.reasoningToggle}
                onPress={() => {}}
              >
                <Text style={styles.reasoningText}>{estimate.reasoning}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.estimateNA}>No estimate available</Text>
          )}
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Sign Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.signButton}
          onPress={() => setShowSignModal(true)}
        >
          <Ionicons name="add-circle" size={20} color={colors.white} />
          <Text style={styles.signButtonText}>Sign Player</Text>
        </TouchableOpacity>
      </View>

      {/* Sign Modal */}
      <Modal
        visible={showSignModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSignModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sign {player.full_name}</Text>
              <TouchableOpacity onPress={() => setShowSignModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {estimate && (
              <Text style={styles.suggestedLabel}>
                Suggested: ${estimate.salary_range.min}–${estimate.salary_range.max}
              </Text>
            )}

            <Text style={styles.label}>Salary</Text>
            <View style={styles.salaryInput}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.input}
                value={salary}
                onChangeText={setSalary}
                keyboardType="numeric"
                placeholder="Enter salary"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <Text style={styles.label}>Years</Text>
            <View style={styles.yearsRow}>
              {[1, 2, 3, 4, 5].map((y) => (
                <TouchableOpacity
                  key={y}
                  style={[styles.yearButton, years === y && styles.yearButtonActive]}
                  onPress={() => setYears(y)}
                >
                  <Text
                    style={[styles.yearButtonText, years === y && styles.yearButtonTextActive]}
                  >
                    {y}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.confirmButton}>
              <Text style={styles.confirmButtonText}>Confirm Signing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  emptySubtitle: { fontSize: fontSize.base, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },

  // Player Card
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  posDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  posDotText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  playerInfo: { flex: 1 },
  playerName: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  playerMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },

  // Estimate Card
  estimateCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  estimateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  estimateTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  estimateLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  estimateValue: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary },
  estimateRange: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  confidenceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  confidenceText: { fontSize: fontSize.xs, fontWeight: '700' },
  estimateNA: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', marginVertical: spacing.md },

  // Comparables
  compsTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  compInfo: { flex: 1 },
  compName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  compMeta: { fontSize: fontSize.xs, color: colors.textMuted },
  compSalary: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },

  // Reasoning
  reasoningToggle: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reasoningText: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },

  // Bottom Bar
  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  signButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  signButtonText: { color: colors.white, fontSize: fontSize.md, fontWeight: '600' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  suggestedLabel: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  label: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600', marginBottom: spacing.xs },
  salaryInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  dollarSign: { color: colors.textMuted, fontSize: fontSize.lg, fontWeight: '600' },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.lg,
    paddingVertical: spacing.md,
    marginLeft: spacing.xs,
  },
  yearsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  yearButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
  },
  yearButtonActive: { backgroundColor: colors.primary },
  yearButtonText: { color: colors.textSecondary, fontWeight: '600' },
  yearButtonTextActive: { color: colors.white },
  confirmButton: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  confirmButtonText: { color: colors.white, fontSize: fontSize.md, fontWeight: '600' },
});
