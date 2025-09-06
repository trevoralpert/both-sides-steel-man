'use client';

import { IdeologyScores } from '@/types/profile';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  Brain, 
  Target, 
  TrendingUp, 
  Users, 
  Info,
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BeliefAnalysisResult {
  profileId: string;
  beliefSummary: string;
  ideologyScores: IdeologyScores;
  opinionPlasticity: number;
  confidenceScore: number;
  analysisMetadata: {
    analysisVersion: string;
    completedAt: Date;
    tokensUsed: number;
    processingTime: number;
    qualityScore: number;
  };
}

interface BeliefProfileVisualizationProps {
  beliefProfile: BeliefAnalysisResult;
  showComparison?: boolean;
  showEducationalContent?: boolean;
  onRequestEdit?: () => void;
  className?: string;
}

// Ideology axis definitions with descriptions and examples
const IDEOLOGY_AXES = {
  economic: {
    name: 'Economic Views',
    description: 'Your position on economic policies and wealth distribution',
    leftLabel: 'Progressive',
    rightLabel: 'Conservative', 
    leftDescription: 'Supports government intervention, wealth redistribution, social programs',
    rightDescription: 'Favors free markets, limited government, individual responsibility',
    examples: {
      left: ['Universal healthcare', 'Higher minimum wage', 'Progressive taxation'],
      right: ['Free market solutions', 'Lower taxes', 'Reduced regulation']
    }
  },
  social: {
    name: 'Social Issues',
    description: 'Your stance on social policies and individual freedoms',
    leftLabel: 'Libertarian',
    rightLabel: 'Authoritarian',
    leftDescription: 'Values individual freedom, personal choice, civil liberties',
    rightDescription: 'Emphasizes social order, traditional values, collective responsibility',
    examples: {
      left: ['Marriage equality', 'Drug decriminalization', 'Privacy rights'],
      right: ['Traditional marriage', 'Drug enforcement', 'Security measures']
    }
  },
  tradition: {
    name: 'Cultural Values',
    description: 'Your approach to cultural change and traditional institutions',
    leftLabel: 'Progressive',
    rightLabel: 'Traditional',
    leftDescription: 'Embraces cultural change, questions established norms',
    rightDescription: 'Values established traditions, gradual change',
    examples: {
      left: ['Cultural diversity', 'Social innovation', 'Challenging norms'],
      right: ['Cultural heritage', 'Established customs', 'Proven institutions']
    }
  },
  globalism: {
    name: 'Global Perspective',
    description: 'Your view on international cooperation and sovereignty',
    leftLabel: 'Nationalist',
    rightLabel: 'Globalist',
    leftDescription: 'Prioritizes national interests, sovereignty, local control',
    rightDescription: 'Favors international cooperation, global solutions',
    examples: {
      left: ['Border security', 'Trade protections', 'National sovereignty'],
      right: ['International treaties', 'Global trade', 'Multilateral solutions']
    }
  },
  environment: {
    name: 'Environmental Priority',
    description: 'How you balance environmental and economic concerns',
    leftLabel: 'Economic Focus',
    rightLabel: 'Environmental Focus',
    leftDescription: 'Prioritizes economic growth and development',
    rightDescription: 'Prioritizes environmental protection and sustainability',
    examples: {
      left: ['Job creation', 'Economic development', 'Energy independence'],
      right: ['Climate action', 'Conservation', 'Renewable energy']
    }
  }
};

function getIdeologyColor(index: number): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500', 
    'bg-purple-500',
    'bg-orange-500',
    'bg-red-500'
  ];
  return colors[index % colors.length];
}

function getPlasticityDescription(plasticity: number): { label: string; description: string; color: string } {
  if (plasticity >= 0.8) return {
    label: 'Very Flexible',
    description: 'You are extremely open to new perspectives and readily consider alternative viewpoints.',
    color: 'text-green-600'
  };
  if (plasticity >= 0.6) return {
    label: 'Flexible',
    description: 'You are open to changing your mind when presented with compelling evidence.',
    color: 'text-green-500'
  };
  if (plasticity >= 0.4) return {
    label: 'Moderate',
    description: 'You consider new information but maintain your core beliefs.',
    color: 'text-blue-500'
  };
  if (plasticity >= 0.2) return {
    label: 'Firm',
    description: 'You hold strong convictions but can be persuaded with exceptional evidence.',
    color: 'text-orange-500'
  };
  return {
    label: 'Very Firm',
    description: 'You have deeply held beliefs that rarely change.',
    color: 'text-red-500'
  };
}

function getConfidenceDescription(confidence: number): { label: string; description: string; color: string } {
  if (confidence >= 0.9) return {
    label: 'Very High',
    description: 'Your responses show strong consistency and clear positions.',
    color: 'text-green-600'
  };
  if (confidence >= 0.7) return {
    label: 'High',
    description: 'Your beliefs are well-formed with minor inconsistencies.',
    color: 'text-green-500'
  };
  if (confidence >= 0.5) return {
    label: 'Moderate',
    description: 'Some uncertainty in your positions suggests ongoing development.',
    color: 'text-blue-500'
  };
  if (confidence >= 0.3) return {
    label: 'Low',
    description: 'Your responses show significant uncertainty or inconsistency.',
    color: 'text-orange-500'
  };
  return {
    label: 'Very Low',
    description: 'High uncertainty suggests you may still be forming these beliefs.',
    color: 'text-red-500'
  };
}

export function BeliefProfileVisualization({
  beliefProfile,
  showComparison = false,
  showEducationalContent = true,
  onRequestEdit,
  className = ''
}: BeliefProfileVisualizationProps) {
  const plasticityInfo = getPlasticityDescription(beliefProfile.opinionPlasticity);
  const confidenceInfo = getConfidenceDescription(beliefProfile.confidenceScore);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Profile Quality Assessment */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>
              Profile analysis completed with <span className="font-medium">{Math.round(beliefProfile.analysisMetadata.qualityScore * 100)}% quality score</span>
            </span>
            {onRequestEdit && (
              <Button variant="outline" size="sm" onClick={onRequestEdit}>
                Edit Responses
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ideology">Ideology Map</TabsTrigger>
          <TabsTrigger value="flexibility">Flexibility</TabsTrigger>
          <TabsTrigger value="education">Learn More</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Belief Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                Your Belief Summary
              </CardTitle>
              <CardDescription>
                AI-generated summary of your worldview based on your survey responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {beliefProfile.beliefSummary}
                </p>
              </div>
              
              <div className="mt-4 flex items-center space-x-4 text-sm text-muted-foreground">
                <span>Generated: {new Date(beliefProfile.analysisMetadata.completedAt).toLocaleDateString()}</span>
                <span>•</span>
                <span>Version: {beliefProfile.analysisMetadata.analysisVersion}</span>
                <span>•</span>
                <span>Processing: {beliefProfile.analysisMetadata.processingTime}ms</span>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Target className="h-5 w-5 mr-2" />
                  Opinion Flexibility
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{Math.round(beliefProfile.opinionPlasticity * 100)}%</span>
                    <Badge variant="outline" className={plasticityInfo.color}>
                      {plasticityInfo.label}
                    </Badge>
                  </div>
                  <Progress value={beliefProfile.opinionPlasticity * 100} className="h-3" />
                  <p className="text-sm text-muted-foreground">
                    {plasticityInfo.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Response Confidence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{Math.round(beliefProfile.confidenceScore * 100)}%</span>
                    <Badge variant="outline" className={confidenceInfo.color}>
                      {confidenceInfo.label}
                    </Badge>
                  </div>
                  <Progress value={beliefProfile.confidenceScore * 100} className="h-3" />
                  <p className="text-sm text-muted-foreground">
                    {confidenceInfo.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Ideology Map Tab */}
        <TabsContent value="ideology" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Your Ideological Profile
              </CardTitle>
              <CardDescription>
                Your positions across major political and social dimensions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(beliefProfile.ideologyScores).map(([key, score], index) => {
                  const axisInfo = IDEOLOGY_AXES[key as keyof typeof IDEOLOGY_AXES];
                  if (!axisInfo) return null;

                  const normalizedScore = ((score ?? 0) + 1) / 2; // Convert from -1,1 to 0,1
                  const isLeft = (score ?? 0) < -0.1;
                  const isRight = (score ?? 0) > 0.1;
                  const isCenter = !isLeft && !isRight;

                  return (
                    <div key={key} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{axisInfo.name}</h4>
                          <p className="text-sm text-muted-foreground">{axisInfo.description}</p>
                        </div>
                        <Badge variant="outline">
                          {isLeft ? axisInfo.leftLabel : isRight ? axisInfo.rightLabel : 'Moderate'}
                        </Badge>
                      </div>
                      
                      <div className="relative">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>{axisInfo.leftLabel}</span>
                          <span>Moderate</span>
                          <span>{axisInfo.rightLabel}</span>
                        </div>
                        
                        <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                          {/* Center marker */}
                          <div className="absolute left-1/2 top-0 w-0.5 h-full bg-gray-400 transform -translate-x-px" />
                          
                          {/* Score indicator */}
                          <div 
                            className={`absolute top-1/2 w-3 h-3 rounded-full border-2 border-white transform -translate-y-1/2 ${getIdeologyColor(index)}`}
                            style={{ 
                              left: `calc(${normalizedScore * 100}% - 6px)`,
                              transition: 'left 0.5s ease-in-out',
                              animationDelay: `${index * 0.1}s`
                            }}
                          />
                          
                          {/* Background gradient */}
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-100 via-gray-100 to-red-100" />
                        </div>
                        
                        <div className="flex justify-center mt-2">
                          <span className="text-sm font-medium">
                            {Math.abs(score ?? 0) < 0.1 ? 'Moderate' : 
                             isLeft ? `${axisInfo.leftLabel} (${Math.abs(Math.round((score ?? 0) * 100))}%)` :
                             `${axisInfo.rightLabel} (${Math.round((score ?? 0) * 100)}%)`
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flexibility Tab */}
        <TabsContent value="flexibility" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Opinion Flexibility Analysis
              </CardTitle>
              <CardDescription>
                Understanding your openness to changing perspectives
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Main flexibility score */}
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center space-x-4">
                    <div className="text-4xl font-bold text-primary">
                      {Math.round(beliefProfile.opinionPlasticity * 100)}%
                    </div>
                    <div>
                      <Badge variant="outline" className={`${plasticityInfo.color} text-lg px-3 py-1`}>
                        {plasticityInfo.label}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={beliefProfile.opinionPlasticity * 100} className="h-4 max-w-md mx-auto" />
                </div>

                {/* Flexibility interpretation */}
                <Alert className="border-blue-200 bg-blue-50">
                  <Lightbulb className="h-4 w-4" />
                  <AlertDescription>
                    <strong>What this means for debates:</strong> {plasticityInfo.description} This suggests you would benefit from debates with partners who 
                    {beliefProfile.opinionPlasticity > 0.6 ? ' can present well-reasoned arguments and evidence, as you are likely to engage thoughtfully with new perspectives.' :
                     beliefProfile.opinionPlasticity > 0.4 ? ' share some common ground but can challenge your assumptions in a respectful way.' :
                     ' understand your strong convictions and can engage in principled discussions about fundamental differences.'}
                  </AlertDescription>
                </Alert>

                {/* Flexibility scale */}
                <div className="space-y-3">
                  <h4 className="font-medium">Flexibility Scale</h4>
                  <div className="grid grid-cols-5 gap-2 text-center text-xs">
                    {[
                      { label: 'Very Firm', range: '0-20%', color: 'bg-red-100 text-red-800' },
                      { label: 'Firm', range: '21-40%', color: 'bg-orange-100 text-orange-800' },
                      { label: 'Moderate', range: '41-60%', color: 'bg-blue-100 text-blue-800' },
                      { label: 'Flexible', range: '61-80%', color: 'bg-green-100 text-green-800' },
                      { label: 'Very Flexible', range: '81-100%', color: 'bg-green-100 text-green-800' }
                    ].map((item, index) => {
                      const isActive = beliefProfile.opinionPlasticity >= (index * 0.2) && beliefProfile.opinionPlasticity < ((index + 1) * 0.2);
                      return (
                        <div key={index} className={`p-2 rounded ${isActive ? item.color + ' border-2 border-current' : 'bg-gray-50 text-gray-500'}`}>
                          <div className="font-medium">{item.label}</div>
                          <div className="text-xs opacity-75">{item.range}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Educational Content Tab */}
        <TabsContent value="education" className="space-y-6">
          {showEducationalContent && (
            <>
              {/* Understanding Your Profile */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <HelpCircle className="h-5 w-5 mr-2" />
                    Understanding Your Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <p>
                      Your belief profile represents a sophisticated analysis of your political and social views. 
                      It's designed to help match you with debate partners who will provide engaging, educational discussions.
                    </p>
                    
                    <h4 className="font-medium mt-4 mb-2">What the dimensions mean:</h4>
                    
                    {Object.entries(IDEOLOGY_AXES).map(([key, axis]) => {
                      const score = beliefProfile.ideologyScores[key as keyof IdeologyScores];
                      if (score === undefined) return null;
                      
                      return (
                        <div key={key} className="border-l-4 border-blue-200 pl-4 mb-4">
                          <h5 className="font-medium">{axis.name}</h5>
                          <p className="text-sm text-muted-foreground mb-2">{axis.description}</p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">{axis.leftLabel}: </span>
                              <span>{axis.leftDescription}</span>
                              <ul className="list-disc list-inside mt-1 text-xs">
                                {axis.examples.left.map((example, i) => (
                                  <li key={i}>{example}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <span className="font-medium">{axis.rightLabel}: </span>
                              <span>{axis.rightDescription}</span>
                              <ul className="list-disc list-inside mt-1 text-xs">
                                {axis.examples.right.map((example, i) => (
                                  <li key={i}>{example}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Privacy and Usage */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    How Your Profile Is Used
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <div>
                        <strong>Debate Matching:</strong> Your profile helps us find debate partners with complementary or contrasting views for engaging discussions.
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <div>
                        <strong>Topic Selection:</strong> We use your interests and knowledge areas to suggest relevant debate topics.
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                      <div>
                        <strong>Educational Content:</strong> Your profile helps personalize explanations and examples to your perspective.
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                      <div>
                        <strong>Class Analytics:</strong> Teachers see aggregated, anonymized data about class political diversity (never individual profiles).
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
