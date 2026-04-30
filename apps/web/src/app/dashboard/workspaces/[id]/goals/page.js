'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useGoalsStore } from '@/stores/goalsStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Target, Calendar, CheckCircle2, Circle, Clock } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const statusIcons = {
  ACTIVE: Circle,
  COMPLETED: CheckCircle2,
  ARCHIVED: Clock,
};

const statusColors = {
  ACTIVE: 'text-blue-500',
  COMPLETED: 'text-green-500',
  ARCHIVED: 'text-gray-500',
};

export default function GoalsPage() {
  const params = useParams();
  const workspaceId = params.id;
  
  const { goals, isLoading, fetchGoals, createGoal } = useGoalsStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', description: '', dueDate: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      fetchGoals(workspaceId);
    }
  }, [workspaceId, fetchGoals]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newGoal.title.trim()) return;

    setCreating(true);
    try {
      await createGoal({
        workspaceId,
        title: newGoal.title,
        description: newGoal.description,
        dueDate: newGoal.dueDate || undefined,
      });
      setShowCreateModal(false);
      setNewGoal({ title: '', description: '', dueDate: '' });
    } finally {
      setCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Goals</h1>
          <p className="text-muted-foreground">
            Track and manage your team&apos;s objectives
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card className="p-12 text-center">
          <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No goals yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first goal to start tracking progress
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Goal
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const StatusIcon = statusIcons[goal.status];
            return (
              <Card key={goal.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={cn('h-5 w-5', statusColors[goal.status])} />
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary">
                        {goal.status}
                      </span>
                    </div>
                    {goal.dueDate && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(goal.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <CardTitle className="mt-2">{goal.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {goal.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{goal.milestones?.length || 0} milestones</span>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/workspaces/${workspaceId}/goals/${goal.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                  {goal.milestones && goal.milestones.length > 0 && (
                    <div className="mt-4">
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ 
                            width: `${goal.milestones.reduce((acc, m) => acc + m.progressPercent, 0) / goal.milestones.length}%` 
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.round(goal.milestones.reduce((acc, m) => acc + m.progressPercent, 0) / goal.milestones.length)}% complete
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Goal Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
              <DialogDescription>
                Set a goal for your team to work towards.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Goal Title</Label>
                <Input
                  id="title"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  placeholder="e.g., Launch Product v1.0"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  placeholder="Describe what this goal aims to achieve..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date (Optional)</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newGoal.dueDate}
                  onChange={(e) => setNewGoal({ ...newGoal, dueDate: e.target.value })}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} disabled={creating}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !newGoal.title.trim()}>
                {creating ? 'Creating...' : 'Create Goal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
