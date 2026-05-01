'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, CheckSquare, FileText, Home, Megaphone, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

const workspaceNavigation = [
  { name: 'Overview', href: '', icon: Home },
  { name: 'Goals', href: '/goals', icon: Target },
  { name: 'Docs', href: '/docs', icon: FileText },
  { name: 'Announcements', href: '/announcements', icon: Megaphone },
  { name: 'Action Items', href: '/action-items', icon: CheckSquare },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

export function WorkspaceNav({ workspaceId, workspace }) {
  const pathname = usePathname();
  const baseHref = `/dashboard/workspaces/${workspaceId}`;

  return (
    <div className="mb-6 rounded-xl border bg-card/60 p-3 shadow-sm">
      <div className="mb-3 flex items-center gap-3 px-1">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: workspace?.accentColor || '#3b82f6' }}
        >
          {workspace?.name?.charAt(0).toUpperCase() || 'W'}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{workspace?.name || 'Workspace'}</p>
          <p className="text-xs text-muted-foreground">Quick workspace navigation</p>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap">
        {workspaceNavigation.map((item) => {
          const Icon = item.icon;
          const href = `${baseHref}${item.href}`;
          const isActive = item.href === '' ? pathname === baseHref : pathname.startsWith(href);

          return (
            <Link
              key={item.name}
              href={href}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
