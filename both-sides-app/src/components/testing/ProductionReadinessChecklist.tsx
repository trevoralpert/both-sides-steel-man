/**
 * Production Readiness Checklist
 * 
 * Task 7.5.5: Comprehensive production readiness validation including
 * security, performance, accessibility, and deployment verification.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle2, 
  X, 
  AlertTriangle, 
  ChevronDown,
  Shield, 
  Zap, 
  Eye, 
  Globe,
  Database,
  Lock,
  Gauge,
  Users,
  FileText,
  Settings,
  RefreshCw,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: 'security' | 'performance' | 'accessibility' | 'functionality' | 'deployment' | 'documentation';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'passed' | 'failed' | 'skipped';
  automated: boolean;
  requirements?: string[];
  validationSteps?: string[];
  lastChecked?: Date;
  notes?: string;
  evidence?: {
    type: 'screenshot' | 'report' | 'log' | 'test-result';
    url?: string;
    description?: string;
  }[];
}

interface ChecklistCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  items: ChecklistItem[];
  completion: number;
  criticalIssues: number;
}

interface ProductionReadinessChecklistProps {
  onValidationComplete?: (results: ChecklistItem[]) => void;
  className?: string;
}

export function ProductionReadinessChecklist({ 
  onValidationComplete,
  className 
}: ProductionReadinessChecklistProps) {
  const [categories, setCategories] = useState<ChecklistCategory[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const initialCategories = generateProductionChecklist();
    setCategories(initialCategories);
  }, []);

  const runValidation = async () => {
    setIsValidating(true);
    setValidationProgress(0);

    try {
      const allItems = categories.flatMap(cat => cat.items);
      
      for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        
        if (item.automated) {
          // Update item status to in-progress
          updateItemStatus(item.id, 'in-progress');
          
          // Simulate validation
          const result = await validateItem(item);
          updateItemStatus(item.id, result.status, result.notes);
          
          setValidationProgress(((i + 1) / allItems.length) * 100);
          
          // Add delay for visual feedback
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Update completion percentages
      const updatedCategories = categories.map(category => ({
        ...category,
        completion: calculateCategoryCompletion(category.items),
        criticalIssues: category.items.filter(item => 
          item.priority === 'critical' && (item.status === 'failed' || item.status === 'pending')
        ).length
      }));
      
      setCategories(updatedCategories);
      onValidationComplete?.(allItems);

    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsValidating(false);
      setValidationProgress(0);
    }
  };

  const updateItemStatus = (itemId: string, status: ChecklistItem['status'], notes?: string) => {
    setCategories(prev => prev.map(category => ({
      ...category,
      items: category.items.map(item => 
        item.id === itemId 
          ? { ...item, status, notes, lastChecked: new Date() }
          : item
      )
    })));
  };

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const overallCompletion = categories.length > 0
    ? Math.round(categories.reduce((sum, cat) => sum + cat.completion, 0) / categories.length)
    : 0;

  const criticalIssues = categories.reduce((sum, cat) => sum + cat.criticalIssues, 0);
  const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);
  const passedItems = categories.reduce((sum, cat) => 
    sum + cat.items.filter(item => item.status === 'passed').length, 0
  );

  const filteredCategories = selectedCategory === 'all' 
    ? categories 
    : categories.filter(cat => cat.id === selectedCategory);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Production Readiness Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Production Readiness Checklist</span>
                <Badge variant={
                  overallCompletion >= 95 && criticalIssues === 0 ? 'default' : 
                  overallCompletion >= 85 ? 'secondary' : 'destructive'
                }>
                  {overallCompletion}% Ready
                </Badge>
              </CardTitle>
              <CardDescription>
                Comprehensive validation for production deployment readiness
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => generateProductionReport(categories)}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button onClick={runValidation} disabled={isValidating}>
                <RefreshCw className={cn("h-4 w-4 mr-2", isValidating && "animate-spin")} />
                {isValidating ? 'Validating...' : 'Run Validation'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Validation Progress */}
          {isValidating && (
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span>Running production validation...</span>
                <span>{Math.round(validationProgress)}%</span>
              </div>
              <Progress value={validationProgress} className="h-2" />
            </div>
          )}

          {/* Summary Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{overallCompletion}%</div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{passedItems}</div>
              <div className="text-sm text-muted-foreground">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{criticalIssues}</div>
              <div className="text-sm text-muted-foreground">Critical Issues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{totalItems}</div>
              <div className="text-sm text-muted-foreground">Total Checks</div>
            </div>
          </div>

          {/* Critical Issues Alert */}
          {criticalIssues > 0 && (
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {criticalIssues} critical issues must be resolved before production deployment.
              </AlertDescription>
            </Alert>
          )}

          {/* Readiness Status */}
          <div className={cn(
            "p-4 rounded-lg text-center",
            overallCompletion >= 95 && criticalIssues === 0 
              ? "bg-green-50 border-green-200" 
              : "bg-yellow-50 border-yellow-200"
          )}>
            <div className="flex items-center justify-center space-x-2 mb-2">
              {overallCompletion >= 95 && criticalIssues === 0 ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              )}
              <span className={cn(
                "text-lg font-semibold",
                overallCompletion >= 95 && criticalIssues === 0 
                  ? "text-green-700" 
                  : "text-yellow-700"
              )}>
                {overallCompletion >= 95 && criticalIssues === 0 
                  ? "Ready for Production" 
                  : "Not Ready for Production"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {overallCompletion >= 95 && criticalIssues === 0 
                ? "All systems validated and ready for deployment"
                : `${criticalIssues} critical issues and ${Math.round((100 - overallCompletion))}% of checks remaining`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Category Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map(category => (
          <Card 
            key={category.id} 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selectedCategory === category.id && "ring-2 ring-primary"
            )}
            onClick={() => setSelectedCategory(
              selectedCategory === category.id ? 'all' : category.id
            )}
          >
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <category.icon className="h-6 w-6 mx-auto text-muted-foreground" />
                <div className="text-lg font-bold">{category.completion}%</div>
                <div className="text-sm font-medium">{category.name}</div>
                {category.criticalIssues > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {category.criticalIssues} Critical
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Checklist */}
      <div className="space-y-6">
        {filteredCategories.map(category => (
          <Card key={category.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <category.icon className="h-5 w-5" />
                  <div>
                    <CardTitle>{category.name}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {category.items.filter(item => item.status === 'passed').length}/{category.items.length}
                  </Badge>
                  <Progress value={category.completion} className="w-20 h-2" />
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-2">
                {category.items.map(item => (
                  <Collapsible 
                    key={item.id}
                    open={expandedItems.has(item.id)}
                    onOpenChange={() => toggleItemExpanded(item.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center",
                            item.status === 'passed' ? "bg-green-100 text-green-600" :
                            item.status === 'failed' ? "bg-red-100 text-red-600" :
                            item.status === 'in-progress' ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                          )}>
                            {item.status === 'passed' ? <CheckCircle2 className="h-4 w-4" /> :
                             item.status === 'failed' ? <X className="h-4 w-4" /> :
                             item.status === 'in-progress' ? <RefreshCw className="h-4 w-4 animate-spin" /> :
                             <div className="w-2 h-2 rounded-full bg-current" />}
                          </div>
                          <div>
                            <div className="font-medium">{item.title}</div>
                            <div className="text-sm text-muted-foreground">{item.description}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge variant={
                            item.priority === 'critical' ? 'destructive' :
                            item.priority === 'high' ? 'secondary' : 'outline'
                          } className="text-xs">
                            {item.priority}
                          </Badge>
                          {item.automated && (
                            <Badge variant="outline" className="text-xs">Auto</Badge>
                          )}
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="px-3 pb-3">
                      <div className="mt-3 space-y-3 border-t pt-3">
                        {item.requirements && item.requirements.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium mb-2">Requirements</h5>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {item.requirements.map((req, index) => (
                                <li key={index} className="flex items-start space-x-2">
                                  <span className="text-xs mt-1">•</span>
                                  <span>{req}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {item.validationSteps && item.validationSteps.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium mb-2">Validation Steps</h5>
                            <ol className="text-sm text-muted-foreground space-y-1">
                              {item.validationSteps.map((step, index) => (
                                <li key={index} className="flex items-start space-x-2">
                                  <span className="text-xs mt-1 font-medium">{index + 1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                        
                        {item.notes && (
                          <div>
                            <h5 className="text-sm font-medium mb-2">Notes</h5>
                            <p className="text-sm text-muted-foreground">{item.notes}</p>
                          </div>
                        )}
                        
                        {item.lastChecked && (
                          <div className="text-xs text-muted-foreground">
                            Last checked: {item.lastChecked.toLocaleString()}
                          </div>
                        )}
                        
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.automated) {
                                validateItem(item).then(result => {
                                  updateItemStatus(item.id, result.status, result.notes);
                                });
                              } else {
                                updateItemStatus(item.id, 'passed');
                              }
                            }}
                          >
                            {item.automated ? 'Re-validate' : 'Mark Complete'}
                          </Button>
                          
                          {item.status !== 'passed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateItemStatus(item.id, 'skipped', 'Manually skipped');
                              }}
                            >
                              Skip
                            </Button>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Helper functions
function generateProductionChecklist(): ChecklistCategory[] {
  return [
    {
      id: 'security',
      name: 'Security',
      description: 'Security validation and vulnerability assessment',
      icon: Shield,
      items: [
        {
          id: 'sec-1',
          title: 'Authentication & Authorization',
          description: 'Verify JWT tokens, session management, and role-based access',
          category: 'security',
          priority: 'critical',
          status: 'pending',
          automated: true,
          requirements: [
            'JWT tokens properly validated',
            'Session timeout configured',
            'Role-based access control implemented'
          ],
          validationSteps: [
            'Test invalid token rejection',
            'Verify session expiration',
            'Check role permission enforcement'
          ]
        },
        {
          id: 'sec-2',
          title: 'Data Encryption',
          description: 'Ensure sensitive data is encrypted in transit and at rest',
          category: 'security',
          priority: 'critical',
          status: 'pending',
          automated: true,
          requirements: [
            'HTTPS enforced',
            'Database encryption enabled',
            'Sensitive fields encrypted'
          ]
        },
        {
          id: 'sec-3',
          title: 'Input Validation',
          description: 'Validate all user inputs to prevent injection attacks',
          category: 'security',
          priority: 'high',
          status: 'pending',
          automated: true
        }
      ],
      completion: 0,
      criticalIssues: 2
    },
    {
      id: 'performance',
      name: 'Performance',
      description: 'Performance optimization and load testing',
      icon: Zap,
      items: [
        {
          id: 'perf-1',
          title: 'Core Web Vitals',
          description: 'Meet Google Core Web Vitals thresholds',
          category: 'performance',
          priority: 'high',
          status: 'pending',
          automated: true,
          requirements: [
            'LCP < 2.5s',
            'FID < 100ms',
            'CLS < 0.1'
          ]
        },
        {
          id: 'perf-2',
          title: 'Bundle Size Optimization',
          description: 'Minimize JavaScript bundle size',
          category: 'performance',
          priority: 'medium',
          status: 'pending',
          automated: true,
          requirements: [
            'Initial bundle < 250KB',
            'Code splitting implemented',
            'Tree shaking enabled'
          ]
        },
        {
          id: 'perf-3',
          title: 'Load Testing',
          description: 'Validate performance under expected load',
          category: 'performance',
          priority: 'high',
          status: 'pending',
          automated: false,
          requirements: [
            'Support 100 concurrent users',
            'Response time < 200ms',
            'Error rate < 1%'
          ]
        }
      ],
      completion: 0,
      criticalIssues: 0
    },
    {
      id: 'accessibility',
      name: 'Accessibility',
      description: 'WCAG 2.1 AA compliance validation',
      icon: Eye,
      items: [
        {
          id: 'a11y-1',
          title: 'Screen Reader Support',
          description: 'Ensure all content is accessible to screen readers',
          category: 'accessibility',
          priority: 'critical',
          status: 'pending',
          automated: true,
          requirements: [
            'ARIA labels present',
            'Semantic HTML used',
            'Alt text for images'
          ]
        },
        {
          id: 'a11y-2',
          title: 'Keyboard Navigation',
          description: 'All functionality accessible via keyboard',
          category: 'accessibility',
          priority: 'critical',
          status: 'pending',
          automated: true,
          requirements: [
            'Tab order logical',
            'Focus indicators visible',
            'No keyboard traps'
          ]
        },
        {
          id: 'a11y-3',
          title: 'Color Contrast',
          description: 'Text meets WCAG contrast requirements',
          category: 'accessibility',
          priority: 'high',
          status: 'pending',
          automated: true,
          requirements: [
            'Contrast ratio ≥ 4.5:1',
            'Large text ≥ 3:1',
            'Color not sole indicator'
          ]
        }
      ],
      completion: 0,
      criticalIssues: 2
    },
    {
      id: 'functionality',
      name: 'Functionality',
      description: 'Feature completeness and integration testing',
      icon: Settings,
      items: [
        {
          id: 'func-1',
          title: 'Learning Dashboard',
          description: 'Verify all dashboard features work correctly',
          category: 'functionality',
          priority: 'critical',
          status: 'pending',
          automated: true,
          requirements: [
            'Student dashboard loads',
            'Teacher analytics work',
            'Progress tracking accurate'
          ]
        },
        {
          id: 'func-2',
          title: 'Data Visualization',
          description: 'Charts and graphs display correctly',
          category: 'functionality',
          priority: 'high',
          status: 'pending',
          automated: true
        },
        {
          id: 'func-3',
          title: 'Export Functionality',
          description: 'Report generation and export features',
          category: 'functionality',
          priority: 'medium',
          status: 'pending',
          automated: true
        }
      ],
      completion: 0,
      criticalIssues: 1
    },
    {
      id: 'deployment',
      name: 'Deployment',
      description: 'Deployment configuration and environment setup',
      icon: Globe,
      items: [
        {
          id: 'deploy-1',
          title: 'Environment Variables',
          description: 'All required environment variables configured',
          category: 'deployment',
          priority: 'critical',
          status: 'pending',
          automated: false,
          requirements: [
            'Production API keys set',
            'Database connection configured',
            'Third-party service keys present'
          ]
        },
        {
          id: 'deploy-2',
          title: 'Database Migration',
          description: 'Database schema properly migrated',
          category: 'deployment',
          priority: 'critical',
          status: 'pending',
          automated: false
        },
        {
          id: 'deploy-3',
          title: 'CDN Configuration',
          description: 'Static assets properly cached and distributed',
          category: 'deployment',
          priority: 'medium',
          status: 'pending',
          automated: false
        }
      ],
      completion: 0,
      criticalIssues: 2
    },
    {
      id: 'documentation',
      name: 'Documentation',
      description: 'Technical and user documentation',
      icon: FileText,
      items: [
        {
          id: 'doc-1',
          title: 'API Documentation',
          description: 'Complete API documentation available',
          category: 'documentation',
          priority: 'medium',
          status: 'pending',
          automated: false,
          requirements: [
            'Swagger/OpenAPI spec',
            'Example requests/responses',
            'Authentication guide'
          ]
        },
        {
          id: 'doc-2',
          title: 'User Guide',
          description: 'End-user documentation complete',
          category: 'documentation',
          priority: 'medium',
          status: 'pending',
          automated: false
        },
        {
          id: 'doc-3',
          title: 'Deployment Guide',
          description: 'Step-by-step deployment instructions',
          category: 'documentation',
          priority: 'high',
          status: 'pending',
          automated: false
        }
      ],
      completion: 0,
      criticalIssues: 0
    }
  ];
}

async function validateItem(item: ChecklistItem): Promise<{ status: ChecklistItem['status']; notes?: string }> {
  // Simulate automated validation
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
  
  const passRate = item.priority === 'critical' ? 0.7 : item.priority === 'high' ? 0.8 : 0.9;
  const shouldPass = Math.random() < passRate;
  
  return {
    status: shouldPass ? 'passed' : 'failed',
    notes: shouldPass ? 'Validation completed successfully' : 'Validation failed - manual review required'
  };
}

function calculateCategoryCompletion(items: ChecklistItem[]): number {
  if (items.length === 0) return 100;
  
  const completedItems = items.filter(item => item.status === 'passed').length;
  return Math.round((completedItems / items.length) * 100);
}

function generateProductionReport(categories: ChecklistCategory[]) {
  const report = {
    timestamp: new Date().toISOString(),
    overallCompletion: Math.round(categories.reduce((sum, cat) => sum + cat.completion, 0) / categories.length),
    categories: categories.map(cat => ({
      name: cat.name,
      completion: cat.completion,
      criticalIssues: cat.criticalIssues,
      items: cat.items.map(item => ({
        title: item.title,
        status: item.status,
        priority: item.priority,
        automated: item.automated,
        lastChecked: item.lastChecked,
        notes: item.notes
      }))
    })),
    readyForProduction: categories.every(cat => cat.completion >= 95 && cat.criticalIssues === 0)
  };

  console.log('Generated production readiness report:', report);
  // In a real app, this would generate a downloadable report
}
