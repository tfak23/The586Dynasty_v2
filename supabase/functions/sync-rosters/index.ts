import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import * as sleeper from '../_shared/sleeper-client.ts';
import { removePlayer } from '../_shared/sheet-operations.ts';

const LEAGUE_ID = '1315789488873553920';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getServiceClient();

    // Get league from DB
    const { data: league } = await supabase
      .from('leagues')
      .select('id')
      .eq('sleeper_league_id', LEAGUE_ID)
      .single();

    if (!league) {
      return new Response(JSON.stringify({ error: 'League not found in DB. Run sync-league first.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const leagueId = league.id;

    // Fetch current rosters from Sleeper
    const rosters = await sleeper.getLeagueRosters(LEAGUE_ID);

    // Get teams from DB
    const { data: teams } = await supabase
      .from('teams')
      .select('id, sleeper_roster_id, sleeper_user_id')
      .eq('league_id', leagueId);

    const teamMap = new Map((teams || []).map((t: any) => [t.sleeper_roster_id, t]));

    // Get all active contracts
    const { data: activeContracts } = await supabase
      .from('contracts')
      .select('id, player_id, team_id, salary, years_remaining')
      .eq('league_id', leagueId)
      .eq('status', 'active');

    const contractsByPlayer = new Map(
      (activeContracts || []).map((c: any) => [c.player_id, c])
    );

    // Detect drops: players with active contracts not on any Sleeper roster
    const allSleeperPlayerIds = new Set<string>();
    for (const roster of rosters) {
      for (const playerId of roster.players || []) {
        allSleeperPlayerIds.add(playerId);
      }
    }

    const drops: any[] = [];
    const sheetErrors: string[] = [];

    for (const contract of activeContracts || []) {
      if (!allSleeperPlayerIds.has(contract.player_id)) {
        drops.push(contract);

        // Release contract in DB (creates dead cap)
        try {
          await supabase.rpc('release_contract', {
            p_contract_id: contract.id,
            p_reason: 'Dropped from Sleeper roster',
          });
        } catch (err) {
          console.error(`Failed to release contract ${contract.id}:`, err);
        }

        // Try to update Google Sheet (never block DB operations)
        try {
          const team = teamMap.get(contract.team_id);
          if (team) {
            const { data: player } = await supabase
              .from('players')
              .select('full_name')
              .eq('id', contract.player_id)
              .single();

            if (player) {
              await removePlayer(player.full_name, team.sleeper_user_id);
            }
          }
        } catch (sheetErr) {
          sheetErrors.push(`Sheet update failed for player ${contract.player_id}: ${sheetErr.message}`);
        }
      }
    }

    // Log sync
    await supabase.from('sync_log').insert({
      league_id: leagueId,
      sync_type: 'sleeper_rosters',
      status: sheetErrors.length > 0 ? 'partial' : 'success',
      details: {
        rosters_checked: rosters.length,
        drops_detected: drops.length,
        sheet_errors: sheetErrors,
      },
      rows_affected: drops.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        drops_detected: drops.length,
        sheet_errors: sheetErrors,
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
