import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../src/lib/theme';
import { useAppStore } from '../src/lib/store';
import { supabase } from '../src/lib/supabase';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface RuleSection {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  content: string;
}

const DEFAULT_SECTIONS: RuleSection[] = [
  {
    key: 'buyin',
    title: 'Buy-In',
    icon: 'cash-outline',
    color: '#22c55e',
    content: 'Annual buy-in is $50 per team. Payment is due before the rookie draft. Unpaid teams may have draft picks withheld. Prize pool distribution: 1st place 60%, 2nd place 25%, 3rd place 15%.',
  },
  {
    key: 'salarycap',
    title: 'Salary Cap',
    icon: 'calculator-outline',
    color: '#3b82f6',
    content: 'The salary cap is $300 per team. Teams must be at or under the cap at all times during the season. Any team found over the cap must release players until they are under within 48 hours. Cap penalties may carry over to the following season.',
  },
  {
    key: 'keydates',
    title: 'Key Dates',
    icon: 'calendar-outline',
    color: '#06B6D4',
    content: 'Rookie Draft: Mid-August\nTrade Deadline: Week 10 of NFL Season\nRoster Cutdown: Before Week 1\nFree Agency Opens: After the Super Bowl\nFranchise Tag Deadline: Before the Rookie Draft',
  },
  {
    key: 'deadcap',
    title: 'Dead Cap',
    icon: 'skull-outline',
    color: '#ef4444',
    content: 'When a player is released, the remaining guaranteed money counts as dead cap. Dead cap is calculated as follows: Year 1 of contract = 100% dead cap, Year 2 = 75%, Year 3 = 50%, Year 4+ = 25%. Dead cap hits cannot be traded.',
  },
  {
    key: 'traderules',
    title: 'Trade Rules',
    icon: 'swap-horizontal-outline',
    color: '#f59e0b',
    content: 'All trades must be approved by the commissioner or pass a league vote. Trades can include contracts, draft picks, and cap space. Both teams must remain under the salary cap after the trade processes. Trade objection period is 24 hours.',
  },
  {
    key: 'rookierules',
    title: 'Rookie Rules',
    icon: 'school-outline',
    color: '#8B5CF6',
    content: 'Rookie contracts are 4 years. Salary is determined by draft position. Rookies cannot be traded during their first season. Rookie pick trading is allowed for current and future seasons (up to 2 years out). Taxi squad holds up to 3 rookies.',
  },
  {
    key: 'tanking',
    title: 'Tanking Policy',
    icon: 'flag-outline',
    color: '#ec4899',
    content: 'Tanking is not tolerated. All teams must set competitive lineups each week. Failure to set a lineup will result in a warning for the first offense, loss of a 3rd round pick for the second offense, and potential removal from the league for repeated offenses. The commissioner reserves the right to set lineups for inactive owners.',
  },
];

export default function RulesScreen() {
  const router = useRouter();
  const currentLeague = useAppStore((s) => s.currentLeague);

  const [sections, setSections] = useState<RuleSection[]>(DEFAULT_SECTIONS);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRules();
  }, [currentLeague]);

  const loadRules = async () => {
    if (!currentLeague) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('league_rules')
        .select('*')
        .eq('league_id', currentLeague.id)
        .order('order_index', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const mapped: RuleSection[] = data.map((rule: { id: string; title: string; content: string }, i: number) => ({
          key: rule.id,
          title: rule.title,
          icon: DEFAULT_SECTIONS[i]?.icon ?? 'document-text-outline',
          color: DEFAULT_SECTIONS[i]?.color ?? colors.primary,
          content: rule.content,
        }));
        setSections(mapped);
      }
    } catch (err) {
      console.error('Error loading rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedKey(expandedKey === key ? null : key);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>League Rules</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading && (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
        )}

        {!loading && sections.map((section) => {
          const isExpanded = expandedKey === section.key;

          return (
            <View key={section.key} style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(section.key)}
              >
                <View style={[styles.iconContainer, { backgroundColor: section.color + '20' }]}>
                  <Ionicons name={section.icon} size={20} color={section.color} />
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.sectionContent}>
                  <Text style={styles.sectionText}>{section.content}</Text>
                </View>
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
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  sectionContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  sectionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
