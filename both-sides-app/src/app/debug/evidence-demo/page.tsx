'use client';

/**
 * Debug page for testing Task 6.4.3 Evidence & Source Recommendations
 */

import React, { useState } from 'react';
import { DebatePhase, DebatePosition } from '@/types/debate';
import { EvidencePanel, EvidenceSuggestion, EvidenceSource } from '@/components/debate-room/EvidencePanel';
import { SourceCard } from '@/components/debate-room/SourceCard';
import { QuickCite, CitationFormat } from '@/components/debate-room/QuickCite';
import { FactCheck } from '@/components/debate-room/FactCheck';
import { usePreparationMaterials } from '@/lib/hooks/usePreparationMaterials';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { 
  FileText, 
  Search, 
  Quote, 
  Shield, 
  CheckCircle2,
  BookOpen,
  ExternalLink,
  TrendingUp,
  RefreshCw,
  Star,
  Eye,
  Copy
} from 'lucide-react';

const phases: DebatePhase[] = [
  'PREPARATION',
  'OPENING', 
  'DISCUSSION',
  'REBUTTAL',
  'CLOSING',
  'REFLECTION'
];

const positions: DebatePosition[] = ['PRO', 'CON'];

const testMessages = [
  {
    name: 'Climate Statistics',
    content: 'Global temperatures have risen by 1.2°C since pre-industrial times, causing unprecedented damage.',
    description: 'Tests fact-checking and evidence suggestions'
  },
  {
    name: 'Economic Claims', 
    content: 'Renewable energy creates no jobs and costs too much to implement effectively.',
    description: 'Tests false claim detection and counter-evidence'
  },
  {
    name: 'Research Citation',
    content: 'According to recent studies, carbon emissions have decreased significantly in developed countries.',
    description: 'Tests citation verification and source suggestions'
  },
  {
    name: 'Complex Argument',
    content: 'While climate change is real, the economic costs of rapid decarbonization may outweigh short-term benefits, especially for developing nations.',
    description: 'Tests nuanced argument analysis'
  },
  {
    name: 'Unverifiable Claim',
    content: 'Everyone agrees that the current approach is completely wrong and will never work.',
    description: 'Tests detection of overly broad claims'
  }
];

export default function EvidenceDemoPage() {
  const [currentPhase, setCurrentPhase] = useState<DebatePhase>('DISCUSSION');
  const [currentPosition, setCurrentPosition] = useState<DebatePosition>('PRO');
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedTestMessage, setSelectedTestMessage] = useState<number | null>(null);
  const [insertedEvidence, setInsertedEvidence] = useState<EvidenceSuggestion[]>([]);
  const [insertedCitations, setInsertedCitations] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<EvidenceSource | null>(null);

  // Demo data
  const topicId = 'climate-change-debate';
  const userId = 'demo-user';

  // Preparation materials integration
  const preparationMaterials = usePreparationMaterials({
    topicId,
    userId,
    enabled: true
  });

  const handleLoadTestMessage = (index: number) => {
    setCurrentMessage(testMessages[index].content);
    setSelectedTestMessage(index);
  };

  const handleInsertEvidence = (evidence: EvidenceSuggestion) => {
    setInsertedEvidence(prev => [...prev, evidence]);
    console.log('Evidence inserted:', evidence);
  };

  const handleInsertCitation = (citation: string, format?: CitationFormat) => {
    setInsertedCitations(prev => [...prev, citation]);
    console.log('Citation inserted:', citation, 'Format:', format);
  };

  const handleInsertInlineReference = (reference: string) => {
    setInsertedCitations(prev => [...prev, reference]);
    console.log('Inline reference inserted:', reference);
  };

  const clearInserted = () => {
    setInsertedEvidence([]);
    setInsertedCitations([]);
  };

  // Mock source for QuickCite testing
  const mockSource: EvidenceSource = {
    id: 'test-source',
    title: 'Climate Change Analysis 2023',
    author: 'Dr. Sarah Johnson',
    publication: 'Nature Climate Change',
    publishDate: new Date('2023-08-15'),
    url: 'https://nature.com/articles/climate-analysis-2023',
    excerpt: 'Global temperatures have risen by 1.2°C since pre-industrial times.',
    credibilityScore: 0.95,
    sourceType: 'academic',
    relevanceScore: 0.9,
    position: 'NEUTRAL',
    tags: ['climate', 'temperature', 'research'],
    verified: true,
    lastVerified: new Date('2023-09-01')
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div>
            <h1 className="text-xl font-semibold">Task 6.4.3: Evidence & Source Demo</h1>
            <p className="text-sm text-muted-foreground">
              Testing evidence suggestions, fact-checking, and citation tools
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant="outline">Phase 6.4.3</Badge>
            {preparationMaterials.isLoading && (
              <Badge className="animate-pulse bg-blue-100 text-blue-800">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Loading Materials
              </Badge>
            )}
            {preparationMaterials.hasPreparationData && (
              <Badge className="bg-green-100 text-green-800">
                <BookOpen className="h-3 w-3 mr-1" />
                {preparationMaterials.materialsByPosition.PRO.length +
                 preparationMaterials.materialsByPosition.CON.length +
                 preparationMaterials.materialsByPosition.NEUTRAL.length} Materials
              </Badge>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left Panel - Controls & Testing */}
            <ResizablePanel defaultSize={30} className="p-4">
              <div className="h-full flex flex-col space-y-4">
                {/* Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Demo Controls</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Phase & Position */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Phase:</label>
                          <Select value={currentPhase} onValueChange={(v) => setCurrentPhase(v as DebatePhase)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {phases.map(phase => (
                                <SelectItem key={phase} value={phase}>
                                  {phase}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Position:</label>
                          <Select value={currentPosition} onValueChange={(v) => setCurrentPosition(v as DebatePosition)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {positions.map(position => (
                                <SelectItem key={position} value={position}>
                                  {position}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Test Messages */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Test Messages:</label>
                        <div className="space-y-1">
                          {testMessages.map((test, index) => (
                            <Button
                              key={index}
                              variant={selectedTestMessage === index ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleLoadTestMessage(index)}
                              className="w-full justify-start text-xs h-auto p-2"
                            >
                              <div className="text-left">
                                <div className="font-medium">{test.name}</div>
                                <div className="text-xs opacity-75">{test.description}</div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2">
                        <Button 
                          onClick={clearInserted} 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                        >
                          Clear Results
                        </Button>
                        <Button 
                          onClick={() => preparationMaterials.refreshMaterials()} 
                          variant="ghost" 
                          size="sm"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Message Input */}
                <Card className="flex-1">
                  <CardHeader>
                    <CardTitle className="text-lg">Message Input</CardTitle>
                    <CardDescription>
                      Type or select a test message to analyze
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-full flex flex-col">
                    <Textarea
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      placeholder="Enter your debate message to get evidence suggestions and fact-checking..."
                      className="flex-1 resize-none min-h-[150px]"
                    />
                    
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{currentMessage.length} characters</span>
                      <span>{currentMessage.split(' ').filter(w => w.length > 0).length} words</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Results Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Inserted Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium">Evidence:</span> {insertedEvidence.length} items
                      </div>
                      <div>
                        <span className="font-medium">Citations:</span> {insertedCitations.length} items
                      </div>
                      
                      {insertedEvidence.length > 0 && (
                        <div className="space-y-1">
                          <span className="font-medium">Recent Evidence:</span>
                          {insertedEvidence.slice(-2).map((evidence, index) => (
                            <div key={index} className="text-xs p-2 bg-muted/30 rounded">
                              {evidence.title}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ResizablePanel>

            {/* Resizable Handle */}
            <ResizableHandle />

            {/* Right Panel - Evidence & Tools */}
            <ResizablePanel defaultSize={70}>
              <div className="h-full">
                <Tabs defaultValue="evidence" className="h-full">
                  <div className="p-4 border-b">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="evidence" className="text-xs">
                        <Search className="h-3 w-3 mr-1" />
                        Evidence Panel
                      </TabsTrigger>
                      <TabsTrigger value="factcheck" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        Fact Check
                      </TabsTrigger>
                      <TabsTrigger value="citation" className="text-xs">
                        <Quote className="h-3 w-3 mr-1" />
                        Citations
                      </TabsTrigger>
                      <TabsTrigger value="sources" className="text-xs">
                        <BookOpen className="h-3 w-3 mr-1" />
                        Source Cards
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Evidence Panel Tab */}
                  <TabsContent value="evidence" className="h-full p-4 mt-0">
                    <EvidencePanel
                      topicId={topicId}
                      currentPosition={currentPosition}
                      messageContext={currentMessage}
                      currentPhase={currentPhase}
                      userId={userId}
                      onInsertEvidence={handleInsertEvidence}
                      onInsertCitation={handleInsertCitation}
                    />
                  </TabsContent>

                  {/* Fact Check Tab */}
                  <TabsContent value="factcheck" className="h-full p-4 mt-0">
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Real-time Fact Checking</CardTitle>
                          <CardDescription>
                            Automatic verification of claims as you type
                          </CardDescription>
                        </CardHeader>
                      </Card>
                      
                      <FactCheck 
                        messageContent={currentMessage}
                        realTimeEnabled={true}
                        onFactCheckResult={(result) => {
                          console.log('Fact check result:', result);
                        }}
                      />
                    </div>
                  </TabsContent>

                  {/* Citation Tools Tab */}
                  <TabsContent value="citation" className="h-full p-4 mt-0">
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Citation Generator</CardTitle>
                          <CardDescription>
                            Generate properly formatted citations
                          </CardDescription>
                        </CardHeader>
                      </Card>
                      
                      <QuickCite
                        source={selectedSource || mockSource}
                        onInsertCitation={handleInsertCitation}
                        onInsertInlineReference={handleInsertInlineReference}
                        defaultFormat="debate"
                      />
                    </div>
                  </TabsContent>

                  {/* Source Cards Tab */}
                  <TabsContent value="sources" className="h-full p-4 mt-0">
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Source Cards Demo</CardTitle>
                          <CardDescription>
                            Different variants of source display components
                          </CardDescription>
                        </CardHeader>
                      </Card>
                      
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-medium mb-2">Compact Variant</h3>
                          <SourceCard
                            source={mockSource}
                            variant="compact"
                            onCiteSource={(source) => {
                              const citation = `${source.author}. (${source.publishDate.getFullYear()}). ${source.title}. ${source.publication}.`;
                              handleInsertCitation(citation);
                            }}
                            onBookmarkToggle={(id) => console.log('Bookmark toggled:', id)}
                          />
                        </div>
                        
                        <div>
                          <h3 className="font-medium mb-2">Default Variant</h3>
                          <SourceCard
                            source={mockSource}
                            variant="default"
                            onCiteSource={(source) => {
                              const citation = `${source.author}. (${source.publishDate.getFullYear()}). ${source.title}. ${source.publication}.`;
                              handleInsertCitation(citation);
                              setSelectedSource(source);
                            }}
                            onInsertReference={(source) => {
                              handleInsertEvidence({
                                id: `evidence-${Date.now()}`,
                                type: 'study',
                                title: source.title,
                                description: source.excerpt,
                                content: source.excerpt,
                                source,
                                strength: 'high',
                                contextRelevance: source.relevanceScore,
                                citations: [`${source.author}. (${source.publishDate.getFullYear()}). ${source.title}. ${source.publication}.`],
                                tags: source.tags,
                                lastUpdated: source.publishDate
                              });
                            }}
                            onBookmarkToggle={(id) => console.log('Bookmark toggled:', id)}
                          />
                        </div>
                        
                        <div>
                          <h3 className="font-medium mb-2">Detailed Variant</h3>
                          <SourceCard
                            source={mockSource}
                            variant="detailed"
                            onCiteSource={(source) => {
                              const citation = `${source.author}. (${source.publishDate.getFullYear()}). ${source.title}. ${source.publication}.`;
                              handleInsertCitation(citation);
                            }}
                            onViewDetails={(source) => console.log('View details:', source)}
                            onBookmarkToggle={(id) => console.log('Bookmark toggled:', id)}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Footer - Success Criteria */}
        <div className="border-t bg-card p-4">
          <div className="max-w-6xl mx-auto">
            <h3 className="font-medium mb-2">Task 6.4.3 Success Criteria</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Relevant evidence suggestions for current argument</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Clear source credibility indicators</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Easy integration of evidence into messages</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Educational value in research guidance</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
