'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { WorkspaceNav } from '@/components/workspace-nav';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export default function WorkspaceLayout({ children }) {
  const params = useParams();
  const workspaceId = params.id;
  const { currentWorkspace, fetchWorkspace, setCurrentWorkspace, isLoading } = useWorkspaceStore();
  const shouldLoadWorkspace = workspaceId && currentWorkspace?.id !== workspaceId;

  useEffect(() => {
    if (shouldLoadWorkspace) {
      fetchWorkspace(workspaceId).catch(() => {});
    }
  }, [workspaceId, shouldLoadWorkspace, fetchWorkspace]);

  useEffect(() => {
    return () => {
      setCurrentWorkspace(null);
    };
  }, [setCurrentWorkspace]);

  if (shouldLoadWorkspace && isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <WorkspaceNav workspaceId={workspaceId} workspace={currentWorkspace} />
      {children}
    </div>
  );
}
