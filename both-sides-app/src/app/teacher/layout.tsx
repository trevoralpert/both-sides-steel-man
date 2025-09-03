'use client';

import { ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { TeacherDashboardLayout } from '@/components/teacher/TeacherDashboardLayout';
import { LoadingState } from '@/components/ui/loading-state';

interface TeacherLayoutProps {
  children: ReactNode;
}

export default function TeacherLayout({ children }: TeacherLayoutProps) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return <LoadingState message="Loading teacher dashboard..." />;
  }

  if (!user) {
    redirect('/sign-in?redirect=/teacher/dashboard');
  }

  // Check if user has teacher or admin role
  const userRole = (user.publicMetadata?.role as string) || 'student';
  if (!['teacher', 'admin'].includes(userRole.toLowerCase())) {
    redirect('/dashboard?error=insufficient_permissions');
  }

  return (
    <TeacherDashboardLayout>
      {children}
    </TeacherDashboardLayout>
  );
}
