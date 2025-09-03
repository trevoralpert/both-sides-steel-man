/**
 * Teacher Analytics Page
 * 
 * Integration with existing TeacherAnalyticsDashboard from Phase 7
 */

'use client';

import React from 'react';
import { TeacherAnalyticsDashboard } from '@/components/teacher/TeacherAnalyticsDashboard';

export default function TeacherAnalyticsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics & Performance</h1>
        <p className="text-muted-foreground">
          Comprehensive analytics and reporting for your classes
        </p>
      </div>
      
      <TeacherAnalyticsDashboard />
    </div>
  );
}
