import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, getPositionColor } from '../../src/lib/theme';

export default function FreeAgentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [showSignModal, setShowSignModal] = useState(false);
  const [salary, setSalary] = useState('');
  const [years, setYears] = useState(1);

  // TODO: Replace with real query
  const player = null as any;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Free Agent</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Player Not Found</Text>
          <Text style={styles.emptySubtitle}>Free agent data will load here once synced</Text>
        </View>
      </ScrollView>

      {/* Sign Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.signButton}
          onPress={() => setShowSignModal(true)}
        >
          <Ionicons name="add-circle" size={20} color={colors.white} />
          <Text style={styles.signButtonText}>Sign Player</Text>
        </TouchableOpacity>
      </View>

      {/* Sign Modal */}
      <Modal
        visible={showSignModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSignModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sign Free Agent</Text>
              <TouchableOpacity onPress={() => setShowSignModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Salary</Text>
            <View style={styles.salaryInput}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.input}
                value={salary}
                onChangeText={setSalary}
                keyboardType="numeric"
                placeholder="Enter salary"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <Text style={styles.label}>Years</Text>
            <View style={styles.yearsRow}>
              {[1, 2, 3, 4, 5].map((y) => (
                <TouchableOpacity
                  key={y}
                  style={[styles.yearButton, years === y && styles.yearButtonActive]}
                  onPress={() => setYears(y)}
                >
                  <Text
                    style={[styles.yearButtonText, years === y && styles.yearButtonTextActive]}
                  >
                    {y}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.confirmButton}>
              <Text style={styles.confirmButtonText}>Confirm Signing</Text>
            </TouchableOpacity>
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
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  emptySubtitle: { fontSize: fontSize.base, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  signButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  signButtonText: { color: colors.white, fontSize: fontSize.md, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  label: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600', marginBottom: spacing.xs },
  salaryInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  dollarSign: { color: colors.textMuted, fontSize: fontSize.lg, fontWeight: '600' },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.lg,
    paddingVertical: spacing.md,
    marginLeft: spacing.xs,
  },
  yearsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  yearButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
  },
  yearButtonActive: { backgroundColor: colors.primary },
  yearButtonText: { color: colors.textSecondary, fontWeight: '600' },
  yearButtonTextActive: { color: colors.white },
  confirmButton: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  confirmButtonText: { color: colors.white, fontSize: fontSize.md, fontWeight: '600' },
});
