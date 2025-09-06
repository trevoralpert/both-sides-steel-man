'use client';

import { useState, useEffect } from 'react';

import { useUser } from '@clerk/nextjs';
import { redirect, useRouter } from 'next/navigation';
import { ProfileView, ProfileEditForm, ProfilePageHeader, useProfileNavigation } from '@/components/profiles';
import { ProfileAPI, ProfileAPIError } from '@/lib/api/profile';
import { Profile } from '@/types/profile';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle, Plus, Edit } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

type ViewMode = 'view' | 'edit' | 'create';

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const { getBreadcrumbItems } = useProfileNavigation();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('view');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user's profile
  const loadProfile = async () => {
    if (!isLoaded || !user) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await ProfileAPI.getCurrentUserProfile(token);
      if (response.data) {
        setProfile(response.data);
        setViewMode('view');
      } else {
        // No profile exists, go to create mode
        setViewMode('create');
      }
    } catch (err) {
      if (err instanceof ProfileAPIError) {
        setError(err.message);
      } else {
        setError('Failed to load profile. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [isLoaded, user]);

  const handleProfileSave = (savedProfile: Profile) => {
    setProfile(savedProfile);
    setViewMode('view');
    setError(null);
  };

  const handleCancel = () => {
    if (profile) {
      setViewMode('view');
    } else {
      router.push('/dashboard');
    }
  };

  const handleEdit = () => {
    setViewMode('edit');
  };

  const handleCreate = () => {
    setViewMode('create');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    redirect('/sign-in');
  }

  const userRole = (user.publicMetadata?.role as 'STUDENT' | 'TEACHER' | 'ADMIN') || 'STUDENT';
  const breadcrumbItems = getBreadcrumbItems(profile || undefined);

  return (
    <div className="min-h-screen bg-gray-50">
      <ProfilePageHeader
        title={
          viewMode === 'create' ? 'Create Your Profile' :
          viewMode === 'edit' ? 'Edit Profile' :
          'Your Profile'
        }
        description={
          viewMode === 'create' ? 'Build your belief profile to start participating in debates' :
          viewMode === 'edit' ? 'Update your beliefs and personal information' :
          'View and manage your debate profile'
        }
        breadcrumbItems={breadcrumbItems}
        profile={profile || undefined}
        userRole={userRole}
        onBack={() => router.push('/dashboard')}
        onEdit={viewMode === 'view' ? handleEdit : undefined}
        showBackButton={true}
      />

      <main className="mx-auto max-w-4xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mr-3" />
                <span className="text-lg">Loading profile...</span>
              </CardContent>
            </Card>
          )}

          {/* No Profile - Create Mode */}
          {!isLoading && !profile && viewMode === 'view' && (
            <Card>
              <CardContent className="text-center py-12">
                <Plus className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Profile Created
                </h3>
                <p className="text-gray-600 mb-6">
                  Create your belief profile to start participating in debates and get matched with other users.
                </p>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Profile
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Create/Edit Form */}
          {(viewMode === 'create' || viewMode === 'edit') && (
            <ProfileEditForm
              profile={viewMode === 'edit' ? profile || undefined : undefined}
              onSave={handleProfileSave}
              onCancel={handleCancel}
              autoSave={true}
              autoSaveInterval={30000}
            />
          )}

          {/* View Profile */}
          {!isLoading && profile && viewMode === 'view' && (
            <div className="space-y-6">
              <ProfileView
                profile={profile}
                showUserInfo={true}
                showActivitySummary={true}
              />
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium">Profile Management</h3>
                      <p className="text-sm text-gray-600">
                        Keep your profile up to date to improve your debate matching experience.
                      </p>
                    </div>
                    <Button onClick={handleEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
