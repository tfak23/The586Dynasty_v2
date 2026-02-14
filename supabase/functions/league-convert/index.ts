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

    const { sleeper_league_id } = await req.json();

    // This is the same as initialize-league for now
    // In the future, convert will handle migrating existing data
    const initUrl = new URL(req.url);
    initUrl.pathname = initUrl.pathname.replace('league-convert', 'initialize-league');

    const initRes = await fetch(initUrl.toString(), {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify({ sleeper_league_id }),
    });

    const result = await initRes.json();
    return new Response(JSON.stringify(result), {
      status: initRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
