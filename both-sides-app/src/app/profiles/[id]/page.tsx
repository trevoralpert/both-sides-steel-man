'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { redirect, useRouter, useParams } from 'next/navigation';
import { ProfileView, ProfilePageHeader, useProfileNavigation } from '@/components/profiles';
import { ProfileAPI, ProfileAPIError } from '@/lib/api/profile';
import { Profile } from '@/types/profile';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle, Edit, ArrowLeft } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

export default function ProfileViewPage() {
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

  const handleEdit = () => {
    router.push(`/profiles/${profileId}/edit`);
  };

  const handleBack = () => {
    router.back();
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

  // Check if user has permission to view this profile
  const canViewProfile = isCurrentUser || userRole === 'ADMIN' || userRole === 'TEACHER';

  if (!canViewProfile && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="mx-auto max-w-4xl py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You don't have permission to view this profile.
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
        title={
          profile?.user?.first_name || profile?.user?.last_name 
            ? `${profile.user.first_name || ''} ${profile.user.last_name || ''}`.trim()
            : profile?.user?.username || 'Profile'
        }
        description={
          isCurrentUser 
            ? 'Your debate profile and belief information'
            : 'View user profile and belief information'
        }
        breadcrumbItems={breadcrumbItems}
        profile={profile || undefined}
        userRole={userRole}
        onBack={handleBack}
        onEdit={isCurrentUser || userRole === 'ADMIN' ? handleEdit : undefined}
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
                <Button onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
              </CardContent>
            </Card>
          )}

          {/* View Profile */}
          {!isLoading && profile && (
            <div className="space-y-6">
              <ProfileView
                profile={profile}
                showUserInfo={true}
                showActivitySummary={true}
              />
              
              {/* Profile Actions */}
              {(isCurrentUser || userRole === 'ADMIN') && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium">Profile Management</h3>
                        <p className="text-sm text-gray-600">
                          {isCurrentUser 
                            ? 'Keep your profile up to date to improve your debate matching experience.'
                            : 'Administrative profile management options.'
                          }
                        </p>
                      </div>
                      <Button onClick={handleEdit}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
