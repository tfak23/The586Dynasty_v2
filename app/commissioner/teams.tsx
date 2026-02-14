import React, { useState } from 'react';
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
import type { Team } from '../../src/types';

export default function ManageTeamsScreen() {
  const router = useRouter();
  const teams = useAppStore((s) => s.teams);
  const setTeams = useAppStore((s) => s.setTeams);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editOwner, setEditOwner] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = (team: Team) => {
    setEditingId(team.id);
    setEditName(team.team_name);
    setEditOwner(team.owner_name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditOwner('');
  };

  const saveEdit = async (team: Team) => {
    if (!editName.trim() || !editOwner.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('teams')
        .update({
          team_name: editName.trim(),
          owner_name: editOwner.trim(),
        })
        .eq('id', team.id);

      if (error) throw error;

      // Update local store
      const updated = teams.map((t) =>
        t.id === team.id
          ? { ...t, team_name: editName.trim(), owner_name: editOwner.trim() }
          : t
      );
      setTeams(updated);
      setEditingId(null);
    } catch (err) {
      console.error('Error saving team:', err);
      const msg = 'Failed to save team. Please try again.';
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
          <Text style={styles.title}>Manage Teams</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.subtitle}>
          Edit team names and owner information. Changes are saved directly.
        </Text>

        {teams.map((team) => {
          const isEditing = editingId === team.id;

          return (
            <View key={team.id} style={styles.teamCard}>
              {isEditing ? (
                <View style={styles.editForm}>
                  <Text style={styles.fieldLabel}>Team Name</Text>
                  <TextInput
                    style={styles.input}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Team Name"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={styles.fieldLabel}>Owner Name</Text>
                  <TextInput
                    style={styles.input}
                    value={editOwner}
                    onChangeText={setEditOwner}
                    placeholder="Owner Name"
                    placeholderTextColor={colors.textMuted}
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={() => saveEdit(team)}
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
                <View style={styles.teamRow}>
                  <View style={styles.teamInfo}>
                    <Text style={styles.teamName}>{team.team_name}</Text>
                    <Text style={styles.ownerName}>{team.owner_name}</Text>
                  </View>
                  <TouchableOpacity style={styles.editButton} onPress={() => startEdit(team)}>
                    <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {teams.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No teams found</Text>
          </View>
        )}

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
  teamCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamInfo: { flex: 1 },
  teamName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  ownerName: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editForm: { gap: spacing.sm },
  fieldLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: fontSize.base,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
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
  emptyText: { color: colors.textMuted, fontSize: fontSize.base, marginTop: spacing.sm },
});
