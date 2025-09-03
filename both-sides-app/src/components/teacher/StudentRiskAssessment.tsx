/**
 * Student Risk Assessment Component
 * 
 * Task 7.5.2: Identifies students at risk of disengagement or poor performance
 * with intervention recommendations and early warning systems.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Users, 
  TrendingDown, 
  TrendingUp,
  Clock,
  MessageCircle,
  Phone,
  Mail,
  Calendar,
  Target,
  CheckCircle2,
  Eye,
  Send,
  UserCheck,
  Heart,
  Brain,
  BookOpen,
  Zap
} from 'lucide-react';

interface StudentSummary {
  id: string;
  name: string;
  email: string;
  overallProgress: number;
  lastActivity: Date;
  completedReflections: number;
  averageQuality: number;
  riskLevel: 'low' | 'medium' | 'high';
  strengths: string[];
  needsAttention: string[];
  engagementTrend: 'improving' | 'stable' | 'declining';
}

interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: number; // 0-1 scale
}

interface InterventionStrategy {
  id: string;
  type: 'immediate' | 'short_term' | 'long_term';
  title: string;
  description: string;
  actions: string[];
  expectedOutcome: string;
  timeframe: string;
  effort: 'low' | 'medium' | 'high';
  priority: number; // 1-5 scale
}

interface StudentRiskProfile {
  studentId: string;
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  primaryRiskFactors: RiskFactor[];
  interventionStrategies: InterventionStrategy[];
  lastAssessment: Date;
  trendDirection: 'improving' | 'stable' | 'worsening';
  earlyWarnings: string[];
  supportNeeded: string[];
}

interface StudentRiskAssessmentProps {
  students: StudentSummary[];
  classId: string;
}

export function StudentRiskAssessment({ students, classId }: StudentRiskAssessmentProps) {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [interventionsTracked, setInterventionsTracked] = useState<string[]>([]);

  // Generate detailed risk profiles for students
  const riskProfiles = useMemo(() => {
    return students.map(student => generateRiskProfile(student));
  }, [students]);

  // Categorize students by risk level
  const categorizedStudents = useMemo(() => {
    const high = riskProfiles.filter(p => p.riskLevel === 'high');
    const medium = riskProfiles.filter(p => p.riskLevel === 'medium');
    const low = riskProfiles.filter(p => p.riskLevel === 'low');

    return { high, medium, low };
  }, [riskProfiles]);

  // Get class-wide risk statistics
  const riskStats = useMemo(() => {
    const totalStudents = riskProfiles.length;
    const highRisk = categorizedStudents.high.length;
    const mediumRisk = categorizedStudents.medium.length;
    const improving = riskProfiles.filter(p => p.trendDirection === 'improving').length;
    const worsening = riskProfiles.filter(p => p.trendDirection === 'worsening').length;

    return {
      totalStudents,
      highRisk,
      mediumRisk,
      improving,
      worsening,
      lowRisk: categorizedStudents.low.length
    };
  }, [riskProfiles, categorizedStudents]);

  const selectedStudentProfile = selectedStudent 
    ? riskProfiles.find(p => p.studentId === selectedStudent)
    : null;

  const handleImplementIntervention = (studentId: string, interventionId: string) => {
    // In a real app, this would make an API call
    console.log('Implementing intervention:', interventionId, 'for student:', studentId);
    setInterventionsTracked([...interventionsTracked, `${studentId}-${interventionId}`]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Student Risk Assessment</h2>
        <p className="text-muted-foreground">
          Early identification and intervention strategies for at-risk students
        </p>
      </div>

      {/* Risk Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">High Risk</p>
                <p className="text-2xl font-bold text-red-600">{riskStats.highRisk}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {riskStats.totalStudents > 0 
                ? Math.round((riskStats.highRisk / riskStats.totalStudents) * 100)
                : 0}% of class
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Medium Risk</p>
                <p className="text-2xl font-bold text-yellow-600">{riskStats.mediumRisk}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Monitor closely
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Improving</p>
                <p className="text-2xl font-bold text-green-600">{riskStats.improving}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Positive trajectory
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Needs Attention</p>
                <p className="text-2xl font-bold text-orange-600">{riskStats.worsening}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-500" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Declining performance
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Alerts */}
      {categorizedStudents.high.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Immediate Attention Required</AlertTitle>
          <AlertDescription>
            {categorizedStudents.high.length} student{categorizedStudents.high.length !== 1 ? 's' : ''} 
            {categorizedStudents.high.length === 1 ? ' is' : ' are'} at high risk and need immediate intervention.
            <div className="flex flex-wrap gap-2 mt-2">
              {categorizedStudents.high.slice(0, 3).map((profile) => {
                const student = students.find(s => s.id === profile.studentId);
                return (
                  <Button 
                    key={profile.studentId}
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedStudent(profile.studentId)}
                  >
                    {student?.name}
                  </Button>
                );
              })}
              {categorizedStudents.high.length > 3 && (
                <span className="text-sm">+{categorizedStudents.high.length - 3} more</span>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Risk Overview</TabsTrigger>
          <TabsTrigger value="high_risk">High Risk ({categorizedStudents.high.length})</TabsTrigger>
          <TabsTrigger value="interventions">Active Interventions</TabsTrigger>
          <TabsTrigger value="trends">Risk Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <RiskOverviewTab 
            categorizedStudents={categorizedStudents}
            students={students}
            onSelectStudent={setSelectedStudent}
          />
        </TabsContent>

        <TabsContent value="high_risk" className="space-y-6">
          <HighRiskTab 
            highRiskProfiles={categorizedStudents.high}
            students={students}
            onSelectStudent={setSelectedStudent}
            onImplementIntervention={handleImplementIntervention}
          />
        </TabsContent>

        <TabsContent value="interventions" className="space-y-6">
          <InterventionsTab 
            interventionsTracked={interventionsTracked}
            riskProfiles={riskProfiles}
            students={students}
          />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <TrendsTab riskStats={riskStats} />
        </TabsContent>
      </Tabs>

      {/* Student Detail Modal */}
      {selectedStudentProfile && (
        <StudentRiskDetailModal 
          profile={selectedStudentProfile}
          student={students.find(s => s.id === selectedStudentProfile.studentId)!}
          onClose={() => setSelectedStudent(null)}
          onImplementIntervention={handleImplementIntervention}
        />
      )}
    </div>
  );
}

interface RiskOverviewTabProps {
  categorizedStudents: {
    high: StudentRiskProfile[];
    medium: StudentRiskProfile[];
    low: StudentRiskProfile[];
  };
  students: StudentSummary[];
  onSelectStudent: (studentId: string) => void;
}

function RiskOverviewTab({ categorizedStudents, students, onSelectStudent }: RiskOverviewTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* High Risk Students */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span>High Risk</span>
          </CardTitle>
          <CardDescription>Students requiring immediate intervention</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {categorizedStudents.high.length > 0 ? (
            categorizedStudents.high.map((profile) => {
              const student = students.find(s => s.id === profile.studentId);
              return (
                <StudentRiskCard
                  key={profile.studentId}
                  profile={profile}
                  student={student!}
                  onSelect={() => onSelectStudent(profile.studentId)}
                />
              );
            })
          ) : (
            <div className="text-center py-4">
              <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <p className="text-sm text-muted-foreground">No high-risk students</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medium Risk Students */}
      <Card className="border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-yellow-700">
            <Clock className="h-5 w-5" />
            <span>Medium Risk</span>
          </CardTitle>
          <CardDescription>Students to monitor closely</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {categorizedStudents.medium.slice(0, 5).map((profile) => {
            const student = students.find(s => s.id === profile.studentId);
            return (
              <StudentRiskCard
                key={profile.studentId}
                profile={profile}
                student={student!}
                onSelect={() => onSelectStudent(profile.studentId)}
              />
            );
          })}
          {categorizedStudents.medium.length > 5 && (
            <p className="text-xs text-muted-foreground text-center">
              +{categorizedStudents.medium.length - 5} more students
            </p>
          )}
        </CardContent>
      </Card>

      {/* Low Risk Students */}
      <Card className="border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            <span>Low Risk</span>
          </CardTitle>
          <CardDescription>Students performing well</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="font-medium mb-2">
              {categorizedStudents.low.length} students on track
            </h3>
            <p className="text-sm text-muted-foreground">
              These students are meeting expectations and showing positive engagement
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface StudentRiskCardProps {
  profile: StudentRiskProfile;
  student: StudentSummary;
  onSelect: () => void;
}

function StudentRiskCard({ profile, student, onSelect }: StudentRiskCardProps) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-50 border-red-200';
      case 'medium': return 'bg-yellow-50 border-yellow-200';
      case 'low': return 'bg-green-50 border-green-200';
      default: return 'bg-gray-50';
    }
  };

  return (
    <div 
      className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${getRiskColor(profile.riskLevel)}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-medium text-sm">{student.name}</h4>
          <p className="text-xs text-muted-foreground">
            Risk Score: {profile.riskScore}/100
          </p>
        </div>
        <Badge 
          variant={profile.riskLevel === 'high' ? 'destructive' : 'secondary'}
          className="text-xs"
        >
          {profile.riskLevel}
        </Badge>
      </div>
      
      <Progress value={profile.riskScore} className="h-1 mb-2" />
      
      {profile.primaryRiskFactors.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium">Primary Risk Factors:</p>
          <div className="text-xs text-muted-foreground">
            {profile.primaryRiskFactors.slice(0, 2).map(factor => factor.factor).join(', ')}
            {profile.primaryRiskFactors.length > 2 && '...'}
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between mt-2">
        <div className="text-xs text-muted-foreground">
          Last assessed: {profile.lastAssessment.toLocaleDateString()}
        </div>
        <Button variant="outline" size="sm">
          <Eye className="h-3 w-3 mr-1" />
          Details
        </Button>
      </div>
    </div>
  );
}

interface HighRiskTabProps {
  highRiskProfiles: StudentRiskProfile[];
  students: StudentSummary[];
  onSelectStudent: (studentId: string) => void;
  onImplementIntervention: (studentId: string, interventionId: string) => void;
}

function HighRiskTab({ 
  highRiskProfiles, 
  students, 
  onSelectStudent, 
  onImplementIntervention 
}: HighRiskTabProps) {
  if (highRiskProfiles.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <h3 className="font-medium mb-2">No High-Risk Students</h3>
          <p className="text-sm text-muted-foreground">
            All students are currently performing within acceptable ranges
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {highRiskProfiles.map((profile) => {
        const student = students.find(s => s.id === profile.studentId);
        if (!student) return null;

        return (
          <Card key={profile.studentId} className="border-red-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{student.name}</CardTitle>
                  <CardDescription>
                    Risk Score: {profile.riskScore}/100 • Last Active: {student.lastActivity.toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge variant="destructive">High Risk</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Risk Factors */}
              <div>
                <h4 className="font-medium text-sm mb-2">Primary Risk Factors</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {profile.primaryRiskFactors.map((factor, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 rounded border">
                      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{factor.factor}</p>
                        <p className="text-xs text-muted-foreground">{factor.description}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(factor.impact * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Recommended Interventions */}
              <div>
                <h4 className="font-medium text-sm mb-2">Recommended Interventions</h4>
                <div className="space-y-2">
                  {profile.interventionStrategies.slice(0, 3).map((intervention) => (
                    <div key={intervention.id} className="flex items-center justify-between p-2 rounded border">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{intervention.title}</p>
                        <p className="text-xs text-muted-foreground">{intervention.description}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {intervention.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{intervention.timeframe}</span>
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => onImplementIntervention(profile.studentId, intervention.id)}
                      >
                        Implement
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => onSelectStudent(profile.studentId)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Full Assessment
                </Button>
                <Button variant="outline">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Student
                </Button>
                <Button variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Notify Parents
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Helper function to generate risk profiles
function generateRiskProfile(student: StudentSummary): StudentRiskProfile {
  // Calculate risk score based on multiple factors
  let riskScore = 0;
  const riskFactors: RiskFactor[] = [];

  // Factor 1: Low progress
  if (student.overallProgress < 0.6) {
    riskScore += 30;
    riskFactors.push({
      factor: 'Low Academic Progress',
      severity: student.overallProgress < 0.4 ? 'high' : 'medium',
      description: `Overall progress at ${Math.round(student.overallProgress * 100)}%`,
      impact: 0.3
    });
  }

  // Factor 2: Inactivity
  const daysSinceActivity = Math.floor((Date.now() - student.lastActivity.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceActivity > 7) {
    riskScore += 25;
    riskFactors.push({
      factor: 'Prolonged Inactivity',
      severity: daysSinceActivity > 14 ? 'high' : 'medium',
      description: `Last active ${daysSinceActivity} days ago`,
      impact: 0.25
    });
  }

  // Factor 3: Low reflection completion
  if (student.completedReflections < 3) {
    riskScore += 20;
    riskFactors.push({
      factor: 'Low Engagement',
      severity: student.completedReflections < 2 ? 'high' : 'medium',
      description: `Only ${student.completedReflections} reflections completed`,
      impact: 0.2
    });
  }

  // Factor 4: Declining trend
  if (student.engagementTrend === 'declining') {
    riskScore += 25;
    riskFactors.push({
      factor: 'Declining Performance',
      severity: 'high',
      description: 'Performance trending downward',
      impact: 0.25
    });
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high';
  if (riskScore >= 70) riskLevel = 'high';
  else if (riskScore >= 40) riskLevel = 'medium';
  else riskLevel = 'low';

  // Generate intervention strategies based on risk factors
  const interventionStrategies = generateInterventionStrategies(riskFactors, riskLevel);

  return {
    studentId: student.id,
    riskScore: Math.min(100, riskScore),
    riskLevel,
    primaryRiskFactors: riskFactors.sort((a, b) => b.impact - a.impact).slice(0, 3),
    interventionStrategies,
    lastAssessment: new Date(),
    trendDirection: student.engagementTrend === 'improving' ? 'improving' : 
                   student.engagementTrend === 'declining' ? 'worsening' : 'stable',
    earlyWarnings: generateEarlyWarnings(riskFactors),
    supportNeeded: student.needsAttention
  };
}

function generateInterventionStrategies(riskFactors: RiskFactor[], riskLevel: string): InterventionStrategy[] {
  const strategies: InterventionStrategy[] = [];

  // Academic support interventions
  if (riskFactors.some(f => f.factor === 'Low Academic Progress')) {
    strategies.push({
      id: 'academic_support',
      type: 'immediate',
      title: 'One-on-One Academic Support',
      description: 'Schedule individual tutoring sessions to address learning gaps',
      actions: [
        'Schedule weekly 30-minute support sessions',
        'Identify specific skill gaps',
        'Create personalized learning plan'
      ],
      expectedOutcome: 'Improved academic performance and confidence',
      timeframe: '2-4 weeks',
      effort: 'medium',
      priority: 5
    });
  }

  // Engagement interventions
  if (riskFactors.some(f => f.factor === 'Prolonged Inactivity' || f.factor === 'Low Engagement')) {
    strategies.push({
      id: 'engagement_boost',
      type: 'immediate',
      title: 'Re-engagement Activities',
      description: 'Implement targeted activities to increase student participation',
      actions: [
        'Assign high-interest debate topics',
        'Pair with engaged peer mentor',
        'Provide immediate feedback and recognition'
      ],
      expectedOutcome: 'Increased participation and motivation',
      timeframe: '1-2 weeks',
      effort: 'low',
      priority: 4
    });
  }

  // Communication interventions
  if (riskLevel === 'high') {
    strategies.push({
      id: 'family_communication',
      type: 'immediate',
      title: 'Family Communication',
      description: 'Reach out to parents/guardians about student concerns',
      actions: [
        'Schedule parent-teacher conference',
        'Discuss concerns and intervention plan',
        'Establish home-school communication protocol'
      ],
      expectedOutcome: 'Improved home-school collaboration and support',
      timeframe: '1 week',
      effort: 'low',
      priority: 3
    });
  }

  return strategies.sort((a, b) => b.priority - a.priority);
}

function generateEarlyWarnings(riskFactors: RiskFactor[]): string[] {
  return riskFactors
    .filter(f => f.severity === 'high')
    .map(f => `High severity: ${f.factor}`);
}

// Placeholder components
function InterventionsTab({ interventionsTracked, riskProfiles, students }: any) {
  return (
    <Card>
      <CardContent className="text-center py-8">
        <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">Active Interventions</h3>
        <p className="text-sm text-muted-foreground">
          {interventionsTracked.length} interventions being tracked
        </p>
      </CardContent>
    </Card>
  );
}

function TrendsTab({ riskStats }: { riskStats: any }) {
  return (
    <Card>
      <CardContent className="text-center py-8">
        <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">Risk Trends</h3>
        <p className="text-sm text-muted-foreground">
          Historical trend analysis coming soon
        </p>
      </CardContent>
    </Card>
  );
}

function StudentRiskDetailModal({ profile, student, onClose, onImplementIntervention }: any) {
  return null; // Placeholder - would implement detailed modal
}
