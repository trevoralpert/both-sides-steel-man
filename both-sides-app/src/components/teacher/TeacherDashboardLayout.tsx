/**
 * Teacher Dashboard Layout Component
 * 
 * Task 8.1.1: Comprehensive layout component that provides the foundational
 * structure for all teacher dashboard pages, including responsive sidebar
 * navigation, header, and main content area.
 */

'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, UserButton } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  Menu,
  X,
  Home,
  Users,
  Calendar,
  Settings,
  BarChart3,
  MessageSquare,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Shield,
  FileText,
  Activity
} from 'lucide-react';

import { TeacherDashboardProvider } from './TeacherDashboardProvider';
import { DashboardSearch } from './DashboardSearch';
import { DashboardPersonalization } from './DashboardPersonalization';

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  description?: string;
  children?: NavigationItem[];
  requiredRole?: 'teacher' | 'admin';
}

interface TeacherDashboardLayoutProps {
  children: ReactNode;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'overview',
    label: 'Dashboard',
    href: '/teacher/dashboard',
    icon: Home,
    description: 'Overview and key metrics'
  },
  {
    id: 'classes',
    label: 'Classes',
    href: '/teacher/classes',
    icon: Users,
    description: 'Manage classes and students',
    children: [
      {
        id: 'classes-list',
        label: 'All Classes',
        href: '/teacher/classes',
        icon: Users
      },
      {
        id: 'classes-create',
        label: 'Create Class',
        href: '/teacher/classes/create',
        icon: Users
      }
    ]
  },
  {
    id: 'sessions',
    label: 'Sessions',
    href: '/teacher/sessions',
    icon: Calendar,
    description: 'Create and manage debate sessions',
    children: [
      {
        id: 'sessions-list',
        label: 'All Sessions',
        href: '/teacher/sessions',
        icon: Calendar
      },
      {
        id: 'sessions-create',
        label: 'Create Session',
        href: '/teacher/sessions/create',
        icon: Calendar
      },
      {
        id: 'sessions-monitor',
        label: 'Live Monitor',
        href: '/teacher/sessions/monitor',
        icon: Activity,
        badge: 'LIVE'
      }
    ]
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/teacher/analytics',
    icon: BarChart3,
    description: 'Performance insights and reports'
  },
  {
    id: 'reviews',
    label: 'Reviews',
    href: '/teacher/reviews',
    icon: MessageSquare,
    description: 'Student reflection reviews'
  },
  {
    id: 'admin',
    label: 'Administration',
    href: '/teacher/admin',
    icon: Shield,
    description: 'Platform administration tools',
    requiredRole: 'admin',
    children: [
      {
        id: 'admin-users',
        label: 'User Management',
        href: '/teacher/admin/users',
        icon: Users
      },
      {
        id: 'admin-system',
        label: 'System Monitor',
        href: '/teacher/admin/system',
        icon: Activity
      },
      {
        id: 'admin-reports',
        label: 'Reports',
        href: '/teacher/admin/reports',
        icon: FileText
      },
      {
        id: 'admin-settings',
        label: 'Settings',
        href: '/teacher/admin/settings',
        icon: Settings
      }
    ]
  }
];

export function TeacherDashboardLayout({ children }: TeacherDashboardLayoutProps) {
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Determine user role and filter navigation items
  const userRole = (user?.publicMetadata?.role as string)?.toLowerCase() || 'teacher';
  const isAdmin = userRole === 'admin';
  
  const filteredNavItems = navigationItems.filter(item => 
    !item.requiredRole || item.requiredRole === userRole
  );

  // Auto-expand sections based on current path
  useEffect(() => {
    const currentSection = filteredNavItems.find(item => 
      pathname.startsWith(item.href) && item.children
    );
    if (currentSection) {
      setExpandedSections(prev => new Set([...prev, currentSection.id]));
    }
  }, [pathname, filteredNavItems]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const isActiveRoute = (href: string) => {
    if (href === '/teacher/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-16 items-center border-b px-4">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-6 w-6 text-primary" />
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Both Sides</span>
              <span className="text-xs text-muted-foreground">Teacher Dashboard</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {filteredNavItems.map((item) => (
            <div key={item.id}>
              <Button
                variant={isActiveRoute(item.href) ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-9",
                  sidebarCollapsed && "px-2",
                  !sidebarCollapsed && "px-3"
                )}
                onClick={() => {
                  if (item.children) {
                    toggleSection(item.id);
                  } else {
                    router.push(item.href);
                  }
                }}
              >
                <item.icon className={cn("h-4 w-4", !sidebarCollapsed && "mr-2")} />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {item.badge}
                      </Badge>
                    )}
                    {item.children && (
                      <ChevronRight 
                        className={cn(
                          "h-4 w-4 ml-1 transition-transform",
                          expandedSections.has(item.id) && "rotate-90"
                        )}
                      />
                    )}
                  </>
                )}
              </Button>
              
              {/* Sub-navigation */}
              {item.children && expandedSections.has(item.id) && !sidebarCollapsed && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <Button
                      key={child.id}
                      variant={isActiveRoute(child.href) ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start h-8"
                      onClick={() => router.push(child.href)}
                    >
                      <child.icon className="h-3 w-3 mr-2" />
                      <span className="text-sm">{child.label}</span>
                      {child.badge && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          {child.badge}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4">
        {!sidebarCollapsed && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserButton afterSignOutUrl="/" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.firstName}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  {userRole}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <TeacherDashboardProvider>
      <div className="flex h-screen bg-background">
        {/* Desktop Sidebar */}
        <aside 
          className={cn(
            "hidden md:flex md:flex-col md:border-r md:bg-card transition-all duration-300",
            sidebarCollapsed ? "md:w-16" : "md:w-64"
          )}
        >
          <SidebarContent />
          
          {/* Collapse Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute -right-3 top-20 z-10 h-6 w-6 rounded-full border bg-background shadow-md"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        </aside>

        {/* Mobile Sidebar */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="sm" className="fixed top-4 left-4 z-50">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="flex h-16 items-center justify-between border-b bg-background px-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              {/* Breadcrumbs will be added here */}
              <div className="hidden md:block">
                <h1 className="text-lg font-semibold">
                  {filteredNavItems.find(item => isActiveRoute(item.href))?.label || 'Dashboard'}
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="hidden md:block w-64">
                <DashboardSearch />
              </div>
              
              {/* Quick Actions */}
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              
              <DashboardPersonalization />
              
              {/* Mobile User Button */}
              <div className="md:hidden">
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </TeacherDashboardProvider>
  );
}
