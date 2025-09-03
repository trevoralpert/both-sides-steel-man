/**
 * Teacher Students Page
 * 
 * Task 8.2.2: Advanced Student Management Tools
 */

'use client';

import React from 'react';
import { StudentManagementDashboard } from '@/components/teacher/StudentManagementDashboard';

export default function TeacherStudentsPage() {
  return (
    <div className="container mx-auto p-6">
      <StudentManagementDashboard />
    </div>
  );
}
