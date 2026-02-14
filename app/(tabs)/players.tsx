import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, getPositionColor } from '../../src/lib/theme';
import { RATINGS, RATING_COLORS, RATING_ICONS } from '../../src/lib/constants';

type PlayerMode = 'signed' | 'freeagents';
type SortBy = 'salary' | 'value';
const POSITIONS = ['All', 'QB', 'RB', 'WR', 'TE'];
const RATING_LIST = ['All', ...Object.values(RATINGS)];

export default function PlayersScreen() {
  const router = useRouter();
  const [playerMode, setPlayerMode] = useState<PlayerMode>('signed');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [sortBy, setSortBy] = useState<SortBy>('salary');
  const [refreshing, setRefreshing] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: Refetch player data
    setRefreshing(false);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Players</Text>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, playerMode === 'signed' && styles.modeButtonActive]}
            onPress={() => setPlayerMode('signed')}
          >
            <Ionicons
              name="document-text"
              size={16}
              color={playerMode === 'signed' ? colors.white : colors.textSecondary}
            />
            <Text style={[styles.modeButtonText, playerMode === 'signed' && styles.modeButtonTextActive]}>
              Signed Players
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, playerMode === 'freeagents' && styles.modeButtonActive]}
            onPress={() => setPlayerMode('freeagents')}
          >
            <Ionicons
              name="person-add"
              size={16}
              color={playerMode === 'freeagents' ? colors.white : colors.textSecondary}
            />
            <Text style={[styles.modeButtonText, playerMode === 'freeagents' && styles.modeButtonTextActive]}>
              Free Agents
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search players..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Position Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {POSITIONS.map((pos) => (
            <TouchableOpacity
              key={pos}
              style={[
                styles.filterChip,
                selectedPosition === pos && styles.filterChipActive,
                pos !== 'All' && selectedPosition === pos && { backgroundColor: getPositionColor(pos) },
              ]}
              onPress={() => setSelectedPosition(pos)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedPosition === pos && styles.filterChipTextActive,
                ]}
              >
                {pos}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort / Rating (signed only) */}
        {playerMode === 'signed' && (
          <>
            <View style={styles.sortRow}>
              <Text style={styles.sortLabel}>Sort by</Text>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'salary' && styles.sortButtonActive]}
                onPress={() => setSortBy('salary')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'salary' && styles.sortButtonTextActive]}>
                  Salary
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'value' && styles.sortButtonActive]}
                onPress={() => setSortBy('value')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'value' && styles.sortButtonTextActive]}>
                  Value
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              {RATING_LIST.map((rating) => {
                const ratingColor = rating !== 'All' ? RATING_COLORS[rating] : null;
                return (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.filterChip,
                      ratingFilter === rating && {
                        backgroundColor: ratingColor?.bg ?? colors.primary,
                      },
                    ]}
                    onPress={() => setRatingFilter(rating)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        ratingFilter === rating && {
                          color: ratingColor?.text ?? colors.white,
                        },
                      ]}
                    >
                      {rating}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* Player List Placeholder */}
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>
            {playerMode === 'signed' ? 'No Signed Players' : 'No Free Agents'}
          </Text>
          <Text style={styles.emptySubtitle}>
            Sync your league data to see players here
          </Text>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1, paddingHorizontal: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 2,
    marginBottom: spacing.md,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md - 2,
    gap: spacing.xs,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeButtonText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  modeButtonTextActive: { color: colors.white },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.base,
    marginLeft: spacing.sm,
    paddingVertical: 0,
  },
  filterRow: {
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.white,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sortLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  sortButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  sortButtonActive: { backgroundColor: colors.primary },
  sortButtonText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  sortButtonTextActive: { color: colors.white },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  emptySubtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
