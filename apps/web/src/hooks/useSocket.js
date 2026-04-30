'use client';

import { useEffect, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useGoalsStore } from '@/stores/goalsStore';
import { useAnnouncementsStore } from '@/stores/announcementsStore';
import { useActionItemsStore } from '@/stores/actionItemsStore';

let sharedSocket = null;
let joinedWorkspaceId = null;

export function useSocket() {
  const [socketState, setSocketState] = useState(sharedSocket);
  const { user } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();
  const goalsStore = useGoalsStore();
  const announcementsStore = useAnnouncementsStore();
  const actionItemsStore = useActionItemsStore();

  // Initialize socket connection once when user logs in
  useEffect(() => {
    if (!user) {
      // Disconnect if user logs out
      if (sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
        joinedWorkspaceId = null;
      }
      return;
    }

    // Only create socket if it doesn't exist
    if (!sharedSocket) {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
      
      const socket = io(socketUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      sharedSocket = socket;
      setSocketState(socket);

      socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      // Goal events
      socket.on('goal:created', (goal) => {
        console.log('Real-time: goal created', goal);
        goalsStore.handleGoalCreated(goal);
      });

      socket.on('goal:updated', (goal) => {
        console.log('Real-time: goal updated', goal);
        goalsStore.handleGoalUpdated(goal);
      });

      socket.on('goal:deleted', ({ id }) => {
        console.log('Real-time: goal deleted', id);
        goalsStore.handleGoalDeleted(id);
      });

      socket.on('milestone:created', (milestone) => {
        console.log('Real-time: milestone created', milestone);
        goalsStore.handleMilestoneCreated(milestone);
      });

      socket.on('milestone:updated', (milestone) => {
        console.log('Real-time: milestone updated', milestone);
        goalsStore.handleMilestoneUpdated(milestone);
      });

      socket.on('milestone:deleted', ({ id }) => {
        console.log('Real-time: milestone deleted', id);
        goalsStore.handleMilestoneDeleted(id);
      });

      // Announcement events
      socket.on('announcement:created', (announcement) => {
        console.log('Real-time: announcement created', announcement);
        announcementsStore.handleAnnouncementCreated(announcement);
      });

      socket.on('announcement:updated', (announcement) => {
        console.log('Real-time: announcement updated', announcement);
        announcementsStore.handleAnnouncementUpdated(announcement);
      });

      socket.on('announcement:deleted', ({ id }) => {
        console.log('Real-time: announcement deleted', id);
        announcementsStore.handleAnnouncementDeleted(id);
      });

      socket.on('reaction:added', ({ announcementId, reaction }) => {
        console.log('Real-time: reaction added', announcementId, reaction);
        announcementsStore.handleReactionAdded(announcementId, reaction);
      });

      socket.on('reaction:removed', ({ announcementId, userId, emoji }) => {
        announcementsStore.handleReactionRemoved(announcementId, { userId, emoji });
      });

      socket.on('comment:created', ({ announcementId, comment }) => {
        console.log('Real-time: comment created', announcementId, comment);
        announcementsStore.handleCommentCreated(announcementId, comment);
      });

      socket.on('comment:deleted', ({ announcementId, commentId }) => {
        announcementsStore.handleCommentDeleted(announcementId, commentId);
      });

      // Action item events
      socket.on('actionItem:created', (actionItem) => {
        console.log('Real-time: action item created', actionItem);
        actionItemsStore.handleActionItemCreated(actionItem);
      });

      socket.on('actionItem:updated', (actionItem) => {
        console.log('Real-time: action item updated', actionItem);
        actionItemsStore.handleActionItemUpdated(actionItem);
      });

      socket.on('actionItem:deleted', ({ id }) => {
        console.log('Real-time: action item deleted', id);
        actionItemsStore.handleActionItemDeleted(id);
      });

      // Notification
      socket.on('notification:new', () => {
        console.log('New notification received');
      });
    }

    if (sharedSocket && socketState !== sharedSocket) {
      setSocketState(sharedSocket);
    }

    return () => {
      // Don't disconnect on unmount - only on user logout
    };
  }, [user]); // Only re-run when user changes (login/logout)

  // Rejoin workspace when it changes
  useEffect(() => {
    const socket = sharedSocket;
    if (!socket || !currentWorkspace) return;

    const joinWorkspace = () => {
      if (joinedWorkspaceId === currentWorkspace.id) return;
      
      // Leave previous workspace if different
      if (joinedWorkspaceId && joinedWorkspaceId !== currentWorkspace.id) {
        console.log('Leaving previous workspace:', joinedWorkspaceId);
        socket.emit('workspace:leave', joinedWorkspaceId);
      }
      
      console.log('Joining workspace:', currentWorkspace.id);
      socket.emit('workspace:join', currentWorkspace.id);
      joinedWorkspaceId = currentWorkspace.id;
    };

    if (socket.connected) {
      joinWorkspace();
    } else {
      // Wait for connection then join
      socket.once('connect', joinWorkspace);
    }

    // No cleanup - we want to stay in the workspace room
    // Only leave when explicitly changing workspaces (handled above)
  }, [currentWorkspace]);

  const emit = useCallback((event, data) => {
    if (sharedSocket) {
      sharedSocket.emit(event, data);
    }
  }, []);

  return { socket: socketState, emit };
}
