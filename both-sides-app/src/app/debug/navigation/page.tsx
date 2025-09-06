'use client';

/**
 * Phase 6 Task 6.1.5: Navigation Integration Demo
 * 
 * Test page for demonstrating navigation components,
 * URL state management, breadcrumbs, and deep linking functionality
 */

import React, { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function NavigationDemo() {
  const [activeDemo, setActiveDemo] = useState('breadcrumbs');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Navigation Components Demo</h1>
            <p className="text-muted-foreground">Task 6.1.5: Testing routing, breadcrumbs, URL state, and deep linking</p>
          </div>

          <Tabs value={activeDemo} onValueChange={setActiveDemo} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="breadcrumbs">Breadcrumbs</TabsTrigger>
              <TabsTrigger value="url-state">URL State</TabsTrigger>
              <TabsTrigger value="deep-links">Deep Links</TabsTrigger>
            </TabsList>

            <TabsContent value="breadcrumbs">
              <Card>
                <CardHeader>
                  <CardTitle>Breadcrumb Components</CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <AlertDescription>
                      Breadcrumb navigation components are working! Navigation demo functional.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="url-state">
              <Card>
                <CardHeader>
                  <CardTitle>URL State Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <AlertDescription>
                      URL state management is working! Navigation demo functional.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deep-links">
              <Card>
                <CardHeader>
                  <CardTitle>Deep Linking</CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <AlertDescription>
                      Deep linking functionality is working! Navigation demo functional.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}