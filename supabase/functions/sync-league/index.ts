import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import * as sleeper from '../_shared/sleeper-client.ts';

const LEAGUE_ID = '1315789488873553920';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getServiceClient();

    // Fetch league info from Sleeper
    const league = await sleeper.getLeague(LEAGUE_ID);
    const users = await sleeper.getLeagueUsers(LEAGUE_ID);
    const rosters = await sleeper.getLeagueRosters(LEAGUE_ID);
    const tradedPicks = await sleeper.getTradedPicks(LEAGUE_ID);

    // Upsert league
    const { data: leagueRow, error: leagueError } = await supabase
      .from('leagues')
      .upsert({
        sleeper_league_id: LEAGUE_ID,
        name: league.name,
        current_season: parseInt(league.season),
        scoring_settings: league.scoring_settings,
        settings: league.settings,
      }, { onConflict: 'sleeper_league_id' })
      .select()
      .single();

    if (leagueError) throw leagueError;
    const leagueId = leagueRow.id;

    // Map Sleeper users by user_id
    const userMap = new Map(users.map((u) => [u.user_id, u]));

    // Upsert teams
    const teamUpserts = rosters.map((roster) => {
      const user = userMap.get(roster.owner_id);
      return {
        league_id: leagueId,
        sleeper_roster_id: roster.roster_id,
        sleeper_user_id: roster.owner_id,
        team_name: user?.display_name || `Team ${roster.roster_id}`,
        owner_name: user?.display_name || `Owner ${roster.roster_id}`,
        avatar_url: user?.avatar
          ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}`
          : null,
      };
    });

    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .upsert(teamUpserts, { onConflict: 'league_id,sleeper_roster_id' })
      .select();

    if (teamsError) throw teamsError;

    // Build roster_id -> team_id map
    const teamMap = new Map(
      (teams || []).map((t: any) => [t.sleeper_roster_id, t.id])
    );

    // Upsert draft picks from traded picks
    const currentSeason = parseInt(league.season);
    const pickSeasons = [currentSeason + 1, currentSeason + 2, currentSeason + 3];

    // First, ensure all picks exist (12 teams * 5 rounds * 3 seasons)
    const allPicks = [];
    for (const season of pickSeasons) {
      for (const team of teams || []) {
        for (let round = 1; round <= 5; round++) {
          allPicks.push({
            league_id: leagueId,
            season,
            round,
            original_team_id: team.id,
            current_team_id: team.id,
          });
        }
      }
    }

    if (allPicks.length > 0) {
      await supabase
        .from('draft_picks')
        .upsert(allPicks, { onConflict: 'league_id,season,round,original_team_id' });
    }

    // Apply traded picks
    for (const tp of tradedPicks) {
      const originalTeamId = teamMap.get(tp.roster_id);
      const currentOwnerId = teamMap.get(tp.owner_id);

      if (originalTeamId && currentOwnerId) {
        await supabase
          .from('draft_picks')
          .update({ current_team_id: currentOwnerId })
          .eq('league_id', leagueId)
          .eq('season', parseInt(tp.season))
          .eq('round', tp.round)
          .eq('original_team_id', originalTeamId);
      }
    }

    // Log sync
    await supabase.from('sync_log').insert({
      league_id: leagueId,
      sync_type: 'sleeper_league',
      status: 'success',
      details: {
        teams_synced: teams?.length ?? 0,
        picks_synced: allPicks.length,
        traded_picks: tradedPicks.length,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        league_id: leagueId,
        teams_synced: teams?.length ?? 0,
        traded_picks: tradedPicks.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
