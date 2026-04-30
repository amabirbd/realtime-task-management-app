'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useGoalsStore } from '@/stores/goalsStore';
import { useActionItemsStore } from '@/stores/actionItemsStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Users,
  Target,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts';

export default function AnalyticsPage() {
  const params = useParams();
  const workspaceId = params.id;
  
  const { currentWorkspace, members, fetchWorkspace } = useWorkspaceStore();
  const { goals, fetchGoals } = useGoalsStore();
  const { actionItems, fetchActionItems } = useActionItemsStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    if (workspaceId) {
      loadData();
    }
  }, [workspaceId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchWorkspace(workspaceId),
        fetchGoals(workspaceId),
        fetchActionItems(workspaceId)
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate metrics
  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.status === 'COMPLETED').length;
  const inProgressGoals = goals.filter(g => g.status === 'IN_PROGRESS').length;
  const goalCompletionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  const totalActionItems = actionItems.length;
  const completedActionItems = actionItems.filter(a => a.status === 'DONE').length;
  const todoActionItems = actionItems.filter(a => a.status === 'TODO').length;
  const inProgressActionItems = actionItems.filter(a => a.status === 'IN_PROGRESS').length;
  const actionItemCompletionRate = totalActionItems > 0 ? Math.round((completedActionItems / totalActionItems) * 100) : 0;

  // Priority breakdown
  const highPriorityItems = actionItems.filter(a => a.priority === 'HIGH' || a.priority === 'URGENT').length;
  
  // Weekly activity data (mock data for now)
  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date()
  });

  const weeklyData = last7Days.map(date => ({
    date: format(date, 'MMM dd'),
    completed: Math.floor(Math.random() * 5) + 1,
    created: Math.floor(Math.random() * 3) + 1
  }));

  const handleExportCSV = () => {
    // Simple CSV export of action items
    const headers = ['Title', 'Status', 'Priority', 'Assignee', 'Due Date'];
    const rows = actionItems.map(item => [
      item.title,
      item.status,
      item.priority,
      item.assignee?.name || 'Unassigned',
      item.dueDate ? format(new Date(item.dueDate), 'yyyy-MM-dd') : 'No date'
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace-${workspaceId}-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track your team's progress and productivity
          </p>
        </div>
        <Button onClick={handleExportCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Goal Completion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{goalCompletionRate}%</div>
            <Progress value={goalCompletionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {completedGoals} of {totalGoals} goals completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Task Completion</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actionItemCompletionRate}%</div>
            <Progress value={actionItemCompletionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {completedActionItems} of {totalActionItems} tasks done
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Active collaborators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highPriorityItems}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Urgent tasks requiring attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Activity</CardTitle>
            <CardDescription>Tasks completed and created over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} name="Completed" />
                <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} name="Created" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Status Distribution</CardTitle>
            <CardDescription>Current breakdown of action items by status</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'To Do', value: todoActionItems, fill: '#94a3b8' },
                { name: 'In Progress', value: inProgressActionItems, fill: '#3b82f6' },
                { name: 'Done', value: completedActionItems, fill: '#22c55e' }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Goals Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Goals Progress</CardTitle>
          <CardDescription>Status of all goals in this workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {goals.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No goals yet. Create your first goal to track progress.</p>
            ) : (
              goals.map(goal => {
                const milestoneProgress = goal.milestones?.length > 0
                  ? Math.round(goal.milestones.reduce((acc, m) => acc + m.progressPercent, 0) / goal.milestones.length)
                  : 0;
                
                return (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{goal.title}</span>
                        {goal.status === 'COMPLETED' && (
                          <span className="text-green-600 text-sm">✓ Completed</span>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">{milestoneProgress}%</span>
                    </div>
                    <Progress value={milestoneProgress} />
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
