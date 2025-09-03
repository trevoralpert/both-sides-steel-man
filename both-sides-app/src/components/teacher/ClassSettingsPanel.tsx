/**
 * Class Settings Panel Component
 * 
 * Task 8.2.1: Class settings for debate preferences and configurations.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Settings,
  Save,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  MessageSquare,
  Shield,
  Bell,
  BookOpen,
  Calendar
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface ClassSettings {
  // Basic Information
  name: string;
  description: string;
  subject: string;
  gradeLevel: string;
  academicYear: string;
  term: string;
  maxStudents: number;
  
  // Debate Settings
  debateSettings: {
    defaultDebateLength: number; // minutes
    preparationTime: number; // minutes
    maxArgumentLength: number; // characters
    allowAnonymousDebates: boolean;
    enableAICoaching: boolean;
    moderationLevel: 'strict' | 'moderate' | 'lenient';
    allowSpectators: boolean;
    recordDebates: boolean;
  };
  
  // Notification Settings
  notifications: {
    emailNotifications: boolean;
    parentNotifications: boolean;
    weeklyReports: boolean;
    instantAlerts: boolean;
  };
  
  // Privacy Settings
  privacy: {
    publicProfile: boolean;
    shareWithOrganization: boolean;
    allowDataExport: boolean;
    retentionPeriod: number; // days
  };
  
  // Schedule Settings
  schedule: {
    meetingTimes: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }>;
    room: string;
    virtualMeetingUrl: string;
    timezone: string;
  };
}

interface ClassSettingsPanelProps {
  classId: string;
  classData: any; // From parent component
}

export function ClassSettingsPanel({ classId, classData }: ClassSettingsPanelProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [settings, setSettings] = useState<ClassSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [classId, user?.id]);

  const loadSettings = async () => {
    if (!user?.id || !classId) return;

    try {
      setLoading(true);
      setError(null);

      const token = await user.getToken();
      const response = await fetch(`/api/classes/${classId}/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        // Fallback mock data for development
        const mockSettings: ClassSettings = {
          name: classData.name || '',
          description: classData.description || '',
          subject: classData.subject || 'SCIENCE',
          gradeLevel: classData.gradeLevel || '11',
          academicYear: classData.academicYear || '2024-2025',
          term: classData.term || 'FALL',
          maxStudents: classData.maxStudents || 30,
          
          debateSettings: {
            defaultDebateLength: 45,
            preparationTime: 15,
            maxArgumentLength: 500,
            allowAnonymousDebates: false,
            enableAICoaching: true,
            moderationLevel: 'moderate',
            allowSpectators: true,
            recordDebates: true
          },
          
          notifications: {
            emailNotifications: true,
            parentNotifications: true,
            weeklyReports: true,
            instantAlerts: false
          },
          
          privacy: {
            publicProfile: false,
            shareWithOrganization: true,
            allowDataExport: true,
            retentionPeriod: 365
          },
          
          schedule: {
            meetingTimes: classData.schedule?.meetingTimes || [],
            room: classData.schedule?.room || '',
            virtualMeetingUrl: classData.schedule?.virtualMeetingUrl || '',
            timezone: 'America/New_York'
          }
        };
        setSettings(mockSettings);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load class settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (path: string, value: any) => {
    if (!settings) return;

    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current: any = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings as ClassSettings;
    });
    
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    if (!settings || !user?.id) return;

    try {
      setSaving(true);
      setError(null);

      const token = await user.getToken();
      const response = await fetch(`/api/classes/${classId}/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setHasChanges(false);
        addNotification({
          type: 'success',
          title: 'Settings Saved',
          message: 'Class settings have been updated successfully.'
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save class settings. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  const addScheduleTime = () => {
    if (!settings) return;
    
    const newTime = {
      dayOfWeek: 1, // Monday
      startTime: '09:00',
      endTime: '10:30'
    };
    
    handleSettingChange('schedule.meetingTimes', [...settings.schedule.meetingTimes, newTime]);
  };

  const removeScheduleTime = (index: number) => {
    if (!settings) return;
    
    const newTimes = settings.schedule.meetingTimes.filter((_, i) => i !== index);
    handleSettingChange('schedule.meetingTimes', newTimes);
  };

  const updateScheduleTime = (index: number, field: string, value: any) => {
    if (!settings) return;
    
    const newTimes = [...settings.schedule.meetingTimes];
    newTimes[index] = { ...newTimes[index], [field]: value };
    handleSettingChange('schedule.meetingTimes', newTimes);
  };

  const formatDayOfWeek = (day: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !settings) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error || 'Failed to load settings'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save Button */}
      {hasChanges && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>You have unsaved changes</span>
            <Button size="sm" onClick={handleSaveSettings} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Basic Information
          </CardTitle>
          <CardDescription>
            Update class details and basic settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Class Name</Label>
              <Input
                id="name"
                value={settings.name}
                onChange={(e) => handleSettingChange('name', e.target.value)}
                placeholder="Enter class name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxStudents">Max Students</Label>
              <Input
                id="maxStudents"
                type="number"
                min="1"
                max="100"
                value={settings.maxStudents}
                onChange={(e) => handleSettingChange('maxStudents', parseInt(e.target.value))}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={settings.description}
              onChange={(e) => handleSettingChange('description', e.target.value)}
              placeholder="Enter class description"
              rows={3}
            />
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select 
                value={settings.subject} 
                onValueChange={(value) => handleSettingChange('subject', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCIENCE">Science</SelectItem>
                  <SelectItem value="PHILOSOPHY">Philosophy</SelectItem>
                  <SelectItem value="GOVERNMENT">Government</SelectItem>
                  <SelectItem value="HISTORY">History</SelectItem>
                  <SelectItem value="ENGLISH">English</SelectItem>
                  <SelectItem value="DEBATE">Debate</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gradeLevel">Grade Level</Label>
              <Select 
                value={settings.gradeLevel} 
                onValueChange={(value) => handleSettingChange('gradeLevel', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      Grade {i + 1}
                    </SelectItem>
                  ))}
                  <SelectItem value="COLLEGE">College</SelectItem>
                  <SelectItem value="ADULT">Adult</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debate Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Debate Settings
          </CardTitle>
          <CardDescription>
            Configure debate preferences and moderation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="debateLength">Default Debate Length (minutes)</Label>
              <Input
                id="debateLength"
                type="number"
                min="15"
                max="180"
                value={settings.debateSettings.defaultDebateLength}
                onChange={(e) => handleSettingChange('debateSettings.defaultDebateLength', parseInt(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="preparationTime">Preparation Time (minutes)</Label>
              <Input
                id="preparationTime"
                type="number"
                min="5"
                max="60"
                value={settings.debateSettings.preparationTime}
                onChange={(e) => handleSettingChange('debateSettings.preparationTime', parseInt(e.target.value))}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="maxArgumentLength">Max Argument Length (characters)</Label>
            <Input
              id="maxArgumentLength"
              type="number"
              min="100"
              max="2000"
              value={settings.debateSettings.maxArgumentLength}
              onChange={(e) => handleSettingChange('debateSettings.maxArgumentLength', parseInt(e.target.value))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="moderationLevel">Moderation Level</Label>
            <Select 
              value={settings.debateSettings.moderationLevel} 
              onValueChange={(value) => handleSettingChange('debateSettings.moderationLevel', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lenient">Lenient - Minimal intervention</SelectItem>
                <SelectItem value="moderate">Moderate - Balanced moderation</SelectItem>
                <SelectItem value="strict">Strict - Active moderation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="allowAnonymous">Allow Anonymous Debates</Label>
                <p className="text-sm text-muted-foreground">Students can participate anonymously</p>
              </div>
              <Switch
                id="allowAnonymous"
                checked={settings.debateSettings.allowAnonymousDebates}
                onCheckedChange={(value) => handleSettingChange('debateSettings.allowAnonymousDebates', value)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enableAI">Enable AI Coaching</Label>
                <p className="text-sm text-muted-foreground">Provide AI-powered suggestions during debates</p>
              </div>
              <Switch
                id="enableAI"
                checked={settings.debateSettings.enableAICoaching}
                onCheckedChange={(value) => handleSettingChange('debateSettings.enableAICoaching', value)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="allowSpectators">Allow Spectators</Label>
                <p className="text-sm text-muted-foreground">Other students can watch debates</p>
              </div>
              <Switch
                id="allowSpectators"
                checked={settings.debateSettings.allowSpectators}
                onCheckedChange={(value) => handleSettingChange('debateSettings.allowSpectators', value)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="recordDebates">Record Debates</Label>
                <p className="text-sm text-muted-foreground">Save debate transcripts for review</p>
              </div>
              <Switch
                id="recordDebates"
                checked={settings.debateSettings.recordDebates}
                onCheckedChange={(value) => handleSettingChange('debateSettings.recordDebates', value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Schedule Settings
          </CardTitle>
          <CardDescription>
            Configure class meeting times and location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="room">Room/Location</Label>
              <Input
                id="room"
                value={settings.schedule.room}
                onChange={(e) => handleSettingChange('schedule.room', e.target.value)}
                placeholder="e.g., Room 204, Science Lab"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="virtualUrl">Virtual Meeting URL</Label>
              <Input
                id="virtualUrl"
                value={settings.schedule.virtualMeetingUrl}
                onChange={(e) => handleSettingChange('schedule.virtualMeetingUrl', e.target.value)}
                placeholder="https://meet.example.com/room"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Meeting Times</Label>
              <Button variant="outline" size="sm" onClick={addScheduleTime}>
                Add Time
              </Button>
            </div>
            
            {settings.schedule.meetingTimes.map((time, index) => (
              <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg">
                <Select 
                  value={time.dayOfWeek.toString()} 
                  onValueChange={(value) => updateScheduleTime(index, 'dayOfWeek', parseInt(value))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 7 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {formatDayOfWeek(i)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Input
                  type="time"
                  value={time.startTime}
                  onChange={(e) => updateScheduleTime(index, 'startTime', e.target.value)}
                  className="w-24"
                />
                
                <span className="text-muted-foreground">to</span>
                
                <Input
                  type="time"
                  value={time.endTime}
                  onChange={(e) => updateScheduleTime(index, 'endTime', e.target.value)}
                  className="w-24"
                />
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => removeScheduleTime(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Control how you and students receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="emailNotifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive email updates about class activity</p>
            </div>
            <Switch
              id="emailNotifications"
              checked={settings.notifications.emailNotifications}
              onCheckedChange={(value) => handleSettingChange('notifications.emailNotifications', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="parentNotifications">Parent Notifications</Label>
              <p className="text-sm text-muted-foreground">Send updates to parent/guardian emails</p>
            </div>
            <Switch
              id="parentNotifications"
              checked={settings.notifications.parentNotifications}
              onCheckedChange={(value) => handleSettingChange('notifications.parentNotifications', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="weeklyReports">Weekly Reports</Label>
              <p className="text-sm text-muted-foreground">Generate weekly progress reports</p>
            </div>
            <Switch
              id="weeklyReports"
              checked={settings.notifications.weeklyReports}
              onCheckedChange={(value) => handleSettingChange('notifications.weeklyReports', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="instantAlerts">Instant Alerts</Label>
              <p className="text-sm text-muted-foreground">Immediate notifications for urgent issues</p>
            </div>
            <Switch
              id="instantAlerts"
              checked={settings.notifications.instantAlerts}
              onCheckedChange={(value) => handleSettingChange('notifications.instantAlerts', value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Privacy & Data Settings
          </CardTitle>
          <CardDescription>
            Control data sharing and retention policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="shareWithOrg">Share with Organization</Label>
              <p className="text-sm text-muted-foreground">Allow organization administrators to view class data</p>
            </div>
            <Switch
              id="shareWithOrg"
              checked={settings.privacy.shareWithOrganization}
              onCheckedChange={(value) => handleSettingChange('privacy.shareWithOrganization', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="allowExport">Allow Data Export</Label>
              <p className="text-sm text-muted-foreground">Students can export their own data</p>
            </div>
            <Switch
              id="allowExport"
              checked={settings.privacy.allowDataExport}
              onCheckedChange={(value) => handleSettingChange('privacy.allowDataExport', value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="retentionPeriod">Data Retention Period (days)</Label>
            <Input
              id="retentionPeriod"
              type="number"
              min="30"
              max="2555" // 7 years
              value={settings.privacy.retentionPeriod}
              onChange={(e) => handleSettingChange('privacy.retentionPeriod', parseInt(e.target.value))}
            />
            <p className="text-sm text-muted-foreground">
              How long to keep class data after completion (minimum 30 days)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={saving || !hasChanges}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
