import React, { useState, useEffect } from 'react';
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

interface RuleSection {
  id: string;
  title: string;
  content: string;
  order_index: number;
}

export default function EditRulesScreen() {
  const router = useRouter();
  const currentLeague = useAppStore((s) => s.currentLeague);

  const [sections, setSections] = useState<RuleSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (currentLeague) loadRules();
  }, [currentLeague]);

  const loadRules = async () => {
    if (!currentLeague) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('league_rules')
        .select('*')
        .eq('league_id', currentLeague.id)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setSections((data as RuleSection[]) || []);
    } catch (err) {
      console.error('Error loading rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (section: RuleSection) => {
    setEditingId(section.id);
    setEditContent(section.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const saveEdit = async () => {
    if (!editingId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('league_rules')
        .update({ content: editContent })
        .eq('id', editingId);

      if (error) throw error;

      setSections((prev) =>
        prev.map((s) => (s.id === editingId ? { ...s, content: editContent } : s))
      );
      setEditingId(null);
      setEditContent('');
    } catch (err) {
      console.error('Error saving rule:', err);
      const msg = 'Failed to save changes. Please try again.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setSaving(false);
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
          <Text style={styles.title}>Edit Rules</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.subtitle}>
          Tap the edit icon on any section to modify its content.
        </Text>

        {loading && (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
        )}

        {!loading && sections.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No rules found. Rules can be added from the database.</Text>
          </View>
        )}

        {!loading && sections.map((section) => {
          const isEditing = editingId === section.id;

          return (
            <View key={section.id} style={styles.ruleCard}>
              <View style={styles.ruleHeader}>
                <Text style={styles.ruleTitle}>{section.title}</Text>
                {!isEditing && (
                  <TouchableOpacity
                    style={styles.editIcon}
                    onPress={() => startEdit(section)}
                  >
                    <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>

              {isEditing ? (
                <View>
                  <TextInput
                    style={styles.ruleInput}
                    value={editContent}
                    onChangeText={setEditContent}
                    multiline
                    placeholder="Enter rule content..."
                    placeholderTextColor={colors.textMuted}
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={saveEdit}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <Text style={styles.saveText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text style={styles.ruleContent}>{section.content}</Text>
              )}
            </View>
          );
        })}

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
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  ruleCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ruleTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, flex: 1 },
  editIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ruleContent: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  ruleInput: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: fontSize.sm,
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: { color: colors.textSecondary, fontWeight: '600', fontSize: fontSize.sm },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.base,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
