import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, getCapStatusColor } from '../../src/lib/theme';
import { useAppStore, selectCurrentTeamCap } from '../../src/lib/store';

export default function ProjectionsScreen() {
  const currentTeam = useAppStore((s) => s.currentTeam);
  const currentLeague = useAppStore((s) => s.currentLeague);
  const capSummary = useAppStore(selectCurrentTeamCap);

  if (!currentTeam) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="trending-up-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Team Selected</Text>
          <Text style={styles.emptySubtitle}>Connect your team to view cap projections</Text>
        </View>
      </SafeAreaView>
    );
  }

  const salaryCap = currentLeague?.salary_cap ?? 500;

  // Placeholder projection data (will be replaced with real queries)
  const years = [2026, 2027, 2028, 2029, 2030];
  const projections = years.map((year, i) => {
    const committed = Math.max(0, (capSummary?.total_salary ?? 0) - i * 50);
    const room = salaryCap - committed;
    return { year, committed, room, capColor: getCapStatusColor(room, salaryCap) };
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Cap Projections</Text>
          <Text style={styles.subtitle}>{currentTeam.team_name}</Text>
          <Text style={styles.capLabel}>Salary Cap: ${salaryCap}</Text>
        </View>

        {/* Bar Chart */}
        <View style={styles.chartContainer}>
          <View style={styles.chartBars}>
            {projections.map((p) => {
              const pct = Math.min(p.committed / salaryCap, 1);
              return (
                <View key={p.year} style={styles.barColumn}>
                  <Text style={[styles.barValue, { color: p.capColor }]}>${p.room}</Text>
                  <View style={styles.barOuter}>
                    <View
                      style={[
                        styles.barInner,
                        { height: `${pct * 100}%`, backgroundColor: p.capColor },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{p.year}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.capHealthy }]} />
              <Text style={styles.legendText}>Healthy</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.capWarning }]} />
              <Text style={styles.legendText}>Tight</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.capCritical }]} />
              <Text style={styles.legendText}>Critical</Text>
            </View>
          </View>
        </View>

        {/* Year-by-year cards */}
        {projections.map((p) => (
          <View key={p.year} style={styles.yearCard}>
            <View style={styles.yearCardHeader}>
              <Text style={styles.yearCardYear}>{p.year}</Text>
              <Text style={[styles.yearCardRoom, { color: p.capColor }]}>${p.room} room</Text>
            </View>
            <View style={styles.yearCardRow}>
              <Text style={styles.yearCardLabel}>Committed</Text>
              <Text style={styles.yearCardValue}>${p.committed}</Text>
            </View>
            <View style={styles.progressBarOuter}>
              <View
                style={[
                  styles.progressBarInner,
                  { width: `${Math.min((p.committed / salaryCap) * 100, 100)}%`, backgroundColor: p.capColor },
                ]}
              />
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
  header: { paddingVertical: spacing.lg },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.xs },
  capLabel: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  chartContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
    marginBottom: spacing.md,
  },
  barColumn: { alignItems: 'center', flex: 1 },
  barValue: { fontSize: fontSize.xs, fontWeight: '600', marginBottom: spacing.xs },
  barOuter: {
    width: 24,
    height: 100,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barInner: { width: 24, borderRadius: borderRadius.sm },
  barLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: fontSize.xs, color: colors.textSecondary },
  yearCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  yearCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  yearCardYear: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  yearCardRoom: { fontSize: fontSize.md, fontWeight: '700' },
  yearCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  yearCardLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  yearCardValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  progressBarOuter: {
    height: 6,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  progressBarInner: { height: 6, borderRadius: borderRadius.full },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  emptySubtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
