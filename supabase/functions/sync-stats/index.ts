import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { getPlayerStats } from '../_shared/sleeper-client.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { season = '2025' } = await req.json().catch(() => ({}));
    const supabase = getServiceClient();

    // Fetch season stats from Sleeper
    const stats = await getPlayerStats(season);

    // Get all player IDs in our DB
    const { data: dbPlayers } = await supabase
      .from('players')
      .select('id')
      .in('position', ['QB', 'RB', 'WR', 'TE']);

    const playerIds = new Set((dbPlayers || []).map((p: any) => p.id));

    // Calculate PPR points and update
    const batchSize = 500;
    const updates: any[] = [];

    for (const [playerId, playerStats] of Object.entries(stats)) {
      if (!playerIds.has(playerId)) continue;

      // Calculate PPR fantasy points
      const s = playerStats as Record<string, number>;
      const pts =
        (s.pass_yd || 0) * 0.04 +
        (s.pass_td || 0) * 4 +
        (s.pass_int || 0) * -1 +
        (s.rush_yd || 0) * 0.1 +
        (s.rush_td || 0) * 6 +
        (s.rec || 0) * 1 + // PPR
        (s.rec_yd || 0) * 0.1 +
        (s.rec_td || 0) * 6 +
        (s.fum_lost || 0) * -2;

      const gp = s.gp || s.gms_active || 0;

      updates.push({
        id: playerId,
        fantasy_points_2025: Math.round(pts * 100) / 100,
        games_played_2025: gp,
        ppg_2025: gp > 0 ? Math.round((pts / gp) * 100) / 100 : 0,
      });
    }

    // Batch upsert
    let totalUpdated = 0;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const { error } = await supabase
        .from('players')
        .upsert(batch, { onConflict: 'id' });

      if (!error) totalUpdated += batch.length;
    }

    await supabase.from('sync_log').insert({
      sync_type: 'stats',
      status: 'success',
      details: { season, total_stats: Object.keys(stats).length },
      rows_affected: totalUpdated,
    });

    return new Response(
      JSON.stringify({
        success: true,
        season,
        players_updated: totalUpdated,
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
