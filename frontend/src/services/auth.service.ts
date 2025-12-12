/**
 * Auth Service
 * Authentication and user management
 */

import { apiService } from './api';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
} from '@/types';

export const authService = {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/auth/register', data);
    return response.data.data!;
  },

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/auth/login', credentials);
    return response.data.data!;
  },

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    const response = await apiService.get<User>('/auth/profile');
    return response.data.data!;
  },

  /**
   * Get user resources
   */
  async getResources(): Promise<{
    gems: number;
    gold: number;
    inventory_slots: number;
    pity_counter: number;
  }> {
    const response = await apiService.get('/auth/resources');
    return response.data.data!;
  },

  /**
   * Logout user (clear cookie)
   */
  async logout(): Promise<void> {
    try {
      await apiService.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  /**
   * Verify session (check if cookie is valid)
   */
  async verifySession(): Promise<User | null> {
    try {
      const response = await apiService.get<User>('/auth/profile');
      return response.data.data!;
    } catch (error) {
      return null;
    }
  },

  /**
   * Save auth data to localStorage
   */
  saveAuthData(data: AuthResponse): void {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  },

  /**
   * Clear auth data from localStorage
   */
  clearAuthData(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Get token from localStorage
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  },

  /**
   * Get user from localStorage
   */
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
