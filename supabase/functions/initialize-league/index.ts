import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getServiceClient, getUserFromRequest } from '../_shared/supabase-client.ts';
import * as sleeper from '../_shared/sleeper-client.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { sleeper_league_id } = await req.json();
    if (!sleeper_league_id) {
      return new Response(JSON.stringify({ error: 'sleeper_league_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getServiceClient();

    // Fetch from Sleeper
    const league = await sleeper.getLeague(sleeper_league_id);
    const users = await sleeper.getLeagueUsers(sleeper_league_id);
    const rosters = await sleeper.getLeagueRosters(sleeper_league_id);

    // Create league
    const { data: leagueRow, error: leagueError } = await supabase
      .from('leagues')
      .upsert({
        sleeper_league_id,
        name: league.name,
        current_season: parseInt(league.season),
        scoring_settings: league.scoring_settings,
        settings: league.settings,
      }, { onConflict: 'sleeper_league_id' })
      .select()
      .single();

    if (leagueError) throw leagueError;
    const leagueId = leagueRow.id;

    // Create teams
    const userMap = new Map(users.map((u) => [u.user_id, u]));
    const teamUpserts = rosters.map((roster) => {
      const u = userMap.get(roster.owner_id);
      return {
        league_id: leagueId,
        sleeper_roster_id: roster.roster_id,
        sleeper_user_id: roster.owner_id,
        team_name: u?.display_name || `Team ${roster.roster_id}`,
        owner_name: u?.display_name || `Owner ${roster.roster_id}`,
        avatar_url: u?.avatar ? `https://sleepercdn.com/avatars/thumbs/${u.avatar}` : null,
      };
    });

    const { data: teams } = await supabase
      .from('teams')
      .upsert(teamUpserts, { onConflict: 'league_id,sleeper_roster_id' })
      .select();

    // Register league
    await supabase
      .from('league_registration')
      .upsert({ league_id: leagueId, registered_by: user.id }, { onConflict: 'league_id' });

    // Make the initializer a commissioner
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('sleeper_user_id')
      .eq('id', user.id)
      .single();

    const myTeam = (teams || []).find((t: any) => t.sleeper_user_id === profile?.sleeper_user_id);
    if (myTeam) {
      await supabase
        .from('league_commissioners')
        .upsert({
          league_id: leagueId,
          team_id: myTeam.id,
          is_primary: true,
        }, { onConflict: 'league_id,team_id' });

      // Add as league member
      await supabase
        .from('league_members')
        .upsert({
          league_id: leagueId,
          user_id: user.id,
          team_id: myTeam.id,
          role: 'commissioner',
        }, { onConflict: 'league_id,user_id' });
    }

    // Create default rules
    await supabase
      .from('league_rules')
      .upsert({ league_id: leagueId }, { onConflict: 'league_id' });

    return new Response(
      JSON.stringify({
        success: true,
        league_id: leagueId,
        teams_created: teams?.length ?? 0,
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
