import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, getCapStatusColor, getPositionColor } from '../../src/lib/theme';
import { useAppStore, selectCurrentTeamCap } from '../../src/lib/store';

const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE'];

export default function MyTeamScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showDeadCapModal, setShowDeadCapModal] = useState(false);

  const currentTeam = useAppStore((s) => s.currentTeam);
  const roster = useAppStore((s) => s.roster);
  const capSummary = useAppStore(selectCurrentTeamCap);
  const settings = useAppStore((s) => s.settings);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: Refetch team data
    setRefreshing(false);
  }, []);

  if (!currentTeam) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Team Selected</Text>
          <Text style={styles.emptySubtitle}>Go to Settings to connect your team</Text>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/settings' as never)}
          >
            <Text style={styles.linkButtonText}>Go to Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const salaryCap = capSummary?.salary_cap ?? 500;
  const capUsed = capSummary?.total_salary ?? 0;
  const capRoom = capSummary?.cap_room ?? salaryCap;
  const deadCap = capSummary?.dead_cap ?? 0;
  const contractCount = capSummary?.contract_count ?? 0;
  const capPct = capUsed / salaryCap;
  const capColor = getCapStatusColor(capRoom, salaryCap);

  // Group roster by position
  const rosterByPosition = POSITION_ORDER.map((pos) => ({
    position: pos,
    players: roster
      .filter((c) => c.player?.position === pos)
      .sort((a, b) => b.salary - a.salary),
  }));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.teamName}>{currentTeam.team_name}</Text>
          <Text style={styles.ownerName}>{currentTeam.owner_name}</Text>
        </View>

        {/* Cap Summary Card */}
        <View style={styles.capCard}>
          <View style={styles.capHeader}>
            <Text style={styles.capTitle}>Salary Cap</Text>
            <Text style={[styles.capAvailable, { color: capColor }]}>
              ${capRoom} available
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarOuter}>
            <View
              style={[
                styles.progressBarInner,
                { width: `${Math.min(capPct * 100, 100)}%`, backgroundColor: capColor },
              ]}
            />
          </View>

          {/* Cap Details */}
          <View style={styles.capDetails}>
            <View style={styles.capDetailItem}>
              <Text style={styles.capDetailLabel}>Total Cap</Text>
              <Text style={styles.capDetailValue}>${salaryCap}</Text>
            </View>
            <View style={styles.capDetailItem}>
              <Text style={styles.capDetailLabel}>Used</Text>
              <Text style={styles.capDetailValue}>${capUsed}</Text>
            </View>
            <TouchableOpacity
              style={styles.capDetailItem}
              onPress={() => setShowDeadCapModal(true)}
            >
              <Text style={styles.capDetailLabel}>Adjustments</Text>
              <Text style={[styles.capDetailValue, { color: colors.primary }]}>
                ${deadCap}
              </Text>
            </TouchableOpacity>
            <View style={styles.capDetailItem}>
              <Text style={styles.capDetailLabel}>Contracts</Text>
              <Text style={styles.capDetailValue}>{contractCount}</Text>
            </View>
          </View>

          {/* Projections link */}
          <TouchableOpacity
            style={styles.projectionsLink}
            onPress={() => router.push('/projections' as never)}
          >
            <Ionicons name="trending-up" size={16} color={colors.primary} />
            <Text style={styles.projectionsLinkText}>View Cap Projections</Text>
          </TouchableOpacity>
        </View>

        {/* Roster by Position */}
        {rosterByPosition.map(({ position, players }) => (
          <View key={position} style={styles.positionSection}>
            <View style={styles.positionHeader}>
              <View style={[styles.positionBadge, { backgroundColor: getPositionColor(position) }]}>
                <Text style={styles.positionBadgeText}>{position}</Text>
              </View>
              <Text style={styles.positionCount}>{players.length}</Text>
            </View>

            {players.map((contract) => (
              <TouchableOpacity
                key={contract.id}
                style={styles.playerRow}
                onPress={() => router.push(`/contract/${contract.id}` as never)}
              >
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>
                    {contract.player?.full_name ?? 'Unknown'}
                  </Text>
                  <Text style={styles.playerMeta}>
                    {contract.player?.team ?? '??'} • {contract.years_remaining}yr
                    {contract.years_remaining !== 1 ? 's' : ''} left
                    {contract.contract_type === 'tag' ? ' • TAG' : ''}
                  </Text>
                </View>
                <Text style={styles.playerSalary}>${contract.salary}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}

            {players.length === 0 && (
              <Text style={styles.emptyPosition}>No {position}s on roster</Text>
            )}
          </View>
        ))}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Dead Cap Modal */}
      <Modal
        visible={showDeadCapModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeadCapModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Salary Cap Adjustments</Text>
              <TouchableOpacity onPress={() => setShowDeadCapModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Total Dead Cap: <Text style={{ color: colors.error }}>${deadCap}</Text>
            </Text>
            <Text style={styles.emptyPosition}>
              No adjustments to display yet.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  header: {
    paddingVertical: spacing.lg,
  },
  teamName: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  ownerName: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  capCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  capHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  capTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  capAvailable: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  progressBarOuter: {
    height: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  progressBarInner: {
    height: 8,
    borderRadius: borderRadius.full,
  },
  capDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  capDetailItem: {
    alignItems: 'center',
  },
  capDetailLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  capDetailValue: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  projectionsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  projectionsLinkText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  positionSection: {
    marginBottom: spacing.lg,
  },
  positionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  positionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  positionBadgeText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  positionCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  playerMeta: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  playerSalary: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.primary,
    marginRight: spacing.sm,
  },
  emptyPosition: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingLeft: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  linkButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  linkButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: fontSize.base,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
});
