import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getServiceClient, getUserFromRequest } from '../_shared/supabase-client.ts';

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

    const { league_id } = await req.json();
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

    // Find user's team in the league
    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('league_id', league_id)
      .eq('sleeper_user_id', profile.sleeper_user_id)
      .single();

    if (!team) {
      return new Response(JSON.stringify({ error: 'No team found for your Sleeper account in this league' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Add as league member
    const { error } = await supabase
      .from('league_members')
      .upsert({
        league_id,
        user_id: user.id,
        team_id: team.id,
        role: 'member',
      }, { onConflict: 'league_id,user_id' });

    if (error) throw error;

    // Link team to user
    await supabase
      .from('teams')
      .update({ user_id: user.id })
      .eq('id', team.id);

    // Mark onboarding complete
    await supabase
      .from('user_profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id);

    return new Response(
      JSON.stringify({ success: true, team_id: team.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
