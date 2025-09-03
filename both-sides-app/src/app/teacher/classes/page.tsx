/**
 * Teacher Classes Page
 * 
 * Task 8.2.1: Enhanced Class Management Interface
 */

'use client';

import React from 'react';
import { ClassManagementDashboard } from '@/components/teacher/ClassManagementDashboard';

export default function TeacherClassesPage() {
  return (
    <div className="container mx-auto p-6">
      <ClassManagementDashboard />
    </div>
  );
}
