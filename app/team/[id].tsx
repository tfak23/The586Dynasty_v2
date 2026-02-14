import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, getCapStatusColor, getPositionColor } from '../../src/lib/theme';
import { useAppStore } from '../../src/lib/store';

const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE'];

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showDeadCapModal, setShowDeadCapModal] = useState(false);

  const teams = useAppStore((s) => s.teams);
  const capSummaries = useAppStore((s) => s.capSummaries);
  const team = teams.find((t) => t.id === id);
  const capSummary = capSummaries.find((s) => s.team_id === id);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: Refetch team data
    setRefreshing(false);
  }, []);

  if (!team) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Team Not Found</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  const salaryCap = capSummary?.salary_cap ?? 500;
  const capUsed = capSummary?.total_salary ?? 0;
  const capRoom = capSummary?.cap_room ?? salaryCap;
  const capPct = capUsed / salaryCap;
  const capColor = getCapStatusColor(capRoom, salaryCap);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{team.team_name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={styles.ownerName}>{team.owner_name}</Text>

        {/* Cap Summary */}
        <View style={styles.capCard}>
          <View style={styles.capHeader}>
            <Text style={styles.capTitle}>Salary Cap</Text>
            <Text style={[styles.capAvailable, { color: capColor }]}>${capRoom} available</Text>
          </View>
          <View style={styles.progressBarOuter}>
            <View
              style={[
                styles.progressBarInner,
                { width: `${Math.min(capPct * 100, 100)}%`, backgroundColor: capColor },
              ]}
            />
          </View>
          <View style={styles.capDetails}>
            <View style={styles.capDetailItem}>
              <Text style={styles.capDetailLabel}>Total</Text>
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
              <Text style={styles.capDetailLabel}>Dead Cap</Text>
              <Text style={[styles.capDetailValue, { color: colors.error }]}>
                ${capSummary?.dead_cap ?? 0}
              </Text>
            </TouchableOpacity>
            <View style={styles.capDetailItem}>
              <Text style={styles.capDetailLabel}>Contracts</Text>
              <Text style={styles.capDetailValue}>{capSummary?.contract_count ?? 0}</Text>
            </View>
          </View>
        </View>

        {/* Roster placeholder */}
        {POSITION_ORDER.map((pos) => (
          <View key={pos} style={styles.positionSection}>
            <View style={styles.positionHeader}>
              <View style={[styles.positionBadge, { backgroundColor: getPositionColor(pos) }]}>
                <Text style={styles.positionBadgeText}>{pos}</Text>
              </View>
            </View>
            <Text style={styles.emptyText}>No {pos}s loaded</Text>
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
              <Text style={styles.modalTitle}>Cap Adjustments</Text>
              <TouchableOpacity onPress={() => setShowDeadCapModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.emptyText}>No adjustments yet.</Text>
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
  ownerName: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.md },
  capCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  capHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  capTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  capAvailable: { fontSize: fontSize.md, fontWeight: '700' },
  progressBarOuter: {
    height: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  progressBarInner: { height: 8, borderRadius: borderRadius.full },
  capDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  capDetailItem: { alignItems: 'center' },
  capDetailLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 2 },
  capDetailValue: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  positionSection: { marginBottom: spacing.md },
  positionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  positionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  positionBadgeText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '700' },
  emptyText: { color: colors.textMuted, fontSize: fontSize.sm, fontStyle: 'italic', paddingLeft: spacing.sm },
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
});
