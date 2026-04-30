import { create } from 'zustand';
import api from '@/lib/axios';

export const useGoalsStore = create((set, get) => ({
  goals: [],
  currentGoal: null,
  isLoading: false,
  error: null,

  // Actions
  fetchGoals: async (workspaceId) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/goals/workspace/${workspaceId}`);
      set({ goals: response.data.goals, isLoading: false });
    } catch (error) {
      set({ error: error.response?.data?.error, isLoading: false });
    }
  },

  createGoal: async (data) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/goals', data);
      const newGoal = response.data.goal;
      set(state => {
        const exists = state.goals.some(g => g.id === newGoal.id);
        return {
          goals: exists ? state.goals : [newGoal, ...state.goals],
          isLoading: false
        };
      });
      return newGoal;
    } catch (error) {
      set({ error: error.response?.data?.error, isLoading: false });
      throw error;
    }
  },

  fetchGoal: async (id) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/goals/${id}`);
      set({ currentGoal: response.data.goal, isLoading: false });
      return response.data.goal;
    } catch (error) {
      set({ error: error.response?.data?.error, isLoading: false });
      throw error;
    }
  },

  updateGoal: async (id, data) => {
    set({ isLoading: true });
    try {
      const response = await api.patch(`/goals/${id}`, data);
      const updated = response.data.goal;
      set(state => ({
        goals: state.goals.map(g => g.id === id ? updated : g),
        currentGoal: state.currentGoal?.id === id ? updated : state.currentGoal,
        isLoading: false
      }));
      return updated;
    } catch (error) {
      set({ error: error.response?.data?.error, isLoading: false });
      throw error;
    }
  },

  deleteGoal: async (id) => {
    set({ isLoading: true });
    try {
      await api.delete(`/goals/${id}`);
      set(state => ({
        goals: state.goals.filter(g => g.id !== id),
        currentGoal: state.currentGoal?.id === id ? null : state.currentGoal,
        isLoading: false
      }));
    } catch (error) {
      set({ error: error.response?.data?.error, isLoading: false });
      throw error;
    }
  },

  // Milestones
  createMilestone: async (goalId, data) => {
    try {
      const response = await api.post(`/goals/${goalId}/milestones`, data);
      const newMilestone = response.data.milestone;
      set(state => {
        if (state.currentGoal?.id === goalId) {
          return {
            currentGoal: {
              ...state.currentGoal,
              milestones: [...state.currentGoal.milestones, newMilestone]
            }
          };
        }
        return state;
      });
      return newMilestone;
    } catch (error) {
      throw error;
    }
  },

  updateMilestone: async (milestoneId, data) => {
    try {
      const response = await api.patch(`/goals/milestones/${milestoneId}`, data);
      const updated = response.data.milestone;
      const updatedGoal = response.data.goal;
      set(state => {
        if (state.currentGoal?.milestones) {
          return {
            goals: updatedGoal
              ? state.goals.map(g => g.id === updatedGoal.id ? updatedGoal : g)
              : state.goals,
            currentGoal: {
              ...(updatedGoal || state.currentGoal),
              milestones: state.currentGoal.milestones.map(m => 
                m.id === milestoneId ? updated : m
              )
            }
          };
        }
        return state;
      });
      return updated;
    } catch (error) {
      throw error;
    }
  },

  deleteMilestone: async (milestoneId) => {
    try {
      await api.delete(`/goals/milestones/${milestoneId}`);
      set(state => {
        if (state.currentGoal?.milestones) {
          return {
            currentGoal: {
              ...state.currentGoal,
              milestones: state.currentGoal.milestones.filter(m => m.id !== milestoneId)
            }
          };
        }
        return state;
      });
    } catch (error) {
      throw error;
    }
  },

  // Real-time updates
  handleGoalCreated: (goal) => {
    set(state => {
      // Check if goal already exists to avoid duplicates
      const exists = state.goals.some(g => g.id === goal.id);
      if (exists) return state;
      return {
        goals: [goal, ...state.goals]
      };
    });
  },

  handleGoalUpdated: (goal) => {
    set(state => ({
      goals: state.goals.map(g => g.id === goal.id ? goal : g),
      currentGoal: state.currentGoal?.id === goal.id ? goal : state.currentGoal
    }));
  },

  handleGoalDeleted: (id) => {
    set(state => ({
      goals: state.goals.filter(g => g.id !== id),
      currentGoal: state.currentGoal?.id === id ? null : state.currentGoal
    }));
  },

  handleMilestoneCreated: (milestone) => {
    set(state => {
      if (state.currentGoal?.id !== milestone.goalId) return state;

      const exists = state.currentGoal.milestones?.some(m => m.id === milestone.id);
      if (exists) return state;

      return {
        currentGoal: {
          ...state.currentGoal,
          milestones: [...(state.currentGoal.milestones || []), milestone]
        }
      };
    });
  },

  handleMilestoneUpdated: (milestone) => {
    set(state => {
      if (state.currentGoal?.id !== milestone.goalId) return state;

      return {
        goals: state.goals.map(g => {
          if (g.id !== milestone.goalId) return g;

          return {
            ...g,
            milestones: (g.milestones || []).map(m =>
              m.id === milestone.id ? milestone : m
            )
          };
        }),
        currentGoal: {
          ...state.currentGoal,
          milestones: (state.currentGoal.milestones || []).map(m =>
            m.id === milestone.id ? milestone : m
          )
        }
      };
    });
  },

  handleMilestoneDeleted: (id) => {
    set(state => {
      if (!state.currentGoal?.milestones) return state;

      return {
        currentGoal: {
          ...state.currentGoal,
          milestones: state.currentGoal.milestones.filter(m => m.id !== id)
        }
      };
    });
  },

  clearError: () => set({ error: null }),
}));
