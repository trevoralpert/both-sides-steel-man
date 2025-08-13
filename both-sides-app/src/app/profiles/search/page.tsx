'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { redirect, useRouter } from 'next/navigation';
import { ProfileSearch, ProfilePageHeader, useProfileNavigation } from '@/components/profiles';
import { Profile } from '@/types/profile';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Search } from 'lucide-react';

export default function ProfileSearchPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { getBreadcrumbItems } = useProfileNavigation();

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
        title="Advanced Profile Search"
        description="Use advanced filters to find specific user profiles"
        breadcrumbItems={breadcrumbItems}
        userRole={userRole}
        onBack={() => router.push('/profiles')}
        showBackButton={true}
      />

      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-4">
                <Search className="h-6 w-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Advanced Search Features
                  </h3>
                  <ul className="mt-2 text-sm text-gray-600 space-y-1">
                    <li>• Search by name, username, or belief content</li>
                    <li>• Filter by role, completion status, and ideology</li>
                    <li>• Sort by various criteria and export results</li>
                    <li>• Real-time search with advanced filtering options</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <ProfileSearch
            onProfileSelect={handleProfileSelect}
            onProfileEdit={handleProfileEdit}
            onProfileView={handleProfileView}
            variant="detailed"
            showActions={true}
            maxResults={100}
            allowExport={userRole === 'ADMIN'}
          />
        </div>
      </main>
    </div>
  );
}
