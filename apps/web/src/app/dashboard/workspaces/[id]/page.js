'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useGoalsStore } from '@/stores/goalsStore';
import { useAnnouncementsStore } from '@/stores/announcementsStore';
import { useActionItemsStore } from '@/stores/actionItemsStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Target, 
  Megaphone, 
  CheckSquare, 
  TrendingUp,
  Plus,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function WorkspacePage() {
  const params = useParams();
  const workspaceId = params.id;
  
  const { 
    currentWorkspace, 
    fetchWorkspace, 
    setCurrentWorkspace 
  } = useWorkspaceStore();
  
  const { goals, fetchGoals } = useGoalsStore();
  const { announcements, fetchAnnouncements } = useAnnouncementsStore();
  const { actionItems, fetchActionItems } = useActionItemsStore();

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspace(workspaceId);
    }
    
    return () => {
      setCurrentWorkspace(null);
    };
  }, [workspaceId, fetchWorkspace, setCurrentWorkspace]);

  useEffect(() => {
    if (workspaceId) {
      fetchGoals(workspaceId);
      fetchAnnouncements(workspaceId);
      fetchActionItems(workspaceId);
    }
  }, [workspaceId, fetchGoals, fetchAnnouncements, fetchActionItems]);

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const recentGoals = goals.slice(0, 5);
  const pinnedAnnouncements = announcements.filter(a => a.isPinned).slice(0, 3);
  const recentAnnouncements = announcements.filter(a => !a.isPinned).slice(0, 5);
  const inProgressItems = actionItems.filter(item => item.status === 'IN_PROGRESS').slice(0, 5);
  const todoItems = actionItems.filter(item => item.status === 'TODO').slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{currentWorkspace.name}</h1>
          <p className="text-muted-foreground mt-1">
            {currentWorkspace.description || 'No description'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/workspaces/${workspaceId}/settings`}>
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{goals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action Items</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actionItems.length}</div>
            <p className="text-xs text-muted-foreground">
              {actionItems.filter(i => i.status === 'DONE').length} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Announcements</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{announcements.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentWorkspace.stats?.members || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="action-items">Action Items</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Goals */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Goals</CardTitle>
                  <CardDescription>Latest goals in this workspace</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/workspaces/${workspaceId}/goals`}>
                    View all <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentGoals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No goals yet</p>
                ) : (
                  recentGoals.map(goal => (
                    <div key={goal.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{goal.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {goal.status} • {goal.milestones?.length || 0} milestones
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/workspaces/${workspaceId}/goals/${goal.id}`}>
                          View
                        </Link>
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Action Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Action Items</CardTitle>
                  <CardDescription>Items in progress</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/workspaces/${workspaceId}/action-items`}>
                    View all <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {[...inProgressItems, ...todoItems].slice(0, 5).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No action items</p>
                ) : (
                  [...inProgressItems, ...todoItems].slice(0, 5).map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.status} • {item.priority} priority
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.status === 'DONE' ? 'bg-green-100 text-green-800' :
                        item.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="goals">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Goals</h2>
            <Button asChild>
              <Link href={`/dashboard/workspaces/${workspaceId}/goals/new`}>
                <Plus className="mr-2 h-4 w-4" />
                New Goal
              </Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="announcements">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Announcements</h2>
            <Button asChild>
              <Link href={`/dashboard/workspaces/${workspaceId}/announcements/new`}>
                <Plus className="mr-2 h-4 w-4" />
                New Announcement
              </Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="action-items">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Action Items</h2>
            <Button asChild>
              <Link href={`/dashboard/workspaces/${workspaceId}/action-items/new`}>
                <Plus className="mr-2 h-4 w-4" />
                New Action Item
              </Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
