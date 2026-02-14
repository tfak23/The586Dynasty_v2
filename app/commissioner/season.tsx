import React, { useState } from 'react';
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

export default function AdvanceSeasonScreen() {
  const router = useRouter();
  const currentLeague = useAppStore((s) => s.currentLeague);
  const setCurrentLeague = useAppStore((s) => s.setCurrentLeague);

  const currentSeason = currentLeague?.current_season ?? new Date().getFullYear();
  const nextSeason = currentSeason + 1;

  const [tradeDeadline, setTradeDeadline] = useState('');
  const [rosterDeadline, setRosterDeadline] = useState('');
  const [draftDate, setDraftDate] = useState('');
  const [advancing, setAdvancing] = useState(false);

  const handleAdvanceSeason = async () => {
    if (!currentLeague) return;

    const doAdvance = async () => {
      setAdvancing(true);
      try {
        const { error } = await supabase
          .from('leagues')
          .update({ current_season: nextSeason })
          .eq('id', currentLeague.id);

        if (error) throw error;

        setCurrentLeague({ ...currentLeague, current_season: nextSeason });

        const successMsg = `Season advanced to ${nextSeason}!`;
        if (Platform.OS === 'web') {
          window.alert(successMsg);
        } else {
          Alert.alert('Success', successMsg);
        }
        router.back();
      } catch (err) {
        console.error('Error advancing season:', err);
        const errMsg = 'Failed to advance season. Please try again.';
        if (Platform.OS === 'web') {
          window.alert(errMsg);
        } else {
          Alert.alert('Error', errMsg);
        }
      } finally {
        setAdvancing(false);
      }
    };

    const confirmMsg = `Are you sure you want to advance the league from ${currentSeason} to ${nextSeason}? This action will:\n\n- Expire all ending contracts\n- Reduce years remaining on active contracts\n- Reset franchise tags\n\nThis cannot be undone.`;

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        await doAdvance();
      }
    } else {
      Alert.alert('Advance Season', confirmMsg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Advance', style: 'destructive', onPress: doAdvance },
      ]);
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
          <Text style={styles.title}>Advance Season</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Current Season Info */}
        <View style={styles.seasonCard}>
          <Text style={styles.seasonLabel}>Current Season</Text>
          <Text style={styles.seasonValue}>{currentSeason}</Text>
          <Ionicons name="arrow-forward" size={24} color={colors.primary} style={{ marginHorizontal: spacing.md }} />
          <Text style={styles.seasonLabel}>Next Season</Text>
          <Text style={[styles.seasonValue, { color: colors.primary }]}>{nextSeason}</Text>
        </View>

        {/* Deadline Inputs */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Season Deadlines (Optional)</Text>

          <Text style={styles.fieldLabel}>Trade Deadline</Text>
          <TextInput
            style={styles.input}
            value={tradeDeadline}
            onChangeText={setTradeDeadline}
            placeholder="e.g., November 15, 2026"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.fieldLabel}>Roster Cutdown Deadline</Text>
          <TextInput
            style={styles.input}
            value={rosterDeadline}
            onChangeText={setRosterDeadline}
            placeholder="e.g., September 1, 2026"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.fieldLabel}>Rookie Draft Date</Text>
          <TextInput
            style={styles.input}
            value={draftDate}
            onChangeText={setDraftDate}
            placeholder="e.g., August 15, 2026"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Warning */}
        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning-outline" size={24} color={colors.warning} />
            <Text style={styles.warningTitle}>Caution</Text>
          </View>
          <Text style={styles.warningText}>
            Advancing the season is a major action that affects all teams. Make sure the following have been completed before proceeding:
          </Text>
          <View style={styles.checkList}>
            <View style={styles.checkItem}>
              <Ionicons name="ellipse-outline" size={16} color={colors.textMuted} />
              <Text style={styles.checkText}>All trades have been processed</Text>
            </View>
            <View style={styles.checkItem}>
              <Ionicons name="ellipse-outline" size={16} color={colors.textMuted} />
              <Text style={styles.checkText}>Rookie draft is complete</Text>
            </View>
            <View style={styles.checkItem}>
              <Ionicons name="ellipse-outline" size={16} color={colors.textMuted} />
              <Text style={styles.checkText}>All rosters are within cap limits</Text>
            </View>
            <View style={styles.checkItem}>
              <Ionicons name="ellipse-outline" size={16} color={colors.textMuted} />
              <Text style={styles.checkText}>Buy-ins are settled</Text>
            </View>
          </View>
        </View>

        {/* Advance Button */}
        <TouchableOpacity
          style={styles.advanceButton}
          onPress={handleAdvanceSeason}
          disabled={advancing}
        >
          {advancing ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Ionicons name="calendar-outline" size={20} color={colors.white} />
              <Text style={styles.advanceButtonText}>Advance to {nextSeason}</Text>
            </>
          )}
        </TouchableOpacity>

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
  seasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  seasonLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  seasonValue: { fontSize: fontSize.xxxl, fontWeight: '700', color: colors.text },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  formTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: fontSize.base,
  },
  warningCard: {
    backgroundColor: colors.warning + '10',
    borderWidth: 1,
    borderColor: colors.warning + '40',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  warningTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.warning },
  warningText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  checkList: { gap: spacing.sm },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkText: { fontSize: fontSize.sm, color: colors.textSecondary },
  advanceButton: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  advanceButtonText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
});
