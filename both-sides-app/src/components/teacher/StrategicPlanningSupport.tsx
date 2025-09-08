/**
 * Strategic Planning Support Component
 * 
 * Task 8.5.5: Long-term trend forecasting and capacity planning,
 * ROI analysis and educational impact measurement, platform growth analytics
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
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Target,
  Users,
  Building,
  Globe,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Award,
  Clock,
  Search,
  Filter,
  Download,
  RefreshCw,
  Settings,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  Plus,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Gauge,
  Zap,
  Star,
  MapPin,
  Calculator,
  FileText,
  Briefcase,
  GraduationCap
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
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
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface TrendForecast {
  id: string;
  metric_name: string;
  forecast_type: ForecastType;
  time_horizon: TimeHorizon;
  current_value: number;
  forecasted_values: ForecastPoint[];
  confidence_intervals: ConfidenceInterval[];
  key_drivers: Driver[];
  scenario_analysis: Scenario[];
  accuracy_metrics: AccuracyMetric[];
  assumptions: string[];
  last_updated: Date;
}

type ForecastType = 'linear' | 'exponential' | 'seasonal' | 'machine_learning' | 'hybrid';
type TimeHorizon = '3_months' | '6_months' | '1_year' | '2_years' | '5_years';

interface ForecastPoint {
  date: Date;
  predicted_value: number;
  lower_bound: number;
  upper_bound: number;
  factors: string[];
}

interface ConfidenceInterval {
  confidence_level: number;
  lower_bound: number;
  upper_bound: number;
}

interface Driver {
  factor_name: string;
  influence_weight: number;
  trend_direction: 'increasing' | 'decreasing' | 'stable';
  controllability: 'high' | 'medium' | 'low';
  impact_description: string;
}

interface Scenario {
  scenario_name: string;
  scenario_type: 'optimistic' | 'baseline' | 'pessimistic' | 'custom';
  probability: number;
  key_assumptions: string[];
  projected_outcomes: { [key: string]: number };
  strategic_implications: string[];
}

interface AccuracyMetric {
  metric_type: 'mape' | 'rmse' | 'mae' | 'r_squared';
  value: number;
  benchmark: number;
  interpretation: string;
}

interface ROIAnalysis {
  id: string;
  initiative_name: string;
  category: ROICategory;
  investment: InvestmentBreakdown;
  returns: ReturnBreakdown;
  timeline: ROITimeline;
  roi_metrics: ROIMetrics;
  risk_assessment: RiskAssessment;
  sensitivity_analysis: SensitivityAnalysis;
  educational_impact: EducationalImpact;
  status: ROIStatus;
}

type ROICategory = 'technology' | 'content' | 'infrastructure' | 'staffing' | 'marketing' | 'research';
type ROIStatus = 'planned' | 'in_progress' | 'completed' | 'on_hold';

interface InvestmentBreakdown {
  total_investment: number;
  categories: { [key: string]: number };
  phased_investments: PhasedInvestment[];
  recurring_costs: { [key: string]: number };
  opportunity_costs: number;
}

interface PhasedInvestment {
  phase_name: string;
  amount: number;
  timeline: string;
  deliverables: string[];
}

interface ReturnBreakdown {
  quantitative_returns: { [key: string]: number };
  qualitative_benefits: QualitativeBenefit[];
  cost_savings: { [key: string]: number };
  revenue_increases: { [key: string]: number };
  productivity_gains: { [key: string]: number };
}

interface QualitativeBenefit {
  benefit_name: string;
  description: string;
  impact_level: 'high' | 'medium' | 'low';
  measurement_approach: string;
  stakeholder_value: string[];
}

interface ROITimeline {
  payback_period_months: number;
  break_even_date: Date;
  value_realization_timeline: ValueRealization[];
  milestones: ROIMilestone[];
}

interface ValueRealization {
  period: string;
  cumulative_roi: number;
  period_roi: number;
  confidence_level: number;
}

interface ROIMilestone {
  milestone_name: string;
  target_date: Date;
  value_target: number;
  success_metrics: string[];
}

interface ROIMetrics {
  roi_percentage: number;
  net_present_value: number;
  internal_rate_of_return: number;
  profitability_index: number;
  cost_benefit_ratio: number;
  payback_period: number;
}

interface RiskAssessment {
  overall_risk_level: 'low' | 'medium' | 'high';
  risk_factors: RiskFactor[];
  mitigation_strategies: MitigationStrategy[];
  contingency_plans: ContingencyPlan[];
}

interface RiskFactor {
  risk_name: string;
  probability: number;
  impact: number;
  risk_score: number;
  category: 'technical' | 'market' | 'operational' | 'financial';
  description: string;
}

interface MitigationStrategy {
  strategy_name: string;
  target_risks: string[];
  implementation_cost: number;
  effectiveness: number;
  timeline: string;
}

interface ContingencyPlan {
  trigger_condition: string;
  response_actions: string[];
  resource_requirements: { [key: string]: number };
  decision_authority: string;
}

interface SensitivityAnalysis {
  key_variables: SensitivityVariable[];
  scenario_outcomes: { [key: string]: number };
  break_even_analysis: BreakEvenPoint[];
  tornado_chart_data: TornadoData[];
}

interface SensitivityVariable {
  variable_name: string;
  base_value: number;
  range: [number, number];
  roi_impact: number;
  confidence_level: number;
}

interface BreakEvenPoint {
  variable_name: string;
  break_even_value: number;
  current_value: number;
  buffer_percentage: number;
}

interface TornadoData {
  variable: string;
  low_impact: number;
  high_impact: number;
  range: number;
}

interface EducationalImpact {
  learning_outcomes: OutcomeMetric[];
  engagement_metrics: EngagementMetric[];
  accessibility_improvements: AccessibilityMetric[];
  scalability_benefits: ScalabilityBenefit[];
  innovation_indicators: InnovationIndicator[];
}

interface OutcomeMetric {
  outcome_name: string;
  baseline_value: number;
  target_improvement: number;
  measurement_method: string;
  validation_approach: string;
}

interface EngagementMetric {
  metric_name: string;
  current_value: number;
  projected_value: number;
  improvement_percentage: number;
  confidence_level: number;
}

interface AccessibilityMetric {
  accessibility_area: string;
  current_compliance: number;
  target_compliance: number;
  beneficiary_count: number;
  impact_description: string;
}

interface ScalabilityBenefit {
  benefit_type: string;
  scale_factor: number;
  efficiency_gain: number;
  cost_reduction_per_unit: number;
  description: string;
}

interface InnovationIndicator {
  indicator_name: string;
  measurement_approach: string;
  baseline_score: number;
  target_score: number;
  innovation_impact: string;
}

interface CapacityPlan {
  id: string;
  plan_name: string;
  planning_horizon: string;
  current_capacity: CapacityMetrics;
  projected_demand: DemandProjection[];
  capacity_gaps: CapacityGap[];
  expansion_plans: ExpansionPlan[];
  optimization_opportunities: OptimizationOpportunity[];
  resource_requirements: ResourceRequirement[];
  cost_projections: CostProjection[];
}

interface CapacityMetrics {
  user_capacity: number;
  session_capacity: number;
  content_capacity: number;
  infrastructure_capacity: InfrastructureCapacity;
  staff_capacity: StaffCapacity;
}

interface InfrastructureCapacity {
  server_capacity: number;
  storage_capacity: number;
  bandwidth_capacity: number;
  utilization_rates: { [key: string]: number };
}

interface StaffCapacity {
  teaching_staff: number;
  support_staff: number;
  development_staff: number;
  capacity_utilization: number;
}

interface DemandProjection {
  time_period: string;
  projected_users: number;
  projected_sessions: number;
  projected_content_volume: number;
  demand_drivers: string[];
  confidence_level: number;
}

interface CapacityGap {
  resource_type: string;
  gap_size: number;
  gap_percentage: number;
  impact_severity: 'low' | 'medium' | 'high' | 'critical';
  timeline_to_crisis: string;
  mitigation_options: string[];
}

interface ExpansionPlan {
  expansion_type: string;
  capacity_increase: number;
  implementation_timeline: string;
  investment_required: number;
  dependencies: string[];
  risk_factors: string[];
}

interface OptimizationOpportunity {
  opportunity_name: string;
  potential_capacity_gain: number;
  implementation_effort: 'low' | 'medium' | 'high';
  cost_impact: number;
  timeline: string;
}

interface ResourceRequirement {
  resource_type: string;
  current_allocation: number;
  required_allocation: number;
  acquisition_timeline: string;
  cost_estimate: number;
}

interface CostProjection {
  cost_category: string;
  current_cost: number;
  projected_cost: number;
  cost_drivers: string[];
  optimization_potential: number;
}

interface StrategicPlanningProps {
  organizationId?: string;
  canViewForecasts?: boolean;
  canCreatePlans?: boolean;
  canModifyPlans?: boolean;
  showAdvancedAnalytics?: boolean;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];

export function StrategicPlanningSupport({
  organizationId,
  canViewForecasts = true,
  canCreatePlans = false,
  canModifyPlans = false,
  showAdvancedAnalytics = false
}: StrategicPlanningProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('forecasting');
  const [trendForecasts, setTrendForecasts] = useState<TrendForecast[]>([]);
  const [roiAnalyses, setROIAnalyses] = useState<ROIAnalysis[]>([]);
  const [capacityPlans, setCapacityPlans] = useState<CapacityPlan[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeHorizonFilter, setTimeHorizonFilter] = useState<string>('all');
  
  // Dialog states
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);

  useEffect(() => {
    if (canViewForecasts) {
      loadStrategicData();
    }
  }, [canViewForecasts]);

  const loadStrategicData = async () => {
    setIsLoading(true);
    
    // Mock trend forecasts
    const mockForecasts: TrendForecast[] = [
      {
        id: 'forecast_1',
        metric_name: 'Platform User Growth',
        forecast_type: 'machine_learning',
        time_horizon: '2_years',
        current_value: 2847,
        forecasted_values: [
          {
            date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            predicted_value: 3120,
            lower_bound: 2980,
            upper_bound: 3260,
            factors: ['seasonal_uptick', 'marketing_campaign', 'product_improvements']
          },
          {
            date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            predicted_value: 3650,
            lower_bound: 3420,
            upper_bound: 3880,
            factors: ['word_of_mouth_growth', 'feature_releases', 'market_expansion']
          },
          {
            date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
            predicted_value: 4300,
            lower_bound: 3950,
            upper_bound: 4650,
            factors: ['partnership_integrations', 'enterprise_adoption', 'international_expansion']
          }
        ],
        confidence_intervals: [
          { confidence_level: 95, lower_bound: 3950, upper_bound: 4650 },
          { confidence_level: 80, lower_bound: 4100, upper_bound: 4500 }
        ],
        key_drivers: [
          {
            factor_name: 'Feature Innovation Rate',
            influence_weight: 0.35,
            trend_direction: 'increasing',
            controllability: 'high',
            impact_description: 'New feature releases drive 35% of user acquisition'
          },
          {
            factor_name: 'Market Competition',
            influence_weight: 0.25,
            trend_direction: 'increasing',
            controllability: 'medium',
            impact_description: 'Increased competition may slow growth by 25%'
          }
        ],
        scenario_analysis: [
          {
            scenario_name: 'Accelerated Growth',
            scenario_type: 'optimistic',
            probability: 0.25,
            key_assumptions: ['Successful product launch', 'Viral marketing success'],
            projected_outcomes: { 'users_6_months': 5200, 'revenue_growth': 45 },
            strategic_implications: ['Scale infrastructure rapidly', 'Hire aggressively']
          }
        ],
        accuracy_metrics: [
          {
            metric_type: 'mape',
            value: 8.3,
            benchmark: 15.0,
            interpretation: 'Model performs well with 8.3% mean error'
          }
        ],
        assumptions: [
          'Current growth drivers remain consistent',
          'No major platform disruptions',
          'Market conditions remain stable'
        ],
        last_updated: new Date()
      }
    ];

    // Mock ROI analyses
    const mockROI: ROIAnalysis[] = [
      {
        id: 'roi_1',
        initiative_name: 'AI-Powered Personalization System',
        category: 'technology',
        investment: {
          total_investment: 250000,
          categories: {
            'Development': 150000,
            'Infrastructure': 75000,
            'Training': 25000
          },
          phased_investments: [
            {
              phase_name: 'Phase 1: Core Development',
              amount: 150000,
              timeline: '6 months',
              deliverables: ['ML model development', 'API integration', 'Initial testing']
            }
          ],
          recurring_costs: {
            'Infrastructure': 5000,
            'Maintenance': 3000
          },
          opportunity_costs: 50000
        },
        returns: {
          quantitative_returns: {
            'Increased Retention Revenue': 180000,
            'Reduced Churn Cost': 95000,
            'Improved Engagement Value': 120000
          },
          qualitative_benefits: [
            {
              benefit_name: 'Enhanced User Experience',
              description: 'Personalized learning paths improve satisfaction',
              impact_level: 'high',
              measurement_approach: 'User surveys and engagement metrics',
              stakeholder_value: ['Students', 'Teachers', 'Administrators']
            }
          ],
          cost_savings: {
            'Support Ticket Reduction': 25000,
            'Content Creation Efficiency': 40000
          },
          revenue_increases: {
            'Premium Subscription Uplift': 85000,
            'Enterprise Contract Growth': 150000
          },
          productivity_gains: {
            'Teacher Time Savings': 65000,
            'Content Optimization': 35000
          }
        },
        timeline: {
          payback_period_months: 18,
          break_even_date: new Date(Date.now() + 18 * 30 * 24 * 60 * 60 * 1000),
          value_realization_timeline: [
            {
              period: 'Year 1',
              cumulative_roi: -15,
              period_roi: -15,
              confidence_level: 85
            },
            {
              period: 'Year 2',
              cumulative_roi: 35,
              period_roi: 50,
              confidence_level: 80
            }
          ],
          milestones: [
            {
              milestone_name: 'MVP Launch',
              target_date: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000),
              value_target: 50000,
              success_metrics: ['User adoption rate', 'Engagement improvement']
            }
          ]
        },
        roi_metrics: {
          roi_percentage: 158,
          net_present_value: 145000,
          internal_rate_of_return: 23.5,
          profitability_index: 1.58,
          cost_benefit_ratio: 2.58,
          payback_period: 18
        },
        risk_assessment: {
          overall_risk_level: 'medium',
          risk_factors: [
            {
              risk_name: 'Technology Integration Complexity',
              probability: 0.3,
              impact: 7,
              risk_score: 2.1,
              category: 'technical',
              description: 'Complex ML integration may cause delays'
            }
          ],
          mitigation_strategies: [
            {
              strategy_name: 'Phased Implementation',
              target_risks: ['Technology Integration Complexity'],
              implementation_cost: 15000,
              effectiveness: 70,
              timeline: '3 months'
            }
          ],
          contingency_plans: [
            {
              trigger_condition: 'Development delay > 3 months',
              response_actions: ['Simplify initial scope', 'Add development resources'],
              resource_requirements: { 'Budget': 50000, 'Staff': 2 },
              decision_authority: 'CTO'
            }
          ]
        },
        sensitivity_analysis: {
          key_variables: [
            {
              variable_name: 'User Adoption Rate',
              base_value: 0.65,
              range: [0.45, 0.85],
              roi_impact: 45,
              confidence_level: 80
            }
          ],
          scenario_outcomes: {
            'Conservative': 89,
            'Base Case': 158,
            'Optimistic': 234
          },
          break_even_analysis: [
            {
              variable_name: 'Retention Improvement',
              break_even_value: 0.12,
              current_value: 0.18,
              buffer_percentage: 50
            }
          ],
          tornado_chart_data: [
            {
              variable: 'Adoption Rate',
              low_impact: -45,
              high_impact: 67,
              range: 112
            }
          ]
        },
        educational_impact: {
          learning_outcomes: [
            {
              outcome_name: 'Critical Thinking Improvement',
              baseline_value: 72,
              target_improvement: 15,
              measurement_method: 'Standardized assessments',
              validation_approach: 'Control group comparison'
            }
          ],
          engagement_metrics: [
            {
              metric_name: 'Session Completion Rate',
              current_value: 78,
              projected_value: 89,
              improvement_percentage: 14.1,
              confidence_level: 85
            }
          ],
          accessibility_improvements: [
            {
              accessibility_area: 'Learning Disabilities Support',
              current_compliance: 75,
              target_compliance: 95,
              beneficiary_count: 340,
              impact_description: 'Personalized pacing and content difficulty'
            }
          ],
          scalability_benefits: [
            {
              benefit_type: 'Automated Personalization',
              scale_factor: 2.3,
              efficiency_gain: 40,
              cost_reduction_per_unit: 15,
              description: 'System scales without proportional staff increase'
            }
          ],
          innovation_indicators: [
            {
              indicator_name: 'Pedagogical Innovation Score',
              measurement_approach: 'Expert panel review + outcome metrics',
              baseline_score: 6.2,
              target_score: 8.5,
              innovation_impact: 'Establishes platform as educational leader'
            }
          ]
        },
        status: 'in_progress'
      }
    ];

    // Mock capacity plans
    const mockCapacity: CapacityPlan[] = [
      {
        id: 'capacity_1',
        plan_name: '2024-2026 Platform Scaling Plan',
        planning_horizon: '2 years',
        current_capacity: {
          user_capacity: 5000,
          session_capacity: 500,
          content_capacity: 10000,
          infrastructure_capacity: {
            server_capacity: 80,
            storage_capacity: 500,
            bandwidth_capacity: 1000,
            utilization_rates: {
              'CPU': 65,
              'Memory': 58,
              'Storage': 45,
              'Network': 72
            }
          },
          staff_capacity: {
            teaching_staff: 25,
            support_staff: 8,
            development_staff: 12,
            capacity_utilization: 78
          }
        },
        projected_demand: [
          {
            time_period: 'Q2 2024',
            projected_users: 6500,
            projected_sessions: 650,
            projected_content_volume: 13000,
            demand_drivers: ['Marketing campaign', 'Partnership launches'],
            confidence_level: 85
          }
        ],
        capacity_gaps: [
          {
            resource_type: 'Session Capacity',
            gap_size: 150,
            gap_percentage: 30,
            impact_severity: 'high',
            timeline_to_crisis: '4 months',
            mitigation_options: ['Scale infrastructure', 'Optimize session management']
          }
        ],
        expansion_plans: [
          {
            expansion_type: 'Infrastructure Scaling',
            capacity_increase: 100,
            implementation_timeline: '3 months',
            investment_required: 75000,
            dependencies: ['Cloud provider negotiations', 'Architecture updates'],
            risk_factors: ['Migration complexity', 'Performance impact']
          }
        ],
        optimization_opportunities: [
          {
            opportunity_name: 'Session Load Balancing',
            potential_capacity_gain: 25,
            implementation_effort: 'medium',
            cost_impact: -15000,
            timeline: '6 weeks'
          }
        ],
        resource_requirements: [
          {
            resource_type: 'Cloud Infrastructure',
            current_allocation: 8000,
            required_allocation: 12000,
            acquisition_timeline: '2 months',
            cost_estimate: 48000
          }
        ],
        cost_projections: [
          {
            cost_category: 'Infrastructure',
            current_cost: 15000,
            projected_cost: 22000,
            cost_drivers: ['Usage growth', 'Feature complexity'],
            optimization_potential: 3000
          }
        ]
      }
    ];

    setTrendForecasts(mockForecasts);
    setROIAnalyses(mockROI);
    setCapacityPlans(mockCapacity);
    setIsLoading(false);
  };

  if (!canViewForecasts) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You do not have permission to view strategic planning tools.
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
            <TrendingUp className="h-5 w-5 mr-2" />
            Strategic Planning Support
          </h3>
          <p className="text-sm text-muted-foreground">
            Long-term forecasting, ROI analysis, and capacity planning
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadStrategicData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {canCreatePlans && (
            <Button onClick={() => setShowPlanDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Analysis
            </Button>
          )}
        </div>
      </div>

      {/* Key Strategic Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">158%</div>
                <div className="text-xs text-muted-foreground">Projected ROI</div>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600 ml-1">AI Initiative</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-green-50 text-green-600">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">4,300</div>
                <div className="text-xs text-muted-foreground">Forecasted Users</div>
                <div className="flex items-center mt-1">
                  <Clock className="h-3 w-3 text-blue-600" />
                  <span className="text-xs text-blue-600 ml-1">6 months</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">18mo</div>
                <div className="text-xs text-muted-foreground">Payback Period</div>
                <div className="flex items-center mt-1">
                  <Target className="h-3 w-3 text-purple-600" />
                  <span className="text-xs text-purple-600 ml-1">On target</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Calculator className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">78%</div>
                <div className="text-xs text-muted-foreground">Capacity Utilization</div>
                <div className="flex items-center mt-1">
                  <AlertTriangle className="h-3 w-3 text-yellow-600" />
                  <span className="text-xs text-yellow-600 ml-1">Monitor closely</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-yellow-50 text-yellow-600">
                <Gauge className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="forecasting">Trend Forecasting</TabsTrigger>
          <TabsTrigger value="roi">ROI Analysis</TabsTrigger>
          <TabsTrigger value="capacity">Capacity Planning</TabsTrigger>
        </TabsList>

        <TabsContent value="forecasting" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>User Growth Forecast</CardTitle>
                <CardDescription>
                  Machine learning-powered prediction with confidence intervals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={[
                    { month: 'Current', actual: 2847, forecast: null, lower: null, upper: null },
                    { month: 'Month 1', actual: null, forecast: 3120, lower: 2980, upper: 3260 },
                    { month: 'Month 3', actual: null, forecast: 3650, lower: 3420, upper: 3880 },
                    { month: 'Month 6', actual: null, forecast: 4300, lower: 3950, upper: 4650 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="actual" fill="#3b82f6" name="Historical" />
                    <Line type="monotone" dataKey="forecast" stroke="#22c55e" strokeWidth={3} name="Forecast" />
                    <Area dataKey="upper" stackId="confidence" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} name="Upper Bound" />
                    <Area dataKey="lower" stackId="confidence" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} name="Lower Bound" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Growth Drivers Analysis</CardTitle>
                <CardDescription>
                  Key factors influencing platform growth
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={[
                    { factor: 'Feature Innovation', current: 8.5, target: 9.2 },
                    { factor: 'Market Position', current: 7.2, target: 8.5 },
                    { factor: 'User Satisfaction', current: 8.1, target: 8.8 },
                    { factor: 'Content Quality', current: 8.8, target: 9.0 },
                    { factor: 'Technical Performance', current: 7.9, target: 8.6 },
                    { factor: 'Competitive Advantage', current: 7.5, target: 8.3 }
                  ]}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="factor" />
                    <PolarRadiusAxis domain={[0, 10]} />
                    <Radar name="Current" dataKey="current" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Radar name="Target" dataKey="target" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Forecast Details */}
          {trendForecasts.map((forecast) => (
            <Card key={forecast.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{forecast.metric_name}</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="capitalize">
                      {forecast.forecast_type.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline">
                      {forecast.time_horizon.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-3">Key Forecasts</h4>
                    <div className="space-y-3">
                      {forecast.forecasted_values.slice(0, 3).map((point, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div>
                            <div className="font-medium text-blue-800">
                              {point.date.toLocaleDateString()}
                            </div>
                            <div className="text-xs text-blue-600">
                              Range: {point.lower_bound.toLocaleString()} - {point.upper_bound.toLocaleString()}
                            </div>
                          </div>
                          <div className="text-2xl font-bold text-blue-800">
                            {point.predicted_value.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Key Drivers</h4>
                    <div className="space-y-2">
                      {forecast.key_drivers.map((driver, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              driver.trend_direction === 'increasing' ? 'bg-green-500' :
                              driver.trend_direction === 'decreasing' ? 'bg-red-500' : 'bg-gray-500'
                            }`} />
                            <span className="text-sm font-medium">{driver.factor_name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(driver.influence_weight * 100).toFixed(0)}% influence
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="roi" className="space-y-6">
          {roiAnalyses.map((roi) => (
            <Card key={roi.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{roi.initiative_name}</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="capitalize">{roi.category}</Badge>
                    <Badge className={
                      roi.status === 'completed' ? 'bg-green-500' :
                      roi.status === 'in_progress' ? 'bg-blue-500' :
                      roi.status === 'planned' ? 'bg-yellow-500' : 'bg-gray-500'
                    }>
                      {roi.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{roi.roi_metrics.roi_percentage}%</div>
                    <div className="text-xs text-muted-foreground">ROI</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      ${roi.roi_metrics.net_present_value.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">NPV</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{roi.roi_metrics.internal_rate_of_return}%</div>
                    <div className="text-xs text-muted-foreground">IRR</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{roi.timeline.payback_period_months}mo</div>
                    <div className="text-xs text-muted-foreground">Payback</div>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-3">Investment Breakdown</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <RechartsPieChart>
                        <Pie
                          data={Object.entries(roi.investment.categories).map(([key, value]) => ({
                            name: key,
                            value,
                            color: COLORS[Object.keys(roi.investment.categories).indexOf(key) % COLORS.length]
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          {Object.entries(roi.investment.categories).map(([key, value], index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Value Realization Timeline</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <RechartsLineChart data={roi.timeline.value_realization_timeline}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="cumulative_roi" 
                          stroke="#22c55e" 
                          strokeWidth={3}
                          name="Cumulative ROI (%)"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="period_roi" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          name="Period ROI (%)"
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="text-sm font-medium text-green-800 mb-2">Educational Impact Highlights</h4>
                  <div className="grid gap-3 md:grid-cols-2 text-xs text-green-700">
                    {roi.educational_impact.learning_outcomes.map((outcome, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span>{outcome.outcome_name}</span>
                        <Badge variant="outline" className="text-green-600">
                          +{outcome.target_improvement}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="capacity" className="space-y-6">
          {capacityPlans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <CardTitle>{plan.plan_name}</CardTitle>
                <CardDescription>
                  Planning horizon: {plan.planning_horizon}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {plan.current_capacity.user_capacity.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Current User Capacity</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {plan.projected_demand[0]?.projected_users.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Projected Demand</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {plan.capacity_gaps.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Capacity Gaps</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {plan.current_capacity.staff_capacity.capacity_utilization}%
                    </div>
                    <div className="text-xs text-muted-foreground">Staff Utilization</div>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-3">Infrastructure Utilization</h4>
                    <div className="space-y-3">
                      {Object.entries(plan.current_capacity.infrastructure_capacity.utilization_rates).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{key}</span>
                          <div className="flex items-center space-x-2">
                            <Progress value={value} className="w-20" />
                            <span className="text-sm font-medium w-10 text-right">{value}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Capacity Gaps</h4>
                    <div className="space-y-2">
                      {plan.capacity_gaps.map((gap, index) => (
                        <div key={index} className={`p-3 rounded-lg ${
                          gap.impact_severity === 'critical' ? 'bg-red-50 border border-red-200' :
                          gap.impact_severity === 'high' ? 'bg-orange-50 border border-orange-200' :
                          gap.impact_severity === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                          'bg-green-50 border border-green-200'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <h5 className={`text-sm font-medium ${
                              gap.impact_severity === 'critical' ? 'text-red-800' :
                              gap.impact_severity === 'high' ? 'text-orange-800' :
                              gap.impact_severity === 'medium' ? 'text-yellow-800' :
                              'text-green-800'
                            }`}>
                              {gap.resource_type}
                            </h5>
                            <Badge className={
                              gap.impact_severity === 'critical' ? 'bg-red-500' :
                              gap.impact_severity === 'high' ? 'bg-orange-500' :
                              gap.impact_severity === 'medium' ? 'bg-yellow-500' :
                              'bg-green-500'
                            }>
                              {gap.impact_severity}
                            </Badge>
                          </div>
                          <div className={`text-xs ${
                            gap.impact_severity === 'critical' ? 'text-red-700' :
                            gap.impact_severity === 'high' ? 'text-orange-700' :
                            gap.impact_severity === 'medium' ? 'text-yellow-700' :
                            'text-green-700'
                          }`}>
                            Gap: {gap.gap_size} ({gap.gap_percentage}%) • Timeline: {gap.timeline_to_crisis}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Expansion Plans</h4>
                    {plan.expansion_plans.map((expansion, index) => (
                      <div key={index} className="text-xs text-blue-700 mb-2">
                        <div className="font-medium">{expansion.expansion_type}</div>
                        <div>Capacity: +{expansion.capacity_increase}% • Cost: ${expansion.investment_required.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="text-sm font-medium text-green-800 mb-2">Optimization Opportunities</h4>
                    {plan.optimization_opportunities.map((opportunity, index) => (
                      <div key={index} className="text-xs text-green-700 mb-2">
                        <div className="font-medium">{opportunity.opportunity_name}</div>
                        <div>Gain: +{opportunity.potential_capacity_gain}% • Savings: ${Math.abs(opportunity.cost_impact).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Create Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Strategic Plan</DialogTitle>
            <DialogDescription>
              Generate a new strategic analysis or planning document
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Strategic Planning Wizard</h3>
            <p className="text-muted-foreground">
              Plan creation functionality would be implemented here
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDialog(false)}>
              Cancel
            </Button>
            <Button>Create Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
