/**
 * Auth Store
 * Global authentication state management
 */

import { create } from 'zustand';
import { authService } from '@/services/auth.service';
import type { User, LoginCredentials, RegisterData } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  loadUserFromStorage: () => void;
  verifySession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  updateUserResources: (resources: Partial<Pick<User, 'gems' | 'gold' | 'pity_counter'>>) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  /**
   * Login user
   */
  login: async (credentials) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authService.login(credentials);
      authService.saveAuthData(response);

      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Register new user
   */
  register: async (data) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authService.register(data);
      authService.saveAuthData(response);

      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Registration failed',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Logout user
   */
  logout: async () => {
    await authService.logout();
    authService.clearAuthData();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  /**
   * Load user from localStorage on app start
   */
  loadUserFromStorage: () => {
    const token = authService.getToken();
    const user = authService.getStoredUser();

    if (token && user) {
      set({
        token,
        user,
        isAuthenticated: true,
      });
    }
  },

  /**
   * Verify session with server (check cookie)
   */
  verifySession: async () => {
    try {
      const user = await authService.verifySession();

      if (user) {
        // Session is valid, update state
        set({
          user,
          isAuthenticated: true,
        });

        // Update localStorage
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        // Session invalid, clear state
        authService.clearAuthData();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error('Session verification failed:', error);
      authService.clearAuthData();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
      });
    }
  },

  /**
   * Refresh user profile from server
   */
  refreshProfile: async () => {
    try {
      const user = await authService.getProfile();
      set({ user });

      // Update localStorage
      const currentData = authService.getStoredUser();
      if (currentData) {
        localStorage.setItem('user', JSON.stringify(user));
      }
    } catch (error: any) {
      console.error('Failed to refresh profile:', error);
    }
  },

  /**
   * Update user data
   */
  updateUser: (data) => {
    const { user } = get();
    if (!user) return;

    const updatedUser = { ...user, ...data };
    set({ user: updatedUser });

    // Update localStorage
    localStorage.setItem('user', JSON.stringify(updatedUser));
  },

  /**
   * Update user resources locally (optimistic update)
   */
  updateUserResources: (resources) => {
    const { user } = get();
    if (!user) return;

    const updatedUser = { ...user, ...resources };
    set({ user: updatedUser });

    // Update localStorage
    localStorage.setItem('user', JSON.stringify(updatedUser));
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },
}));
