'use client';

import { useState } from 'react';

import { ProfilePrivacySettings } from '@/types/profile';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Eye, 
  EyeOff,
  Lock,
  Users,
  Download,
  Trash2,
  Settings,
  Info,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  FileText,
  Calendar,
  Database,
  UserCheck,
  School,
  Globe,
  BookOpen,
  MessageSquare
} from 'lucide-react';

interface ProfilePrivacyManagerProps {
  currentSettings: ProfilePrivacySettings;
  onSettingsChange: (settings: ProfilePrivacySettings) => void;
  onExportData: () => void;
  onDeleteProfile: () => void;
  isLoading?: boolean;
  className?: string;
}

interface DataCategory {
  id: string;
  name: string;
  description: string;
  items: string[];
  retention: string;
  canDelete: boolean;
  isRequired: boolean;
}

const DATA_CATEGORIES: DataCategory[] = [
  {
    id: 'profile_basic',
    name: 'Basic Profile Information',
    description: 'Essential information needed for your profile to function',
    items: ['User ID', 'Profile creation date', 'Completion status', 'Profile version'],
    retention: 'Kept while account is active',
    canDelete: false,
    isRequired: true
  },
  {
    id: 'survey_responses',
    name: 'Survey Responses',
    description: 'Your answers to the political belief assessment survey',
    items: ['Question responses', 'Response confidence levels', 'Completion times', 'Response metadata'],
    retention: 'Kept while profile is active',
    canDelete: true,
    isRequired: true
  },
  {
    id: 'belief_analysis',
    name: 'AI-Generated Belief Analysis',
    description: 'AI-processed analysis of your political beliefs and ideology',
    items: ['Belief summary text', 'Ideology scores', 'Opinion plasticity score', 'Analysis metadata'],
    retention: 'Regenerated as needed, cached temporarily',
    canDelete: true,
    isRequired: false
  },
  {
    id: 'embeddings',
    name: 'Profile Embeddings',
    description: 'Mathematical representations used for matching and comparison',
    items: ['Belief embedding vectors', 'Similarity calculations', 'Vector indices'],
    retention: 'Regenerated from belief analysis as needed',
    canDelete: true,
    isRequired: false
  },
  {
    id: 'matching_data',
    name: 'Debate Matching Information',
    description: 'Data used to find suitable debate partners',
    items: ['Matching preferences', 'Previous match outcomes', 'Compatibility scores'],
    retention: 'Kept while matching is enabled',
    canDelete: true,
    isRequired: false
  },
  {
    id: 'analytics_data',
    name: 'Usage Analytics',
    description: 'Anonymous usage statistics for improving the platform',
    items: ['Page views', 'Feature usage', 'Performance metrics', 'Error logs'],
    retention: '90 days, then aggregated anonymously',
    canDelete: false,
    isRequired: false
  }
];

const PRIVACY_LEVELS = {
  private: {
    icon: Lock,
    title: 'Private',
    description: 'Only you can see your profile',
    color: 'text-red-600 bg-red-50 border-red-200',
    restrictions: [
      'Profile hidden from all other users',
      'No debate matching available',
      'Excluded from class analytics',
      'Teachers cannot view your progress'
    ]
  },
  class_only: {
    icon: School,
    title: 'Class Only',
    description: 'Only students in your classes can see your profile',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    restrictions: [
      'Visible only to classmates',
      'Teachers can view for educational purposes',
      'Included in class-wide analytics',
      'Debate matching within classes only'
    ]
  },
  school_only: {
    icon: Globe,
    title: 'School Only',
    description: 'All students in your school can see your profile',
    color: 'text-green-600 bg-green-50 border-green-200',
    restrictions: [
      'Visible to all school users',
      'All school teachers can view',
      'Included in school-wide analytics',
      'Debate matching across entire school'
    ]
  }
};

export function ProfilePrivacyManager({
  currentSettings,
  onSettingsChange,
  onExportData,
  onDeleteProfile,
  isLoading = false,
  className = ''
}: ProfilePrivacyManagerProps) {
  const [tempSettings, setTempSettings] = useState<ProfilePrivacySettings>(currentSettings);
  const [hasChanges, setHasChanges] = useState(false);

  const updateSetting = <K extends keyof ProfilePrivacySettings>(
    key: K,
    value: ProfilePrivacySettings[K]
  ) => {
    const newSettings = { ...tempSettings, [key]: value };
    setTempSettings(newSettings);
    setHasChanges(JSON.stringify(newSettings) !== JSON.stringify(currentSettings));
  };

  const saveSettings = () => {
    onSettingsChange(tempSettings);
    setHasChanges(false);
  };

  const resetSettings = () => {
    setTempSettings(currentSettings);
    setHasChanges(false);
  };

  const currentVisibility = PRIVACY_LEVELS[tempSettings.profileVisibility];
  const VisibilityIcon = currentVisibility.icon;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-6 w-6 mr-2" />
            Privacy & Data Management
          </CardTitle>
          <CardDescription>
            Control your privacy settings and understand how your data is used
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="privacy" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="privacy">Privacy Settings</TabsTrigger>
          <TabsTrigger value="data">Your Data</TabsTrigger>
          <TabsTrigger value="transparency">How It Works</TabsTrigger>
          <TabsTrigger value="rights">Your Rights</TabsTrigger>
        </TabsList>

        {/* Privacy Settings Tab */}
        <TabsContent value="privacy" className="space-y-6">
          {/* Changes alert */}
          {hasChanges && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>You have unsaved privacy setting changes.</span>
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={resetSettings}>
                      Reset
                    </Button>
                    <Button size="sm" onClick={saveSettings} disabled={isLoading}>
                      Save Changes
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Profile Visibility */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <VisibilityIcon className="h-5 w-5 mr-2" />
                Profile Visibility
              </CardTitle>
              <CardDescription>
                Control who can see your profile and use it for debate matching
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {Object.entries(PRIVACY_LEVELS).map(([level, info]) => {
                  const LevelIcon = info.icon;
                  const isSelected = tempSettings.profileVisibility === level;
                  
                  return (
                    <label 
                      key={level}
                      className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors
                        ${isSelected ? info.color : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={level}
                        checked={isSelected}
                        onChange={(e) => updateSetting('profileVisibility', e.target.value as any)}
                        className="sr-only"
                      />
                      <div className="flex-shrink-0 mt-1">
                        <LevelIcon className={`h-5 w-5 ${isSelected ? info.color.split(' ')[0] : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium flex items-center">
                          {info.title}
                          {isSelected && <CheckCircle className="h-4 w-4 ml-2 text-green-500" />}
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">{info.description}</div>
                        <ul className="text-xs space-y-1 text-muted-foreground">
                          {info.restrictions.map((restriction, i) => (
                            <li key={i} className="flex items-start">
                              <div className="w-1.5 h-1.5 bg-current rounded-full mt-1.5 mr-2 flex-shrink-0" />
                              {restriction}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Feature Permissions */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Permissions</CardTitle>
              <CardDescription>
                Control which features can access your profile data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <UserCheck className="h-4 w-4 mr-2" />
                      <span className="font-medium">Teacher Access</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Allow your teachers to view your profile for educational purposes
                    </p>
                  </div>
                  <Switch
                    checked={tempSettings.allowTeacherView}
                    onCheckedChange={(checked) => updateSetting('allowTeacherView', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      <span className="font-medium">Peer Comparison</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Show how your beliefs compare to classmates in aggregate statistics
                    </p>
                  </div>
                  <Switch
                    checked={tempSettings.allowPeerComparison}
                    onCheckedChange={(checked) => updateSetting('allowPeerComparison', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      <span className="font-medium">Debate Matching</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Allow the system to match you with debate partners
                    </p>
                  </div>
                  <Switch
                    checked={tempSettings.enableMatching}
                    onCheckedChange={(checked) => updateSetting('enableMatching', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <Database className="h-4 w-4 mr-2" />
                      <span className="font-medium">Class Analytics</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Include your data in anonymous class-wide statistics
                    </p>
                  </div>
                  <Switch
                    checked={tempSettings.showInClassAnalytics}
                    onCheckedChange={(checked) => updateSetting('showInClassAnalytics', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-2" />
                      <span className="font-medium">Research Participation</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Share anonymized data for educational research (optional)
                    </p>
                  </div>
                  <Switch
                    checked={tempSettings.shareForResearch}
                    onCheckedChange={(checked) => updateSetting('shareForResearch', checked)}
                  />
                </div>
              </div>

              {tempSettings.shareForResearch && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Research data is completely anonymized and used only for improving political education. 
                    You can opt out at any time. 
                    <Button variant="link" className="p-0 h-auto ml-1">
                      Learn more about our research
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Your Data Tab */}
        <TabsContent value="data" className="space-y-6">
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4" />
            <AlertDescription>
              You have complete control over your data. Here's exactly what we store and how you can manage it.
            </AlertDescription>
          </Alert>

          {DATA_CATEGORIES.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {category.isRequired && (
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        Required
                      </Badge>
                    )}
                    {category.canDelete && (
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        Deletable
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">What we store:</h4>
                  <ul className="text-sm space-y-1">
                    {category.items.map((item, i) => (
                      <li key={i} className="flex items-start">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-muted-foreground">Retention policy: </span>
                    <span className="font-medium">{category.retention}</span>
                  </div>
                  {category.canDelete && (
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete This Data
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Transparency Tab */}
        <TabsContent value="transparency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>How Your Data Is Used</CardTitle>
              <CardDescription>
                Complete transparency about our data practices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Debate Matching</h4>
                    <p className="text-sm text-muted-foreground">
                      We use your belief profile to find compatible debate partners with different viewpoints. 
                      This helps ensure engaging, educational discussions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Educational Content</h4>
                    <p className="text-sm text-muted-foreground">
                      Your profile helps us personalize explanations and examples to match your perspective, 
                      making complex topics more accessible.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Database className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Class Analytics</h4>
                    <p className="text-sm text-muted-foreground">
                      Teachers see aggregated, anonymous data about class political diversity. 
                      Individual profiles are never shared without permission.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Settings className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">System Improvement</h4>
                    <p className="text-sm text-muted-foreground">
                      Anonymous usage data helps us improve the platform's effectiveness and fix problems. 
                      This data cannot be traced back to individual users.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">What We DON'T Do</h4>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3" />
                    Share individual profiles with external parties
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3" />
                    Sell your data to advertisers or political organizations
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3" />
                    Use your data for political campaigning or manipulation
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3" />
                    Store data longer than necessary for educational purposes
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Your Rights Tab */}
        <TabsContent value="rights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Data Rights</CardTitle>
              <CardDescription>
                You have complete control over your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <Download className="h-4 w-4 mr-2" />
                      Download Your Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Get a complete copy of all your data in a portable format
                    </p>
                    <Button variant="outline" onClick={onExportData} className="w-full">
                      Request Data Export
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-green-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Update Your Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Change your privacy settings and consent preferences anytime
                    </p>
                    <Button variant="outline" className="w-full">
                      Manage Preferences
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-orange-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Data Correction
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Request corrections to any inaccurate information in your profile
                    </p>
                    <Button variant="outline" className="w-full">
                      Request Correction
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Your Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Permanently delete your profile and all associated data
                    </p>
                    <Button variant="outline" onClick={onDeleteProfile} className="w-full text-red-600 hover:text-red-700">
                      Delete Profile
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Your rights are protected by law.</strong> We comply with FERPA, COPPA, and GDPR 
                  requirements for educational data privacy. 
                  <Button variant="link" className="p-0 h-auto ml-1">
                    Read our full privacy policy
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Questions about your data?</h4>
                <p className="text-sm text-muted-foreground">
                  Contact our privacy team at privacy@bothsides.edu or use our data protection officer 
                  contact form for any questions about how your data is handled.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
