// League historical data from "The 586 Dynasty" Google Sheet tab
// This is static/historical data that changes only at season end

export interface OwnerRecord {
  name: string;
  phone: string;
  titles: number;
  sbAppearances: number;
  divisionTitles: number;
  playoffAppearances: number;
  moneyWon: string;
  netMoney: string;
  overall: { w: number; l: number; t: number; pct: string; pts: string; avgPlace: string };
  seasons: Record<number, { w: number; l: number; t: number; pct: string; pts: string; place: number }>;
}

export interface LegacyScore {
  rank: number;
  name: string;
  score: number;
}

export interface PlayoffBracket {
  season: number;
  wildcard: string[];
  semiFinals: string[];
  thirdPlace: string;
  championship: string;
}

export const OWNER_RECORDS: OwnerRecord[] = [
  {
    name: 'Brian', phone: '586-808-2234', titles: 1, sbAppearances: 1, divisionTitles: 2, playoffAppearances: 2, moneyWon: '$1,400', netMoney: '$800',
    overall: { w: 24, l: 18, t: 0, pct: '57.14%', pts: '4,984.55', avgPlace: '5.0' },
    seasons: {
      2023: { w: 3, l: 11, t: 0, pct: '21.43%', pts: '1,156.35', place: 11 },
      2024: { w: 10, l: 4, t: 0, pct: '71.43%', pts: '1,961.55', place: 3 },
      2025: { w: 11, l: 3, t: 0, pct: '78.57%', pts: '1,866.65', place: 1 },
    },
  },
  {
    name: 'Jamie', phone: '231-330-5507', titles: 1, sbAppearances: 1, divisionTitles: 0, playoffAppearances: 2, moneyWon: '$1,200', netMoney: '$600',
    overall: { w: 22, l: 20, t: 0, pct: '52.38%', pts: '5,569.85', avgPlace: '4.0' },
    seasons: {
      2023: { w: 7, l: 7, t: 0, pct: '50.00%', pts: '1,945.80', place: 1 },
      2024: { w: 7, l: 7, t: 0, pct: '50.00%', pts: '1,906.20', place: 4 },
      2025: { w: 8, l: 6, t: 0, pct: '57.14%', pts: '1,717.85', place: 7 },
    },
  },
  {
    name: 'Dom', phone: '586-549-0149', titles: 0, sbAppearances: 1, divisionTitles: 0, playoffAppearances: 1, moneyWon: '$900', netMoney: '$300',
    overall: { w: 14, l: 28, t: 0, pct: '33.33%', pts: '4,714.05', avgPlace: '8.0' },
    seasons: {
      2023: { w: 2, l: 12, t: 0, pct: '14.29%', pts: '1,255.80', place: 12 },
      2024: { w: 8, l: 6, t: 0, pct: '57.14%', pts: '1,834.15', place: 2 },
      2025: { w: 4, l: 10, t: 0, pct: '28.57%', pts: '1,624.10', place: 10 },
    },
  },
  {
    name: 'Nick', phone: '586-243-3178', titles: 0, sbAppearances: 0, divisionTitles: 0, playoffAppearances: 1, moneyWon: '$0', netMoney: '-$600',
    overall: { w: 16, l: 26, t: 0, pct: '38.10%', pts: '4,939.35', avgPlace: '7.3' },
    seasons: {
      2023: { w: 7, l: 7, t: 0, pct: '50.00%', pts: '1,686.00', place: 6 },
      2024: { w: 5, l: 9, t: 0, pct: '35.71%', pts: '1,686.85', place: 7 },
      2025: { w: 4, l: 10, t: 0, pct: '28.57%', pts: '1,566.50', place: 9 },
    },
  },
  {
    name: 'Dan', phone: '248-891-4058', titles: 0, sbAppearances: 0, divisionTitles: 1, playoffAppearances: 1, moneyWon: '$100', netMoney: '-$500',
    overall: { w: 17, l: 25, t: 0, pct: '40.48%', pts: '5,066.20', avgPlace: '7.7' },
    seasons: {
      2023: { w: 6, l: 8, t: 0, pct: '42.86%', pts: '1,789.10', place: 7 },
      2024: { w: 8, l: 6, t: 0, pct: '57.14%', pts: '1,862.00', place: 4 },
      2025: { w: 3, l: 11, t: 0, pct: '21.43%', pts: '1,415.10', place: 12 },
    },
  },
  {
    name: 'Zach', phone: '586-838-7883', titles: 0, sbAppearances: 1, divisionTitles: 0, playoffAppearances: 1, moneyWon: '$800', netMoney: '$700',
    overall: { w: 9, l: 5, t: 0, pct: '64.29%', pts: '1,789.15', avgPlace: '2.0' },
    seasons: {
      2025: { w: 9, l: 5, t: 0, pct: '64.29%', pts: '1,789.15', place: 2 },
    },
  },
  {
    name: 'Akshay', phone: '586-260-8396', titles: 0, sbAppearances: 0, divisionTitles: 1, playoffAppearances: 1, moneyWon: '$50', netMoney: '-$350',
    overall: { w: 26, l: 16, t: 0, pct: '61.90%', pts: '5,007.50', avgPlace: '6.0' },
    seasons: {
      2023: { w: 12, l: 2, t: 0, pct: '85.71%', pts: '1,752.50', place: 4 },
      2024: { w: 6, l: 8, t: 0, pct: '42.86%', pts: '1,496.05', place: 11 },
      2025: { w: 8, l: 6, t: 0, pct: '57.14%', pts: '1,758.95', place: 3 },
    },
  },
  {
    name: 'Karl', phone: '586-246-0289', titles: 0, sbAppearances: 0, divisionTitles: 1, playoffAppearances: 1, moneyWon: '$100', netMoney: '$0',
    overall: { w: 9, l: 5, t: 0, pct: '64.29%', pts: '1,769.65', avgPlace: '6.0' },
    seasons: {
      2025: { w: 9, l: 5, t: 0, pct: '64.29%', pts: '1,769.65', place: 6 },
    },
  },
  {
    name: 'Tony', phone: '586-713-3079', titles: 0, sbAppearances: 0, divisionTitles: 0, playoffAppearances: 0, moneyWon: '$0', netMoney: '$0',
    overall: { w: 0, l: 0, t: 0, pct: '-', pts: '0.00', avgPlace: '-' },
    seasons: {},
  },
  {
    name: 'Willy', phone: '231-330-9342', titles: 0, sbAppearances: 0, divisionTitles: 0, playoffAppearances: 1, moneyWon: '$0', netMoney: '-$400',
    overall: { w: 21, l: 21, t: 0, pct: '50.00%', pts: '4,952.15', avgPlace: '7.7' },
    seasons: {
      2023: { w: 6, l: 8, t: 0, pct: '42.86%', pts: '1,609.75', place: 9 },
      2024: { w: 6, l: 8, t: 0, pct: '42.86%', pts: '1,658.50', place: 9 },
      2025: { w: 9, l: 5, t: 0, pct: '64.29%', pts: '1,683.90', place: 5 },
    },
  },
  {
    name: 'Trudy', phone: '586-306-5786', titles: 0, sbAppearances: 0, divisionTitles: 2, playoffAppearances: 3, moneyWon: '$600', netMoney: '$0',
    overall: { w: 30, l: 12, t: 0, pct: '71.43%', pts: '5,841.50', avgPlace: '4.0' },
    seasons: {
      2023: { w: 12, l: 2, t: 0, pct: '85.71%', pts: '1,935.45', place: 3 },
      2024: { w: 8, l: 6, t: 0, pct: '57.14%', pts: '1,922.40', place: 5 },
      2025: { w: 10, l: 4, t: 0, pct: '71.43%', pts: '1,983.65', place: 4 },
    },
  },
  {
    name: 'Trevor', phone: '906-259-3039', titles: 0, sbAppearances: 1, divisionTitles: 1, playoffAppearances: 1, moneyWon: '$750', netMoney: '$150',
    overall: { w: 20, l: 22, t: 0, pct: '47.62%', pts: '5,315.05', avgPlace: '6.0' },
    seasons: {
      2023: { w: 10, l: 4, t: 0, pct: '71.43%', pts: '1,959.60', place: 2 },
      2024: { w: 3, l: 11, t: 0, pct: '21.43%', pts: '1,609.40', place: 8 },
      2025: { w: 7, l: 7, t: 0, pct: '50.00%', pts: '1,746.05', place: 8 },
    },
  },
];

export const LEGACY_SCORES: LegacyScore[] = [
  { rank: 1, name: 'Brian', score: 259.2 },
  { rank: 2, name: 'Jamie', score: 252.6 },
  { rank: 3, name: 'Trudy', score: 218.5 },
  { rank: 4, name: 'Trevor', score: 185.1 },
  { rank: 5, name: 'Akshay', score: 182.3 },
  { rank: 6, name: 'Dom', score: 157.3 },
  { rank: 7, name: 'Dan', score: 147.5 },
  { rank: 8, name: 'Willy', score: 145.3 },
  { rank: 9, name: 'Nick', score: 136.1 },
  { rank: 10, name: 'Zach', score: 91.8 },
  { rank: 11, name: 'Karl', score: 60.6 },
  { rank: 12, name: 'Tony', score: 0.0 },
];

export const PLAYOFF_BRACKETS: PlayoffBracket[] = [
  {
    season: 2023,
    wildcard: ['Mike (4) vs Jamie (5)', 'Nick (6) vs Trevor (3)'],
    semiFinals: ['Akshay (2) vs Trevor', 'Trudy (1) vs Jamie'],
    thirdPlace: 'Trudy over Akshay',
    championship: 'Jamie over Trevor',
  },
  {
    season: 2024,
    wildcard: ['Dan (4) vs Jamie (6)', 'Trudy (3) vs Dom (5)'],
    semiFinals: ['Vinny (1) over Jamie', 'Dom over Brian (2)'],
    thirdPlace: 'Brian over Jamie',
    championship: 'Vinny over Dom',
  },
  {
    season: 2025,
    wildcard: ['Karl (3) vs Akshay (6)', 'Zach/Tony (4) vs Willy (5)'],
    semiFinals: ['Brian (1) vs Akshay', 'Trudy (2) vs Zach/Tony'],
    thirdPlace: 'Akshay over Trudy',
    championship: 'Brian over Zach/Tony',
  },
];

// Former owners who were replaced mid-league
export const FORMER_OWNERS = [
  { name: 'Mike', replacedBy: 'Zach', seasons: '2023–2024', record: '16-12 (57.14%)', pts: '3,535.10' },
  { name: 'Elliot', replacedBy: 'Karl', seasons: '2023–2024', record: '10-18 (35.71%)', pts: '2,677.25' },
  { name: 'Vinny', replacedBy: 'Tony', seasons: '2023–2025', record: '18-24 (42.86%)', pts: '5,000.05' },
];

// Champions by season
export const CHAMPIONS: Record<number, { champion: string; runnerUp: string }> = {
  2023: { champion: 'Jamie', runnerUp: 'Trevor' },
  2024: { champion: 'Vinny', runnerUp: 'Dom' },
  2025: { champion: 'Brian', runnerUp: 'Zach/Tony' },
};
