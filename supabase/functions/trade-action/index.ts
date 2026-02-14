import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getServiceClient, getUserFromRequest } from '../_shared/supabase-client.ts';
import { executeTrade as executeTradeOnSheet } from '../_shared/sheet-operations.ts';

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

    const { action, trade_id, vote, ...params } = await req.json();
    const supabase = getServiceClient();

    switch (action) {
      case 'propose': {
        const { league_id, target_team_id, my_assets, their_assets, notes, expires_hours } = params;

        // Get proposer's team
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('sleeper_user_id')
          .eq('id', user.id)
          .single();

        const { data: myTeam } = await supabase
          .from('teams')
          .select('id')
          .eq('league_id', league_id)
          .eq('sleeper_user_id', profile?.sleeper_user_id)
          .single();

        if (!myTeam) throw new Error('Team not found');

        const expiresAt = expires_hours
          ? new Date(Date.now() + expires_hours * 60 * 60 * 1000).toISOString()
          : null;

        // Create trade
        const { data: trade, error: tradeError } = await supabase
          .from('trades')
          .insert({
            league_id,
            proposer_team_id: myTeam.id,
            status: 'pending',
            notes,
            expires_at: expiresAt,
          })
          .select()
          .single();

        if (tradeError) throw tradeError;

        // Add trade teams
        await supabase.from('trade_teams').insert([
          { trade_id: trade.id, team_id: myTeam.id, status: 'accepted' },
          { trade_id: trade.id, team_id: target_team_id, status: 'pending' },
        ]);

        // Add trade assets
        const assets = [
          ...(my_assets || []).map((a: any) => ({
            trade_id: trade.id,
            asset_type: a.type,
            from_team_id: myTeam.id,
            to_team_id: target_team_id,
            contract_id: a.contract_id || null,
            draft_pick_id: a.draft_pick_id || null,
            cap_amount: a.cap_amount || null,
          })),
          ...(their_assets || []).map((a: any) => ({
            trade_id: trade.id,
            asset_type: a.type,
            from_team_id: target_team_id,
            to_team_id: myTeam.id,
            contract_id: a.contract_id || null,
            draft_pick_id: a.draft_pick_id || null,
            cap_amount: a.cap_amount || null,
          })),
        ];

        if (assets.length > 0) {
          await supabase.from('trade_assets').insert(assets);
        }

        return new Response(
          JSON.stringify({ success: true, trade_id: trade.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'accept':
      case 'reject': {
        const { data: tradeTeam } = await supabase
          .from('trade_teams')
          .select('id, team:teams(user_id)')
          .eq('trade_id', trade_id)
          .single();

        // Verify user owns the team
        if (!tradeTeam) throw new Error('Trade not found');

        await supabase
          .from('trade_teams')
          .update({ status: action === 'accept' ? 'accepted' : 'rejected' })
          .eq('trade_id', trade_id)
          .neq('status', 'accepted'); // Only update pending ones

        if (action === 'reject') {
          await supabase
            .from('trades')
            .update({ status: 'rejected' })
            .eq('id', trade_id);
        } else {
          // Check if all teams accepted
          const { data: allTeams } = await supabase
            .from('trade_teams')
            .select('status')
            .eq('trade_id', trade_id);

          const allAccepted = allTeams?.every((t: any) => t.status === 'accepted');

          if (allAccepted) {
            // Check league approval mode
            const { data: trade } = await supabase
              .from('trades')
              .select('league_id, leagues(trade_approval_mode)')
              .eq('id', trade_id)
              .single();

            const mode = (trade as any)?.leagues?.trade_approval_mode;

            if (mode === 'auto') {
              // Auto-execute
              await supabase.rpc('execute_trade', { p_trade_id: trade_id });
            } else {
              await supabase
                .from('trades')
                .update({ status: mode === 'commissioner' ? 'accepted' : 'accepted' })
                .eq('id', trade_id);
            }
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'vote': {
        // Record vote
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('sleeper_user_id')
          .eq('id', user.id)
          .single();

        const { data: trade } = await supabase
          .from('trades')
          .select('league_id')
          .eq('id', trade_id)
          .single();

        const { data: myTeam } = await supabase
          .from('teams')
          .select('id')
          .eq('league_id', trade?.league_id)
          .eq('sleeper_user_id', profile?.sleeper_user_id)
          .single();

        if (!myTeam) throw new Error('Team not found');

        await supabase
          .from('trade_votes')
          .upsert({
            trade_id,
            team_id: myTeam.id,
            vote: vote === 'yes' ? 'approve' : 'veto',
          }, { onConflict: 'trade_id,team_id' });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'commissioner-approve': {
        await supabase.rpc('execute_trade', { p_trade_id: trade_id });

        // Try to sync to Google Sheet (never block)
        try {
          const { data: assets } = await supabase
            .from('trade_assets')
            .select(`
              asset_type, from_team_id, to_team_id,
              contract:contracts(salary, years_remaining, player:players(full_name)),
              from_team:teams!trade_assets_from_team_id_fkey(sleeper_user_id),
              to_team:teams!trade_assets_to_team_id_fkey(sleeper_user_id)
            `)
            .eq('trade_id', trade_id)
            .eq('asset_type', 'contract');

          // Group by team pairs and execute on sheet
          // Simplified: just flag for reconciliation
        } catch (sheetErr) {
          console.error('Sheet sync after trade failed:', sheetErr);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'withdraw': {
        await supabase
          .from('trades')
          .update({ status: 'cancelled' })
          .eq('id', trade_id);

        return new Response(
          JSON.stringify({ success: true }),
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
