import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import { STORAGE_KEY } from './constants';
import { getDefaultRookiePickValues } from './constants';

// SSR-safe storage: use localStorage on web, AsyncStorage on native
function getZustandStorage() {
  if (typeof window === 'undefined') {
    // SSR no-op
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  if (Platform.OS === 'web') {
    return localStorage;
  }
  return require('@react-native-async-storage/async-storage').default;
}
import type { League, Team, TeamCapSummary, Contract, DraftPick, CapAdjustment, AppSettings } from '../types';

interface AppState {
  // League data
  currentLeague: League | null;
  currentTeam: Team | null;
  teams: Team[];
  capSummaries: TeamCapSummary[];
  roster: Contract[];
  draftPicks: DraftPick[];
  capAdjustments: CapAdjustment[];
  allContracts: Contract[];

  // UI state
  isCommissioner: boolean;
  isLoading: boolean;

  // Persisted settings
  settings: AppSettings;

  // Actions
  setCurrentLeague: (league: League | null) => void;
  setCurrentTeam: (team: Team | null) => void;
  setTeams: (teams: Team[]) => void;
  setCapSummaries: (summaries: TeamCapSummary[]) => void;
  setRoster: (roster: Contract[]) => void;
  setDraftPicks: (picks: DraftPick[]) => void;
  setCapAdjustments: (adjustments: CapAdjustment[]) => void;
  setAllContracts: (contracts: Contract[]) => void;
  setIsCommissioner: (isCommissioner: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  reset: () => void;
}

const defaultSettings: AppSettings = {
  rookieDraftRounds: 3,
  rookiePickValues: getDefaultRookiePickValues(3),
  isOffseason: true,
  commissionerTeamIds: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentLeague: null,
      currentTeam: null,
      teams: [],
      capSummaries: [],
      roster: [],
      draftPicks: [],
      capAdjustments: [],
      allContracts: [],
      isCommissioner: false,
      isLoading: false,
      settings: defaultSettings,

      setCurrentLeague: (currentLeague) => set({ currentLeague }),
      setCurrentTeam: (currentTeam) => set({ currentTeam }),
      setTeams: (teams) => set({ teams }),
      setCapSummaries: (capSummaries) => set({ capSummaries }),
      setRoster: (roster) => set({ roster }),
      setDraftPicks: (picks) => set({ draftPicks: picks }),
      setCapAdjustments: (adjustments) => set({ capAdjustments: adjustments }),
      setAllContracts: (contracts) => set({ allContracts: contracts }),
      setIsCommissioner: (isCommissioner) => set({ isCommissioner }),
      setIsLoading: (isLoading) => set({ isLoading }),
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      reset: () =>
        set({
          currentLeague: null,
          currentTeam: null,
          teams: [],
          capSummaries: [],
          roster: [],
          draftPicks: [],
          capAdjustments: [],
          allContracts: [],
          isCommissioner: false,
          isLoading: false,
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => getZustandStorage()),
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);

// Selectors
export const selectCurrentTeamCap = (state: AppState) =>
  state.capSummaries.find((s) => s.team_id === state.currentTeam?.id);

export const selectIsCommissioner = (state: AppState) =>
  state.currentTeam ? state.settings.commissionerTeamIds.includes(state.currentTeam.id) : false;

export const selectCurrentLeagueId = (state: AppState) =>
  state.currentLeague?.id ?? null;
