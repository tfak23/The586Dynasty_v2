import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Alert } from '../../src/lib/webAlert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../../src/lib/theme';
import { useAppStore } from '../../src/lib/store';
import { useLeagueData } from '../../src/hooks/useLeagueData';
import {
  fetchTrade,
  respondToTrade,
  cancelTrade,
  describeAsset,
  TRADE_STATUS_COLORS,
  type TradeDetail,
} from '../../src/lib/trades';

export default function TradeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { refresh } = useLeagueData();
  const [trade, setTrade] = useState<TradeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const currentTeam = useAppStore((s) => s.currentTeam);

  const load = useCallback(() => {
    if (!id) return;
    fetchTrade(id).then((t) => {
      setTrade(t);
      setLoading(false);
    });
  }, [id]);

  useEffect(load, [load]);

  const myParticipant = trade?.trade_teams.find((tt) => tt.team_id === currentTeam?.id);
  const isProposer = trade?.proposer_team_id === currentTeam?.id;
  const isPending = trade?.status === 'pending';
  const canRespond = isPending && myParticipant && myParticipant.status === 'pending';
  const isExpired = trade?.expires_at ? new Date(trade.expires_at) < new Date() : false;

  const act = async (fn: () => Promise<unknown>, successMsg?: string) => {
    setActing(true);
    try {
      await fn();
      if (successMsg) Alert.alert(successMsg);
      await refresh();
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong');
    } finally {
      setActing(false);
    }
  };

  const onAccept = () =>
    act(async () => {
      const result = await respondToTrade(id!, 'accept');
      if (result === 'completed') {
        Alert.alert('Trade Completed', 'All teams accepted — assets have been transferred.');
      }
    });

  const onReject = () =>
    Alert.alert('Reject Trade', 'Are you sure you want to reject this offer?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => act(() => respondToTrade(id!, 'reject')) },
    ]);

  const onCancel = () =>
    Alert.alert('Cancel Trade', 'Withdraw this trade offer?', [
      { text: 'Keep It', style: 'cancel' },
      { text: 'Withdraw', style: 'destructive', onPress: () => act(() => cancelTrade(id!)) },
    ]);

  const onCounter = () => router.push(`/trade/new?counter=${id}` as never);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!trade) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trade Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="swap-horizontal-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Trade Not Found</Text>
          <Text style={styles.emptySubtitle}>This trade may have been cancelled or expired</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = TRADE_STATUS_COLORS[trade.status] ?? colors.textMuted;
  const displayStatus = isPending && isExpired ? 'expired' : trade.status;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trade Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Status */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {displayStatus.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.statusMeta}>
            Proposed {new Date(trade.created_at).toLocaleDateString()}
            {isPending && trade.expires_at
              ? ` • expires ${new Date(trade.expires_at).toLocaleString()}`
              : ''}
          </Text>
        </View>

        {/* Per-team breakdown */}
        {trade.trade_teams.map((tt) => {
          const receives = trade.trade_assets.filter((a) => a.to_team_id === tt.team_id);
          const teamStatusColor =
            tt.status === 'accepted' ? colors.success :
            tt.status === 'rejected' ? colors.error : colors.warning;
          return (
            <View key={tt.id} style={styles.teamCard}>
              <View style={styles.teamCardHeader}>
                <View>
                  <Text style={styles.teamCardName}>
                    {tt.team?.team_name ?? 'Team'}
                    {tt.team_id === trade.proposer_team_id ? '  (proposer)' : ''}
                  </Text>
                  <Text style={styles.teamCardOwner}>{tt.team?.owner_name}</Text>
                </View>
                <View style={[styles.teamStatusBadge, { backgroundColor: teamStatusColor + '22' }]}>
                  <Text style={[styles.teamStatusText, { color: teamStatusColor }]}>
                    {tt.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.receivesLabel}>receives</Text>
              {receives.length > 0 ? (
                receives.map((a) => (
                  <Text key={a.id} style={styles.assetLine}>• {describeAsset(a)}</Text>
                ))
              ) : (
                <Text style={styles.assetLineEmpty}>Nothing</Text>
              )}
            </View>
          );
        })}

        {trade.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{trade.notes}</Text>
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Actions */}
      {isPending && !isExpired && (canRespond || isProposer) && (
        <View style={styles.bottomBar}>
          {canRespond && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={onReject}
                disabled={acting}
              >
                <Ionicons name="close" size={18} color={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.counterButton]}
                onPress={onCounter}
                disabled={acting}
              >
                <Ionicons name="repeat" size={18} color={colors.warning} />
                <Text style={[styles.actionText, { color: colors.warning }]}>Counter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={onAccept}
                disabled={acting}
              >
                {acting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color={colors.white} />
                    <Text style={[styles.actionText, { color: colors.white }]}>Accept</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
          {!canRespond && isProposer && (
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={onCancel}
              disabled={acting}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>Withdraw Offer</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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

  statusCard: { alignItems: 'center', paddingVertical: spacing.md, gap: spacing.xs },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: { fontSize: fontSize.sm, fontWeight: '800', letterSpacing: 1 },
  statusMeta: { fontSize: fontSize.xs, color: colors.textMuted },

  teamCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  teamCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  teamCardName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  teamCardOwner: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 1 },
  teamStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  teamStatusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  receivesLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 4 },
  assetLine: { fontSize: fontSize.sm, color: colors.text, marginBottom: 2 },
  assetLineEmpty: { fontSize: fontSize.sm, color: colors.textMuted, fontStyle: 'italic' },

  notesCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  notesLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textMuted, marginBottom: 4 },
  notesText: { fontSize: fontSize.sm, color: colors.textSecondary },

  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  rejectButton: { borderWidth: 1, borderColor: colors.error },
  counterButton: { borderWidth: 1, borderColor: colors.warning },
  acceptButton: { backgroundColor: colors.success },
  actionText: { fontWeight: '700', fontSize: fontSize.sm },
});
