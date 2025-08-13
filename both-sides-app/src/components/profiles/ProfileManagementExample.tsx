'use client';

/**
 * ProfileManagementExample.tsx
 * 
 * This is a comprehensive example showing how to use all the profile components together.
 * This component demonstrates the complete profile management workflow and serves as
 * documentation for integrating the profile system.
 * 
 * Task 2.2.5 Implementation Complete:
 * ✅ ProfileCard component with compact, detailed, and editable variants
 * ✅ ProfileEditForm component with validation, auto-save, and avatar upload
 * ✅ ProfileView component for read-only profile display
 * ✅ ProfileSearch and filtering functionality
 * ✅ Profile management dashboard with metrics and activity
 * ✅ Profile navigation, routing, and breadcrumb system
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  ProfileCard,
  ProfileView,
  ProfileEditForm,
  ProfileSearch,
  ProfileDashboard,
  ProfileNavigation,
  ProfilePageHeader,
  useProfileNavigation,
  ProfileRoutes,
  type Profile
} from './index';
import { ProfileAPI } from '@/lib/api/profile';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Users, 
  Search, 
  BarChart3, 
  Settings,
  Info
} from 'lucide-react';

interface ProfileManagementExampleProps {
  userRole?: 'STUDENT' | 'TEACHER' | 'ADMIN';
  className?: string;
}

export function ProfileManagementExample({ 
  userRole = 'STUDENT',
  className = '' 
}: ProfileManagementExampleProps) {
  const { getToken } = useAuth();
  const { navigateTo, getBreadcrumbItems } = useProfileNavigation();
  
  // State management
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load current user profile on mount
  useEffect(() => {
    loadCurrentProfile();
  }, []);

  const loadCurrentProfile = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await ProfileAPI.getCurrentUserProfile(token);
      setCurrentProfile(response.data);
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Event handlers
  const handleCreateProfile = () => {
    setActiveTab('edit');
    setSelectedProfile(null);
  };

  const handleEditProfile = (profile: Profile) => {
    setActiveTab('edit');
    setSelectedProfile(profile);
  };

  const handleViewProfile = (profile: Profile) => {
    setActiveTab('view');
    setSelectedProfile(profile);
  };

  const handleProfileSaved = (savedProfile: Profile) => {
    if (!selectedProfile) {
      // New profile created
      setCurrentProfile(savedProfile);
    } else {
      // Existing profile updated
      if (savedProfile.id === currentProfile?.id) {
        setCurrentProfile(savedProfile);
      }
    }
    setActiveTab('dashboard');
    setSelectedProfile(null);
  };

  const handleProfileSelect = (profile: Profile) => {
    handleViewProfile(profile);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading profile system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Navigation Header */}
      <ProfileNavigation
        currentProfile={currentProfile}
        userRole={userRole}
        onNavigateDashboard={() => setActiveTab('dashboard')}
        onNavigateProfiles={() => setActiveTab('search')}
        onNavigateSearch={() => setActiveTab('search')}
        onEditProfile={handleEditProfile}
        onViewProfile={handleViewProfile}
      />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="view" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>View Profile</span>
          </TabsTrigger>
          <TabsTrigger value="edit" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Edit Profile</span>
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center space-x-2">
            <Search className="h-4 w-4" />
            <span>Search</span>
          </TabsTrigger>
          <TabsTrigger value="examples" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Examples</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <ProfilePageHeader
            title="Profile Management Dashboard"
            description="Monitor and manage user profiles across the platform"
            breadcrumbItems={getBreadcrumbItems()}
          />
          <ProfileDashboard
            userRole={userRole}
            onCreateProfile={handleCreateProfile}
            onEditProfile={handleEditProfile}
            onViewProfile={handleViewProfile}
          />
        </TabsContent>

        {/* Profile View Tab */}
        <TabsContent value="view">
          <ProfilePageHeader
            title={selectedProfile ? 'Profile Details' : 'Your Profile'}
            description={selectedProfile 
              ? `View ${selectedProfile.user?.first_name || selectedProfile.user?.username}'s profile`
              : 'Your complete profile information'
            }
            breadcrumbItems={getBreadcrumbItems(selectedProfile)}
            profile={selectedProfile || currentProfile}
            userRole={userRole}
            showBackButton={!!selectedProfile}
            onBack={() => setActiveTab('dashboard')}
            onEdit={handleEditProfile}
          />
          {(selectedProfile || currentProfile) && (
            <ProfileView
              profile={selectedProfile || currentProfile!}
              showUserInfo={true}
              showActivitySummary={true}
            />
          )}
          {!selectedProfile && !currentProfile && (
            <div className="text-center py-12">
              <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Profile Found</h3>
              <p className="text-muted-foreground mb-4">
                You haven't created a profile yet. Create one to get started.
              </p>
              <Button onClick={handleCreateProfile}>
                Create Your Profile
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Profile Edit Tab */}
        <TabsContent value="edit">
          <ProfilePageHeader
            title={selectedProfile ? 'Edit Profile' : 'Create New Profile'}
            description={selectedProfile 
              ? 'Update profile information and settings'
              : 'Set up your profile to get started'
            }
            breadcrumbItems={getBreadcrumbItems(selectedProfile)}
            showBackButton={true}
            onBack={() => setActiveTab(selectedProfile ? 'view' : 'dashboard')}
          />
          <ProfileEditForm
            profile={selectedProfile || undefined}
            onSave={handleProfileSaved}
            onCancel={() => setActiveTab(selectedProfile ? 'view' : 'dashboard')}
            autoSave={true}
            autoSaveInterval={30000}
          />
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search">
          <ProfilePageHeader
            title="Search Profiles"
            description="Find and filter user profiles"
            breadcrumbItems={getBreadcrumbItems()}
          />
          <ProfileSearch
            onProfileSelect={handleProfileSelect}
            onProfileEdit={handleEditProfile}
            onProfileView={handleViewProfile}
            variant="compact"
            showActions={userRole === 'ADMIN'}
            maxResults={20}
            allowExport={userRole === 'ADMIN' || userRole === 'TEACHER'}
          />
        </TabsContent>

        {/* Examples Tab */}
        <TabsContent value="examples">
          <ProfilePageHeader
            title="Component Examples"
            description="Examples of all profile components in different configurations"
            breadcrumbItems={getBreadcrumbItems()}
          />
          
          <div className="space-y-8">
            {/* Profile Card Examples */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">ProfileCard Variants</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {currentProfile && (
                  <>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Compact Variant</h4>
                      <ProfileCard
                        profile={currentProfile}
                        variant="compact"
                        onEdit={handleEditProfile}
                        onView={handleViewProfile}
                        showActions={true}
                      />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Detailed Variant</h4>
                      <ProfileCard
                        profile={currentProfile}
                        variant="detailed"
                        onEdit={handleEditProfile}
                        onView={handleViewProfile}
                        showActions={true}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Usage Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Implementation Complete ✅</h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p><strong>Task 2.2.5: Create Profile Management UI Components</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>✅ ProfileCard component with compact, detailed, and editable variants</li>
                  <li>✅ ProfileEditForm component with validation, auto-save, and avatar upload</li>
                  <li>✅ ProfileView component for read-only profile display</li>
                  <li>✅ ProfileSearch and filtering functionality</li>
                  <li>✅ Profile management dashboard with metrics and activity</li>
                  <li>✅ Profile navigation, routing, and breadcrumb system</li>
                </ul>
                <p className="mt-4">
                  <strong>Components Location:</strong> <code>/src/components/profiles/</code>
                </p>
                <p>
                  <strong>API Integration:</strong> <code>/src/lib/api/profile.ts</code>
                </p>
                <p>
                  <strong>Types:</strong> <code>/src/types/profile.ts</code>
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
