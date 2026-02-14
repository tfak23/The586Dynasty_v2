import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { getAllPlayers } from '../_shared/sleeper-client.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getServiceClient();

    // Fetch all NFL players from Sleeper (~10k players)
    const allPlayers = await getAllPlayers();
    const positions = new Set(['QB', 'RB', 'WR', 'TE']);

    // Filter to relevant positions
    const relevantPlayers = Object.values(allPlayers).filter(
      (p) => p.position && positions.has(p.position)
    );

    // Batch upsert (500 at a time)
    const batchSize = 500;
    let totalUpserted = 0;

    for (let i = 0; i < relevantPlayers.length; i += batchSize) {
      const batch = relevantPlayers.slice(i, i + batchSize).map((p) => ({
        id: p.player_id,
        sleeper_player_id: p.player_id,
        full_name: p.full_name || `${p.first_name} ${p.last_name}`,
        first_name: p.first_name,
        last_name: p.last_name,
        position: p.position,
        team: p.team,
        age: p.age,
        years_exp: p.years_exp,
        status: p.status || 'Active',
        search_full_name: (p.search_full_name || p.full_name || '').toLowerCase(),
        search_last_name: (p.search_last_name || p.last_name || '').toLowerCase(),
      }));

      const { error } = await supabase
        .from('players')
        .upsert(batch, { onConflict: 'sleeper_player_id' });

      if (error) {
        console.error(`Batch ${i} error:`, error);
      } else {
        totalUpserted += batch.length;
      }
    }

    // Log sync
    await supabase.from('sync_log').insert({
      sync_type: 'players',
      status: 'success',
      details: { total_players: relevantPlayers.length },
      rows_affected: totalUpserted,
    });

    return new Response(
      JSON.stringify({
        success: true,
        total_players: relevantPlayers.length,
        upserted: totalUpserted,
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
