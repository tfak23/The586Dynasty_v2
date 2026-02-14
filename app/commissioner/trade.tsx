import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../../src/lib/theme';

export default function ForceTradeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Force Trade</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.comingSoon}>
        <View style={styles.iconContainer}>
          <Ionicons name="swap-horizontal-outline" size={64} color={colors.warning} />
        </View>
        <Text style={styles.comingSoonTitle}>Coming Soon</Text>
        <Text style={styles.comingSoonSubtitle}>
          The Force Trade tool will allow commissioners to manually execute trades between teams,
          bypassing the normal trade approval process.
        </Text>
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.textMuted} />
            <Text style={styles.featureText}>Select two teams</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.textMuted} />
            <Text style={styles.featureText}>Move contracts between teams</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.textMuted} />
            <Text style={styles.featureText}>Include draft picks</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.textMuted} />
            <Text style={styles.featureText}>Auto-adjust cap space</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
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
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.warning + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  comingSoonTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  comingSoonSubtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  featureList: { gap: spacing.md, width: '100%', paddingHorizontal: spacing.md },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureText: { fontSize: fontSize.base, color: colors.textMuted },
});
