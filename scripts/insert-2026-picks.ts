/**
 * Insert 2026 draft picks into Supabase from Google Sheet data.
 * Run with: npx tsx scripts/insert-2026-picks.ts
 */

const SUPABASE_URL = 'https://dqkdsrrgmjmbguqtjgih.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const LEAGUE_ID = '2fc5bc73-5121-4832-8284-9eb7286cad9f';

// Team IDs from DB (owner_name = Sleeper username)
const TEAMS: Record<string, string> = {
  abhanot11: 'feb1ac99-6917-42ae-aded-a96c274fd7e0',
  bigwily57: '1d9ab6eb-0576-48a9-9dfe-c60eac45ece5',
  brcarnag: 'c13509c6-9095-47e2-9348-bec10e7da3d4',
  CanThePan: 'bb301c75-8b83-4f77-9692-4b7bd966c9af',
  DomDuhBomb: '32c8fece-cc88-4ab7-8936-35d685d2dbc1',
  Gazarato: '5d61b4e5-c438-4339-a183-33d60a9131f8',
  Klucido08: '6801e0a2-d75c-4c8f-8d32-494bf8feecbe',
  miket1326: '2b3b6065-4b8c-4770-aa6a-ec0d6c8d536c',
  NickDnof: 'c3df1fef-e2eb-4d14-be5e-f89680265ba2',
  TonyFF: '225842ae-3efe-44ce-8078-bd270211ead8',
  TrevorH42: '671de8dc-0a1e-4575-952d-eac3d9c847df',
  zachg1313: 'd0497208-cfb9-4303-a58d-f66011c0f81f',
};

// Full name -> Sleeper username
const NAME_TO_SLEEPER: Record<string, string> = {
  'Akshay Bhanot': 'abhanot11',
  'Brian Carnaghi': 'brcarnag',
  'Dan Carnaghi': 'CanThePan',
  'Dominic Puzzuoli': 'DomDuhBomb',
  'James Gazarato': 'Gazarato',
  'Karl Lucido': 'Klucido08',
  "Nick D'Onofrio": 'NickDnof',
  'Tony Fakhouri': 'TonyFF',
  'Trevor Hurd': 'TrevorH42',
  'Mike Trudel': 'miket1326',
  'Jimmy Wilson': 'bigwily57',
  'Zach Gravatas': 'zachg1313',
};

// 2026 draft order based on 2025 final standings (worst to best)
// Place 12: Dan, 11: Tony (Vinny's old team), 10: Dom, 9: Nick,
// 8: Trevor, 7: Jamie, 6: Karl, 5: Willy, 4: Trudy, 3: Akshay, 2: Zach, 1: Brian
const DRAFT_ORDER: string[] = [
  'CanThePan',   // 1st pick (Dan - 12th place)
  'TonyFF',      // 2nd pick (Tony/Vinny - 11th place)
  'DomDuhBomb',  // 3rd pick (Dom - 10th)
  'NickDnof',    // 4th pick (Nick - 9th)
  'TrevorH42',   // 5th pick (Trevor - 8th)
  'Gazarato',    // 6th pick (Jamie - 7th)
  'Klucido08',   // 7th pick (Karl - 6th)
  'bigwily57',   // 8th pick (Willy - 5th)
  'miket1326',   // 9th pick (Trudy - 4th)
  'abhanot11',   // 10th pick (Akshay - 3rd)
  'zachg1313',   // 11th pick (Zach - 2nd)
  'brcarnag',    // 12th pick (Brian - 1st)
];

// Current ownership from Google Sheet (Master Roster R395:AD430)
// Maps pick slot (1-36) to current owner full name
const PICK_CURRENT_OWNERS: Record<number, string> = {
  // Round 1
  1: 'Dan Carnaghi', 2: 'Tony Fakhouri', 3: 'Dominic Puzzuoli', 4: 'Dominic Puzzuoli',
  5: 'Dan Carnaghi', 6: 'Tony Fakhouri', 7: 'Karl Lucido', 8: 'Jimmy Wilson',
  9: 'Dan Carnaghi', 10: 'Akshay Bhanot', 11: 'Tony Fakhouri', 12: 'Dominic Puzzuoli',
  // Round 2
  13: "Nick D'Onofrio", 14: 'Tony Fakhouri', 15: 'Brian Carnaghi', 16: 'Tony Fakhouri',
  17: "Nick D'Onofrio", 18: 'James Gazarato', 19: 'Karl Lucido', 20: 'Jimmy Wilson',
  21: 'Jimmy Wilson', 22: 'Tony Fakhouri', 23: 'Tony Fakhouri', 24: 'Brian Carnaghi',
  // Round 3
  25: 'Dan Carnaghi', 26: 'Tony Fakhouri', 27: 'Dominic Puzzuoli', 28: 'Jimmy Wilson',
  29: 'Trevor Hurd', 30: "Nick D'Onofrio", 31: 'Karl Lucido', 32: 'Jimmy Wilson',
  33: 'Mike Trudel', 34: 'Karl Lucido', 35: 'Dan Carnaghi', 36: 'Trevor Hurd',
};

// Salary values per pick slot
const PICK_SALARIES: Record<number, number> = {
  1: 45, 2: 38, 3: 32, 4: 27, 5: 23, 6: 19, 7: 16, 8: 14, 9: 13, 10: 12, 11: 11, 12: 10,
  13: 9, 14: 9, 15: 9, 16: 8, 17: 8, 18: 8, 19: 7, 20: 7, 21: 6, 22: 6, 23: 5, 24: 5,
  25: 1, 26: 1, 27: 1, 28: 1, 29: 1, 30: 1, 31: 1, 32: 1, 33: 1, 34: 1, 35: 1, 36: 1,
};

async function main() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('Set SUPABASE_SERVICE_ROLE_KEY env var');
    process.exit(1);
  }

  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  // Check if 2026 picks already exist
  const existingRes = await fetch(
    `${SUPABASE_URL}/rest/v1/draft_picks?league_id=eq.${LEAGUE_ID}&season=eq.2026&select=id`,
    { headers }
  );
  const existing = await existingRes.json() as unknown[];
  if (existing.length > 0) {
    console.log(`${existing.length} picks already exist for 2026. Deleting first...`);
    const delRes = await fetch(
      `${SUPABASE_URL}/rest/v1/draft_picks?league_id=eq.${LEAGUE_ID}&season=eq.2026`,
      { method: 'DELETE', headers }
    );
    if (!delRes.ok) {
      console.error('Delete failed:', await delRes.text());
      process.exit(1);
    }
    console.log('Deleted existing 2026 picks.');
  }

  // Build insert rows: 3 rounds x 12 picks
  const rows = [];
  for (let pickSlot = 1; pickSlot <= 36; pickSlot++) {
    const round = pickSlot <= 12 ? 1 : pickSlot <= 24 ? 2 : 3;
    const pickInRound = ((pickSlot - 1) % 12); // 0-indexed position in round
    const originalTeamSleeper = DRAFT_ORDER[pickInRound];
    const originalTeamId = TEAMS[originalTeamSleeper];

    const currentOwnerName = PICK_CURRENT_OWNERS[pickSlot];
    const currentOwnerSleeper = NAME_TO_SLEEPER[currentOwnerName];
    const currentTeamId = TEAMS[currentOwnerSleeper];

    if (!originalTeamId || !currentTeamId) {
      console.error(`Missing team ID for pick ${pickSlot}: original=${originalTeamSleeper}, current=${currentOwnerSleeper}`);
      process.exit(1);
    }

    rows.push({
      league_id: LEAGUE_ID,
      season: 2026,
      round,
      pick_number: pickSlot,
      original_team_id: originalTeamId,
      current_team_id: currentTeamId,
      is_used: false,
      salary: PICK_SALARIES[pickSlot],
    });
  }

  console.log(`Inserting ${rows.length} draft picks for 2026...`);

  const insertRes = await fetch(
    `${SUPABASE_URL}/rest/v1/draft_picks`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(rows),
    }
  );

  if (!insertRes.ok) {
    const err = await insertRes.text();
    console.error('Insert failed:', insertRes.status, err);
    process.exit(1);
  }

  const inserted = await insertRes.json();
  console.log(`Successfully inserted ${(inserted as unknown[]).length} draft picks for 2026!`);
}

main().catch(console.error);
