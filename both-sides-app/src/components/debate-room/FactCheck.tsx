'use client';

/**
 * Phase 6 Task 6.4.3: Fact Check Component
 * 
 * Real-time fact verification alerts and source credibility checking
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Shield, 
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  ExternalLink,
  Clock,
  Search,
  TrendingUp,
  Eye,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Lightbulb,
  BookOpen
} from 'lucide-react';

export interface FactCheckProps {
  messageContent: string;
  onFactCheckResult?: (result: FactCheckResult) => void;
  realTimeEnabled?: boolean;
  className?: string;
}

// Fact check result types
export interface FactCheckResult {
  id: string;
  claim: string;
  verdict: 'verified' | 'disputed' | 'unverified' | 'misleading' | 'false';
  confidence: number; // 0-1, how confident in the verdict
  sources: FactCheckSource[];
  explanation: string;
  suggestions?: string[];
  lastChecked: Date;
  processingTime: number; // in milliseconds
}

export interface FactCheckSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  credibility: number; // 0-1
  relevance: number; // 0-1
  verdict: 'supports' | 'disputes' | 'neutral';
  excerpt: string;
}

// Claims that can be detected
export interface DetectedClaim {
  id: string;
  text: string;
  type: 'statistic' | 'fact' | 'claim' | 'quote' | 'comparison';
  startIndex: number;
  endIndex: number;
  confidence: number;
  needsVerification: boolean;
}

// Mock fact-checking data
const mockFactCheckResults: FactCheckResult[] = [
  {
    id: 'fact-1',
    claim: 'Global temperatures have risen by 1.2°C since pre-industrial times',
    verdict: 'verified',
    confidence: 0.95,
    sources: [
      {
        id: 'source-1',
        title: 'Climate Change Analysis 2023',
        publisher: 'IPCC',
        url: 'https://ipcc.ch/reports/ar6/',
        credibility: 0.98,
        relevance: 0.95,
        verdict: 'supports',
        excerpt: 'Global surface temperature has increased by approximately 1.1°C to 1.2°C since 1850-1900.'
      },
      {
        id: 'source-2',
        title: 'Temperature Records Analysis',
        publisher: 'NASA',
        url: 'https://climate.nasa.gov/',
        credibility: 0.97,
        relevance: 0.92,
        verdict: 'supports',
        excerpt: 'NASA data confirms a warming trend of 1.18°C since the late 1800s.'
      }
    ],
    explanation: 'This claim is well-supported by multiple credible scientific sources including NASA and IPCC reports.',
    suggestions: [
      'Consider citing the specific IPCC report for added credibility',
      'The exact temperature increase varies slightly between sources (1.1-1.2°C)'
    ],
    lastChecked: new Date(),
    processingTime: 1200
  },
  {
    id: 'fact-2',
    claim: 'Renewable energy creates no jobs',
    verdict: 'false',
    confidence: 0.88,
    sources: [
      {
        id: 'source-3',
        title: 'Global Energy Employment 2023',
        publisher: 'IRENA',
        url: 'https://irena.org/employment',
        credibility: 0.92,
        relevance: 0.95,
        verdict: 'disputes',
        excerpt: 'Renewable energy sector employed 13.7 million people worldwide in 2022, up from 12 million in 2020.'
      }
    ],
    explanation: 'This claim is contradicted by employment data from renewable energy sectors worldwide.',
    suggestions: [
      'Consider the job displacement vs. job creation balance',
      'Different renewable technologies have varying job creation potential'
    ],
    lastChecked: new Date(),
    processingTime: 850
  }
];

export function FactCheck({
  messageContent,
  onFactCheckResult,
  realTimeEnabled = true,
  className
}: FactCheckProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<FactCheckResult[]>([]);
  const [detectedClaims, setDetectedClaims] = useState<DetectedClaim[]>([]);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Detect potential claims in message content
  const detectClaims = useCallback((content: string): DetectedClaim[] => {
    const claims: DetectedClaim[] = [];
    
    // Simple claim detection patterns
    const patterns = [
      // Statistics: numbers with units
      {
        pattern: /(\d+(?:\.\d+)?)\s*(?:%|percent|degrees?|°[CF]|million|billion|trillion)/gi,
        type: 'statistic' as const
      },
      // Facts with "is/are/has/have" 
      {
        pattern: /([A-Z][^.!?]*(?:is|are|has|have|shows|indicates|demonstrates)[^.!?]*)/g,
        type: 'fact' as const
      },
      // Claims with strong assertions
      {
        pattern: /([A-Z][^.!?]*(?:always|never|all|every|no|none)[^.!?]*)/g,
        type: 'claim' as const
      },
      // Quotes
      {
        pattern: /"([^"]+)"/g,
        type: 'quote' as const
      },
      // Comparisons
      {
        pattern: /([A-Z][^.!?]*(?:more|less|higher|lower|better|worse|than)[^.!?]*)/g,
        type: 'comparison' as const
      }
    ];

    patterns.forEach(({ pattern, type }) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        claims.push({
          id: `claim-${claims.length}`,
          text: match[0],
          type,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: type === 'statistic' ? 0.9 : type === 'fact' ? 0.7 : 0.5,
          needsVerification: type === 'statistic' || type === 'fact'
        });
      }
    });

    return claims.filter((claim, index, self) => 
      self.findIndex(c => c.text === claim.text) === index
    );
  }, []);

  // Perform fact checking
  const performFactCheck = useCallback(async (content: string) => {
    if (!content.trim()) {
      setResults([]);
      return;
    }

    setIsChecking(true);
    
    try {
      // Detect claims
      const claims = detectClaims(content);
      setDetectedClaims(claims);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock fact-checking logic
      const relevantResults = mockFactCheckResults.filter(result => 
        content.toLowerCase().includes(result.claim.toLowerCase().split(' ').slice(0, 3).join(' '))
      );

      setResults(relevantResults);
      setLastChecked(new Date());

      // Notify parent component
      relevantResults.forEach(result => {
        onFactCheckResult?.(result);
      });

    } catch (error) {
      console.error('Fact check error:', error);
    } finally {
      setIsChecking(false);
    }
  }, [detectClaims, onFactCheckResult]);

  // Auto fact-check when content changes
  useEffect(() => {
    if (!realTimeEnabled || !messageContent) return;

    const debounceTimeout = setTimeout(() => {
      performFactCheck(messageContent);
    }, 1000);

    return () => clearTimeout(debounceTimeout);
  }, [messageContent, realTimeEnabled, performFactCheck]);

  // Get verdict styling
  const getVerdictStyling = (verdict: FactCheckResult['verdict']) => {
    switch (verdict) {
      case 'verified':
        return {
          color: 'text-green-700 bg-green-100 border-green-300',
          icon: CheckCircle2,
          label: 'Verified'
        };
      case 'disputed':
        return {
          color: 'text-red-700 bg-red-100 border-red-300',
          icon: XCircle,
          label: 'Disputed'
        };
      case 'unverified':
        return {
          color: 'text-gray-700 bg-gray-100 border-gray-300',
          icon: Info,
          label: 'Unverified'
        };
      case 'misleading':
        return {
          color: 'text-amber-700 bg-amber-100 border-amber-300',
          icon: AlertTriangle,
          label: 'Misleading'
        };
      case 'false':
        return {
          color: 'text-red-700 bg-red-100 border-red-300',
          icon: XCircle,
          label: 'False'
        };
      default:
        return {
          color: 'text-gray-700 bg-gray-100 border-gray-300',
          icon: Info,
          label: 'Unknown'
        };
    }
  };

  // Toggle result expansion
  const toggleExpanded = useCallback((resultId: string) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  }, []);

  const hasHighPriorityAlerts = results.some(r => 
    r.verdict === 'false' || r.verdict === 'misleading'
  );

  if (!realTimeEnabled && results.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-4 w-4 text-blue-500" />
          <span className="font-medium text-sm">Fact Check</span>
          {isChecking && (
            <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
          )}
          {results.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          {lastChecked && (
            <>
              <Clock className="h-3 w-3" />
              <span>Last checked {lastChecked.toLocaleTimeString()}</span>
            </>
          )}
        </div>
      </div>

      {/* High Priority Alerts */}
      {hasHighPriorityAlerts && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Potential Issues Detected</AlertTitle>
          <AlertDescription className="text-red-700">
            Some claims in your message may need verification or correction.
          </AlertDescription>
        </Alert>
      )}

      {/* Detected Claims */}
      {detectedClaims.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Detected Claims</CardTitle>
            <CardDescription className="text-xs">
              Claims that can be fact-checked
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {detectedClaims.slice(0, 3).map((claim) => (
                <div key={claim.id} className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs capitalize">
                    {claim.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex-1 truncate">
                    {claim.text}
                  </span>
                  <div className="flex items-center space-x-1">
                    <Progress 
                      value={claim.confidence * 100} 
                      className="w-8 h-1"
                    />
                    <span className="text-xs text-muted-foreground">
                      {Math.round(claim.confidence * 100)}%
                    </span>
                  </div>
                </div>
              ))}
              {detectedClaims.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{detectedClaims.length - 3} more claims detected
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fact Check Results */}
      <div className="space-y-2">
        {results.map((result) => {
          const styling = getVerdictStyling(result.verdict);
          const VerdictIcon = styling.icon;
          const isExpanded = expandedResults.has(result.id);
          
          return (
            <Card 
              key={result.id} 
              className={cn(
                "transition-all duration-200",
                result.verdict === 'false' || result.verdict === 'misleading' 
                  ? "border-red-200 bg-red-50/30" 
                  : result.verdict === 'verified'
                  ? "border-green-200 bg-green-50/30"
                  : ""
              )}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Result Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge className={cn("text-xs", styling.color)}>
                          <VerdictIcon className="h-2 w-2 mr-1" />
                          {styling.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(result.confidence * 100)}% confident
                        </Badge>
                      </div>
                      
                      <p className="text-sm font-medium leading-tight">
                        "{result.claim}"
                      </p>
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        {result.explanation}
                      </p>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(result.id)}
                      className="h-8 w-8 p-0 ml-2"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Quick Sources Preview */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">Sources:</span>
                    {result.sources.slice(0, 2).map((source, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {source.publisher}
                      </Badge>
                    ))}
                    {result.sources.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{result.sources.length - 2} more
                      </Badge>
                    )}
                  </div>

                  {/* Expanded Details */}
                  <Collapsible open={isExpanded}>
                    <CollapsibleContent className="space-y-3 pt-3 border-t">
                      {/* Suggestions */}
                      {result.suggestions && result.suggestions.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Lightbulb className="h-3 w-3 text-amber-500" />
                            <span className="text-xs font-medium">Suggestions:</span>
                          </div>
                          <ul className="space-y-1 pl-5">
                            {result.suggestions.map((suggestion, index) => (
                              <li key={index} className="text-xs text-muted-foreground">
                                • {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Detailed Sources */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="h-3 w-3 text-blue-500" />
                          <span className="text-xs font-medium">Sources:</span>
                        </div>
                        
                        <div className="space-y-2">
                          {result.sources.map((source) => (
                            <div key={source.id} className="bg-muted/30 p-3 rounded text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">{source.publisher}</span>
                                <div className="flex items-center space-x-2">
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-xs",
                                      source.verdict === 'supports' ? 'text-green-700' :
                                      source.verdict === 'disputes' ? 'text-red-700' :
                                      'text-gray-700'
                                    )}
                                  >
                                    {source.verdict}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(source.url, '_blank')}
                                    className="h-5 w-5 p-0"
                                  >
                                    <ExternalLink className="h-2 w-2" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-muted-foreground">
                                {source.excerpt}
                              </p>
                              <div className="flex items-center space-x-4 mt-2 pt-2 border-t border-muted">
                                <div className="flex items-center space-x-1">
                                  <span>Credibility:</span>
                                  <Progress value={source.credibility * 100} className="w-12 h-1" />
                                  <span>{Math.round(source.credibility * 100)}%</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <span>Relevance:</span>
                                  <Progress value={source.relevance * 100} className="w-12 h-1" />
                                  <span>{Math.round(source.relevance * 100)}%</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Processing Info */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>Processed in {result.processingTime}ms</span>
                        <span>Last checked: {result.lastChecked.toLocaleTimeString()}</span>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Loading State */}
      {isChecking && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              <div>
                <p className="text-sm font-medium">Checking facts...</p>
                <p className="text-xs text-muted-foreground">
                  Verifying claims against trusted sources
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {!isChecking && results.length === 0 && detectedClaims.length === 0 && messageContent && (
        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-sm text-muted-foreground">
              No verifiable claims detected
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default FactCheck;
