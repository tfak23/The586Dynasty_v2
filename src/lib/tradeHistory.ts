// Historical trade data from "Trades" tab of the Google Sheet
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
  // ===== 2023 Season (21 trades) =====
  { id: '23.01', season: 2023, team1: 'Trudy', team1Receives: ['Nothing'], team2: 'Willy', team2Receives: ['Joel Wilson ($3, 1yr)'], notes: '$3 cap 2023' },
  { id: '23.02', season: 2023, team1: 'Jamie', team1Receives: ['2024 1st (Vinny)', '2024 2nd (Vinny)'], team2: 'Vinny', team2Receives: ['David Montgomery ($20, 2yrs)', 'Zach Charbonnet ($16, 5yrs)', '$36 cap 2023', '$16 cap 2024'] },
  { id: '23.03', season: 2023, team1: 'Jamie', team1Receives: ['Kyren Williams ($3, 1yr)', '$3 cap 2023', '2025 3rd (Brian)'], team2: 'Brian', team2Receives: ['2024 2nd (Jamie)'] },
  { id: '23.04', season: 2023, team1: 'Trevor', team1Receives: ['Puka Nacua ($1, 1yr)'], team2: 'Mike', team2Receives: ['Michael Pittman Jr. ($26, 4yrs)', '2025 3rd (Trevor)', '$26 cap 2023'] },
  { id: '23.05', season: 2023, team1: 'Trevor', team1Receives: ['Jared Goff ($4, 2yrs)'], team2: 'Brian', team2Receives: ['2024 2nd (Trevor)'] },
  { id: '23.06', season: 2023, team1: 'Jamie', team1Receives: ['2024 2nd (Nick)'], team2: 'Nick', team2Receives: ['Kyren Williams ($3, 1yr)'] },
  { id: '23.07', season: 2023, team1: 'Brian', team1Receives: ['Miles Sanders ($22, 3yrs)', '2024 2nd (Dan)'], team2: 'Dan', team2Receives: ['Rhamondre Stevenson ($38, 2yrs)', '$16 cap 2023'] },
  { id: '23.08', season: 2023, team1: 'Dom', team1Receives: ['2024 1st (Trudy)'], team2: 'Trudy', team2Receives: ['Joe Mixon ($41, 2yrs)', '$41 cap 2023', '$10 cap 2024'] },
  { id: '23.09', season: 2023, team1: 'Dom', team1Receives: ['2024 1st (Mike)'], team2: 'Mike', team2Receives: ['Dalton Schultz ($4, 2yrs)', 'Kyler Murray ($8, 3yrs)', '$12 cap 2023', '2025 2nd (Dom)'] },
  { id: '23.10', season: 2023, team1: 'Vinny', team1Receives: ['Derrick Henry ($53, 2yrs)', '$3 cap 2023'], team2: 'Elliot', team2Receives: ['J.K. Dobbins ($50, 3yrs)', '2024 3rd (Vinny)', '2025 1st (Vinny)'] },
  { id: '23.11', season: 2023, team1: 'Mike', team1Receives: ['J.K. Dobbins ($50, 3yrs)', '$50 cap 2023'], team2: 'Elliot', team2Receives: ['2023 3rd (Mike)'] },
  { id: '23.12', season: 2023, team1: 'Dom', team1Receives: ['2024 2nd (Akshay)'], team2: 'Akshay', team2Receives: ['Gus Edwards ($5, 1yr)', '$5 cap 2023'] },
  { id: '23.13', season: 2023, team1: 'Nick', team1Receives: ['2024 1st (Akshay)', '2024 3rd (Akshay)', '2025 2nd (Akshay)'], team2: 'Akshay', team2Receives: ['Keenan Allen ($39, 1yr)', '$39 cap 2023'] },
  { id: '23.14', season: 2023, team1: 'Dan', team1Receives: ['Terry McLaurin ($30, 3yrs)', '2025 1st (Trudy)'], team2: 'Trudy', team2Receives: ["Ja'Marr Chase ($144, 3yrs)", '2025 2nd (Dan)', '$114 cap 2023'] },
  { id: '23.15', season: 2023, team1: 'Jamie', team1Receives: ['Austin Ekeler ($97, 1yr)', '2025 2nd (Elliot)', '$97 cap 2023'], team2: 'Elliot', team2Receives: ['2024 1st (Jamie)', '2024 3rd (Jamie)'] },
  { id: '23.16', season: 2023, team1: 'Jamie', team1Receives: ['Marquise Brown ($21, 4yrs)', '2025 3rd (Willy)', '$21 cap 2023'], team2: 'Willy', team2Receives: ['2024 2nd (Nick)', '2024 2nd (Vinny)', '2025 2nd (Elliot)'] },
  { id: '23.17', season: 2023, team1: 'Elliot', team1Receives: ['2024 1st (Trevor)'], team2: 'Trevor', team2Receives: ['Amari Cooper ($40, 3yrs)', '$40 cap 2023'] },
  { id: '23.18', season: 2023, team1: 'Nick', team1Receives: ['Geno Smith ($4, 2yrs)'], team2: 'Akshay', team2Receives: ['2024 3rd (Akshay)', '2025 3rd (Nick)'] },
  { id: '23.19', season: 2023, team1: 'Trudy', team1Receives: ['Jakobi Meyers ($8, 3yrs)'], team2: 'Dan', team2Receives: ['Alexander Mattison ($39, 2yrs)', '$39 cap 2023'] },
  { id: '23.20', season: 2023, team1: 'Elliot', team1Receives: ['2024 3rd (Akshay)', '2025 3rd (Nick)'], team2: 'Akshay', team2Receives: ['Joshua Dobbs ($1, 1yr)'] },
  { id: '23.21', season: 2023, team1: 'Elliot', team1Receives: ['Christian Watson ($27, 5yrs)', '2024 2nd (Trudy)'], team2: 'Trudy', team2Receives: ['Davante Adams ($68, 3yrs)'] },

  // ===== 2024 Season (32 trades) =====
  { id: '24.01', season: 2024, team1: 'Brian', team1Receives: ['Tua Tagovailoa ($8, 2yrs)'], team2: 'Trudy', team2Receives: ['2024 2nd (23rd)'] },
  { id: '24.02', season: 2024, team1: 'Mike', team1Receives: ['2024 1st (12th)', '2024 3rd (27th)'], team2: 'Elliot', team2Receives: ['Tee Higgins ($76, 3yrs)', '2025 2nd (Dom)', '$15 cap 2024'] },
  { id: '24.03', season: 2024, team1: 'Mike', team1Receives: ['A.J. Brown ($84, 4yrs)', '2025 2nd (Dan)'], team2: 'Trudy', team2Receives: ['2024 1st (12th)', '2025 1st (Mike)'] },
  { id: '24.04', season: 2024, team1: 'Trudy', team1Receives: ['2024 1st (10th)'], team2: 'Dom', team2Receives: ['George Kittle ($25, 3yrs)'] },
  { id: '24.05', season: 2024, team1: 'Brian', team1Receives: ['Joe Mixon ($41, 1yr)'], team2: 'Trudy', team2Receives: ['Christian Kirk ($40, 1yr)'] },
  { id: '24.06', season: 2024, team1: 'Jamie', team1Receives: ['2024 2nd (23rd)', '2024 3rd (34th)'], team2: 'Trudy', team2Receives: ['Quentin Johnston ($22, 4yrs)', '2025 3rd (Jamie)'] },
  { id: '24.07', season: 2024, team1: 'Trudy', team1Receives: ['Trey McBride ($4, 1yr)'], team2: 'Mike', team2Receives: ['Jakobi Meyers ($8, 2yrs)'] },
  { id: '24.08', season: 2024, team1: 'Dom', team1Receives: ['Mike Williams ($15, 2yrs)', '$10 cap 2024'], team2: 'Brian', team2Receives: ['2024 3rd (25th)'] },
  { id: '24.09', season: 2024, team1: 'Brian', team1Receives: ['Tyler Lockett ($22, 1yr)', '$11 cap 2024'], team2: 'Nick', team2Receives: ['2024 2nd (24th)'] },
  { id: '24.10', season: 2024, team1: 'Nick', team1Receives: ['2024 1st (11th)', '2024 2nd (15th)'], team2: 'Elliot', team2Receives: ['2024 1st (9th)', '2024 2nd (24th)'] },
  { id: '24.11', season: 2024, team1: 'Nick', team1Receives: ['2025 1st (Jamie)'], team2: 'Jamie', team2Receives: ['2025 1st (Nick)'] },
  { id: '24.12', season: 2024, team1: 'Jamie', team1Receives: ['2025 2nd (Brian)'], team2: 'Brian', team2Receives: ['2025 2nd (Jamie)'] },
  { id: '24.13', season: 2024, team1: 'Dom', team1Receives: ['2024 1st (9th)', '2024 1st (3rd)'], team2: 'Elliot', team2Receives: ['2025 1st (Dom)', '2024 1st (8th)', '2024 2nd (21st)'] },
  { id: '24.14', season: 2024, team1: 'Dom', team1Receives: ['2024 2nd (15th)', '2024 3rd (31st)'], team2: 'Nick', team2Receives: ['2024 2nd (13th)'] },
  { id: '24.15', season: 2024, team1: 'Mike', team1Receives: ['2024 2nd (15th)'], team2: 'Dom', team2Receives: ['2024 2nd (20th)', '2024 3rd (35th)'] },
  { id: '24.16', season: 2024, team1: 'Jamie', team1Receives: ['2025 3rd (Trudy)'], team2: 'Trudy', team2Receives: ['Jonathan Mingo ($15, 4yrs)'] },
  { id: '24.17', season: 2024, team1: 'Dom', team1Receives: ['Isiah Pacheco ($26, 4yrs)'], team2: 'Trudy', team2Receives: ['Rome Odunze ($32, 4yrs)', '2025 3rd (Dom)'] },
  { id: '24.18', season: 2024, team1: 'Jamie', team1Receives: ['Davante Adams ($68, 2yrs)', '2025 3rd (Dom)', '$18 cap 2024', '$10 cap 2025'], team2: 'Trudy', team2Receives: ['George Pickens ($30, 4yrs)'] },
  { id: '24.19', season: 2024, team1: 'Jamie', team1Receives: ['David Montgomery ($20, 1yr)'], team2: 'Vinny', team2Receives: ['2025 2nd (Brian)', '$15 cap 2024'] },
  { id: '24.20', season: 2024, team1: 'Dan', team1Receives: ['Josh Jacobs ($69, 3yrs)'], team2: 'Akshay', team2Receives: ['Puka Nacua ($76, 5yrs)'] },
  { id: '24.21', season: 2024, team1: 'Akshay', team1Receives: ['Josh Allen ($72, 4yrs)'], team2: 'Vinny', team2Receives: ['Joe Burrow ($71, 4yrs)', '2025 3rd (Akshay)', '2026 2nd (Akshay)', '2027 2nd (Akshay)'] },
  { id: '24.22', season: 2024, team1: 'Jamie', team1Receives: ['Alvin Kamara ($26, 1yr)', '$21 cap 2024'], team2: 'Trevor', team2Receives: ['Ezekiel Elliott ($5, 1yr)', '2025 1st (Nick)', '2025 3rd (Brian)'] },
  { id: '24.23', season: 2024, team1: 'Akshay', team1Receives: ['Zach Charbonnet ($16, 4yrs)', '2025 2nd (Brian)', '2025 2nd (Vinny)'], team2: 'Vinny', team2Receives: ['Tyreek Hill ($96, 2yrs)', '$80 cap 2024', '$5 cap 2025'] },
  { id: '24.24', season: 2024, team1: 'Trudy', team1Receives: ['Najee Harris ($40, 2yrs)', '$21 cap 2024', '$25 cap 2025'], team2: 'Trevor', team2Receives: ['Jonathan Mingo ($15, 4yrs)', 'Jaleel McLaughlin ($4, 1yr)', '2025 3rd (Jamie)', '$15 cap 2026'] },
  { id: '24.25', season: 2024, team1: 'Brian', team1Receives: ['Jalen Hurts ($75, 4yrs)', '$27 cap 2024', '$12 cap 2025', '$12 cap 2026'], team2: 'Dan', team2Receives: ['Trevor Lawrence ($48, 4yrs)', '2024 1st (Brian)'] },
  { id: '24.26', season: 2024, team1: 'Nick', team1Receives: ['Amari Cooper ($40, 2yrs)', '$24 cap 2024'], team2: 'Trevor', team2Receives: ['Tyjae Spears ($16, 3yrs)', '2025 2nd (Nick)'] },
  { id: '24.27', season: 2024, team1: 'Nick', team1Receives: ['Aaron Rodgers ($5, 1yr)', '$4 cap 2024'], team2: 'Willy', team2Receives: ['Andy Dalton ($1, 1yr)', '2026 3rd (Nick)'] },
  { id: '24.28', season: 2024, team1: 'Dan', team1Receives: ['Courtland Sutton ($23, 1yr)', '2025 2nd (Brian)', '$23 cap 2024'], team2: 'Akshay', team2Receives: ['2025 1st (Trudy)'] },
  { id: '24.29', season: 2024, team1: 'Akshay', team1Receives: ['Rashod Bateman ($9, 2yrs)', '$6 cap 2024'], team2: 'Trevor', team2Receives: ['Alexander Mattison ($3, 1yr)'] },
  { id: '24.30', season: 2024, team1: 'Brian', team1Receives: ['Amari Cooper ($40, 2yrs)', '$7 cap 2025'], team2: 'Nick', team2Receives: ['Deebo Samuel ($50, 1yr)', '$10 cap 2024'] },
  { id: '24.31', season: 2024, team1: 'Brian', team1Receives: ['T.J. Hockenson ($43, 1yr)', '$35 cap 2024'], team2: 'Trevor', team2Receives: ['Tua Tagovailoa ($8, 2yrs)', '2026 3rd (Brian)'] },
  { id: '24.32', season: 2024, team1: 'Dan', team1Receives: ['Tyrone Tracy ($6, 2yrs)', 'Devin Singletary ($17, 3yrs)', '$5 cap 2025', '$23 cap 2024'], team2: 'Nick', team2Receives: ['2025 1st (Dan)'] },

  // ===== 2025 Season (25 trades) =====
  { id: '25.01', season: 2025, team1: 'Trudy', team1Receives: ['2025 3rd (28th)', '2025 3rd (31st)', '2025 3rd (35th)'], team2: 'Jamie', team2Receives: ['Najee Harris ($40, 1yr)', '$20 cap 2025'] },
  { id: '25.02', season: 2025, team1: 'Jamie', team1Receives: ['2025 1st (6th)', '2025 2nd (18th)'], team2: 'Trevor', team2Receives: ['Davante Adams ($68, 1yr)', 'Brandon Aiyuk ($27, 1yr)'] },
  { id: '25.03', season: 2025, team1: 'Jamie', team1Receives: ['2025 1st (9th)'], team2: 'Nick', team2Receives: ['Sam LaPorta ($32, 2yrs)', '$15 cap 2025', '$15 cap 2026'] },
  { id: '25.04', season: 2025, team1: 'Trudy', team1Receives: ['2025 2nd (13th)'], team2: 'Willy', team2Receives: ['2025 2nd (19th)', '2025 3rd (28th)'] },
  { id: '25.05', season: 2025, team1: 'Akshay', team1Receives: ['2025 1st (12th)'], team2: 'Karl', team2Receives: ['Austin Ekeler ($14, 1yr)', '2025 2nd (24th)', '2026 3rd (Akshay)', '2027 3rd (Akshay)'] },
  { id: '25.06', season: 2025, team1: 'Nick', team1Receives: ['2025 2nd (20th)'], team2: 'Zach', team2Receives: ['2026 2nd (Nick)', '2027 3rd (Nick)'] },
  { id: '25.07', season: 2025, team1: 'Nick', team1Receives: ['2027 1st (Dom)'], team2: 'Dom', team2Receives: ['2026 1st (Nick)'] },
  { id: '25.08', season: 2025, team1: 'Dan', team1Receives: ['2025 3rd (25th)'], team2: 'Karl', team2Receives: ['2026 2nd (Dan)'] },
  { id: '25.09', season: 2025, team1: 'Jamie', team1Receives: ['Rome Odunze ($32, 3yrs)'], team2: 'Trudy', team2Receives: ['Matthew Golden ($8, 3yrs)', '2026 1st (Jamie)', '2026 3rd (Jamie)'] },
  { id: '25.10', season: 2025, team1: 'Trudy', team1Receives: ['Evan Engram ($16, 3yrs)'], team2: 'Zach', team2Receives: ['2026 1st (Jamie)'] },
  { id: '25.11', season: 2025, team1: 'Jamie', team1Receives: ['Jayden Reed ($14, 2yrs)'], team2: 'Trevor', team2Receives: ['Marquise Brown ($21, 2yrs)'] },
  { id: '25.12', season: 2025, team1: 'Dan', team1Receives: ['2026 1st (Trevor)'], team2: 'Trevor', team2Receives: ['Terry McLaurin ($30, 1yr)', '$30 cap 2026'] },
  { id: '25.13', season: 2025, team1: 'Jamie', team1Receives: ['Josh Downs ($12, 2yrs)', '$3 cap 2025'], team2: 'Nick', team2Receives: ['Rhamondre Stevenson ($9, 1yr)'] },
  { id: '25.14', season: 2025, team1: 'Trudy', team1Receives: ['$5 cap 2025'], team2: 'Nick', team2Receives: ['2026 3rd (Jamie)'] },
  { id: '25.15', season: 2025, team1: 'Zach', team1Receives: ['Saquon Barkley ($97, 1yr)', '$97 cap 2025'], team2: 'Vinny', team2Receives: ['2026 1st (Zach)', '2026 1st (Jamie)', '2026 2nd (Zach)', '2026 2nd (Nick)'] },
  { id: '25.16', season: 2025, team1: 'Trudy', team1Receives: ['Jeremy McNichols ($1, 1yr)'], team2: 'Brian', team2Receives: ['Jalen Tolbert ($1, 1yr)'] },
  { id: '25.17', season: 2025, team1: 'Dan', team1Receives: ['2026 1st (Trudy)', 'Jayden Higgins ($9, 3yrs)', '$9 cap 2026'], team2: 'Trudy', team2Receives: ['Josh Jacobs ($69, 2yrs)', '$69 cap 2025'] },
  { id: '25.18', season: 2025, team1: 'Dan', team1Receives: ['2026 3rd (Zach)'], team2: 'Zach', team2Receives: ['Matthew Stafford ($4, 1yr)'] },
  { id: '25.19', season: 2025, team1: 'Brian', team1Receives: ['Christian McCaffrey ($83, 1yr)', "DeVonta Smith ($76, 2yrs)", '2026 2nd (Dom)', '$66 cap 2025'], team2: 'Dom', team2Receives: ['Garrett Wilson ($93, 3yrs)', '2026 1st (Brian)', '2027 1st (Brian)', '$10 cap 2026'] },
  { id: '25.20', season: 2025, team1: 'Brian', team1Receives: ["DeAndre Hopkins ($1, 1yr)"], team2: 'Dom', team2Receives: ['Chris Rodriguez ($8, 3yrs)'] },
  { id: '25.21', season: 2025, team1: 'Nick', team1Receives: ['2026 2nd (Dan)'], team2: 'Karl', team2Receives: ['Dallas Goedert ($5, 1yr)'] },
  { id: '25.22', season: 2025, team1: 'Dan', team1Receives: ['2027 2nd (Trudy)'], team2: 'Trudy', team2Receives: ['Alec Pierce ($4, 2yrs)', 'Tyrone Tracy ($6, 1yr)', '$10 cap 2025'] },
  { id: '25.23', season: 2025, team1: 'Brian', team1Receives: ['Mike Evans ($24, 1yr)', '$24 cap 2025'], team2: 'Dan', team2Receives: ['$10 cap 2026'] },
  { id: '25.24', season: 2025, team1: 'Nick', team1Receives: ['2026 2nd (Trevor)'], team2: 'Trevor', team2Receives: ['Daniel Jones ($2, 1yr)', '$2 cap 2025'] },
  { id: '25.25', season: 2025, team1: 'Trudy', team1Receives: ['Rashee Rice ($20, 2yrs)', '$12 cap 2025'], team2: 'Willy', team2Receives: ['Matthew Golden ($8, 3yrs)', '2026 2nd (Trudy)', '2028 1st (Trudy)', '$8 cap 2026'] },

  // ===== 2026 Season (2 trades) =====
  { id: '26.01', season: 2026, team1: 'Akshay', team1Receives: ['Christian Kirk ($11, 2yrs)'], team2: 'Tony', team2Receives: ['Nothing'], notes: '$3 cap 2023' },
  { id: '26.02', season: 2026, team1: 'Tony', team1Receives: ['2027 2nd (Dan)'], team2: 'Dan', team2Receives: ['D.K. Metcalf ($53, 2yrs)'], notes: '$53 cap 2026' },
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

// Get all unique team names across all trades
export function getTradeTeams(): string[] {
  const teams = new Set<string>();
  TRADE_HISTORY.forEach((t) => {
    teams.add(t.team1);
    teams.add(t.team2);
  });
  return [...teams].sort();
}

// Get trades involving a specific team
export function getTradesForTeam(teamName: string): HistoricalTrade[] {
  return TRADE_HISTORY.filter(
    (t) => t.team1 === teamName || t.team2 === teamName
  );
}
