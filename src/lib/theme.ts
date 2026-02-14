// Theme system derived from the 586 Dynasty logo
// Deep navy backgrounds, teal/cyan primary, gold accents

export const colors = {
  // Core brand
  primary: '#00b4d8',
  primaryDark: '#0090ad',
  primaryLight: '#48d1e0',

  // Backgrounds
  background: '#0a1628',
  backgroundSecondary: '#1a1a2e',
  surface: '#16213e',
  surfaceLight: '#1e2d4a',

  // Accent
  gold: '#c4a35a',
  silver: '#c0c0c0',
  silverLight: '#e0e0e0',

  // Text
  text: '#f0f0f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  // Semantic
  success: '#22c55e',
  successDark: '#16a34a',
  warning: '#f59e0b',
  warningDark: '#d97706',
  error: '#ef4444',
  errorDark: '#dc2626',
  info: '#00b4d8',

  // Position colors
  qb: '#ef4444',
  rb: '#22c55e',
  wr: '#3b82f6',
  te: '#f59e0b',

  // Cap status
  capHealthy: '#22c55e',
  capWarning: '#f59e0b',
  capCritical: '#ef4444',

  // Borders
  border: '#2a2a4a',
  borderLight: '#3a3a5a',

  // Base
  white: '#ffffff',
  black: '#000000',

  // Secondary
  secondary: '#6366f1',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const fontSize = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export function getCapStatusColor(capRoom: number, salaryCap: number): string {
  const pct = capRoom / salaryCap;
  if (pct > 0.15) return colors.capHealthy;
  if (pct > 0.05) return colors.capWarning;
  return colors.capCritical;
}

export function getPositionColor(position: string): string {
  switch (position?.toUpperCase()) {
    case 'QB': return colors.qb;
    case 'RB': return colors.rb;
    case 'WR': return colors.wr;
    case 'TE': return colors.te;
    default: return colors.textMuted;
  }
}
