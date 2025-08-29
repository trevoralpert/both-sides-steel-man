'use client';

/**
 * Debug page for testing Task 6.3.3 Rules Display across different phases
 */

import React, { useState } from 'react';
import { DebatePhase } from '@/types/debate';
import { RulesPanel } from '@/components/debate-room/RulesPanel';
import { BestPracticesTips } from '@/components/debate-room/BestPracticesTips';
import { HelpTooltip, PhaseHelpTooltip } from '@/components/debate-room/HelpTooltips';
import { PhaseIndicator } from '@/components/debate-room/PhaseIndicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const phases: DebatePhase[] = [
  'PREPARATION',
  'OPENING', 
  'DISCUSSION',
  'REBUTTAL',
  'CLOSING',
  'REFLECTION',
  'COMPLETED'
];

export default function RulesDemoPage() {
  const [currentPhase, setCurrentPhase] = useState<DebatePhase>('PREPARATION');
  const [messageCount, setMessageCount] = useState(0);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | undefined>(300000); // 5 minutes

  // Mock message analysis for personalized tips
  const mockAnalysis = {
    argumentStrength: 0.7,
    respectfulness: 0.9,
    evidenceBased: messageCount > 2,
    suggestions: [
      'Try incorporating more specific evidence to strengthen your arguments',
      'Great job maintaining respectful dialogue!'
    ]
  };

  const handlePhaseChange = (phase: DebatePhase) => {
    setCurrentPhase(phase);
    // Reset counters for new phase
    setUserMessageCount(0);
    setMessageCount(0);
    
    // Set phase-appropriate time remaining
    switch (phase) {
      case 'PREPARATION':
        setTimeRemaining(300000); // 5 minutes
        break;
      case 'OPENING':
        setTimeRemaining(300000); // 5 minutes  
        break;
      case 'DISCUSSION':
        setTimeRemaining(1200000); // 20 minutes
        break;
      case 'REBUTTAL':
        setTimeRemaining(600000); // 10 minutes
        break;
      case 'CLOSING':
        setTimeRemaining(300000); // 5 minutes
        break;
      case 'REFLECTION':
        setTimeRemaining(600000); // 10 minutes
        break;
      case 'COMPLETED':
        setTimeRemaining(undefined);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Task 6.3.3: Rules Display Demo</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Testing debate rules and guidelines across different phases
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">Phase 6.3.3</Badge>
                <PhaseHelpTooltip 
                  phase={currentPhase} 
                  variant="button" 
                  size="sm"
                />
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Phase Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Phase:</label>
                <div className="flex flex-wrap gap-2">
                  {phases.map((phase) => (
                    <Button
                      key={phase}
                      variant={currentPhase === phase ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePhaseChange(phase)}
                      className="text-xs"
                    >
                      {phase}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Message Counters */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Message Counts:</label>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setMessageCount(prev => prev + 1);
                      setUserMessageCount(prev => prev + 1);
                    }}
                  >
                    Add Message ({userMessageCount})
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setMessageCount(0);
                      setUserMessageCount(0);
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>

              {/* Time Controls */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Time Controls:</label>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setTimeRemaining(prev => prev ? Math.max(0, prev - 60000) : 0)}
                  >
                    -1 Min
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setTimeRemaining(prev => prev ? prev + 60000 : 60000)}
                  >
                    +1 Min
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Rules Panel & Phase Indicator */}
          <div className="space-y-6">
            {/* Phase Indicator */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Phase Indicator with Help</CardTitle>
              </CardHeader>
              <CardContent>
                <PhaseIndicator
                  currentPhase={currentPhase}
                  timeRemaining={timeRemaining}
                  totalPhaseTime={timeRemaining ? timeRemaining + 60000 : undefined}
                  showProgress={true}
                  showTimeRemaining={true}
                />
              </CardContent>
            </Card>

            {/* Rules Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rules Panel</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Contextual rules display based on current phase
                </p>
              </CardHeader>
              <CardContent>
                <RulesPanel
                  currentPhase={currentPhase}
                  timeRemaining={timeRemaining}
                  totalPhaseTime={timeRemaining ? timeRemaining + 60000 : undefined}
                  messageCount={messageCount}
                  userMessageCount={userMessageCount}
                  hasViolations={userMessageCount > 5} // Mock violation for demo
                  onHelpRequest={(topic) => {
                    alert(`Help requested for: ${topic}`);
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Best Practices Tips */}
          <div className="space-y-6">
            {/* Best Practices Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Best Practices Tips</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Educational coaching content and suggestions
                </p>
              </CardHeader>
              <CardContent>
                <BestPracticesTips
                  currentPhase={currentPhase}
                  userPosition="PRO"
                  messageCount={messageCount}
                  recentMessageAnalysis={messageCount > 2 ? mockAnalysis : undefined}
                  onApplyTip={(tipId) => {
                    console.log(`Applying tip: ${tipId}`);
                  }}
                />
              </CardContent>
            </Card>

            {/* Help Tooltips Demo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Help Tooltips Demo</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Contextual help throughout the interface
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm">Argument Structure</span>
                    <HelpTooltip 
                      topic="argument-structure" 
                      currentPhase={currentPhase}
                      variant="icon" 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm">Respectful Disagreement</span>
                    <HelpTooltip 
                      topic="respectful-disagreement" 
                      currentPhase={currentPhase}
                      variant="icon" 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm">Evidence Usage</span>
                    <HelpTooltip 
                      topic="evidence-usage" 
                      currentPhase={currentPhase}
                      variant="icon" 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm">Time Management</span>
                    <HelpTooltip 
                      topic="time-management" 
                      currentPhase={currentPhase}
                      variant="button"
                      size="sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Success Criteria Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Task 6.3.3 Success Criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Clear, age-appropriate rule explanations</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Context-sensitive help based on current phase</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Non-intrusive but easily accessible</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Encouraging tone that promotes learning</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Integrated with existing debate room layout</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Works across all debate phases</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
