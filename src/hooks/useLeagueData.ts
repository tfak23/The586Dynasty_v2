import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useAppStore } from '../lib/store';
import { COMMISSIONER_USERNAMES } from '../lib/constants';
import type { Team, Contract, League, TeamCapSummary, DraftPick, CapAdjustment, Player } from '../types';

/**
 * Loads league data into the Zustand store after auth is confirmed.
 */
export function useLeagueData() {
  const { user, profile } = useAuth();
  const loaded = useRef(false);

  const loadAll = useCallback(async () => {
    if (!user || !profile?.onboarding_completed) return;

    const s = useAppStore.getState();
    s.setIsLoading(true);

    try {
      // 1. Find user's team
      const { data: team } = await supabase
        .from('teams')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!team) {
        s.setIsLoading(false);
        return;
      }
      s.setCurrentTeam(team as Team);

      // 2. Get league
      const { data: league } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', team.league_id)
        .single();

      if (league) s.setCurrentLeague(league as League);

      // Parallel fetches for speed
      const [teamsRes, contractsRes, allContractsRes, capRes, picksRes, allPicksRes, adjRes, playersRes] =
        await Promise.all([
          // 3. All teams in league
          supabase
            .from('teams')
            .select('*')
            .eq('league_id', team.league_id)
            .order('team_name'),

          // 4. My team's contracts with player data
          supabase
            .from('contracts')
            .select('*, player:players(*)')
            .eq('team_id', team.id)
            .eq('status', 'active')
            .order('salary', { ascending: false }),

          // 5. ALL active contracts in league (for Players tab)
          supabase
            .from('contracts')
            .select('*, player:players(*), team:teams(id, team_name, owner_name)')
            .eq('league_id', team.league_id)
            .eq('status', 'active')
            .order('salary', { ascending: false }),

          // 6. Cap summaries via RPC
          league
            ? supabase.rpc('get_league_cap_detailed', { p_league_id: league.id })
            : Promise.resolve({ data: null }),

          // 7. Draft picks owned by my team
          supabase
            .from('draft_picks')
            .select('*, original_team:teams!draft_picks_original_team_id_fkey(id, team_name, owner_name), current_team:teams!draft_picks_current_team_id_fkey(id, team_name, owner_name)')
            .eq('current_team_id', team.id)
            .eq('is_used', false)
            .order('season', { ascending: true })
            .order('round', { ascending: true }),

          // 8. ALL draft picks in league (for draft board)
          supabase
            .from('draft_picks')
            .select('*, original_team:teams!draft_picks_original_team_id_fkey(id, team_name, owner_name), current_team:teams!draft_picks_current_team_id_fkey(id, team_name, owner_name)')
            .eq('league_id', team.league_id)
            .eq('is_used', false)
            .order('season', { ascending: true })
            .order('round', { ascending: true })
            .order('pick_number', { ascending: true }),

          // 9. Cap adjustments for my team
          supabase
            .from('cap_adjustments')
            .select('*')
            .eq('team_id', team.id)
            .order('created_at', { ascending: false }),

          // 10. All active NFL players at fantasy positions (for free agents)
          supabase
            .from('players')
            .select('*')
            .in('position', ['QB', 'RB', 'WR', 'TE'])
            .eq('status', 'Active')
            .order('full_name', { ascending: true })
            .limit(1000),
        ]);

      if (teamsRes.data) s.setTeams(teamsRes.data as Team[]);
      if (contractsRes.data) s.setRoster(contractsRes.data as Contract[]);
      if (allContractsRes.data) s.setAllContracts(allContractsRes.data as Contract[]);
      if (capRes.data) s.setCapSummaries(capRes.data as TeamCapSummary[]);
      if (picksRes.data) s.setDraftPicks(picksRes.data as DraftPick[]);
      if (allPicksRes.data) s.setAllDraftPicks(allPicksRes.data as DraftPick[]);
      if (adjRes.data) s.setCapAdjustments(adjRes.data as CapAdjustment[]);
      if (playersRes.data) s.setAllPlayers(playersRes.data as Player[]);

      // 11. Commissioner status
      const isCommish = COMMISSIONER_USERNAMES.includes(
        profile.sleeper_username ?? ''
      );
      s.setIsCommissioner(isCommish);

      if (teamsRes.data) {
        const commissionerTeamIds = (teamsRes.data as Team[])
          .filter((t) =>
            COMMISSIONER_USERNAMES.some(
              (cu) => cu.toLowerCase() === t.owner_name.toLowerCase()
            )
          )
          .map((t) => t.id);
        s.updateSettings({ commissionerTeamIds });
      }
    } catch (err) {
      console.error('Failed to load league data:', err);
    } finally {
      useAppStore.getState().setIsLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    if (!user || !profile?.onboarding_completed) return;
    if (loaded.current) return;
    loaded.current = true;
    loadAll();
  }, [user, profile, loadAll]);

  return {
    refresh: async () => {
      loaded.current = false;
      await loadAll();
    },
  };
}
