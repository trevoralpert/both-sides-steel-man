/**
 * Learning Layout Integration
 * 
 * Task 7.5.3: Layout component that integrates learning navigation
 * seamlessly into the main application layout.
 */

'use client';

import React from 'react';
import { useUser } from '@clerk/nextjs';
import { 
  LearningNavMenu,
  LearningBreadcrumbs,
  NotificationCenter,
  QuickAccessToolbar,
  LearningSearch,
  useLearningNavigation
} from '@/components/navigation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  Menu, 
  Bell, 
  Search,
  LayoutDashboard,
  Settings,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LearningLayoutProps {
  children: React.ReactNode;
  className?: string;
  showSidebar?: boolean;
  showToolbar?: boolean;
  showBreadcrumbs?: boolean;
}

export function LearningLayout({ 
  children, 
  className,
  showSidebar = true,
  showToolbar = true,
  showBreadcrumbs = true
}: LearningLayoutProps) {
  const { user } = useUser();
  const { unreadCount } = useLearningNavigation();
  
  // Determine user role based on user metadata or default to student
  const userRole = (user?.publicMetadata?.role as 'student' | 'teacher' | 'admin') || 'student';

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          {/* Mobile Menu Trigger */}
          {showSidebar && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="py-6">
                  <LearningNavMenu role={userRole} />
                </div>
              </SheetContent>
            </Sheet>
          )}

          {/* Logo/Brand */}
          <div className="mr-4 flex items-center space-x-2">
            <LayoutDashboard className="h-6 w-6" />
            <span className="font-bold">Learning Center</span>
          </div>

          {/* Search Bar - Hidden on mobile */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <LearningSearch className="w-full" />
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2">
            {/* Mobile Search */}
            <div className="md:hidden">
              <Button variant="ghost" size="sm">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Notifications */}
            <NotificationCenter />

            {/* User Menu */}
            <Button variant="ghost" size="sm">
              <User className="h-4 w-4" />
            </Button>

            {/* Settings */}
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        {showSidebar && (
          <aside className="hidden md:flex w-64 flex-col border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex-1 py-6">
              <LearningNavMenu role={userRole} />
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1">
          <div className="container py-6">
            {/* Breadcrumbs */}
            {showBreadcrumbs && (
              <div className="mb-6">
                <LearningBreadcrumbs />
              </div>
            )}

            {/* Quick Access Toolbar */}
            {showToolbar && (
              <div className="mb-6">
                <QuickAccessToolbar />
              </div>
            )}

            {/* Page Content */}
            <div className={cn("space-y-6", className)}>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

interface LearningPageProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function LearningPage({ 
  title, 
  description, 
  children, 
  actions, 
  className 
}: LearningPageProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>

      <Separator />

      {/* Page Content */}
      <div>{children}</div>
    </div>
  );
}

interface LearningDashboardLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
}

export function LearningDashboardLayout({ 
  children, 
  sidebar, 
  className 
}: LearningDashboardLayoutProps) {
  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-4 gap-6", className)}>
      {/* Main Content */}
      <div className="lg:col-span-3 space-y-6">
        {children}
      </div>

      {/* Sidebar */}
      {sidebar && (
        <div className="lg:col-span-1 space-y-6">
          {sidebar}
        </div>
      )}
    </div>
  );
}

interface ResponsiveLearningLayoutProps {
  children: React.ReactNode;
  mobileLayout?: 'stack' | 'tabs';
  desktopLayout?: 'sidebar' | 'grid';
  className?: string;
}

export function ResponsiveLearningLayout({ 
  children, 
  mobileLayout = 'stack',
  desktopLayout = 'sidebar',
  className 
}: ResponsiveLearningLayoutProps) {
  return (
    <div className={cn(
      "w-full",
      // Mobile layout
      mobileLayout === 'stack' && "flex flex-col space-y-4 md:space-y-0",
      mobileLayout === 'tabs' && "flex flex-col",
      // Desktop layout
      desktopLayout === 'sidebar' && "md:flex md:space-x-6",
      desktopLayout === 'grid' && "md:grid md:grid-cols-12 md:gap-6",
      className
    )}>
      {children}
    </div>
  );
}

export default LearningLayout;
