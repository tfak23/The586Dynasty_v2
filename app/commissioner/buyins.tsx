import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../../src/lib/theme';
import { useAppStore } from '../../src/lib/store';
import { supabase } from '../../src/lib/supabase';
import type { BuyIn } from '../../src/types';

export default function ManageBuyInsScreen() {
  const router = useRouter();
  const currentLeague = useAppStore((s) => s.currentLeague);
  const teams = useAppStore((s) => s.teams);

  const [buyIns, setBuyIns] = useState<BuyIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<number>(
    currentLeague?.current_season ?? new Date().getFullYear()
  );
  const [updating, setUpdating] = useState<string | null>(null);

  const seasons = Array.from({ length: 5 }, (_, i) => (currentLeague?.current_season ?? 2025) - 2 + i);

  useEffect(() => {
    if (currentLeague) loadBuyIns();
  }, [currentLeague, selectedSeason]);

  const loadBuyIns = async () => {
    if (!currentLeague) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('buy_ins')
        .select('*, team:teams(*)')
        .eq('league_id', currentLeague.id)
        .eq('season', selectedSeason)
        .order('status', { ascending: true });

      if (error) throw error;
      setBuyIns((data as BuyIn[]) || []);
    } catch (err) {
      console.error('Error loading buy-ins:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (buyIn: BuyIn) => {
    const nextStatus = buyIn.status === 'paid' ? 'unpaid' : 'paid';
    const nextAmountPaid = nextStatus === 'paid' ? buyIn.amount_due : 0;

    setUpdating(buyIn.id);
    try {
      const { error } = await supabase
        .from('buy_ins')
        .update({ status: nextStatus, amount_paid: nextAmountPaid })
        .eq('id', buyIn.id);

      if (error) throw error;
      setBuyIns((prev) =>
        prev.map((b) =>
          b.id === buyIn.id ? { ...b, status: nextStatus, amount_paid: nextAmountPaid } : b
        )
      );
    } catch (err) {
      console.error('Error updating buy-in:', err);
      const msg = 'Failed to update buy-in status.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setUpdating(null);
    }
  };

  const getTeamName = (buyIn: BuyIn): string => {
    if (buyIn.team) return buyIn.team.team_name;
    return teams.find((t) => t.id === buyIn.team_id)?.team_name ?? 'Unknown Team';
  };

  const totalDue = buyIns.reduce((sum, b) => sum + b.amount_due, 0);
  const totalPaid = buyIns.reduce((sum, b) => sum + b.amount_paid, 0);
  const paidCount = buyIns.filter((b) => b.status === 'paid').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return colors.success;
      case 'partial': return colors.warning;
      case 'unpaid': return colors.error;
      default: return colors.textMuted;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Manage Buy-Ins</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Season Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seasonPicker}>
          {seasons.map((season) => (
            <TouchableOpacity
              key={season}
              style={[
                styles.seasonChip,
                selectedSeason === season && styles.seasonChipSelected,
              ]}
              onPress={() => setSelectedSeason(season)}
            >
              <Text
                style={[
                  styles.seasonChipText,
                  selectedSeason === season && styles.seasonChipTextSelected,
                ]}
              >
                {season}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{selectedSeason} Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>${totalDue}</Text>
              <Text style={styles.summaryLabel}>Total Due</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.success }]}>${totalPaid}</Text>
              <Text style={styles.summaryLabel}>Total Paid</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {paidCount}/{buyIns.length}
              </Text>
              <Text style={styles.summaryLabel}>Paid</Text>
            </View>
          </View>
          {totalDue > 0 && (
            <View style={styles.progressOuter}>
              <View
                style={[
                  styles.progressInner,
                  { width: `${Math.min((totalPaid / totalDue) * 100, 100)}%` },
                ]}
              />
            </View>
          )}
        </View>

        {/* Buy-In Cards */}
        {loading && (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.lg }} />
        )}

        {!loading && buyIns.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="cash-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No buy-ins found for {selectedSeason}</Text>
          </View>
        )}

        {!loading && buyIns.map((buyIn) => (
          <View key={buyIn.id} style={styles.buyInCard}>
            <View style={styles.buyInRow}>
              <View style={styles.buyInInfo}>
                <Text style={styles.buyInTeam}>{getTeamName(buyIn)}</Text>
                <Text style={styles.buyInAmount}>${buyIn.amount_due}</Text>
              </View>
              <TouchableOpacity
                style={[styles.statusButton, { borderColor: getStatusColor(buyIn.status) }]}
                onPress={() => toggleStatus(buyIn)}
                disabled={updating === buyIn.id}
              >
                {updating === buyIn.id ? (
                  <ActivityIndicator size="small" color={getStatusColor(buyIn.status)} />
                ) : (
                  <>
                    <Ionicons
                      name={buyIn.status === 'paid' ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={getStatusColor(buyIn.status)}
                    />
                    <Text style={[styles.statusText, { color: getStatusColor(buyIn.status) }]}>
                      {buyIn.status.charAt(0).toUpperCase() + buyIn.status.slice(1)}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
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
  seasonPicker: { flexDirection: 'row', marginBottom: spacing.lg },
  seasonChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  seasonChipSelected: { backgroundColor: colors.primary },
  seasonChipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  seasonChipTextSelected: { color: colors.white },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.md },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  progressOuter: {
    height: 6,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.full,
  },
  progressInner: {
    height: 6,
    backgroundColor: colors.success,
    borderRadius: borderRadius.full,
  },
  buyInCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  buyInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buyInInfo: { flex: 1 },
  buyInTeam: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  buyInAmount: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  statusText: { fontSize: fontSize.sm, fontWeight: '600' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: { color: colors.textMuted, fontSize: fontSize.base, marginTop: spacing.sm },
});
