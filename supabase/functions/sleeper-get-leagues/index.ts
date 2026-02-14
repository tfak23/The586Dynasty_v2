import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getServiceClient, getUserFromRequest } from '../_shared/supabase-client.ts';
import { getUserLeagues } from '../_shared/sleeper-client.ts';

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

    const supabase = getServiceClient();

    // Get user's Sleeper ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('sleeper_user_id')
      .eq('id', user.id)
      .single();

    if (!profile?.sleeper_user_id) {
      return new Response(JSON.stringify({ error: 'Sleeper account not linked' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch leagues from Sleeper
    const sleeperLeagues = await getUserLeagues(profile.sleeper_user_id, '2025');

    // Check registration status for each league
    const { data: registrations } = await supabase
      .from('league_registration')
      .select('league_id, leagues(sleeper_league_id)')
      .eq('is_active', true);

    const registeredIds = new Set(
      (registrations || []).map((r: any) => r.leagues?.sleeper_league_id)
    );

    // Check membership
    const { data: memberships } = await supabase
      .from('league_members')
      .select('league_id, leagues(sleeper_league_id)')
      .eq('user_id', user.id);

    const memberIds = new Set(
      (memberships || []).map((m: any) => m.leagues?.sleeper_league_id)
    );

    const leagues = sleeperLeagues.map((sl) => ({
      league_id: sl.league_id,
      name: sl.name,
      total_rosters: sl.total_rosters,
      season: sl.season,
      registered: registeredIds.has(sl.league_id),
      is_member: memberIds.has(sl.league_id),
      status: memberIds.has(sl.league_id)
        ? 'view'
        : registeredIds.has(sl.league_id)
          ? 'join'
          : 'convert',
    }));

    return new Response(JSON.stringify({ leagues }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
