import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../../src/lib/theme';
import { useAppStore } from '../../src/lib/store';

type Step = 'teams' | 'assets' | 'review';

export default function NewTradeScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('teams');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [expirationHours, setExpirationHours] = useState(24);

  const teams = useAppStore((s) => s.teams);
  const currentTeam = useAppStore((s) => s.currentTeam);

  const steps: { key: Step; label: string }[] = [
    { key: 'teams', label: '1. Partner' },
    { key: 'assets', label: '2. Assets' },
    { key: 'review', label: '3. Review' },
  ];

  const otherTeams = teams.filter((t) => t.id !== currentTeam?.id);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Trade</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        {steps.map((s, i) => (
          <View key={s.key} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                step === s.key && styles.stepCircleActive,
                steps.indexOf(steps.find((x) => x.key === step)!) > i && styles.stepCircleDone,
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  (step === s.key || steps.indexOf(steps.find((x) => x.key === step)!) > i) && styles.stepNumberActive,
                ]}
              >
                {i + 1}
              </Text>
            </View>
            <Text style={[styles.stepLabel, step === s.key && styles.stepLabelActive]}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Step 1: Select Partner */}
        {step === 'teams' && (
          <View>
            <Text style={styles.sectionTitle}>Select Trading Partner</Text>
            {otherTeams.map((team) => (
              <TouchableOpacity
                key={team.id}
                style={[
                  styles.teamRow,
                  selectedTeamId === team.id && styles.teamRowSelected,
                ]}
                onPress={() => setSelectedTeamId(team.id)}
              >
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>{team.team_name}</Text>
                  <Text style={styles.teamOwner}>{team.owner_name}</Text>
                </View>
                {selectedTeamId === team.id && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
            {otherTeams.length === 0 && (
              <Text style={styles.emptyText}>No teams available. Sync league data first.</Text>
            )}
          </View>
        )}

        {/* Step 2: Asset Selection */}
        {step === 'assets' && (
          <View>
            <Text style={styles.sectionTitle}>Select Assets</Text>
            <Text style={styles.emptyText}>
              Asset selection will be available once contract and pick data is synced.
            </Text>
          </View>
        )}

        {/* Step 3: Review */}
        {step === 'review' && (
          <View>
            <Text style={styles.sectionTitle}>Review Trade</Text>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              placeholder="Add any notes about this trade..."
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Expiration</Text>
            <View style={styles.expirationRow}>
              {[1, 24, 48, 168].map((hrs) => (
                <TouchableOpacity
                  key={hrs}
                  style={[
                    styles.expirationButton,
                    expirationHours === hrs && styles.expirationButtonActive,
                  ]}
                  onPress={() => setExpirationHours(hrs)}
                >
                  <Text
                    style={[
                      styles.expirationText,
                      expirationHours === hrs && styles.expirationTextActive,
                    ]}
                  >
                    {hrs === 1 ? '1hr' : hrs === 24 ? '24hr' : hrs === 48 ? '2 days' : '1 week'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomBar}>
        {step !== 'teams' && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep(step === 'review' ? 'assets' : 'teams')}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextButton, !selectedTeamId && step === 'teams' && styles.nextButtonDisabled]}
          onPress={() => {
            if (step === 'teams' && selectedTeamId) setStep('assets');
            else if (step === 'assets') setStep('review');
            else if (step === 'review') {
              // TODO: Submit trade
              router.back();
            }
          }}
          disabled={step === 'teams' && !selectedTeamId}
        >
          <Text style={styles.nextButtonText}>
            {step === 'review' ? 'Propose Trade' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
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
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xl,
  },
  stepItem: { alignItems: 'center' },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  stepCircleActive: { backgroundColor: colors.primary },
  stepCircleDone: { backgroundColor: colors.success },
  stepNumber: { color: colors.textMuted, fontWeight: '600', fontSize: fontSize.sm },
  stepNumberActive: { color: colors.white },
  stepLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  stepLabelActive: { color: colors.primary, fontWeight: '600' },
  scrollView: { flex: 1, paddingHorizontal: spacing.md },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  teamRowSelected: { borderWidth: 2, borderColor: colors.primary },
  teamInfo: { flex: 1 },
  teamName: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  teamOwner: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  emptyText: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xl },
  label: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600', marginBottom: spacing.xs },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.base,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  expirationRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  expirationButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  expirationButtonActive: { backgroundColor: colors.primary },
  expirationText: { color: colors.textSecondary, fontWeight: '600', fontSize: fontSize.sm },
  expirationTextActive: { color: colors.white },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  backButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  backButtonText: { color: colors.primary, fontWeight: '600' },
  nextButton: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText: { color: colors.white, fontWeight: '600', fontSize: fontSize.md },
});
