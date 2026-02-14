import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../../src/lib/theme';
import { useAppStore, selectIsCommissioner } from '../../src/lib/store';
import { useAuth } from '../../src/lib/AuthContext';
import { APP_VERSION } from '../../src/lib/constants';

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut, profile } = useAuth();
  const currentLeague = useAppStore((s) => s.currentLeague);
  const currentTeam = useAppStore((s) => s.currentTeam);
  const isCommissioner = useAppStore(selectIsCommissioner);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    const doSignOut = async () => {
      setSigningOut(true);
      try {
        await signOut();
      } catch (err) {
        console.error('Sign out error:', err);
      } finally {
        setSigningOut(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        await doSignOut();
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: doSignOut },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* League Info */}
        {currentLeague && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>League Info</Text>
              <View style={styles.connectedBadge}>
                <Text style={styles.connectedBadgeText}>Connected</Text>
              </View>
            </View>
            <Text style={styles.cardDetail}>{currentLeague.name}</Text>
            <Text style={styles.cardSubDetail}>
              Season {currentLeague.current_season} • ${currentLeague.salary_cap} Cap
            </Text>
            {currentTeam && (
              <View style={styles.teamBadge}>
                <Ionicons name="american-football" size={14} color={colors.primary} />
                <Text style={styles.teamBadgeText}>{currentTeam.team_name}</Text>
              </View>
            )}
            {isCommissioner && (
              <View style={[styles.teamBadge, { backgroundColor: colors.warningDark + '30' }]}>
                <Ionicons name="shield" size={14} color={colors.warning} />
                <Text style={[styles.teamBadgeText, { color: colors.warning }]}>Commissioner</Text>
              </View>
            )}
          </View>
        )}

        {/* Sleeper Sync - Commissioner Only */}
        {isCommissioner && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sleeper Sync</Text>
            <Text style={styles.cardSubDetail}>Auto-sync status: checking...</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]}>
                <Ionicons name="sync" size={16} color={colors.white} />
                <Text style={styles.actionButtonText}>Sync Rosters</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.actionButtonOutline]}>
                <Ionicons name="sync" size={16} color={colors.primary} />
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>Sync League</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Free Agent Database */}
        {isCommissioner && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Free Agent Database</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.actionButton, styles.actionButtonOutline]}>
                <Ionicons name="people" size={16} color={colors.primary} />
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>Sync Players</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.actionButtonOutline]}>
                <Ionicons name="stats-chart" size={16} color={colors.primary} />
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>Sync Stats</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Google Sheet Sync */}
        {isCommissioner && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Google Sheet Sync</Text>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#0F9D58' }]}>
              <Ionicons name="document-text" size={16} color={colors.white} />
              <Text style={styles.actionButtonText}>Sync to Google Sheet</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Commissioner Settings */}
        {isCommissioner && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Commissioner Settings</Text>

            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Offseason Mode</Text>
                <Text style={styles.settingDescription}>
                  Enable offseason features and draft pick salary tracking
                </Text>
              </View>
              <Switch
                value={settings.isOffseason}
                onValueChange={(value) => updateSettings({ isOffseason: value })}
                trackColor={{ false: colors.surface, true: colors.primary }}
              />
            </View>

            <TouchableOpacity style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Rookie Draft Rounds</Text>
                <Text style={styles.settingDescription}>{settings.rookieDraftRounds} rounds</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Rookie Pick Salaries</Text>
                <Text style={styles.settingDescription}>Configure pick values</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.warning }]}
              onPress={() => router.push('/commissioner' as never)}
            >
              <Ionicons name="construct" size={16} color={colors.white} />
              <Text style={styles.actionButtonText}>Commissioner Tools</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <Text style={styles.cardSubDetail}>App Version {APP_VERSION}</Text>
          <Text style={styles.cardSubDetail}>Season 2025</Text>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? (
            <ActivityIndicator color={colors.error} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </>
          )}
        </TouchableOpacity>

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
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  cardDetail: { fontSize: fontSize.base, color: colors.text },
  cardSubDetail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  connectedBadge: {
    backgroundColor: colors.success + '30',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  connectedBadgeText: { fontSize: fontSize.xs, color: colors.success, fontWeight: '600' },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  teamBadgeText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  actionButtonPrimary: { backgroundColor: colors.primary },
  actionButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonText: { color: colors.white, fontWeight: '600', fontSize: fontSize.sm },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLabel: { fontSize: fontSize.base, color: colors.text, fontWeight: '600' },
  settingDescription: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  signOutText: { color: colors.error, fontWeight: '600', fontSize: fontSize.base },
});
