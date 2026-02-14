import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { league_id, contracts } = await req.json();
    const supabase = getServiceClient();

    if (!league_id || !contracts || !Array.isArray(contracts)) {
      return new Response(JSON.stringify({ error: 'league_id and contracts array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let imported = 0;
    let errors: string[] = [];

    for (const c of contracts) {
      try {
        // Look up player by name
        const { data: player } = await supabase
          .from('players')
          .select('id')
          .ilike('full_name', c.player_name)
          .single();

        if (!player) {
          errors.push(`Player not found: ${c.player_name}`);
          continue;
        }

        // Look up team
        const { data: team } = await supabase
          .from('teams')
          .select('id')
          .eq('league_id', league_id)
          .ilike('owner_name', c.owner_name)
          .single();

        if (!team) {
          errors.push(`Team not found for owner: ${c.owner_name}`);
          continue;
        }

        const { error } = await supabase
          .from('contracts')
          .insert({
            league_id,
            team_id: team.id,
            player_id: player.id,
            salary: c.salary,
            years_total: c.years_total || c.years_remaining,
            years_remaining: c.years_remaining,
            start_season: c.start_season || 2025,
            end_season: (c.start_season || 2025) + (c.years_remaining - 1),
            contract_type: c.contract_type || 'standard',
            status: 'active',
            acquisition_type: c.acquisition_type || 'free_agent',
          });

        if (error) {
          errors.push(`Failed to import ${c.player_name}: ${error.message}`);
        } else {
          imported++;
        }
      } catch (err) {
        errors.push(`Error processing ${c.player_name}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, imported, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
