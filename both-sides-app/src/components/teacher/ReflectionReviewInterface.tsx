/**
 * Reflection Review Interface
 * 
 * Task 7.5.2: Interface for teachers to review, provide feedback on, and manage
 * student reflections with bulk operations and quality assessment tools.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  MessageSquare, 
  Eye, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Star,
  Send,
  Save,
  Filter,
  Search,
  Download,
  FileText,
  Lightbulb,
  Target,
  BookOpen,
  User,
  Calendar,
  Flag,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Zap
} from 'lucide-react';

interface ReflectionSummary {
  id: string;
  studentName: string;
  studentId: string;
  debateTitle: string;
  submittedAt: Date;
  reviewStatus: 'pending' | 'reviewed' | 'needs_revision';
  qualityScore: number;
  wordCount: number;
  timeSpent: number;
  teacherPriority: 'high' | 'medium' | 'low';
  lastReviewed?: Date;
  teacherFeedback?: string;
  flaggedConcerns?: string[];
  strengths?: string[];
  areasForImprovement?: string[];
}

interface ReflectionContent {
  id: string;
  responses: Array<{
    questionId: string;
    questionText: string;
    response: string;
    analysisData?: {
      sentiment: 'positive' | 'negative' | 'neutral';
      keyInsights: string[];
      qualityMetrics: {
        depth: number;
        clarity: number;
        engagement: number;
        selfAwareness: number;
      };
    };
  }>;
  aiInsights: {
    overallSentiment: string;
    learningEvidence: string[];
    growthAreas: string[];
    strengths: string[];
  };
}

interface TeacherFeedback {
  overallRating: 1 | 2 | 3 | 4 | 5;
  strengths: string[];
  improvements: string[];
  specificComments: string;
  nextSteps: string;
  encouragement: string;
  flagForFollowUp: boolean;
}

interface ReflectionReviewInterfaceProps {
  reflections: ReflectionSummary[];
  classId: string;
}

export function ReflectionReviewInterface({ reflections, classId }: ReflectionReviewInterfaceProps) {
  const [selectedReflection, setSelectedReflection] = useState<ReflectionSummary | null>(null);
  const [reflectionContent, setReflectionContent] = useState<ReflectionContent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [sortBy, setSortBy] = useState('submitted_date');
  const [selectedReflections, setSelectedReflections] = useState<string[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<Partial<TeacherFeedback>>({});
  const [savingFeedback, setSavingFeedback] = useState(false);

  // Filter and sort reflections
  const filteredReflections = useMemo(() => {
    let filtered = reflections.filter(reflection => {
      const matchesSearch = !searchTerm || 
        reflection.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reflection.debateTitle.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || reflection.reviewStatus === filterStatus;
      const matchesPriority = filterPriority === 'all' || reflection.teacherPriority === filterPriority;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });

    // Sort reflections
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'submitted_date':
          return b.submittedAt.getTime() - a.submittedAt.getTime();
        case 'student_name':
          return a.studentName.localeCompare(b.studentName);
        case 'quality_score':
          return b.qualityScore - a.qualityScore;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.teacherPriority] - priorityOrder[a.teacherPriority];
        case 'word_count':
          return b.wordCount - a.wordCount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [reflections, searchTerm, filterStatus, filterPriority, sortBy]);

  // Calculate review statistics
  const reviewStats = useMemo(() => {
    const total = reflections.length;
    const pending = reflections.filter(r => r.reviewStatus === 'pending').length;
    const reviewed = reflections.filter(r => r.reviewStatus === 'reviewed').length;
    const needsRevision = reflections.filter(r => r.reviewStatus === 'needs_revision').length;
    const highPriority = reflections.filter(r => r.teacherPriority === 'high').length;
    
    return { total, pending, reviewed, needsRevision, highPriority };
  }, [reflections]);

  const handleReflectionSelect = async (reflection: ReflectionSummary) => {
    setSelectedReflection(reflection);
    
    // Fetch reflection content (mock data for now)
    const mockContent: ReflectionContent = {
      id: reflection.id,
      responses: [
        {
          questionId: '1',
          questionText: 'What did you learn about yourself during this debate?',
          response: 'I learned that I tend to get defensive when challenged on topics I care deeply about. This debate helped me realize I need to work on staying more open-minded and considering other perspectives, even when they contradict my initial beliefs.',
          analysisData: {
            sentiment: 'positive',
            keyInsights: ['Self-awareness', 'Growth mindset', 'Emotional regulation'],
            qualityMetrics: {
              depth: 0.8,
              clarity: 0.9,
              engagement: 0.7,
              selfAwareness: 0.9
            }
          }
        },
        {
          questionId: '2',
          questionText: 'How did your opinion change (if at all) during the debate?',
          response: 'While I still hold my original position, I gained a much better understanding of why people might disagree. The opponent presented some compelling evidence that I hadn\'t considered before, especially regarding the economic implications.',
          analysisData: {
            sentiment: 'neutral',
            keyInsights: ['Opinion plasticity', 'Evidence evaluation', 'Perspective taking'],
            qualityMetrics: {
              depth: 0.9,
              clarity: 0.8,
              engagement: 0.8,
              selfAwareness: 0.7
            }
          }
        }
      ],
      aiInsights: {
        overallSentiment: 'Positive and reflective',
        learningEvidence: [
          'Demonstrates clear self-awareness about defensive tendencies',
          'Shows appreciation for opposing viewpoints',
          'Exhibits intellectual honesty about learning'
        ],
        growthAreas: [
          'Could explore specific strategies for managing defensive reactions',
          'Might benefit from deeper analysis of evidence evaluation process'
        ],
        strengths: [
          'High self-awareness',
          'Intellectual humility',
          'Clear communication'
        ]
      }
    };
    
    setReflectionContent(mockContent);
    setCurrentFeedback({});
  };

  const handleSaveFeedback = async () => {
    if (!selectedReflection || !currentFeedback.overallRating) return;
    
    setSavingFeedback(true);
    
    try {
      // In a real app, this would make an API call
      console.log('Saving feedback for reflection:', selectedReflection.id, currentFeedback);
      
      // Update reflection status
      selectedReflection.reviewStatus = 'reviewed';
      selectedReflection.teacherFeedback = currentFeedback.specificComments;
      selectedReflection.lastReviewed = new Date();
      
      // Close modal
      setSelectedReflection(null);
      setReflectionContent(null);
      setCurrentFeedback({});
      
    } catch (error) {
      console.error('Failed to save feedback:', error);
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleBulkAction = (action: string) => {
    if (selectedReflections.length === 0) return;
    
    console.log(`Performing bulk action: ${action} on ${selectedReflections.length} reflections`);
    setSelectedReflections([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-orange-600 bg-orange-100';
      case 'reviewed': return 'text-green-600 bg-green-100';
      case 'needs_revision': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Reflection Review</h2>
        <p className="text-muted-foreground">
          Review and provide feedback on student reflections
        </p>
      </div>

      {/* Review Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Pending Review</p>
                <p className="text-2xl font-bold text-orange-600">{reviewStats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Reviewed</p>
                <p className="text-2xl font-bold text-green-600">{reviewStats.reviewed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Needs Revision</p>
                <p className="text-2xl font-bold text-red-600">{reviewStats.needsRevision}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">High Priority</p>
                <p className="text-2xl font-bold text-purple-600">{reviewStats.highPriority}</p>
              </div>
              <Flag className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student or debate..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="needs_revision">Needs Revision</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted_date">Submission Date</SelectItem>
                <SelectItem value="student_name">Student Name</SelectItem>
                <SelectItem value="quality_score">Quality Score</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="word_count">Word Count</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedReflections.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{selectedReflections.length} reflections selected</span>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('mark_reviewed')}>
                Mark as Reviewed
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('request_revision')}>
                Request Revision
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('export')}>
                Export Selected
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Reflections List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Student Reflections</span>
            <Badge variant="secondary">{filteredReflections.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReflections.length > 0 ? (
            <div className="space-y-4">
              {filteredReflections.map((reflection) => (
                <ReflectionCard
                  key={reflection.id}
                  reflection={reflection}
                  isSelected={selectedReflections.includes(reflection.id)}
                  onSelect={(selected) => {
                    if (selected) {
                      setSelectedReflections([...selectedReflections, reflection.id]);
                    } else {
                      setSelectedReflections(selectedReflections.filter(id => id !== reflection.id));
                    }
                  }}
                  onReview={() => handleReflectionSelect(reflection)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No Reflections Found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || filterStatus !== 'all' || filterPriority !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No reflections have been submitted yet'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      {selectedReflection && reflectionContent && (
        <ReflectionReviewModal
          reflection={selectedReflection}
          content={reflectionContent}
          feedback={currentFeedback}
          onFeedbackChange={setCurrentFeedback}
          onSave={handleSaveFeedback}
          onClose={() => {
            setSelectedReflection(null);
            setReflectionContent(null);
            setCurrentFeedback({});
          }}
          isSaving={savingFeedback}
        />
      )}
    </div>
  );
}

interface ReflectionCardProps {
  reflection: ReflectionSummary;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onReview: () => void;
}

function ReflectionCard({ reflection, isSelected, onSelect, onReview }: ReflectionCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'border-orange-200 bg-orange-50';
      case 'reviewed': return 'border-green-200 bg-green-50';
      case 'needs_revision': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200';
    }
  };

  return (
    <div className={`border rounded-lg p-4 transition-all hover:shadow-md ${getStatusColor(reflection.reviewStatus)}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
          />
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-medium">{reflection.studentName}</h3>
              <Badge 
                variant="outline"
                className={`text-xs ${reflection.teacherPriority === 'high' ? 'text-red-600' : 
                  reflection.teacherPriority === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}
              >
                {reflection.teacherPriority} priority
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">{reflection.debateTitle}</p>
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>Submitted {reflection.submittedAt.toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <FileText className="h-3 w-3" />
                <span>{reflection.wordCount} words</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{reflection.timeSpent}min</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{Math.round(reflection.qualityScore * 100)}%</span>
            </div>
            <div className="text-xs text-muted-foreground">Quality</div>
          </div>
          
          <Badge className={getStatusColor(reflection.reviewStatus)}>
            {reflection.reviewStatus.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {reflection.flaggedConcerns && reflection.flaggedConcerns.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center space-x-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-700">Flagged Concerns</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {reflection.flaggedConcerns.map((concern, index) => (
              <Badge key={index} variant="destructive" className="text-xs">
                {concern}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {reflection.lastReviewed 
            ? `Last reviewed: ${reflection.lastReviewed.toLocaleDateString()}`
            : 'Not yet reviewed'
          }
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={onReview}>
            <Eye className="h-4 w-4 mr-2" />
            {reflection.reviewStatus === 'pending' ? 'Review' : 'View'}
          </Button>
          
          {reflection.reviewStatus === 'reviewed' && (
            <Button variant="outline" size="sm">
              <MessageCircle className="h-4 w-4 mr-2" />
              Message Student
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ReflectionReviewModalProps {
  reflection: ReflectionSummary;
  content: ReflectionContent;
  feedback: Partial<TeacherFeedback>;
  onFeedbackChange: (feedback: Partial<TeacherFeedback>) => void;
  onSave: () => void;
  onClose: () => void;
  isSaving: boolean;
}

function ReflectionReviewModal({
  reflection,
  content,
  feedback,
  onFeedbackChange,
  onSave,
  onClose,
  isSaving
}: ReflectionReviewModalProps) {
  const [activeTab, setActiveTab] = useState('reflection');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Review Reflection - {reflection.studentName}</DialogTitle>
          <DialogDescription>
            {reflection.debateTitle} • Submitted {reflection.submittedAt.toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList>
            <TabsTrigger value="reflection">Student Reflection</TabsTrigger>
            <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
            <TabsTrigger value="feedback">Teacher Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="reflection" className="space-y-4">
            <ScrollArea className="h-96">
              <div className="space-y-6">
                {content.responses.map((response, index) => (
                  <div key={index} className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm text-blue-700 mb-2">
                        Question {index + 1}: {response.questionText}
                      </h4>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm leading-relaxed">{response.response}</p>
                      </div>
                    </div>
                    
                    {response.analysisData && (
                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-sm font-medium">Depth</div>
                          <Progress value={response.analysisData.qualityMetrics.depth * 100} className="h-2 mt-1" />
                          <div className="text-xs text-muted-foreground mt-1">
                            {Math.round(response.analysisData.qualityMetrics.depth * 100)}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">Clarity</div>
                          <Progress value={response.analysisData.qualityMetrics.clarity * 100} className="h-2 mt-1" />
                          <div className="text-xs text-muted-foreground mt-1">
                            {Math.round(response.analysisData.qualityMetrics.clarity * 100)}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">Engagement</div>
                          <Progress value={response.analysisData.qualityMetrics.engagement * 100} className="h-2 mt-1" />
                          <div className="text-xs text-muted-foreground mt-1">
                            {Math.round(response.analysisData.qualityMetrics.engagement * 100)}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">Self-Awareness</div>
                          <Progress value={response.analysisData.qualityMetrics.selfAwareness * 100} className="h-2 mt-1" />
                          <div className="text-xs text-muted-foreground mt-1">
                            {Math.round(response.analysisData.qualityMetrics.selfAwareness * 100)}%
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {index < content.responses.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lightbulb className="h-5 w-5" />
                    <span>AI Insights</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Overall Sentiment</h4>
                    <p className="text-sm text-muted-foreground">{content.aiInsights.overallSentiment}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm mb-2">Evidence of Learning</h4>
                    <ul className="text-sm space-y-1">
                      {content.aiInsights.learningEvidence.map((evidence, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{evidence}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm mb-2">Growth Areas</h4>
                    <ul className="text-sm space-y-1">
                      {content.aiInsights.growthAreas.map((area, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <Target className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="h-5 w-5" />
                    <span>Strengths Identified</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {content.aiInsights.strengths.map((strength, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-green-50 rounded">
                        <ThumbsUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{strength}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Overall Rating *</label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Button
                        key={rating}
                        variant={feedback.overallRating === rating ? "default" : "outline"}
                        size="sm"
                        onClick={() => onFeedbackChange({ ...feedback, overallRating: rating as 1 | 2 | 3 | 4 | 5 })}
                      >
                        <Star className={`h-4 w-4 ${feedback.overallRating && feedback.overallRating >= rating ? 'fill-current' : ''}`} />
                        {rating}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Specific Comments</label>
                  <Textarea
                    placeholder="Provide detailed feedback on the student's reflection..."
                    value={feedback.specificComments || ''}
                    onChange={(e) => onFeedbackChange({ ...feedback, specificComments: e.target.value })}
                    rows={4}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Next Steps</label>
                  <Textarea
                    placeholder="Suggest specific actions or areas to focus on next..."
                    value={feedback.nextSteps || ''}
                    onChange={(e) => onFeedbackChange({ ...feedback, nextSteps: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Encouragement</label>
                  <Textarea
                    placeholder="Positive reinforcement and motivation..."
                    value={feedback.encouragement || ''}
                    onChange={(e) => onFeedbackChange({ ...feedback, encouragement: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={feedback.flagForFollowUp || false}
                    onCheckedChange={(checked) => onFeedbackChange({ ...feedback, flagForFollowUp: !!checked })}
                  />
                  <label className="text-sm font-medium">Flag for follow-up discussion</label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="outline">
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button onClick={onSave} disabled={!feedback.overallRating || isSaving}>
                {isSaving ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Feedback
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
