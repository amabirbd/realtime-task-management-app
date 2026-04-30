'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useGoalsStore } from '@/stores/goalsStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Target, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Plus, 
  ArrowLeft,
  Trash2,
  Edit2,
  Flag,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const statusConfig = {
  ACTIVE: { icon: Circle, color: 'text-blue-500', label: 'Active' },
  COMPLETED: { icon: CheckCircle2, color: 'text-green-500', label: 'Completed' },
  ARCHIVED: { icon: Clock, color: 'text-gray-500', label: 'Archived' },
};

export default function GoalDetailPage() {
  const params = useParams();
  const workspaceId = params.id;
  const goalId = params.goalId;
  
  const { 
    currentGoal, 
    isLoading, 
    fetchGoal, 
    updateGoal,
    deleteGoal,
    createMilestone,
    updateMilestone,
    deleteMilestone
  } = useGoalsStore();
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editGoal, setEditGoal] = useState({ title: '', description: '', status: '' });
  const [newMilestone, setNewMilestone] = useState({ title: '', dueDate: '' });

  useEffect(() => {
    if (goalId) {
      fetchGoal(goalId);
    }
  }, [goalId, fetchGoal]);

  useEffect(() => {
    if (currentGoal) {
      setEditGoal({
        title: currentGoal.title,
        description: currentGoal.description || '',
        status: currentGoal.status
      });
    }
  }, [currentGoal]);

  const handleUpdateGoal = async () => {
    await updateGoal(goalId, editGoal);
    setShowEditModal(false);
  };

  const handleCreateMilestone = async () => {
    if (!newMilestone.title.trim()) return;
    
    await createMilestone(goalId, {
      title: newMilestone.title,
      dueDate: newMilestone.dueDate || undefined
    });
    
    setShowMilestoneModal(false);
    setNewMilestone({ title: '', dueDate: '' });
  };

  const handleToggleMilestone = async (milestoneId, currentProgressPercent) => {
    const isCompleted = currentProgressPercent === 100;
    await updateMilestone(milestoneId, { progressPercent: isCompleted ? 0 : 100 });
  };

  if (isLoading || !currentGoal) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const StatusIcon = statusConfig[currentGoal.status].icon;
  const completedMilestones = currentGoal.milestones?.filter(m => m.progressPercent === 100).length || 0;
  const totalMilestones = currentGoal.milestones?.length || 0;
  const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href={`/dashboard/workspaces/${workspaceId}/goals`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Goals
        </Link>
      </Button>

      {/* Goal Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <StatusIcon className={cn('h-8 w-8', statusConfig[currentGoal.status].color)} />
            <h1 className="text-3xl font-bold">{currentGoal.title}</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            {currentGoal.description || 'No description'}
          </p>
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Created {new Date(currentGoal.createdAt).toLocaleDateString()}
            </span>
            {currentGoal.dueDate && (
              <span className="flex items-center gap-1">
                <Flag className="h-4 w-4" />
                Due {new Date(currentGoal.dueDate).toLocaleDateString()}
              </span>
            )}
            <span className={cn(
              'px-2 py-1 rounded-full text-xs',
              statusConfig[currentGoal.status].color,
              'bg-opacity-10'
            )}>
              {statusConfig[currentGoal.status].label}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEditModal(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => deleteGoal(goalId)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
          <CardDescription>
            {completedMilestones} of {totalMilestones} milestones completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-4 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">{Math.round(progress)}% complete</p>
        </CardContent>
      </Card>

      {/* Milestones */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Milestones</h2>
          <Button onClick={() => setShowMilestoneModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Milestone
          </Button>
        </div>

        {currentGoal.milestones?.length === 0 ? (
          <Card className="p-8 text-center">
            <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No milestones yet. Add one to track progress!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {currentGoal.milestones?.map((milestone) => (
              <Card key={milestone.id} className={cn(
                milestone.progressPercent === 100 && 'opacity-60'
              )}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleMilestone(milestone.id, milestone.progressPercent)}
                      className={cn(
                        'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
                        milestone.progressPercent === 100
                          ? 'bg-green-500 border-green-500 text-white' 
                          : 'border-muted-foreground hover:border-primary'
                      )}
                    >
                      {milestone.progressPercent === 100 && <CheckCircle2 className="h-4 w-4" />}
                    </button>
                    <div>
                      <p className={cn(
                        'font-medium',
                        milestone.progressPercent === 100 && 'line-through text-muted-foreground'
                      )}>
                        {milestone.title}
                      </p>
                      {milestone.dueDate && (
                        <p className="text-sm text-muted-foreground">
                          Due {new Date(milestone.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMilestone(milestone.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Goal Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
            <DialogDescription>
              Update your goal details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editGoal.title}
                onChange={(e) => setEditGoal({ ...editGoal, title: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editGoal.description}
                onChange={(e) => setEditGoal({ ...editGoal, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <select
                id="edit-status"
                value={editGoal.status}
                onChange={(e) => setEditGoal({ ...editGoal, status: e.target.value })}
                className="w-full px-3 py-2 rounded-md border bg-background"
              >
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateGoal}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Milestone Modal */}
      <Dialog open={showMilestoneModal} onOpenChange={setShowMilestoneModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Milestone</DialogTitle>
            <DialogDescription>
              Create a milestone to track progress.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="milestone-title">Title</Label>
              <Input
                id="milestone-title"
                value={newMilestone.title}
                onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                placeholder="e.g., Complete design phase"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="milestone-due">Due Date (Optional)</Label>
              <Input
                id="milestone-due"
                type="date"
                value={newMilestone.dueDate}
                onChange={(e) => setNewMilestone({ ...newMilestone, dueDate: e.target.value })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowMilestoneModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateMilestone} disabled={!newMilestone.title.trim()}>
              Add Milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
