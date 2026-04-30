'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ChevronRight, Users, Target, CheckSquare } from 'lucide-react';
import { CreateWorkspaceModal } from '@/components/create-workspace-modal';

export default function DashboardPage() {
  const router = useRouter();
  const { workspaces, isLoading, fetchWorkspaces } = useWorkspaceStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <h1 className="text-3xl font-bold mb-4">Welcome to Team Hub</h1>
        <p className="text-muted-foreground mb-8">
          Get started by creating your first workspace. Workspaces help you organize 
          goals, announcements, and action items for your team.
        </p>
        <Button onClick={() => setShowCreateModal(true)} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Create Workspace
        </Button>
        <CreateWorkspaceModal 
          open={showCreateModal} 
          onClose={() => setShowCreateModal(false)} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Workspaces</h1>
          <p className="text-muted-foreground">
            Select a workspace to get started
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Workspace
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces.map((workspace) => (
          <Card 
            key={workspace.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push(`/dashboard/workspaces/${workspace.id}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                  style={{ backgroundColor: workspace.accentColor }}
                >
                  {workspace.name.charAt(0).toUpperCase()}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardTitle className="mt-4">{workspace.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {workspace.description || 'No description'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {workspace.memberCount || workspace._count?.members || 0}
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  {workspace._count?.goals || 0}
                </div>
                <div className="flex items-center gap-1">
                  <CheckSquare className="h-4 w-4" />
                  {workspace._count?.actionItems || 0}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-secondary">
                  {workspace.role}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateWorkspaceModal 
        open={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
    </div>
  );
}
