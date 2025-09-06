'use client';

import { useState } from 'react';

import { useUser } from '@clerk/nextjs';
import { redirect, useRouter } from 'next/navigation';
import { ProfileSearch, ProfilePageHeader, useProfileNavigation } from '@/components/profiles';
import { Profile } from '@/types/profile';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Users } from 'lucide-react';

export default function ProfilesPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { getBreadcrumbItems } = useProfileNavigation();
  
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    redirect('/sign-in');
  }

  const userRole = (user.publicMetadata?.role as 'STUDENT' | 'TEACHER' | 'ADMIN') || 'STUDENT';
  
  // Only allow teachers and admins to access this page
  if (userRole === 'STUDENT') {
    redirect('/dashboard');
  }

  const breadcrumbItems = getBreadcrumbItems();

  const handleProfileSelect = (profile: Profile) => {
    router.push(`/profiles/${profile.id}`);
  };

  const handleProfileEdit = (profile: Profile) => {
    router.push(`/profiles/${profile.id}/edit`);
  };

  const handleProfileView = (profile: Profile) => {
    router.push(`/profiles/${profile.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ProfilePageHeader
        title="Profile Management"
        description={
          userRole === 'ADMIN' 
            ? 'Manage and search all user profiles across the platform'
            : 'Search and view student profiles in your classes'
        }
        breadcrumbItems={breadcrumbItems}
        userRole={userRole}
        onBack={() => router.push('/dashboard')}
        showBackButton={true}
      />

      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {userRole === 'TEACHER' && (
            <Alert className="mb-6">
              <Users className="h-4 w-4" />
              <AlertDescription>
                As a teacher, you can view profiles of students enrolled in your classes.
              </AlertDescription>
            </Alert>
          )}

          <ProfileSearch
            onProfileSelect={handleProfileSelect}
            onProfileEdit={handleProfileEdit}
            onProfileView={handleProfileView}
            variant="detailed"
            showActions={true}
            maxResults={50}
            allowExport={userRole === 'ADMIN'}
          />
        </div>
      </main>
    </div>
  );
}
