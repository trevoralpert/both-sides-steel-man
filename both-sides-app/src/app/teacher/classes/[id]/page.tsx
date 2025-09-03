/**
 * Teacher Class Detail Page
 * 
 * Task 8.2.1: Individual class detail view with comprehensive information
 */

'use client';

import React from 'react';
import { ClassDetailView } from '@/components/teacher/ClassDetailView';

interface ClassDetailPageProps {
  params: {
    id: string;
  };
}

export default function ClassDetailPage({ params }: ClassDetailPageProps) {
  return (
    <div className="container mx-auto p-6">
      <ClassDetailView classId={params.id} />
    </div>
  );
}
