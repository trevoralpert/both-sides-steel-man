'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { redirect, useRouter, useParams } from 'next/navigation';
import { ProfileEditForm, ProfilePageHeader, useProfileNavigation } from '@/components/profiles';
import { ProfileAPI, ProfileAPIError } from '@/lib/api/profile';
import { Profile } from '@/types/profile';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

export default function ProfileEditPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { getBreadcrumbItems } = useProfileNavigation();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const profileId = params?.id as string;

  // Load profile by ID
  const loadProfile = async () => {
    if (!isLoaded || !user || !profileId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await ProfileAPI.getProfile(profileId, token);
      setProfile(response.data);
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
  }, [isLoaded, user, profileId]);

  const handleProfileSave = (savedProfile: Profile) => {
    setProfile(savedProfile);
    router.push(`/profiles/${profileId}`);
  };

  const handleCancel = () => {
    router.push(`/profiles/${profileId}`);
  };

  const handleBack = () => {
    router.push(`/profiles/${profileId}`);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    redirect('/sign-in');
  }

  const userRole = (user.publicMetadata?.role as 'STUDENT' | 'TEACHER' | 'ADMIN') || 'STUDENT';
  const isCurrentUser = profile?.user?.id === user.id;
  const breadcrumbItems = getBreadcrumbItems(profile || undefined);

  // Check if user has permission to edit this profile
  const canEditProfile = isCurrentUser || userRole === 'ADMIN';

  if (!canEditProfile && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="mx-auto max-w-4xl py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You don't have permission to edit this profile.
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ProfilePageHeader
        title={`Edit ${
          profile?.user?.first_name || profile?.user?.last_name 
            ? `${profile.user.first_name || ''} ${profile.user.last_name || ''}`.trim()
            : profile?.user?.username || 'Profile'
        }`}
        description={
          isCurrentUser 
            ? 'Update your belief profile and personal information'
            : 'Edit user profile information'
        }
        breadcrumbItems={breadcrumbItems}
        profile={profile || undefined}
        userRole={userRole}
        onBack={handleBack}
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

          {/* Profile Not Found */}
          {!isLoading && !profile && (
            <Card>
              <CardContent className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Profile Not Found
                </h3>
                <p className="text-gray-600 mb-6">
                  The requested profile could not be found or may have been deleted.
                </p>
                <button 
                  onClick={handleBack}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </button>
              </CardContent>
            </Card>
          )}

          {/* Edit Form */}
          {!isLoading && profile && (
            <ProfileEditForm
              profile={profile}
              onSave={handleProfileSave}
              onCancel={handleCancel}
              autoSave={true}
              autoSaveInterval={30000}
            />
          )}
        </div>
      </main>
    </div>
  );
}
