// Historical trade data from "trades" tab of the Google Sheet
// Static data that only changes when new trades occur

export interface HistoricalTrade {
  id: string; // e.g. "23.01"
  season: number;
  team1: string;
  team1Receives: string[];
  team2: string;
  team2Receives: string[];
  notes?: string;
}

export const TRADE_HISTORY: HistoricalTrade[] = [
  // ===== 2023 Season =====
  {
    id: '23.01', season: 2023,
    team1: 'Trudy', team1Receives: ['Joel Wilson ($3, 1yr)'],
    team2: 'Willy', team2Receives: [],
    notes: '$3 cap 2023',
  },
  {
    id: '23.02', season: 2023,
    team1: 'Jamie', team1Receives: ['2024 1st (Vinny)', '2024 2nd (Vinny)'],
    team2: 'Vinny', team2Receives: ['David Montgomery ($20, 2yrs)', 'Zach Charbonnet ($16, 5yrs)'],
    notes: '$36 cap 2023, $16 cap 2024',
  },
  {
    id: '23.03', season: 2023,
    team1: 'Jamie', team1Receives: ['Kyren Williams ($3, 1yr)', '$3 cap 2023', '2025 3rd (Brian)'],
    team2: 'Brian', team2Receives: ['2024 2nd (Jamie)'],
  },
  {
    id: '23.04', season: 2023,
    team1: 'Trevor', team1Receives: ['Puka Nacua ($1, 1yr)'],
    team2: 'Mike', team2Receives: ['Michael Pittman Jr. ($26, 4yrs)', '2025 3rd (Trevor)'],
    notes: '$26 cap 2023',
  },
  {
    id: '23.05', season: 2023,
    team1: 'Trevor', team1Receives: ['Jared Goff ($4, 2yrs)'],
    team2: 'Brian', team2Receives: ['2024 2nd (Trevor)'],
  },
  {
    id: '23.06', season: 2023,
    team1: 'Jamie', team1Receives: ['2024 2nd (Nick)'],
    team2: 'Nick', team2Receives: ['Kyren Williams ($3, 1yr)'],
  },
  {
    id: '23.07', season: 2023,
    team1: 'Brian', team1Receives: ['Miles Sanders ($22, 3yrs)', '2024 2nd (Dan)'],
    team2: 'Dan', team2Receives: ['Rhamondre Stevenson ($38, 2yrs)'],
    notes: '$16 cap 2023',
  },
  {
    id: '23.08', season: 2023,
    team1: 'Dom', team1Receives: ['2024 1st (Trudy)'],
    team2: 'Trudy', team2Receives: ['Joe Mixon ($41, 2yrs)'],
    notes: '$41 cap 2023, $10 cap 2024',
  },
  {
    id: '23.09', season: 2023,
    team1: 'Dom', team1Receives: ['2024 1st (Mike)'],
    team2: 'Mike', team2Receives: ['Dalton Schultz ($4, 2yrs)', 'Kyler Murray ($8, 3yrs)', '$12 cap 2023', '2025 2nd (Dom)'],
  },
  {
    id: '23.10', season: 2023,
    team1: 'Vinny', team1Receives: ['Derrick Henry ($53, 2yrs)', '$3 cap 2023'],
    team2: 'Elliot', team2Receives: ['J.K. Dobbins ($50, 3yrs)', '2024 3rd (Vinny)', '2025 1st (Vinny)'],
  },
  {
    id: '23.11', season: 2023,
    team1: 'Elliot', team1Receives: ['2024 1st (Trevor)'],
    team2: 'Mike', team2Receives: ['J.K. Dobbins ($50, 3yrs)'],
    notes: '$50 cap 2023',
  },
  {
    id: '23.12', season: 2023,
    team1: 'Dom', team1Receives: ['2024 2nd (Akshay)'],
    team2: 'Akshay', team2Receives: ['Gus Edwards ($5, 1yr)'],
    notes: '$5 cap 2023',
  },
  {
    id: '23.13', season: 2023,
    team1: 'Nick', team1Receives: ['2024 1st (Akshay)', '2024 3rd (Akshay)', '2025 2nd (Akshay)'],
    team2: 'Akshay', team2Receives: ['Keenan Allen ($39, 1yr)'],
    notes: '$39 cap 2023',
  },
  {
    id: '23.14', season: 2023,
    team1: 'Dan', team1Receives: ['Terry McLaurin ($30, 3yrs)', '2025 1st (Trudy)'],
    team2: 'Trudy', team2Receives: ["Ja'Marr Chase ($144, 3yrs)", '2025 2nd (Dan)'],
    notes: '$114 cap 2023',
  },
  {
    id: '23.15', season: 2023,
    team1: 'Jamie', team1Receives: ['Austin Ekeler ($97, 1yr)', '2025 2nd (Elliot)', '$97 cap 2023'],
    team2: 'Elliot', team2Receives: ['2024 1st (Jamie)', '2024 3rd (Jamie)'],
  },
  {
    id: '23.16', season: 2023,
    team1: 'Jamie', team1Receives: ['Marquise Brown ($21, 4yrs)', '2025 3rd (Willy)', '$21 cap 2023'],
    team2: 'Willy', team2Receives: ['2024 2nd (Nick)', '2024 2nd (Vinny)', '2025 2nd (Elliot)'],
  },
  {
    id: '23.17', season: 2023,
    team1: 'Elliot', team1Receives: ['2024 1st (Trevor)'],
    team2: 'Trevor', team2Receives: ['Amari Cooper ($40, 3yrs)'],
    notes: '$40 cap 2023',
  },
  {
    id: '23.18', season: 2023,
    team1: 'Nick', team1Receives: ['Geno Smith ($4, 2yrs)'],
    team2: 'Akshay', team2Receives: ['2024 3rd (Akshay)', '2025 3rd (Nick)'],
  },
  {
    id: '23.19', season: 2023,
    team1: 'Trudy', team1Receives: ['Jakobi Meyers ($8, 3yrs)'],
    team2: 'Dan', team2Receives: ['Alexander Mattison ($39, 2yrs)'],
    notes: '$39 cap 2023',
  },
  {
    id: '23.20', season: 2023,
    team1: 'Elliot', team1Receives: ['2024 3rd (Akshay)', '2025 3rd (Nick)'],
    team2: 'Akshay', team2Receives: ['Joshua Dobbs ($1, 1yr)'],
  },
  {
    id: '23.21', season: 2023,
    team1: 'Elliot', team1Receives: ['Christian Watson ($27, 5yrs)', '2024 2nd (Trudy)'],
    team2: 'Trudy', team2Receives: ['Davante Adams ($68, 3yrs)'],
  },

  // ===== 2024 Season =====
  {
    id: '24.01', season: 2024,
    team1: 'Brian', team1Receives: ['Tua Tagovailoa ($8, 2yrs)'],
    team2: 'Trudy', team2Receives: ['2024 2nd (23rd)'],
  },
  {
    id: '24.02', season: 2024,
    team1: 'Mike', team1Receives: ['2024 1st (12th)', '2024 3rd (27th)'],
    team2: 'Elliot', team2Receives: ['Tee Higgins ($76, 3yrs)', '2025 2nd (Dom)'],
    notes: '$15 cap 2024',
  },
  {
    id: '24.03', season: 2024,
    team1: 'Mike', team1Receives: ['A.J. Brown ($84, 4yrs)', '2025 2nd (Dan)'],
    team2: 'Trudy', team2Receives: ['2024 1st (12th)', '2025 1st (Mike)'],
  },
  {
    id: '24.04', season: 2024,
    team1: 'Trudy', team1Receives: ['2024 1st (10th)'],
    team2: 'Dom', team2Receives: ['George Kittle ($25, 3yrs)'],
  },
  {
    id: '24.05', season: 2024,
    team1: 'Brian', team1Receives: ['Joe Mixon ($41, 1yr)'],
    team2: 'Trudy', team2Receives: ['Christian Kirk ($40, 1yr)'],
  },
  {
    id: '24.06', season: 2024,
    team1: 'Jamie', team1Receives: ['2024 2nd (23rd)', '2024 3rd (34th)'],
    team2: 'Trudy', team2Receives: ['Quentin Johnston ($22, 4yrs)', '2025 3rd (Jamie)'],
  },
  {
    id: '24.07', season: 2024,
    team1: 'Trudy', team1Receives: ['Trey McBride ($4, 1yr)'],
    team2: 'Mike', team2Receives: ['Jakobi Meyers ($8, 2yrs)'],
  },

  // ===== 2026 Season (Current) =====
  {
    id: '26.01', season: 2026,
    team1: 'Akshay', team1Receives: ['Christian Kirk ($11, 2yrs)'],
    team2: 'Tony', team2Receives: [],
  },
  {
    id: '26.02', season: 2026,
    team1: 'Tony', team1Receives: ['2027 2nd (Dan)'],
    team2: 'Dan', team2Receives: ['D.K. Metcalf ($53, 2yrs)'],
    notes: '$53 cap 2026',
  },
];

// Get trades for a specific season
export function getTradesBySeason(season: number): HistoricalTrade[] {
  return TRADE_HISTORY.filter((t) => t.season === season);
}

// Get all seasons that have trades
export function getTradeSeasons(): number[] {
  const seasons = [...new Set(TRADE_HISTORY.map((t) => t.season))];
  return seasons.sort((a, b) => b - a);
}
