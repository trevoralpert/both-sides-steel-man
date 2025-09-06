/**
 * Teacher Class Detail Page
 * 
 * Task 8.2.1: Individual class detail view with comprehensive information
 */

'use client';

import React from 'react';

import { ClassDetailView } from '@/components/teacher/ClassDetailView';

interface ClassDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ClassDetailPage({ params }: ClassDetailPageProps) {
  const resolvedParams = await params;
  return (
    <div className="container mx-auto p-6">
      <ClassDetailView classId={resolvedParams.id} />
    </div>
  );
}
