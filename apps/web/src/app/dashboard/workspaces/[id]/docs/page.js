'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Users, Wifi, WifiOff } from 'lucide-react';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
const STORAGE_PREFIX = 'fredocloud-doc:';
const EDITOR_PADDING_X = 16;
const EDITOR_PADDING_Y = 16;
const EDITOR_LINE_HEIGHT = 24;
const EDITOR_CHAR_WIDTH = 8.4;

function getUserColor(userId = '') {
  const total = userId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return COLORS[total % COLORS.length];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default function WorkspaceDocsPage() {
  const params = useParams();
  const workspaceId = params.id;
  const documentId = `workspace:${workspaceId}:docs`;
  const storageKey = `${STORAGE_PREFIX}${documentId}`;

  const textareaRef = useRef(null);
  const remoteUpdateRef = useRef(false);
  const debounceRef = useRef(null);
  const contentRef = useRef('');

  const { user } = useAuthStore();
  const { socket } = useSocket();

  const [content, setContent] = useState('');
  const [remoteCursors, setRemoteCursors] = useState({});
  const [participants, setParticipants] = useState({});
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const isConnected = Boolean(socket?.connected);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    const initialContent = saved || '# Workspace Docs\n\nStart collaborating here...';
    contentRef.current = initialContent;
    setContent(initialContent);
  }, [storageKey]);

  const broadcastCursor = useCallback(() => {
    const textarea = textareaRef.current;
    if (!socket || !textarea) return;

    socket.emit('document:cursor', {
      documentId,
      cursor: {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
        contentLength: textarea.value.length,
        updatedAt: Date.now()
      }
    });
  }, [socket, documentId]);

  useEffect(() => {
    if (!socket || !workspaceId) return;

    const handleConnect = () => {
      socket.emit('document:join', { documentId });
    };

    const handleUserJoined = ({ user: joinedUser }) => {
      if (!joinedUser || joinedUser.id === user?.id) return;
      setParticipants(prev => ({ ...prev, [joinedUser.id]: joinedUser }));
    };

    const handleCursor = ({ userId, user: cursorUser, cursor }) => {
      if (!userId || userId === user?.id) return;

      setParticipants(prev => ({ ...prev, [userId]: cursorUser }));
      setRemoteCursors(prev => ({
        ...prev,
        [userId]: {
          ...cursor,
          user: cursorUser,
          color: getUserColor(userId)
        }
      }));
    };

    const handleCursorRemove = ({ userId }) => {
      setRemoteCursors(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setParticipants(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    const handleOperation = ({ userId, user: operationUser, operation }) => {
      if (!operation || userId === user?.id) return;

      remoteUpdateRef.current = true;
      setParticipants(prev => ({ ...prev, [userId]: operationUser }));
      contentRef.current = operation.content || '';
      setContent(operation.content || '');
      window.localStorage.setItem(storageKey, operation.content || '');
      setLastSavedAt(new Date());
    };

    const handleSyncRequest = ({ requesterId }) => {
      if (!requesterId || requesterId === user?.id) return;

      socket.emit('document:sync-response', {
        documentId,
        requesterId,
        content: contentRef.current
      });
    };

    const handleSyncResponse = ({ documentId: responseDocumentId, userId, user: syncUser, content: syncedContent }) => {
      if (responseDocumentId !== documentId || userId === user?.id) return;

      contentRef.current = syncedContent || '';
      setParticipants(prev => ({ ...prev, [userId]: syncUser }));
      setContent(syncedContent || '');
      window.localStorage.setItem(storageKey, syncedContent || '');
      setLastSavedAt(new Date());
    };

    socket.on('connect', handleConnect);
    socket.on('document:user-joined', handleUserJoined);
    socket.on('user:cursor', handleCursor);
    socket.on('user:cursor-remove', handleCursorRemove);
    socket.on('document:operation', handleOperation);
    socket.on('document:sync-request', handleSyncRequest);
    socket.on('document:sync-response', handleSyncResponse);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.emit('document:leave', { documentId });
      socket.off('connect', handleConnect);
      socket.off('document:user-joined', handleUserJoined);
      socket.off('user:cursor', handleCursor);
      socket.off('user:cursor-remove', handleCursorRemove);
      socket.off('document:operation', handleOperation);
      socket.off('document:sync-request', handleSyncRequest);
      socket.off('document:sync-response', handleSyncResponse);
    };
  }, [socket, workspaceId, documentId, storageKey, user?.id]);

  const handleChange = (event) => {
    const nextContent = event.target.value;
    contentRef.current = nextContent;
    setContent(nextContent);
    window.localStorage.setItem(storageKey, nextContent);
    setLastSavedAt(new Date());

    if (remoteUpdateRef.current) {
      remoteUpdateRef.current = false;
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      socket?.emit('document:operation', {
        documentId,
        operation: {
          type: 'replace-content',
          content: nextContent,
          updatedAt: Date.now()
        }
      });
    }, 120);
  };

  const cursorRows = useMemo(() => {
    const lines = content.split('\n');

    return Object.entries(remoteCursors).map(([userId, cursor]) => {
      const position = clamp(cursor.start || 0, 0, content.length);
      let remaining = position;
      let line = 0;
      let column = 0;

      for (let i = 0; i < lines.length; i += 1) {
        if (remaining <= lines[i].length) {
          line = i;
          column = remaining;
          break;
        }
        remaining -= lines[i].length + 1;
      }

      return {
        userId,
        name: cursor.user?.name || cursor.user?.email || 'Collaborator',
        color: cursor.color,
        line: line + 1,
        column: column + 1
      };
    });
  }, [remoteCursors, content]);

  const participantList = Object.values(participants);
  const inlineCursors = cursorRows.map(cursor => ({
    ...cursor,
    top: EDITOR_PADDING_Y + ((cursor.line - 1) * EDITOR_LINE_HEIGHT),
    left: EDITOR_PADDING_X + ((cursor.column - 1) * EDITOR_CHAR_WIDTH)
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Workspace Docs
          </h1>
          <p className="text-muted-foreground">
            Collaborative workspace notes with live cursors and presence.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isConnected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardHeader>
            <CardTitle>Shared Document</CardTitle>
            <CardDescription>
              {lastSavedAt ? `Last synced ${lastSavedAt.toLocaleTimeString()}` : 'Ready to collaborate'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleChange}
                onSelect={broadcastCursor}
                onKeyUp={broadcastCursor}
                onClick={broadcastCursor}
                onBlur={broadcastCursor}
                onScroll={broadcastCursor}
                className="min-h-[520px] w-full resize-y rounded-md border bg-background p-4 font-mono text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
                placeholder="Start typing your shared workspace document..."
                spellCheck={false}
              />

              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-md">
                {inlineCursors.map(cursor => (
                  <div
                    key={cursor.userId}
                    className="absolute flex -translate-y-1 flex-col items-start"
                    style={{
                      top: cursor.top,
                      left: cursor.left,
                      color: cursor.color
                    }}
                  >
                    <div
                      className="h-6 w-0.5 animate-pulse rounded-full"
                      style={{ backgroundColor: cursor.color }}
                    />
                    <div
                      className="mt-0.5 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm"
                      style={{ backgroundColor: cursor.color }}
                    >
                      {cursor.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Presence
              </CardTitle>
              <CardDescription>
                Open this page in two windows as different users to test multi-cursor collaboration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 rounded-md border p-2">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user?.name || user?.email || 'You'}</p>
                  <p className="text-xs text-muted-foreground">You</p>
                </div>
              </div>

              {participantList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No other collaborators currently visible.</p>
              ) : (
                participantList.map(participant => (
                  <div key={participant.id} className="flex items-center gap-2 rounded-md border p-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getUserColor(participant.id) }} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{participant.name || participant.email}</p>
                      <p className="text-xs text-muted-foreground">Collaborating</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Remote Cursors</CardTitle>
              <CardDescription>Approximate cursor line and column for each collaborator.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {cursorRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Move a cursor in another window to see it here.</p>
              ) : (
                cursorRows.map(cursor => (
                  <div key={cursor.userId} className="rounded-md border p-2 text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cursor.color }} />
                      {cursor.name}
                    </div>
                    <p className="text-xs text-muted-foreground">Line {cursor.line}, Column {cursor.column}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full" onClick={() => textareaRef.current?.focus()}>
            Focus editor
          </Button>
        </div>
      </div>
    </div>
  );
}
