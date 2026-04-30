'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useGoalsStore } from '@/stores/goalsStore';
import { useAnnouncementsStore } from '@/stores/announcementsStore';
import { useActionItemsStore } from '@/stores/actionItemsStore';

export function SocketStatus() {
  const [status, setStatus] = useState('disconnected');
  const [socketId, setSocketId] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);
  const { socket } = useSocket();
  const goalsStore = useGoalsStore();
  const announcementsStore = useAnnouncementsStore();
  const actionItemsStore = useActionItemsStore();

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      console.log('SocketStatus: Connected', socket.id);
      setStatus('connected');
      setSocketId(socket.id);
    };

    const onDisconnect = () => {
      console.log('SocketStatus: Disconnected');
      setStatus('disconnected');
      setSocketId(null);
    };

    const onConnectError = (error) => {
      console.log('SocketStatus: Connection error', error.message);
      setStatus('error');
    };

    // Listen for actual events
    const onGoalCreated = (data) => {
      console.log('SocketStatus: Received goal:created', data);
      setLastEvent(`goal:created ${data.id?.slice(-6) || ''}`);
    };

    const onAnnouncementCreated = (data) => {
      console.log('SocketStatus: Received announcement:created', data);
      setLastEvent(`announcement:created ${data.id?.slice(-6) || ''}`);
    };

    const onActionItemCreated = (data) => {
      console.log('SocketStatus: Received actionItem:created', data);
      setLastEvent(`actionItem:created ${data.id?.slice(-6) || ''}`);
    };

    // Set initial state
    if (socket.connected) {
      setStatus('connected');
      setSocketId(socket.id);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('goal:created', onGoalCreated);
    socket.on('announcement:created', onAnnouncementCreated);
    socket.on('actionItem:created', onActionItemCreated);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('goal:created', onGoalCreated);
      socket.off('announcement:created', onAnnouncementCreated);
      socket.off('actionItem:created', onActionItemCreated);
    };
  }, [socket]);

  const colors = {
    connected: 'bg-green-500',
    disconnected: 'bg-gray-400',
    error: 'bg-red-500'
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-1 px-3 py-2 bg-background border rounded-lg shadow-lg">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
        <span className="text-xs text-muted-foreground">
          Socket: {status} {socketId && `(${socketId.slice(-6)})`}
        </span>
      </div>
      {lastEvent && (
        <span className="text-xs text-green-600">
          Last: {lastEvent}
        </span>
      )}
    </div>
  );
}
