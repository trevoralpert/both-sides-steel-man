/**
 * Report Generator Component
 * 
 * Task 7.5.2: Comprehensive reporting system for generating student progress reports,
 * class summaries, and administrative dashboards with export capabilities.
 */

'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Download, 
  Mail, 
  Share,
  Calendar as CalendarIcon,
  Users,
  TrendingUp,
  BarChart3,
  Target,
  Clock,
  Star,
  Award,
  BookOpen,
  MessageSquare,
  Settings,
  Eye,
  Send,
  Save,
  Filter,
  CheckCircle2
} from 'lucide-react';

interface ClassOverview {
  classId: string;
  className: string;
  totalStudents: number;
  activeStudents: number;
  averageEngagement: number;
  completionRate: number;
  overallClassAverage: number;
  lastActivity: Date;
  upcomingDeadlines: number;
}

interface StudentSummary {
  id: string;
  name: string;
  email: string;
  overallProgress: number;
  lastActivity: Date;
  completedReflections: number;
  averageQuality: number;
  riskLevel: 'low' | 'medium' | 'high';
  strengths: string[];
  needsAttention: string[];
  engagementTrend: 'improving' | 'stable' | 'declining';
}

interface ReportConfig {
  type: 'individual' | 'class_summary' | 'parent_conference' | 'administrative';
  dateRange: {
    start: Date;
    end: Date;
  };
  selectedStudents: string[];
  includeMetrics: {
    performance: boolean;
    engagement: boolean;
    reflections: boolean;
    achievements: boolean;
    improvements: boolean;
    concerns: boolean;
  };
  format: 'pdf' | 'csv' | 'excel';
  includeComments: boolean;
  includeRecommendations: boolean;
  anonymized: boolean;
}

interface ReportGeneratorProps {
  classData: ClassOverview | null;
  students: StudentSummary[];
}

export function ReportGenerator({ classData, students }: ReportGeneratorProps) {
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    type: 'class_summary',
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date()
    },
    selectedStudents: [],
    includeMetrics: {
      performance: true,
      engagement: true,
      reflections: true,
      achievements: true,
      improvements: true,
      concerns: true
    },
    format: 'pdf',
    includeComments: true,
    includeRecommendations: true,
    anonymized: false
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [previewReport, setPreviewReport] = useState<any>(null);
  const [scheduledReports, setScheduledReports] = useState<Array<{
    id: string;
    name: string;
    schedule: string;
    recipients: string[];
    lastSent: Date;
  }>>([
    {
      id: '1',
      name: 'Weekly Class Summary',
      schedule: 'Every Friday at 4 PM',
      recipients: ['principal@school.edu', 'coordinator@school.edu'],
      lastSent: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }
  ]);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockReport = {
        title: getReportTitle(),
        generatedAt: new Date(),
        summary: {
          totalStudents: reportConfig.selectedStudents.length || students.length,
          averagePerformance: 78.5,
          engagementRate: 85.2,
          completedReflections: 45,
          improvements: 12,
          concerns: 3
        },
        sections: [
          {
            title: 'Performance Overview',
            content: 'Class performance has improved by 12% over the selected period...'
          },
          {
            title: 'Engagement Analysis',
            content: 'Student engagement remains high with 85% active participation...'
          },
          {
            title: 'Areas of Growth',
            content: 'Students have shown particular strength in critical thinking...'
          }
        ]
      };
      
      setPreviewReport(mockReport);
      
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = (format: string) => {
    console.log(`Downloading report in ${format} format`);
    // In a real app, this would trigger the download
  };

  const handleEmailReport = () => {
    console.log('Sending report via email');
    // In a real app, this would open email interface
  };

  const getReportTitle = () => {
    const typeNames = {
      individual: 'Individual Student Report',
      class_summary: 'Class Performance Summary',
      parent_conference: 'Parent Conference Report',
      administrative: 'Administrative Overview'
    };
    return typeNames[reportConfig.type];
  };

  const selectedStudentsData = students.filter(s => 
    reportConfig.selectedStudents.length === 0 || reportConfig.selectedStudents.includes(s.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Report Generator</h2>
        <p className="text-muted-foreground">
          Generate comprehensive reports for students, parents, and administrators
        </p>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Configuration Panel */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Report Configuration</CardTitle>
                  <CardDescription>Customize your report settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Report Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Report Type</label>
                    <Select 
                      value={reportConfig.type} 
                      onValueChange={(value: any) => setReportConfig({...reportConfig, type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual Student Report</SelectItem>
                        <SelectItem value="class_summary">Class Performance Summary</SelectItem>
                        <SelectItem value="parent_conference">Parent Conference Report</SelectItem>
                        <SelectItem value="administrative">Administrative Overview</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <div className="flex space-x-2">
                      <Popover>
                        <PopoverTrigger>
                          <Button variant="outline" className="flex-1 justify-start">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(reportConfig.dateRange.start, "PPP")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={reportConfig.dateRange.start}
                            onSelect={(date) => {
                              if (date && date instanceof Date) {
                                setReportConfig({
                                  ...reportConfig, 
                                  dateRange: {...reportConfig.dateRange, start: date}
                                });
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger>
                          <Button variant="outline" className="flex-1 justify-start">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(reportConfig.dateRange.end, "PPP")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={reportConfig.dateRange.end}
                            onSelect={(date) => {
                              if (date && date instanceof Date) {
                                setReportConfig({
                                  ...reportConfig, 
                                  dateRange: {...reportConfig.dateRange, end: date}
                                });
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Student Selection */}
                  {reportConfig.type === 'individual' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select Students</label>
                      <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                        <div className="space-y-2">
                          {students.map((student) => (
                            <div key={student.id} className="flex items-center space-x-2">
                              <Checkbox
                                checked={reportConfig.selectedStudents.includes(student.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setReportConfig({
                                      ...reportConfig,
                                      selectedStudents: [...reportConfig.selectedStudents, student.id]
                                    });
                                  } else {
                                    setReportConfig({
                                      ...reportConfig,
                                      selectedStudents: reportConfig.selectedStudents.filter(id => id !== student.id)
                                    });
                                  }
                                }}
                              />
                              <span className="text-sm">{student.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Metrics to Include */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Include Metrics</label>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(reportConfig.includeMetrics).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            checked={value}
                            onCheckedChange={(checked) => setReportConfig({
                              ...reportConfig,
                              includeMetrics: {
                                ...reportConfig.includeMetrics,
                                [key]: !!checked
                              }
                            })}
                          />
                          <span className="text-sm capitalize">{key.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Additional Options */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={reportConfig.includeComments}
                        onCheckedChange={(checked) => setReportConfig({
                          ...reportConfig,
                          includeComments: !!checked
                        })}
                      />
                      <span className="text-sm">Include teacher comments</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={reportConfig.includeRecommendations}
                        onCheckedChange={(checked) => setReportConfig({
                          ...reportConfig,
                          includeRecommendations: !!checked
                        })}
                      />
                      <span className="text-sm">Include recommendations</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={reportConfig.anonymized}
                        onCheckedChange={(checked) => setReportConfig({
                          ...reportConfig,
                          anonymized: !!checked
                        })}
                      />
                      <span className="text-sm">Anonymize student data</span>
                    </div>
                  </div>

                  {/* Format Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Output Format</label>
                    <Select 
                      value={reportConfig.format} 
                      onValueChange={(value: any) => setReportConfig({...reportConfig, format: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF Document</SelectItem>
                        <SelectItem value="csv">CSV Spreadsheet</SelectItem>
                        <SelectItem value="excel">Excel Workbook</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Report Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm font-medium">Report Type</div>
                    <div className="text-sm text-muted-foreground">{getReportTitle()}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium">Date Range</div>
                    <div className="text-sm text-muted-foreground">
                      {format(reportConfig.dateRange.start, "MMM d")} - {format(reportConfig.dateRange.end, "MMM d, yyyy")}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium">Students Included</div>
                    <div className="text-sm text-muted-foreground">
                      {reportConfig.selectedStudents.length || students.length} students
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium">Metrics</div>
                    <div className="text-sm text-muted-foreground">
                      {Object.values(reportConfig.includeMetrics).filter(Boolean).length} of 6 metrics
                    </div>
                  </div>

                  <Separator />

                  <Button 
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>

                  {previewReport && (
                    <div className="space-y-2">
                      <Button variant="outline" onClick={() => setPreviewReport(previewReport)} className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        Preview Report
                      </Button>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleDownloadReport('pdf')} className="flex-1">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleEmailReport} className="flex-1">
                          <Mail className="h-4 w-4 mr-2" />
                          Email
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Templates */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Templates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={() => {
                    setReportConfig({
                      ...reportConfig,
                      type: 'parent_conference',
                      includeMetrics: {
                        performance: true,
                        engagement: true,
                        reflections: true,
                        achievements: true,
                        improvements: true,
                        concerns: true
                      }
                    });
                  }}>
                    <Users className="h-4 w-4 mr-2" />
                    Parent Conference
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => {
                    setReportConfig({
                      ...reportConfig,
                      type: 'administrative',
                      anonymized: true,
                      includeComments: false
                    });
                  }}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Admin Summary
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => {
                    setReportConfig({
                      ...reportConfig,
                      type: 'class_summary',
                      dateRange: {
                        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                        end: new Date()
                      }
                    });
                  }}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Weekly Summary
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <ReportTemplatesTab />
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6">
          <ScheduledReportsTab scheduledReports={scheduledReports} />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <ReportHistoryTab />
        </TabsContent>
      </Tabs>

      {/* Report Preview Modal */}
      {previewReport && (
        <ReportPreviewModal 
          report={previewReport} 
          onClose={() => setPreviewReport(null)}
          onDownload={handleDownloadReport}
          onEmail={handleEmailReport}
        />
      )}
    </div>
  );
}

function ReportTemplatesTab() {
  const templates = [
    {
      id: '1',
      name: 'Standard Progress Report',
      description: 'Comprehensive student progress with all metrics',
      type: 'individual',
      lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    },
    {
      id: '2',
      name: 'Parent-Teacher Conference',
      description: 'Focused report for parent meetings',
      type: 'parent_conference',
      lastUsed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    },
    {
      id: '3',
      name: 'Administrative Overview',
      description: 'High-level class performance summary',
      type: 'administrative',
      lastUsed: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    }
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Saved Templates</CardTitle>
          <CardDescription>Reusable report configurations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">{template.name}</h3>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Last used: {template.lastUsed.toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button size="sm">
                    Use Template
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ScheduledReportsTab({ scheduledReports }: { scheduledReports: any[] }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Reports</CardTitle>
          <CardDescription>Automated report delivery</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scheduledReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">{report.name}</h3>
                  <p className="text-sm text-muted-foreground">{report.schedule}</p>
                  <p className="text-xs text-muted-foreground">
                    Last sent: {report.lastSent.toLocaleDateString()} to {report.recipients.length} recipient(s)
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                  <Button variant="outline" size="sm">
                    <Send className="h-4 w-4 mr-2" />
                    Send Now
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportHistoryTab() {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">Report History</h3>
        <p className="text-sm text-muted-foreground">
          Previously generated reports will appear here
        </p>
      </CardContent>
    </Card>
  );
}

function ReportPreviewModal({ report, onClose, onDownload, onEmail }: any) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{report.title}</DialogTitle>
          <DialogDescription>
            Generated on {report.generatedAt.toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {/* Summary Statistics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{report.summary.totalStudents}</div>
                <div className="text-sm text-muted-foreground">Students</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{report.summary.averagePerformance}%</div>
                <div className="text-sm text-muted-foreground">Avg Performance</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{report.summary.engagementRate}%</div>
                <div className="text-sm text-muted-foreground">Engagement</div>
              </div>
            </div>

            <Separator />

            {/* Report Sections */}
            {report.sections.map((section: any, index: number) => (
              <div key={index} className="space-y-2">
                <h3 className="font-semibold">{section.title}</h3>
                <p className="text-sm text-muted-foreground">{section.content}</p>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="outline" onClick={() => onDownload('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={onEmail}>
            <Mail className="h-4 w-4 mr-2" />
            Email Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
