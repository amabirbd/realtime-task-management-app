'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGoalsStore } from '@/stores/goalsStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Target, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NewGoalPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id;
  
  const { createGoal, isLoading } = useGoalsStore();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      const goal = await createGoal({
        workspaceId,
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate || undefined
      });
      
      router.push(`/dashboard/workspaces/${workspaceId}/goals/${goal.id}`);
    } catch (error) {
      // Error handled by store
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" asChild>
        <Link href={`/dashboard/workspaces/${workspaceId}/goals`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Goals
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Create New Goal</CardTitle>
              <CardDescription>
                Set a clear objective for your team
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Goal Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Launch Product v1.0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this goal aims to achieve..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Target Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Optional - helps keep the team on track
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push(`/dashboard/workspaces/${workspaceId}/goals`)}
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
                  'Create Goal'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
