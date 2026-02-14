import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useAppStore } from '../lib/store';
import { COMMISSIONER_USERNAMES } from '../lib/constants';
import type { Team, Contract, League, TeamCapSummary } from '../types';

/**
 * Loads league data into the Zustand store after auth is confirmed.
 * Fetches: user's team, league, all teams, contracts w/ players, cap summaries,
 * draft picks, and commissioner status.
 */
export function useLeagueData() {
  const { user, profile } = useAuth();
  const setCurrentTeam = useAppStore((s) => s.setCurrentTeam);
  const setCurrentLeague = useAppStore((s) => s.setCurrentLeague);
  const setTeams = useAppStore((s) => s.setTeams);
  const setRoster = useAppStore((s) => s.setRoster);
  const setCapSummaries = useAppStore((s) => s.setCapSummaries);
  const setIsCommissioner = useAppStore((s) => s.setIsCommissioner);
  const setIsLoading = useAppStore((s) => s.setIsLoading);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const loaded = useRef(false);

  useEffect(() => {
    if (!user || !profile?.onboarding_completed) return;
    if (loaded.current) return;
    loaded.current = true;

    loadAll();

    async function loadAll() {
      setIsLoading(true);
      try {
        // 1. Find user's team
        const { data: team } = await supabase
          .from('teams')
          .select('*')
          .eq('user_id', user!.id)
          .single();

        if (!team) {
          setIsLoading(false);
          return;
        }
        setCurrentTeam(team as Team);

        // 2. Get league
        const { data: league } = await supabase
          .from('leagues')
          .select('*')
          .eq('id', team.league_id)
          .single();

        if (league) {
          setCurrentLeague(league as League);
        }

        // 3. Get all teams in league
        const { data: teams } = await supabase
          .from('teams')
          .select('*')
          .eq('league_id', team.league_id)
          .order('team_name');

        if (teams) {
          setTeams(teams as Team[]);
        }

        // 4. Get contracts for user's team with player data
        const { data: contracts } = await supabase
          .from('contracts')
          .select('*, player:players(*)')
          .eq('team_id', team.id)
          .eq('status', 'active')
          .order('salary', { ascending: false });

        if (contracts) {
          setRoster(contracts as Contract[]);
        }

        // 5. Get cap summaries via RPC
        if (league) {
          const { data: capData } = await supabase
            .rpc('get_league_cap_detailed', { p_league_id: league.id });

          if (capData) {
            setCapSummaries(capData as TeamCapSummary[]);
          }
        }

        // 6. Determine commissioner status
        const isCommish = COMMISSIONER_USERNAMES.includes(
          profile!.sleeper_username ?? ''
        );
        setIsCommissioner(isCommish);

        // Also store commissioner team IDs for the selectIsCommissioner selector
        if (teams) {
          const commissionerTeamIds = (teams as Team[])
            .filter((t) => {
              const ownerUsername = t.owner_name;
              return COMMISSIONER_USERNAMES.some(
                (cu) => cu.toLowerCase() === ownerUsername.toLowerCase()
              );
            })
            .map((t) => t.id);
          updateSettings({ commissionerTeamIds });
        }
      } catch (err) {
        console.error('Failed to load league data:', err);
      } finally {
        setIsLoading(false);
      }
    }
  }, [user, profile]);

  // Return a refresh function for pull-to-refresh
  return {
    refresh: async () => {
      loaded.current = false;
      // Trigger re-run by... we need a different approach
      // Instead, just inline the fetch logic
      if (!user || !profile?.onboarding_completed) return;

      setIsLoading(true);
      try {
        const { data: team } = await supabase
          .from('teams')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!team) return;
        setCurrentTeam(team as Team);

        const { data: league } = await supabase
          .from('leagues')
          .select('*')
          .eq('id', team.league_id)
          .single();

        if (league) setCurrentLeague(league as League);

        const { data: teams } = await supabase
          .from('teams')
          .select('*')
          .eq('league_id', team.league_id)
          .order('team_name');

        if (teams) setTeams(teams as Team[]);

        const { data: contracts } = await supabase
          .from('contracts')
          .select('*, player:players(*)')
          .eq('team_id', team.id)
          .eq('status', 'active')
          .order('salary', { ascending: false });

        if (contracts) setRoster(contracts as Contract[]);

        if (league) {
          const { data: capData } = await supabase
            .rpc('get_league_cap_detailed', { p_league_id: league.id });
          if (capData) setCapSummaries(capData as TeamCapSummary[]);
        }
      } catch (err) {
        console.error('Failed to refresh league data:', err);
      } finally {
        setIsLoading(false);
      }
    },
  };
}
