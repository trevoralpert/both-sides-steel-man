'use client';

/**
 * Phase 6 Task 6.4.3: Quick Cite Component
 * 
 * Citation insertion functionality with multiple formats and styles
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { EvidenceSource } from './EvidencePanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Quote, 
  Copy, 
  Check, 
  Edit3, 
  BookOpen, 
  FileText, 
  Link, 
  Settings, 
  Sparkles,
  Calendar,
  User,
  Globe,
  ChevronDown,
  Wand2
} from 'lucide-react';

export interface QuickCiteProps {
  source?: EvidenceSource;
  onInsertCitation: (citation: string, format: CitationFormat) => void;
  onInsertInlineReference: (reference: string) => void;
  defaultFormat?: CitationFormat;
  className?: string;
}

// Citation format types
export type CitationFormat = 'apa' | 'mla' | 'chicago' | 'debate' | 'simple';

// Citation style configurations
const citationFormats = {
  apa: {
    name: 'APA Style',
    description: 'American Psychological Association format',
    example: 'Smith, J. (2023). Climate change analysis. Nature Climate Change.'
  },
  mla: {
    name: 'MLA Style', 
    description: 'Modern Language Association format',
    example: 'Smith, John. "Climate Change Analysis." Nature Climate Change, 2023.'
  },
  chicago: {
    name: 'Chicago Style',
    description: 'Chicago Manual of Style format',
    example: 'Smith, John. "Climate Change Analysis." Nature Climate Change (2023).'
  },
  debate: {
    name: 'Debate Format',
    description: 'Optimized for debate conversations',
    example: 'According to Dr. Smith from Nature Climate Change (2023)...'
  },
  simple: {
    name: 'Simple',
    description: 'Basic source reference',
    example: 'Source: Smith, Nature Climate Change, 2023'
  }
} as const;

// Inline reference templates
const inlineReferenceTemplates = [
  'According to {author} from {publication} ({year})',
  'As {author} notes in {publication}',
  'Research by {author} shows that',
  '{publication} reports that',
  'A {year} study in {publication} found that',
  'Data from {publication} indicates',
  'In their research, {author} demonstrates',
  'As published in {publication}'
];

export function QuickCite({
  source,
  onInsertCitation,
  onInsertInlineReference,
  defaultFormat = 'debate',
  className
}: QuickCiteProps) {
  const [selectedFormat, setSelectedFormat] = useState<CitationFormat>(defaultFormat);
  const [customCitation, setCustomCitation] = useState('');
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(0);

  // Generate citation based on format and source
  const generateCitation = useCallback((format: CitationFormat, sourceData: EvidenceSource): string => {
    const year = sourceData.publishDate.getFullYear();
    
    switch (format) {
      case 'apa':
        return `${sourceData.author}. (${year}). ${sourceData.title}. ${sourceData.publication}.`;
      
      case 'mla':
        return `${sourceData.author}. "${sourceData.title}." ${sourceData.publication}, ${year}.`;
      
      case 'chicago':
        return `${sourceData.author}. "${sourceData.title}." ${sourceData.publication} (${year}).`;
      
      case 'debate':
        const authorFirst = sourceData.author.split(' ')[0];
        return `According to ${sourceData.author} from ${sourceData.publication} (${year})`;
      
      case 'simple':
        return `Source: ${sourceData.author}, ${sourceData.publication}, ${year}`;
      
      default:
        return `${sourceData.author}. ${sourceData.title}. ${sourceData.publication}, ${year}.`;
    }
  }, []);

  // Generate inline reference
  const generateInlineReference = useCallback((template: string, sourceData: EvidenceSource): string => {
    return template
      .replace('{author}', sourceData.author)
      .replace('{publication}', sourceData.publication)
      .replace('{year}', sourceData.publishDate.getFullYear().toString())
      .replace('{title}', sourceData.title);
  }, []);

  // Handle citation copy
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy citation:', error);
    }
  }, []);

  // Handle citation insertion
  const handleInsertCitation = useCallback((citation: string, format: CitationFormat) => {
    onInsertCitation(citation, format);
  }, [onInsertCitation]);

  // Handle inline reference insertion
  const handleInsertInlineReference = useCallback((reference: string) => {
    onInsertInlineReference(reference);
  }, [onInsertInlineReference]);

  if (!source) {
    return (
      <Card className={cn("w-full max-w-md", className)}>
        <CardContent className="p-6 text-center">
          <Quote className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">
            Select a source to generate citations
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentCitation = isCustomizing ? customCitation : generateCitation(selectedFormat, source);
  const currentInlineRef = generateInlineReference(inlineReferenceTemplates[selectedTemplate], source);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Quick Actions */}
      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          onClick={() => handleInsertCitation(currentCitation, selectedFormat)}
          className="flex-1"
        >
          <Quote className="h-3 w-3 mr-2" />
          Insert Citation
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleInsertInlineReference(currentInlineRef)}
          className="flex-1"
        >
          <Link className="h-3 w-3 mr-2" />
          Insert Reference
        </Button>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="px-2">
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Citation Generator</DialogTitle>
              <DialogDescription>
                Generate and customize citations for your debate
              </DialogDescription>
            </DialogHeader>
            <CitationDialog 
              source={source}
              onInsertCitation={handleInsertCitation}
              onInsertInlineReference={handleInsertInlineReference}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Preview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Citation Preview</CardTitle>
            <Select value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as CitationFormat)}>
              <SelectTrigger className="w-32 h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(citationFormats).map(([key, format]) => (
                  <SelectItem key={key} value={key}>
                    {format.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="bg-muted/30 p-3 rounded border-l-2 border-blue-200">
            <p className="text-sm font-mono">
              {currentCitation}
            </p>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <Badge variant="outline" className="text-xs">
              {citationFormats[selectedFormat].name}
            </Badge>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(currentCitation)}
              className="h-6 px-2 text-xs"
            >
              {copied ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inline Reference Preview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Inline Reference</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="bg-amber-50 p-3 rounded border-l-2 border-amber-200">
            <p className="text-sm">
              {currentInlineRef}...
            </p>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-1">
              {inlineReferenceTemplates.slice(0, 3).map((_, index) => (
                <Button
                  key={index}
                  variant={selectedTemplate === index ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedTemplate(index)}
                  className="h-6 w-6 p-0 text-xs"
                >
                  {index + 1}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTemplate((prev) => (prev + 1) % inlineReferenceTemplates.length)}
                className="h-6 px-2 text-xs"
              >
                <ChevronDown className="h-3 w-3 mr-1" />
                More
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(currentInlineRef)}
              className="h-6 px-2 text-xs"
            >
              {copied ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Full citation dialog component
function CitationDialog({
  source,
  onInsertCitation,
  onInsertInlineReference
}: {
  source: EvidenceSource;
  onInsertCitation: (citation: string, format: CitationFormat) => void;
  onInsertInlineReference: (reference: string) => void;
}) {
  const [selectedFormat, setSelectedFormat] = useState<CitationFormat>('debate');
  const [customCitation, setCustomCitation] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const generateCitation = (format: CitationFormat): string => {
    const year = source.publishDate.getFullYear();
    
    switch (format) {
      case 'apa':
        return `${source.author}. (${year}). ${source.title}. ${source.publication}.`;
      case 'mla':
        return `${source.author}. "${source.title}." ${source.publication}, ${year}.`;
      case 'chicago':
        return `${source.author}. "${source.title}." ${source.publication} (${year}).`;
      case 'debate':
        return `According to ${source.author} from ${source.publication} (${year})`;
      case 'simple':
        return `Source: ${source.author}, ${source.publication}, ${year}`;
      default:
        return `${source.author}. ${source.title}. ${source.publication}, ${year}.`;
    }
  };

  const currentCitation = isEditing ? customCitation : generateCitation(selectedFormat);

  return (
    <div className="space-y-6">
      {/* Source Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Source Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Title:</span>
              <p className="text-muted-foreground">{source.title}</p>
            </div>
            <div>
              <span className="font-medium">Author:</span>
              <p className="text-muted-foreground">{source.author}</p>
            </div>
            <div>
              <span className="font-medium">Publication:</span>
              <p className="text-muted-foreground">{source.publication}</p>
            </div>
            <div>
              <span className="font-medium">Date:</span>
              <p className="text-muted-foreground">{source.publishDate.toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Citation Generation */}
      <Tabs value={isEditing ? 'custom' : 'format'} onValueChange={(v) => setIsEditing(v === 'custom')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="format">
            <Wand2 className="h-3 w-3 mr-2" />
            Auto Generate
          </TabsTrigger>
          <TabsTrigger value="custom">
            <Edit3 className="h-3 w-3 mr-2" />
            Custom Edit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="format" className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {Object.entries(citationFormats).map(([key, format]) => (
              <Card 
                key={key} 
                className={cn(
                  "cursor-pointer transition-all",
                  selectedFormat === key && "ring-2 ring-blue-500 bg-blue-50"
                )}
                onClick={() => setSelectedFormat(key as CitationFormat)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{format.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {key.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {format.description}
                  </p>
                  <div className="bg-muted/30 p-2 rounded text-xs font-mono">
                    {generateCitation(key as CitationFormat)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Custom Citation:</label>
            <Textarea
              value={customCitation}
              onChange={(e) => setCustomCitation(e.target.value)}
              placeholder="Enter your custom citation format..."
              className="min-h-[100px]"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Available Variables:</label>
            <div className="flex flex-wrap gap-2">
              {['{author}', '{title}', '{publication}', '{year}', '{url}'].map((variable) => (
                <Button
                  key={variable}
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomCitation(prev => prev + variable)}
                  className="h-6 text-xs"
                >
                  {variable}
                </Button>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Final Citation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 p-4 rounded border-l-4 border-blue-500 mb-4">
            <p className="text-sm font-mono">
              {currentCitation}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => onInsertCitation(currentCitation, selectedFormat)}
              className="flex-1"
            >
              <Quote className="h-4 w-4 mr-2" />
              Insert Citation
            </Button>
            
            <Button
              variant="outline"
              onClick={() => navigator.clipboard.writeText(currentCitation)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default QuickCite;
