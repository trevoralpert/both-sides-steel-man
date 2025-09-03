/**
 * Teacher Performance Monitoring Page
 * 
 * Task 8.2.3: Academic Performance Monitoring
 */

'use client';

import React from 'react';
import { PerformanceMonitoringDashboard } from '@/components/teacher/PerformanceMonitoringDashboard';

export default function TeacherPerformancePage() {
  return (
    <div className="container mx-auto p-6">
      <PerformanceMonitoringDashboard />
    </div>
  );
}
