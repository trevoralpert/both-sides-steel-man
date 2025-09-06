/**
 * Dashboard Personalization Component
 * 
 * Task 8.1.2: Customizable dashboard features including widget arrangement,
 * theme preferences, and personalized settings.
 */

'use client';

import React, { useState } from 'react';

import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Settings,
  Palette,
  Layout,
  Bell,
  Grid,
  List,
  Monitor,
  Moon,
  Sun,
  Smartphone
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

interface DashboardPersonalizationProps {
  trigger?: React.ReactNode;
}

export function DashboardPersonalization({ trigger }: DashboardPersonalizationProps) {
  const { state, updatePreferences } = useTeacherDashboard();
  const [open, setOpen] = useState(false);

  const handlePreferenceChange = (key: string, value: any) => {
    updatePreferences({ [key]: value });
  };

  const resetToDefaults = () => {
    updatePreferences({
      theme: 'system',
      notificationsEnabled: true,
      widgetLayout: ['overview', 'classes', 'recent-activity'],
      defaultClassView: 'grid'
    });
  };

  const defaultTrigger = (
    <Button variant="ghost" size="sm">
      <Settings className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Dashboard Personalization
          </DialogTitle>
          <DialogDescription>
            Customize your dashboard experience and preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Palette className="h-5 w-5 mr-2" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the look and feel of your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="theme">Theme</Label>
                <Select 
                  value={state.preferences.theme} 
                  onValueChange={(value) => handlePreferenceChange('theme', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center">
                        <Sun className="h-4 w-4 mr-2" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center">
                        <Moon className="h-4 w-4 mr-2" />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center">
                        <Monitor className="h-4 w-4 mr-2" />
                        System
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Layout Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Layout className="h-5 w-5 mr-2" />
                Layout & Views
              </CardTitle>
              <CardDescription>
                Customize how content is displayed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="classView">Default Class View</Label>
                <Select 
                  value={state.preferences.defaultClassView} 
                  onValueChange={(value) => handlePreferenceChange('defaultClassView', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">
                      <div className="flex items-center">
                        <Grid className="h-4 w-4 mr-2" />
                        Grid
                      </div>
                    </SelectItem>
                    <SelectItem value="list">
                      <div className="flex items-center">
                        <List className="h-4 w-4 mr-2" />
                        List
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sidebarCollapsed">Collapse Sidebar</Label>
                  <p className="text-sm text-muted-foreground">
                    Start with sidebar collapsed on desktop
                  </p>
                </div>
                <Switch
                  id="sidebarCollapsed"
                  checked={state.preferences.sidebarCollapsed}
                  onCheckedChange={(value) => handlePreferenceChange('sidebarCollapsed', value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Bell className="h-5 w-5 mr-2" />
                Notifications
              </CardTitle>
              <CardDescription>
                Control how you receive updates and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifications">Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive in-app notifications and alerts
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={state.preferences.notificationsEnabled}
                  onCheckedChange={(value) => handlePreferenceChange('notificationsEnabled', value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Widget Layout */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Layout className="h-5 w-5 mr-2" />
                Dashboard Widgets
                <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
              </CardTitle>
              <CardDescription>
                Customize widget arrangement and visibility
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Widget customization will be available in future updates. 
                Currently showing: {state.preferences.widgetLayout.join(', ')}
              </p>
            </CardContent>
          </Card>

          <Separator />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={resetToDefaults}>
              Reset to Defaults
            </Button>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setOpen(false)}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
