import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { readSheet } from '../_shared/google-sheets.ts';
import { fullReconciliation, getSpreadsheetId } from '../_shared/sheet-operations.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json();
    const { action, spreadsheet_id } = body;
    const supabase = getServiceClient();
    const sheetId = spreadsheet_id ?? getSpreadsheetId();

    switch (action) {
      case 'test-connection': {
        // Test read from sheet
        const data = await readSheet(sheetId, "B1:B13");
        return new Response(
          JSON.stringify({ success: true, sample: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'read-tab': {
        const r = body.range || `'${body.tab || 'Tony'}'!A1:Z50`;
        const data = await readSheet(sheetId, r);
        return new Response(
          JSON.stringify({ success: true, range: r, rows: data.length, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'full-reconciliation': {
        // Read all active contracts from DB
        const { data: contracts, error } = await supabase
          .from('contracts')
          .select(`
            id, salary, years_remaining,
            player:players(full_name, position),
            team:teams(sleeper_user_id, owner_name)
          `)
          .eq('status', 'active');

        if (error) throw error;

        const contractsForSheet = (contracts || []).map((c: any) => ({
          playerName: c.player?.full_name ?? 'Unknown',
          ownerSleeperUsername: c.team?.sleeper_user_id ?? '',
          salary: c.salary,
          yearsRemaining: c.years_remaining,
          position: c.player?.position ?? '',
        }));

        const result = await fullReconciliation(contractsForSheet, sheetId);

        // Log sync
        await supabase.from('sync_log').insert({
          sync_type: 'sheet_sync',
          status: result.success ? 'success' : 'partial',
          details: {
            action: 'full-reconciliation',
            teams_updated: result.teamsUpdated,
            errors: result.errors,
          },
          rows_affected: contractsForSheet.length,
          error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
        });

        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'differential-sync': {
        // Compare DB vs Sheet, log differences
        // For now, just run full reconciliation
        // TODO: Implement true differential sync
        const { data: contracts, error } = await supabase
          .from('contracts')
          .select(`
            id, salary, years_remaining,
            player:players(full_name, position),
            team:teams(sleeper_user_id)
          `)
          .eq('status', 'active');

        if (error) throw error;

        const contractsForSheet = (contracts || []).map((c: any) => ({
          playerName: c.player?.full_name ?? 'Unknown',
          ownerSleeperUsername: c.team?.sleeper_user_id ?? '',
          salary: c.salary,
          yearsRemaining: c.years_remaining,
          position: c.player?.position ?? '',
        }));

        const result = await fullReconciliation(contractsForSheet, sheetId);

        return new Response(
          JSON.stringify({ ...result, mode: 'differential' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
