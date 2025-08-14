'use client';

import { useState } from 'react';
import { BeliefProfileVisualization } from './BeliefProfileVisualization';
import { IdeologyScores } from '@/types/profile';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  AlertTriangle, 
  Shield, 
  Eye, 
  EyeOff, 
  Settings, 
  Download, 
  Trash2,
  Edit,
  RefreshCw,
  Lock,
  Users,
  BookOpen,
  MessageSquare,
  ChevronRight,
  HelpCircle
} from 'lucide-react';

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

interface SurveyResponse {
  questionId: string;
  questionText: string;
  questionCategory: string;
  responseValue: any;
  responseText?: string;
  confidenceLevel?: number;
  completionTime: number;
}

interface ProfilePrivacySettings {
  profileVisibility: 'private' | 'class_only' | 'school_only';
  allowTeacherView: boolean;
  allowPeerComparison: boolean;
  shareForResearch: boolean;
  enableMatching: boolean;
  showInClassAnalytics: boolean;
}

interface ResponseContribution {
  questionText: string;
  category: string;
  response: string;
  contributesToDimensions: string[];
  impact: 'high' | 'medium' | 'low';
}

interface ProfileConfirmationProps {
  beliefProfile: BeliefAnalysisResult;
  surveyResponses: SurveyResponse[];
  onConfirmProfile: (settings: ProfilePrivacySettings) => void;
  onEditResponses: (questionIds?: string[]) => void;
  onRetakeSection: (category: string) => void;
  isLoading?: boolean;
  className?: string;
}

const DEFAULT_PRIVACY_SETTINGS: ProfilePrivacySettings = {
  profileVisibility: 'class_only',
  allowTeacherView: true,
  allowPeerComparison: true,
  shareForResearch: false,
  enableMatching: true,
  showInClassAnalytics: true
};

export function ProfileConfirmation({
  beliefProfile,
  surveyResponses,
  onConfirmProfile,
  onEditResponses,
  onRetakeSection,
  isLoading = false,
  className = ''
}: ProfileConfirmationProps) {
  const [privacySettings, setPrivacySettings] = useState<ProfilePrivacySettings>(DEFAULT_PRIVACY_SETTINGS);
  const [showResponseMapping, setShowResponseMapping] = useState(false);
  const [selectedTab, setSelectedTab] = useState('review');

  // Calculate response contributions to ideology scores
  const getResponseContributions = (): ResponseContribution[] => {
    return surveyResponses.map(response => {
      // Mock calculation - in real implementation this would come from the backend
      const dimensions = Object.keys(beliefProfile.ideologyScores).slice(0, Math.floor(Math.random() * 3) + 1);
      return {
        questionText: response.questionText,
        category: response.questionCategory,
        response: typeof response.responseValue === 'string' ? response.responseValue : String(response.responseValue),
        contributesToDimensions: dimensions,
        impact: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low'
      };
    }).filter(contrib => contrib.contributesToDimensions.length > 0);
  };

  const responseContributions = getResponseContributions();
  const categories = Array.from(new Set(surveyResponses.map(r => r.questionCategory)));

  const getQualityLevel = (score: number): { label: string; color: string; description: string } => {
    if (score >= 0.9) return {
      label: 'Excellent',
      color: 'text-green-600 bg-green-50 border-green-200',
      description: 'Your profile is highly accurate and ready for debate matching.'
    };
    if (score >= 0.7) return {
      label: 'Good',
      color: 'text-blue-600 bg-blue-50 border-blue-200', 
      description: 'Your profile is solid with minor areas for improvement.'
    };
    if (score >= 0.5) return {
      label: 'Fair',
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      description: 'Your profile would benefit from more detailed responses.'
    };
    return {
      label: 'Needs Improvement',
      color: 'text-red-600 bg-red-50 border-red-200',
      description: 'Consider retaking some sections for better accuracy.'
    };
  };

  const qualityInfo = getQualityLevel(beliefProfile.analysisMetadata.qualityScore);

  const handleConfirm = () => {
    onConfirmProfile(privacySettings);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-2">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">Your Belief Profile is Ready!</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Review your AI-generated belief profile below. You can edit specific responses, 
          adjust privacy settings, or confirm to start using the system.
        </p>
      </div>

      {/* Quality Assessment */}
      <Card className={`border-2 ${qualityInfo.color.includes('green') ? 'border-green-200 bg-green-50' : 
                                    qualityInfo.color.includes('blue') ? 'border-blue-200 bg-blue-50' :
                                    qualityInfo.color.includes('yellow') ? 'border-yellow-200 bg-yellow-50' :
                                    'border-red-200 bg-red-50'}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className={qualityInfo.color}>
                  {qualityInfo.label} Quality
                </Badge>
                <span className="font-bold text-2xl">
                  {Math.round(beliefProfile.analysisMetadata.qualityScore * 100)}%
                </span>
              </div>
              <p className="text-sm">{qualityInfo.description}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => onEditResponses()}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Responses
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowResponseMapping(!showResponseMapping)}>
                <HelpCircle className="h-4 w-4 mr-2" />
                Show Details
              </Button>
            </div>
          </div>
          
          <Progress value={beliefProfile.analysisMetadata.qualityScore * 100} className="mt-4 h-2" />
          
          {showResponseMapping && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-medium mb-3">Response Quality Breakdown</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Consistency:</span>
                  <div className="font-medium">{Math.round(beliefProfile.confidenceScore * 100)}%</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Completeness:</span>
                  <div className="font-medium">{Math.round((surveyResponses.length / 50) * 100)}%</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Response Time:</span>
                  <div className="font-medium">
                    {Math.round(surveyResponses.reduce((avg, r) => avg + r.completionTime, 0) / surveyResponses.length / 1000)}s avg
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Confidence:</span>
                  <div className="font-medium">
                    {Math.round((surveyResponses.reduce((avg, r) => avg + (r.confidenceLevel || 3), 0) / surveyResponses.length / 5) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="review">Review Profile</TabsTrigger>
          <TabsTrigger value="responses">Response Mapping</TabsTrigger>
          <TabsTrigger value="privacy">Privacy Settings</TabsTrigger>
          <TabsTrigger value="final">Confirm & Finish</TabsTrigger>
        </TabsList>

        {/* Review Profile Tab */}
        <TabsContent value="review" className="space-y-6">
          <BeliefProfileVisualization
            beliefProfile={beliefProfile}
            showComparison={false}
            showEducationalContent={true}
            onRequestEdit={() => onEditResponses()}
          />
        </TabsContent>

        {/* Response Mapping Tab */}
        <TabsContent value="responses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                How Your Responses Shaped Your Profile
              </CardTitle>
              <CardDescription>
                See which survey responses contributed most to your belief profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Category breakdown */}
                <div>
                  <h4 className="font-medium mb-3">Responses by Category</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {categories.map(category => {
                      const categoryCount = surveyResponses.filter(r => r.questionCategory === category).length;
                      const categoryResponses = surveyResponses.filter(r => r.questionCategory === category);
                      const avgConfidence = categoryResponses.reduce((avg, r) => avg + (r.confidenceLevel || 3), 0) / categoryResponses.length;
                      
                      return (
                        <Card key={category} className="text-center">
                          <CardContent className="pt-4">
                            <div className="text-2xl font-bold">{categoryCount}</div>
                            <div className="text-sm font-medium capitalize">{category.replace('_', ' ')}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {Math.round((avgConfidence / 5) * 100)}% confidence
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-2"
                              onClick={() => onRetakeSection(category)}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Retake
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Response contributions */}
                <div>
                  <h4 className="font-medium mb-3">Key Response Contributions</h4>
                  <div className="space-y-3">
                    {responseContributions.slice(0, 10).map((contribution, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between space-x-4">
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-sm mb-1">{contribution.questionText}</h5>
                              <p className="text-sm text-muted-foreground mb-2">
                                <strong>Your response:</strong> "{contribution.response}"
                              </p>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="capitalize">
                                  {contribution.category.replace('_', ' ')}
                                </Badge>
                                <Badge variant={contribution.impact === 'high' ? 'default' : 'secondary'}>
                                  {contribution.impact} impact
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground mb-1">Affects:</div>
                              <div className="space-y-1">
                                {contribution.contributesToDimensions.map(dim => (
                                  <div key={dim} className="text-xs capitalize">
                                    {dim.replace('_', ' ')}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Privacy & Data Control
              </CardTitle>
              <CardDescription>
                Control who can see your profile and how your data is used
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Visibility */}
              <div className="space-y-3">
                <h4 className="font-medium">Profile Visibility</h4>
                <div className="space-y-2">
                  {[
                    { value: 'private', label: 'Private', description: 'Only you can see your profile' },
                    { value: 'class_only', label: 'Class Only', description: 'Only students in your classes can see your profile for matching' },
                    { value: 'school_only', label: 'School Only', description: 'All students in your school can see your profile for matching' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center space-x-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="visibility"
                        value={option.value}
                        checked={privacySettings.profileVisibility === option.value}
                        onChange={(e) => setPrivacySettings(prev => ({ ...prev, profileVisibility: e.target.value as any }))}
                        className="w-4 h-4"
                      />
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Permission Settings */}
              <div className="space-y-4">
                <h4 className="font-medium">Permissions</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Teacher Access</div>
                      <div className="text-sm text-muted-foreground">Allow your teachers to view your profile</div>
                    </div>
                    <Switch
                      checked={privacySettings.allowTeacherView}
                      onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, allowTeacherView: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Peer Comparison</div>
                      <div className="text-sm text-muted-foreground">Show how your beliefs compare to classmates</div>
                    </div>
                    <Switch
                      checked={privacySettings.allowPeerComparison}
                      onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, allowPeerComparison: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Enable Matching</div>
                      <div className="text-sm text-muted-foreground">Allow the system to match you with debate partners</div>
                    </div>
                    <Switch
                      checked={privacySettings.enableMatching}
                      onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, enableMatching: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Class Analytics</div>
                      <div className="text-sm text-muted-foreground">Include your data in anonymous class-wide statistics</div>
                    </div>
                    <Switch
                      checked={privacySettings.showInClassAnalytics}
                      onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, showInClassAnalytics: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Research Participation</div>
                      <div className="text-sm text-muted-foreground">Share anonymized data for educational research</div>
                    </div>
                    <Switch
                      checked={privacySettings.shareForResearch}
                      onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, shareForResearch: checked }))}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Data Rights */}
              <div className="space-y-3">
                <h4 className="font-medium">Your Data Rights</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button variant="outline" className="justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Download Data
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Lock className="h-4 w-4 mr-2" />
                    Update Consent
                  </Button>
                  <Button variant="outline" className="justify-start text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Profile
                  </Button>
                </div>
              </div>

              {/* Privacy Notice */}
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Your privacy is protected:</strong> We never share individual profiles externally. 
                  All matching and analytics use encrypted data, and you can change these settings anytime.
                  <Button variant="link" className="p-0 h-auto ml-1">
                    Read Privacy Policy
                  </Button>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Confirmation Tab */}
        <TabsContent value="final" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Ready to Activate Your Profile
              </CardTitle>
              <CardDescription>
                Review your final settings and confirm to start using the Both Sides platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-3">Profile Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Quality Score:</span>
                    <div className="font-medium">{Math.round(beliefProfile.analysisMetadata.qualityScore * 100)}%</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Flexibility:</span>
                    <div className="font-medium">{Math.round(beliefProfile.opinionPlasticity * 100)}%</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Responses:</span>
                    <div className="font-medium">{surveyResponses.length} questions</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Visibility:</span>
                    <div className="font-medium capitalize">{privacySettings.profileVisibility.replace('_', ' ')}</div>
                  </div>
                </div>
              </div>

              {/* What happens next */}
              <div className="space-y-4">
                <h4 className="font-medium">What happens next?</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">Find Debate Partners</div>
                      <div className="text-sm text-muted-foreground">
                        The system will match you with classmates for engaging debates
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">Educational Content</div>
                      <div className="text-sm text-muted-foreground">
                        Receive personalized explanations and learning materials
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium">Start Debating</div>
                      <div className="text-sm text-muted-foreground">
                        Engage in structured, respectful political discussions
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Final confirmation */}
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  By confirming, you agree that the information in your profile is accurate and 
                  you consent to use the platform according to your privacy settings.
                </AlertDescription>
              </Alert>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-4">
                <Button variant="outline" onClick={() => setSelectedTab('privacy')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Review Settings
                </Button>
                
                <div className="space-x-3">
                  <Button variant="outline" onClick={() => onEditResponses()}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Responses
                  </Button>
                  <Button onClick={handleConfirm} disabled={isLoading} size="lg">
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Activating Profile...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirm & Activate Profile
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
