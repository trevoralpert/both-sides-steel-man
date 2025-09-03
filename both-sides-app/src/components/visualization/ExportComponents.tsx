/**
 * Export and Reporting Components
 * 
 * Task 7.5.4: Exportable report generation with PDF, printable summaries,
 * data export in multiple formats, and accessibility compliance.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  FileText, 
  Printer, 
  Mail, 
  Share2, 
  Settings,
  FileSpreadsheet,
  FileImage,
  Calendar,
  User,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportData {
  studentInfo?: {
    id: string;
    name: string;
    class: string;
    dateRange: { start: Date; end: Date };
  };
  learningMetrics?: {
    overallProgress: number;
    skillBreakdown: Record<string, number>;
    plasticityScore: number;
    engagementLevel: number;
  };
  debateHistory?: Array<{
    id: string;
    topic: string;
    date: Date;
    performance: number;
    skills: string[];
  }>;
  reflectionData?: Array<{
    id: string;
    date: Date;
    quality: number;
    insights: string[];
  }>;
  achievements?: Array<{
    id: string;
    title: string;
    description: string;
    dateEarned: Date;
    category: string;
  }>;
  visualizations?: Array<{
    type: 'chart' | 'graph' | 'heatmap';
    title: string;
    data: any;
    config: any;
  }>;
}

interface ExportConfig {
  format: 'pdf' | 'excel' | 'csv' | 'png' | 'json';
  template: 'comprehensive' | 'summary' | 'progress' | 'custom';
  dateRange: { start: Date; end: Date };
  sections: {
    overview: boolean;
    progress: boolean;
    debates: boolean;
    reflections: boolean;
    achievements: boolean;
    comparisons: boolean;
    recommendations: boolean;
  };
  styling: {
    includeCharts: boolean;
    colorScheme: 'default' | 'monochrome' | 'accessible';
    fontSize: 'small' | 'medium' | 'large';
    includeLogos: boolean;
  };
  privacy: {
    anonymizePeerData: boolean;
    excludePersonalNotes: boolean;
    watermark: boolean;
  };
}

interface ExportComponentsProps {
  data: ExportData;
  className?: string;
  onExportComplete?: (success: boolean, format: string) => void;
}

export function ExportComponents({ data, className, onExportComplete }: ExportComponentsProps) {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [config, setConfig] = useState<ExportConfig>({
    format: 'pdf',
    template: 'comprehensive',
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    },
    sections: {
      overview: true,
      progress: true,
      debates: true,
      reflections: true,
      achievements: true,
      comparisons: false,
      recommendations: true
    },
    styling: {
      includeCharts: true,
      colorScheme: 'default',
      fontSize: 'medium',
      includeLogos: true
    },
    privacy: {
      anonymizePeerData: true,
      excludePersonalNotes: false,
      watermark: false
    }
  });

  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate export process
      const steps = [
        'Collecting data...',
        'Generating visualizations...',
        'Formatting content...',
        'Creating document...',
        'Finalizing export...'
      ];

      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800));
        setExportProgress((i + 1) / steps.length * 100);
      }

      // In a real app, this would call the actual export API
      console.log('Exporting with config:', config);
      console.log('Export data:', data);

      // Simulate file download
      const blob = new Blob(['Mock export data'], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `learning-report-${Date.now()}.${config.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onExportComplete?.(true, config.format);
      setIsExportDialogOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      onExportComplete?.(false, config.format);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [config, data, onExportComplete]);

  const quickExport = useCallback((format: string) => {
    const quickConfig = { ...config, format: format as any };
    setConfig(quickConfig);
    handleExport();
  }, [config, handleExport]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Quick Export Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => quickExport('pdf')}>
          <FileText className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
        <Button variant="outline" size="sm" onClick={() => quickExport('excel')}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export Excel
        </Button>
        <Button variant="outline" size="sm" onClick={() => quickExport('png')}>
          <FileImage className="h-4 w-4 mr-2" />
          Export Image
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Advanced Export Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="default">
            <Download className="h-4 w-4 mr-2" />
            Advanced Export
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export Learning Report</DialogTitle>
            <DialogDescription>
              Customize your learning analytics report with advanced options
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="format" className="space-y-6">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="format">Format & Template</TabsTrigger>
              <TabsTrigger value="content">Content Selection</TabsTrigger>
              <TabsTrigger value="styling">Styling Options</TabsTrigger>
              <TabsTrigger value="preview">Preview & Export</TabsTrigger>
            </TabsList>

            <TabsContent value="format" className="space-y-6">
              <FormatSelectionPanel config={config} onChange={setConfig} />
            </TabsContent>

            <TabsContent value="content" className="space-y-6">
              <ContentSelectionPanel config={config} onChange={setConfig} data={data} />
            </TabsContent>

            <TabsContent value="styling" className="space-y-6">
              <StylingOptionsPanel config={config} onChange={setConfig} />
            </TabsContent>

            <TabsContent value="preview" className="space-y-6">
              <PreviewPanel 
                config={config} 
                data={data}
                isExporting={isExporting}
                exportProgress={exportProgress}
                onExport={handleExport}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Export Status */}
      {isExporting && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Exporting Report...</span>
                <span className="text-sm text-muted-foreground">{Math.round(exportProgress)}%</span>
              </div>
              <Progress value={exportProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FormatSelectionPanel({ 
  config, 
  onChange 
}: { 
  config: ExportConfig; 
  onChange: (config: ExportConfig) => void; 
}) {
  const formats = [
    { value: 'pdf', label: 'PDF Document', icon: FileText, description: 'Portable document with charts and formatting' },
    { value: 'excel', label: 'Excel Spreadsheet', icon: FileSpreadsheet, description: 'Structured data with multiple sheets' },
    { value: 'csv', label: 'CSV Data', icon: FileSpreadsheet, description: 'Raw data for analysis' },
    { value: 'png', label: 'Image Export', icon: FileImage, description: 'High-quality image of visualizations' },
    { value: 'json', label: 'JSON Data', icon: FileText, description: 'Machine-readable data format' }
  ];

  const templates = [
    { value: 'comprehensive', label: 'Comprehensive Report', description: 'Full detailed report with all sections' },
    { value: 'summary', label: 'Executive Summary', description: 'High-level overview and key insights' },
    { value: 'progress', label: 'Progress Report', description: 'Focus on learning progress and trends' },
    { value: 'custom', label: 'Custom Selection', description: 'Choose specific sections to include' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold mb-4 block">Export Format</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {formats.map((format) => (
            <div
              key={format.value}
              className={cn(
                "p-4 border rounded-lg cursor-pointer transition-colors",
                config.format === format.value 
                  ? "border-primary bg-primary/5" 
                  : "hover:bg-muted/50"
              )}
              onClick={() => onChange({ ...config, format: format.value as any })}
            >
              <div className="flex items-start space-x-3">
                <format.icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">{format.label}</div>
                  <div className="text-sm text-muted-foreground">{format.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold mb-4 block">Report Template</Label>
        <div className="space-y-2">
          {templates.map((template) => (
            <div
              key={template.value}
              className={cn(
                "p-3 border rounded-lg cursor-pointer transition-colors",
                config.template === template.value 
                  ? "border-primary bg-primary/5" 
                  : "hover:bg-muted/50"
              )}
              onClick={() => onChange({ ...config, template: template.value as any })}
            >
              <div className="font-medium">{template.label}</div>
              <div className="text-sm text-muted-foreground">{template.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold mb-4 block">Date Range</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={config.dateRange.start.toISOString().split('T')[0]}
              onChange={(e) => onChange({
                ...config,
                dateRange: {
                  ...config.dateRange,
                  start: new Date(e.target.value)
                }
              })}
            />
          </div>
          <div>
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={config.dateRange.end.toISOString().split('T')[0]}
              onChange={(e) => onChange({
                ...config,
                dateRange: {
                  ...config.dateRange,
                  end: new Date(e.target.value)
                }
              })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentSelectionPanel({ 
  config, 
  onChange, 
  data 
}: { 
  config: ExportConfig; 
  onChange: (config: ExportConfig) => void; 
  data: ExportData;
}) {
  const sections = [
    { 
      key: 'overview', 
      label: 'Learning Overview', 
      description: 'Summary statistics and key metrics',
      dataAvailable: Boolean(data.learningMetrics)
    },
    { 
      key: 'progress', 
      label: 'Progress Tracking', 
      description: 'Skill development and improvement trends',
      dataAvailable: Boolean(data.learningMetrics)
    },
    { 
      key: 'debates', 
      label: 'Debate History', 
      description: 'Participation records and performance',
      dataAvailable: Boolean(data.debateHistory?.length)
    },
    { 
      key: 'reflections', 
      label: 'Reflection Analysis', 
      description: 'Quality scores and insights',
      dataAvailable: Boolean(data.reflectionData?.length)
    },
    { 
      key: 'achievements', 
      label: 'Achievements & Badges', 
      description: 'Earned recognition and milestones',
      dataAvailable: Boolean(data.achievements?.length)
    },
    { 
      key: 'comparisons', 
      label: 'Peer Comparisons', 
      description: 'Performance relative to classmates',
      dataAvailable: true
    },
    { 
      key: 'recommendations', 
      label: 'Recommendations', 
      description: 'AI-generated learning suggestions',
      dataAvailable: true
    }
  ];

  const handleSectionToggle = (sectionKey: string, enabled: boolean) => {
    onChange({
      ...config,
      sections: {
        ...config.sections,
        [sectionKey]: enabled
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold mb-4 block">Report Sections</Label>
        <div className="space-y-3">
          {sections.map((section) => (
            <div
              key={section.key}
              className={cn(
                "flex items-start space-x-3 p-3 border rounded-lg",
                !section.dataAvailable && "opacity-50"
              )}
            >
              <Checkbox
                id={section.key}
                checked={config.sections[section.key as keyof typeof config.sections]}
                onCheckedChange={(checked) => handleSectionToggle(section.key, Boolean(checked))}
                disabled={!section.dataAvailable}
              />
              <div className="flex-1">
                <Label 
                  htmlFor={section.key} 
                  className="font-medium cursor-pointer"
                >
                  {section.label}
                </Label>
                <div className="text-sm text-muted-foreground">
                  {section.description}
                </div>
                {!section.dataAvailable && (
                  <div className="flex items-center mt-1 text-xs text-yellow-600">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    No data available
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold mb-4 block">Privacy Settings</Label>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="anonymize-peers"
              checked={config.privacy.anonymizePeerData}
              onCheckedChange={(checked) => onChange({
                ...config,
                privacy: {
                  ...config.privacy,
                  anonymizePeerData: Boolean(checked)
                }
              })}
            />
            <Label htmlFor="anonymize-peers" className="cursor-pointer">
              Anonymize peer comparison data
            </Label>
          </div>
          
          <div className="flex items-center space-x-3">
            <Checkbox
              id="exclude-personal"
              checked={config.privacy.excludePersonalNotes}
              onCheckedChange={(checked) => onChange({
                ...config,
                privacy: {
                  ...config.privacy,
                  excludePersonalNotes: Boolean(checked)
                }
              })}
            />
            <Label htmlFor="exclude-personal" className="cursor-pointer">
              Exclude personal notes and comments
            </Label>
          </div>
          
          <div className="flex items-center space-x-3">
            <Checkbox
              id="add-watermark"
              checked={config.privacy.watermark}
              onCheckedChange={(checked) => onChange({
                ...config,
                privacy: {
                  ...config.privacy,
                  watermark: Boolean(checked)
                }
              })}
            />
            <Label htmlFor="add-watermark" className="cursor-pointer">
              Add confidential watermark
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}

function StylingOptionsPanel({ 
  config, 
  onChange 
}: { 
  config: ExportConfig; 
  onChange: (config: ExportConfig) => void; 
}) {
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold mb-4 block">Visual Elements</Label>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="include-charts"
              checked={config.styling.includeCharts}
              onCheckedChange={(checked) => onChange({
                ...config,
                styling: {
                  ...config.styling,
                  includeCharts: Boolean(checked)
                }
              })}
            />
            <Label htmlFor="include-charts" className="cursor-pointer">
              Include charts and visualizations
            </Label>
          </div>
          
          <div className="flex items-center space-x-3">
            <Checkbox
              id="include-logos"
              checked={config.styling.includeLogos}
              onCheckedChange={(checked) => onChange({
                ...config,
                styling: {
                  ...config.styling,
                  includeLogos: Boolean(checked)
                }
              })}
            />
            <Label htmlFor="include-logos" className="cursor-pointer">
              Include school/organization logos
            </Label>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold mb-4 block">Color Scheme</Label>
        <Select 
          value={config.styling.colorScheme} 
          onValueChange={(value) => onChange({
            ...config,
            styling: {
              ...config.styling,
              colorScheme: value as any
            }
          })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default Colors</SelectItem>
            <SelectItem value="monochrome">Black & White</SelectItem>
            <SelectItem value="accessible">High Contrast</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-base font-semibold mb-4 block">Font Size</Label>
        <Select 
          value={config.styling.fontSize} 
          onValueChange={(value) => onChange({
            ...config,
            styling: {
              ...config.styling,
              fontSize: value as any
            }
          })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Small (10pt)</SelectItem>
            <SelectItem value="medium">Medium (12pt)</SelectItem>
            <SelectItem value="large">Large (14pt)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function PreviewPanel({
  config,
  data,
  isExporting,
  exportProgress,
  onExport
}: {
  config: ExportConfig;
  data: ExportData;
  isExporting: boolean;
  exportProgress: number;
  onExport: () => void;
}) {
  const enabledSections = Object.entries(config.sections).filter(([_, enabled]) => enabled);
  const estimatedPages = Math.ceil(enabledSections.length * 1.5);

  return (
    <div className="space-y-6">
      {/* Report Summary */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <h3 className="font-semibold mb-3">Report Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium">Format</div>
            <div className="text-muted-foreground uppercase">{config.format}</div>
          </div>
          <div>
            <div className="font-medium">Template</div>
            <div className="text-muted-foreground capitalize">{config.template.replace('_', ' ')}</div>
          </div>
          <div>
            <div className="font-medium">Sections</div>
            <div className="text-muted-foreground">{enabledSections.length} included</div>
          </div>
          <div>
            <div className="font-medium">Est. Size</div>
            <div className="text-muted-foreground">{estimatedPages} pages</div>
          </div>
        </div>
      </div>

      {/* Section Preview */}
      <div>
        <Label className="text-base font-semibold mb-3 block">Included Sections</Label>
        <div className="space-y-2">
          {enabledSections.map(([sectionKey, _]) => (
            <div key={sectionKey} className="flex items-center space-x-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="capitalize">{sectionKey.replace(/([A-Z])/g, ' $1')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Export Progress */}
      {isExporting && (
        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Generating Report...</span>
            <span className="text-sm text-muted-foreground">{Math.round(exportProgress)}%</span>
          </div>
          <Progress value={exportProgress} className="h-2" />
        </div>
      )}

      {/* Export Button */}
      <div className="flex justify-end space-x-3">
        <Button variant="outline" disabled={isExporting}>
          <Settings className="h-4 w-4 mr-2" />
          Save Template
        </Button>
        <Button onClick={onExport} disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Generate Report'}
        </Button>
      </div>
    </div>
  );
}
