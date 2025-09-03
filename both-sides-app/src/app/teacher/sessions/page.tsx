/**
 * Teacher Sessions Page
 * 
 * Placeholder for Task 8.3: Session Creation & Scheduling System
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Activity } from 'lucide-react';

export default function TeacherSessionsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Session Management</h1>
          <p className="text-muted-foreground">
            Create and manage debate sessions
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Session Creation
              <Badge variant="secondary" className="ml-2">Coming in Task 8.3.1</Badge>
            </CardTitle>
            <CardDescription>
              Debate session creation workflow and scheduling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This section will include session creation wizard, scheduling interface, 
              and resource management tools.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Live Monitoring
              <Badge variant="secondary" className="ml-2">Coming in Task 8.4.1</Badge>
            </CardTitle>
            <CardDescription>
              Real-time session monitoring and management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This section will include live session monitoring, intervention tools, 
              and recording management.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
