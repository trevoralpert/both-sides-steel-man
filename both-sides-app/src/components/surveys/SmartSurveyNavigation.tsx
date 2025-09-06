/**
 * Phase 3 Task 3.3.2.2: Implement Smart Survey Navigation
 * Intelligent navigation with breadcrumbs, quick jump, and smart skipping
 */

'use client';

import { useState, useEffect } from 'react';

import { Survey, SurveyProgress, SurveyQuestion } from '@/types/survey';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, 
  ChevronRight,
  MoreHorizontal,
  Map,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  Target,
  SkipForward as Skip,
  Home,
  BookOpen
} from 'lucide-react';

interface SmartSurveyNavigationProps {
  survey: Survey;
  currentIndex: number;
  responses: Map<string, any>;
  onNavigate: (index: number) => void;
  onSkipSection: (section: string) => void;
  onJumpToSection: (section: string) => void;
  progress: SurveyProgress;
  className?: string;
}

interface SurveySection {
  name: string;
  displayName: string;
  startIndex: number;
  endIndex: number;
  questions: SurveyQuestion[];
  completed: number;
  total: number;
  estimatedMinutes: number;
  isOptional: boolean;
}

export function SmartSurveyNavigation({
  survey,
  currentIndex,
  responses,
  onNavigate,
  onSkipSection,
  onJumpToSection,
  progress,
  className = ''
}: SmartSurveyNavigationProps) {
  const [showSectionMap, setShowSectionMap] = useState(false);
  const [sections, setSections] = useState<SurveySection[]>([]);

  useEffect(() => {
    // Group questions into sections
    const sectionMap: any = {};
    
    survey.questions.forEach((question, index) => {
      const section = question.section || 'general';
      if (!sectionMap[section]) {
        sectionMap[section] = [];
      }
      sectionMap[section].push({ ...question, originalIndex: index });
    });

    const sectionData: SurveySection[] = [];
    let currentStartIndex = 0;

    Object.entries(sectionMap).forEach(([sectionName, questions]) => {
      const questionsArray = questions as any[];
      const completed = questionsArray.filter(q => responses.has(q.id)).length;
      const estimatedMinutes = Math.ceil(questionsArray.length * 1.5); // 1.5 min per question average
      
      sectionData.push({
        name: sectionName,
        displayName: getSectionDisplayName(sectionName),
        startIndex: currentStartIndex,
        endIndex: currentStartIndex + questionsArray.length - 1,
        questions: questionsArray,
        completed,
        total: questionsArray.length,
        estimatedMinutes,
        isOptional: sectionName.includes('optional') || sectionName.includes('reflection')
      });
      
      currentStartIndex += questionsArray.length;
    });

    setSections(sectionData);
  }, [survey.questions, responses]);

  const getSectionDisplayName = (sectionName: string) => {
    const displayNames: Record<string, string> = {
      'economic_beliefs': '💰 Economic Views',
      'social_values': '🤝 Social Values', 
      'government_role': '🏛️ Government Role',
      'environment_global': '🌍 Global Issues',
      'personal_flexibility': '🧠 Personal Reflection',
      'open_reflection': '💭 Open Questions',
      'general': '📋 General Questions'
    };
    
    return displayNames[sectionName] || sectionName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getCurrentSection = () => {
    return sections.find(section => 
      currentIndex >= section.startIndex && currentIndex <= section.endIndex
    );
  };

  const getNextRecommendedQuestion = () => {
    // Smart logic to recommend next question
    const currentSection = getCurrentSection();
    
    // If in middle of section, continue with next question
    if (currentSection && currentIndex < currentSection.endIndex) {
      return currentIndex + 1;
    }
    
    // Find next incomplete section
    for (const section of sections) {
      if (section.completed < section.total) {
        return section.startIndex + section.completed;
      }
    }
    
    return currentIndex + 1;
  };

  const canSkipCurrent = () => {
    const currentQuestion = survey.questions[currentIndex];
    return !currentQuestion?.required || responses.has(currentQuestion.id);
  };

  const getSkipRecommendation = () => {
    const currentSection = getCurrentSection();
    const unansweredInSection = currentSection?.questions.filter(q => !responses.has(q.id)).length || 0;
    
    if (currentSection?.isOptional && unansweredInSection > 3) {
      return `Consider skipping the rest of "${currentSection.displayName}" section (${unansweredInSection} questions remaining)`;
    }
    
    if (unansweredInSection === 1) {
      return "This is the last question in this section";
    }
    
    return null;
  };

  const handleSmartSkip = () => {
    const recommendation = getSkipRecommendation();
    const currentSection = getCurrentSection();
    
    if (currentSection?.isOptional && recommendation) {
      onSkipSection(currentSection.name);
    } else {
      onNavigate(getNextRecommendedQuestion());
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Breadcrumb Navigation */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm">
              <Home className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Survey</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium text-blue-700">
                {getCurrentSection()?.displayName || 'Question'}
              </span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {currentIndex + 1} of {survey.questions.length}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSectionMap(!showSectionMap)}
              className="text-blue-600 hover:text-blue-800"
            >
              <Map className="h-4 w-4 mr-1" />
              Survey Map
            </Button>
          </div>
          
          {/* Section Progress */}
          {getCurrentSection() && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">
                  {getCurrentSection()?.displayName} Progress
                </span>
                <span className="font-medium">
                  {getCurrentSection()?.completed} / {getCurrentSection()?.total}
                </span>
              </div>
              <Progress 
                value={(getCurrentSection()!.completed / getCurrentSection()!.total) * 100} 
                className="h-1.5"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section Map Modal */}
      {showSectionMap && (
        <Card className="border-blue-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Survey Overview
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSectionMap(false)}
              >
                Close
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sections.map((section, index) => {
                const isCurrent = currentIndex >= section.startIndex && currentIndex <= section.endIndex;
                const completionRate = (section.completed / section.total) * 100;
                
                return (
                  <div
                    key={section.name}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      isCurrent 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      onJumpToSection(section.name);
                      setShowSectionMap(false);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          {section.displayName}
                          {section.isOptional && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Optional
                            </Badge>
                          )}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {section.total} questions
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            ~{section.estimatedMinutes} min
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {completionRate === 100 ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : completionRate > 0 ? (
                          <div className="text-xs font-medium text-blue-600">
                            {Math.round(completionRate)}%
                          </div>
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300" />
                        )}
                      </div>
                    </div>
                    
                    <Progress value={completionRate} className="h-1 mb-2" />
                    
                    <div className="text-xs text-muted-foreground">
                      {section.completed} of {section.total} completed
                      {isCurrent && (
                        <span className="ml-2 text-blue-600 font-medium">
                          • Current section
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Navigation Controls */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Previous Button */}
            <Button
              variant="outline"
              onClick={() => onNavigate(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            {/* Current Position & Smart Skip */}
            <div className="flex items-center gap-4">
              {/* Smart Skip Recommendation */}
              {getSkipRecommendation() && canSkipCurrent() && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSmartSkip}
                    className="text-amber-600 hover:text-amber-800 text-xs"
                  >
                    <Skip className="h-3 w-3 mr-1" />
                    Smart Skip
                  </Button>
                </div>
              )}
              
              {/* Current Section Badge */}
              {getCurrentSection() && (
                <Badge variant="secondary" className="text-xs px-3 py-1">
                  {getCurrentSection()?.displayName}
                </Badge>
              )}
            </div>

            {/* Next/Continue Button */}
            <Button
              onClick={() => onNavigate(getNextRecommendedQuestion())}
              disabled={currentIndex >= survey.questions.length - 1}
              className="flex items-center gap-2"
            >
              {currentIndex === survey.questions.length - 1 ? (
                <>Finish Survey</>
              ) : (
                <>
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Navigation Dots */}
      <div className="flex justify-center">
        <div className="flex items-center gap-1 bg-white rounded-full px-4 py-2 shadow-sm border">
          {survey.questions.slice(0, 20).map((_, index) => { // Show first 20 for performance
            const hasResponse = responses.has(survey.questions[index]?.id);
            const isCurrent = index === currentIndex;
            
            return (
              <button
                key={index}
                onClick={() => onNavigate(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  isCurrent 
                    ? 'bg-blue-600 scale-150' 
                    : hasResponse 
                    ? 'bg-green-400 hover:bg-green-500' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
                title={`Question ${index + 1}${hasResponse ? ' (answered)' : ''}`}
              />
            );
          })}
          
          {survey.questions.length > 20 && (
            <MoreHorizontal className="h-3 w-3 text-muted-foreground ml-1" />
          )}
        </div>
      </div>
    </div>
  );
}

// Helper component for keyboard navigation
export function useKeyboardNavigation(
  currentIndex: number,
  maxIndex: number,
  onNavigate: (index: number) => void,
  onSubmit: () => void
) {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle navigation if not in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          if (currentIndex > 0) {
            onNavigate(currentIndex - 1);
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (currentIndex < maxIndex) {
            onNavigate(currentIndex + 1);
          }
          break;
        case 'Enter':
          event.preventDefault();
          onSubmit();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, maxIndex, onNavigate, onSubmit]);
}

// Smart section jumping utility
export function getOptimalNavigationPath(
  responses: Map<string, any>,
  questions: SurveyQuestion[],
  userPreferences: { skipOptional?: boolean; prioritizeRequired?: boolean }
): number[] {
  const path: number[] = [];
  const { skipOptional = false, prioritizeRequired = true } = userPreferences;

  // First pass: required questions not yet answered
  if (prioritizeRequired) {
    questions.forEach((question, index) => {
      if (question.required && !responses.has(question.id)) {
        path.push(index);
      }
    });
  }

  // Second pass: optional questions if not skipping
  if (!skipOptional) {
    questions.forEach((question, index) => {
      if (!question.required && !responses.has(question.id)) {
        path.push(index);
      }
    });
  }

  return path;
}
