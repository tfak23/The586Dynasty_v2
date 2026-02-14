import { readSheet, writeSheet, clearRange, findInColumn, batchUpdate, appendRow } from './google-sheets.ts';
import { TEAM_TAB, MASTER_TAB, TRADES_TAB, getTabForOwner, OWNER_MAP, calculateSheetDeadCap } from './sheet-mapping.ts';

const DEFAULT_SHEET_ID = Deno.env.get('GOOGLE_SPREADSHEET_ID') ?? '1ic6SUzsm-ehUIjCge3RaQdTkX-Gbdjns-c2t9Gj-F_k';

export function getSpreadsheetId(): string {
  return Deno.env.get('GOOGLE_SPREADSHEET_ID') ?? DEFAULT_SHEET_ID;
}

/**
 * Remove a player from their team's tab and master roster
 */
export async function removePlayer(
  playerName: string,
  ownerSleeperUsername: string,
  spreadsheetId?: string
): Promise<{ success: boolean; error?: string }> {
  const sheetId = spreadsheetId ?? getSpreadsheetId();

  try {
    const tab = getTabForOwner(ownerSleeperUsername);
    if (!tab) return { success: false, error: `No tab found for ${ownerSleeperUsername}` };

    // Find player in team tab
    const players = await readSheet(sheetId, TEAM_TAB.PLAYERS_RANGE(tab));
    const rowIndex = players.findIndex(
      (row) => row[0]?.toLowerCase().trim() === playerName.toLowerCase().trim()
    );

    if (rowIndex === -1) {
      return { success: false, error: `Player "${playerName}" not found on ${tab}'s roster` };
    }

    // Clear the player row (name + salary columns)
    const actualRow = rowIndex + 3; // B3 is row 3
    await clearRange(sheetId, `'${tab}'!B${actualRow}:H${actualRow}`);

    return { success: true };
  } catch (err) {
    return { success: false, error: `Sheet operation failed: ${err.message}` };
  }
}

/**
 * Add a player to a team's tab
 */
export async function addPlayer(
  playerName: string,
  ownerSleeperUsername: string,
  salaries: number[], // [2026, 2027, 2028, 2029, 2030]
  spreadsheetId?: string
): Promise<{ success: boolean; error?: string }> {
  const sheetId = spreadsheetId ?? getSpreadsheetId();

  try {
    const tab = getTabForOwner(ownerSleeperUsername);
    if (!tab) return { success: false, error: `No tab found for ${ownerSleeperUsername}` };

    // Find first empty row in team tab
    const players = await readSheet(sheetId, TEAM_TAB.PLAYERS_RANGE(tab));
    let emptyRow = -1;
    for (let i = 0; i < 35; i++) {
      if (!players[i] || !players[i][0] || players[i][0].trim() === '') {
        emptyRow = i;
        break;
      }
    }

    if (emptyRow === -1) {
      return { success: false, error: `No empty roster slot on ${tab}'s tab` };
    }

    const actualRow = emptyRow + 3;
    const rowData: (string | number)[] = [playerName, ...salaries];

    // Pad salaries to 6 columns
    while (rowData.length < 7) rowData.push('');

    await writeSheet(sheetId, `'${tab}'!B${actualRow}:H${actualRow}`, [rowData]);

    return { success: true };
  } catch (err) {
    return { success: false, error: `Sheet operation failed: ${err.message}` };
  }
}

/**
 * Execute a trade on the sheet (move players between tabs)
 */
export async function executeTrade(
  team1SleeperUsername: string,
  team2SleeperUsername: string,
  team1Receives: { playerName: string; salary: number; years: number }[],
  team2Receives: { playerName: string; salary: number; years: number }[],
  tradeNumber: string,
  spreadsheetId?: string
): Promise<{ success: boolean; errors: string[] }> {
  const sheetId = spreadsheetId ?? getSpreadsheetId();
  const errors: string[] = [];

  // Remove players from original teams
  for (const asset of team2Receives) {
    const result = await removePlayer(asset.playerName, team1SleeperUsername, sheetId);
    if (!result.success) errors.push(result.error!);
  }

  for (const asset of team1Receives) {
    const result = await removePlayer(asset.playerName, team2SleeperUsername, sheetId);
    if (!result.success) errors.push(result.error!);
  }

  // Add players to new teams
  for (const asset of team1Receives) {
    const salaries = new Array(5).fill(0);
    for (let i = 0; i < asset.years; i++) {
      salaries[i] = asset.salary;
    }
    const result = await addPlayer(asset.playerName, team1SleeperUsername, salaries, sheetId);
    if (!result.success) errors.push(result.error!);
  }

  for (const asset of team2Receives) {
    const salaries = new Array(5).fill(0);
    for (let i = 0; i < asset.years; i++) {
      salaries[i] = asset.salary;
    }
    const result = await addPlayer(asset.playerName, team2SleeperUsername, salaries, sheetId);
    if (!result.success) errors.push(result.error!);
  }

  return { success: errors.length === 0, errors };
}

/**
 * Full reconciliation: read DB contracts, overwrite sheet
 */
export async function fullReconciliation(
  contracts: {
    playerName: string;
    ownerSleeperUsername: string;
    salary: number;
    yearsRemaining: number;
    position: string;
  }[],
  spreadsheetId?: string
): Promise<{ success: boolean; teamsUpdated: number; errors: string[] }> {
  const sheetId = spreadsheetId ?? getSpreadsheetId();
  const errors: string[] = [];
  let teamsUpdated = 0;

  // Group contracts by owner
  const byOwner = new Map<string, typeof contracts>();
  for (const c of contracts) {
    if (!byOwner.has(c.ownerSleeperUsername)) {
      byOwner.set(c.ownerSleeperUsername, []);
    }
    byOwner.get(c.ownerSleeperUsername)!.push(c);
  }

  // Write each team tab
  for (const [sleeperUsername, teamContracts] of byOwner) {
    const tab = getTabForOwner(sleeperUsername);
    if (!tab) {
      errors.push(`No tab for ${sleeperUsername}`);
      continue;
    }

    try {
      // Clear existing roster
      await clearRange(sheetId, TEAM_TAB.FULL_RANGE(tab));

      // Build rows
      const rows: (string | number)[][] = teamContracts
        .sort((a, b) => b.salary - a.salary)
        .map((c) => {
          const salaries: number[] = [];
          for (let i = 0; i < 5; i++) {
            salaries.push(i < c.yearsRemaining ? c.salary : 0);
          }
          return [c.playerName, ...salaries];
        });

      if (rows.length > 0) {
        await writeSheet(sheetId, `'${tab}'!B3:H${3 + rows.length - 1}`, rows);
      }

      teamsUpdated++;
    } catch (err) {
      errors.push(`Failed to update ${tab}: ${err.message}`);
    }
  }

  return { success: errors.length === 0, teamsUpdated, errors };
}
