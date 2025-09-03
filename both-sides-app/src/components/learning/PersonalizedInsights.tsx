/**
 * Personalized Insights Component
 * 
 * Task 7.5.1: Displays AI-generated personalized learning insights and recommendations
 * for students based on their debate performance and reflection data.
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Brain, 
  Lightbulb, 
  Target, 
  TrendingUp, 
  BookOpen, 
  Users, 
  Zap,
  ChevronDown,
  ChevronRight,
  Star,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react';

interface Recommendation {
  id: string;
  type: 'skill_focus' | 'practice' | 'resource' | 'challenge';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  expectedImpact: string;
  actionItems?: string[];
  resources?: Array<{
    title: string;
    type: string;
    url?: string;
    description: string;
  }>;
  competencies?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

interface PersonalizedInsightsProps {
  recommendations: Recommendation[];
  className?: string;
}

export function PersonalizedInsights({ recommendations, className }: PersonalizedInsightsProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Group recommendations by priority
  const groupedRecommendations = {
    high: recommendations.filter(r => r.priority === 'high'),
    medium: recommendations.filter(r => r.priority === 'medium'),
    low: recommendations.filter(r => r.priority === 'low')
  };

  if (recommendations.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Personalized Insights</span>
          </CardTitle>
          <CardDescription>
            AI-generated recommendations based on your learning journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Building Your Insights</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Complete more debates and reflections to unlock personalized recommendations
            </p>
            <Button variant="outline">
              <BookOpen className="h-4 w-4 mr-2" />
              Start Your First Reflection
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5" />
          <span>Personalized Insights</span>
          <Badge variant="secondary">{recommendations.length}</Badge>
        </CardTitle>
        <CardDescription>
          AI-generated recommendations tailored to your learning profile
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* High Priority Recommendations */}
          {groupedRecommendations.high.length > 0 && (
            <section>
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <h3 className="font-semibold text-sm">Priority Focus Areas</h3>
              </div>
              <div className="space-y-3">
                {groupedRecommendations.high.map((recommendation) => (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    isExpanded={expandedItems.has(recommendation.id)}
                    onToggle={() => toggleExpanded(recommendation.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Medium Priority Recommendations */}
          {groupedRecommendations.medium.length > 0 && (
            <section>
              {groupedRecommendations.high.length > 0 && <Separator />}
              <div className="flex items-center space-x-2 mb-3">
                <Target className="h-4 w-4 text-blue-500" />
                <h3 className="font-semibold text-sm">Growth Opportunities</h3>
              </div>
              <div className="space-y-3">
                {groupedRecommendations.medium.slice(0, 2).map((recommendation) => (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    isExpanded={expandedItems.has(recommendation.id)}
                    onToggle={() => toggleExpanded(recommendation.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Low Priority Recommendations */}
          {groupedRecommendations.low.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0">
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4 text-green-500" />
                    <span className="font-semibold text-sm">Enhancement Ideas</span>
                    <Badge variant="outline">{groupedRecommendations.low.length}</Badge>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-3">
                {groupedRecommendations.low.map((recommendation) => (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    isExpanded={expandedItems.has(recommendation.id)}
                    onToggle={() => toggleExpanded(recommendation.id)}
                    compact
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Summary Statistics */}
          {recommendations.length > 0 && (
            <>
              <Separator />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="font-semibold text-lg text-red-500">
                    {groupedRecommendations.high.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Priority Items</div>
                </div>
                <div>
                  <div className="font-semibold text-lg text-blue-500">
                    {groupedRecommendations.medium.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Growth Areas</div>
                </div>
                <div>
                  <div className="font-semibold text-lg text-green-500">
                    {groupedRecommendations.low.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Enhancements</div>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  isExpanded: boolean;
  onToggle: () => void;
  compact?: boolean;
}

function RecommendationCard({ recommendation, isExpanded, onToggle, compact = false }: RecommendationCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'skill_focus': return <Target className="h-4 w-4" />;
      case 'practice': return <Zap className="h-4 w-4" />;
      case 'resource': return <BookOpen className="h-4 w-4" />;
      case 'challenge': return <TrendingUp className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-blue-500 bg-blue-50';
      case 'low': return 'border-l-green-500 bg-green-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  return (
    <div className={`border-l-4 rounded-lg p-4 transition-all duration-200 ${getPriorityColor(recommendation.priority)}`}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-auto text-left"
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {getTypeIcon(recommendation.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{recommendation.title}</h4>
                {!compact && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {recommendation.description}
                  </p>
                )}
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {recommendation.type.replace('_', ' ')}
                  </Badge>
                  {recommendation.estimatedTime && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {recommendation.estimatedTime}
                    </div>
                  )}
                  {recommendation.difficulty && (
                    <Badge variant="secondary" className="text-xs">
                      {recommendation.difficulty}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 flex-shrink-0" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 space-y-4">
          {/* Full Description */}
          {compact && (
            <p className="text-sm text-muted-foreground">
              {recommendation.description}
            </p>
          )}

          {/* Expected Impact */}
          {recommendation.expectedImpact && (
            <div className="flex items-start space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="font-medium text-sm">Expected Impact</h5>
                <p className="text-sm text-muted-foreground">{recommendation.expectedImpact}</p>
              </div>
            </div>
          )}

          {/* Action Items */}
          {recommendation.actionItems && recommendation.actionItems.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-medium text-sm flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Action Steps
              </h5>
              <ul className="space-y-1 ml-6">
                {recommendation.actionItems.map((item, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Target Competencies */}
          {recommendation.competencies && recommendation.competencies.length > 0 && (
            <div>
              <h5 className="font-medium text-sm mb-2">Target Skills</h5>
              <div className="flex flex-wrap gap-1">
                {recommendation.competencies.map((competency) => (
                  <Badge key={competency} variant="secondary" className="text-xs">
                    {competency.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Resources */}
          {recommendation.resources && recommendation.resources.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-medium text-sm flex items-center">
                <BookOpen className="h-4 w-4 mr-2" />
                Helpful Resources
              </h5>
              <div className="space-y-2">
                {recommendation.resources.map((resource, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded border">
                    <div className="flex-1 min-w-0">
                      <h6 className="font-medium text-sm">{resource.title}</h6>
                      <p className="text-xs text-muted-foreground">{resource.description}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {resource.type}
                      </Badge>
                    </div>
                    {resource.url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={resource.url} target="_blank" rel="noopener noreferrer">
                          <ArrowRight className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button size="sm" className="flex-1">
              Start Working
            </Button>
            <Button variant="outline" size="sm">
              Save for Later
            </Button>
            <Button variant="ghost" size="sm">
              Not Interested
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
