/**
 * Battle Store
 * Manages battle and team state
 */

import { create } from 'zustand';
import api from '@/services/api';

interface Character {
  id: number;
  name: string;
  type: string;
  rarity: string;
  level: number;
  current_atk: number;
  current_def: number;
  current_hp: number;
}

interface Team {
  id: number;
  name: string;
  slot_1: number | null;
  slot_2: number | null;
  slot_3: number | null;
  slot_4: number | null;
  slot_5: number | null;
  is_active: boolean;
  characters?: Array<{ slot: number; character: Character }>;
}

interface Stage {
  id: number;
  stage_number: number;
  name: string;
  description: string;
  difficulty: string;
  recommended_power: number;
  is_unlocked: boolean;
  times_completed: number;
}

interface BattleResult {
  result: 'Victory' | 'Defeat';
  turns: number;
  rewards: { gold: number; exp: number };
  stage: string;
}

interface BattleState {
  teams: Team[];
  activeTeam: Team | null;
  stages: Stage[];
  battleResult: BattleResult | null;
  isBattling: boolean;
  isLoading: boolean;

  // Actions
  loadTeams: () => Promise<void>;
  loadActiveTeam: () => Promise<void>;
  createTeam: (name: string, slots: any) => Promise<void>;
  updateTeam: (teamId: number, updates: any) => Promise<void>;
  setActiveTeam: (teamId: number) => Promise<void>;
  deleteTeam: (teamId: number) => Promise<void>;

  loadStages: () => Promise<void>;
  startBattle: (stageId: number) => Promise<void>;
  clearBattleResult: () => void;
}

export const useBattleStore = create<BattleState>((set, get) => ({
  teams: [],
  activeTeam: null,
  stages: [],
  battleResult: null,
  isBattling: false,
  isLoading: false,

  loadTeams: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/teams');
      set({ teams: response.data.data });
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadActiveTeam: async () => {
    try {
      const response = await api.get('/teams/active');
      set({ activeTeam: response.data.data });
    } catch (error) {
      console.error('Failed to load active team:', error);
    }
  },

  createTeam: async (name, slots) => {
    try {
      await api.post('/teams', { name, slots });
      await get().loadTeams();
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create team');
    }
  },

  updateTeam: async (teamId, updates) => {
    try {
      await api.put(`/teams/${teamId}`, updates);
      await get().loadTeams();
      await get().loadActiveTeam();
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update team');
    }
  },

  setActiveTeam: async (teamId) => {
    try {
      await api.put(`/teams/${teamId}/activate`);
      await get().loadTeams();
      await get().loadActiveTeam();
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to activate team');
    }
  },

  deleteTeam: async (teamId) => {
    try {
      await api.delete(`/teams/${teamId}`);
      await get().loadTeams();
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete team');
    }
  },

  loadStages: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/battles/stages');
      set({ stages: response.data.data });
    } catch (error) {
      console.error('Failed to load stages:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  startBattle: async (stageId) => {
    set({ isBattling: true, battleResult: null });
    try {
      const response = await api.post('/battles/start', { stageId });
      set({ battleResult: response.data.data, isBattling: false });
    } catch (error: any) {
      set({ isBattling: false });
      throw new Error(error.response?.data?.message || 'Battle failed');
    }
  },

  clearBattleResult: () => {
    set({ battleResult: null });
  }
}));
