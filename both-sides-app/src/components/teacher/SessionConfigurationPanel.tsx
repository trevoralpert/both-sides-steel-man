/**
 * Session Configuration Panel Component
 * 
 * Task 8.3.1: Comprehensive debate settings configuration panel
 * with timer configurations, moderation settings, and AI coaching preferences.
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Settings, 
  Shield,
  Brain,
  Award,
  Bell,
  Play,
  Pause,
  Timer,
  MessageSquare,
  Eye,
  Target,
  Zap,
  Info,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

// Types
interface SessionConfiguration {
  format: string;
  duration: number;
  phases: {
    preparation: number;
    opening: number;
    rebuttal: number;
    closing: number;
    reflection: number;
  };
  moderation: {
    aiCoaching: boolean;
    interventionLevel: 'minimal' | 'moderate' | 'active';
    realTimeFeedback: boolean;
    contentFiltering: boolean;
    profanityFilter: boolean;
    appropriatenessCheck: boolean;
    sentimentMonitoring: boolean;
  };
  scoring: {
    enabled: boolean;
    criteria: string[];
    rubricType: 'basic' | 'detailed' | 'custom';
    peerEvaluation: boolean;
    selfReflection: boolean;
    realTimeScoring: boolean;
  };
  notifications: {
    phaseTransitions: boolean;
    timeWarnings: boolean;
    participantAlerts: boolean;
    teacherNotifications: boolean;
  };
  accessibility: {
    speechToText: boolean;
    textToSpeech: boolean;
    closedCaptions: boolean;
    fontSizeAdjustment: boolean;
    colorBlindSupport: boolean;
  };
  advanced: {
    recordingEnabled: boolean;
    transcriptionEnabled: boolean;
    analyticsCollection: boolean;
    feedbackSuggestions: boolean;
    argumentMapping: boolean;
  };
}

interface DebateFormat {
  id: string;
  name: string;
  description: string;
  defaultPhases: {
    preparation: number;
    opening: number;
    rebuttal: number;
    closing: number;
    reflection: number;
  };
  recommendedDuration: number;
  participants: { min: number; max: number };
}

const DEBATE_FORMATS: DebateFormat[] = [
  {
    id: 'oxford',
    name: 'Oxford Style',
    description: 'Traditional formal debate with structured phases',
    defaultPhases: { preparation: 10, opening: 8, rebuttal: 15, closing: 8, reflection: 4 },
    recommendedDuration: 45,
    participants: { min: 6, max: 8 }
  },
  {
    id: 'lincoln-douglas',
    name: 'Lincoln-Douglas',
    description: 'One-on-one philosophical debate format',
    defaultPhases: { preparation: 8, opening: 6, rebuttal: 12, closing: 6, reflection: 3 },
    recommendedDuration: 35,
    participants: { min: 2, max: 2 }
  },
  {
    id: 'parliamentary',
    name: 'Parliamentary',
    description: 'Government vs Opposition style debate',
    defaultPhases: { preparation: 12, opening: 10, rebuttal: 18, closing: 8, reflection: 5 },
    recommendedDuration: 53,
    participants: { min: 4, max: 6 }
  },
  {
    id: 'fishbowl',
    name: 'Fishbowl Discussion',
    description: 'Rotating discussion format with observers',
    defaultPhases: { preparation: 5, opening: 5, rebuttal: 20, closing: 3, reflection: 2 },
    recommendedDuration: 35,
    participants: { min: 8, max: 16 }
  },
  {
    id: 'socratic',
    name: 'Socratic Seminar',
    description: 'Question-driven inquiry discussion',
    defaultPhases: { preparation: 10, opening: 5, rebuttal: 30, closing: 3, reflection: 7 },
    recommendedDuration: 55,
    participants: { min: 6, max: 12 }
  }
];

const SCORING_CRITERIA = [
  { id: 'argument_quality', label: 'Argument Quality', description: 'Logical reasoning and structure' },
  { id: 'evidence_use', label: 'Evidence Use', description: 'Quality and relevance of supporting evidence' },
  { id: 'presentation', label: 'Presentation', description: 'Clarity and delivery of arguments' },
  { id: 'rebuttal_skills', label: 'Rebuttal Skills', description: 'Ability to counter opposing arguments' },
  { id: 'collaboration', label: 'Collaboration', description: 'Teamwork and cooperation (when applicable)' },
  { id: 'critical_thinking', label: 'Critical Thinking', description: 'Analysis and evaluation of ideas' },
  { id: 'creativity', label: 'Creativity', description: 'Original thinking and innovative approaches' },
  { id: 'research_skills', label: 'Research Skills', description: 'Quality of preparation and source usage' }
];

interface SessionConfigurationPanelProps {
  configuration: SessionConfiguration;
  onChange: (configuration: SessionConfiguration) => void;
  className?: string;
}

export function SessionConfigurationPanel({ 
  configuration, 
  onChange, 
  className 
}: SessionConfigurationPanelProps) {
  const [activeTab, setActiveTab] = useState('format');

  const updateConfiguration = (key: keyof SessionConfiguration, value: any) => {
    onChange({ ...configuration, [key]: value });
  };

  const updateNestedConfiguration = (
    section: keyof SessionConfiguration, 
    key: string, 
    value: any
  ) => {
    const currentSection = configuration[section] as any;
    onChange({
      ...configuration,
      [section]: { ...currentSection, [key]: value }
    });
  };

  const selectedFormat = DEBATE_FORMATS.find(f => f.id === configuration.format);

  const applyFormatDefaults = (formatId: string) => {
    const format = DEBATE_FORMATS.find(f => f.id === formatId);
    if (format) {
      updateConfiguration('format', formatId);
      updateConfiguration('phases', format.defaultPhases);
      updateConfiguration('duration', format.recommendedDuration);
    }
  };

  const getTotalPhaseTime = () => {
    return Object.values(configuration.phases).reduce((sum, time) => sum + time, 0);
  };

  const getPhasePercentage = (phaseTime: number) => {
    const total = getTotalPhaseTime();
    return total > 0 ? (phaseTime / total) * 100 : 0;
  };

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="format">Format</TabsTrigger>
          <TabsTrigger value="timing">Timing</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
          <TabsTrigger value="scoring">Scoring</TabsTrigger>
          <TabsTrigger value="accessibility">Access</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="format" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Debate Format
              </CardTitle>
              <CardDescription>
                Choose the debate structure that best fits your educational goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Format Type</Label>
                  <Select value={configuration.format} onValueChange={applyFormatDefaults}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEBATE_FORMATS.map(format => (
                        <SelectItem key={format.id} value={format.id}>
                          <div>
                            <div className="font-medium">{format.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {format.participants.min}-{format.participants.max} participants • {format.recommendedDuration}min
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedFormat && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">{selectedFormat.name}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{selectedFormat.description}</p>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {selectedFormat.participants.min}-{selectedFormat.participants.max} participants
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        ~{selectedFormat.recommendedDuration} minutes
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Total Duration (minutes)</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      type="number"
                      value={configuration.duration}
                      onChange={(e) => updateConfiguration('duration', parseInt(e.target.value) || 0)}
                      min="10"
                      max="120"
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">
                      Current phase total: {getTotalPhaseTime()} minutes
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Timer className="h-5 w-5 mr-2" />
                Phase Timing Configuration
              </CardTitle>
              <CardDescription>
                Configure the duration of each debate phase
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Visual Timeline */}
                <div>
                  <Label>Phase Timeline</Label>
                  <div className="mt-2 p-4 border rounded-lg">
                    <div className="flex h-8 rounded overflow-hidden">
                      {Object.entries(configuration.phases).map(([phase, duration], index) => {
                        const percentage = getPhasePercentage(duration);
                        const colors = [
                          'bg-blue-500',
                          'bg-green-500', 
                          'bg-yellow-500',
                          'bg-orange-500',
                          'bg-purple-500'
                        ];
                        return percentage > 0 ? (
                          <div
                            key={phase}
                            className={`${colors[index]} flex items-center justify-center text-white text-xs font-medium`}
                            style={{ width: `${percentage}%` }}
                            title={`${phase}: ${duration} minutes`}
                          >
                            {percentage > 15 ? `${duration}m` : ''}
                          </div>
                        ) : null;
                      })}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span>0 min</span>
                      <span>{getTotalPhaseTime()} min</span>
                    </div>
                  </div>
                </div>

                {/* Phase Configuration */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(configuration.phases).map(([phase, duration]) => (
                    <Card key={phase}>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          <Label className="capitalize">{phase.replace('_', ' ')}</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              value={duration}
                              onChange={(e) => {
                                const newPhases = { ...configuration.phases };
                                newPhases[phase as keyof typeof newPhases] = parseInt(e.target.value) || 0;
                                updateConfiguration('phases', newPhases);
                              }}
                              min="0"
                              max="60"
                              className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">min</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getPhasePercentage(duration).toFixed(1)}% of total
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Time Warnings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <Bell className="h-4 w-4 mr-2" />
                      Time Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={configuration.notifications.phaseTransitions}
                          onCheckedChange={(checked) => 
                            updateNestedConfiguration('notifications', 'phaseTransitions', checked)
                          }
                        />
                        <Label>Announce phase transitions</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={configuration.notifications.timeWarnings}
                          onCheckedChange={(checked) => 
                            updateNestedConfiguration('notifications', 'timeWarnings', checked)
                          }
                        />
                        <Label>Time warnings (2 min, 1 min, 30 sec)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={configuration.notifications.participantAlerts}
                          onCheckedChange={(checked) => 
                            updateNestedConfiguration('notifications', 'participantAlerts', checked)
                          }
                        />
                        <Label>Participant activity alerts</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                AI Moderation & Coaching
              </CardTitle>
              <CardDescription>
                Configure automated assistance and content monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* AI Coaching */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Checkbox
                      checked={configuration.moderation.aiCoaching}
                      onCheckedChange={(checked) => 
                        updateNestedConfiguration('moderation', 'aiCoaching', checked)
                      }
                    />
                    <Label className="text-base font-medium">Enable AI Coaching</Label>
                  </div>
                  
                  {configuration.moderation.aiCoaching && (
                    <div className="ml-6 space-y-3">
                      <div>
                        <Label>Intervention Level</Label>
                        <RadioGroup
                          value={configuration.moderation.interventionLevel}
                          onValueChange={(value) => 
                            updateNestedConfiguration('moderation', 'interventionLevel', value)
                          }
                          className="mt-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="minimal" id="minimal" />
                            <Label htmlFor="minimal">Minimal - Only for serious issues</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="moderate" id="moderate" />
                            <Label htmlFor="moderate">Moderate - Balanced guidance</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="active" id="active" />
                            <Label htmlFor="active">Active - Frequent coaching</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={configuration.moderation.realTimeFeedback}
                          onCheckedChange={(checked) => 
                            updateNestedConfiguration('moderation', 'realTimeFeedback', checked)
                          }
                        />
                        <Label>Real-time feedback suggestions</Label>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Content Moderation */}
                <div>
                  <h4 className="font-medium mb-3">Content Monitoring</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={configuration.moderation.contentFiltering}
                        onCheckedChange={(checked) => 
                          updateNestedConfiguration('moderation', 'contentFiltering', checked)
                        }
                      />
                      <Label>Enable content filtering</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={configuration.moderation.profanityFilter}
                        onCheckedChange={(checked) => 
                          updateNestedConfiguration('moderation', 'profanityFilter', checked)
                        }
                      />
                      <Label>Profanity filtering</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={configuration.moderation.appropriatenessCheck}
                        onCheckedChange={(checked) => 
                          updateNestedConfiguration('moderation', 'appropriatenessCheck', checked)
                        }
                      />
                      <Label>Age-appropriateness checking</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={configuration.moderation.sentimentMonitoring}
                        onCheckedChange={(checked) => 
                          updateNestedConfiguration('moderation', 'sentimentMonitoring', checked)
                        }
                      />
                      <Label>Sentiment monitoring</Label>
                    </div>
                  </div>
                </div>

                {(configuration.moderation.contentFiltering || 
                  configuration.moderation.profanityFilter || 
                  configuration.moderation.appropriatenessCheck) && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Content moderation helps maintain a respectful learning environment. 
                      Flagged content will be reviewed before being displayed to participants.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Scoring & Assessment
              </CardTitle>
              <CardDescription>
                Configure how debate performance will be evaluated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={configuration.scoring.enabled}
                    onCheckedChange={(checked) => 
                      updateNestedConfiguration('scoring', 'enabled', checked)
                    }
                  />
                  <Label className="text-base font-medium">Enable Scoring</Label>
                </div>

                {configuration.scoring.enabled && (
                  <>
                    <div>
                      <Label>Rubric Type</Label>
                      <RadioGroup
                        value={configuration.scoring.rubricType}
                        onValueChange={(value) => 
                          updateNestedConfiguration('scoring', 'rubricType', value)
                        }
                        className="mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="basic" id="basic" />
                          <Label htmlFor="basic">Basic - Simple 1-5 scale</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="detailed" id="detailed" />
                          <Label htmlFor="detailed">Detailed - Comprehensive criteria</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="custom" id="custom" />
                          <Label htmlFor="custom">Custom - Build your own rubric</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div>
                      <Label>Scoring Criteria</Label>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        {SCORING_CRITERIA.map(criterion => (
                          <div key={criterion.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={configuration.scoring.criteria.includes(criterion.id)}
                              onCheckedChange={(checked) => {
                                const newCriteria = checked 
                                  ? [...configuration.scoring.criteria, criterion.id]
                                  : configuration.scoring.criteria.filter(c => c !== criterion.id);
                                updateNestedConfiguration('scoring', 'criteria', newCriteria);
                              }}
                            />
                            <div>
                              <Label className="font-normal">{criterion.label}</Label>
                              <p className="text-xs text-muted-foreground">{criterion.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-3">Assessment Options</h4>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={configuration.scoring.peerEvaluation}
                            onCheckedChange={(checked) => 
                              updateNestedConfiguration('scoring', 'peerEvaluation', checked)
                            }
                          />
                          <Label>Peer evaluation</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={configuration.scoring.selfReflection}
                            onCheckedChange={(checked) => 
                              updateNestedConfiguration('scoring', 'selfReflection', checked)
                            }
                          />
                          <Label>Self-reflection assessment</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={configuration.scoring.realTimeScoring}
                            onCheckedChange={(checked) => 
                              updateNestedConfiguration('scoring', 'realTimeScoring', checked)
                            }
                          />
                          <Label>Real-time scoring feedback</Label>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accessibility" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Accessibility Features
              </CardTitle>
              <CardDescription>
                Ensure the debate is accessible to all students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={configuration.accessibility.speechToText}
                    onCheckedChange={(checked) => 
                      updateNestedConfiguration('accessibility', 'speechToText', checked)
                    }
                  />
                  <Label>Speech-to-text transcription</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={configuration.accessibility.textToSpeech}
                    onCheckedChange={(checked) => 
                      updateNestedConfiguration('accessibility', 'textToSpeech', checked)
                    }
                  />
                  <Label>Text-to-speech for written content</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={configuration.accessibility.closedCaptions}
                    onCheckedChange={(checked) => 
                      updateNestedConfiguration('accessibility', 'closedCaptions', checked)
                    }
                  />
                  <Label>Closed captions</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={configuration.accessibility.fontSizeAdjustment}
                    onCheckedChange={(checked) => 
                      updateNestedConfiguration('accessibility', 'fontSizeAdjustment', checked)
                    }
                  />
                  <Label>Font size adjustment controls</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={configuration.accessibility.colorBlindSupport}
                    onCheckedChange={(checked) => 
                      updateNestedConfiguration('accessibility', 'colorBlindSupport', checked)
                    }
                  />
                  <Label>Color-blind friendly interface</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Advanced Features
              </CardTitle>
              <CardDescription>
                Additional tools for enhanced debate analysis and learning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={configuration.advanced.recordingEnabled}
                    onCheckedChange={(checked) => 
                      updateNestedConfiguration('advanced', 'recordingEnabled', checked)
                    }
                  />
                  <Label>Session recording</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={configuration.advanced.transcriptionEnabled}
                    onCheckedChange={(checked) => 
                      updateNestedConfiguration('advanced', 'transcriptionEnabled', checked)
                    }
                  />
                  <Label>Automatic transcription</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={configuration.advanced.analyticsCollection}
                    onCheckedChange={(checked) => 
                      updateNestedConfiguration('advanced', 'analyticsCollection', checked)
                    }
                  />
                  <Label>Learning analytics collection</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={configuration.advanced.feedbackSuggestions}
                    onCheckedChange={(checked) => 
                      updateNestedConfiguration('advanced', 'feedbackSuggestions', checked)
                    }
                  />
                  <Label>AI-powered feedback suggestions</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={configuration.advanced.argumentMapping}
                    onCheckedChange={(checked) => 
                      updateNestedConfiguration('advanced', 'argumentMapping', checked)
                    }
                  />
                  <Label>Argument mapping visualization</Label>
                </div>
              </div>

              {(configuration.advanced.recordingEnabled || configuration.advanced.transcriptionEnabled) && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Recording and transcription features may require additional privacy consent from participants.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
