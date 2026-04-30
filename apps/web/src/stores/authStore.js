import { create } from 'zustand';
import api from '@/lib/axios';

export const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: true,
  error: null,

  // Actions
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      set({ user: response.data.user, isLoading: false });
      return response.data.user;
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Login failed', 
        isLoading: false 
      });
      throw error;
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/register', { email, password, name });
      set({ user: response.data.user, isLoading: false });
      return response.data.user;
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Registration failed', 
        isLoading: false 
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
      set({ user: null });
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear user even if API fails
      set({ user: null });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/auth/me');
      set({ user: response.data.user, isLoading: false });
    } catch (error) {
      // If not authenticated, clear user
      set({ user: null, isLoading: false });
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true });
    try {
      const formData = new FormData();
      if (data.name) formData.append('name', data.name);
      if (data.avatar) formData.append('avatar', data.avatar);

      const response = await api.patch('/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      set({ user: response.data.user, isLoading: false });
      return response.data.user;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
