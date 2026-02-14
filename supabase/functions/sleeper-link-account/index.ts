import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json();
    const { action } = body;
    const supabase = getServiceClient();

    switch (action) {
      case 'find-team': {
        const { sleeper_username, sleeper_user_id, display_name } = body;

        // Try matching by owner_name (sleeper username)
        let teamId: string | null = null;

        const { data: t1 } = await supabase
          .from('teams')
          .select('id')
          .eq('owner_name', sleeper_username)
          .single();
        teamId = t1?.id ?? null;

        // Try by sleeper_user_id
        if (!teamId) {
          const { data: t2 } = await supabase
            .from('teams')
            .select('id')
            .eq('sleeper_user_id', sleeper_user_id)
            .single();
          teamId = t2?.id ?? null;
        }

        // Try by display name
        if (!teamId && display_name) {
          const { data: t3 } = await supabase
            .from('teams')
            .select('id')
            .eq('owner_name', display_name)
            .single();
          teamId = t3?.id ?? null;
        }

        return new Response(
          JSON.stringify({ team_id: teamId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'complete-onboarding': {
        const { user_id, sleeper_username, sleeper_user_id, display_name, team_id } = body;

        if (!user_id || !sleeper_username) {
          return new Response(
            JSON.stringify({ error: 'user_id and sleeper_username required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update user profile
        const { error: profileErr } = await supabase
          .from('user_profiles')
          .update({
            sleeper_username,
            sleeper_user_id,
            display_name,
            onboarding_completed: true,
          })
          .eq('id', user_id);

        if (profileErr) {
          return new Response(
            JSON.stringify({ error: profileErr.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Link user to team
        if (team_id) {
          await supabase
            .from('teams')
            .update({ user_id })
            .eq('id', team_id);

          // Add to league_members
          const { data: team } = await supabase
            .from('teams')
            .select('league_id')
            .eq('id', team_id)
            .single();

          if (team?.league_id) {
            await supabase
              .from('league_members')
              .upsert({
                league_id: team.league_id,
                user_id,
                role: 'member',
              }, { onConflict: 'league_id,user_id' });
          }
        }

        return new Response(
          JSON.stringify({ success: true, team_id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Legacy action (original flow)
      default: {
        const { username } = body;
        if (!username) {
          return new Response(
            JSON.stringify({ error: 'Username or action required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify on Sleeper
        const res = await fetch(`https://api.sleeper.app/v1/user/${username}`);
        if (!res.ok) {
          return new Response(
            JSON.stringify({ error: 'SLEEPER_USER_NOT_FOUND' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const sleeperUser = await res.json();
        if (!sleeperUser?.user_id) {
          return new Response(
            JSON.stringify({ error: 'SLEEPER_USER_NOT_FOUND' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            sleeper_user_id: sleeperUser.user_id,
            display_name: sleeperUser.display_name,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
