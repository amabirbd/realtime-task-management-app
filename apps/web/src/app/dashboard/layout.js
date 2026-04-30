'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSocket } from '@/hooks/useSocket';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { SocketStatus } from '@/components/socket-status';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { user, isLoading, checkAuth } = useAuthStore();
  const { fetchWorkspaces } = useWorkspaceStore();
  
  // Initialize socket connection
  useSocket();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchWorkspaces();
    }
  }, [user, fetchWorkspaces]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
      <SocketStatus />
    </div>
  );
}
