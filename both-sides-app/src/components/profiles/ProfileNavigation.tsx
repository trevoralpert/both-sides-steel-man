'use client';

import { useState } from 'react';

import { useRouter, usePathname } from 'next/navigation';
import { Profile } from '@/types/profile';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Home,
  User,
  Users,
  Settings,
  Search,
  BarChart3,
  ChevronDown,
  ArrowLeft,
  Edit,
  Eye,
  Trash2,
  MoreVertical
} from 'lucide-react';

interface ProfileNavigationProps {
  currentProfile?: Profile;
  userRole?: 'STUDENT' | 'TEACHER' | 'ADMIN';
  onNavigateHome?: () => void;
  onNavigateProfiles?: () => void;
  onNavigateDashboard?: () => void;
  onNavigateSearch?: () => void;
  onEditProfile?: (profile: Profile) => void;
  onViewProfile?: (profile: Profile) => void;
  onDeleteProfile?: (profile: Profile) => void;
  className?: string;
}

interface BreadcrumbProps {
  items: Array<{
    label: string;
    href?: string;
    onClick?: () => void;
    isActive?: boolean;
  }>;
  className?: string;
}

interface ProfileActionsProps {
  profile: Profile;
  userRole?: 'STUDENT' | 'TEACHER' | 'ADMIN';
  isCurrentUser?: boolean;
  onEdit?: (profile: Profile) => void;
  onView?: (profile: Profile) => void;
  onDelete?: (profile: Profile) => void;
  className?: string;
}

// Main navigation component
export function ProfileNavigation({
  currentProfile,
  userRole = 'STUDENT',
  onNavigateHome,
  onNavigateDashboard,
  onNavigateProfiles,
  onNavigateSearch,
  onEditProfile,
  onViewProfile,
  onDeleteProfile,
  className = ''
}: ProfileNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();

  const navigationItems = [
    {
      label: 'Dashboard',
      icon: Home,
      href: '/dashboard',
      onClick: onNavigateDashboard,
      show: true
    },
    {
      label: 'My Profile',
      icon: User,
      href: '/profile',
      onClick: () => currentProfile && onViewProfile?.(currentProfile),
      show: true,
      badge: !currentProfile?.is_completed ? 'Incomplete' : undefined
    },
    {
      label: 'Browse Profiles',
      icon: Users,
      href: '/profiles',
      onClick: onNavigateProfiles,
      show: userRole === 'ADMIN' || userRole === 'TEACHER'
    },
    {
      label: 'Search',
      icon: Search,
      href: '/profiles/search',
      onClick: onNavigateSearch,
      show: userRole === 'ADMIN' || userRole === 'TEACHER'
    },
    {
      label: 'Analytics',
      icon: BarChart3,
      href: '/profiles/analytics',
      onClick: () => router.push('/profiles/analytics'),
      show: userRole === 'ADMIN' || userRole === 'TEACHER'
    }
  ].filter(item => item.show);

  return (
    <nav className={`bg-white border-b border-gray-200 px-4 py-3 ${className}`}>
      <div className="flex items-center justify-between">
        {/* Main Navigation */}
        <div className="flex items-center space-x-6">
          <h2 className="text-lg font-semibold text-gray-900">Profiles</h2>
          <div className="flex items-center space-x-4">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Button
                  key={item.label}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={item.onClick}
                  className="flex items-center space-x-2"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Profile Actions */}
        {currentProfile && (
          <ProfileActions
            profile={currentProfile}
            userRole={userRole}
            isCurrentUser={true}
            onEdit={onEditProfile}
            onView={onViewProfile}
            onDelete={onDeleteProfile}
          />
        )}
      </div>
    </nav>
  );
}

// Breadcrumb navigation component
export function ProfileBreadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {items.map((item, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {item.isActive ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink 
                  href={item.href}
                  onClick={item.onClick}
                  className="cursor-pointer hover:text-primary"
                >
                  {item.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

// Profile actions dropdown
export function ProfileActions({
  profile,
  userRole = 'STUDENT',
  isCurrentUser = false,
  onEdit,
  onView,
  onDelete,
  className = ''
}: ProfileActionsProps) {
  const canEdit = isCurrentUser || userRole === 'ADMIN';
  const canDelete = userRole === 'ADMIN' && !isCurrentUser;
  const canView = true;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <MoreVertical className="h-4 w-4" />
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Profile Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {canView && (
          <DropdownMenuItem onClick={() => onView?.(profile)}>
            <Eye className="h-4 w-4 mr-2" />
            View Profile
          </DropdownMenuItem>
        )}
        
        {canEdit && (
          <DropdownMenuItem onClick={() => onEdit?.(profile)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={() => navigator.share?.({
          title: 'Profile',
          text: `Check out ${profile.user?.first_name || profile.user?.username}'s profile`,
          url: `/profiles/${profile.id}`
        })}>
          <Users className="h-4 w-4 mr-2" />
          Share Profile
        </DropdownMenuItem>
        
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete?.(profile)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Profile
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Back navigation button
export function BackButton({ 
  onBack, 
  label = 'Back', 
  className = '' 
}: { 
  onBack: () => void; 
  label?: string; 
  className?: string; 
}) {
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={onBack}
      className={`flex items-center space-x-2 ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{label}</span>
    </Button>
  );
}

// Profile page header with navigation
export function ProfilePageHeader({
  title,
  description,
  breadcrumbItems,
  profile,
  userRole,
  onBack,
  onEdit,
  onView,
  onDelete,
  showBackButton = false,
  className = ''
}: {
  title: string;
  description?: string;
  breadcrumbItems?: Array<{
    label: string;
    href?: string;
    onClick?: () => void;
    isActive?: boolean;
  }>;
  profile?: Profile;
  userRole?: 'STUDENT' | 'TEACHER' | 'ADMIN';
  onBack?: () => void;
  onEdit?: (profile: Profile) => void;
  onView?: (profile: Profile) => void;
  onDelete?: (profile: Profile) => void;
  showBackButton?: boolean;
  className?: string;
}) {
  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="px-4 py-6">
        {/* Breadcrumb */}
        {breadcrumbItems && breadcrumbItems.length > 0 && (
          <div className="mb-4">
            <ProfileBreadcrumb items={breadcrumbItems} />
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {showBackButton && onBack && (
              <BackButton onBack={onBack} />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {description && (
                <p className="text-gray-600 mt-1">{description}</p>
              )}
            </div>
          </div>
          
          {profile && (
            <div className="flex items-center space-x-3">
              {profile.is_completed && (
                <Badge className="bg-green-100 text-green-800">
                  Completed
                </Badge>
              )}
              <ProfileActions
                profile={profile}
                userRole={userRole}
                isCurrentUser={true}
                onEdit={onEdit}
                onView={onView}
                onDelete={onDelete}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Utility functions for routing
export const ProfileRoutes = {
  dashboard: () => '/dashboard',
  profile: (id?: string) => id ? `/profiles/${id}` : '/profile',
  profileEdit: (id?: string) => id ? `/profiles/${id}/edit` : '/profile/edit',
  profileSearch: () => '/profiles/search',
  profileAnalytics: () => '/profiles/analytics',
  profiles: () => '/profiles'
};

// Hook for profile navigation state
export function useProfileNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  
  const navigateTo = (path: string) => {
    router.push(path);
  };
  
  const navigateBack = () => {
    router.back();
  };
  
  const getCurrentSection = (): string => {
    if (pathname.startsWith('/profiles/search')) return 'search';
    if (pathname.startsWith('/profiles/analytics')) return 'analytics';
    if (pathname.startsWith('/profiles/') && pathname.includes('/edit')) return 'edit';
    if (pathname.startsWith('/profiles/') && pathname.match(/\/profiles\/[^\/]+$/)) return 'view';
    if (pathname.startsWith('/profiles')) return 'list';
    if (pathname === '/profile') return 'my-profile';
    if (pathname === '/dashboard') return 'dashboard';
    return 'unknown';
  };
  
  const getBreadcrumbItems = (profile?: Profile): Array<{
    label: string;
    href?: string;
    onClick?: () => void;
    isActive?: boolean;
  }> => {
    const items = [
      { label: 'Home', href: '/', onClick: () => navigateTo('/') }
    ];
    
    const section = getCurrentSection();
    
    switch (section) {
      case 'dashboard':
        items.push({ label: 'Dashboard', href: '#', onClick: () => {} });
        break;
      case 'my-profile':
        items.push(
          { label: 'Dashboard', href: '/dashboard', onClick: () => navigateTo('/dashboard') },
          { label: 'My Profile', href: '#', onClick: () => {} }
        );
        break;
      case 'list':
        items.push(
          { label: 'Dashboard', href: '/dashboard', onClick: () => navigateTo('/dashboard') },
          { label: 'Profiles', href: '#', onClick: () => {} }
        );
        break;
      case 'search':
        items.push(
          { label: 'Dashboard', href: '/dashboard', onClick: () => navigateTo('/dashboard') },
          { label: 'Profiles', href: '/profiles', onClick: () => navigateTo('/profiles') },
          { label: 'Search', href: '#', onClick: () => {} }
        );
        break;
      case 'view':
        items.push(
          { label: 'Dashboard', href: '/dashboard', onClick: () => navigateTo('/dashboard') },
          { label: 'Profiles', href: '/profiles', onClick: () => navigateTo('/profiles') },
          { label: profile?.user?.username || 'Profile', href: '#', onClick: () => {} }
        );
        break;
      case 'edit':
        items.push(
          { label: 'Dashboard', href: '/dashboard', onClick: () => navigateTo('/dashboard') },
          { label: 'Profiles', href: '/profiles', onClick: () => navigateTo('/profiles') },
          { label: profile?.user?.username || 'Profile', href: ProfileRoutes.profile(profile?.id), onClick: () => navigateTo(ProfileRoutes.profile(profile?.id)) },
          { label: 'Edit', href: '#', onClick: () => {} }
        );
        break;
    }
    
    return items;
  };
  
  return {
    navigateTo,
    navigateBack,
    getCurrentSection,
    getBreadcrumbItems,
    pathname
  };
}
