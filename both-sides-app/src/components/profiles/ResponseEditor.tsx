'use client';

import { useState } from 'react';

import { SurveyResponse, IdeologyScores } from '@/types/profile';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Edit3, 
  Save, 
  X, 
  ArrowRight,
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Info,
  TrendingUp,
  Eye
} from 'lucide-react';

interface ResponseEditorProps {
  responses: SurveyResponse[];
  onUpdateResponse: (questionId: string, updates: Partial<SurveyResponse>) => void;
  onSaveChanges: () => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  showImpactPreview?: boolean;
  className?: string;
}

interface ResponseEdit {
  questionId: string;
  originalResponse: SurveyResponse;
  updatedResponse: SurveyResponse;
  isEditing: boolean;
  hasChanges: boolean;
}

// Mock function to calculate how response changes affect ideology scores
const calculateImpactPreview = (originalResponse: SurveyResponse, updatedResponse: SurveyResponse): { 
  dimension: string; 
  originalImpact: number; 
  newImpact: number; 
  change: number 
}[] => {
  // This would be calculated by the backend AI analysis in a real implementation
  const dimensions = ['economic', 'social', 'tradition', 'globalism', 'environment'];
  
  return dimensions.slice(0, Math.floor(Math.random() * 3) + 1).map(dimension => {
    const originalImpact = Math.random() * 0.4 - 0.2; // -0.2 to 0.2
    const changeMultiplier = originalResponse.responseValue !== updatedResponse.responseValue ? 
      (Math.random() - 0.5) * 0.3 : 0; // Random change if response changed
    const newImpact = originalImpact + changeMultiplier;
    
    return {
      dimension,
      originalImpact,
      newImpact,
      change: newImpact - originalImpact
    };
  });
};

const getCategoryColor = (category: string): string => {
  switch (category.toUpperCase()) {
    case 'POLITICAL': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'SOCIAL': return 'bg-green-100 text-green-800 border-green-200';
    case 'ECONOMIC': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'ENVIRONMENTAL': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'PERSONAL': return 'bg-orange-100 text-orange-800 border-orange-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export function ResponseEditor({
  responses,
  onUpdateResponse,
  onSaveChanges,
  onCancel,
  isLoading = false,
  showImpactPreview = true,
  className = ''
}: ResponseEditorProps) {
  const [responseEdits, setResponseEdits] = useState<ResponseEdit[]>(
    responses.map(response => ({
      questionId: response.questionId,
      originalResponse: response,
      updatedResponse: { ...response },
      isEditing: false,
      hasChanges: false
    }))
  );

  const [impactPreviews, setImpactPreviews] = useState<Record<string, any>>({});

  const hasAnyChanges = responseEdits.some(edit => edit.hasChanges);

  const startEditing = (questionId: string) => {
    setResponseEdits(prev => prev.map(edit => 
      edit.questionId === questionId 
        ? { ...edit, isEditing: true }
        : edit
    ));
  };

  const cancelEdit = (questionId: string) => {
    setResponseEdits(prev => prev.map(edit => 
      edit.questionId === questionId 
        ? { 
          ...edit, 
          isEditing: false, 
          updatedResponse: { ...edit.originalResponse },
          hasChanges: false
        }
        : edit
    ));
    
    // Remove impact preview
    setImpactPreviews(prev => {
      const updated = { ...prev };
      delete updated[questionId];
      return updated;
    });
  };

  const saveEdit = (questionId: string) => {
    const edit = responseEdits.find(e => e.questionId === questionId);
    if (!edit) return;

    // Calculate impact if response changed
    if (showImpactPreview && 
        (edit.originalResponse.responseValue !== edit.updatedResponse.responseValue ||
         edit.originalResponse.responseText !== edit.updatedResponse.responseText)) {
      const impact = calculateImpactPreview(edit.originalResponse, edit.updatedResponse);
      setImpactPreviews(prev => ({ ...prev, [questionId]: impact }));
    }

    setResponseEdits(prev => prev.map(e => 
      e.questionId === questionId 
        ? { 
          ...e, 
          isEditing: false, 
          hasChanges: true,
          originalResponse: { ...e.updatedResponse } // Update original to current
        }
        : e
    ));

    onUpdateResponse(questionId, edit.updatedResponse);
  };

  const updateResponseValue = (questionId: string, field: keyof SurveyResponse, value: any) => {
    setResponseEdits(prev => prev.map(edit => 
      edit.questionId === questionId 
        ? { 
          ...edit, 
          updatedResponse: { ...edit.updatedResponse, [field]: value }
        }
        : edit
    ));
  };

  const handleSaveAll = async () => {
    try {
      await onSaveChanges();
      // Reset all edits
      setResponseEdits(prev => prev.map(edit => ({
        ...edit,
        hasChanges: false,
        isEditing: false
      })));
      setImpactPreviews({});
    } catch (error) {
      console.error('Failed to save changes:', error);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Edit Survey Responses</h2>
          <p className="text-muted-foreground">
            Modify your responses to improve your belief profile accuracy
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSaveAll} 
            disabled={!hasAnyChanges || isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes ({responseEdits.filter(e => e.hasChanges).length})
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Changes Summary */}
      {hasAnyChanges && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                You have {responseEdits.filter(e => e.hasChanges).length} unsaved changes. 
                Your profile will be regenerated after saving.
              </span>
              {showImpactPreview && Object.keys(impactPreviews).length > 0 && (
                <Button variant="outline" size="sm" onClick={() => {}}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Impact
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Response List */}
      <div className="space-y-4">
        {responseEdits.map((edit, index) => (
          <Card key={edit.questionId} className={edit.hasChanges ? 'border-orange-200' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="outline" className={getCategoryColor(edit.originalResponse.questionCategory)}>
                      {edit.originalResponse.questionCategory.replace('_', ' ')}
                    </Badge>
                    <span className="text-sm text-muted-foreground">Question {index + 1}</span>
                    {edit.hasChanges && (
                      <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                        Modified
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{edit.originalResponse.questionText}</CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  {!edit.isEditing ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => startEditing(edit.questionId)}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => cancelEdit(edit.questionId)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => saveEdit(edit.questionId)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {edit.isEditing ? (
                // Editing mode
                <div className="space-y-4">
                  {/* Response Value */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Response</label>
                    <Textarea
                      value={edit.updatedResponse.responseValue || ''}
                      onChange={(e) => updateResponseValue(edit.questionId, 'responseValue', e.target.value)}
                      placeholder="Enter your response..."
                      className="min-h-[100px]"
                    />
                  </div>

                  {/* Response Text (additional context) */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Additional Context (Optional)</label>
                    <Textarea
                      value={edit.updatedResponse.responseText || ''}
                      onChange={(e) => updateResponseValue(edit.questionId, 'responseText', e.target.value)}
                      placeholder="Provide additional context or explanation..."
                      className="min-h-[80px]"
                    />
                  </div>

                  {/* Confidence Level */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Confidence Level: {edit.updatedResponse.confidenceLevel || 3}/5
                    </label>
                    <Slider
                      value={[edit.updatedResponse.confidenceLevel || 3]}
                      onValueChange={([value]) => updateResponseValue(edit.questionId, 'confidenceLevel', value)}
                      min={1}
                      max={5}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Very Unsure</span>
                      <span>Neutral</span>
                      <span>Very Confident</span>
                    </div>
                  </div>
                </div>
              ) : (
                // Display mode
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Your Response:</span>
                    <p className="mt-1">{edit.updatedResponse.responseValue}</p>
                  </div>
                  
                  {edit.updatedResponse.responseText && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Additional Context:</span>
                      <p className="mt-1 text-sm">{edit.updatedResponse.responseText}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Confidence:</span>
                      <span className="ml-1 font-medium">{edit.updatedResponse.confidenceLevel || 3}/5</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Response Time:</span>
                      <span className="ml-1 font-medium">
                        {Math.round((edit.updatedResponse.completionTime || 0) / 1000)}s
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Impact Preview */}
              {showImpactPreview && impactPreviews[edit.questionId] && (
                <>
                  <Separator />
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Predicted Impact on Profile
                    </h4>
                    <div className="space-y-2">
                      {impactPreviews[edit.questionId].map((impact: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="capitalize font-medium">{impact.dimension.replace('_', ' ')}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-muted-foreground">
                              {impact.originalImpact > 0 ? '+' : ''}{Math.round(impact.originalImpact * 100)}%
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className={`font-medium ${
                              impact.newImpact > impact.originalImpact ? 'text-green-600' : 
                              impact.newImpact < impact.originalImpact ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {impact.newImpact > 0 ? '+' : ''}{Math.round(impact.newImpact * 100)}%
                            </span>
                            {Math.abs(impact.change) > 0.01 && (
                              <Badge variant="outline" className={
                                impact.change > 0 ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'
                              }>
                                {impact.change > 0 ? '+' : ''}{Math.round(impact.change * 100)}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom Actions */}
      {hasAnyChanges && (
        <div className="sticky bottom-4 bg-white p-4 rounded-lg border shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">
                {responseEdits.filter(e => e.hasChanges).length} responses modified
              </span>
              <p className="text-xs text-muted-foreground">
                Changes will regenerate your belief profile
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel All
              </Button>
              <Button onClick={handleSaveAll} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save & Regenerate Profile
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
