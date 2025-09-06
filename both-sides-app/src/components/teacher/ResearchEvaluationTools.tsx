/**
 * Research and Evaluation Tools Component
 * 
 * Task 8.5.5: Educational research data collection and anonymization,
 * A/B testing framework for feature evaluation, academic outcome tracking
 */

'use client';

import React, { useState, useEffect } from 'react';

import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
  TestTube,
  FlaskConical,
  BarChart3,
  Target,
  Users,
  Clock,
  Calendar,
  Download,
  Upload,
  Settings,
  Play,
  Pause,
  Square,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Copy,
  Share2,
  FileText,
  Database,
  Shield,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  Activity,
  Award,
  BookOpen,
  GraduationCap,
  MoreHorizontal,
  Lightbulb,
  Globe
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter
} from 'recharts';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface ResearchStudy {
  id: string;
  title: string;
  description: string;
  research_type: ResearchType;
  status: StudyStatus;
  principal_investigator: string;
  participants: StudyParticipant[];
  data_collection: DataCollection;
  ethics_approval: EthicsApproval;
  timeline: StudyTimeline;
  outcomes: ResearchOutcome[];
  publications: Publication[];
  created_at: Date;
  updated_at: Date;
}

type ResearchType = 'experimental' | 'observational' | 'longitudinal' | 'cross_sectional' | 'case_study' | 'meta_analysis';
type StudyStatus = 'design' | 'ethics_review' | 'recruiting' | 'active' | 'analysis' | 'completed' | 'published';

interface StudyParticipant {
  id: string;
  anonymized_id: string;
  demographic_data: AnonymizedDemographics;
  consent_status: ConsentStatus;
  participation_timeline: ParticipationEvent[];
  data_points: DataPoint[];
}

interface AnonymizedDemographics {
  age_group: string;
  education_level: string;
  geographic_region: string;
  experience_level: string;
  [key: string]: any;
}

interface ConsentStatus {
  data_collection: boolean;
  data_analysis: boolean;
  publication: boolean;
  longitudinal_tracking: boolean;
  withdrawal_date?: Date;
}

interface ParticipationEvent {
  event_type: string;
  timestamp: Date;
  data_collected: string[];
  completion_status: 'completed' | 'partial' | 'skipped';
}

interface DataPoint {
  metric: string;
  value: any;
  timestamp: Date;
  collection_method: string;
  validated: boolean;
}

interface DataCollection {
  methods: CollectionMethod[];
  anonymization_protocol: AnonymizationProtocol;
  data_retention: DataRetentionPolicy;
  quality_controls: QualityControl[];
}

interface CollectionMethod {
  method_id: string;
  method_name: string;
  frequency: string;
  automated: boolean;
  data_types: string[];
  validation_rules: ValidationRule[];
}

interface AnonymizationProtocol {
  pii_handling: PIIHandling;
  identifier_mapping: boolean;
  aggregation_thresholds: { [key: string]: number };
  differential_privacy: boolean;
  k_anonymity_level: number;
}

interface PIIHandling {
  removal_fields: string[];
  hashing_fields: string[];
  generalization_rules: { [key: string]: string };
}

interface DataRetentionPolicy {
  raw_data_retention_months: number;
  anonymized_data_retention_months: number;
  automatic_deletion: boolean;
  export_before_deletion: boolean;
}

interface QualityControl {
  control_type: 'validation' | 'verification' | 'audit' | 'monitoring';
  frequency: string;
  criteria: string[];
  automated_checks: boolean;
}

interface ValidationRule {
  field: string;
  rule_type: 'range' | 'format' | 'required' | 'custom';
  parameters: any;
  error_message: string;
}

interface EthicsApproval {
  irb_approval: boolean;
  approval_number?: string;
  approval_date?: Date;
  expiry_date?: Date;
  conditions: string[];
  amendments: Amendment[];
}

interface Amendment {
  amendment_id: string;
  description: string;
  approval_date: Date;
  impact_assessment: string;
}

interface StudyTimeline {
  start_date: Date;
  end_date: Date;
  milestones: Milestone[];
  current_phase: string;
  completion_percentage: number;
}

interface Milestone {
  milestone_id: string;
  title: string;
  description: string;
  target_date: Date;
  completion_date?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
}

interface ResearchOutcome {
  outcome_id: string;
  outcome_name: string;
  measurement_type: 'quantitative' | 'qualitative' | 'mixed';
  primary_outcome: boolean;
  results: OutcomeResult[];
  statistical_analysis: StatisticalAnalysis;
}

interface OutcomeResult {
  measurement_time: Date;
  value: number;
  confidence_interval: [number, number];
  sample_size: number;
  effect_size?: number;
}

interface StatisticalAnalysis {
  test_type: string;
  p_value: number;
  effect_size: number;
  confidence_level: number;
  power_analysis: PowerAnalysis;
}

interface PowerAnalysis {
  statistical_power: number;
  minimum_detectable_effect: number;
  required_sample_size: number;
  actual_sample_size: number;
}

interface Publication {
  publication_id: string;
  title: string;
  authors: string[];
  journal: string;
  publication_date: Date;
  doi?: string;
  status: 'draft' | 'submitted' | 'under_review' | 'accepted' | 'published';
}

interface ABTest {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  feature_tested: string;
  variants: TestVariant[];
  allocation: AllocationStrategy;
  metrics: TestMetric[];
  status: ABTestStatus;
  sample_size: SampleSize;
  duration: TestDuration;
  results: TestResults;
  statistical_analysis: StatisticalTestAnalysis;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

type ABTestStatus = 'draft' | 'review' | 'active' | 'paused' | 'completed' | 'cancelled';

interface TestVariant {
  variant_id: string;
  name: string;
  description: string;
  configuration: any;
  allocation_percentage: number;
  is_control: boolean;
}

interface AllocationStrategy {
  strategy_type: 'random' | 'stratified' | 'blocked' | 'adaptive';
  randomization_unit: 'user' | 'session' | 'class' | 'school';
  stratification_factors?: string[];
  balance_constraints?: { [key: string]: number };
}

interface TestMetric {
  metric_id: string;
  metric_name: string;
  metric_type: 'primary' | 'secondary' | 'guardrail';
  measurement_method: string;
  expected_direction: 'increase' | 'decrease' | 'no_change';
  minimum_detectable_effect: number;
  baseline_value?: number;
}

interface SampleSize {
  target_sample_size: number;
  current_sample_size: number;
  power_analysis: PowerAnalysis;
  recruitment_rate: number;
  expected_completion_date: Date;
}

interface TestDuration {
  planned_start: Date;
  planned_end: Date;
  actual_start?: Date;
  actual_end?: Date;
  minimum_runtime_days: number;
  maximum_runtime_days: number;
}

interface TestResults {
  variant_results: VariantResults[];
  overall_results: OverallResults;
  segment_analysis: SegmentAnalysis[];
  time_series: TimeSeriesPoint[];
}

interface VariantResults {
  variant_id: string;
  sample_size: number;
  conversion_rate: number;
  confidence_interval: [number, number];
  relative_improvement: number;
  statistical_significance: boolean;
}

interface OverallResults {
  winner: string;
  confidence_level: number;
  p_value: number;
  effect_size: number;
  practical_significance: boolean;
  recommendation: string;
}

interface SegmentAnalysis {
  segment_name: string;
  segment_filter: any;
  results: VariantResults[];
  insights: string[];
}

interface TimeSeriesPoint {
  date: Date;
  variant_id: string;
  metric_value: number;
  cumulative_significance: boolean;
}

interface StatisticalTestAnalysis {
  test_method: string;
  assumptions_met: boolean;
  corrections_applied: string[];
  sensitivity_analysis: SensitivityAnalysis;
}

interface SensitivityAnalysis {
  outlier_impact: number;
  missing_data_impact: number;
  alternative_methods: AlternativeMethod[];
}

interface AlternativeMethod {
  method_name: string;
  result: number;
  interpretation: string;
}

interface ResearchEvaluationToolsProps {
  organizationId?: string;
  canConductResearch?: boolean;
  canRunABTests?: boolean;
  canViewResults?: boolean;
  canExportData?: boolean;
}

export function ResearchEvaluationTools({
  organizationId,
  canConductResearch = false,
  canRunABTests = false,
  canViewResults = true,
  canExportData = false
}: ResearchEvaluationToolsProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('studies');
  const [researchStudies, setResearchStudies] = useState<ResearchStudy[]>([]);
  const [abTests, setABTests] = useState<ABTest[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialog states
  const [showStudyDialog, setShowStudyDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<ResearchStudy | null>(null);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);

  useEffect(() => {
    if (canViewResults) {
      loadResearchData();
    }
  }, [canViewResults]);

  const loadResearchData = async () => {
    setIsLoading(true);
    
    // Mock research studies
    const mockStudies: ResearchStudy[] = [
      {
        id: 'study_1',
        title: 'Impact of Debate Frequency on Critical Thinking Development',
        description: 'Longitudinal study examining the relationship between debate participation frequency and critical thinking skill improvement',
        research_type: 'longitudinal',
        status: 'active',
        principal_investigator: 'Dr. Sarah Chen',
        participants: [],
        data_collection: {
          methods: [
            {
              method_id: 'method_1',
              method_name: 'Critical Thinking Assessment',
              frequency: 'monthly',
              automated: true,
              data_types: ['assessment_scores', 'response_patterns'],
              validation_rules: [
                {
                  field: 'score',
                  rule_type: 'range',
                  parameters: { min: 0, max: 100 },
                  error_message: 'Score must be between 0 and 100'
                }
              ]
            }
          ],
          anonymization_protocol: {
            pii_handling: {
              removal_fields: ['name', 'email', 'student_id'],
              hashing_fields: ['user_id'],
              generalization_rules: { 'age': 'age_group', 'location': 'region' }
            },
            identifier_mapping: true,
            aggregation_thresholds: { 'minimum_group_size': 5 },
            differential_privacy: true,
            k_anonymity_level: 3
          },
          data_retention: {
            raw_data_retention_months: 24,
            anonymized_data_retention_months: 60,
            automatic_deletion: true,
            export_before_deletion: true
          },
          quality_controls: [
            {
              control_type: 'validation',
              frequency: 'daily',
              criteria: ['completeness', 'consistency', 'accuracy'],
              automated_checks: true
            }
          ]
        },
        ethics_approval: {
          irb_approval: true,
          approval_number: 'IRB-2024-001',
          approval_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          expiry_date: new Date(Date.now() + 305 * 24 * 60 * 60 * 1000),
          conditions: [
            'Maintain participant anonymity',
            'Provide opt-out mechanism',
            'Regular progress reports to IRB'
          ],
          amendments: []
        },
        timeline: {
          start_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          end_date: new Date(Date.now() + 320 * 24 * 60 * 60 * 1000),
          milestones: [
            {
              milestone_id: 'milestone_1',
              title: 'Baseline Data Collection',
              description: 'Complete initial assessments for all participants',
              target_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              completion_date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
              status: 'completed'
            }
          ],
          current_phase: 'Data Collection',
          completion_percentage: 35
        },
        outcomes: [
          {
            outcome_id: 'outcome_1',
            outcome_name: 'Critical Thinking Score Improvement',
            measurement_type: 'quantitative',
            primary_outcome: true,
            results: [
              {
                measurement_time: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                value: 74.2,
                confidence_interval: [71.8, 76.6],
                sample_size: 247,
                effect_size: 0.42
              }
            ],
            statistical_analysis: {
              test_type: 'mixed_effects_model',
              p_value: 0.003,
              effect_size: 0.42,
              confidence_level: 95,
              power_analysis: {
                statistical_power: 0.85,
                minimum_detectable_effect: 0.3,
                required_sample_size: 200,
                actual_sample_size: 247
              }
            }
          }
        ],
        publications: [],
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ];

    // Mock A/B tests
    const mockTests: ABTest[] = [
      {
        id: 'test_1',
        name: 'AI Coaching Feature Effectiveness',
        description: 'Testing the impact of AI-powered coaching suggestions on student engagement and performance',
        hypothesis: 'Students receiving AI coaching will show 15% higher engagement and 10% better performance',
        feature_tested: 'ai_coaching_system',
        variants: [
          {
            variant_id: 'control',
            name: 'Control (No AI Coaching)',
            description: 'Standard platform experience without AI coaching',
            configuration: { ai_coaching_enabled: false },
            allocation_percentage: 50,
            is_control: true
          },
          {
            variant_id: 'treatment',
            name: 'AI Coaching Enabled',
            description: 'Platform with AI coaching suggestions and feedback',
            configuration: { ai_coaching_enabled: true },
            allocation_percentage: 50,
            is_control: false
          }
        ],
        allocation: {
          strategy_type: 'random',
          randomization_unit: 'user',
          stratification_factors: ['experience_level', 'class_type']
        },
        metrics: [
          {
            metric_id: 'engagement_rate',
            metric_name: 'Session Engagement Rate',
            metric_type: 'primary',
            measurement_method: 'automated_tracking',
            expected_direction: 'increase',
            minimum_detectable_effect: 0.15,
            baseline_value: 0.67
          },
          {
            metric_id: 'performance_score',
            metric_name: 'Debate Performance Score',
            metric_type: 'primary',
            measurement_method: 'assessment_rubric',
            expected_direction: 'increase',
            minimum_detectable_effect: 0.10,
            baseline_value: 78.5
          }
        ],
        status: 'active',
        sample_size: {
          target_sample_size: 500,
          current_sample_size: 347,
          power_analysis: {
            statistical_power: 0.8,
            minimum_detectable_effect: 0.15,
            required_sample_size: 450,
            actual_sample_size: 347
          },
          recruitment_rate: 15.2,
          expected_completion_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        },
        duration: {
          planned_start: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
          planned_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          actual_start: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
          minimum_runtime_days: 28,
          maximum_runtime_days: 56
        },
        results: {
          variant_results: [
            {
              variant_id: 'control',
              sample_size: 174,
              conversion_rate: 0.67,
              confidence_interval: [0.62, 0.72],
              relative_improvement: 0,
              statistical_significance: false
            },
            {
              variant_id: 'treatment',
              sample_size: 173,
              conversion_rate: 0.78,
              confidence_interval: [0.73, 0.83],
              relative_improvement: 0.164,
              statistical_significance: true
            }
          ],
          overall_results: {
            winner: 'treatment',
            confidence_level: 95,
            p_value: 0.012,
            effect_size: 0.164,
            practical_significance: true,
            recommendation: 'Deploy AI coaching feature to all users'
          },
          segment_analysis: [],
          time_series: []
        },
        statistical_analysis: {
          test_method: 'two_proportion_z_test',
          assumptions_met: true,
          corrections_applied: ['bonferroni_correction'],
          sensitivity_analysis: {
            outlier_impact: 0.02,
            missing_data_impact: 0.01,
            alternative_methods: [
              {
                method_name: 'fisher_exact_test',
                result: 0.0089,
                interpretation: 'Confirms statistical significance'
              }
            ]
          }
        },
        created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
        created_by: 'research_team'
      }
    ];

    setResearchStudies(mockStudies);
    setABTests(mockTests);
    setIsLoading(false);
  };

  const createNewStudy = () => {
    if (!canConductResearch) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to create research studies.'
      });
      return;
    }
    setShowStudyDialog(true);
  };

  const createNewTest = () => {
    if (!canRunABTests) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to create A/B tests.'
      });
      return;
    }
    setShowTestDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (!canViewResults) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You do not have permission to view research and evaluation tools.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <TestTube className="h-5 w-5 mr-2" />
            Research & Evaluation Tools
          </h3>
          <p className="text-sm text-muted-foreground">
            Educational research, A/B testing, and academic outcome tracking
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {canExportData && (
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={createNewStudy}>
                <FlaskConical className="h-4 w-4 mr-2" />
                Research Study
              </DropdownMenuItem>
              <DropdownMenuItem onClick={createNewTest}>
                <TestTube className="h-4 w-4 mr-2" />
                A/B Test
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search studies and tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="studies">Research Studies ({researchStudies.length})</TabsTrigger>
          <TabsTrigger value="abtests">A/B Tests ({abTests.length})</TabsTrigger>
          <TabsTrigger value="outcomes">Academic Outcomes</TabsTrigger>
        </TabsList>

        <TabsContent value="studies" className="space-y-4">
          {researchStudies.map((study) => (
            <Card key={study.id} className="transition-all hover:shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                      <FlaskConical className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold">{study.title}</h3>
                        <Badge className={getStatusColor(study.status)}>
                          {study.status}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {study.research_type.replace('_', ' ')}
                        </Badge>
                        {study.ethics_approval.irb_approval && (
                          <Badge variant="outline" className="text-green-600">
                            IRB Approved
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{study.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>PI: {study.principal_investigator}</span>
                        <span>Phase: {study.timeline.current_phase}</span>
                        <span>Progress: {study.timeline.completion_percentage}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedStudy(study)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {canConductResearch && (
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Study
                        </DropdownMenuItem>
                      )}
                      {canExportData && (
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Export Data
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem>
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Report
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mb-4">
                  <Progress value={study.timeline.completion_percentage} className="mb-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Started: {study.timeline.start_date.toLocaleDateString()}</span>
                    <span>Expected End: {study.timeline.end_date.toLocaleDateString()}</span>
                  </div>
                </div>

                {study.outcomes.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {study.outcomes.slice(0, 2).map((outcome) => (
                      <div key={outcome.outcome_id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <h5 className="text-sm font-medium text-blue-800">{outcome.outcome_name}</h5>
                          {outcome.primary_outcome && (
                            <Badge variant="outline" className="text-xs text-blue-600">Primary</Badge>
                          )}
                        </div>
                        {outcome.results.length > 0 && (
                          <div className="text-xs text-blue-700">
                            <div>Latest: {outcome.results[outcome.results.length - 1].value.toFixed(1)}</div>
                            <div>Effect Size: {outcome.statistical_analysis.effect_size.toFixed(2)}</div>
                            <div>p = {outcome.statistical_analysis.p_value.toFixed(3)}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    <span>Ethics: {study.ethics_approval.approval_number || 'Pending'}</span>
                    <Database className="h-3 w-3" />
                    <span>Participants: {study.participants.length}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedStudy(study)}>
                      <Eye className="h-3 w-3 mr-1" />
                      Details
                    </Button>
                    <Button size="sm" variant="outline">
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Results
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="abtests" className="space-y-4">
          {abTests.map((test) => (
            <Card key={test.id} className="transition-all hover:shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-lg bg-green-50 text-green-600">
                      <TestTube className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold">{test.name}</h3>
                        <Badge className={getStatusColor(test.status)}>
                          {test.status}
                        </Badge>
                        {test.results.overall_results.statistical_significance && (
                          <Badge variant="outline" className="text-green-600">
                            Significant
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{test.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>Feature: {test.feature_tested}</span>
                        <span>Sample: {test.sample_size.current_sample_size}/{test.sample_size.target_sample_size}</span>
                        <span>Runtime: {Math.ceil((Date.now() - test.duration.actual_start!.getTime()) / (1000 * 60 * 60 * 24))} days</span>
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedTest(test)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Results
                      </DropdownMenuItem>
                      {canRunABTests && (
                        <>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Test
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause Test
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Export Results
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Sample Size Progress</span>
                    <span className="text-sm font-medium">
                      {test.sample_size.current_sample_size} / {test.sample_size.target_sample_size}
                    </span>
                  </div>
                  <Progress 
                    value={(test.sample_size.current_sample_size / test.sample_size.target_sample_size) * 100} 
                    className="mb-2"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2 mb-4">
                  {test.results.variant_results.map((variant) => {
                    const variantInfo = test.variants.find(v => v.variant_id === variant.variant_id);
                    return (
                      <div key={variant.variant_id} className={`border rounded-lg p-3 ${
                        variantInfo?.is_control ? 'bg-gray-50' : 'bg-blue-50'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-medium">{variantInfo?.name}</h5>
                          {variant.statistical_significance && (
                            <Badge variant="outline" className="text-xs text-green-600">
                              Significant
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>Conversion:</span>
                            <span className="font-medium">{(variant.conversion_rate * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sample Size:</span>
                            <span>{variant.sample_size}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Improvement:</span>
                            <span className={variant.relative_improvement > 0 ? 'text-green-600' : 'text-red-600'}>
                              {variant.relative_improvement > 0 ? '+' : ''}{(variant.relative_improvement * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {test.results.overall_results.winner && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <h5 className="text-sm font-medium text-green-800">Test Results</h5>
                    </div>
                    <p className="text-sm text-green-700 mb-2">{test.results.overall_results.recommendation}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs text-green-600">
                      <div>Winner: {test.variants.find(v => v.variant_id === test.results.overall_results.winner)?.name}</div>
                      <div>p-value: {test.results.overall_results.p_value.toFixed(3)}</div>
                      <div>Effect: {(test.results.overall_results.effect_size * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-xs text-muted-foreground">
                    Hypothesis: {test.hypothesis.substring(0, 60)}...
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedTest(test)}>
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Results
                    </Button>
                    {canRunABTests && test.status === 'active' && (
                      <Button size="sm" variant="outline">
                        <Square className="h-3 w-3 mr-1" />
                        Stop Test
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="outcomes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Academic Outcome Tracking</CardTitle>
              <CardDescription>
                Monitor and analyze educational effectiveness and student progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">84.7%</div>
                  <div className="text-sm text-muted-foreground">Critical Thinking Improvement</div>
                  <div className="text-xs text-green-600 mt-1">↑ 12.3% vs baseline</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">92.1%</div>
                  <div className="text-sm text-muted-foreground">Student Engagement</div>
                  <div className="text-xs text-green-600 mt-1">↑ 18.7% vs baseline</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">78.5%</div>
                  <div className="text-sm text-muted-foreground">Knowledge Retention</div>
                  <div className="text-xs text-green-600 mt-1">↑ 8.9% vs baseline</div>
                </div>
              </div>
              
              <div className="mt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[
                    { month: 'Jan', critical_thinking: 72, engagement: 78, retention: 74 },
                    { month: 'Feb', critical_thinking: 75, engagement: 81, retention: 76 },
                    { month: 'Mar', critical_thinking: 79, engagement: 85, retention: 77 },
                    { month: 'Apr', critical_thinking: 82, engagement: 89, retention: 78 },
                    { month: 'May', critical_thinking: 84, engagement: 92, retention: 79 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="critical_thinking" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="engagement" stroke="#8b5cf6" strokeWidth={2} />
                    <Line type="monotone" dataKey="retention" stroke="#f59e0b" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Study Details Dialog */}
      <Dialog open={!!selectedStudy} onOpenChange={() => setSelectedStudy(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedStudy?.title}</DialogTitle>
            <DialogDescription>
              Research study details and progress
            </DialogDescription>
          </DialogHeader>
          {selectedStudy && (
            <div className="text-center py-12">
              <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Study Details</h3>
              <p className="text-muted-foreground">
                Detailed study information would be displayed here
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedStudy(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Results Dialog */}
      <Dialog open={!!selectedTest} onOpenChange={() => setSelectedTest(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedTest?.name}</DialogTitle>
            <DialogDescription>
              A/B test results and statistical analysis
            </DialogDescription>
          </DialogHeader>
          {selectedTest && (
            <div className="text-center py-12">
              <TestTube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Test Results</h3>
              <p className="text-muted-foreground">
                Detailed test results and analysis would be displayed here
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTest(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
