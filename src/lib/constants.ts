// App-wide constants

export const APP_NAME = 'The 586 Dynasty';
export const APP_VERSION = '1.0.0';

// Sleeper
export const SLEEPER_LEAGUE_ID = '1315789488873553920';
export const SLEEPER_API_BASE = 'https://api.sleeper.app/v1';

// Google Sheets
export const DEFAULT_SPREADSHEET_ID = '1ic6SUzsm-ehUIjCge3RaQdTkX-Gbdjns-c2t9Gj-F_k';

// Salary Cap
export const DEFAULT_SALARY_CAP = 500;
export const MAX_CONTRACT_YEARS = 5;
export const MIN_CONTRACT_YEARS = 1;

// Supabase (loaded from env at runtime)
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Commissioners (Sleeper usernames)
export const COMMISSIONER_USERNAMES = ['TonyFF', 'brcarnag'];

// Storage
export const STORAGE_KEY = 'the586-storage';

// Dead Cap Percentages by total contract years remaining
export const DEAD_CAP_PERCENTAGES: Record<number, number[]> = {
  5: [0.75, 0.50, 0.25, 0.10, 0.10],
  4: [0.75, 0.50, 0.25, 0.10],
  3: [0.50, 0.25, 0.10],
  2: [0.50, 0.25],
  1: [0.50],
};

// Minimum salaries by contract year
export const MIN_SALARIES: Record<number, number> = {
  1: 1,
  2: 4,
  3: 8,
  4: 12,
  5: 15,
};

// Position salary ranges
export const POSITION_RANGES: Record<string, { min: number; max: number }> = {
  QB: { min: 1, max: 100 },
  RB: { min: 1, max: 60 },
  WR: { min: 1, max: 70 },
  TE: { min: 1, max: 50 },
};

// Contract ratings
export const RATINGS = {
  LEGENDARY: 'LEGENDARY',
  CORNERSTONE: 'CORNERSTONE',
  STEAL: 'STEAL',
  GOOD: 'GOOD',
  BUST: 'BUST',
  ROOKIE: 'ROOKIE',
} as const;

export const RATING_COLORS: Record<string, { bg: string; text: string }> = {
  LEGENDARY: { bg: '#FFD700', text: '#1a1a2e' },
  CORNERSTONE: { bg: '#06B6D4', text: '#ffffff' },
  STEAL: { bg: '#22C55E', text: '#ffffff' },
  GOOD: { bg: '#3B82F6', text: '#ffffff' },
  BUST: { bg: '#EF4444', text: '#ffffff' },
  ROOKIE: { bg: '#8B5CF6', text: '#ffffff' },
};

export const RATING_ICONS: Record<string, string> = {
  LEGENDARY: 'trophy',
  CORNERSTONE: 'diamond',
  STEAL: 'trending-up',
  GOOD: 'checkmark-circle',
  BUST: 'trending-down',
  ROOKIE: 'star-outline',
};

// Owner mapping for Google Sheets
export const OWNER_MAPPING: Record<string, { fullName: string; sleeperUsername: string }> = {
  Akshay: { fullName: 'Akshay Bhanot', sleeperUsername: 'abhanot11' },
  Brian: { fullName: 'Brian Carnaghi', sleeperUsername: 'brcarnag' },
  Dan: { fullName: 'Dan Carnaghi', sleeperUsername: 'CanThePan' },
  Dom: { fullName: 'Dominic Puzzuoli', sleeperUsername: 'DomDuhBomb' },
  Jamie: { fullName: 'James Gazarato', sleeperUsername: 'Gazarato' },
  Karl: { fullName: 'Karl Lucido', sleeperUsername: 'Klucido08' },
  Nick: { fullName: "Nick D'Onofrio", sleeperUsername: 'NickDnof' },
  Tony: { fullName: 'Tony Fakhouri', sleeperUsername: 'TonyFF' },
  Trevor: { fullName: 'Trevor Hurd', sleeperUsername: 'TrevorH42' },
  Trudy: { fullName: 'Mike Trudel', sleeperUsername: 'miket1326' },
  Willy: { fullName: 'Jimmy Wilson', sleeperUsername: 'bigwily57' },
  Zach: { fullName: 'Zach Gravatas', sleeperUsername: 'zachg1313' },
};

// Rookie draft pick salary values from the league Google Sheet (Rookie Draft tab)
// Round 1 (picks 1-12): $45 down to $10, Round 2 (picks 13-24): $9 down to $5, Round 3+ (picks 25+): $1
export function getDefaultRookiePickValues(rounds: 3 | 4 | 5 = 3): Record<number, number> {
  const values: Record<number, number> = {};
  const round1 = [45, 38, 32, 27, 23, 19, 16, 14, 13, 12, 11, 10];
  const round2 = [9, 9, 9, 8, 8, 8, 7, 7, 6, 6, 5, 5];

  for (let pick = 1; pick <= rounds * 12; pick++) {
    if (pick <= 12) values[pick] = round1[pick - 1];
    else if (pick <= 24) values[pick] = round2[pick - 13];
    else values[pick] = 1;
  }
  return values;
}

// Rookie contract rules:
// - All 1st and 2nd round picks get a team option year at 1.5x salary (rounded up)
// - 3rd+ round picks get standard 4-year contracts at $1
// - Rookie options don't count toward total contract years until picked up
// - Rookie contracts don't follow minimum long-term salary requirements
export const ROOKIE_OPTION_MULTIPLIER = 1.5;
export const ROOKIE_BASE_YEARS = 4;
export const ROOKIE_OPTION_ROUNDS = [1, 2]; // Rounds eligible for team option year
