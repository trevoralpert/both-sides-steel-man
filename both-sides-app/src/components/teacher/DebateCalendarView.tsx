/**
 * Debate Calendar View Component
 * 
 * Task 8.3.2: Advanced scheduling interface with monthly, weekly, and daily views,
 * drag-and-drop session scheduling, and conflict detection.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Calendar,
  CalendarDays,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Eye,
  Edit,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle2,
  Play,
  Activity,
  Settings,
  RefreshCw
} from 'lucide-react';

import { LoadingState } from '@/components/ui/loading-state';
import { useTeacherDashboard } from './TeacherDashboardProvider';
import { SessionCreationWizard } from './SessionCreationWizard';

// Types
interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  type: 'session' | 'meeting' | 'break' | 'holiday' | 'availability';
  status: 'scheduled' | 'live' | 'completed' | 'cancelled' | 'draft';
  participants?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  }>;
  topic?: {
    title: string;
    category: string;
    difficulty: string;
  };
  format?: string;
  conflicts?: string[];
  teacherId: string;
  classId?: string;
  location?: string;
  resources?: string[];
}

interface CalendarProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onEventCreate: (start: Date, end: Date) => void;
  onEventUpdate: (eventId: string, updates: Partial<CalendarEvent>) => void;
  onEventDelete: (eventId: string) => void;
}

type CalendarView = 'month' | 'week' | 'day' | 'agenda';

interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  conflicts: string[];
  events: CalendarEvent[];
}

export function DebateCalendarView({ 
  events = [], 
  onEventClick, 
  onEventCreate, 
  onEventUpdate,
  onEventDelete 
}: CalendarProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [createSlot, setCreateSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [loading, setLoading] = useState(false);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    showCompleted: true,
    showDrafts: true,
    eventType: '',
    classId: ''
  });

  const filteredEvents = events.filter(event => {
    if (!filters.showCompleted && event.status === 'completed') return false;
    if (!filters.showDrafts && event.status === 'draft') return false;
    if (filters.eventType && event.type !== filters.eventType) return false;
    if (filters.classId && event.classId !== filters.classId) return false;
    return true;
  });

  // Calendar navigation
  const navigateDate = (direction: 'prev' | 'next' | 'today') => {
    const newDate = new Date(currentDate);
    
    switch (direction) {
      case 'prev':
        if (view === 'month') {
          newDate.setMonth(newDate.getMonth() - 1);
        } else if (view === 'week') {
          newDate.setDate(newDate.getDate() - 7);
        } else if (view === 'day') {
          newDate.setDate(newDate.getDate() - 1);
        }
        break;
      case 'next':
        if (view === 'month') {
          newDate.setMonth(newDate.getMonth() + 1);
        } else if (view === 'week') {
          newDate.setDate(newDate.getDate() + 7);
        } else if (view === 'day') {
          newDate.setDate(newDate.getDate() + 1);
        }
        break;
      case 'today':
        setCurrentDate(new Date());
        return;
    }
    
    setCurrentDate(newDate);
  };

  // Get calendar date range based on view
  const getDateRange = useCallback(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    switch (view) {
      case 'month':
        start.setDate(1);
        end.setMonth(end.getMonth() + 1, 0);
        // Extend to show full weeks
        start.setDate(start.getDate() - start.getDay());
        end.setDate(end.getDate() + (6 - end.getDay()));
        break;
      case 'week':
        start.setDate(start.getDate() - start.getDay());
        end.setDate(start.getDate() + 6);
        break;
      case 'day':
        end.setDate(start.getDate());
        break;
      case 'agenda':
        end.setDate(start.getDate() + 30); // Next 30 days
        break;
    }

    return { start, end };
  }, [currentDate, view]);

  // Generate time slots for availability checking
  const generateTimeSlots = (date: Date): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 8; // 8 AM
    const endHour = 18; // 6 PM
    const slotDuration = 30; // 30 minutes

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, minute, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

        const slotEvents = filteredEvents.filter(event => 
          event.start <= slotStart && event.end > slotStart
        );

        const conflicts = slotEvents.filter(event => 
          event.participants?.some(p => 
            filteredEvents.some(otherEvent => 
              otherEvent.id !== event.id &&
              otherEvent.participants?.some(op => op.id === p.id) &&
              otherEvent.start < slotEnd && 
              otherEvent.end > slotStart
            )
          )
        ).map(event => event.id);

        slots.push({
          start: slotStart,
          end: slotEnd,
          available: slotEvents.length === 0,
          conflicts: conflicts,
          events: slotEvents
        });
      }
    }

    return slots;
  };

  // Conflict detection
  const detectConflicts = (newEvent: Partial<CalendarEvent>): string[] => {
    if (!newEvent.start || !newEvent.end || !newEvent.participants) {
      return [];
    }

    const conflicts: string[] = [];

    filteredEvents.forEach(existingEvent => {
      // Time overlap check
      if (existingEvent.start < newEvent.end! && existingEvent.end > newEvent.start!) {
        // Participant conflict check
        const hasParticipantConflict = newEvent.participants!.some(newParticipant =>
          existingEvent.participants?.some(existingParticipant =>
            existingParticipant.id === newParticipant.id
          )
        );

        if (hasParticipantConflict) {
          conflicts.push(`Participant conflict with "${existingEvent.title}" at ${existingEvent.start.toLocaleTimeString()}`);
        }

        // Teacher conflict check
        if (existingEvent.teacherId === newEvent.teacherId) {
          conflicts.push(`Teacher conflict with "${existingEvent.title}" at ${existingEvent.start.toLocaleTimeString()}`);
        }
      }
    });

    return conflicts;
  };

  // Handle event drag and drop
  const handleEventDrop = async (event: CalendarEvent, newStart: Date) => {
    if (!onEventUpdate) return;

    const duration = event.end.getTime() - event.start.getTime();
    const newEnd = new Date(newStart.getTime() + duration);

    const conflicts = detectConflicts({
      ...event,
      start: newStart,
      end: newEnd
    });

    if (conflicts.length > 0) {
      addNotification({
        type: 'warning',
        title: 'Scheduling Conflict',
        message: `Cannot move session: ${conflicts[0]}`
      });
      return;
    }

    try {
      setLoading(true);
      await onEventUpdate(event.id, { start: newStart, end: newEnd });
      
      addNotification({
        type: 'success',
        title: 'Session Moved',
        message: `"${event.title}" has been moved to ${newStart.toLocaleString()}`
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Move Failed',
        message: 'Failed to move the session. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle time slot click for creating new events
  const handleSlotClick = (start: Date, end: Date) => {
    setCreateSlot({ start, end });
    setShowCreateWizard(true);
  };

  // Event status styling
  const getEventStyle = (event: CalendarEvent) => {
    const baseStyle = "text-xs px-2 py-1 rounded text-white cursor-pointer hover:opacity-80 transition-opacity";
    
    switch (event.status) {
      case 'live':
        return `${baseStyle} bg-red-500 animate-pulse`;
      case 'scheduled':
        return `${baseStyle} bg-blue-500`;
      case 'completed':
        return `${baseStyle} bg-green-500`;
      case 'cancelled':
        return `${baseStyle} bg-gray-500`;
      case 'draft':
        return `${baseStyle} bg-yellow-500`;
      default:
        return `${baseStyle} bg-gray-400`;
    }
  };

  // Format date range for display
  const formatDateRange = () => {
    const { start, end } = getDateRange();
    
    switch (view) {
      case 'month':
        return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      case 'week':
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'day':
        return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      case 'agenda':
        return 'Agenda View - Next 30 Days';
      default:
        return '';
    }
  };

  // Render month view
  const renderMonthView = () => {
    const { start, end } = getDateRange();
    const weeks = [];
    const current = new Date(start);

    while (current <= end) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(current);
        const dayEvents = filteredEvents.filter(event => {
          const eventDate = new Date(event.start);
          return eventDate.toDateString() === date.toDateString();
        });

        week.push(
          <div
            key={date.toISOString()}
            className={`min-h-24 p-1 border border-gray-200 cursor-pointer hover:bg-gray-50 ${
              date.getMonth() !== currentDate.getMonth() ? 'bg-gray-50 text-gray-400' : ''
            } ${
              date.toDateString() === new Date().toDateString() ? 'bg-blue-50' : ''
            }`}
            onClick={() => handleSlotClick(
              new Date(date.setHours(9, 0, 0, 0)),
              new Date(date.setHours(10, 0, 0, 0))
            )}
          >
            <div className="font-medium text-sm mb-1">{date.getDate()}</div>
            <div className="space-y-1">
              {dayEvents.slice(0, 2).map(event => (
                <div
                  key={event.id}
                  className={getEventStyle(event)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                  draggable
                  onDragStart={() => setDraggedEvent(event)}
                >
                  {event.title}
                </div>
              ))}
              {dayEvents.length > 2 && (
                <div className="text-xs text-gray-500">
                  +{dayEvents.length - 2} more
                </div>
              )}
            </div>
          </div>
        );
        current.setDate(current.getDate() + 1);
      }
      weeks.push(
        <div key={weeks.length} className="grid grid-cols-7">
          {week}
        </div>
      );
    }

    return (
      <div className="space-y-0">
        {/* Week day headers */}
        <div className="grid grid-cols-7 bg-gray-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center font-medium text-gray-700 border border-gray-200">
              {day}
            </div>
          ))}
        </div>
        {weeks}
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const { start } = getDateRange();
    const days = [];
    const current = new Date(start);

    for (let i = 0; i < 7; i++) {
      const date = new Date(current);
      const dayEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.start);
        return eventDate.toDateString() === date.toDateString();
      });

      days.push(
        <div key={date.toISOString()} className="flex-1 border border-gray-200">
          <div className="p-2 bg-gray-50 text-center font-medium">
            <div>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
            <div className={`text-lg ${date.toDateString() === new Date().toDateString() ? 'text-blue-600 font-bold' : ''}`}>
              {date.getDate()}
            </div>
          </div>
          <div className="min-h-96 p-2 space-y-1">
            {generateTimeSlots(date).map((slot, index) => (
              <div
                key={index}
                className={`text-xs p-1 border rounded cursor-pointer hover:bg-gray-50 ${
                  !slot.available ? 'bg-red-50' : 'bg-white'
                } ${
                  slot.conflicts.length > 0 ? 'border-red-300' : 'border-gray-200'
                }`}
                onClick={() => slot.available && handleSlotClick(slot.start, slot.end)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedEvent && slot.available) {
                    handleEventDrop(draggedEvent, slot.start);
                    setDraggedEvent(null);
                  }
                }}
              >
                {slot.events.map(event => (
                  <div
                    key={event.id}
                    className={getEventStyle(event)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                  >
                    {event.title}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
      current.setDate(current.getDate() + 1);
    }

    return <div className="flex">{days}</div>;
  };

  // Render day view
  const renderDayView = () => {
    const timeSlots = generateTimeSlots(currentDate);
    
    return (
      <div className="space-y-1">
        <div className="text-center p-4 bg-gray-50 font-medium">
          {currentDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          })}
        </div>
        <div className="grid grid-cols-1 max-h-96 overflow-y-auto">
          {timeSlots.map((slot, index) => (
            <div
              key={index}
              className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                !slot.available ? 'bg-red-50' : 'bg-white'
              } ${
                slot.conflicts.length > 0 ? 'border-red-300' : ''
              }`}
              onClick={() => slot.available && handleSlotClick(slot.start, slot.end)}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-600">
                  {slot.start.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </div>
                <div className="flex-1 ml-4">
                  {slot.events.map(event => (
                    <div
                      key={event.id}
                      className={`${getEventStyle(event)} mb-1 flex items-center justify-between`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                    >
                      <span>{event.title}</span>
                      {event.participants && event.participants.length > 0 && (
                        <div className="flex -space-x-1 ml-2">
                          {event.participants.slice(0, 3).map(participant => (
                            <Avatar key={participant.id} className="h-4 w-4 border border-white">
                              <AvatarImage src={participant.avatar} />
                              <AvatarFallback className="text-xs">
                                {participant.firstName[0]}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {slot.conflicts.length > 0 && (
                    <div className="text-xs text-red-600 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Conflicts detected
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render agenda view
  const renderAgendaView = () => {
    const { start, end } = getDateRange();
    const upcomingEvents = filteredEvents
      .filter(event => event.start >= start && event.start <= end)
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    return (
      <div className="space-y-4">
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No upcoming events in the next 30 days</p>
          </div>
        ) : (
          upcomingEvents.map(event => (
            <Card key={event.id} className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onEventClick(event)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge 
                        variant={event.status === 'live' ? 'destructive' : 'default'}
                        className={event.status === 'live' ? 'animate-pulse' : ''}
                      >
                        {event.status}
                      </Badge>
                      <h3 className="font-medium">{event.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {event.start.toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {event.start.toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })} - {event.end.toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </div>
                      {event.participants && (
                        <div className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {event.participants.length} participants
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {event.participants && event.participants.length > 0 && (
                      <div className="flex -space-x-2">
                        {event.participants.slice(0, 3).map(participant => (
                          <Avatar key={participant.id} className="h-6 w-6 border-2 border-white">
                            <AvatarImage src={participant.avatar} />
                            <AvatarFallback className="text-xs">
                              {participant.firstName[0]}{participant.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onEventClick(event)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {event.status === 'scheduled' && (
                          <DropdownMenuItem>
                            <Play className="h-4 w-4 mr-2" />
                            Start Session
                          </DropdownMenuItem>
                        )}
                        {event.status === 'live' && (
                          <DropdownMenuItem>
                            <Activity className="h-4 w-4 mr-2" />
                            Monitor Live
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  };

  const renderCurrentView = () => {
    switch (view) {
      case 'month':
        return renderMonthView();
      case 'week':
        return renderWeekView();
      case 'day':
        return renderDayView();
      case 'agenda':
        return renderAgendaView();
      default:
        return renderMonthView();
    }
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateDate('today')}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-xl font-semibold">{formatDateRange()}</h2>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Toggle */}
          <div className="flex items-center border rounded-lg">
            {(['month', 'week', 'day', 'agenda'] as CalendarView[]).map(viewType => (
              <Button
                key={viewType}
                variant={view === viewType ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none first:rounded-l-lg last:rounded-r-lg"
                onClick={() => setView(viewType)}
              >
                {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
              </Button>
            ))}
          </div>

          {/* Filters */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <div className="p-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.showCompleted}
                    onChange={(e) => setFilters(prev => ({ ...prev, showCompleted: e.target.checked }))}
                  />
                  <label className="text-sm">Show completed sessions</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.showDrafts}
                    onChange={(e) => setFilters(prev => ({ ...prev, showDrafts: e.target.checked }))}
                  />
                  <label className="text-sm">Show draft sessions</label>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => setShowCreateWizard(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>

          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Calendar Content */}
      <Card>
        <CardContent className="p-0">
          {renderCurrentView()}
        </CardContent>
      </Card>

      {/* Session Creation Wizard */}
      <SessionCreationWizard 
        isOpen={showCreateWizard}
        onClose={() => {
          setShowCreateWizard(false);
          setCreateSlot(null);
        }}
      />

      {/* Event Details Dialog */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedEvent.title}</DialogTitle>
              <DialogDescription>
                {selectedEvent.start.toLocaleString()} - {selectedEvent.end.toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-gray-600">{selectedEvent.description}</p>
              </div>
              
              {selectedEvent.participants && selectedEvent.participants.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Participants ({selectedEvent.participants.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.participants.map(participant => (
                      <div key={participant.id} className="flex items-center space-x-2 bg-gray-100 px-2 py-1 rounded">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={participant.avatar} />
                          <AvatarFallback className="text-xs">
                            {participant.firstName[0]}{participant.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{participant.firstName} {participant.lastName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedEvent.conflicts && selectedEvent.conflicts.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-1">Scheduling Conflicts:</div>
                    <ul className="list-disc list-inside text-sm">
                      {selectedEvent.conflicts.map((conflict, index) => (
                        <li key={index}>{conflict}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
