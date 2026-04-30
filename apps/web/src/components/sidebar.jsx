'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Target, 
  Megaphone, 
  CheckSquare, 
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Goals', href: '/dashboard/goals', icon: Target },
  { name: 'Announcements', href: '/dashboard/announcements', icon: Megaphone },
  { name: 'Action Items', href: '/dashboard/action-items', icon: CheckSquare },
  { name: 'Docs', href: '/dashboard/docs', icon: FileText },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { currentWorkspace } = useWorkspaceStore();
  const [collapsed, setCollapsed] = useState(false);

  if (!currentWorkspace) {
    return (
      <aside className={cn(
        "border-r bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}>
        <div className="p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>
    );
  }

  return (
    <aside className={cn(
      "border-r bg-background transition-all duration-300 flex flex-col",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Workspace Info */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
            style={{ backgroundColor: currentWorkspace.accentColor }}
          >
            {currentWorkspace.name.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="font-semibold truncate">{currentWorkspace.name}</h2>
              <p className="text-xs text-muted-foreground">{currentWorkspace.role}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const href = currentWorkspace 
            ? item.href.replace('/dashboard', `/dashboard/workspaces/${currentWorkspace.id}`)
            : item.href;
          const isActive = pathname.startsWith(href);

          return (
            <Link
              key={item.name}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              title={collapsed ? item.name : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Button */}
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
}
