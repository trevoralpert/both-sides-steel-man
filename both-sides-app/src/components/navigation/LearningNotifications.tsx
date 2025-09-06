/**
 * Learning Notifications System
 * 
 * Task 7.5.3: Notification and reminder system for learning activities,
 * reflection deadlines, and feedback alerts.
 */

'use client';

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  Trophy, 
  MessageSquare,
  Target,
  AlertTriangle,
  X,
  Settings,
  Filter,
  MailOpen as MarkAsUnread
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { useLearningNavigation } from './LearningNavigationProvider';

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const { 
    notifications, 
    unreadCount, 
    markNotificationRead, 
    clearAllNotifications 
  } = useLearningNavigation();
  
  const [showSettings, setShowSettings] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'high'>('all');

  const filteredNotifications = notifications.filter(notification => {
    switch (filterType) {
      case 'unread':
        return !notification.read;
      case 'high':
        return notification.priority === 'high';
      default:
        return true;
    }
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reflection_due': return <Clock className="h-4 w-4" />;
      case 'feedback_received': return <MessageSquare className="h-4 w-4" />;
      case 'milestone_achieved': return <Trophy className="h-4 w-4" />;
      case 'assessment_ready': return <Target className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="outline" size="sm" className={cn("relative", className)}>
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllNotifications}
              >
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b">
          {[
            { key: 'all', label: 'All', count: notifications.length },
            { key: 'unread', label: 'Unread', count: unreadCount },
            { key: 'high', label: 'Priority', count: notifications.filter(n => n.priority === 'high').length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key as any)}
              className={cn(
                "flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors",
                filterType === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        <ScrollArea className="h-96">
          <div className="p-2">
            {filteredNotifications.length > 0 ? (
              <div className="space-y-1">
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={() => markNotificationRead(notification.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {filterType === 'all' 
                    ? 'No notifications yet'
                    : `No ${filterType} notifications`
                  }
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Settings Modal */}
        {showSettings && (
          <NotificationSettings onClose={() => setShowSettings(false)} />
        )}
      </PopoverContent>
    </Popover>
  );
}

interface NotificationItemProps {
  notification: any;
  onMarkRead: () => void;
}

function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.read) {
      onMarkRead();
    }
    if (notification.actionUrl) {
      window.location.assign(notification.actionUrl);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reflection_due': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'feedback_received': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'milestone_achieved': return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'assessment_ready': return <Target className="h-4 w-4 text-green-500" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div
      className={cn(
        "p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent",
        !notification.read && "bg-blue-50 border border-blue-200"
      )}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className={cn(
              "text-sm font-medium truncate",
              !notification.read && "font-semibold"
            )}>
              {notification.title}
            </p>
            {!notification.read && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
            </p>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                notification.priority === 'high' && "border-red-200 text-red-600",
                notification.priority === 'medium' && "border-yellow-200 text-yellow-600",
                notification.priority === 'low' && "border-blue-200 text-blue-600"
              )}
            >
              {notification.priority}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    reflectionReminders: true,
    feedbackAlerts: true,
    achievementNotifications: true,
    weeklyDigest: true
  });

  const handleSave = () => {
    // In a real app, save to API
    console.log('Saving notification settings:', settings);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notification Settings</DialogTitle>
          <DialogDescription>
            Customize how you receive learning notifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Delivery Methods</h4>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings(prev => ({
                    ...prev, emailNotifications: e.target.checked
                  }))}
                />
                <span className="text-sm">Email notifications</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={(e) => setSettings(prev => ({
                    ...prev, pushNotifications: e.target.checked
                  }))}
                />
                <span className="text-sm">Push notifications</span>
              </label>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium">Notification Types</h4>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.reflectionReminders}
                  onChange={(e) => setSettings(prev => ({
                    ...prev, reflectionReminders: e.target.checked
                  }))}
                />
                <span className="text-sm">Reflection reminders</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.feedbackAlerts}
                  onChange={(e) => setSettings(prev => ({
                    ...prev, feedbackAlerts: e.target.checked
                  }))}
                />
                <span className="text-sm">Teacher feedback alerts</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.achievementNotifications}
                  onChange={(e) => setSettings(prev => ({
                    ...prev, achievementNotifications: e.target.checked
                  }))}
                />
                <span className="text-sm">Achievement notifications</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.weeklyDigest}
                  onChange={(e) => setSettings(prev => ({
                    ...prev, weeklyDigest: e.target.checked
                  }))}
                />
                <span className="text-sm">Weekly progress digest</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LearningNotificationToast({ 
  type, 
  title, 
  message, 
  actionUrl,
  onDismiss 
}: {
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  onDismiss: () => void;
}) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reflection_due': return <Clock className="h-5 w-5 text-orange-500" />;
      case 'feedback_received': return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'milestone_achieved': return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 'assessment_ready': return <Target className="h-5 w-5 text-green-500" />;
      default: return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getNotificationIcon(type)}
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-gray-900">{title}</p>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500"
              onClick={onDismiss}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        {actionUrl && (
          <div className="mt-3 flex space-x-2">
            <Button 
              size="sm" 
              onClick={() => window.location.assign(actionUrl)}
            >
              View
            </Button>
            <Button variant="outline" size="sm" onClick={onDismiss}>
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
