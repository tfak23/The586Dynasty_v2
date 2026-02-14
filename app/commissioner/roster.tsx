import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, getPositionColor } from '../../src/lib/theme';
import { useAppStore } from '../../src/lib/store';
import { supabase } from '../../src/lib/supabase';
import type { Team, Contract } from '../../src/types';

export default function ManageRostersScreen() {
  const router = useRouter();
  const teams = useAppStore((s) => s.teams);
  const currentLeague = useAppStore((s) => s.currentLeague);

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [releasing, setReleasing] = useState<string | null>(null);

  useEffect(() => {
    if (selectedTeam && currentLeague) {
      loadContracts(selectedTeam.id);
    }
  }, [selectedTeam, currentLeague]);

  const loadContracts = async (teamId: string) => {
    if (!currentLeague) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, player:players(*)')
        .eq('league_id', currentLeague.id)
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('salary', { ascending: false });

      if (error) throw error;
      setContracts((data as Contract[]) || []);
    } catch (err) {
      console.error('Error loading contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async (contract: Contract) => {
    const doRelease = async () => {
      setReleasing(contract.id);
      try {
        const { error } = await supabase
          .from('contracts')
          .update({ status: 'released' })
          .eq('id', contract.id);

        if (error) throw error;
        setContracts((prev) => prev.filter((c) => c.id !== contract.id));
      } catch (err) {
        console.error('Error releasing player:', err);
      } finally {
        setReleasing(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Release ${contract.player?.full_name ?? 'this player'}?`)) {
        await doRelease();
      }
    } else {
      Alert.alert(
        'Release Player',
        `Are you sure you want to release ${contract.player?.full_name ?? 'this player'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Release', style: 'destructive', onPress: doRelease },
        ]
      );
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
          <Text style={styles.title}>Manage Rosters</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Team Picker */}
        <Text style={styles.sectionTitle}>Select Team</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teamPicker}>
          {teams.map((team) => (
            <TouchableOpacity
              key={team.id}
              style={[
                styles.teamChip,
                selectedTeam?.id === team.id && styles.teamChipSelected,
              ]}
              onPress={() => setSelectedTeam(team)}
            >
              <Text
                style={[
                  styles.teamChipText,
                  selectedTeam?.id === team.id && styles.teamChipTextSelected,
                ]}
              >
                {team.team_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Roster */}
        {!selectedTeam && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Select a team to view its roster</Text>
          </View>
        )}

        {selectedTeam && loading && (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
        )}

        {selectedTeam && !loading && contracts.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No active contracts found</Text>
          </View>
        )}

        {selectedTeam && !loading && contracts.map((contract) => (
          <View key={contract.id} style={styles.rosterCard}>
            <View style={styles.playerInfo}>
              <View style={styles.playerRow}>
                <View
                  style={[
                    styles.positionBadge,
                    { backgroundColor: getPositionColor(contract.player?.position ?? '') + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.positionText,
                      { color: getPositionColor(contract.player?.position ?? '') },
                    ]}
                  >
                    {contract.player?.position ?? '??'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.playerName}>{contract.player?.full_name ?? 'Unknown'}</Text>
                  <Text style={styles.playerDetail}>
                    ${contract.salary} • {contract.years_remaining}yr remaining
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.releaseButton}
              onPress={() => handleRelease(contract)}
              disabled={releasing === contract.id}
            >
              {releasing === contract.id ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Text style={styles.releaseText}>Release</Text>
              )}
            </TouchableOpacity>
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
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  teamPicker: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  teamChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  teamChipSelected: {
    backgroundColor: colors.primary,
  },
  teamChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  teamChipTextSelected: {
    color: colors.white,
  },
  rosterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  playerInfo: { flex: 1 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  positionBadge: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionText: { fontSize: fontSize.xs, fontWeight: '700' },
  playerName: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  playerDetail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  releaseButton: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  releaseText: { color: colors.error, fontWeight: '600', fontSize: fontSize.sm },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: { color: colors.textMuted, fontSize: fontSize.base, marginTop: spacing.sm },
});
