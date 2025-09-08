/**
 * Recording Sharing System Component
 * 
 * Task 8.4.3: Secure recording sharing with selective access, privacy controls,
 * excerpt creation, and comprehensive access management for educational collaboration
 */

'use client';

import React, { useState, useEffect } from 'react';

import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Share2,
  Link,
  Users,
  Shield,
  Eye,
  EyeOff,
  Download,
  Copy,
  ExternalLink,
  Calendar,
  Clock,
  Settings,
  Edit,
  Trash2,
  Plus,
  Minus,
  Play,
  Scissors,
  Filter,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Lock,
  Unlock,
  Globe,
  Mail,
  MessageSquare,
  Phone,
  FileText,
  Image,
  Video,
  Headphones,
  Bookmark,
  Tag,
  Star,
  Flag,
  MoreHorizontal,
  UserCheck,
  UserX,
  UserPlus,
  Archive,
  Activity,
  BarChart3,
  TrendingUp,
  Zap,
  Target,
  Award,
  Lightbulb
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Types
interface SharableRecording {
  id: string;
  sessionTitle: string;
  recordingDate: Date;
  duration: number;
  format: 'video' | 'audio' | 'transcript';
  quality: string;
  size: number;
  privacy: 'public' | 'unlisted' | 'restricted' | 'private';
  shares: RecordingShare[];
  excerpts: RecordingExcerpt[];
  analytics: SharingAnalytics;
  owner: string;
  createdAt: Date;
}

interface RecordingShare {
  id: string;
  recordingId: string;
  shareType: 'link' | 'direct' | 'embed' | 'download';
  sharedWith: ShareRecipient[];
  accessLevel: 'view_only' | 'limited_download' | 'full_access' | 'admin';
  expiryDate?: Date;
  passwordProtected: boolean;
  password?: string;
  allowComments: boolean;
  shareUrl: string;
  createdBy: string;
  createdAt: Date;
  accessCount: number;
  status: 'active' | 'expired' | 'revoked';
}

interface ShareRecipient {
  type: 'user' | 'email' | 'role' | 'public';
  identifier: string;
  name?: string;
  hasAccessed: boolean;
  accessCount: number;
}

interface RecordingExcerpt {
  id: string;
  recordingId: string;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  duration: number;
  purpose: 'highlight' | 'example' | 'assessment' | 'training' | 'showcase' | 'analysis';
  tags: string[];
  createdBy: string;
  createdAt: Date;
  isPublic: boolean;
}

interface SharingAnalytics {
  totalShares: number;
  totalViews: number;
  uniqueViewers: number;
  avgViewingTime: number;
  completionRate: number;
  engagementScore: number;
}

interface RecordingSharingProps {
  recordingId: string;
  sessionTitle: string;
  onShareCreate?: (share: RecordingShare) => void;
  onExcerptCreate?: (excerpt: RecordingExcerpt) => void;
  onAccessRevoke?: (shareId: string) => void;
}

export function RecordingSharing({
  recordingId,
  sessionTitle,
  onShareCreate,
  onExcerptCreate,
  onAccessRevoke
}: RecordingSharingProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [recording, setRecording] = useState<SharableRecording | null>(null);
  
  // Share Creation State
  const [showCreateShareDialog, setShowCreateShareDialog] = useState(false);
  const [shareRecipients, setShareRecipients] = useState<string[]>([]);
  const [shareAccessLevel, setShareAccessLevel] = useState<'view_only' | 'limited_download' | 'full_access' | 'admin'>('view_only');
  const [shareExpiryDays, setShareExpiryDays] = useState(30);
  const [sharePassword, setSharePassword] = useState('');
  const [sharePasswordEnabled, setSharePasswordEnabled] = useState(false);
  const [shareComments, setShareComments] = useState(true);
  
  // Excerpt Creation State
  const [showCreateExcerptDialog, setShowCreateExcerptDialog] = useState(false);
  const [excerptTitle, setExcerptTitle] = useState('');
  const [excerptDescription, setExcerptDescription] = useState('');
  const [excerptStartTime, setExcerptStartTime] = useState(0);
  const [excerptEndTime, setExcerptEndTime] = useState(60);
  const [excerptPurpose, setExcerptPurpose] = useState<'highlight' | 'example' | 'assessment' | 'training' | 'showcase' | 'analysis'>('highlight');
  const [excerptTags, setExcerptTags] = useState<string[]>([]);
  const [excerptPublic, setExcerptPublic] = useState(false);
  
  // Dialogs
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [revokeShareId, setRevokeShareId] = useState<string | null>(null);

  useEffect(() => {
    loadRecordingData();
  }, [recordingId]);

  const loadRecordingData = () => {
    // Mock recording data
    const mockRecording: SharableRecording = {
      id: recordingId,
      sessionTitle,
      recordingDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      duration: 3600,
      format: 'video',
      quality: '1080p',
      size: 2500,
      privacy: 'restricted',
      shares: [
        {
          id: 'share_1',
          recordingId,
          shareType: 'link',
          sharedWith: [
            { type: 'email', identifier: 'principal@school.edu', name: 'Principal Johnson', hasAccessed: true, accessCount: 3 },
            { type: 'email', identifier: 'parent@example.com', name: 'Alice Parent', hasAccessed: false, accessCount: 0 }
          ],
          accessLevel: 'view_only',
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          passwordProtected: false,
          allowComments: true,
          shareUrl: `${window.location.origin}/shared/recording/${recordingId}?token=abc123`,
          createdBy: user?.id || 'teacher',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          accessCount: 5,
          status: 'active'
        }
      ],
      excerpts: [
        {
          id: 'excerpt_1',
          recordingId,
          title: 'Outstanding Evidence Presentation',
          description: 'Alice demonstrates exemplary research skills and source citation',
          startTime: 305,
          endTime: 425,
          duration: 120,
          purpose: 'showcase',
          tags: ['evidence', 'research_skills', 'exemplary'],
          createdBy: user?.id || 'teacher',
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
          isPublic: false
        }
      ],
      analytics: {
        totalShares: 2,
        totalViews: 17,
        uniqueViewers: 9,
        avgViewingTime: 1240,
        completionRate: 68,
        engagementScore: 84
      },
      owner: user?.id || 'teacher',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    };

    setRecording(mockRecording);
  };

  const createShare = async () => {
    if (!recording || shareRecipients.length === 0) {
      addNotification({
        type: 'error',
        title: 'Missing Information',
        message: 'Please add at least one recipient.',
        read: false
      });
      return;
    }

    const newShare: RecordingShare = {
      id: `share_${Date.now()}`,
      recordingId,
      shareType: 'link',
      sharedWith: shareRecipients.map(email => ({
        type: 'email' as const,
        identifier: email,
        hasAccessed: false,
        accessCount: 0
      })),
      accessLevel: shareAccessLevel,
      expiryDate: new Date(Date.now() + shareExpiryDays * 24 * 60 * 60 * 1000),
      passwordProtected: sharePasswordEnabled,
      password: sharePasswordEnabled ? sharePassword : undefined,
      allowComments: shareComments,
      shareUrl: `${window.location.origin}/shared/recording/${recordingId}?token=${Math.random().toString(36).substr(2, 9)}`,
      createdBy: user?.id || 'teacher',
      createdAt: new Date(),
      accessCount: 0,
      status: 'active'
    };

    setRecording(prev => prev ? {
      ...prev,
      shares: [...prev.shares, newShare]
    } : prev);

    onShareCreate?.(newShare);

    // Reset form
    setShareRecipients([]);
    setSharePassword('');
    setSharePasswordEnabled(false);
    setShowCreateShareDialog(false);

    addNotification({
      type: 'success',
      title: 'Share Created',
      message: `Recording shared with ${shareRecipients.length} recipients.`,
      read: false
    });
  };

  const createExcerpt = async () => {
    if (!recording || !excerptTitle.trim()) {
      addNotification({
        type: 'error',
        title: 'Missing Information',
        message: 'Please provide a title for the excerpt.',
        read: false
      });
      return;
    }

    const newExcerpt: RecordingExcerpt = {
      id: `excerpt_${Date.now()}`,
      recordingId,
      title: excerptTitle,
      description: excerptDescription,
      startTime: excerptStartTime,
      endTime: excerptEndTime,
      duration: excerptEndTime - excerptStartTime,
      purpose: excerptPurpose,
      tags: excerptTags,
      createdBy: user?.id || 'teacher',
      createdAt: new Date(),
      isPublic: excerptPublic
    };

    setRecording(prev => prev ? {
      ...prev,
      excerpts: [...prev.excerpts, newExcerpt]
    } : prev);

    onExcerptCreate?.(newExcerpt);

    // Reset form
    setExcerptTitle('');
    setExcerptDescription('');
    setExcerptTags([]);
    setShowCreateExcerptDialog(false);

    addNotification({
      type: 'success',
      title: 'Excerpt Created',
      message: `"${excerptTitle}" excerpt has been created.`,
      read: false
    });
  };

  const revokeShare = (shareId: string) => {
    if (!recording) return;

    setRecording(prev => prev ? {
      ...prev,
      shares: prev.shares.map(share => 
        share.id === shareId ? { ...share, status: 'revoked' as const } : share
      )
    } : prev);

    onAccessRevoke?.(shareId);
    setShowRevokeDialog(false);
    setRevokeShareId(null);

    addNotification({
      type: 'success',
      title: 'Access Revoked',
      message: 'Share access has been revoked.',
      read: false
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addNotification({
      type: 'success',
      title: 'Copied to Clipboard',
      message: `${label} copied successfully.`,
      read: false
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (mb: number) => {
    if (mb < 1024) return `${Math.round(mb)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  if (!recording) {
    return <div>Loading recording data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Share2 className="h-5 w-5 mr-2" />
            Recording Sharing
          </h3>
          <p className="text-sm text-muted-foreground">
            {recording.sessionTitle} • {formatDuration(recording.duration)} • {formatFileSize(recording.size)}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Sharing Stats */}
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{recording.analytics.totalShares}</div>
              <div className="text-xs text-muted-foreground">Shares</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{recording.analytics.totalViews}</div>
              <div className="text-xs text-muted-foreground">Views</div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            <Button onClick={() => setShowCreateExcerptDialog(true)}>
              <Scissors className="h-4 w-4 mr-2" />
              Create Excerpt
            </Button>
            <Button onClick={() => setShowCreateShareDialog(true)}>
              <Share2 className="h-4 w-4 mr-2" />
              Share Recording
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="shares">Active Shares ({recording.shares.length})</TabsTrigger>
          <TabsTrigger value="excerpts">Excerpts ({recording.excerpts.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Recording Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Video className="h-5 w-5 mr-2" />
                Recording Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="font-medium">Privacy Level</div>
                  <Badge variant="outline">{recording.privacy}</Badge>
                </div>
                <div>
                  <div className="font-medium">Format & Quality</div>
                  <div className="text-sm text-muted-foreground">{recording.format} • {recording.quality}</div>
                </div>
                <div>
                  <div className="font-medium">File Size</div>
                  <div className="text-sm text-muted-foreground">{formatFileSize(recording.size)}</div>
                </div>
                <div>
                  <div className="font-medium">Created</div>
                  <div className="text-sm text-muted-foreground">{recording.recordingDate.toLocaleDateString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="cursor-pointer hover:shadow-md" onClick={() => setShowCreateShareDialog(true)}>
              <CardContent className="flex items-center p-6">
                <Share2 className="h-8 w-8 text-blue-600 mr-4" />
                <div>
                  <div className="font-semibold">Share Recording</div>
                  <div className="text-sm text-muted-foreground">Create secure sharing links</div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md" onClick={() => setShowCreateExcerptDialog(true)}>
              <CardContent className="flex items-center p-6">
                <Scissors className="h-8 w-8 text-purple-600 mr-4" />
                <div>
                  <div className="font-semibold">Create Excerpt</div>
                  <div className="text-sm text-muted-foreground">Extract key moments</div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md">
              <CardContent className="flex items-center p-6">
                <BarChart3 className="h-8 w-8 text-green-600 mr-4" />
                <div>
                  <div className="font-semibold">View Analytics</div>
                  <div className="text-sm text-muted-foreground">Track engagement metrics</div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md">
              <CardContent className="flex items-center p-6">
                <Settings className="h-8 w-8 text-orange-600 mr-4" />
                <div>
                  <div className="font-semibold">Manage Access</div>
                  <div className="text-sm text-muted-foreground">Control permissions</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="shares" className="space-y-4">
          {/* Shares List */}
          <div className="space-y-4">
            {recording.shares.map((share) => (
              <Card key={share.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{share.accessLevel}</Badge>
                        <Badge variant="default">{share.status}</Badge>
                        {share.passwordProtected && (
                          <Badge variant="outline">
                            <Lock className="h-3 w-3 mr-1" />
                            Password Protected
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Created {share.createdAt.toLocaleDateString()} • {share.accessCount} accesses
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => copyToClipboard(share.shareUrl, 'Share link')}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => {
                            setRevokeShareId(share.id);
                            setShowRevokeDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Revoke Access
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="font-medium mb-2">Recipients ({share.sharedWith.length})</div>
                      <div className="space-y-2">
                        {share.sharedWith.map((recipient, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Mail className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{recipient.name || recipient.identifier}</div>
                                <div className="text-sm text-muted-foreground">{recipient.accessCount} views</div>
                              </div>
                            </div>
                            <Badge variant={recipient.hasAccessed ? "default" : "outline"}>
                              {recipient.hasAccessed ? 'Accessed' : 'Pending'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="excerpts" className="space-y-4">
          {/* Excerpts List */}
          <div className="space-y-4">
            {recording.excerpts.map((excerpt) => (
              <Card key={excerpt.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h4 className="font-semibold">{excerpt.title}</h4>
                      <div className="text-sm text-muted-foreground">
                        {formatDuration(excerpt.startTime)} - {formatDuration(excerpt.endTime)} • 
                        {formatDuration(excerpt.duration)} duration
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {excerpt.description && <p className="text-sm">{excerpt.description}</p>}
                    
                    {excerpt.tags.length > 0 && (
                      <div>
                        <div className="font-medium text-sm mb-1">Tags</div>
                        <div className="flex flex-wrap gap-1">
                          {excerpt.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">#{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* Analytics Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Eye className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Views</p>
                    <div className="text-2xl font-bold">{recording.analytics.totalViews}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Unique Viewers</p>
                    <div className="text-2xl font-bold">{recording.analytics.uniqueViewers}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Avg Viewing Time</p>
                    <div className="text-2xl font-bold">{formatDuration(recording.analytics.avgViewingTime)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Engagement Score</p>
                    <div className="text-2xl font-bold">{recording.analytics.engagementScore}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Share Dialog */}
      <Dialog open={showCreateShareDialog} onOpenChange={setShowCreateShareDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Share Recording</DialogTitle>
            <DialogDescription>
              Create secure sharing links for your recording with customizable permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Recipients</Label>
              <Textarea
                placeholder="Enter email addresses (one per line)"
                value={shareRecipients.join('\n')}
                onChange={(e) => setShareRecipients(e.target.value.split('\n').filter(Boolean))}
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Access Level</Label>
                <Select value={shareAccessLevel} onValueChange={(value: any) => setShareAccessLevel(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view_only">View Only</SelectItem>
                    <SelectItem value="limited_download">Limited Download</SelectItem>
                    <SelectItem value="full_access">Full Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expires In (Days)</Label>
                <Select value={shareExpiryDays.toString()} onValueChange={(value) => setShareExpiryDays(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Password Protection</Label>
                <Switch checked={sharePasswordEnabled} onCheckedChange={setSharePasswordEnabled} />
              </div>
              {sharePasswordEnabled && (
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                />
              )}

              <div className="flex items-center justify-between">
                <Label>Allow Comments</Label>
                <Switch checked={shareComments} onCheckedChange={setShareComments} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateShareDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createShare} disabled={shareRecipients.length === 0}>
              <Share2 className="h-4 w-4 mr-2" />
              Create Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Excerpt Dialog */}
      <Dialog open={showCreateExcerptDialog} onOpenChange={setShowCreateExcerptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Excerpt</DialogTitle>
            <DialogDescription>
              Extract a specific segment from your recording to highlight key moments
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Enter excerpt title"
                value={excerptTitle}
                onChange={(e) => setExcerptTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Describe what makes this moment important"
                value={excerptDescription}
                onChange={(e) => setExcerptDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Time (seconds)</Label>
                <Input
                  type="number"
                  min="0"
                  max={recording.duration}
                  value={excerptStartTime}
                  onChange={(e) => setExcerptStartTime(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time (seconds)</Label>
                <Input
                  type="number"
                  min="0"
                  max={recording.duration}
                  value={excerptEndTime}
                  onChange={(e) => setExcerptEndTime(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Purpose</Label>
              <Select value={excerptPurpose} onValueChange={(value: any) => setExcerptPurpose(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="highlight">Highlight</SelectItem>
                  <SelectItem value="example">Example</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="showcase">Showcase</SelectItem>
                  <SelectItem value="analysis">Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Make Public</Label>
              <Switch checked={excerptPublic} onCheckedChange={setExcerptPublic} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateExcerptDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createExcerpt} disabled={!excerptTitle.trim()}>
              <Scissors className="h-4 w-4 mr-2" />
              Create Excerpt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Access Dialog */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Access</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately revoke access to the recording for all recipients. 
              Existing share links will become invalid.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => revokeShareId && revokeShare(revokeShareId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
