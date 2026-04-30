'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAnnouncementsStore } from '@/stores/announcementsStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Megaphone, Pin, MessageCircle, ThumbsUp, Send, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

const REACTIONS = ['👍', '❤️', '🎉', '🚀', '👏', '😊'];

export default function AnnouncementsPage() {
  const params = useParams();
  const workspaceId = params.id;
  
  const { 
    announcements, 
    isLoading, 
    fetchAnnouncements, 
    createAnnouncement,
    updateAnnouncement,
    toggleReaction,
    addComment,
    deleteComment
  } = useAnnouncementsStore();
  
  const { currentWorkspace } = useWorkspaceStore();
  const isAdmin = currentWorkspace?.role === 'ADMIN';
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [commentInputs, setCommentInputs] = useState({});
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      fetchAnnouncements(workspaceId);
    }
  }, [workspaceId, fetchAnnouncements]);

  const handleCreate = async () => {
    if (!newContent.trim()) return;
    
    setCreating(true);
    try {
      await createAnnouncement({
        workspaceId,
        content: newContent,
      });
      setShowCreateModal(false);
      setNewContent('');
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePin = async (id, currentPinned) => {
    await updateAnnouncement(id, { isPinned: !currentPinned });
  };

  const handleAddComment = async (announcementId) => {
    const content = commentInputs[announcementId];
    if (!content?.trim()) return;
    
    await addComment(announcementId, content);
    setCommentInputs({ ...commentInputs, [announcementId]: '' });
  };

  const handleReaction = async (announcementId, emoji) => {
    await toggleReaction(announcementId, emoji);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Announcements</h1>
          <p className="text-muted-foreground">
            Stay updated with team news and important information
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Announcement
          </Button>
        )}
      </div>

      {announcements.length === 0 ? (
        <Card className="p-12 text-center">
          <Megaphone className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No announcements yet</h3>
          <p className="text-muted-foreground">
            {isAdmin ? 'Create the first announcement for your team' : 'Check back later for updates'}
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {announcements.map((announcement) => (
            <Card 
              key={announcement.id} 
              className={cn(
                "overflow-hidden",
                announcement.isPinned && "border-primary"
              )}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {announcement.author.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{announcement.author.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(announcement.createdAt).toLocaleDateString()} at{' '}
                        {new Date(announcement.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleTogglePin(announcement.id, announcement.isPinned)}
                      className={cn(announcement.isPinned && "text-primary")}
                    >
                      <Pin className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {announcement.isPinned && (
                  <div className="flex items-center gap-1 text-xs text-primary mt-2">
                    <Pin className="h-3 w-3" />
                    Pinned announcement
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div 
                  className="prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: announcement.content }}
                />
                
                {/* Reactions */}
                <div className="flex items-center gap-2 pt-4 border-t">
                  {REACTIONS.map((emoji) => {
                    const hasReacted = announcement.reactions?.some(
                      r => r.userId === 'current-user' && r.emoji === emoji
                    );
                    const count = announcement.reactions?.filter(r => r.emoji === emoji).length || 0;
                    
                    return (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(announcement.id, emoji)}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors",
                          hasReacted ? "bg-primary/10 text-primary" : "hover:bg-muted",
                          count > 0 && "bg-muted"
                        )}
                      >
                        <span>{emoji}</span>
                        {count > 0 && <span>{count}</span>}
                      </button>
                    );
                  })}
                </div>
                
                {/* Comments */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <MessageCircle className="h-4 w-4" />
                    {announcement.comments?.length || 0} comments
                  </div>
                  
                  <div className="space-y-3">
                    {announcement.comments?.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium">
                            {comment.author.name.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{comment.author.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Add Comment */}
                  <div className="flex gap-2 mt-4">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={commentInputs[announcement.id] || ''}
                      onChange={(e) => setCommentInputs({ 
                        ...commentInputs, 
                        [announcement.id]: e.target.value 
                      })}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddComment(announcement.id)}
                      className="flex-1 px-3 py-2 rounded-md border bg-background text-sm"
                    />
                    <Button 
                      size="sm" 
                      onClick={() => handleAddComment(announcement.id)}
                      disabled={!commentInputs[announcement.id]?.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Announcement Modal */}
      {isAdmin && (
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
              <DialogDescription>
                Share important information with your team.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="quill-editor">
                <ReactQuill
                  theme="snow"
                  value={newContent}
                  onChange={setNewContent}
                  placeholder="Write your announcement..."
                  style={{ height: '200px', marginBottom: '40px' }}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCreateModal(false)} 
                disabled={creating}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={creating || !newContent.trim()}
              >
                {creating ? 'Posting...' : 'Post Announcement'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
