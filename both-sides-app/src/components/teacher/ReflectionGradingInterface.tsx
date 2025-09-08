/**
 * Reflection Grading Interface Component
 * 
 * Task 8.2.3: Interface for evaluating student reflections with rubric-based scoring
 */

'use client';

import React, { useState, useEffect } from 'react';

import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  FileText,
  Star,
  CheckCircle2,
  Clock,
  MessageSquare,
  Award,
  Target,
  Eye,
  Edit,
  Save,
  Send,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  Brain,
  Lightbulb,
  Users
} from 'lucide-react';
import { LoadingState } from '@/components/loading/LoadingState';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface Reflection {
  id: string;
  studentId: string;
  student: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  debateId: string;
  debateTitle: string;
  content: string;
  submittedAt: Date;
  status: 'pending' | 'graded' | 'returned' | 'revised';
  grade?: {
    overallScore: number;
    rubricScores: {
      criteria: string;
      score: number;
      maxScore: number;
      feedback: string;
    }[];
    teacherFeedback: string;
    gradedAt: Date;
    gradedBy: string;
  };
  aiAnalysis?: {
    sentimentScore: number;
    keyTopics: string[];
    qualityIndicators: {
      depth: number;
      clarity: number;
      insight: number;
      evidence: number;
    };
    suggestions: string[];
  };
}

interface GradingRubric {
  criteria: string;
  description: string;
  maxScore: number;
  levels: {
    score: number;
    label: string;
    description: string;
  }[];
}

interface ReflectionGradingInterfaceProps {
  classId: string;
}

export function ReflectionGradingInterface({ classId }: ReflectionGradingInterfaceProps) {
  const { getToken, userId } = useAuth();
  const { addNotification } = useTeacherDashboard();
  
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [selectedReflection, setSelectedReflection] = useState<Reflection | null>(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [activeTab, setActiveTab] = useState('pending');

  // Grading state
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [teacherFeedback, setTeacherFeedback] = useState('');

  // Default grading rubric
  const gradingRubric: GradingRubric[] = [
    {
      criteria: 'Critical Thinking',
      description: 'Depth of analysis and reflection on the debate experience',
      maxScore: 4,
      levels: [
        { score: 4, label: 'Excellent', description: 'Deep, insightful analysis with clear connections' },
        { score: 3, label: 'Proficient', description: 'Good analysis with some insights' },
        { score: 2, label: 'Developing', description: 'Basic analysis with limited depth' },
        { score: 1, label: 'Beginning', description: 'Minimal analysis or reflection' }
      ]
    },
    {
      criteria: 'Self-Assessment',
      description: 'Honest evaluation of personal performance and learning',
      maxScore: 4,
      levels: [
        { score: 4, label: 'Excellent', description: 'Thorough, honest self-evaluation with specific examples' },
        { score: 3, label: 'Proficient', description: 'Good self-evaluation with some specifics' },
        { score: 2, label: 'Developing', description: 'Basic self-evaluation with general statements' },
        { score: 1, label: 'Beginning', description: 'Limited or superficial self-evaluation' }
      ]
    },
    {
      criteria: 'Growth Mindset',
      description: 'Identification of learning opportunities and future goals',
      maxScore: 4,
      levels: [
        { score: 4, label: 'Excellent', description: 'Clear learning goals with specific improvement strategies' },
        { score: 3, label: 'Proficient', description: 'Good identification of learning opportunities' },
        { score: 2, label: 'Developing', description: 'Basic recognition of areas for improvement' },
        { score: 1, label: 'Beginning', description: 'Limited awareness of learning opportunities' }
      ]
    },
    {
      criteria: 'Communication',
      description: 'Clarity and organization of written reflection',
      maxScore: 4,
      levels: [
        { score: 4, label: 'Excellent', description: 'Clear, well-organized, and engaging writing' },
        { score: 3, label: 'Proficient', description: 'Generally clear and organized writing' },
        { score: 2, label: 'Developing', description: 'Somewhat clear with minor organization issues' },
        { score: 1, label: 'Beginning', description: 'Unclear or poorly organized writing' }
      ]
    }
  ];

  useEffect(() => {
    loadReflections();
  }, [classId, userId]);

  const loadReflections = async () => {
    if (!userId || !classId) return;

    try {
      setLoading(true);
      
      const token = await getToken({ template: 'default' });
      const response = await fetch(`/api/reflections/class/${classId}/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReflections(data.reflections);
      } else {
        // Mock data for development
        const mockReflections: Reflection[] = [
          {
            id: '1',
            studentId: 'student1',
            student: {
              firstName: 'Sarah',
              lastName: 'Johnson',
              avatar: undefined
            },
            debateId: 'debate1',
            debateTitle: 'Gene Editing Ethics',
            content: `This debate really challenged my thinking about the ethical implications of gene editing. Initially, I was strongly in favor of genetic modifications for medical purposes, but after researching the opposing arguments and engaging with my debate partner, I've developed a more nuanced perspective.

The most surprising aspect was learning about the potential for genetic discrimination and how CRISPR technology could exacerbate social inequalities. I hadn't considered how genetic enhancements might create a "genetic class divide" where only wealthy families could afford improvements for their children.

My argument strategy evolved throughout the debate. I started with emotional appeals about saving lives through gene therapy, but I learned that logical arguments backed by scientific evidence were more persuasive. Next time, I want to prepare better counterarguments and anticipate my opponent's strongest points.

I feel I improved my research skills significantly, particularly in evaluating source credibility. The peer feedback helped me realize I need to work on my delivery - I tend to speak too quickly when nervous. Overall, this experience reinforced my interest in bioethics and made me more aware of the complexity of scientific policy decisions.`,
            submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            status: 'pending',
            aiAnalysis: {
              sentimentScore: 0.75,
              keyTopics: ['gene editing', 'ethics', 'social inequality', 'research skills', 'argument strategy'],
              qualityIndicators: {
                depth: 85,
                clarity: 78,
                insight: 82,
                evidence: 73
              },
              suggestions: [
                'Excellent self-reflection on changed perspectives',
                'Good identification of specific learning outcomes',
                'Could elaborate more on specific evidence sources used'
              ]
            }
          },
          {
            id: '2',
            studentId: 'student2',
            student: {
              firstName: 'Michael',
              lastName: 'Chen',
              avatar: undefined
            },
            debateId: 'debate2',
            debateTitle: 'Climate Change Solutions',
            content: `The climate change debate was interesting but I found it challenging to argue for nuclear energy when I personally have concerns about safety. I did okay but could have prepared better arguments.

I learned some new facts about renewable energy costs that I didn't know before. The other student had good points about wind and solar limitations that made me think differently about the topic.

I think I need to practice speaking more confidently and organizing my thoughts better. Sometimes I forgot my main points during the debate. The research part was easier for me than the actual debating.

Overall it was a good learning experience and I understand the topic better now.`,
            submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            status: 'pending',
            aiAnalysis: {
              sentimentScore: 0.45,
              keyTopics: ['nuclear energy', 'renewable energy', 'climate change', 'debate skills'],
              qualityIndicators: {
                depth: 52,
                clarity: 65,
                insight: 48,
                evidence: 41
              },
              suggestions: [
                'Reflection shows some self-awareness but lacks depth',
                'Could benefit from more specific examples and details',
                'Needs to elaborate on learning outcomes and future goals'
              ]
            }
          }
        ];
        setReflections(mockReflections);
      }
    } catch (error) {
      console.error('Failed to load reflections:', error);
      addNotification({
        type: 'error',
        title: 'Loading Error',
        message: 'Failed to load reflections. Please try again.',
        read: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGradeReflection = async () => {
    if (!selectedReflection || !userId) return;

    try {
      setGrading(true);

      const overallScore = Object.values(rubricScores).reduce((sum, score) => sum + score, 0);
      const maxScore = gradingRubric.length * 4;
      const percentageScore = (overallScore / maxScore) * 100;

      const gradeData = {
        reflectionId: selectedReflection.id,
        overallScore: percentageScore,
        rubricScores: gradingRubric.map(criterion => ({
          criteria: criterion.criteria,
          score: rubricScores[criterion.criteria] || 0,
          maxScore: criterion.maxScore,
          feedback: `Score: ${rubricScores[criterion.criteria] || 0}/${criterion.maxScore}`
        })),
        teacherFeedback,
        gradedAt: new Date(),
        gradedBy: userId
      };

      // In a real implementation, this would call the API
      // const response = await fetch(`/api/reflections/${selectedReflection.id}/grade`, {
      //   method: 'POST',
      //   headers: { 
      //     'Authorization': `Bearer ${token}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify(gradeData)
      // });

      // Update local state for demo
      setReflections(prev => prev.map(reflection => 
        reflection.id === selectedReflection.id 
          ? { ...reflection, status: 'graded', grade: gradeData }
          : reflection
      ));

      addNotification({
        type: 'success',
        title: 'Reflection Graded',
        message: `Successfully graded ${selectedReflection.student.firstName}'s reflection.`,
        read: false
      });

      // Reset grading state
      setSelectedReflection(null);
      setRubricScores({});
      setTeacherFeedback('');

    } catch (error) {
      console.error('Failed to grade reflection:', error);
      addNotification({
        type: 'error',
        title: 'Grading Failed',
        message: 'Failed to save grade. Please try again.',
        read: false
      });
    } finally {
      setGrading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending Review</Badge>;
      case 'graded':
        return <Badge variant="default">Graded</Badge>;
      case 'returned':
        return <Badge variant="outline">Returned</Badge>;
      case 'revised':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Revised</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getQualityBadge = (score: number) => {
    if (score >= 80) return <Badge variant="default" className="bg-green-100 text-green-800">High Quality</Badge>;
    if (score >= 60) return <Badge variant="secondary">Good Quality</Badge>;
    if (score >= 40) return <Badge variant="outline">Needs Improvement</Badge>;
    return <Badge variant="destructive">Poor Quality</Badge>;
  };

  const getRubricLevelColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-blue-600';
    if (score >= 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const calculateOverallScore = () => {
    const totalScore = Object.values(rubricScores).reduce((sum, score) => sum + score, 0);
    const maxScore = gradingRubric.length * 4;
    return maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  };

  const filteredReflections = reflections.filter(reflection => 
    filterStatus === 'all' || reflection.status === filterStatus
  );

  if (loading) {
    return <LoadingState message="Loading reflections..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Reflection Grading</h3>
          <p className="text-muted-foreground">
            Review and grade student reflections with rubric-based assessment
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reflections</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="graded">Graded</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Reflections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reflections.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {reflections.filter(r => r.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Graded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {reflections.filter(r => r.status === 'graded').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reflections.filter(r => r.grade).length > 0
                ? Math.round(
                    reflections
                      .filter(r => r.grade)
                      .reduce((sum, r) => sum + (r.grade?.overallScore || 0), 0) /
                    reflections.filter(r => r.grade).length
                  )
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reflections List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Reflections ({filteredReflections.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReflections.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No reflections found</h3>
              <p className="text-muted-foreground">
                No reflections match the selected filter criteria.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReflections.map((reflection) => (
                <Card key={reflection.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={reflection.student.avatar} />
                          <AvatarFallback>
                            {reflection.student.firstName[0]}{reflection.student.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-semibold">
                              {reflection.student.firstName} {reflection.student.lastName}
                            </span>
                            {getStatusBadge(reflection.status)}
                            {reflection.aiAnalysis && getQualityBadge(reflection.aiAnalysis.qualityIndicators.depth)}
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            <span className="font-medium">{reflection.debateTitle}</span> • 
                            Submitted {reflection.submittedAt.toLocaleDateString()}
                          </div>
                          <div className="text-sm line-clamp-2">
                            {reflection.content.substring(0, 200)}...
                          </div>
                          
                          {reflection.aiAnalysis && (
                            <div className="flex items-center space-x-4 mt-3 text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Brain className="h-3 w-3" />
                                <span>Depth: {reflection.aiAnalysis.qualityIndicators.depth}%</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Eye className="h-3 w-3" />
                                <span>Clarity: {reflection.aiAnalysis.qualityIndicators.clarity}%</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Lightbulb className="h-3 w-3" />
                                <span>Insight: {reflection.aiAnalysis.qualityIndicators.insight}%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        {reflection.grade && (
                          <div className="text-center">
                            <div className="text-lg font-bold">{reflection.grade.overallScore.toFixed(0)}%</div>
                            <div className="text-xs text-muted-foreground">Score</div>
                          </div>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant={reflection.status === 'pending' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                setSelectedReflection(reflection);
                                if (reflection.grade) {
                                  // Pre-populate scores if already graded
                                  const scores: Record<string, number> = {};
                                  reflection.grade.rubricScores.forEach(rs => {
                                    scores[rs.criteria] = rs.score;
                                  });
                                  setRubricScores(scores);
                                  setTeacherFeedback(reflection.grade.teacherFeedback);
                                }
                              }}
                            >
                              {reflection.status === 'pending' ? 'Grade' : 'Review'}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                Grade Reflection - {reflection.student.firstName} {reflection.student.lastName}
                              </DialogTitle>
                              <DialogDescription>
                                {reflection.debateTitle} • Submitted {reflection.submittedAt.toLocaleDateString()}
                              </DialogDescription>
                            </DialogHeader>
                            
                            <Tabs defaultValue="reflection" className="w-full">
                              <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="reflection">Reflection</TabsTrigger>
                                <TabsTrigger value="grading">Grading</TabsTrigger>
                                <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="reflection" className="space-y-4">
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-base">Student Reflection</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                      {reflection.content}
                                    </div>
                                  </CardContent>
                                </Card>
                              </TabsContent>
                              
                              <TabsContent value="grading" className="space-y-4">
                                {/* Rubric Grading */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                      <span>Rubric Assessment</span>
                                      <div className="text-lg font-bold">
                                        Overall Score: {calculateOverallScore().toFixed(0)}%
                                      </div>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-6">
                                    {gradingRubric.map((criterion) => (
                                      <div key={criterion.criteria} className="space-y-3">
                                        <div>
                                          <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-medium">{criterion.criteria}</h4>
                                            <span className={`font-bold ${getRubricLevelColor(rubricScores[criterion.criteria] || 0)}`}>
                                              {rubricScores[criterion.criteria] || 0}/{criterion.maxScore}
                                            </span>
                                          </div>
                                          <p className="text-sm text-muted-foreground mb-3">
                                            {criterion.description}
                                          </p>
                                          <div className="space-y-1">
                                            <Slider
                                              value={[rubricScores[criterion.criteria] || 0]}
                                              onValueChange={(value) => 
                                                setRubricScores(prev => ({
                                                  ...prev,
                                                  [criterion.criteria]: value[0]
                                                }))
                                              }
                                              max={criterion.maxScore}
                                              min={0}
                                              step={1}
                                              className="w-full"
                                            />
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                              {criterion.levels.map((level) => (
                                                <span key={level.score}>
                                                  {level.score}: {level.label}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </CardContent>
                                </Card>

                                {/* Teacher Feedback */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle>Teacher Feedback</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <Textarea
                                      placeholder="Provide detailed feedback to help the student improve..."
                                      value={teacherFeedback}
                                      onChange={(e) => setTeacherFeedback(e.target.value)}
                                      rows={6}
                                    />
                                  </CardContent>
                                </Card>

                                <div className="flex justify-end space-x-2">
                                  <Button variant="outline">
                                    Save Draft
                                  </Button>
                                  <Button onClick={handleGradeReflection} disabled={grading}>
                                    {grading ? 'Saving...' : 'Submit Grade'}
                                  </Button>
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="analysis" className="space-y-4">
                                {reflection.aiAnalysis ? (
                                  <>
                                    <Card>
                                      <CardHeader>
                                        <CardTitle>Quality Indicators</CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="grid gap-4 md:grid-cols-2">
                                          {Object.entries(reflection.aiAnalysis.qualityIndicators).map(([key, value]) => (
                                            <div key={key} className="space-y-2">
                                              <div className="flex items-center justify-between">
                                                <span className="capitalize font-medium">{key}</span>
                                                <span className="font-bold">{value}%</span>
                                              </div>
                                              <Progress value={value} />
                                            </div>
                                          ))}
                                        </div>
                                      </CardContent>
                                    </Card>

                                    <Card>
                                      <CardHeader>
                                        <CardTitle>Key Topics</CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="flex flex-wrap gap-2">
                                          {reflection.aiAnalysis.keyTopics.map((topic, index) => (
                                            <Badge key={index} variant="outline">
                                              {topic}
                                            </Badge>
                                          ))}
                                        </div>
                                      </CardContent>
                                    </Card>

                                    <Card>
                                      <CardHeader>
                                        <CardTitle>AI Suggestions</CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <ul className="space-y-2">
                                          {reflection.aiAnalysis.suggestions.map((suggestion, index) => (
                                            <li key={index} className="flex items-start space-x-2">
                                              <Lightbulb className="h-4 w-4 mt-0.5 text-blue-600" />
                                              <span className="text-sm">{suggestion}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </CardContent>
                                    </Card>
                                  </>
                                ) : (
                                  <Card>
                                    <CardContent className="pt-6">
                                      <div className="text-center py-8">
                                        <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-lg font-medium mb-2">No AI Analysis</h3>
                                        <p className="text-muted-foreground">
                                          AI analysis is not available for this reflection.
                                        </p>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}
                              </TabsContent>
                            </Tabs>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
