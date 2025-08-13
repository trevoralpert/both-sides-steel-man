'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { UserButton } from '@clerk/nextjs';
import { redirect, useRouter } from 'next/navigation';
import { ProfileDashboard } from '@/components/profiles';
import { Profile } from '@/types/profile';

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();


  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    redirect('/sign-in');
  }

  const handleCreateProfile = () => {
    router.push('/profile');
  };

  const handleEditProfile = (profile: Profile) => {
    router.push(`/profiles/${profile.id}/edit`);
  };

  const handleViewProfile = (profile: Profile) => {
    router.push(`/profiles/${profile.id}`);
  };

  // Determine user role from Clerk metadata or default to STUDENT
  const userRole = (user.publicMetadata?.role as 'STUDENT' | 'TEACHER' | 'ADMIN') || 'STUDENT';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Both Sides Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user.firstName || user.emailAddresses[0]?.emailAddress}!
              </span>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "h-10 w-10"
                  }
                }}
                afterSignOutUrl="/"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <ProfileDashboard
            userRole={userRole}
            currentUserId={user.id}
            onCreateProfile={handleCreateProfile}
            onEditProfile={handleEditProfile}
            onViewProfile={handleViewProfile}
          />
        </div>
      </main>
    </div>
  );
}
