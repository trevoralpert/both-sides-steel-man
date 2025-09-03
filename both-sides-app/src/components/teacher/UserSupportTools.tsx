/**
 * User Support Tools Component
 * 
 * Task 8.5.1: Advanced user support with impersonation capabilities,
 * account recovery tools, and comprehensive feedback collection system
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  HelpCircle,
  UserCog,
  Shield,
  MessageSquare,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  Key,
  Lock,
  Unlock,
  Mail,
  Phone,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Star,
  ThumbsUp,
  ThumbsDown,
  Users,
  User,
  FileText,
  Send,
  Archive,
  Trash2,
  Edit,
  Copy,
  ExternalLink,
  LogIn,
  LogOut,
  RotateCcw,
  Zap,
  Activity,
  Target,
  Award,
  Bell,
  Flag,
  Heart,
  Lightbulb,
  Bookmark,
  Share2,
  MoreHorizontal
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
  assignedTo: string;
  tags: string[];
  attachments: FileAttachment[];
  conversation: TicketMessage[];
  satisfactionRating?: number;
  satisfactionFeedback?: string;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  escalatedAt?: Date;
  firstResponseTime?: number; // minutes
  resolutionTime?: number; // minutes
}

type TicketCategory = 'technical' | 'account' | 'billing' | 'content' | 'accessibility' | 'feature_request' | 'bug_report' | 'training' | 'other';

interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'support' | 'admin';
  content: string;
  attachments: FileAttachment[];
  timestamp: Date;
  isInternal: boolean;
}

interface FileAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
}

interface UserImpersonation {
  id: string;
  impersonatedUserId: string;
  impersonatedUserName: string;
  impersonatedUserEmail: string;
  impersonatorId: string;
  impersonatorName: string;
  reason: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // minutes
  actionsPerformed: ImpersonationAction[];
  auditLog: AuditLogEntry[];
  status: 'active' | 'ended' | 'terminated';
}

interface ImpersonationAction {
  action: string;
  timestamp: Date;
  details: string;
  ipAddress: string;
  userAgent: string;
}

interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface AccountRecovery {
  id: string;
  userId: string;
  userEmail: string;
  recoveryType: 'password_reset' | 'account_unlock' | 'email_verification' | 'phone_verification' | 'security_questions';
  status: 'initiated' | 'in_progress' | 'completed' | 'failed' | 'expired';
  securityChecks: SecurityCheck[];
  recoveryToken: string;
  expiresAt: Date;
  completedAt?: Date;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

interface SecurityCheck {
  type: 'email' | 'phone' | 'security_question' | 'identity_document' | 'manager_approval';
  status: 'pending' | 'verified' | 'failed' | 'skipped';
  attempts: number;
  maxAttempts: number;
  verifiedAt?: Date;
  details?: Record<string, any>;
}

interface FeedbackEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: 'bug_report' | 'feature_request' | 'improvement' | 'compliment' | 'complaint' | 'general';
  title: string;
  description: string;
  category: string;
  rating: number; // 1-5
  tags: string[];
  attachments: FileAttachment[];
  browserInfo: BrowserInfo;
  systemInfo: SystemInfo;
  status: 'new' | 'reviewing' | 'planned' | 'in_development' | 'completed' | 'rejected' | 'duplicate';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  response?: string;
  responseAt?: Date;
  votes: FeedbackVote[];
  visibility: 'private' | 'public' | 'internal';
  createdAt: Date;
  updatedAt: Date;
}

interface BrowserInfo {
  name: string;
  version: string;
  userAgent: string;
  language: string;
  timezone: string;
  screenResolution: string;
  colorDepth: number;
}

interface SystemInfo {
  os: string;
  device: string;
  networkType: string;
  connectionSpeed: string;
  javascriptEnabled: boolean;
  cookiesEnabled: boolean;
  localStorageEnabled: boolean;
}

interface FeedbackVote {
  userId: string;
  vote: 'up' | 'down';
  timestamp: Date;
}

interface UserSupportToolsProps {
  organizationId?: string;
  canImpersonate?: boolean;
  canAccessAccountRecovery?: boolean;
  canViewAllTickets?: boolean;
}

export function UserSupportTools({
  organizationId,
  canImpersonate = false,
  canAccessAccountRecovery = false,
  canViewAllTickets = false
}: UserSupportToolsProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [impersonations, setImpersonations] = useState<UserImpersonation[]>([]);
  const [recoveryRequests, setRecoveryRequests] = useState<AccountRecovery[]>([]);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  
  // Filters and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Dialog States
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [showImpersonationDialog, setShowImpersonationDialog] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Form States
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [impersonationReason, setImpersonationReason] = useState('');
  const [ticketResponse, setTicketResponse] = useState('');

  useEffect(() => {
    loadSupportData();
  }, [organizationId]);

  const loadSupportData = () => {
    // Mock support tickets
    const mockTickets: SupportTicket[] = [
      {
        id: 'ticket_1',
        userId: 'user_1',
        userName: 'Emma Johnson',
        userEmail: 'emma@school.edu',
        title: 'Unable to join debate session',
        description: 'Getting error message when trying to join the debate session scheduled for today',
        category: 'technical',
        priority: 'high',
        status: 'open',
        assignedTo: 'support_1',
        tags: ['session', 'connection', 'urgent'],
        attachments: [],
        conversation: [
          {
            id: 'msg_1',
            senderId: 'user_1',
            senderName: 'Emma Johnson',
            senderRole: 'user',
            content: 'Getting error message when trying to join the debate session scheduled for today',
            attachments: [],
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            isInternal: false
          }
        ],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        firstResponseTime: undefined
      },
      {
        id: 'ticket_2',
        userId: 'user_2',
        userName: 'Marcus Chen',
        userEmail: 'marcus@school.edu',
        title: 'Password reset request',
        description: 'Forgot my password and the reset email is not arriving',
        category: 'account',
        priority: 'medium',
        status: 'in_progress',
        assignedTo: 'support_2',
        tags: ['password', 'email', 'recovery'],
        attachments: [],
        conversation: [
          {
            id: 'msg_2',
            senderId: 'user_2',
            senderName: 'Marcus Chen',
            senderRole: 'user',
            content: 'Forgot my password and the reset email is not arriving',
            attachments: [],
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            isInternal: false
          },
          {
            id: 'msg_3',
            senderId: 'support_2',
            senderName: 'Support Agent',
            senderRole: 'support',
            content: 'I\'ve checked your account and resent the password reset email. Please check your spam folder as well.',
            attachments: [],
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
            isInternal: false
          }
        ],
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        firstResponseTime: 60
      }
    ];

    // Mock impersonation sessions
    const mockImpersonations: UserImpersonation[] = [
      {
        id: 'imp_1',
        impersonatedUserId: 'user_1',
        impersonatedUserName: 'Emma Johnson',
        impersonatedUserEmail: 'emma@school.edu',
        impersonatorId: 'support_1',
        impersonatorName: 'Support Agent',
        reason: 'Debugging session connection issue reported in ticket #123',
        startTime: new Date(Date.now() - 30 * 60 * 1000),
        endTime: new Date(Date.now() - 15 * 60 * 1000),
        duration: 15,
        status: 'ended',
        actionsPerformed: [
          {
            action: 'Login',
            timestamp: new Date(Date.now() - 30 * 60 * 1000),
            details: 'Successfully logged in as user',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          {
            action: 'Join Session',
            timestamp: new Date(Date.now() - 28 * 60 * 1000),
            details: 'Attempted to join debate session "Climate Change Discussion"',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          {
            action: 'Debug Connection',
            timestamp: new Date(Date.now() - 25 * 60 * 1000),
            details: 'Identified firewall blocking WebRTC connection',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        ],
        auditLog: []
      }
    ];

    // Mock feedback entries
    const mockFeedback: FeedbackEntry[] = [
      {
        id: 'feedback_1',
        userId: 'user_1',
        userName: 'Emma Johnson',
        userEmail: 'emma@school.edu',
        type: 'feature_request',
        title: 'Add mobile app support',
        description: 'Would love to participate in debates from my phone during lunch breaks',
        category: 'mobile',
        rating: 4,
        tags: ['mobile', 'accessibility', 'convenience'],
        attachments: [],
        browserInfo: {
          name: 'Chrome',
          version: '120.0.0.0',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          language: 'en-US',
          timezone: 'America/New_York',
          screenResolution: '390x844',
          colorDepth: 24
        },
        systemInfo: {
          os: 'iOS 17.0',
          device: 'iPhone 14',
          networkType: 'WiFi',
          connectionSpeed: '50 Mbps',
          javascriptEnabled: true,
          cookiesEnabled: true,
          localStorageEnabled: true
        },
        status: 'reviewing',
        priority: 'medium',
        votes: [
          { userId: 'user_2', vote: 'up', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
          { userId: 'user_3', vote: 'up', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
        ],
        visibility: 'public',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ];

    setTickets(mockTickets);
    setImpersonations(mockImpersonations);
    setFeedback(mockFeedback);
  };

  const startImpersonation = (userId: string, reason: string) => {
    if (!canImpersonate) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to impersonate users.'
      });
      return;
    }

    const newImpersonation: UserImpersonation = {
      id: `imp_${Date.now()}`,
      impersonatedUserId: userId,
      impersonatedUserName: 'User Name', // Would be fetched
      impersonatedUserEmail: 'user@example.com', // Would be fetched
      impersonatorId: user?.id || 'current_user',
      impersonatorName: user?.firstName || 'Support Agent',
      reason,
      startTime: new Date(),
      status: 'active',
      actionsPerformed: [],
      auditLog: []
    };

    setImpersonations(prev => [...prev, newImpersonation]);
    setShowImpersonationDialog(false);
    setSelectedUser('');
    setImpersonationReason('');

    addNotification({
      type: 'success',
      title: 'Impersonation Started',
      message: `Now impersonating user. Remember to end the session when done.`
    });
  };

  const endImpersonation = (impersonationId: string) => {
    setImpersonations(prev => prev.map(imp => 
      imp.id === impersonationId 
        ? { ...imp, status: 'ended', endTime: new Date(), duration: Math.floor((Date.now() - imp.startTime.getTime()) / 60000) }
        : imp
    ));

    addNotification({
      type: 'info',
      title: 'Impersonation Ended',
      message: 'You have successfully ended the impersonation session.'
    });
  };

  const respondToTicket = (ticketId: string, response: string) => {
    if (!response.trim()) return;

    const newMessage: TicketMessage = {
      id: `msg_${Date.now()}`,
      senderId: user?.id || 'support_user',
      senderName: user?.firstName || 'Support Agent',
      senderRole: 'support',
      content: response,
      attachments: [],
      timestamp: new Date(),
      isInternal: false
    };

    setTickets(prev => prev.map(ticket => 
      ticket.id === ticketId
        ? {
            ...ticket,
            conversation: [...ticket.conversation, newMessage],
            status: 'in_progress',
            updatedAt: new Date(),
            firstResponseTime: ticket.firstResponseTime || Math.floor((Date.now() - ticket.createdAt.getTime()) / 60000)
          }
        : ticket
    ));

    setTicketResponse('');
    addNotification({
      type: 'success',
      title: 'Response Sent',
      message: 'Your response has been sent to the user.'
    });
  };

  const resolveTicket = (ticketId: string, resolution: string) => {
    setTickets(prev => prev.map(ticket => 
      ticket.id === ticketId
        ? {
            ...ticket,
            status: 'resolved',
            resolution,
            resolvedAt: new Date(),
            resolutionTime: Math.floor((Date.now() - ticket.createdAt.getTime()) / 60000)
          }
        : ticket
    ));

    addNotification({
      type: 'success',
      title: 'Ticket Resolved',
      message: 'The support ticket has been marked as resolved.'
    });
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Badge variant="destructive">Urgent</Badge>;
      case 'high': return <Badge className="bg-orange-500">High</Badge>;
      case 'medium': return <Badge className="bg-blue-500">Medium</Badge>;
      case 'low': return <Badge variant="outline">Low</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge variant="destructive">Open</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500">In Progress</Badge>;
      case 'waiting_user': return <Badge className="bg-yellow-500">Waiting for User</Badge>;
      case 'resolved': return <Badge className="bg-green-500">Resolved</Badge>;
      case 'closed': return <Badge variant="outline">Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (searchQuery && !ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !ticket.userName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !ticket.userEmail.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
    if (categoryFilter !== 'all' && ticket.category !== categoryFilter) return false;
    return true;
  });

  const formatTimeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <HelpCircle className="h-5 w-5 mr-2" />
            User Support Tools
          </h3>
          <p className="text-sm text-muted-foreground">
            Advanced user support, impersonation, and account recovery tools
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Summary Stats */}
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{tickets.length}</div>
              <div className="text-xs text-muted-foreground">Total Tickets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{tickets.filter(t => t.status === 'open').length}</div>
              <div className="text-xs text-muted-foreground">Open</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{feedback.length}</div>
              <div className="text-xs text-muted-foreground">Feedback</div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            {canImpersonate && (
              <Button variant="outline" onClick={() => setShowImpersonationDialog(true)}>
                <UserCog className="h-4 w-4 mr-2" />
                Impersonate User
              </Button>
            )}
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tickets">Support Tickets ({tickets.length})</TabsTrigger>
          <TabsTrigger value="impersonation">Impersonation ({impersonations.length})</TabsTrigger>
          <TabsTrigger value="recovery">Account Recovery</TabsTrigger>
          <TabsTrigger value="feedback">Feedback ({feedback.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tickets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button variant="outline" onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setCategoryFilter('all');
                }}>
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tickets List */}
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <Card key={ticket.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold">{ticket.title}</h4>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(ticket.status)}
                          {getPriorityBadge(ticket.priority)}
                          <Badge variant="outline" className="capitalize">{ticket.category}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {ticket.userName}
                        </span>
                        <span className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          {ticket.userEmail}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatTimeAgo(ticket.createdAt)}
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setShowTicketDialog(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{ticket.description}</p>
                  
                  {ticket.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {ticket.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{ticket.conversation.length} messages</span>
                    {ticket.firstResponseTime && (
                      <span>First response: {ticket.firstResponseTime}m</span>
                    )}
                    {ticket.resolutionTime && (
                      <span>Resolved in: {Math.floor(ticket.resolutionTime / 60)}h {ticket.resolutionTime % 60}m</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="impersonation" className="space-y-4">
          {/* Current Impersonations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCog className="h-5 w-5 mr-2" />
                User Impersonation Sessions
              </CardTitle>
              <CardDescription>
                Active and recent user impersonation sessions for support purposes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {impersonations.length > 0 ? (
                <div className="space-y-4">
                  {impersonations.map((impersonation) => (
                    <div key={impersonation.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h5 className="font-medium">{impersonation.impersonatedUserName}</h5>
                            <Badge 
                              variant={impersonation.status === 'active' ? 'destructive' : 'outline'}
                              className={impersonation.status === 'active' ? 'bg-green-500' : ''}
                            >
                              {impersonation.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{impersonation.impersonatedUserEmail}</p>
                          <p className="text-sm text-muted-foreground">
                            <strong>Reason:</strong> {impersonation.reason}
                          </p>
                        </div>
                        
                        {impersonation.status === 'active' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => endImpersonation(impersonation.id)}
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            End Session
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span>Started:</span>
                          <span>{impersonation.startTime.toLocaleString()}</span>
                        </div>
                        {impersonation.endTime && (
                          <div className="flex justify-between">
                            <span>Ended:</span>
                            <span>{impersonation.endTime.toLocaleString()}</span>
                          </div>
                        )}
                        {impersonation.duration && (
                          <div className="flex justify-between">
                            <span>Duration:</span>
                            <span>{impersonation.duration} minutes</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Actions:</span>
                          <span>{impersonation.actionsPerformed.length} actions logged</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserCog className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No impersonation sessions found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recovery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="h-5 w-5 mr-2" />
                Account Recovery
              </CardTitle>
              <CardDescription>
                Manage account recovery requests and security verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Account recovery tools interface would be implemented here</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Features: Password resets, account unlocks, security verification, identity confirmation
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <div className="space-y-4">
            {feedback.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold">{item.title}</h4>
                        <Badge variant="outline" className="capitalize">{item.type.replace('_', ' ')}</Badge>
                        <Badge 
                          variant={item.status === 'new' ? 'destructive' : 'outline'}
                          className={item.status === 'reviewing' ? 'bg-blue-500' : ''}
                        >
                          {item.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {item.userName}
                        </span>
                        <span className="flex items-center">
                          <Star className="h-4 w-4 mr-1" />
                          {item.rating}/5
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatTimeAgo(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                  
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        {item.votes.filter(v => v.vote === 'up').length}
                      </span>
                      <span className="flex items-center">
                        <ThumbsDown className="h-3 w-3 mr-1" />
                        {item.votes.filter(v => v.vote === 'down').length}
                      </span>
                    </div>
                    <span className="capitalize">{item.visibility}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Support Ticket Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Support Ticket Details</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <h4 className="font-semibold">{selectedTicket.title}</h4>
                {getStatusBadge(selectedTicket.status)}
                {getPriorityBadge(selectedTicket.priority)}
              </div>
              
              <div className="border rounded-lg">
                <ScrollArea className="h-64 p-4">
                  <div className="space-y-4">
                    {selectedTicket.conversation.map((message) => (
                      <div key={message.id} className={`flex ${message.senderRole === 'user' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[70%] rounded-lg p-3 ${
                          message.senderRole === 'user' ? 'bg-muted' : 'bg-primary text-primary-foreground'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{message.senderName}</span>
                            <span className="text-xs opacity-70">{formatTimeAgo(message.timestamp)}</span>
                          </div>
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="response">Response</Label>
                <Textarea
                  id="response"
                  placeholder="Type your response..."
                  value={ticketResponse}
                  onChange={(e) => setTicketResponse(e.target.value)}
                  rows={4}
                />
                <div className="flex space-x-2">
                  <Button onClick={() => selectedTicket && respondToTicket(selectedTicket.id, ticketResponse)}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Response
                  </Button>
                  <Button variant="outline" onClick={() => {
                    if (selectedTicket) {
                      resolveTicket(selectedTicket.id, 'Issue resolved by support team');
                      setShowTicketDialog(false);
                    }
                  }}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Resolved
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Impersonation Dialog */}
      <Dialog open={showImpersonationDialog} onOpenChange={setShowImpersonationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Start User Impersonation
            </DialogTitle>
            <DialogDescription>
              This action will be logged and audited. Only use for legitimate support purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>User to Impersonate</Label>
              <Input
                placeholder="Enter user ID or email..."
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason for Impersonation</Label>
              <Textarea
                placeholder="Explain why you need to impersonate this user..."
                value={impersonationReason}
                onChange={(e) => setImpersonationReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImpersonationDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => startImpersonation(selectedUser, impersonationReason)}
              disabled={!selectedUser.trim() || !impersonationReason.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <UserCog className="h-4 w-4 mr-2" />
              Start Impersonation
            </Button>
          </DialogFooter>
        </Dialog>
      </Dialog>
    </div>
  );
}
