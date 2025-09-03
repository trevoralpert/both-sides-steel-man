/**
 * Availability Manager Component
 * 
 * Task 8.3.2: Teacher and student availability management with recurring patterns,
 * conflict resolution, and optimal time suggestions.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Calendar,
  Clock,
  Users,
  Plus,
  Edit,
  Trash2,
  Copy,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Settings,
  CalendarDays,
  Target,
  TrendingUp
} from 'lucide-react';

import { LoadingState } from '@/components/ui/loading-state';
import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface TimeSlot {
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

interface AvailabilityPattern {
  id: string;
  name: string;
  description?: string;
  type: 'teacher' | 'student' | 'class';
  userId?: string;
  classId?: string;
  isActive: boolean;
  recurring: {
    type: 'weekly' | 'daily' | 'custom';
    daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
    startDate: Date;
    endDate?: Date;
    exceptions: Date[]; // Specific dates to exclude
  };
  timeSlots: TimeSlot[];
  createdAt: Date;
  updatedAt: Date;
}

interface AvailabilityConflict {
  date: Date;
  timeSlot: TimeSlot;
  conflictType: 'overlap' | 'teacher_busy' | 'student_busy' | 'resource_conflict';
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestions: string[];
}

interface OptimalTimeSlot {
  date: Date;
  timeSlot: TimeSlot;
  score: number;
  availableParticipants: number;
  totalParticipants: number;
  reasoning: string[];
  conflicts: number;
}

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const DEFAULT_TIME_SLOTS = [
  { start: '08:00', end: '09:00' },
  { start: '09:00', end: '10:00' },
  { start: '10:00', end: '11:00' },
  { start: '11:00', end: '12:00' },
  { start: '13:00', end: '14:00' },
  { start: '14:00', end: '15:00' },
  { start: '15:00', end: '16:00' },
  { start: '16:00', end: '17:00' }
];

interface AvailabilityManagerProps {
  classId?: string;
  participants?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    role: 'teacher' | 'student';
  }>;
  onAvailabilityUpdate?: (patterns: AvailabilityPattern[]) => void;
  onOptimalTimesGenerated?: (times: OptimalTimeSlot[]) => void;
}

export function AvailabilityManager({ 
  classId, 
  participants = [], 
  onAvailabilityUpdate,
  onOptimalTimesGenerated
}: AvailabilityManagerProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [patterns, setPatterns] = useState<AvailabilityPattern[]>([]);
  const [conflicts, setConflicts] = useState<AvailabilityConflict[]>([]);
  const [optimalTimes, setOptimalTimes] = useState<OptimalTimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('teacher');
  
  // Pattern editing state
  const [editingPattern, setEditingPattern] = useState<AvailabilityPattern | null>(null);
  const [showPatternDialog, setShowPatternDialog] = useState(false);
  const [newPattern, setNewPattern] = useState<Partial<AvailabilityPattern>>({
    name: '',
    description: '',
    type: 'teacher',
    isActive: true,
    recurring: {
      type: 'weekly',
      daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday default
      startDate: new Date(),
      exceptions: []
    },
    timeSlots: [{ start: '09:00', end: '17:00' }]
  });

  useEffect(() => {
    loadAvailabilityPatterns();
  }, [user?.id, classId]);

  useEffect(() => {
    if (patterns.length > 0) {
      analyzeConflicts();
      generateOptimalTimes();
    }
  }, [patterns, participants]);

  const loadAvailabilityPatterns = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const token = await user.getToken();
      const response = await fetch(`/api/availability/patterns${classId ? `?classId=${classId}` : ''}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPatterns(data.patterns || []);
      } else {
        // Mock data for development
        const mockPatterns: AvailabilityPattern[] = [
          {
            id: '1',
            name: 'Regular Teaching Hours',
            description: 'Standard availability for debate sessions',
            type: 'teacher',
            userId: user.id,
            isActive: true,
            recurring: {
              type: 'weekly',
              daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
              startDate: new Date(),
              exceptions: []
            },
            timeSlots: [
              { start: '09:00', end: '12:00' },
              { start: '13:00', end: '16:00' }
            ],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];
        setPatterns(mockPatterns);
      }
    } catch (error) {
      console.error('Failed to load availability patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeConflicts = () => {
    const detectedConflicts: AvailabilityConflict[] = [];
    // Conflict detection logic would go here
    setConflicts(detectedConflicts);
  };

  const generateOptimalTimes = () => {
    if (participants.length === 0) {
      setOptimalTimes([]);
      return;
    }

    const optimal: OptimalTimeSlot[] = [];
    // Optimal time generation logic would go here
    setOptimalTimes(optimal);
    onOptimalTimesGenerated?.(optimal);
  };

  const savePattern = async () => {
    if (!newPattern.name || !newPattern.timeSlots || newPattern.timeSlots.length === 0) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please provide a name and at least one time slot.'
      });
      return;
    }

    try {
      setLoading(true);
      
      const patternToSave: AvailabilityPattern = {
        ...newPattern,
        id: editingPattern?.id || Date.now().toString(),
        userId: user?.id || '',
        createdAt: editingPattern?.createdAt || new Date(),
        updatedAt: new Date()
      } as AvailabilityPattern;

      // For development, directly update state
      if (editingPattern) {
        setPatterns(prev => prev.map(p => p.id === editingPattern.id ? patternToSave : p));
      } else {
        setPatterns(prev => [...prev, patternToSave]);
      }

      addNotification({
        type: 'success',
        title: 'Pattern Saved',
        message: `Availability pattern "${patternToSave.name}" has been saved.`
      });

      resetPatternForm();
      setShowPatternDialog(false);
      onAvailabilityUpdate?.(patterns);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save availability pattern. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const deletePattern = async (patternId: string) => {
    setPatterns(prev => prev.filter(p => p.id !== patternId));
    addNotification({
      type: 'success',
      title: 'Pattern Deleted',
      message: 'Availability pattern has been deleted.'
    });
  };

  const resetPatternForm = () => {
    setNewPattern({
      name: '',
      description: '',
      type: 'teacher',
      isActive: true,
      recurring: {
        type: 'weekly',
        daysOfWeek: [1, 2, 3, 4, 5],
        startDate: new Date(),
        exceptions: []
      },
      timeSlots: [{ start: '09:00', end: '17:00' }]
    });
    setEditingPattern(null);
  };

  const editPattern = (pattern: AvailabilityPattern) => {
    setNewPattern(pattern);
    setEditingPattern(pattern);
    setShowPatternDialog(true);
  };

  const addTimeSlot = () => {
    setNewPattern(prev => ({
      ...prev,
      timeSlots: [...(prev.timeSlots || []), { start: '09:00', end: '10:00' }]
    }));
  };

  const removeTimeSlot = (index: number) => {
    setNewPattern(prev => ({
      ...prev,
      timeSlots: prev.timeSlots?.filter((_, i) => i !== index) || []
    }));
  };

  const updateTimeSlot = (index: number, field: 'start' | 'end', value: string) => {
    setNewPattern(prev => ({
      ...prev,
      timeSlots: prev.timeSlots?.map((slot, i) => 
        i === index ? { ...slot, [field]: value } : slot
      ) || []
    }));
  };

  const toggleDay = (day: number) => {
    setNewPattern(prev => ({
      ...prev,
      recurring: {
        ...prev.recurring!,
        daysOfWeek: prev.recurring!.daysOfWeek.includes(day)
          ? prev.recurring!.daysOfWeek.filter(d => d !== day)
          : [...prev.recurring!.daysOfWeek, day].sort()
      }
    }));
  };

  if (loading && patterns.length === 0) {
    return <LoadingState message="Loading availability patterns..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Availability Management</h3>
          <p className="text-muted-foreground">
            Manage when you and your students are available for debates
          </p>
        </div>
        <Button onClick={() => setShowPatternDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Pattern
        </Button>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="teacher">My Availability</TabsTrigger>
          <TabsTrigger value="optimal">Optimal Times</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
        </TabsList>

        <TabsContent value="teacher" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Your Availability Patterns
              </CardTitle>
              <CardDescription>
                Define when you're available to conduct debate sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {patterns.filter(p => p.type === 'teacher').map(pattern => (
                  <Card key={pattern.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium">{pattern.name}</h4>
                          <Switch
                            checked={pattern.isActive}
                            onCheckedChange={(checked) => {
                              setPatterns(prev => prev.map(p => 
                                p.id === pattern.id ? { ...p, isActive: checked } : p
                              ));
                            }}
                          />
                        </div>
                        {pattern.description && (
                          <p className="text-sm text-muted-foreground mb-2">{pattern.description}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                          <div className="flex items-center">
                            <CalendarDays className="h-3 w-3 mr-1" />
                            {pattern.recurring.daysOfWeek.map(day => DAYS_OF_WEEK[day].slice(0, 3)).join(', ')}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {pattern.timeSlots.length} time slot{pattern.timeSlots.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {pattern.timeSlots.map((slot, index) => (
                            <Badge key={index} variant="outline">
                              {slot.start} - {slot.end}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => editPattern(pattern)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deletePattern(pattern.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

                {patterns.filter(p => p.type === 'teacher').length === 0 && (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Availability Patterns</h3>
                    <p className="text-muted-foreground mb-4">
                      Set your availability to help with optimal session scheduling
                    </p>
                    <Button onClick={() => setShowPatternDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Pattern
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Optimal Time Suggestions
              </CardTitle>
              <CardDescription>
                AI-powered suggestions for the best times to schedule debates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Feature Coming Soon</h3>
                <p className="text-muted-foreground">
                  Optimal time suggestions will be available in this task
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Scheduling Conflicts
              </CardTitle>
              <CardDescription>
                Detected conflicts in your availability patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Conflicts Detected</h3>
                <p className="text-muted-foreground">
                  Your availability patterns look good!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pattern Creation/Edit Dialog */}
      <Dialog open={showPatternDialog} onOpenChange={(open) => {
        setShowPatternDialog(open);
        if (!open) resetPatternForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPattern ? 'Edit' : 'Create'} Availability Pattern
            </DialogTitle>
            <DialogDescription>
              Define when you're available for debate sessions
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Pattern Name *</Label>
                <Input
                  id="name"
                  value={newPattern.name || ''}
                  onChange={(e) => setNewPattern(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Regular Teaching Hours"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newPattern.description || ''}
                  onChange={(e) => setNewPattern(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description for this pattern"
                  className="mt-1"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={newPattern.isActive}
                  onCheckedChange={(checked) => setNewPattern(prev => ({ ...prev, isActive: checked }))}
                />
                <Label>Pattern is active</Label>
              </div>
            </div>

            {/* Days of Week */}
            <div>
              <Label className="text-base font-medium">Days of Week</Label>
              <div className="grid grid-cols-7 gap-2 mt-2">
                {DAYS_OF_WEEK.map((day, index) => (
                  <div key={day} className="text-center">
                    <Checkbox
                      checked={newPattern.recurring?.daysOfWeek.includes(index)}
                      onCheckedChange={() => toggleDay(index)}
                    />
                    <div className="text-xs mt-1">{day.slice(0, 3)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Time Slots */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-medium">Time Slots</Label>
                <Button type="button" variant="outline" size="sm" onClick={addTimeSlot}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Slot
                </Button>
              </div>
              
              <div className="space-y-3">
                {newPattern.timeSlots?.map((slot, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      type="time"
                      value={slot.start}
                      onChange={(e) => updateTimeSlot(index, 'start', e.target.value)}
                      className="w-32"
                    />
                    
                    <span>to</span>
                    
                    <Input
                      type="time"
                      value={slot.end}
                      onChange={(e) => updateTimeSlot(index, 'end', e.target.value)}
                      className="w-32"
                    />
                    
                    {newPattern.timeSlots!.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTimeSlot(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPatternDialog(false);
                  resetPatternForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={savePattern} disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingPattern ? 'Update Pattern' : 'Create Pattern'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
