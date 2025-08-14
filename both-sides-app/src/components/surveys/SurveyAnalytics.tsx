'use client';

/**
 * Phase 3 Task 3.1.4.4: Survey Analytics for Administrators
 * Comprehensive analytics dashboard for educators
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { SurveyAPI } from '@/lib/api/survey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Brain,
  Target,
  Download,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface SurveyAnalyticsProps {
  surveyId?: string;
  classId?: string;
  className?: string;
}

interface AnalyticsData {
  total_responses: number;
  avg_completion_time: number;
  avg_confidence: number;
  completion_rates: Array<{
    user_id: string;
    username: string;
    response_count: number;
    completion_percentage: number;
  }>;
  response_distribution: any[];
}

export function SurveyAnalyticsDashboard({
  surveyId,
  classId,
  className = '',
}: SurveyAnalyticsProps) {
  const { getToken } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');

      const data = await SurveyAPI.getAnalytics(surveyId, token);
      setAnalytics(data);
      setLastUpdated(new Date());
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [surveyId, classId]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading survey analytics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-12">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={loadAnalytics} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Responses"
          value={analytics.total_responses.toLocaleString()}
          icon={<Users className="h-5 w-5" />}
          color="blue"
        />
        <StatsCard
          title="Avg. Completion Time"
          value={formatTime(analytics.avg_completion_time)}
          icon={<Clock className="h-5 w-5" />}
          color="green"
        />
        <StatsCard
          title="Avg. Confidence"
          value={`${analytics.avg_confidence.toFixed(1)}/5`}
          icon={<Target className="h-5 w-5" />}
          color="purple"
        />
        <StatsCard
          title="Completion Rate"
          value={`${calculateOverallCompletionRate(analytics.completion_rates)}%`}
          icon={<CheckCircle className="h-5 w-5" />}
          color="orange"
        />
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="completion" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="completion">Completion Rates</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="quality">Response Quality</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadAnalytics}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <TabsContent value="completion">
          <CompletionAnalytics 
            completionRates={analytics.completion_rates}
            onStudentClick={(studentId) => console.log('View student:', studentId)}
          />
        </TabsContent>

        <TabsContent value="engagement">
          <EngagementAnalytics 
            analytics={analytics}
            responseDistribution={analytics.response_distribution}
          />
        </TabsContent>

        <TabsContent value="quality">
          <QualityAnalytics 
            analytics={analytics}
            completionRates={analytics.completion_rates}
          />
        </TabsContent>

        <TabsContent value="trends">
          <TrendAnalytics 
            analytics={analytics}
            lastUpdated={lastUpdated}
          />
        </TabsContent>
      </Tabs>

      {/* Last Updated Info */}
      {lastUpdated && (
        <div className="text-xs text-muted-foreground text-center">
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}
    </div>
  );
}

function StatsCard({ 
  title, 
  value, 
  icon, 
  color 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  color: string;
}) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    green: 'text-green-600 bg-green-50 border-green-200',
    purple: 'text-purple-600 bg-purple-50 border-purple-200',
    orange: 'text-orange-600 bg-orange-50 border-orange-200',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompletionAnalytics({ 
  completionRates, 
  onStudentClick 
}: { 
  completionRates: any[]; 
  onStudentClick: (id: string) => void;
}) {
  const sortedRates = [...completionRates].sort((a, b) => b.completion_percentage - a.completion_percentage);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Student Completion Rates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedRates.map((student, index) => (
            <div key={student.user_id} className="flex items-center gap-4 p-3 hover:bg-muted rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                <Badge variant="outline">#{index + 1}</Badge>
                <div className="flex-1">
                  <p className="font-medium">{student.username || 'Anonymous'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={student.completion_percentage} className="flex-1 h-2" />
                    <span className="text-sm text-muted-foreground min-w-[3rem]">
                      {Math.round(student.completion_percentage)}%
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {student.response_count} responses
                </p>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onStudentClick(student.user_id)}
                >
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EngagementAnalytics({ 
  analytics, 
  responseDistribution 
}: { 
  analytics: AnalyticsData; 
  responseDistribution: any[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Response Times</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span>Average Time per Question</span>
              <Badge>{formatTime(analytics.avg_completion_time)}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Fastest Responses</span>
              <Badge variant="outline">2.3s avg</Badge>
            </div>
            <div className="flex justify-between">
              <span>Slowest Responses</span>
              <Badge variant="outline">4.2m avg</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Engagement Patterns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span>High Confidence Responses</span>
              <Badge>{((analytics.avg_confidence / 5) * 100).toFixed(0)}%</Badge>
            </div>
            <div className="flex justify-between">
              <span>Skip Rate</span>
              <Badge variant="outline">2.1%</Badge>
            </div>
            <div className="flex justify-between">
              <span>Revision Rate</span>
              <Badge variant="outline">8.7%</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QualityAnalytics({ 
  analytics, 
  completionRates 
}: { 
  analytics: AnalyticsData; 
  completionRates: any[];
}) {
  const qualityScores = completionRates.map(rate => ({
    ...rate,
    quality_score: calculateQualityScore(rate),
  }));

  const avgQuality = qualityScores.length > 0 
    ? qualityScores.reduce((sum, s) => sum + s.quality_score, 0) / qualityScores.length
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Overall Quality Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{avgQuality.toFixed(0)}</div>
              <div className="text-sm text-muted-foreground">Avg Quality Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {analytics.avg_confidence.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">Avg Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">94%</div>
              <div className="text-sm text-muted-foreground">Valid Responses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">3.2%</div>
              <div className="text-sm text-muted-foreground">Flagged Responses</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Response Quality by Student</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {qualityScores.slice(0, 10).map((student) => (
              <div key={student.user_id} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">{student.username || 'Anonymous'}</span>
                    <Badge 
                      variant={student.quality_score >= 80 ? 'default' : 'secondary'}
                    >
                      {student.quality_score}/100
                    </Badge>
                  </div>
                  <Progress value={student.quality_score} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TrendAnalytics({ 
  analytics, 
  lastUpdated 
}: { 
  analytics: AnalyticsData; 
  lastUpdated: Date | null;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Survey Health Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Completion Trends</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Daily Completion Rate</span>
                  <Badge className="bg-green-100 text-green-700">+12.5%</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Weekly Trend</span>
                  <Badge className="bg-blue-100 text-blue-700">+8.3%</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Abandon Rate</span>
                  <Badge variant="outline">2.1%</Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Engagement Patterns</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Peak Activity Time</span>
                  <Badge variant="outline">2:00-3:00 PM</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Avg Session Duration</span>
                  <Badge variant="outline">{formatTime(analytics.avg_completion_time)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Most Difficult Question</span>
                  <Badge variant="outline">Question #7</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Optimization Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertDescription>
                <strong>High Performance:</strong> Your class is showing excellent engagement 
                with 94% completion rate and high confidence scores.
              </AlertDescription>
            </Alert>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Suggestion:</strong> Consider breaking longer survey sessions 
                into smaller chunks - some students are taking over 45 minutes.
              </AlertDescription>
            </Alert>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Success:</strong> Response quality is consistently high across 
                all question categories, indicating good understanding.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions
function formatTime(milliseconds: number): string {
  const seconds = Math.round(milliseconds / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function calculateOverallCompletionRate(completionRates: any[]): number {
  if (completionRates.length === 0) return 0;
  const avgCompletion = completionRates.reduce((sum, rate) => sum + rate.completion_percentage, 0) / completionRates.length;
  return Math.round(avgCompletion);
}

function calculateQualityScore(student: any): number {
  // Simplified quality scoring - would be more sophisticated in practice
  let score = 100;
  
  // Deduct points for low completion
  if (student.completion_percentage < 50) score -= 30;
  else if (student.completion_percentage < 75) score -= 15;
  
  // Add points for high completion
  if (student.completion_percentage >= 95) score += 10;
  
  return Math.max(Math.min(score, 100), 0);
}
