/**
 * Teacher Dashboard Overview Page
 * 
 * Task 8.1.2: Main dashboard overview page that integrates with the existing
 * TeacherAnalyticsDashboard and provides quick access to key metrics and actions.
 */

'use client';

import React from 'react';

import { TeacherAnalyticsDashboard } from '@/components/teacher/TeacherAnalyticsDashboard';
import { DashboardOverview } from '@/components/teacher/DashboardOverview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TeacherDashboardPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your classes, students, and recent activity
          </p>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Dashboard Overview</TabsTrigger>
          <TabsTrigger value="analytics">Detailed Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <DashboardOverview />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <TeacherAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
