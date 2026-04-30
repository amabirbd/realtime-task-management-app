'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAnnouncementsStore } from '@/stores/announcementsStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Megaphone, Loader2 } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

export default function NewAnnouncementPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id;
  
  const { createAnnouncement, isLoading } = useAnnouncementsStore();
  
  const [content, setContent] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || content === '<p><br></p>') return;

    try {
      await createAnnouncement({
        workspaceId,
        content
      });
      
      router.push(`/dashboard/workspaces/${workspaceId}/announcements`);
    } catch (error) {
      // Error handled by store
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" asChild>
        <Link href={`/dashboard/workspaces/${workspaceId}/announcements`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Announcements
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Create Announcement</CardTitle>
              <CardDescription>
                Share important information with your team
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Content</label>
              <div className="quill-editor">
                <ReactQuill
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  placeholder="Write your announcement here..."
                  style={{ height: '250px', marginBottom: '50px' }}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push(`/dashboard/workspaces/${workspaceId}/announcements`)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !content.trim() || content === '<p><br></p>'}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post Announcement'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
