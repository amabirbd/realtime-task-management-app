'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useActionItemsStore } from '@/stores/actionItemsStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  CheckSquare, 
  Plus, 
  LayoutGrid, 
  List, 
  Calendar,
  User,
  AlertCircle,
  MoreHorizontal,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format } from 'date-fns';

const COLUMNS = [
  { id: 'TODO', title: 'To Do', color: 'bg-gray-100 dark:bg-gray-800' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'DONE', title: 'Done', color: 'bg-green-50 dark:bg-green-900/20' },
];

const PRIORITIES = {
  LOW: { label: 'Low', color: 'bg-gray-100 text-gray-700' },
  MEDIUM: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  HIGH: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  URGENT: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
};

export default function ActionItemsPage() {
  const params = useParams();
  const workspaceId = params.id;
  
  const { actionItems, isLoading, fetchActionItems, createActionItem, updateActionItemStatus, deleteActionItem } = useActionItemsStore();
  const { currentWorkspace, members } = useWorkspaceStore();
  
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newItem, setNewItem] = useState({ 
    title: '', 
    priority: 'MEDIUM', 
    assigneeId: 'unassigned', 
    dueDate: '' 
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      fetchActionItems(workspaceId);
    }
  }, [workspaceId, fetchActionItems]);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    
    await updateActionItemStatus(draggableId, newStatus);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newItem.title.trim()) return;
    
    setCreating(true);
    try {
      await createActionItem({
        workspaceId,
        title: newItem.title,
        priority: newItem.priority,
        assigneeId: newItem.assigneeId === 'unassigned' ? undefined : newItem.assigneeId,
        dueDate: newItem.dueDate || undefined,
      });
      setShowCreateModal(false);
      setNewItem({ title: '', priority: 'MEDIUM', assigneeId: 'unassigned', dueDate: '' });
    } finally {
      setCreating(false);
    }
  };

  const itemsByStatus = {
    TODO: actionItems.filter(item => item.status === 'TODO'),
    IN_PROGRESS: actionItems.filter(item => item.status === 'IN_PROGRESS'),
    DONE: actionItems.filter(item => item.status === 'DONE'),
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
          <h1 className="text-3xl font-bold">Action Items</h1>
          <p className="text-muted-foreground">
            Track tasks and assignments for your team
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Board
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Item
          </Button>
        </div>
      </div>

      {actionItems.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No action items yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first action item to start tracking tasks
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Action Item
          </Button>
        </Card>
      ) : viewMode === 'kanban' ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map((column) => (
              <div key={column.id} className={cn('rounded-lg p-4', column.color)}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{column.title}</h3>
                  <span className="text-sm text-muted-foreground">
                    {itemsByStatus[column.id].length}
                  </span>
                </div>
                
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'space-y-3 min-h-[200px] rounded-lg transition-colors',
                        snapshot.isDraggingOver && 'bg-primary/5'
                      )}
                    >
                      {itemsByStatus[column.id].map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                'bg-white dark:bg-card',
                                snapshot.isDragging && 'shadow-lg rotate-2'
                              )}
                            >
                              <CardContent className="p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                  <p className="font-medium">{item.title}</p>
                                  <span className={cn(
                                    'text-xs px-2 py-1 rounded-full',
                                    PRIORITIES[item.priority].color
                                  )}>
                                    {PRIORITIES[item.priority].label}
                                  </span>
                                </div>
                                
                                {item.assignee && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <User className="h-3 w-3" />
                                    {item.assignee.name}
                                  </div>
                                )}
                                
                                {item.dueDate && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(item.dueDate), 'MMM d, yyyy')}
                                  </div>
                                )}
                                
                                {item.goal && (
                                  <div className="text-xs text-muted-foreground">
                                    Goal: {item.goal.title}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      ) : (
        <Card>
          <div className="divide-y">
            {actionItems.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{item.title}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {item.assignee && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {item.assignee.name}
                      </span>
                    )}
                    {item.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(item.dueDate), 'MMM d')}
                      </span>
                    )}
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs',
                      PRIORITIES[item.priority].color
                    )}>
                      {PRIORITIES[item.priority].label}
                    </span>
                  </div>
                </div>
                <span className={cn(
                  'text-sm px-3 py-1 rounded-full',
                  item.status === 'DONE' ? 'bg-green-100 text-green-700' :
                  item.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                )}>
                  {item.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create Action Item Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create Action Item</DialogTitle>
              <DialogDescription>
                Add a new task for your team.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  placeholder="e.g., Review Q1 report"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newItem.priority}
                  onValueChange={(value) => setNewItem({ ...newItem, priority: value })}
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
                <Label htmlFor="assignee">Assignee</Label>
                <Select
                  value={newItem.assigneeId}
                  onValueChange={(value) => setNewItem({ ...newItem, assigneeId: value })}
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
                <Label htmlFor="dueDate">Due Date (Optional)</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newItem.dueDate}
                  onChange={(e) => setNewItem({ ...newItem, dueDate: e.target.value })}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} disabled={creating}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !newItem.title.trim()}>
                {creating ? 'Creating...' : 'Create Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
