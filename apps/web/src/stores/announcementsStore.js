import { create } from 'zustand';
import api from '@/lib/axios';

export const useAnnouncementsStore = create((set, get) => ({
  announcements: [],
  isLoading: false,
  error: null,

  // Actions
  fetchAnnouncements: async (workspaceId) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/announcements/workspace/${workspaceId}`);
      set({ announcements: response.data.announcements, isLoading: false });
    } catch (error) {
      set({ error: error.response?.data?.error, isLoading: false });
    }
  },

  createAnnouncement: async (data) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/announcements', data);
      const newAnnouncement = response.data.announcement;
      set(state => ({ 
        announcements: [newAnnouncement, ...state.announcements],
        isLoading: false 
      }));
      return newAnnouncement;
    } catch (error) {
      set({ error: error.response?.data?.error, isLoading: false });
      throw error;
    }
  },

  updateAnnouncement: async (id, data) => {
    set({ isLoading: true });
    try {
      const response = await api.patch(`/announcements/${id}`, data);
      const updated = response.data.announcement;
      set(state => ({
        announcements: state.announcements.map(a => a.id === id ? updated : a).sort((a, b) => {
          // Keep pinned first
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        }),
        isLoading: false
      }));
      return updated;
    } catch (error) {
      set({ error: error.response?.data?.error, isLoading: false });
      throw error;
    }
  },

  deleteAnnouncement: async (id) => {
    set({ isLoading: true });
    try {
      await api.delete(`/announcements/${id}`);
      set(state => ({
        announcements: state.announcements.filter(a => a.id !== id),
        isLoading: false
      }));
    } catch (error) {
      set({ error: error.response?.data?.error, isLoading: false });
      throw error;
    }
  },

  // Reactions
  toggleReaction: async (announcementId, emoji) => {
    try {
      const response = await api.post(`/announcements/${announcementId}/react`, { emoji });
      
      if (response.data.removed) {
        // Reaction removed
        set(state => ({
          announcements: state.announcements.map(a => {
            if (a.id === announcementId) {
              return {
                ...a,
                reactions: a.reactions.filter(r => !(r.userId === response.config.headers['x-user-id'] && r.emoji === emoji))
              };
            }
            return a;
          })
        }));
      } else {
        // Reaction added
        const newReaction = response.data.reaction;
        set(state => ({
          announcements: state.announcements.map(a => {
            if (a.id === announcementId) {
              return {
                ...a,
                reactions: [...a.reactions, newReaction]
              };
            }
            return a;
          })
        }));
      }
    } catch (error) {
      throw error;
    }
  },

  // Comments
  addComment: async (announcementId, content) => {
    try {
      const response = await api.post(`/announcements/${announcementId}/comments`, { content });
      const newComment = response.data.comment;
      set(state => ({
        announcements: state.announcements.map(a => {
          if (a.id === announcementId) {
            return {
              ...a,
              comments: [...a.comments, newComment]
            };
          }
          return a;
        })
      }));
      return newComment;
    } catch (error) {
      throw error;
    }
  },

  deleteComment: async (commentId) => {
    try {
      await api.delete(`/announcements/comments/${commentId}`);
      set(state => ({
        announcements: state.announcements.map(a => ({
          ...a,
          comments: a.comments.filter(c => c.id !== commentId)
        }))
      }));
    } catch (error) {
      throw error;
    }
  },

  // Real-time handlers
  handleAnnouncementCreated: (announcement) => {
    set(state => {
      // Check if announcement already exists to avoid duplicates
      const exists = state.announcements.some(a => a.id === announcement.id);
      if (exists) return state;
      return {
        announcements: [announcement, ...state.announcements]
      };
    });
  },

  handleAnnouncementUpdated: (announcement) => {
    set(state => ({
      announcements: state.announcements.map(a => a.id === announcement.id ? announcement : a)
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        })
    }));
  },

  handleAnnouncementDeleted: (id) => {
    set(state => ({
      announcements: state.announcements.filter(a => a.id !== id)
    }));
  },

  handleReactionAdded: (announcementId, reaction) => {
    set(state => ({
      announcements: state.announcements.map(a => {
        if (a.id === announcementId) {
          return {
            ...a,
            reactions: [...a.reactions, reaction]
          };
        }
        return a;
      })
    }));
  },

  handleReactionRemoved: (announcementId, { userId, emoji }) => {
    set(state => ({
      announcements: state.announcements.map(a => {
        if (a.id === announcementId) {
          return {
            ...a,
            reactions: a.reactions.filter(r => !(r.userId === userId && r.emoji === emoji))
          };
        }
        return a;
      })
    }));
  },

  handleCommentCreated: (announcementId, comment) => {
    set(state => ({
      announcements: state.announcements.map(a => {
        if (a.id === announcementId) {
          return {
            ...a,
            comments: [...a.comments, comment]
          };
        }
        return a;
      })
    }));
  },

  handleCommentDeleted: (announcementId, commentId) => {
    set(state => ({
      announcements: state.announcements.map(a => {
        if (a.id === announcementId) {
          return {
            ...a,
            comments: a.comments.filter(c => c.id !== commentId)
          };
        }
        return a;
      })
    }));
  },

  clearError: () => set({ error: null }),
}));
