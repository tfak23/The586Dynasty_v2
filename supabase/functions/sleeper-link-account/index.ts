import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getServiceClient, getUserFromRequest } from '../_shared/supabase-client.ts';
import { getUser } from '../_shared/sleeper-client.ts';

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

    const { username } = await req.json();
    if (!username) {
      return new Response(JSON.stringify({ error: 'Username required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify username exists on Sleeper
    let sleeperUser;
    try {
      sleeperUser = await getUser(username);
    } catch {
      return new Response(JSON.stringify({ error: 'SLEEPER_USER_NOT_FOUND' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!sleeperUser || !sleeperUser.user_id) {
      return new Response(JSON.stringify({ error: 'SLEEPER_USER_NOT_FOUND' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getServiceClient();

    // Check if sleeper username is already taken
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('sleeper_username', username)
      .neq('id', user.id)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ error: 'SLEEPER_USERNAME_TAKEN' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update user profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        sleeper_username: username,
        sleeper_user_id: sleeperUser.user_id,
        display_name: sleeperUser.display_name || username,
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        sleeper_user_id: sleeperUser.user_id,
        display_name: sleeperUser.display_name,
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
