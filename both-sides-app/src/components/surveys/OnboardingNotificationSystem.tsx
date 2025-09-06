/**
 * Phase 3 Task 3.3.4.3: Build Completion Notification and Follow-up System
 * Automated completion notifications, follow-up surveys, and re-engagement campaigns
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  Bell,
  Mail,
  MessageSquare,
  Send,
  Calendar,
  Clock,
  Users,
  Target,
  CheckCircle,
  AlertTriangle,
  Star,
  Gift,
  Zap,
  TrendingUp,
  Settings,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Eye
} from 'lucide-react';

// Notification System Types
interface NotificationTemplate {
  id: string;
  name: string;
  type: 'completion' | 'milestone' | 'stalled' | 'reminder' | 'celebration';
  trigger: {
    event: string;
    conditions: Record<string, any>;
    delay?: number; // milliseconds
  };
  recipients: 'student' | 'teacher' | 'both';
  channels: ('email' | 'in_app' | 'sms')[];
  subject: string;
  content: string;
  variables: string[]; // Available template variables
  isActive: boolean;
  createdAt: Date;
}

interface FollowUpSurvey {
  id: string;
  name: string;
  description: string;
  targetAudience: 'completed' | 'incomplete' | 'stalled' | 'all';
  questions: {
    id: string;
    type: 'rating' | 'text' | 'multiple_choice';
    question: string;
    options?: string[];
    required: boolean;
  }[];
  scheduledFor: Date;
  isActive: boolean;
  responseCount: number;
  avgRating?: number;
}

interface ReEngagementCampaign {
  id: string;
  name: string;
  description: string;
  targetCriteria: {
    daysInactive: number;
    progressThreshold: number;
    engagementLevel: 'low' | 'medium' | 'high' | 'any';
  };
  sequence: {
    day: number;
    action: 'email' | 'notification' | 'incentive';
    content: string;
    subject?: string;
  }[];
  isActive: boolean;
  stats: {
    sent: number;
    opened: number;
    clicked: number;
    reengaged: number;
  };
}

interface NotificationLog {
  id: string;
  templateId: string;
  recipientId: string;
  recipientName: string;
  type: string;
  channel: string;
  subject: string;
  sentAt: Date;
  opened?: Date;
  clicked?: Date;
  responded?: Date;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
}

interface OnboardingNotificationSystemProps {
  userRole: 'TEACHER' | 'ADMIN';
  onNotificationSent?: (notification: NotificationLog) => void;
  className?: string;
}

export function OnboardingNotificationSystem({
  userRole,
  onNotificationSent,
  className = ''
}: OnboardingNotificationSystemProps) {
  const { getToken } = useAuth();
  
  // State Management
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [followUpSurveys, setFollowUpSurveys] = useState<FollowUpSurvey[]>([]);
  const [campaigns, setCampaigns] = useState<ReEngagementCampaign[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [selectedTab, setSelectedTab] = useState('templates');
  const [isCreating, setIsCreating] = useState(false);

  // Default notification templates
  const defaultTemplates: NotificationTemplate[] = [
    {
      id: 'completion_student',
      name: 'Student Completion Celebration',
      type: 'completion',
      trigger: {
        event: 'onboarding_completed',
        conditions: { progressPercentage: 100 }
      },
      recipients: 'student',
      channels: ['email', 'in_app'],
      subject: '🎉 Congratulations! You\'ve completed your Both Sides onboarding!',
      content: `Hi {{studentName}},

Congratulations on completing your Both Sides onboarding! 🎉

Here's what you achieved:
- Completion Score: {{qualityScore}}%
- Time Invested: {{timeSpent}}
- Certificates Earned: {{certificatesCount}}

You're now ready to:
✨ Join meaningful debates with your classmates
🎯 Get matched with compatible discussion partners
🧠 Explore different perspectives and grow your critical thinking

Your teacher {{teacherName}} has been notified of your completion.

Ready to start your first debate? Click here to explore available topics!

Best regards,
The Both Sides Team`,
      variables: ['studentName', 'qualityScore', 'timeSpent', 'certificatesCount', 'teacherName'],
      isActive: true,
      createdAt: new Date()
    },
    {
      id: 'completion_teacher',
      name: 'Teacher Completion Notification',
      type: 'completion',
      trigger: {
        event: 'onboarding_completed',
        conditions: { progressPercentage: 100 }
      },
      recipients: 'teacher',
      channels: ['email', 'in_app'],
      subject: '✅ {{studentName}} completed onboarding in {{className}}',
      content: `Hi {{teacherName}},

Great news! {{studentName}} has successfully completed their Both Sides onboarding.

Student Performance Summary:
- Completion Score: {{qualityScore}}% 
- Engagement Level: {{engagementLevel}}
- Time to Complete: {{timeSpent}}
- Certificates Earned: {{certificatesCount}}

{{studentName}} is now ready to participate in classroom debates and discussions.

View detailed analytics in your teacher dashboard: {{dashboardLink}}

Best regards,
Both Sides`,
      variables: ['studentName', 'teacherName', 'className', 'qualityScore', 'engagementLevel', 'timeSpent', 'certificatesCount', 'dashboardLink'],
      isActive: true,
      createdAt: new Date()
    },
    {
      id: 'stalled_reminder',
      name: 'Stalled Student Re-engagement',
      type: 'stalled',
      trigger: {
        event: 'student_stalled',
        conditions: { daysInactive: 3, progressPercentage: { lt: 100 } },
        delay: 24 * 60 * 60 * 1000 // 24 hours
      },
      recipients: 'student',
      channels: ['email', 'in_app'],
      subject: 'Don\'t lose momentum - continue your Both Sides journey! 🚀',
      content: `Hi {{studentName}},

We noticed you started your Both Sides onboarding but haven't finished yet. You're {{progressPercentage}}% complete - so close to unlocking the full experience!

What you'll gain by completing:
🎯 Intelligent matching with debate partners
🧠 Access to all discussion topics
⭐ Recognition for your engagement
📊 Insights into your belief profile

It only takes about {{estimatedTimeRemaining}} minutes to finish.

Continue where you left off: {{resumeLink}}

Need help? Reply to this email and we'll assist you!

Best,
Both Sides Team`,
      variables: ['studentName', 'progressPercentage', 'estimatedTimeRemaining', 'resumeLink'],
      isActive: true,
      createdAt: new Date()
    },
    {
      id: 'milestone_achievement',
      name: 'Milestone Achievement',
      type: 'milestone',
      trigger: {
        event: 'milestone_reached',
        conditions: { milestoneType: 'any' }
      },
      recipients: 'student',
      channels: ['in_app'],
      subject: '🏆 Achievement Unlocked: {{milestoneName}}!',
      content: `Congratulations {{studentName}}!

You've just unlocked the "{{milestoneName}}" achievement! 

{{milestoneDescription}}

Points Earned: {{milestonePoints}}
Total Points: {{totalPoints}}

Keep up the great work! You're making excellent progress on your Both Sides journey.`,
      variables: ['studentName', 'milestoneName', 'milestoneDescription', 'milestonePoints', 'totalPoints'],
      isActive: true,
      createdAt: new Date()
    }
  ];

  // Default follow-up surveys
  const defaultSurveys: FollowUpSurvey[] = [
    {
      id: 'completion_feedback',
      name: 'Onboarding Experience Feedback',
      description: 'Collect feedback from students who completed onboarding',
      targetAudience: 'completed',
      questions: [
        {
          id: 'overall_experience',
          type: 'rating',
          question: 'How would you rate your overall onboarding experience?',
          required: true
        },
        {
          id: 'difficulty_level',
          type: 'multiple_choice',
          question: 'How did you find the difficulty level of the onboarding?',
          options: ['Too easy', 'Just right', 'Too challenging', 'Confusing'],
          required: true
        },
        {
          id: 'most_valuable',
          type: 'text',
          question: 'What was the most valuable part of the onboarding experience?',
          required: false
        },
        {
          id: 'improvements',
          type: 'text',
          question: 'What could we improve about the onboarding process?',
          required: false
        }
      ],
      scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      isActive: true,
      responseCount: 23,
      avgRating: 4.2
    }
  ];

  // Default re-engagement campaigns
  const defaultCampaigns: ReEngagementCampaign[] = [
    {
      id: 'inactive_student_sequence',
      name: 'Inactive Student Re-engagement',
      description: '3-day sequence to re-engage students who haven\'t been active',
      targetCriteria: {
        daysInactive: 5,
        progressThreshold: 75, // Less than 75% complete
        engagementLevel: 'any'
      },
      sequence: [
        {
          day: 1,
          action: 'email',
          subject: 'We miss you! Let\'s finish what you started 🌟',
          content: 'Your Both Sides journey is waiting for you. You\'re {{progressPercentage}}% complete - just a few more minutes to unlock the full experience!'
        },
        {
          day: 3,
          action: 'notification',
          content: 'Quick reminder: Your classmates are already engaging in debates. Don\'t miss out - complete your onboarding to join them!'
        },
        {
          day: 5,
          action: 'incentive',
          content: 'Special offer: Complete your onboarding in the next 24 hours and earn bonus points! 🎁'
        }
      ],
      isActive: true,
      stats: {
        sent: 45,
        opened: 32,
        clicked: 18,
        reengaged: 12
      }
    }
  ];

  useEffect(() => {
    loadNotificationData();
  }, []);

  const loadNotificationData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      // In real implementation, these would come from API
      setTemplates(defaultTemplates);
      setFollowUpSurveys(defaultSurveys);
      setCampaigns(defaultCampaigns);
      
      // Mock notification logs
      const mockLogs: NotificationLog[] = [
        {
          id: 'log_1',
          templateId: 'completion_student',
          recipientId: 'student_1',
          recipientName: 'Emma Rodriguez',
          type: 'completion',
          channel: 'email',
          subject: '🎉 Congratulations! You\'ve completed your Both Sides onboarding!',
          sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          opened: new Date(Date.now() - 90 * 60 * 1000),
          clicked: new Date(Date.now() - 75 * 60 * 1000),
          status: 'delivered'
        },
        {
          id: 'log_2',
          templateId: 'stalled_reminder',
          recipientId: 'student_2',
          recipientName: 'Marcus Johnson',
          type: 'stalled',
          channel: 'email',
          subject: 'Don\'t lose momentum - continue your Both Sides journey! 🚀',
          sentAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
          status: 'sent'
        }
      ];
      setNotificationLogs(mockLogs);

    } catch (error) {
      console.error('Failed to load notification data:', error);
    }
  }, [getToken]);

  const sendTestNotification = async (templateId: string) => {
    try {
      // In real implementation, this would trigger the notification system
      console.log('Sending test notification for template:', templateId);
      
      const testLog: NotificationLog = {
        id: `test_${Date.now()}`,
        templateId,
        recipientId: 'test_user',
        recipientName: 'Test User',
        type: 'test',
        channel: 'email',
        subject: 'Test Notification',
        sentAt: new Date(),
        status: 'sent'
      };

      setNotificationLogs(prev => [testLog, ...prev]);
      onNotificationSent?.(testLog);

    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  };

  const toggleTemplateActive = (templateId: string) => {
    setTemplates(prev => prev.map(template => 
      template.id === templateId 
        ? { ...template, isActive: !template.isActive }
        : template
    ));
  };

  const toggleCampaignActive = (campaignId: string) => {
    setCampaigns(prev => prev.map(campaign => 
      campaign.id === campaignId 
        ? { ...campaign, isActive: !campaign.isActive }
        : campaign
    ));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'sent': return <Send className="h-4 w-4 text-blue-500" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification System</h2>
          <p className="text-muted-foreground">Manage automated notifications and follow-ups</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
          <TabsTrigger value="logs">Activity</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className={`${!template.isActive ? 'opacity-60' : ''}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={template.type === 'completion' ? 'default' : 'secondary'}>
                          {template.type}
                        </Badge>
                        <Badge variant="outline">{template.recipients}</Badge>
                        <div className="flex gap-1">
                          {template.channels.map(channel => (
                            <Badge key={channel} variant="outline" className="text-xs">
                              {channel}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleTemplateActive(template.id)}
                      >
                        {template.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => sendTestNotification(template.id)}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h5 className="font-medium text-sm">Subject:</h5>
                      <p className="text-sm text-muted-foreground">{template.subject}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-sm">Content Preview:</h5>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {template.content.substring(0, 150)}...
                      </p>
                    </div>
                    <div>
                      <h5 className="font-medium text-sm">Variables:</h5>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.variables.map(variable => (
                          <Badge key={variable} variant="outline" className="text-xs">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {campaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{campaign.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleCampaignActive(campaign.id)}
                      >
                        {campaign.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-sm mb-2">Target Criteria:</h5>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>• {campaign.targetCriteria.daysInactive}+ days inactive</p>
                        <p>• &lt;{campaign.targetCriteria.progressThreshold}% progress</p>
                        <p>• {campaign.targetCriteria.engagementLevel} engagement level</p>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-sm mb-2">Sequence ({campaign.sequence.length} steps):</h5>
                      <div className="space-y-2">
                        {campaign.sequence.map((step, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <Badge variant="outline" className="text-xs">Day {step.day}</Badge>
                            <div>
                              <span className="font-medium capitalize">{step.action}:</span>
                              <span className="ml-2 text-muted-foreground">
                                {step.subject || step.content.substring(0, 60)}...
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <h5 className="font-medium text-sm mb-2">Performance:</h5>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Sent: </span>
                          <span className="font-medium">{campaign.stats.sent}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Opened: </span>
                          <span className="font-medium">{campaign.stats.opened}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Clicked: </span>
                          <span className="font-medium">{campaign.stats.clicked}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Re-engaged: </span>
                          <span className="font-medium text-green-600">{campaign.stats.reengaged}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Surveys Tab */}
        <TabsContent value="surveys" className="space-y-6">
          <div className="space-y-4">
            {followUpSurveys.map((survey) => (
              <Card key={survey.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{survey.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{survey.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {survey.avgRating && (
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">{survey.avgRating}</div>
                          <p className="text-xs text-muted-foreground">Avg. Rating</p>
                        </div>
                      )}
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{survey.responseCount}</div>
                        <p className="text-xs text-muted-foreground">Responses</p>
                      </div>
                      <Badge variant={survey.isActive ? 'default' : 'secondary'}>
                        {survey.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-sm mb-2">Questions ({survey.questions.length}):</h5>
                      <div className="space-y-2">
                        {survey.questions.map((question, index) => (
                          <div key={question.id} className="text-sm p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-start justify-between">
                              <span className="font-medium">Q{index + 1}: {question.question}</span>
                              <div className="flex gap-1">
                                <Badge variant="outline" className="text-xs">{question.type}</Badge>
                                {question.required && (
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                )}
                              </div>
                            </div>
                            {question.options && (
                              <div className="mt-2 text-muted-foreground">
                                Options: {question.options.join(', ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Target: {survey.targetAudience} students | Scheduled: {survey.scheduledFor.toLocaleDateString()}
                      </span>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View Results
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Activity Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Notification Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notificationLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        {getStatusIcon(log.status)}
                        <span className="font-medium">{log.recipientName}</span>
                        <Badge variant="outline" className="text-xs">{log.type}</Badge>
                        <Badge variant="outline" className="text-xs">{log.channel}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{log.subject}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <span>Sent: {log.sentAt.toLocaleString()}</span>
                        {log.opened && <span>Opened: {log.opened.toLocaleString()}</span>}
                        {log.clicked && <span>Clicked: {log.clicked.toLocaleString()}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={log.status === 'delivered' ? 'default' : 'secondary'}>
                        {log.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Notifications Sent</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">284</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">68.5%</div>
                <p className="text-xs text-muted-foreground">+3.2% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Re-engagement</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">23.4%</div>
                <p className="text-xs text-muted-foreground">+5.1% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Survey Responses</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">156</div>
                <p className="text-xs text-muted-foreground">4.2 avg rating</p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="font-medium">Completion Celebrations</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">89 sent</span>
                    <Badge className="bg-blue-100 text-blue-800">72% opened</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <span className="font-medium">Stalled Reminders</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">34 sent</span>
                    <Badge className="bg-amber-100 text-amber-800">45% re-engaged</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="font-medium">Teacher Notifications</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">67 sent</span>
                    <Badge className="bg-green-100 text-green-800">94% opened</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
