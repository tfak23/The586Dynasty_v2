import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, getPositionColor } from '../../src/lib/theme';
import { useAppStore } from '../../src/lib/store';
import {
  proposeTrade,
  respondToTrade,
  fetchTrade,
  type TradeAssetInput,
} from '../../src/lib/trades';
import type { Contract, DraftPick } from '../../src/types';

type Step = 'teams' | 'assets' | 'review';

function pickLabel(pick: DraftPick): string {
  const rd = pick.round;
  const suffix = rd === 1 ? 'st' : rd === 2 ? 'nd' : rd === 3 ? 'rd' : 'th';
  const owner = pick.original_team?.team_name;
  const isOwn = pick.original_team_id === pick.current_team_id;
  return `${pick.season} ${rd}${suffix}${isOwn || !owner ? '' : ` (${owner})`}`;
}

export default function NewTradeScreen() {
  const router = useRouter();
  const { counter } = useLocalSearchParams<{ counter?: string }>();
  const [step, setStep] = useState<Step>('teams');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  // key: `c:<contractId>` or `p:<pickId>` → asset
  const [selections, setSelections] = useState<Record<string, TradeAssetInput>>({});
  // per-team cap space: amount + destination
  const [capInputs, setCapInputs] = useState<Record<string, { amount: string; to: string }>>({});
  const [notes, setNotes] = useState('');
  const [expirationHours, setExpirationHours] = useState(72);
  const [submitting, setSubmitting] = useState(false);

  const teams = useAppStore((s) => s.teams);
  const currentTeam = useAppStore((s) => s.currentTeam);
  const currentLeague = useAppStore((s) => s.currentLeague);
  const allContracts = useAppStore((s) => s.allContracts);
  const allDraftPicks = useAppStore((s) => s.allDraftPicks);

  const otherTeams = teams.filter((t) => t.id !== currentTeam?.id);
  const participantIds = useMemo(
    () => (currentTeam ? [currentTeam.id, ...selectedTeamIds] : selectedTeamIds),
    [currentTeam, selectedTeamIds]
  );
  const participants = useMemo(
    () => participantIds.map((id) => teams.find((t) => t.id === id)).filter(Boolean) as typeof teams,
    [participantIds, teams]
  );

  // Prefill when countering an existing trade
  useEffect(() => {
    if (!counter || !currentTeam) return;
    fetchTrade(counter).then((trade) => {
      if (!trade) return;
      setSelectedTeamIds(
        trade.trade_teams.map((tt) => tt.team_id).filter((id) => id !== currentTeam.id)
      );
      const sel: Record<string, TradeAssetInput> = {};
      const caps: Record<string, { amount: string; to: string }> = {};
      trade.trade_assets.forEach((a) => {
        if (a.asset_type === 'contract' && a.contract) {
          sel[`c:${a.contract.id}`] = {
            asset_type: 'contract',
            from_team_id: a.from_team_id,
            to_team_id: a.to_team_id,
            contract_id: a.contract.id,
          };
        } else if (a.asset_type === 'draft_pick' && a.draft_pick) {
          sel[`p:${a.draft_pick.id}`] = {
            asset_type: 'draft_pick',
            from_team_id: a.from_team_id,
            to_team_id: a.to_team_id,
            draft_pick_id: a.draft_pick.id,
          };
        } else if (a.asset_type === 'cap_space' && a.cap_amount) {
          caps[a.from_team_id] = { amount: String(a.cap_amount), to: a.to_team_id };
        }
      });
      setSelections(sel);
      setCapInputs(caps);
      setNotes('Counter offer');
      setStep('assets');
    });
  }, [counter, currentTeam?.id]);

  const defaultDestination = (fromTeamId: string): string =>
    participantIds.find((id) => id !== fromTeamId) ?? fromTeamId;

  const toggleAsset = (key: string, asset: TradeAssetInput) => {
    setSelections((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = asset;
      return next;
    });
  };

  const setDestination = (key: string, toTeamId: string) => {
    setSelections((prev) => ({
      ...prev,
      [key]: { ...prev[key], to_team_id: toTeamId },
    }));
  };

  // Build the final asset list (selections + cap space entries)
  const finalAssets: TradeAssetInput[] = useMemo(() => {
    const assets = Object.values(selections);
    Object.entries(capInputs).forEach(([teamId, cap]) => {
      const amount = parseInt(cap.amount, 10);
      if (amount > 0 && cap.to && cap.to !== teamId) {
        assets.push({
          asset_type: 'cap_space',
          from_team_id: teamId,
          to_team_id: cap.to,
          cap_amount: amount,
        });
      }
    });
    return assets;
  }, [selections, capInputs]);

  const receivesByTeam = useMemo(() => {
    const map: Record<string, string[]> = {};
    participantIds.forEach((id) => (map[id] = []));
    finalAssets.forEach((a) => {
      let label = '';
      if (a.asset_type === 'contract') {
        const c = allContracts.find((x) => x.id === a.contract_id);
        label = `${c?.player?.full_name ?? 'Unknown'} ($${c?.salary ?? '?'}/yr)`;
      } else if (a.asset_type === 'draft_pick') {
        const p = allDraftPicks.find((x) => x.id === a.draft_pick_id);
        label = p ? `${pickLabel(p)} Pick` : 'Draft pick';
      } else {
        label = `$${a.cap_amount} Cap Space`;
      }
      const from = teams.find((t) => t.id === a.from_team_id);
      map[a.to_team_id]?.push(`${label} — from ${from?.team_name ?? '?'}`);
    });
    return map;
  }, [finalAssets, participantIds, allContracts, allDraftPicks, teams]);

  const submit = async () => {
    if (!currentLeague || !currentTeam) return;
    setSubmitting(true);
    try {
      await proposeTrade({
        leagueId: currentLeague.id,
        teamIds: participantIds,
        assets: finalAssets,
        notes: notes || undefined,
        expiresHours: expirationHours,
      });
      // Countering implies rejecting the original offer
      if (counter) {
        try {
          await respondToTrade(counter, 'reject');
        } catch {
          // original may already be resolved — not fatal
        }
      }
      Alert.alert('Trade Proposed', 'Your offer has been sent to the other team(s).');
      router.back();
    } catch (e: any) {
      Alert.alert('Could not propose trade', e?.message ?? 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  const steps: { key: Step; label: string }[] = [
    { key: 'teams', label: '1. Teams' },
    { key: 'assets', label: '2. Assets' },
    { key: 'review', label: '3. Review' },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  const canContinue =
    step === 'teams' ? selectedTeamIds.length > 0 :
    step === 'assets' ? finalAssets.length > 0 :
    !submitting;

  // ── Asset section for one participating team ──────────────────────────────
  const renderTeamAssets = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    const contracts = allContracts
      .filter((c) => c.team_id === teamId)
      .sort((a, b) => b.salary - a.salary);
    const picks = allDraftPicks
      .filter((p) => p.current_team_id === teamId && !p.is_used)
      .sort((a, b) => a.season - b.season || a.round - b.round);
    const cap = capInputs[teamId] ?? { amount: '', to: defaultDestination(teamId) };
    const destinations = participants.filter((t) => t.id !== teamId);

    const destinationChips = (key: string, current: string) =>
      destinations.length > 1 ? (
        <View style={styles.destRow}>
          <Text style={styles.destLabel}>to:</Text>
          {destinations.map((d) => (
            <TouchableOpacity
              key={d.id}
              style={[styles.destChip, current === d.id && styles.destChipActive]}
              onPress={() => setDestination(key, d.id)}
            >
              <Text style={[styles.destChipText, current === d.id && styles.destChipTextActive]}>
                {d.team_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null;

    return (
      <View key={teamId} style={styles.teamSection}>
        <View style={styles.teamSectionHeader}>
          <Text style={styles.teamSectionTitle}>{team?.team_name ?? 'Team'}</Text>
          <Text style={styles.teamSectionOwner}>{team?.owner_name}</Text>
        </View>

        <Text style={styles.assetGroupLabel}>Players</Text>
        {contracts.map((c: Contract) => {
          const key = `c:${c.id}`;
          const selected = selections[key];
          return (
            <View key={key}>
              <TouchableOpacity
                style={[styles.assetRow, selected && styles.assetRowSelected]}
                onPress={() =>
                  toggleAsset(key, {
                    asset_type: 'contract',
                    from_team_id: teamId,
                    to_team_id: defaultDestination(teamId),
                    contract_id: c.id,
                  })
                }
              >
                <View style={[styles.posDot, { backgroundColor: getPositionColor(c.player?.position ?? 'QB') }]}>
                  <Text style={styles.posDotText}>{c.player?.position ?? '?'}</Text>
                </View>
                <View style={styles.assetInfo}>
                  <Text style={styles.assetName}>{c.player?.full_name ?? 'Unknown'}</Text>
                  <Text style={styles.assetMeta}>
                    ${c.salary}/yr • {c.years_remaining}yr{c.years_remaining !== 1 ? 's' : ''} left
                  </Text>
                </View>
                <Ionicons
                  name={selected ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={selected ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>
              {selected && destinationChips(key, selected.to_team_id)}
            </View>
          );
        })}
        {contracts.length === 0 && <Text style={styles.emptyText}>No contracts</Text>}

        <Text style={styles.assetGroupLabel}>Draft Picks</Text>
        {picks.map((p) => {
          const key = `p:${p.id}`;
          const selected = selections[key];
          return (
            <View key={key}>
              <TouchableOpacity
                style={[styles.assetRow, selected && styles.assetRowSelected]}
                onPress={() =>
                  toggleAsset(key, {
                    asset_type: 'draft_pick',
                    from_team_id: teamId,
                    to_team_id: defaultDestination(teamId),
                    draft_pick_id: p.id,
                  })
                }
              >
                <View style={[styles.posDot, { backgroundColor: colors.gold }]}>
                  <Ionicons name="ticket" size={14} color={colors.background} />
                </View>
                <View style={styles.assetInfo}>
                  <Text style={styles.assetName}>{pickLabel(p)} Round Pick</Text>
                  {p.salary != null && p.salary > 0 && (
                    <Text style={styles.assetMeta}>Contract value: ${p.salary}</Text>
                  )}
                </View>
                <Ionicons
                  name={selected ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={selected ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>
              {selected && destinationChips(key, selected.to_team_id)}
            </View>
          );
        })}
        {picks.length === 0 && <Text style={styles.emptyText}>No draft picks</Text>}

        <Text style={styles.assetGroupLabel}>Cap Space</Text>
        <View style={styles.capRow}>
          <Text style={styles.dollarSign}>$</Text>
          <TextInput
            style={styles.capInput}
            value={cap.amount}
            onChangeText={(v) =>
              setCapInputs((prev) => ({
                ...prev,
                [teamId]: { amount: v.replace(/[^0-9]/g, ''), to: cap.to },
              }))
            }
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
          />
          {destinations.length > 1 && parseInt(cap.amount, 10) > 0 && (
            <View style={styles.destRowInline}>
              {destinations.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.destChip, cap.to === d.id && styles.destChipActive]}
                  onPress={() =>
                    setCapInputs((prev) => ({ ...prev, [teamId]: { ...cap, to: d.id } }))
                  }
                >
                  <Text style={[styles.destChipText, cap.to === d.id && styles.destChipTextActive]}>
                    {d.team_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{counter ? 'Counter Offer' : 'Propose Trade'}</Text>
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
                stepIndex > i && styles.stepCircleDone,
              ]}
            >
              <Text style={[styles.stepNumber, (step === s.key || stepIndex > i) && styles.stepNumberActive]}>
                {i + 1}
              </Text>
            </View>
            <Text style={[styles.stepLabel, step === s.key && styles.stepLabelActive]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Step 1: Select Teams (multi-select for 3+ team trades) */}
        {step === 'teams' && (
          <View>
            <Text style={styles.sectionTitle}>Select Trading Partner(s)</Text>
            <Text style={styles.sectionSubtitle}>
              Pick one team for a standard trade, or several for a multi-team deal.
            </Text>
            {otherTeams.map((team) => {
              const selected = selectedTeamIds.includes(team.id);
              return (
                <TouchableOpacity
                  key={team.id}
                  style={[styles.teamRow, selected && styles.teamRowSelected]}
                  onPress={() =>
                    setSelectedTeamIds((prev) =>
                      selected ? prev.filter((id) => id !== team.id) : [...prev, team.id]
                    )
                  }
                >
                  <View style={styles.teamInfo}>
                    <Text style={styles.teamName}>{team.team_name}</Text>
                    <Text style={styles.teamOwner}>{team.owner_name}</Text>
                  </View>
                  <Ionicons
                    name={selected ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={selected ? colors.primary : colors.textMuted}
                  />
                </TouchableOpacity>
              );
            })}
            {otherTeams.length === 0 && (
              <Text style={styles.emptyText}>No teams available. Sync league data first.</Text>
            )}
          </View>
        )}

        {/* Step 2: Asset Selection per team */}
        {step === 'assets' && (
          <View>
            <Text style={styles.sectionTitle}>Select Assets</Text>
            <Text style={styles.sectionSubtitle}>
              Tap players, picks, or enter cap space from each team.
              {participants.length > 2 ? ' Choose where each asset goes.' : ''}
            </Text>
            {participantIds.map(renderTeamAssets)}
          </View>
        )}

        {/* Step 3: Review */}
        {step === 'review' && (
          <View>
            <Text style={styles.sectionTitle}>Review Trade</Text>
            {participants.map((team) => (
              <View key={team.id} style={styles.reviewCard}>
                <Text style={styles.reviewTeamName}>{team.team_name} receives</Text>
                {(receivesByTeam[team.id] ?? []).length > 0 ? (
                  receivesByTeam[team.id].map((item, i) => (
                    <Text key={i} style={styles.reviewItem}>• {item}</Text>
                  ))
                ) : (
                  <Text style={styles.reviewItemEmpty}>Nothing</Text>
                )}
              </View>
            ))}

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
              {[24, 48, 72, 168].map((hrs) => (
                <TouchableOpacity
                  key={hrs}
                  style={[styles.expirationButton, expirationHours === hrs && styles.expirationButtonActive]}
                  onPress={() => setExpirationHours(hrs)}
                >
                  <Text style={[styles.expirationText, expirationHours === hrs && styles.expirationTextActive]}>
                    {hrs === 24 ? '24hr' : hrs === 48 ? '2 days' : hrs === 72 ? '3 days' : '1 week'}
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
          style={[styles.nextButton, !canContinue && styles.nextButtonDisabled]}
          onPress={() => {
            if (step === 'teams' && selectedTeamIds.length > 0) setStep('assets');
            else if (step === 'assets' && finalAssets.length > 0) setStep('review');
            else if (step === 'review') submit();
          }}
          disabled={!canContinue}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.nextButtonText}>
              {step === 'review' ? (counter ? 'Send Counter' : 'Propose Trade') : 'Next'}
            </Text>
          )}
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
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  sectionSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md },
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
  emptyText: { color: colors.textMuted, fontSize: fontSize.sm, fontStyle: 'italic', paddingVertical: spacing.xs },

  // Asset selection
  teamSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  teamSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  teamSectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  teamSectionOwner: { fontSize: fontSize.sm, color: colors.textSecondary },
  assetGroupLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  assetRowSelected: { borderColor: colors.primary },
  assetInfo: { flex: 1 },
  assetName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  assetMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 1 },
  posDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  posDotText: { color: colors.white, fontSize: 9, fontWeight: '700' },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingLeft: spacing.xl,
  },
  destRowInline: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, flex: 1, justifyContent: 'flex-end' },
  destLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  destChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  destChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  destChipText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '600' },
  destChipTextActive: { color: colors.white },
  capRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  dollarSign: { color: colors.textMuted, fontSize: fontSize.md, fontWeight: '600' },
  capInput: { width: 70, color: colors.text, fontSize: fontSize.md, paddingVertical: spacing.sm },

  // Review
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  reviewTeamName: { fontSize: fontSize.base, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs },
  reviewItem: { fontSize: fontSize.sm, color: colors.text, marginBottom: 2 },
  reviewItemEmpty: { fontSize: fontSize.sm, color: colors.textMuted, fontStyle: 'italic' },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
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
