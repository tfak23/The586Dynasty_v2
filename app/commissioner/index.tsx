import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../../src/lib/theme';
import { useAppStore, selectIsCommissioner } from '../../src/lib/store';

interface ToolCard {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
}

const TOOLS: ToolCard[] = [
  { title: 'Manage Rosters', icon: 'people-outline', color: '#3b82f6', route: '/commissioner/roster' },
  { title: 'Cap Adjustments', icon: 'calculator-outline', color: '#22c55e', route: '/commissioner/cap' },
  { title: 'Force Trade', icon: 'swap-horizontal-outline', color: '#f59e0b', route: '/commissioner/trade' },
  { title: 'Manage Teams', icon: 'business-outline', color: '#6366f1', route: '/commissioner/teams' },
  { title: 'Trade History', icon: 'time-outline', color: '#8B5CF6', route: '/commissioner/history' },
  { title: 'Manage Buy-Ins', icon: 'cash-outline', color: '#22c55e', route: '/commissioner/buyins' },
  { title: 'Edit Rules', icon: 'document-text-outline', color: '#ef4444', route: '/commissioner/rules' },
  { title: 'Advance Season', icon: 'calendar-outline', color: '#06B6D4', route: '/commissioner/season' },
];

export default function CommissionerDashboard() {
  const router = useRouter();
  const isCommissioner = useAppStore(selectIsCommissioner);

  if (!isCommissioner) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Commissioner Tools</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed-outline" size={64} color={colors.error} />
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedSubtitle}>
            You do not have commissioner permissions to access these tools.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Commissioner Tools</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.grid}>
          {TOOLS.map((tool) => (
            <TouchableOpacity
              key={tool.route}
              style={styles.toolCard}
              onPress={() => router.push(tool.route as never)}
            >
              <View style={[styles.iconContainer, { backgroundColor: tool.color + '20' }]}>
                <Ionicons name={tool.icon} size={28} color={tool.color} />
              </View>
              <Text style={styles.toolTitle}>{tool.title}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  toolCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  accessDeniedTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.error,
    marginTop: spacing.md,
  },
  accessDeniedSubtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
