'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useActionItemsStore } from '@/stores/actionItemsStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useGoalsStore } from '@/stores/goalsStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, CheckSquare, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NewActionItemPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id;
  
  const { createActionItem, isLoading } = useActionItemsStore();
  const { members } = useWorkspaceStore();
  const { goals } = useGoalsStore();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    status: 'TODO',
    assigneeId: 'unassigned',
    goalId: 'none',
    dueDate: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      await createActionItem({
        workspaceId,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        assigneeId: formData.assigneeId === 'unassigned' ? undefined : formData.assigneeId,
        goalId: formData.goalId === 'none' ? undefined : formData.goalId,
        dueDate: formData.dueDate || undefined
      });
      
      router.push(`/dashboard/workspaces/${workspaceId}/action-items`);
    } catch (error) {
      // Error handled by store
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" asChild>
        <Link href={`/dashboard/workspaces/${workspaceId}/action-items`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Action Items
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Create Action Item</CardTitle>
              <CardDescription>
                Add a new task for your team
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Review Q1 report"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add details about this task..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Select
                value={formData.assigneeId}
                onValueChange={(value) => setFormData({ ...formData, assigneeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.user.id} value={member.user.id}>
                      {member.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal">Linked Goal (Optional)</Label>
              <Select
                value={formData.goalId}
                onValueChange={(value) => setFormData({ ...formData, goalId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select goal to link to" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push(`/dashboard/workspaces/${workspaceId}/action-items`)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !formData.title.trim()}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Action Item'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
