import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
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
import type { Team, CapAdjustment } from '../../src/types';

type AdjustmentType = 'add' | 'subtract';

export default function CapAdjustmentsScreen() {
  const router = useRouter();
  const teams = useAppStore((s) => s.teams);
  const currentLeague = useAppStore((s) => s.currentLeague);

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [adjustments, setAdjustments] = useState<CapAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('add');
  const [amount2026, setAmount2026] = useState('');
  const [amount2027, setAmount2027] = useState('');
  const [amount2028, setAmount2028] = useState('');
  const [amount2029, setAmount2029] = useState('');
  const [amount2030, setAmount2030] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (selectedTeam && currentLeague) {
      loadAdjustments(selectedTeam.id);
    }
  }, [selectedTeam, currentLeague]);

  const loadAdjustments = async (teamId: string) => {
    if (!currentLeague) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cap_adjustments')
        .select('*')
        .eq('league_id', currentLeague.id)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdjustments((data as CapAdjustment[]) || []);
    } catch (err) {
      console.error('Error loading adjustments:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAdjustmentType('add');
    setAmount2026('');
    setAmount2027('');
    setAmount2028('');
    setAmount2029('');
    setAmount2030('');
    setReason('');
  };

  const handleSubmit = async () => {
    if (!selectedTeam || !currentLeague || !reason.trim()) return;

    const multiplier = adjustmentType === 'subtract' ? -1 : 1;

    const payload = {
      league_id: currentLeague.id,
      team_id: selectedTeam.id,
      adjustment_type: adjustmentType,
      amount_2026: (parseFloat(amount2026) || 0) * multiplier,
      amount_2027: (parseFloat(amount2027) || 0) * multiplier,
      amount_2028: (parseFloat(amount2028) || 0) * multiplier,
      amount_2029: (parseFloat(amount2029) || 0) * multiplier,
      amount_2030: (parseFloat(amount2030) || 0) * multiplier,
      description: reason.trim(),
    };

    setSaving(true);
    try {
      const { error } = await supabase.from('cap_adjustments').insert(payload);
      if (error) throw error;
      resetForm();
      loadAdjustments(selectedTeam.id);
    } catch (err) {
      console.error('Error saving adjustment:', err);
      const msg = 'Failed to save adjustment. Please try again.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setSaving(false);
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
          <Text style={styles.title}>Cap Adjustments</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Team Picker */}
        <Text style={styles.sectionTitle}>Select Team</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teamPicker}>
          {teams.map((team) => (
            <TouchableOpacity
              key={team.id}
              style={[
                styles.teamChip,
                selectedTeam?.id === team.id && styles.teamChipSelected,
              ]}
              onPress={() => setSelectedTeam(team)}
            >
              <Text
                style={[
                  styles.teamChipText,
                  selectedTeam?.id === team.id && styles.teamChipTextSelected,
                ]}
              >
                {team.team_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selectedTeam && (
          <>
            {/* Adjustment Form */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>New Adjustment</Text>

              {/* Type Toggle */}
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    adjustmentType === 'add' && styles.typeButtonActive,
                  ]}
                  onPress={() => setAdjustmentType('add')}
                >
                  <Ionicons name="add-circle-outline" size={18} color={adjustmentType === 'add' ? colors.white : colors.success} />
                  <Text style={[styles.typeButtonText, adjustmentType === 'add' && styles.typeButtonTextActive]}>
                    Add Cap
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    adjustmentType === 'subtract' && styles.typeButtonActiveSubtract,
                  ]}
                  onPress={() => setAdjustmentType('subtract')}
                >
                  <Ionicons name="remove-circle-outline" size={18} color={adjustmentType === 'subtract' ? colors.white : colors.error} />
                  <Text style={[styles.typeButtonText, adjustmentType === 'subtract' && styles.typeButtonTextActive]}>
                    Subtract Cap
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Year Amounts */}
              {[
                { label: '2026', value: amount2026, setter: setAmount2026 },
                { label: '2027', value: amount2027, setter: setAmount2027 },
                { label: '2028', value: amount2028, setter: setAmount2028 },
                { label: '2029', value: amount2029, setter: setAmount2029 },
                { label: '2030', value: amount2030, setter: setAmount2030 },
              ].map((year) => (
                <View key={year.label} style={styles.inputRow}>
                  <Text style={styles.inputLabel}>{year.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={year.value}
                    onChangeText={year.setter}
                    placeholder="$0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              ))}

              {/* Reason */}
              <Text style={styles.inputLabel}>Reason</Text>
              <TextInput
                style={[styles.input, styles.reasonInput]}
                value={reason}
                onChangeText={setReason}
                placeholder="Describe the reason for this adjustment..."
                placeholderTextColor={colors.textMuted}
                multiline
              />

              <TouchableOpacity
                style={[styles.submitButton, (!reason.trim()) && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={saving || !reason.trim()}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Save Adjustment</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Existing Adjustments */}
            <Text style={styles.sectionTitle}>Existing Adjustments</Text>
            {loading && <ActivityIndicator size="large" color={colors.primary} />}
            {!loading && adjustments.length === 0 && (
              <Text style={styles.emptyText}>No adjustments found for this team</Text>
            )}
            {!loading && adjustments.map((adj) => (
              <View key={adj.id} style={styles.adjustmentCard}>
                <View style={styles.adjustmentHeader}>
                  <Text style={styles.adjustmentDesc}>{adj.description}</Text>
                  <Text style={styles.adjustmentDate}>
                    {new Date(adj.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.adjustmentAmounts}>
                  {[
                    { year: '2026', amount: adj.amount_2026 },
                    { year: '2027', amount: adj.amount_2027 },
                    { year: '2028', amount: adj.amount_2028 },
                    { year: '2029', amount: adj.amount_2029 },
                    { year: '2030', amount: adj.amount_2030 },
                  ]
                    .filter((y) => y.amount !== 0)
                    .map((y) => (
                      <View key={y.year} style={styles.amountChip}>
                        <Text style={styles.amountYear}>{y.year}</Text>
                        <Text
                          style={[
                            styles.amountValue,
                            { color: y.amount > 0 ? colors.success : colors.error },
                          ]}
                        >
                          {y.amount > 0 ? '+' : ''}${y.amount}
                        </Text>
                      </View>
                    ))}
                </View>
              </View>
            ))}
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
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  teamPicker: { flexDirection: 'row', marginBottom: spacing.md },
  teamChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  teamChipSelected: { backgroundColor: colors.primary },
  teamChipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  teamChipTextSelected: { color: colors.white },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  formTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  typeToggle: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  typeButtonActive: { backgroundColor: colors.success, borderColor: colors.success },
  typeButtonActiveSubtract: { backgroundColor: colors.error, borderColor: colors.error },
  typeButtonText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  typeButtonTextActive: { color: colors.white },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  inputLabel: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    fontWeight: '600',
    width: 50,
    marginBottom: spacing.xs,
  },
  input: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: fontSize.base,
  },
  reasonInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
  adjustmentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  adjustmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  adjustmentDesc: { fontSize: fontSize.base, color: colors.text, fontWeight: '600', flex: 1 },
  adjustmentDate: { fontSize: fontSize.xs, color: colors.textMuted },
  adjustmentAmounts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  amountChip: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  amountYear: { fontSize: fontSize.xs, color: colors.textMuted },
  amountValue: { fontSize: fontSize.sm, fontWeight: '700' },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
});
