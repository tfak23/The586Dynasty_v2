// Google Sheet structure mapping
// Team tabs have player names in B3:B37, salaries in C:H (2026-2030+)
// Master Roster tab: R=Player, S=CON, T=POS, U-Y=Salary, Z=Owner, AA=Status

export const OWNER_MAP: Record<string, { tab: string; fullName: string; sleeper: string }> = {
  abhanot11:  { tab: 'Akshay', fullName: 'Akshay Bhanot',     sleeper: 'abhanot11' },
  brcarnag:   { tab: 'Brian',  fullName: 'Brian Carnaghi',    sleeper: 'brcarnag' },
  CanThePan:  { tab: 'Dan',    fullName: 'Dan Carnaghi',      sleeper: 'CanThePan' },
  DomDuhBomb: { tab: 'Dom',    fullName: 'Dominic Puzzuoli',  sleeper: 'DomDuhBomb' },
  Gazarato:   { tab: 'Jamie',  fullName: 'James Gazarato',    sleeper: 'Gazarato' },
  Klucido08:  { tab: 'Karl',   fullName: 'Karl Lucido',       sleeper: 'Klucido08' },
  NickDnof:   { tab: 'Nick',   fullName: "Nick D'Onofrio",    sleeper: 'NickDnof' },
  TonyFF:     { tab: 'Tony',   fullName: 'Tony Fakhouri',     sleeper: 'TonyFF' },
  TrevorH42:  { tab: 'Trevor', fullName: 'Trevor Hurd',       sleeper: 'TrevorH42' },
  miket1326:  { tab: 'Trudy',  fullName: 'Mike Trudel',       sleeper: 'miket1326' },
  bigwily57:  { tab: 'Willy',  fullName: 'Jimmy Wilson',      sleeper: 'bigwily57' },
  zachg1313:  { tab: 'Zach',   fullName: 'Zach Gravatas',     sleeper: 'zachg1313' },
};

// Get tab name from sleeper username
export function getTabForOwner(sleeperUsername: string): string | null {
  return OWNER_MAP[sleeperUsername]?.tab ?? null;
}

// Get tab name from full name
export function getTabForFullName(fullName: string): string | null {
  for (const owner of Object.values(OWNER_MAP)) {
    if (owner.fullName.toLowerCase() === fullName.toLowerCase()) {
      return owner.tab;
    }
  }
  return null;
}

// Team tab cell references
export const TEAM_TAB = {
  PLAYERS_RANGE: (tab: string) => `'${tab}'!B3:B37`,      // Player names
  SALARY_RANGE: (tab: string) => `'${tab}'!C3:H37`,       // Salary columns (2026-2030+)
  FULL_RANGE: (tab: string) => `'${tab}'!B3:H37`,         // Full player + salary
  CAP_HITS_RANGE: (tab: string) => `'${tab}'!R10:W37`,    // Cap adjustments
};

// Master Roster tab
export const MASTER_TAB = {
  FULL_RANGE: "'Master Roster'!R:AA",
  PLAYER_COL: 'R',
  CONTRACT_COL: 'S',
  POSITION_COL: 'T',
  SALARY_2026_COL: 'U',
  SALARY_2027_COL: 'V',
  SALARY_2028_COL: 'W',
  SALARY_2029_COL: 'X',
  SALARY_2030_COL: 'Y',
  OWNER_COL: 'Z',
  STATUS_COL: 'AA',
};

// Trades tab
export const TRADES_TAB = {
  CURRENT_YEAR_RANGE: "'Trades'!B:K",
  TRADE_NUMBER_COL: 'B',
  TEAM1_COL: 'C',
  TEAM1_RECEIVED_COL: 'D',
  TEAM1_SALARY_COL: 'E',
  TEAM1_YRS_COL: 'F',
  TEAM2_COL: 'H',
  TEAM2_RECEIVED_COL: 'I',
  TEAM2_SALARY_COL: 'J',
  TEAM2_YRS_COL: 'K',
};

// Dead cap calculation for sheet
export function calculateSheetDeadCap(
  salary: number,
  yearsRemaining: number
): number[] {
  if (salary <= 1) return [1];

  const schedules: Record<number, number[]> = {
    5: [0.75, 0.50, 0.25, 0.10, 0.10],
    4: [0.75, 0.50, 0.25, 0.10],
    3: [0.50, 0.25, 0.10],
    2: [0.50, 0.25],
    1: [0.50],
  };

  const pcts = schedules[yearsRemaining] ?? [0.50];
  return pcts.map((p) => Math.ceil(salary * p));
}
