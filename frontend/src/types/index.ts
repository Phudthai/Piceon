/**
 * Type definitions for Piceon Frontend
 */

// ============================================
// User & Auth Types
// ============================================

export interface User {
  id: number;
  username: string;
  email: string;
  gems: number;
  gold: number;
  inventory_slots: number;
  pity_counter: number;
  character_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

// ============================================
// Character Types
// ============================================

export type CharacterType = 'Warrior' | 'Mage' | 'Archer' | 'Tank' | 'Assassin';
export type CharacterRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export interface CharacterTemplate {
  id: number;
  name: string;
  type: CharacterType;
  rarity: CharacterRarity;
  base_atk: number;
  base_def: number;
  base_hp: number;
  special_ability: string;
  ability_description?: string;
  image_url: string;
  drop_weight?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PlayerCharacter {
  id: number;
  user_id: number;
  template_id: number;
  level: number;
  experience: number;
  current_atk: number;
  current_def: number;
  current_hp: number;
  is_locked: boolean;
  is_favorite: boolean;
  obtained_at: string;
  updated_at?: string;

  // Joined from template
  name?: string;
  type?: CharacterType;
  rarity?: CharacterRarity;
  image_url?: string;
  special_ability?: string;
  ability_description?: string;
}

// ============================================
// Gacha Types
// ============================================

export type BannerType = 'Normal' | 'Premium';
export type PullType = 'Single' | '10x';
export type CostType = 'Gems' | 'Gold';

export interface GachaBanner {
  id: number;
  name: string;
  description?: string;
  type: BannerType;
  cost_gems: number;
  cost_gold: number;
  multi_pull_gems: number;
  multi_pull_gold: number;
  multi_pull_count: number;
  is_active: boolean;
  start_date: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GachaPullResult {
  success: boolean;
  character?: CharacterTemplate;
  characters?: CharacterTemplate[];
  playerCharacter?: PlayerCharacter;
  playerCharacters?: PlayerCharacter[];
  isPity: boolean;
  pityCounter: number;
  costType: CostType;
  costAmount: number;
}

export interface GachaHistory {
  id: number;
  user_id: number;
  banner_id: number;
  pull_type: PullType;
  cost_type: CostType;
  cost_amount: number;
  characters_obtained: number[];
  was_pity_triggered: boolean;
  pulled_at: string;

  // Joined from banner
  banner_name?: string;
  banner_type?: BannerType;
}

export interface GachaStats {
  total_pulls: number;
  single_pulls: number;
  multi_pulls: number;
  total_gems_spent: number;
  total_gold_spent: number;
  pity_triggers: number;
}

// ============================================
// Inventory Types
// ============================================

export interface InventoryStats {
  total_characters: number;
  unique_rarities: number;
  unique_types: number;
  common_count: number;
  rare_count: number;
  epic_count: number;
  legendary_count: number;
  avg_level: number;
  locked_count: number;
  favorite_count: number;
}

export interface InventoryFilters {
  rarity?: CharacterRarity;
  type?: CharacterType;
  locked?: boolean;
  favorite?: boolean;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ============================================
// UI State Types
// ============================================

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  details?: any;
}

// ============================================
// Rarity Colors for UI
// ============================================

export const RARITY_COLORS: Record<CharacterRarity, string> = {
  Common: 'text-gray-500 bg-gray-100',
  Rare: 'text-blue-500 bg-blue-100',
  Epic: 'text-purple-500 bg-purple-100',
  Legendary: 'text-yellow-500 bg-yellow-100'
};

export const RARITY_BORDER: Record<CharacterRarity, string> = {
  Common: 'border-gray-500',
  Rare: 'border-blue-500',
  Epic: 'border-purple-500',
  Legendary: 'border-yellow-500'
};

// ============================================
// Type Colors for UI
// ============================================

export const TYPE_COLORS: Record<CharacterType, string> = {
  Warrior: 'text-red-600',
  Mage: 'text-blue-600',
  Archer: 'text-green-600',
  Tank: 'text-gray-700',
  Assassin: 'text-purple-600'
};

// ============================================
// Daily Reward Types
// ============================================

export interface DailyRewardConfig {
  gold: number;
  gems: number;
}

export interface DailyRewardStatus {
  canClaim: boolean;
  currentDay: number;
  nextReward: DailyRewardConfig;
  lastClaimedAt: string | null;
  totalClaims: number;
  totalGoldEarned: number;
  totalGemsEarned: number;
  allRewards: Record<number, DailyRewardConfig>;
  claimedDays: number[];
}

export interface DailyRewardClaimResult {
  success: boolean;
  day: number;
  reward: DailyRewardConfig;
  nextDay: number;
  user: User;
}

