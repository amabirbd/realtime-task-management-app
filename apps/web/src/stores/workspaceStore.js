import { create } from 'zustand';
import api from '@/lib/axios';

export const useWorkspaceStore = create((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  members: [],
  isLoading: false,
  error: null,

  // Actions
  fetchWorkspaces: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/workspaces');
      set({ workspaces: response.data.workspaces, isLoading: false });
    } catch (error) {
      set({ error: error.response?.data?.error, isLoading: false });
    }
  },

  createWorkspace: async (data) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/workspaces', data);
      const newWorkspace = response.data.workspace;
      set(state => ({ 
        workspaces: [...state.workspaces, { ...newWorkspace, role: 'ADMIN' }],
        isLoading: false 
      }));
      return newWorkspace;
    } catch (error) {
      set({ error: error.response?.data?.error, isLoading: false });
      throw error;
    }
  },

  fetchWorkspace: async (id) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/workspaces/${id}`);
      set({ currentWorkspace: response.data.workspace, isLoading: false });
      return response.data.workspace;
    } catch (error) {
      set({ error: error.response?.data?.error, isLoading: false });
      throw error;
    }
  },

  updateWorkspace: async (id, data) => {
    set({ isLoading: true });
    try {
      const response = await api.patch(`/workspaces/${id}`, data);
      const updated = response.data.workspace;
      set(state => ({
        workspaces: state.workspaces.map(w => w.id === id ? { ...w, ...updated } : w),
        currentWorkspace: state.currentWorkspace?.id === id ? { ...state.currentWorkspace, ...updated } : state.currentWorkspace,
        isLoading: false
      }));
      return updated;
    } catch (error) {
      set({ error: error.response?.data?.error, isLoading: false });
      throw error;
    }
  },

  deleteWorkspace: async (id) => {
    set({ isLoading: true });
    try {
      await api.delete(`/workspaces/${id}`);
      set(state => ({
        workspaces: state.workspaces.filter(w => w.id !== id),
        currentWorkspace: state.currentWorkspace?.id === id ? null : state.currentWorkspace,
        isLoading: false
      }));
    } catch (error) {
      set({ error: error.response?.data?.error, isLoading: false });
      throw error;
    }
  },

  fetchMembers: async (workspaceId) => {
    try {
      const response = await api.get(`/workspaces/${workspaceId}/members`);
      set({ members: response.data.members });
      return response.data.members;
    } catch (error) {
      console.error('Fetch members error:', error);
      return [];
    }
  },

  inviteMember: async (workspaceId, email, role) => {
    try {
      const response = await api.post(`/workspaces/${workspaceId}/invite`, { email, role });
      set(state => ({
        members: [...state.members, response.data.member]
      }));
      return response.data.member;
    } catch (error) {
      throw error;
    }
  },

  updateMemberRole: async (workspaceId, userId, role) => {
    try {
      const response = await api.patch(`/workspaces/${workspaceId}/members/${userId}/role`, { role });
      set(state => ({
        members: state.members.map(m => m.userId === userId ? response.data.member : m)
      }));
      return response.data.member;
    } catch (error) {
      throw error;
    }
  },

  removeMember: async (workspaceId, userId) => {
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
      set(state => ({
        members: state.members.filter(m => m.userId !== userId)
      }));
    } catch (error) {
      throw error;
    }
  },

  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),

  clearError: () => set({ error: null }),
}));
