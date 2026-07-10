import React, { useReducer, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, getPositionColor } from '../../src/lib/theme';
import { useAppStore } from '../../src/lib/store';
import { getSleeperSeasonStats, type PlayerSeasonStats } from '../../src/lib/sleeperStats';
import { quickEstimate } from '../../src/lib/contractEstimation';
import { MIN_SALARIES } from '../../src/lib/constants';
import {
  auctionReducer,
  initialAuctionState,
  DEFAULT_SETTINGS,
  maxBid,
  canBid,
  allowedYears,
  type AuctionPlayer,
  type AuctionTeam,
  type AuctionState,
} from '../../src/lib/auction/mockAuction';
import { pickBotBid, pickBotNomination, bestAvailable } from '../../src/lib/auction/bots';

const POSITIONS = ['All', 'QB', 'RB', 'WR', 'TE'];

export default function MockAuctionScreen() {
  const router = useRouter();
  const teams = useAppStore((s) => s.teams);
  const capSummaries = useAppStore((s) => s.capSummaries);
  const currentTeam = useAppStore((s) => s.currentTeam);
  const allPlayers = useAppStore((s) => s.allPlayers);
  const allContracts = useAppStore((s) => s.allContracts);

  const [state, dispatch] = useReducer(auctionReducer, initialAuctionState);
  const stateRef = useRef<AuctionState>(state);
  stateRef.current = state;

  const [statsMap, setStatsMap] = useState<Record<string, PlayerSeasonStats>>({});
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('All');
  const [openingBid, setOpeningBid] = useState(1);
  const [customBid, setCustomBid] = useState('');
  const [showCommish, setShowCommish] = useState(false);
  const [budgetDrafts, setBudgetDrafts] = useState<Record<string, string>>({});

  // ── Data prep ──────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    getSleeperSeasonStats('2025').then((s) => {
      if (!cancelled) setStatsMap(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signedIds = useMemo(() => new Set(allContracts.map((c) => c.player_id)), [allContracts]);

  const fullPool: AuctionPlayer[] = useMemo(() => {
    return allPlayers
      .filter((p) => !signedIds.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.full_name,
        position: p.position,
        nflTeam: p.team,
        age: p.age,
        projected: quickEstimate(p.position, statsMap[p.id]?.ppg_ppr ?? 0, p.age ?? 25),
      }));
  }, [allPlayers, signedIds, statsMap]);

  const wonIds = useMemo(() => new Set(state.results.map((r) => r.player.id)), [state.results]);
  const availablePool = useMemo(() => fullPool.filter((p) => !wonIds.has(p.id)), [fullPool, wonIds]);

  // Initialize teams once data is ready
  useEffect(() => {
    if (state.teams.length > 0 || teams.length === 0) return;
    const auctionTeams: AuctionTeam[] = teams.map((t) => {
      const cap = capSummaries.find((c) => c.team_id === t.id);
      return {
        teamId: t.id,
        name: t.team_name,
        owner: t.owner_name,
        budget: Math.max(0, cap?.cap_room ?? 0),
        spent: 0,
        isUser: t.id === currentTeam?.id,
        wins: [],
      };
    });
    dispatch({ type: 'INIT', teams: auctionTeams, settings: DEFAULT_SETTINGS });
  }, [teams, capSummaries, currentTeam, state.teams.length]);

  // ── Clock + bot loop ───────────────────────────────────────────────────────

  const running = (state.phase === 'nomination' || state.phase === 'bidding') && !state.paused;

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(interval);
  }, [running]);

  const nomHandledKey = useRef('');
  const poolRef = useRef(availablePool);
  poolRef.current = availablePool;

  useEffect(() => {
    const s = state;
    if (s.paused) return;

    // Bot / timeout nomination handling
    if (s.phase === 'nomination') {
      const onClock = s.teams[s.nomPointer];
      if (!onClock) return;
      const key = `turn-${s.nomTurn}`;
      const botDelayReached = s.nomSecondsLeft <= s.settings.nominationSecs - 2;

      if (s.nomSecondsLeft === 0 && nomHandledKey.current !== key) {
        nomHandledKey.current = key;
        if (s.settings.autoNominateOnTimeout) {
          const player = bestAvailable(poolRef.current);
          if (player) {
            dispatch({ type: 'NOMINATE', byTeamId: onClock.teamId, player, openingBid: 1 });
            return;
          }
        }
        dispatch({ type: 'SKIP_NOMINATION' });
        return;
      }

      if (!onClock.isUser && botDelayReached && nomHandledKey.current !== key) {
        nomHandledKey.current = key;
        const nom = pickBotNomination(onClock, poolRef.current);
        if (nom) {
          dispatch({ type: 'NOMINATE', byTeamId: onClock.teamId, player: nom.player, openingBid: nom.openingBid });
        } else {
          dispatch({ type: 'SKIP_NOMINATION' });
        }
      }
    }

    // Bot bidding — small human-ish delay after every state change
    if (s.phase === 'bidding' && s.lot) {
      const timer = setTimeout(() => {
        const latest = stateRef.current;
        if (latest.phase !== 'bidding' || latest.paused) return;
        const bid = pickBotBid(latest);
        if (bid) dispatch({ type: 'BID', teamId: bid.teamId, amount: bid.amount });
      }, 500 + Math.random() * 700);
      return () => clearTimeout(timer);
    }
  }, [state]);

  // ── Derived UI data ────────────────────────────────────────────────────────

  const userTeam = state.teams.find((t) => t.isUser);
  const onClockTeam = state.teams[state.nomPointer];
  const isUserTurn = state.phase === 'nomination' && onClockTeam?.isUser;
  const lot = state.lot;
  const highBidderTeam = lot ? state.teams.find((t) => t.teamId === lot.highBidderId) : null;

  const filteredPool = useMemo(() => {
    let result = availablePool;
    if (posFilter !== 'All') result = result.filter((p) => p.position === posFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => b.projected - a.projected).slice(0, 40);
  }, [availablePool, posFilter, search]);

  const userMaxBid = userTeam ? maxBid(userTeam, state.settings) : 0;

  const placeUserBid = useCallback(
    (amount: number) => {
      if (!userTeam) return;
      dispatch({ type: 'BID', teamId: userTeam.teamId, amount });
      setCustomBid('');
    },
    [userTeam]
  );

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderTeamsRail = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rail}>
      {state.teams.map((t, idx) => {
        const isOnClock = state.phase === 'nomination' && idx === state.nomPointer;
        const isHigh = lot?.highBidderId === t.teamId;
        return (
          <View
            key={t.teamId}
            style={[
              styles.railCard,
              t.isUser && styles.railCardUser,
              isOnClock && styles.railCardOnClock,
              isHigh && styles.railCardHigh,
            ]}
          >
            <Text style={styles.railName} numberOfLines={1}>
              {idx + 1}. {t.name}
            </Text>
            <Text style={styles.railBudget}>${t.budget - t.spent} left</Text>
            <Text style={styles.railMeta}>
              max ${maxBid(t, state.settings)} • {t.wins.length}/{state.settings.maxWins}
            </Text>
            {isOnClock && <Text style={styles.railTag}>ON CLOCK</Text>}
            {isHigh && <Text style={[styles.railTag, { color: colors.success }]}>HIGH BID</Text>}
          </View>
        );
      })}
    </ScrollView>
  );

  const renderSetup = () => (
    <>
      <Text style={styles.sectionTitle}>Nomination Order</Text>
      {state.teams.map((t, idx) => (
        <View key={t.teamId} style={styles.setupRow}>
          <Text style={styles.setupOrderNum}>{idx + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.setupName}>
              {t.name} {t.isUser ? '(you)' : ''}
            </Text>
            <Text style={styles.setupOwner}>{t.owner}</Text>
          </View>
          <View style={styles.budgetBox}>
            <Text style={styles.budgetLabel}>$</Text>
            <TextInput
              style={styles.budgetInput}
              keyboardType="number-pad"
              value={budgetDrafts[t.teamId] ?? String(t.budget)}
              onChangeText={(v) => setBudgetDrafts((d) => ({ ...d, [t.teamId]: v }))}
              onBlur={() => {
                const v = parseInt(budgetDrafts[t.teamId] ?? '', 10);
                if (!Number.isNaN(v)) dispatch({ type: 'SET_BUDGET', teamId: t.teamId, budget: v });
              }}
            />
          </View>
          <TouchableOpacity onPress={() => dispatch({ type: 'MOVE_TEAM', teamId: t.teamId, direction: 'up' })}>
            <Ionicons name="chevron-up" size={22} color={idx === 0 ? colors.textMuted : colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => dispatch({ type: 'MOVE_TEAM', teamId: t.teamId, direction: 'down' })}>
            <Ionicons name="chevron-down" size={22} color={idx === state.teams.length - 1 ? colors.textMuted : colors.primary} />
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.secondaryBtn} onPress={() => dispatch({ type: 'RANDOMIZE_ORDER' })}>
        <Ionicons name="shuffle" size={16} color={colors.primary} />
        <Text style={styles.secondaryBtnText}>Randomize Order</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Settings</Text>
      <SettingRow
        label="Nomination timer (sec)"
        value={state.settings.nominationSecs}
        onChange={(v) => dispatch({ type: 'SET_SETTINGS', settings: { nominationSecs: v } })}
        min={5}
        step={5}
      />
      <SettingRow
        label="Bid timer (sec)"
        value={state.settings.bidSecs}
        onChange={(v) => dispatch({ type: 'SET_SETTINGS', settings: { bidSecs: v } })}
        min={3}
        step={1}
      />
      <SettingRow
        label="Min bid increment ($)"
        value={state.settings.minIncrement}
        onChange={(v) => dispatch({ type: 'SET_SETTINGS', settings: { minIncrement: v } })}
        min={1}
        step={1}
      />
      <SettingRow
        label="Max players per team"
        value={state.settings.maxWins}
        onChange={(v) => dispatch({ type: 'SET_SETTINGS', settings: { maxWins: v } })}
        min={1}
        step={1}
      />
      <TouchableOpacity
        style={styles.toggleRow}
        onPress={() =>
          dispatch({ type: 'SET_SETTINGS', settings: { autoNominateOnTimeout: !state.settings.autoNominateOnTimeout } })
        }
      >
        <Text style={styles.settingLabel}>If nomination timer expires</Text>
        <Text style={styles.toggleValue}>
          {state.settings.autoNominateOnTimeout ? 'Auto-nominate best available' : 'Skip the turn'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.primaryBtn} onPress={() => dispatch({ type: 'START' })}>
        <Ionicons name="play" size={18} color={colors.white} />
        <Text style={styles.primaryBtnText}>Start Mock Draft</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>
        Budgets default to each team's live cap room. This is a mock — nothing is saved to contracts or the sheet.
      </Text>
    </>
  );

  const renderNomination = () => (
    <View style={styles.stageCard}>
      <Text style={styles.stageLabel}>ON THE CLOCK</Text>
      <Text style={styles.stageTeam}>{onClockTeam?.name}</Text>
      <Text style={[styles.countdown, state.nomSecondsLeft <= 5 && { color: colors.error }]}>
        {state.nomSecondsLeft}s
      </Text>

      <View style={styles.skipRow}>
        <TouchableOpacity style={styles.skipBtn} onPress={() => dispatch({ type: 'SKIP_NOMINATION' })}>
          <Ionicons name="play-skip-forward" size={14} color={colors.warning} />
          <Text style={styles.skipBtnText}>Skip {onClockTeam?.isUser ? 'my' : 'their'} turn</Text>
        </TouchableOpacity>
      </View>

      {isUserTurn && (
        <>
          <View style={styles.openingBidRow}>
            <Text style={styles.settingLabel}>Opening bid</Text>
            <TouchableOpacity onPress={() => setOpeningBid((b) => Math.max(1, b - 1))}>
              <Ionicons name="remove-circle-outline" size={26} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.openingBidValue}>${openingBid}</Text>
            <TouchableOpacity onPress={() => setOpeningBid((b) => b + 1)}>
              <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search free agents..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
            {POSITIONS.map((pos) => (
              <TouchableOpacity
                key={pos}
                style={[styles.filterChip, posFilter === pos && styles.filterChipActive]}
                onPress={() => setPosFilter(pos)}
              >
                <Text style={[styles.filterChipText, posFilter === pos && styles.filterChipTextActive]}>{pos}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filteredPool.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.nomRow}
              onPress={() => dispatch({ type: 'NOMINATE', byTeamId: onClockTeam!.teamId, player: p, openingBid })}
            >
              <View style={[styles.posDot, { backgroundColor: getPositionColor(p.position) }]}>
                <Text style={styles.posDotText}>{p.position}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nomName}>{p.name}</Text>
                <Text style={styles.nomMeta}>
                  {p.nflTeam ?? 'FA'} • Age {p.age ?? '?'} • proj ~${p.projected}
                </Text>
              </View>
              <Text style={styles.nomAction}>Nominate</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {!isUserTurn && <Text style={styles.hint}>{onClockTeam?.name} is choosing a player to nominate…</Text>}
    </View>
  );

  const renderBidding = () =>
    lot && (
      <View style={styles.stageCard}>
        <View style={styles.lotHeader}>
          <View style={[styles.posDot, { backgroundColor: getPositionColor(lot.player.position) }]}>
            <Text style={styles.posDotText}>{lot.player.position}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.lotPlayer}>{lot.player.name}</Text>
            <Text style={styles.nomMeta}>
              {lot.player.nflTeam ?? 'FA'} • Age {lot.player.age ?? '?'} • proj ~${lot.player.projected}
            </Text>
          </View>
        </View>

        <View style={styles.bidStage}>
          <Text style={styles.currentBid}>${lot.currentBid}</Text>
          <Text style={styles.highBidder}>{highBidderTeam?.name ?? '—'}</Text>
          <Text style={[styles.countdown, lot.secondsLeft <= 3 && { color: colors.error }]}>{lot.secondsLeft}s</Text>
          <View style={styles.timerBarOuter}>
            <View
              style={[
                styles.timerBarInner,
                {
                  width: `${(lot.secondsLeft / state.settings.bidSecs) * 100}%`,
                  backgroundColor: lot.secondsLeft <= 3 ? colors.error : colors.primary,
                },
              ]}
            />
          </View>
        </View>

        {userTeam && (
          <>
            <View style={styles.bidBtnRow}>
              {[1, 5, 10].map((inc) => {
                const amount = lot.currentBid + inc;
                const ok = canBid(state, userTeam.teamId, amount).ok;
                return (
                  <TouchableOpacity
                    key={inc}
                    style={[styles.bidBtn, !ok && styles.bidBtnDisabled]}
                    disabled={!ok}
                    onPress={() => placeUserBid(amount)}
                  >
                    <Text style={styles.bidBtnText}>+${inc}</Text>
                  </TouchableOpacity>
                );
              })}
              <View style={styles.customBidBox}>
                <TextInput
                  style={styles.customBidInput}
                  keyboardType="number-pad"
                  placeholder="$"
                  placeholderTextColor={colors.textMuted}
                  value={customBid}
                  onChangeText={setCustomBid}
                />
                <TouchableOpacity
                  style={styles.customBidGo}
                  onPress={() => {
                    const v = parseInt(customBid, 10);
                    if (!Number.isNaN(v)) placeUserBid(v);
                  }}
                >
                  <Text style={styles.bidBtnText}>Bid</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.hint}>
              Your max bid: ${userMaxBid}
              {lot.highBidderId === userTeam.teamId ? ' — you are the high bidder' : ''}
            </Text>
          </>
        )}
      </View>
    );

  const renderYearsModal = () =>
    state.phase === 'years' &&
    state.pendingSale && (
      <Modal transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>You won {state.pendingSale.lot.player.name}!</Text>
            <Text style={styles.modalSub}>${state.pendingSale.lot.currentBid} / year — choose contract length</Text>
            {[1, 2, 3, 4, 5].map((y) => {
              const ok = allowedYears(state.pendingSale!.lot.currentBid).includes(y);
              return (
                <TouchableOpacity
                  key={y}
                  style={[styles.yearBtn, !ok && styles.bidBtnDisabled]}
                  disabled={!ok}
                  onPress={() => dispatch({ type: 'ASSIGN_YEARS', years: y })}
                >
                  <Text style={styles.yearBtnText}>
                    {y} year{y > 1 ? 's' : ''} (min ${MIN_SALARIES[y]})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    );

  const renderCommishPanel = () =>
    showCommish && (
      <View style={styles.commishPanel}>
        <Text style={styles.sectionTitle}>Commissioner Controls</Text>
        <View style={styles.commishBtnRow}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => dispatch({ type: state.paused ? 'RESUME' : 'PAUSE' })}
          >
            <Ionicons name={state.paused ? 'play' : 'pause'} size={16} color={colors.primary} />
            <Text style={styles.secondaryBtnText}>{state.paused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>
          {state.phase === 'nomination' && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => dispatch({ type: 'SKIP_NOMINATION' })}>
              <Ionicons name="play-skip-forward" size={16} color={colors.warning} />
              <Text style={styles.secondaryBtnText}>Skip Nominator</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => dispatch({ type: 'UNDO_LAST_SALE' })}
            disabled={state.results.length === 0}
          >
            <Ionicons name="arrow-undo" size={16} color={colors.error} />
            <Text style={styles.secondaryBtnText}>Void Last Sale</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => dispatch({ type: 'END_DRAFT' })}>
            <Ionicons name="stop-circle-outline" size={16} color={colors.error} />
            <Text style={styles.secondaryBtnText}>End Draft</Text>
          </TouchableOpacity>
        </View>

        <SettingRow
          label="Nomination timer (sec)"
          value={state.settings.nominationSecs}
          onChange={(v) => dispatch({ type: 'SET_SETTINGS', settings: { nominationSecs: v } })}
          min={5}
          step={5}
        />
        <SettingRow
          label="Bid timer (sec)"
          value={state.settings.bidSecs}
          onChange={(v) => dispatch({ type: 'SET_SETTINGS', settings: { bidSecs: v } })}
          min={3}
          step={1}
        />

        <Text style={styles.commishSub}>Budgets & future nomination order</Text>
        {state.teams.map((t) => (
          <View key={t.teamId} style={styles.setupRow}>
            <Text style={styles.setupName} numberOfLines={1}>
              {t.name}
            </Text>
            <View style={styles.budgetBox}>
              <Text style={styles.budgetLabel}>$</Text>
              <TextInput
                style={styles.budgetInput}
                keyboardType="number-pad"
                value={budgetDrafts[t.teamId] ?? String(t.budget)}
                onChangeText={(v) => setBudgetDrafts((d) => ({ ...d, [t.teamId]: v }))}
                onBlur={() => {
                  const v = parseInt(budgetDrafts[t.teamId] ?? '', 10);
                  if (!Number.isNaN(v)) dispatch({ type: 'SET_BUDGET', teamId: t.teamId, budget: v });
                }}
              />
            </View>
            <TouchableOpacity onPress={() => dispatch({ type: 'MOVE_TEAM', teamId: t.teamId, direction: 'up' })}>
              <Ionicons name="chevron-up" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => dispatch({ type: 'MOVE_TEAM', teamId: t.teamId, direction: 'down' })}>
              <Ionicons name="chevron-down" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );

  const renderResults = () =>
    state.results.length > 0 && (
      <>
        <Text style={styles.sectionTitle}>Results ({state.results.length})</Text>
        {state.results.map((r) => {
          const team = state.teams.find((t) => t.teamId === r.teamId);
          return (
            <View key={r.lotNumber} style={styles.resultRow}>
              <View style={[styles.posDot, { backgroundColor: getPositionColor(r.player.position) }]}>
                <Text style={styles.posDotText}>{r.player.position}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nomName}>{r.player.name}</Text>
                <Text style={styles.nomMeta}>{team?.name}</Text>
              </View>
              <Text style={styles.resultPrice}>
                ${r.price} / {r.years}yr{r.years > 1 ? 's' : ''}
              </Text>
            </View>
          );
        })}
      </>
    );

  // ── Screen ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mock Auction Draft</Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {state.phase !== 'setup' && state.phase !== 'complete' && (
            <TouchableOpacity onPress={() => dispatch({ type: state.paused ? 'RESUME' : 'PAUSE' })}>
              <Ionicons name={state.paused ? 'play-circle' : 'pause-circle'} size={26} color={colors.primary} />
            </TouchableOpacity>
          )}
          {state.phase !== 'setup' && (
            <TouchableOpacity onPress={() => setShowCommish((v) => !v)}>
              <Ionicons name="settings-outline" size={24} color={showCommish ? colors.primary : colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {state.paused && (
        <View style={styles.pausedBanner}>
          <Ionicons name="pause" size={14} color={colors.warning} />
          <Text style={styles.pausedText}>Draft paused</Text>
        </View>
      )}

      {state.phase !== 'setup' && renderTeamsRail()}

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {renderCommishPanel()}
        {state.phase === 'setup' && renderSetup()}
        {state.phase === 'nomination' && renderNomination()}
        {(state.phase === 'bidding' || state.phase === 'years') && renderBidding()}
        {state.phase === 'complete' && (
          <View style={styles.stageCard}>
            <Ionicons name="trophy" size={40} color={colors.gold} style={{ alignSelf: 'center' }} />
            <Text style={styles.stageTeam}>Draft Complete</Text>
            <Text style={styles.hint}>
              {state.results.length} players sold for $
              {state.results.reduce((sum, r) => sum + r.price, 0)} total. This was a mock — nothing was saved.
            </Text>
          </View>
        )}
        {renderResults()}

        {state.log.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Activity</Text>
            {state.log.slice(0, 15).map((line, i) => (
              <Text key={i} style={styles.logLine}>
                {line}
              </Text>
            ))}
          </>
        )}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {renderYearsModal()}
    </SafeAreaView>
  );
}

// ─── Small setting stepper ─────────────────────────────────────────────────

function SettingRow({
  label,
  value,
  onChange,
  min,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  step: number;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <TouchableOpacity onPress={() => onChange(Math.max(min, value - step))}>
        <Ionicons name="remove-circle-outline" size={24} color={colors.primary} />
      </TouchableOpacity>
      <Text style={styles.settingValue}>{value}</Text>
      <TouchableOpacity onPress={() => onChange(value + step)}>
        <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

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
  pausedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.warning + '22',
    paddingVertical: spacing.xs,
  },
  pausedText: { color: colors.warning, fontSize: fontSize.sm, fontWeight: '700' },
  rail: { maxHeight: 92, paddingLeft: spacing.md, marginBottom: spacing.sm },
  railCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginRight: spacing.sm,
    width: 132,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  railCardUser: { borderColor: colors.primary },
  railCardOnClock: { borderColor: colors.warning },
  railCardHigh: { borderColor: colors.success },
  railName: { color: colors.text, fontSize: fontSize.xs, fontWeight: '700' },
  railBudget: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '700', marginTop: 2 },
  railMeta: { color: colors.textMuted, fontSize: 10, marginTop: 1 },
  railTag: { color: colors.warning, fontSize: 9, fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  setupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  setupOrderNum: { color: colors.textMuted, fontSize: fontSize.sm, width: 20, fontWeight: '700' },
  setupName: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600', flexShrink: 1 },
  setupOwner: { color: colors.textMuted, fontSize: fontSize.xs },
  budgetBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
  },
  budgetLabel: { color: colors.textMuted, fontSize: fontSize.sm },
  budgetInput: { color: colors.text, fontSize: fontSize.sm, width: 48, paddingVertical: 4 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  primaryBtnText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  secondaryBtnText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  settingLabel: { color: colors.text, fontSize: fontSize.sm, flex: 1 },
  settingValue: { color: colors.primary, fontSize: fontSize.base, fontWeight: '700', width: 36, textAlign: 'center' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  toggleValue: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  hint: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.sm, textAlign: 'center' },
  stageCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  stageLabel: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  stageTeam: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  countdown: { color: colors.primary, fontSize: fontSize.xxl, fontWeight: '800', textAlign: 'center', marginVertical: spacing.xs },
  skipRow: { alignItems: 'center', marginBottom: spacing.sm },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warning + '22',
  },
  skipBtnText: { color: colors.warning, fontSize: fontSize.xs, fontWeight: '700' },
  openingBidRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  openingBidValue: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700', width: 48, textAlign: 'center' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: fontSize.sm, marginLeft: spacing.sm, paddingVertical: spacing.sm },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundSecondary,
    marginRight: spacing.sm,
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '600' },
  filterChipTextActive: { color: colors.white },
  nomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundSecondary,
    gap: spacing.sm,
  },
  nomName: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  nomMeta: { color: colors.textMuted, fontSize: fontSize.xs },
  nomAction: { color: colors.primary, fontSize: fontSize.xs, fontWeight: '700' },
  posDot: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  posDotText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  lotHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lotPlayer: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  bidStage: { alignItems: 'center', marginVertical: spacing.md },
  currentBid: { color: colors.success, fontSize: 44, fontWeight: '800' },
  highBidder: { color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.xs },
  timerBarOuter: {
    height: 6,
    width: '100%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  timerBarInner: { height: 6, borderRadius: borderRadius.full },
  bidBtnRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  bidBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  bidBtnDisabled: { opacity: 0.35 },
  bidBtnText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '700' },
  customBidBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    flex: 1,
  },
  customBidInput: { flex: 1, color: colors.text, fontSize: fontSize.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  customBidGo: { backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  modalOverlay: { flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg },
  modalTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700', textAlign: 'center' },
  modalSub: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', marginVertical: spacing.md },
  yearBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  yearBtnText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  commishPanel: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  commishBtnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  commishSub: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '600', marginTop: spacing.md, marginBottom: spacing.xs },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  resultPrice: { color: colors.gold, fontSize: fontSize.sm, fontWeight: '700' },
  logLine: { color: colors.textMuted, fontSize: fontSize.xs, marginBottom: 3 },
});
