import { create } from 'zustand';
import api from '@/lib/axios';

export const useActionItemsStore = create((set, get) => ({
  actionItems: [],
  isLoading: false,
  error: null,

  // Actions
  fetchActionItems: async (workspaceId, filters = {}) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.assigneeId) params.append('assigneeId', filters.assigneeId);
      if (filters.goalId) params.append('goalId', filters.goalId);
      
      const response = await api.get(`/action-items/workspace/${workspaceId}?${params}`);
      set({ actionItems: response.data.actionItems, isLoading: false });
    } catch (error) {
      set({ error: error.response?.data?.error, isLoading: false });
    }
  },

  createActionItem: async (data) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/action-items', data);
      const newItem = response.data.actionItem;
      set(state => ({ 
        actionItems: [newItem, ...state.actionItems],
        isLoading: false 
      }));
      return newItem;
    } catch (error) {
      set({ error: error.response?.data?.error, isLoading: false });
      throw error;
    }
  },

  updateActionItem: async (id, data) => {
    set({ isLoading: true });
    try {
      const response = await api.patch(`/action-items/${id}`, data);
      const updated = response.data.actionItem;
      set(state => ({
        actionItems: state.actionItems.map(item => item.id === id ? updated : item),
        isLoading: false
      }));
      return updated;
    } catch (error) {
      set({ error: error.response?.data?.error, isLoading: false });
      throw error;
    }
  },

  updateActionItemStatus: async (id, status) => {
    try {
      const response = await api.patch(`/action-items/${id}/status`, { status });
      const updated = response.data.actionItem;
      set(state => ({
        actionItems: state.actionItems.map(item => item.id === id ? updated : item)
      }));
      return updated;
    } catch (error) {
      throw error;
    }
  },

  deleteActionItem: async (id) => {
    set({ isLoading: true });
    try {
      await api.delete(`/action-items/${id}`);
      set(state => ({
        actionItems: state.actionItems.filter(item => item.id !== id),
        isLoading: false
      }));
    } catch (error) {
      set({ error: error.response?.data?.error, isLoading: false });
      throw error;
    }
  },

  // Real-time handlers
  handleActionItemCreated: (actionItem) => {
    set(state => {
      // Check if action item already exists to avoid duplicates
      const exists = state.actionItems.some(a => a.id === actionItem.id);
      if (exists) return state;
      return {
        actionItems: [actionItem, ...state.actionItems]
      };
    });
  },

  handleActionItemUpdated: (actionItem) => {
    set(state => ({
      actionItems: state.actionItems.map(item => item.id === actionItem.id ? actionItem : item)
    }));
  },

  handleActionItemDeleted: (id) => {
    set(state => ({
      actionItems: state.actionItems.filter(item => item.id !== id)
    }));
  },

  clearError: () => set({ error: null }),
}));
