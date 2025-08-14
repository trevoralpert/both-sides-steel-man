/**
 * Phase 3 Task 3.3.2.4: Build Response Review and Editing System
 * Review mode, easy editing, consistency checking, and final confirmation
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Survey, SurveyQuestion, SaveResponseRequest } from '@/types/survey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Eye,
  RotateCcw,
  Save,
  BookOpen,
  TrendingUp,
  Users,
  Brain,
  Target,
  Clock,
  Star,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Info,
  Lightbulb,
  ShieldCheck
} from 'lucide-react';

interface ResponseReviewSystemProps {
  survey: Survey;
  responses: Map<string, SaveResponseRequest>;
  onEditResponse: (questionId: string, newResponse: SaveResponseRequest) => void;
  onDeleteResponse: (questionId: string) => void;
  onConfirmCompletion: () => void;
  onReturnToSurvey: (questionIndex?: number) => void;
  className?: string;
}

interface ConsistencyIssue {
  type: 'contradiction' | 'uncertainty' | 'incomplete' | 'outlier';
  severity: 'low' | 'medium' | 'high';
  questionIds: string[];
  title: string;
  description: string;
  suggestion: string;
}

interface SectionSummary {
  name: string;
  displayName: string;
  completed: number;
  total: number;
  averageConfidence: number;
  issues: ConsistencyIssue[];
}

export function ResponseReviewSystem({
  survey,
  responses,
  onEditResponse,
  onDeleteResponse,
  onConfirmCompletion,
  onReturnToSurvey,
  className = ''
}: ResponseReviewSystemProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [consistencyIssues, setConsistencyIssues] = useState<ConsistencyIssue[]>([]);
  const [sectionSummaries, setSectionSummaries] = useState<SectionSummary[]>([]);

  // Analyze responses for consistency and completeness
  useEffect(() => {
    const issues = analyzeConsistency(survey, responses);
    const summaries = generateSectionSummaries(survey, responses, issues);
    
    setConsistencyIssues(issues);
    setSectionSummaries(summaries);
  }, [survey, responses]);

  const completionRate = (responses.size / survey.questions.length) * 100;
  const averageConfidence = Array.from(responses.values())
    .reduce((sum, r) => sum + (r.confidence_level || 3), 0) / Math.max(responses.size, 1);

  const highSeverityIssues = consistencyIssues.filter(i => i.severity === 'high').length;
  const mediumSeverityIssues = consistencyIssues.filter(i => i.severity === 'medium').length;

  const toggleSectionExpanded = (sectionName: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName);
    } else {
      newExpanded.add(sectionName);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <div className={`max-w-6xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <BookOpen className="h-6 w-6 text-blue-600" />
            Review Your Responses
          </CardTitle>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Before we create your belief profile, let's review what you've shared</span>
            <Badge variant={completionRate >= 80 ? 'default' : 'secondary'}>
              {Math.round(completionRate)}% Complete
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Target className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{responses.size}</span>
            </div>
            <div className="text-xs text-muted-foreground">Questions Answered</div>
            <Progress value={completionRate} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{averageConfidence.toFixed(1)}</span>
            </div>
            <div className="text-xs text-muted-foreground">Average Confidence</div>
            <div className="text-xs text-green-600 mt-1">
              {averageConfidence >= 4 ? 'Very Sure' : averageConfidence >= 3 ? 'Confident' : 'Uncertain'}
            </div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">{sectionSummaries.length}</span>
            </div>
            <div className="text-xs text-muted-foreground">Sections Covered</div>
            <div className="text-xs text-purple-600 mt-1">
              {sectionSummaries.filter(s => s.completed > 0).length} Active
            </div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              {highSeverityIssues > 0 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="text-2xl font-bold text-red-600">{highSeverityIssues}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold text-green-600">✓</span>
                </>
              )}
            </div>
            <div className="text-xs text-muted-foreground">Quality Check</div>
            <div className="text-xs text-green-600 mt-1">
              {highSeverityIssues === 0 ? 'Looks Great!' : 'Needs Review'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Review Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sections">By Section</TabsTrigger>
          <TabsTrigger value="issues">
            Issues {(highSeverityIssues + mediumSeverityIssues > 0) && 
            <Badge variant="destructive" className="ml-2 text-xs">
              {highSeverityIssues + mediumSeverityIssues}
            </Badge>}
          </TabsTrigger>
          <TabsTrigger value="final">Final Review</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab 
            sectionSummaries={sectionSummaries}
            onEditSection={(sectionName) => {
              setActiveTab('sections');
              toggleSectionExpanded(sectionName);
            }}
          />
        </TabsContent>

        <TabsContent value="sections">
          <SectionReviewTab 
            survey={survey}
            responses={responses}
            sectionSummaries={sectionSummaries}
            expandedSections={expandedSections}
            onToggleExpanded={toggleSectionExpanded}
            onEditResponse={onEditResponse}
            onReturnToQuestion={onReturnToSurvey}
          />
        </TabsContent>

        <TabsContent value="issues">
          <IssuesTab 
            issues={consistencyIssues}
            survey={survey}
            responses={responses}
            onResolveIssue={(questionIds) => {
              if (questionIds.length > 0) {
                const questionIndex = survey.questions.findIndex(q => q.id === questionIds[0]);
                onReturnToSurvey(questionIndex);
              }
            }}
          />
        </TabsContent>

        <TabsContent value="final">
          <FinalReviewTab 
            completionRate={completionRate}
            averageConfidence={averageConfidence}
            highSeverityIssues={highSeverityIssues}
            totalResponses={responses.size}
            onConfirm={onConfirmCompletion}
            onContinueSurvey={() => onReturnToSurvey()}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({ 
  sectionSummaries, 
  onEditSection 
}: {
  sectionSummaries: SectionSummary[];
  onEditSection: (sectionName: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sectionSummaries.map((section) => {
          const completionRate = (section.completed / section.total) * 100;
          const hasIssues = section.issues.length > 0;
          
          return (
            <Card key={section.name} className={hasIssues ? 'border-yellow-200' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{section.displayName}</CardTitle>
                  {hasIssues && (
                    <Badge variant="outline" className="text-yellow-700">
                      {section.issues.length} issue{section.issues.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{section.completed} / {section.total}</span>
                </div>
                <Progress value={completionRate} className="h-2" />
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Avg. Confidence</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span className="font-medium">{section.averageConfidence.toFixed(1)}/5</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onEditSection(section.name)}
                  className="w-full mt-3"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Review Responses
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SectionReviewTab({ 
  survey,
  responses,
  sectionSummaries,
  expandedSections,
  onToggleExpanded,
  onEditResponse,
  onReturnToQuestion
}: {
  survey: Survey;
  responses: Map<string, SaveResponseRequest>;
  sectionSummaries: SectionSummary[];
  expandedSections: Set<string>;
  onToggleExpanded: (section: string) => void;
  onEditResponse: (questionId: string, response: SaveResponseRequest) => void;
  onReturnToQuestion: (questionIndex: number) => void;
}) {
  const getQuestionsBySection = (sectionName: string) => {
    return survey.questions.filter(q => (q.section || 'general') === sectionName);
  };

  return (
    <div className="space-y-4">
      {sectionSummaries.map((section) => {
        const isExpanded = expandedSections.has(section.name);
        const questions = getQuestionsBySection(section.name);
        
        return (
          <Card key={section.name}>
            <CardHeader className="cursor-pointer" onClick={() => onToggleExpanded(section.name)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <CardTitle className="text-lg">{section.displayName}</CardTitle>
                  <Badge variant="secondary">
                    {section.completed}/{section.total}
                  </Badge>
                </div>
                {section.issues.length > 0 && (
                  <Badge variant="outline" className="text-yellow-700">
                    {section.issues.length} issue{section.issues.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            {isExpanded && (
              <CardContent className="space-y-3">
                {questions.map((question, index) => {
                  const response = responses.get(question.id);
                  const questionIndex = survey.questions.findIndex(q => q.id === question.id);
                  
                  return (
                    <div key={question.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium mb-1">
                            Q{questionIndex + 1}: {question.question}
                          </div>
                          {response ? (
                            <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                              <strong>Your response:</strong> {formatResponse(response.response_value, question.type)}
                              <div className="text-xs text-green-600 mt-1">
                                Confidence: {response.confidence_level}/5 • 
                                Time: {Math.round(response.completion_time / 1000)}s
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
                              No response provided
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onReturnToQuestion(questionIndex)}
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function IssuesTab({ 
  issues, 
  survey, 
  responses, 
  onResolveIssue 
}: {
  issues: ConsistencyIssue[];
  survey: Survey;
  responses: Map<string, SaveResponseRequest>;
  onResolveIssue: (questionIds: string[]) => void;
}) {
  if (issues.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-green-800 mb-2">All Clear! 🎉</h3>
          <p className="text-green-700">
            Your responses look consistent and complete. No issues detected.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getSeverityColor = (severity: ConsistencyIssue['severity']) => {
    switch (severity) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-blue-200 bg-blue-50';
    }
  };

  const getSeverityIcon = (severity: ConsistencyIssue['severity']) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'low': return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-4">
      {issues.map((issue, index) => (
        <Alert key={index} className={`${getSeverityColor(issue.severity)} border`}>
          {getSeverityIcon(issue.severity)}
          <AlertDescription>
            <div className="space-y-3">
              <div>
                <div className="font-medium text-sm mb-1 flex items-center gap-2">
                  {issue.title}
                  <Badge variant="secondary" className="text-xs">
                    {issue.severity} priority
                  </Badge>
                </div>
                <div className="text-sm mb-2">{issue.description}</div>
                <div className="text-xs text-muted-foreground">
                  💡 {issue.suggestion}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onResolveIssue(issue.questionIds)}
                className="w-fit"
              >
                Review Questions
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

function FinalReviewTab({
  completionRate,
  averageConfidence,
  highSeverityIssues,
  totalResponses,
  onConfirm,
  onContinueSurvey
}: {
  completionRate: number;
  averageConfidence: number;
  highSeverityIssues: number;
  totalResponses: number;
  onConfirm: () => void;
  onContinueSurvey: () => void;
}) {
  const readyForCompletion = completionRate >= 70 && highSeverityIssues === 0;
  
  return (
    <div className="space-y-6">
      <Card className={`${readyForCompletion ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {readyForCompletion ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            )}
            {readyForCompletion ? 'Ready for Profile Generation!' : 'Almost Ready...'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-lg">{Math.round(completionRate)}%</div>
              <div className="text-muted-foreground">Completion Rate</div>
              {completionRate >= 70 ? (
                <Badge className="mt-1 bg-green-100 text-green-800">Sufficient</Badge>
              ) : (
                <Badge variant="outline" className="mt-1">Needs More</Badge>
              )}
            </div>
            
            <div className="text-center">
              <div className="font-medium text-lg">{averageConfidence.toFixed(1)}/5</div>
              <div className="text-muted-foreground">Avg. Confidence</div>
              <Badge className="mt-1 bg-blue-100 text-blue-800">
                {averageConfidence >= 3 ? 'Confident' : 'Uncertain'}
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="font-medium text-lg">{highSeverityIssues}</div>
              <div className="text-muted-foreground">Critical Issues</div>
              {highSeverityIssues === 0 ? (
                <Badge className="mt-1 bg-green-100 text-green-800">Clean</Badge>
              ) : (
                <Badge variant="destructive" className="mt-1">Needs Fix</Badge>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">What happens next?</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>• Your responses will be analyzed to create your belief profile</div>
              <div>• We'll generate your ideology scores across multiple dimensions</div>
              <div>• AI will create a personalized belief summary</div>
              <div>• You'll be matched with suitable debate partners</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        {!readyForCompletion && (
          <Button variant="outline" onClick={onContinueSurvey} className="flex-1">
            <Edit3 className="h-4 w-4 mr-2" />
            Continue Survey
          </Button>
        )}
        
        <Button 
          onClick={onConfirm} 
          disabled={!readyForCompletion}
          className="flex-1"
        >
          <Brain className="h-4 w-4 mr-2" />
          Generate Belief Profile
        </Button>
      </div>
    </div>
  );
}

// Helper functions
function analyzeConsistency(survey: Survey, responses: Map<string, SaveResponseRequest>): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  
  // Check for missing required questions
  const missingRequired = survey.questions
    .filter(q => q.required && !responses.has(q.id))
    .map(q => q.id);
  
  if (missingRequired.length > 0) {
    issues.push({
      type: 'incomplete',
      severity: 'high',
      questionIds: missingRequired,
      title: 'Missing Required Responses',
      description: `${missingRequired.length} required questions haven't been answered yet.`,
      suggestion: 'Complete these questions to ensure accurate profile generation.'
    });
  }

  // Check for low confidence responses
  const lowConfidenceResponses = Array.from(responses.entries())
    .filter(([_, response]) => (response.confidence_level || 3) <= 2)
    .map(([questionId, _]) => questionId);
  
  if (lowConfidenceResponses.length >= 3) {
    issues.push({
      type: 'uncertainty',
      severity: 'medium',
      questionIds: lowConfidenceResponses,
      title: 'Many Uncertain Responses',
      description: `You marked ${lowConfidenceResponses.length} responses as uncertain.`,
      suggestion: 'Consider revisiting these questions if you have stronger opinions now.'
    });
  }

  return issues;
}

function generateSectionSummaries(
  survey: Survey, 
  responses: Map<string, SaveResponseRequest>,
  issues: ConsistencyIssue[]
): SectionSummary[] {
  const sectionMap = new Map<string, SurveyQuestion[]>();
  
  // Group questions by section
  survey.questions.forEach(question => {
    const section = question.section || 'general';
    if (!sectionMap.has(section)) {
      sectionMap.set(section, []);
    }
    sectionMap.get(section)!.push(question);
  });

  return Array.from(sectionMap.entries()).map(([sectionName, questions]) => {
    const completed = questions.filter(q => responses.has(q.id)).length;
    const sectionResponses = questions
      .filter(q => responses.has(q.id))
      .map(q => responses.get(q.id)!);
    
    const averageConfidence = sectionResponses.length > 0
      ? sectionResponses.reduce((sum, r) => sum + (r.confidence_level || 3), 0) / sectionResponses.length
      : 0;

    const sectionIssues = issues.filter(issue => 
      issue.questionIds.some(id => questions.some(q => q.id === id))
    );

    return {
      name: sectionName,
      displayName: getSectionDisplayName(sectionName),
      completed,
      total: questions.length,
      averageConfidence,
      issues: sectionIssues
    };
  });
}

function getSectionDisplayName(sectionName: string): string {
  const displayNames: Record<string, string> = {
    'economic_beliefs': '💰 Economic Views',
    'social_values': '🤝 Social Values', 
    'government_role': '🏛️ Government Role',
    'environment_global': '🌍 Global Issues',
    'personal_flexibility': '🧠 Personal Reflection',
    'open_reflection': '💭 Open Questions',
    'general': '📋 General Questions'
  };
  
  return displayNames[sectionName] || sectionName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatResponse(responseValue: any, questionType: string): string {
  if (questionType === 'TEXT_RESPONSE') {
    return typeof responseValue === 'string' 
      ? `"${responseValue.slice(0, 100)}${responseValue.length > 100 ? '...' : ''}"`
      : String(responseValue);
  }
  
  if (questionType === 'LIKERT_SCALE') {
    const labels = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
    return labels[responseValue - 1] || String(responseValue);
  }

  if (questionType === 'BINARY_CHOICE') {
    return responseValue === true ? 'Yes' : 'No';
  }

  if (Array.isArray(responseValue)) {
    return responseValue.join(', ');
  }
  
  return String(responseValue);
}
