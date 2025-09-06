/**
 * Student Communication Center Component
 * 
 * Task 8.2.2: Individual student messaging, parent communication tracking,
 * and achievement celebrations system
 */

'use client';

import React, { useState, useEffect } from 'react';

import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  MessageSquare,
  Send,
  Phone,
  Mail,
  Calendar,
  Award,
  Star,
  Trophy,
  Heart,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Filter,
  Search,
  FileText,
  User,
  Users,
  Zap,
  Target,
  TrendingUp,
  Sparkles
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface CommunicationMessage {
  id: string;
  type: 'student' | 'parent' | 'guardian';
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  content: string;
  timestamp: Date;
  status: 'draft' | 'sent' | 'delivered' | 'read';
  priority: 'low' | 'medium' | 'high';
  thread?: string;
  attachments?: string[];
}

interface StudentAchievement {
  id: string;
  studentId: string;
  studentName: string;
  type: 'academic' | 'behavior' | 'participation' | 'improvement' | 'milestone';
  title: string;
  description: string;
  dateAwarded: Date;
  recognitionLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
  shared: boolean;
  notificationSent: boolean;
  category: string;
  points?: number;
  criteria?: string[];
}

interface CommunicationLog {
  id: string;
  studentId: string;
  contactType: 'email' | 'phone' | 'meeting' | 'note';
  contactPerson: 'student' | 'parent' | 'guardian';
  subject: string;
  summary: string;
  timestamp: Date;
  followUpRequired: boolean;
  followUpDate?: Date;
  outcome: 'positive' | 'neutral' | 'concerning' | 'resolved';
  tags: string[];
}

interface StudentCommunicationCenterProps {
  studentId?: string;
  students?: any[];
  onSendMessage?: (message: CommunicationMessage) => void;
  onAwardAchievement?: (achievement: StudentAchievement) => void;
  onLogCommunication?: (log: CommunicationLog) => void;
}

export function StudentCommunicationCenter({
  studentId,
  students = [],
  onSendMessage,
  onAwardAchievement,
  onLogCommunication
}: StudentCommunicationCenterProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('messages');
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [achievements, setAchievements] = useState<StudentAchievement[]>([]);
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Message composition state
  const [isComposingMessage, setIsComposingMessage] = useState(false);
  const [messageForm, setMessageForm] = useState({
    type: 'student' as 'student' | 'parent' | 'guardian',
    recipientId: studentId || '',
    subject: '',
    content: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });
  
  // Achievement creation state
  const [isCreatingAchievement, setIsCreatingAchievement] = useState(false);
  const [achievementForm, setAchievementForm] = useState({
    studentId: studentId || '',
    type: 'academic' as 'academic' | 'behavior' | 'participation' | 'improvement' | 'milestone',
    title: '',
    description: '',
    recognitionLevel: 'bronze' as 'bronze' | 'silver' | 'gold' | 'platinum',
    category: '',
    points: 0,
    shared: true
  });
  
  // Communication log state
  const [isLoggingCommunication, setIsLoggingCommunication] = useState(false);
  const [communicationForm, setCommunicationForm] = useState({
    studentId: studentId || '',
    contactType: 'email' as 'email' | 'phone' | 'meeting' | 'note',
    contactPerson: 'student' as 'student' | 'parent' | 'guardian',
    subject: '',
    summary: '',
    followUpRequired: false,
    followUpDate: '',
    outcome: 'neutral' as 'positive' | 'neutral' | 'concerning' | 'resolved',
    tags: [] as string[]
  });

  useEffect(() => {
    loadCommunicationData();
  }, [studentId, user?.id]);

  const loadCommunicationData = async () => {
    setLoading(true);
    try {
      // Mock data for development
      const mockMessages: CommunicationMessage[] = [
        {
          id: '1',
          type: 'student',
          recipientId: 'student1',
          recipientName: 'Sarah Johnson',
          recipientEmail: 'sarah.johnson@student.edu',
          subject: 'Great work on today\'s debate!',
          content: 'Sarah, I wanted to commend you on your excellent performance in today\'s debate about climate change. Your research was thorough and your arguments were well-structured.',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          status: 'read',
          priority: 'medium',
          thread: 'thread1'
        },
        {
          id: '2',
          type: 'parent',
          recipientId: 'parent1',
          recipientName: 'Mrs. Johnson',
          recipientEmail: 'parent1@email.com',
          subject: 'Sarah\'s Progress Update',
          content: 'I wanted to update you on Sarah\'s outstanding progress this semester. She has shown remarkable improvement in critical thinking and communication skills.',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          status: 'sent',
          priority: 'high',
          thread: 'thread2'
        }
      ];
      
      const mockAchievements: StudentAchievement[] = [
        {
          id: '1',
          studentId: 'student1',
          studentName: 'Sarah Johnson',
          type: 'academic',
          title: 'Top Debater of the Week',
          description: 'Awarded for exceptional performance and improvement in debate skills',
          dateAwarded: new Date(),
          recognitionLevel: 'gold',
          shared: true,
          notificationSent: true,
          category: 'Debate Excellence',
          points: 100,
          criteria: ['Strong arguments', 'Respectful discourse', 'Well-researched points']
        },
        {
          id: '2',
          studentId: 'student2',
          studentName: 'Michael Chen',
          type: 'improvement',
          title: 'Most Improved Student',
          description: 'Significant improvement in participation and engagement over the past month',
          dateAwarded: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          recognitionLevel: 'silver',
          shared: true,
          notificationSent: true,
          category: 'Personal Growth',
          points: 75
        }
      ];
      
      const mockLogs: CommunicationLog[] = [
        {
          id: '1',
          studentId: 'student1',
          contactType: 'email',
          contactPerson: 'parent',
          subject: 'Progress Discussion',
          summary: 'Discussed Sarah\'s academic progress and upcoming debate competitions. Parents very supportive.',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          followUpRequired: false,
          outcome: 'positive',
          tags: ['progress', 'supportive-parents']
        },
        {
          id: '2',
          studentId: 'student3',
          contactType: 'phone',
          contactPerson: 'parent',
          subject: 'Attendance Concerns',
          summary: 'Called to discuss Emma\'s attendance issues and declining participation. Scheduled meeting.',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          followUpRequired: true,
          followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          outcome: 'concerning',
          tags: ['attendance', 'intervention-needed']
        }
      ];
      
      setMessages(mockMessages);
      setAchievements(mockAchievements);
      setCommunicationLogs(mockLogs);
      
    } catch (error) {
      console.error('Failed to load communication data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageForm.recipientId || !messageForm.subject || !messageForm.content) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required fields.'
      });
      return;
    }

    try {
      const student = students.find(s => s.id === messageForm.recipientId);
      const newMessage: CommunicationMessage = {
        id: Date.now().toString(),
        type: messageForm.type,
        recipientId: messageForm.recipientId,
        recipientName: student?.firstName + ' ' + student?.lastName || 'Unknown',
        recipientEmail: messageForm.type === 'student' ? student?.email : student?.parentEmail || '',
        subject: messageForm.subject,
        content: messageForm.content,
        timestamp: new Date(),
        status: 'sent',
        priority: messageForm.priority
      };

      setMessages(prev => [newMessage, ...prev]);
      onSendMessage?.(newMessage);
      
      setMessageForm({
        type: 'student',
        recipientId: studentId || '',
        subject: '',
        content: '',
        priority: 'medium'
      });
      setIsComposingMessage(false);
      
      addNotification({
        type: 'success',
        title: 'Message Sent',
        message: `Message sent to ${newMessage.recipientName}`
      });
      
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Send Failed',
        message: 'Failed to send message. Please try again.'
      });
    }
  };

  const handleAwardAchievement = async () => {
    if (!achievementForm.studentId || !achievementForm.title || !achievementForm.description) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required fields.'
      });
      return;
    }

    try {
      const student = students.find(s => s.id === achievementForm.studentId);
      const newAchievement: StudentAchievement = {
        id: Date.now().toString(),
        studentId: achievementForm.studentId,
        studentName: student?.firstName + ' ' + student?.lastName || 'Unknown',
        type: achievementForm.type,
        title: achievementForm.title,
        description: achievementForm.description,
        dateAwarded: new Date(),
        recognitionLevel: achievementForm.recognitionLevel,
        shared: achievementForm.shared,
        notificationSent: false,
        category: achievementForm.category,
        points: achievementForm.points
      };

      setAchievements(prev => [newAchievement, ...prev]);
      onAwardAchievement?.(newAchievement);
      
      setAchievementForm({
        studentId: studentId || '',
        type: 'academic',
        title: '',
        description: '',
        recognitionLevel: 'bronze',
        category: '',
        points: 0,
        shared: true
      });
      setIsCreatingAchievement(false);
      
      addNotification({
        type: 'success',
        title: 'Achievement Awarded',
        message: `Achievement "${newAchievement.title}" awarded to ${newAchievement.studentName}`
      });
      
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Award Failed',
        message: 'Failed to award achievement. Please try again.'
      });
    }
  };

  const handleLogCommunication = async () => {
    if (!communicationForm.studentId || !communicationForm.subject || !communicationForm.summary) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required fields.'
      });
      return;
    }

    try {
      const newLog: CommunicationLog = {
        id: Date.now().toString(),
        studentId: communicationForm.studentId,
        contactType: communicationForm.contactType,
        contactPerson: communicationForm.contactPerson,
        subject: communicationForm.subject,
        summary: communicationForm.summary,
        timestamp: new Date(),
        followUpRequired: communicationForm.followUpRequired,
        followUpDate: communicationForm.followUpDate ? new Date(communicationForm.followUpDate) : undefined,
        outcome: communicationForm.outcome,
        tags: communicationForm.tags
      };

      setCommunicationLogs(prev => [newLog, ...prev]);
      onLogCommunication?.(newLog);
      
      setCommunicationForm({
        studentId: studentId || '',
        contactType: 'email',
        contactPerson: 'student',
        subject: '',
        summary: '',
        followUpRequired: false,
        followUpDate: '',
        outcome: 'neutral',
        tags: []
      });
      setIsLoggingCommunication(false);
      
      addNotification({
        type: 'success',
        title: 'Communication Logged',
        message: 'Communication has been logged successfully.'
      });
      
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Log Failed',
        message: 'Failed to log communication. Please try again.'
      });
    }
  };

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'academic':
        return <Trophy className="h-5 w-5" />;
      case 'behavior':
        return <Heart className="h-5 w-5" />;
      case 'participation':
        return <Users className="h-5 w-5" />;
      case 'improvement':
        return <TrendingUp className="h-5 w-5" />;
      case 'milestone':
        return <Target className="h-5 w-5" />;
      default:
        return <Award className="h-5 w-5" />;
    }
  };

  const getAchievementColor = (level: string) => {
    switch (level) {
      case 'bronze':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'silver':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'gold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'platinum':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'positive':
        return <Badge className="bg-green-100 text-green-800">Positive</Badge>;
      case 'neutral':
        return <Badge variant="secondary">Neutral</Badge>;
      case 'concerning':
        return <Badge variant="destructive">Concerning</Badge>;
      case 'resolved':
        return <Badge className="bg-blue-100 text-blue-800">Resolved</Badge>;
      default:
        return <Badge variant="outline">{outcome}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Communication Center</h3>
          <p className="text-sm text-muted-foreground">
            Manage student communications, achievements, and interaction logs
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={isComposingMessage} onOpenChange={setIsComposingMessage}>
            <DialogTrigger asChild>
              <Button>
                <MessageSquare className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Compose Message</DialogTitle>
                <DialogDescription>
                  Send a message to a student or their parent/guardian
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Recipient Type</label>
                    <Select value={messageForm.type} onValueChange={(value: any) => setMessageForm(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="guardian">Guardian</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Priority</label>
                    <Select value={messageForm.priority} onValueChange={(value: any) => setMessageForm(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Student</label>
                  <Select value={messageForm.recipientId} onValueChange={(value) => setMessageForm(prev => ({ ...prev, recipientId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(student => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.firstName} {student.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    placeholder="Message subject"
                    value={messageForm.subject}
                    onChange={(e) => setMessageForm(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    placeholder="Type your message here..."
                    value={messageForm.content}
                    onChange={(e) => setMessageForm(prev => ({ ...prev, content: e.target.value }))}
                    rows={6}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsComposingMessage(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendMessage}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="logs">Communication Log</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Recent Messages ({messages.length})
                </span>
                <Button size="sm" onClick={() => setIsComposingMessage(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Message
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No messages yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start communicating with students and parents
                  </p>
                  <Button onClick={() => setIsComposingMessage(true)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send First Message
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <Card key={message.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Badge variant={message.type === 'student' ? 'default' : 'secondary'}>
                                {message.type}
                              </Badge>
                              <Badge 
                                variant={message.priority === 'high' ? 'destructive' : 
                                        message.priority === 'medium' ? 'default' : 'outline'}
                              >
                                {message.priority}
                              </Badge>
                              <Badge 
                                variant={message.status === 'read' ? 'default' : 
                                        message.status === 'sent' ? 'secondary' : 'outline'}
                              >
                                {message.status}
                              </Badge>
                            </div>
                            <h4 className="font-medium">{message.subject}</h4>
                            <p className="text-sm text-muted-foreground">
                              To: {message.recipientName} ({message.recipientEmail})
                            </p>
                            <p className="text-sm mt-2">{message.content}</p>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <p>{message.timestamp.toLocaleDateString()}</p>
                            <p>{message.timestamp.toLocaleTimeString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Student Achievements ({achievements.length})
                </span>
                <Dialog open={isCreatingAchievement} onOpenChange={setIsCreatingAchievement}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Award Achievement
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Award Achievement</DialogTitle>
                      <DialogDescription>
                        Recognize student accomplishments and celebrate their success
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Student</label>
                          <Select value={achievementForm.studentId} onValueChange={(value) => setAchievementForm(prev => ({ ...prev, studentId: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select student" />
                            </SelectTrigger>
                            <SelectContent>
                              {students.map(student => (
                                <SelectItem key={student.id} value={student.id}>
                                  {student.firstName} {student.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Type</label>
                          <Select value={achievementForm.type} onValueChange={(value: any) => setAchievementForm(prev => ({ ...prev, type: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="academic">Academic</SelectItem>
                              <SelectItem value="behavior">Behavior</SelectItem>
                              <SelectItem value="participation">Participation</SelectItem>
                              <SelectItem value="improvement">Improvement</SelectItem>
                              <SelectItem value="milestone">Milestone</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Recognition Level</label>
                          <Select value={achievementForm.recognitionLevel} onValueChange={(value: any) => setAchievementForm(prev => ({ ...prev, recognitionLevel: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bronze">Bronze</SelectItem>
                              <SelectItem value="silver">Silver</SelectItem>
                              <SelectItem value="gold">Gold</SelectItem>
                              <SelectItem value="platinum">Platinum</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Points</label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={achievementForm.points}
                            onChange={(e) => setAchievementForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Title</label>
                        <Input
                          placeholder="Achievement title"
                          value={achievementForm.title}
                          onChange={(e) => setAchievementForm(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                          placeholder="Describe the achievement..."
                          value={achievementForm.description}
                          onChange={(e) => setAchievementForm(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Category</label>
                        <Input
                          placeholder="e.g., Debate Excellence, Personal Growth"
                          value={achievementForm.category}
                          onChange={(e) => setAchievementForm(prev => ({ ...prev, category: e.target.value }))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreatingAchievement(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAwardAchievement}>
                        <Award className="h-4 w-4 mr-2" />
                        Award Achievement
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {achievements.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No achievements awarded yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start recognizing student accomplishments
                  </p>
                  <Button onClick={() => setIsCreatingAchievement(true)}>
                    <Award className="h-4 w-4 mr-2" />
                    Award First Achievement
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {achievements.map((achievement) => (
                    <Card key={achievement.id} className={`border-2 ${getAchievementColor(achievement.recognitionLevel)}`}>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-full ${getAchievementColor(achievement.recognitionLevel)}`}>
                                {getAchievementIcon(achievement.type)}
                              </div>
                              <div>
                                <h4 className="font-medium">{achievement.title}</h4>
                                <p className="text-sm text-muted-foreground">{achievement.studentName}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className={getAchievementColor(achievement.recognitionLevel)}>
                                {achievement.recognitionLevel}
                              </Badge>
                              {achievement.points && achievement.points > 0 && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {achievement.points} points
                                </p>
                              )}
                            </div>
                          </div>
                          <p className="text-sm">{achievement.description}</p>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <Badge variant="outline">{achievement.category}</Badge>
                            <span>{achievement.dateAwarded.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Communication Log ({communicationLogs.length})
                </span>
                <Dialog open={isLoggingCommunication} onOpenChange={setIsLoggingCommunication}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Log Communication
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Log Communication</DialogTitle>
                      <DialogDescription>
                        Record communication with students or parents for tracking and follow-up
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Student</label>
                          <Select value={communicationForm.studentId} onValueChange={(value) => setCommunicationForm(prev => ({ ...prev, studentId: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select student" />
                            </SelectTrigger>
                            <SelectContent>
                              {students.map(student => (
                                <SelectItem key={student.id} value={student.id}>
                                  {student.firstName} {student.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Contact Type</label>
                          <Select value={communicationForm.contactType} onValueChange={(value: any) => setCommunicationForm(prev => ({ ...prev, contactType: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="phone">Phone Call</SelectItem>
                              <SelectItem value="meeting">In-Person Meeting</SelectItem>
                              <SelectItem value="note">Note/Observation</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Contact Person</label>
                          <Select value={communicationForm.contactPerson} onValueChange={(value: any) => setCommunicationForm(prev => ({ ...prev, contactPerson: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">Student</SelectItem>
                              <SelectItem value="parent">Parent</SelectItem>
                              <SelectItem value="guardian">Guardian</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Outcome</label>
                          <Select value={communicationForm.outcome} onValueChange={(value: any) => setCommunicationForm(prev => ({ ...prev, outcome: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="positive">Positive</SelectItem>
                              <SelectItem value="neutral">Neutral</SelectItem>
                              <SelectItem value="concerning">Concerning</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Subject</label>
                        <Input
                          placeholder="Communication subject"
                          value={communicationForm.subject}
                          onChange={(e) => setCommunicationForm(prev => ({ ...prev, subject: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Summary</label>
                        <Textarea
                          placeholder="Brief summary of the communication..."
                          value={communicationForm.summary}
                          onChange={(e) => setCommunicationForm(prev => ({ ...prev, summary: e.target.value }))}
                          rows={4}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="followUp"
                          checked={communicationForm.followUpRequired}
                          onChange={(e) => setCommunicationForm(prev => ({ ...prev, followUpRequired: e.target.checked }))}
                        />
                        <label htmlFor="followUp" className="text-sm font-medium">Follow-up required</label>
                      </div>
                      {communicationForm.followUpRequired && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Follow-up Date</label>
                          <Input
                            type="date"
                            value={communicationForm.followUpDate}
                            onChange={(e) => setCommunicationForm(prev => ({ ...prev, followUpDate: e.target.value }))}
                          />
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsLoggingCommunication(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleLogCommunication}>
                        <FileText className="h-4 w-4 mr-2" />
                        Log Communication
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {communicationLogs.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No communications logged yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start tracking your interactions with students and parents
                  </p>
                  <Button onClick={() => setIsLoggingCommunication(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Log First Communication
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {communicationLogs.map((log) => (
                    <Card key={log.id}>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">
                                  {log.contactType}
                                </Badge>
                                <Badge variant="secondary">
                                  {log.contactPerson}
                                </Badge>
                                {getOutcomeBadge(log.outcome)}
                                {log.followUpRequired && (
                                  <Badge variant="destructive" className="flex items-center">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Follow-up Required
                                  </Badge>
                                )}
                              </div>
                              <h4 className="font-medium">{log.subject}</h4>
                              <p className="text-sm text-muted-foreground">
                                Student: {students.find(s => s.id === log.studentId)?.firstName} {students.find(s => s.id === log.studentId)?.lastName}
                              </p>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              <p>{log.timestamp.toLocaleDateString()}</p>
                              <p>{log.timestamp.toLocaleTimeString()}</p>
                              {log.followUpDate && (
                                <p className="text-red-600 mt-1">
                                  Follow-up: {log.followUpDate.toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <p className="text-sm">{log.summary}</p>
                          {log.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {log.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Message Templates
              </CardTitle>
              <CardDescription>
                Pre-written templates for common communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Template Library</h3>
                <p className="text-muted-foreground mb-4">
                  Message templates will be implemented to speed up common communications
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Badge variant="outline">Progress Update</Badge>
                  <Badge variant="outline">Attendance Concern</Badge>
                  <Badge variant="outline">Achievement Recognition</Badge>
                  <Badge variant="outline">Assignment Reminder</Badge>
                  <Badge variant="outline">Parent Meeting Request</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
