'use client';

/**
 * Phase 6 Task 6.2.3: Message Input & Sending Demo
 * 
 * Comprehensive demo page for testing the enhanced message input system
 * with rich text, validation, formatting, and real-time features
 */

import React, { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageInput } from '@/components/debate-room/MessageInput';
import { DebateFooter } from '@/components/debate-room/DebateFooter';
import { 
  ArrowLeft, 
  Send, 
  MessageSquare, 
  Edit,
  Type,
  CheckCircle,
  AlertTriangle,
  Zap,
  Users,
  Clock,
  Eye,
  Keyboard,
  Heart,
  Flag
} from 'lucide-react';
import Link from 'next/link';

export default function MessageInputDemo() {
  const [testMessage, setTestMessage] = useState('');
  const [testMessage2, setTestMessage2] = useState('');
  const [validationExample, setValidationExample] = useState('This is a test message with **bold text** and *italic text*.');
  const [isConnected, setIsConnected] = useState(true);
  const [sentMessages, setSentMessages] = useState<string[]>([]);
  const [typingActivity, setTypingActivity] = useState<string[]>([]);
  
  // Mock reply context for testing
  const [mockReply, setMockReply] = useState<{
    id: string;
    content: string;
    authorName: string;
  } | undefined>();

  // Sample messages for reply context
  const sampleMessages = [
    {
      id: 'msg-1',
      content: 'I believe AI regulation is essential for preventing potential misuse while still allowing innovation to flourish.',
      authorName: 'Alice'
    },
    {
      id: 'msg-2', 
      content: 'That\'s an interesting perspective, but I think excessive regulation could stifle breakthrough developments in medical AI.',
      authorName: 'Bob'
    },
    {
      id: 'msg-3',
      content: 'Consider the pharmaceutical industry as an example - FDA regulations haven\'t stopped innovation, they\'ve guided it toward safer, more effective treatments.',
      authorName: 'Charlie'
    }
  ];

  const handleSendMessage = async (content: string) => {
    console.log('Sending message:', content);
    setSentMessages(prev => [...prev, content]);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return Promise.resolve();
  };

  const handleTypingStart = () => {
    setTypingActivity(prev => [...prev, `${new Date().toLocaleTimeString()}: Started typing`]);
  };

  const handleTypingStop = () => {
    setTypingActivity(prev => [...prev, `${new Date().toLocaleTimeString()}: Stopped typing`]);
  };

  const connectionStates = [
    { value: 'connected', label: 'Connected', color: 'bg-green-500' },
    { value: 'connecting', label: 'Connecting', color: 'bg-yellow-500' },
    { value: 'disconnected', label: 'Disconnected', color: 'bg-gray-500' },
    { value: 'failed', label: 'Failed', color: 'bg-red-500' }
  ];

  const [connectionState, setConnectionState] = useState<'connected' | 'connecting' | 'disconnected' | 'failed'>('connected');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild size="sm">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Enhanced Message Input Demo</h1>
            <p className="text-muted-foreground">Task 6.2.3: Rich text input with real-time validation and advanced features</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Enhanced Message Input Components */}
          <div className="space-y-4">
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Type className="h-5 w-5" />
                  <span>Standalone Message Input</span>
                </CardTitle>
                <CardDescription>
                  Direct MessageInput component with all features enabled
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MessageInput
                  value={testMessage}
                  onChange={setTestMessage}
                  onSend={handleSendMessage}
                  placeholder="Type your message here... Try **bold** or *italic*"
                  maxLength={500}
                  disabled={false}
                  isConnected={isConnected}
                  enableRealTimeValidation={true}
                  enableMarkdownShortcuts={true}
                  enableFormattingToolbar={true}
                  showPreview={true}
                  onTypingStart={handleTypingStart}
                  onTypingStop={handleTypingStop}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Integrated DebateFooter</span>
                </CardTitle>
                <CardDescription>
                  Full DebateFooter component with connection status and enhanced input
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DebateFooter
                  onSendMessage={handleSendMessage}
                  placeholder="Share your debate perspective..."
                  maxLength={2000}
                  connectionState={connectionState}
                  replyToMessage={mockReply}
                  onCancelReply={() => setMockReply(undefined)}
                  onTypingStart={handleTypingStart}
                  onTypingStop={handleTypingStop}
                  enableAdvancedFeatures={true}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>Validation Testing</span>
                </CardTitle>
                <CardDescription>
                  Test real-time validation with different content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MessageInput
                  value={validationExample}
                  onChange={setValidationExample}
                  onSend={async (content) => {
                    console.log('Validation test message:', content);
                  }}
                  placeholder="Type here to test validation..."
                  maxLength={100}
                  enableRealTimeValidation={true}
                  enableFormattingToolbar={false}
                  showPreview={false}
                />
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>Try these validation tests:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Type more than 100 characters to see length validation</li>
                    <li>Use ALL CAPS to see shouting warning</li>
                    <li>Type "aaaaaaa" to see repeated character warning</li>
                    <li>Type just "hi" to see length suggestion</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls and Status */}
          <div className="space-y-4">
            
            {/* Connection Status Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>Connection Controls</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {connectionStates.map((state) => (
                    <Button
                      key={state.value}
                      variant={connectionState === state.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setConnectionState(state.value as any)}
                      className="justify-start"
                    >
                      <div className={`w-2 h-2 rounded-full ${state.color} mr-2`} />
                      {state.label}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm">Input Enabled:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsConnected(!isConnected)}
                  >
                    {isConnected ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Reply Context Testing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Reply Testing</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Select a message to reply to:
                </p>
                <div className="space-y-2">
                  {sampleMessages.map((msg) => (
                    <div key={msg.id} className="border rounded-md p-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            {msg.authorName}
                          </div>
                          <div className="text-sm line-clamp-2">
                            {msg.content}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMockReply(msg)}
                          className="ml-2 h-auto py-1 px-2 text-xs"
                        >
                          Reply
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {mockReply && (
                  <Alert>
                    <MessageSquare className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Currently replying to {mockReply.authorName}: "{mockReply.content.substring(0, 50)}..."
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Activity Log */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Activity Log</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Tabs defaultValue="messages">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="messages">Messages ({sentMessages.length})</TabsTrigger>
                    <TabsTrigger value="typing">Typing ({typingActivity.length})</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="messages" className="mt-3">
                    <div className="h-32 overflow-y-auto border rounded-md p-2 bg-accent/5">
                      {sentMessages.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No messages sent yet</p>
                      ) : (
                        <div className="space-y-1">
                          {sentMessages.map((msg, index) => (
                            <div key={index} className="text-sm p-1 bg-accent/20 rounded">
                              {msg}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="typing" className="mt-3">
                    <div className="h-32 overflow-y-auto border rounded-md p-2 bg-accent/5">
                      {typingActivity.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No typing activity</p>
                      ) : (
                        <div className="space-y-1">
                          {typingActivity.map((activity, index) => (
                            <div key={index} className="text-xs font-mono text-muted-foreground">
                              {activity}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Feature Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Features Demonstrated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Type className="h-4 w-4 text-blue-500" />
                      <span>Rich Text Formatting</span>
                    </div>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Real-time Validation</span>
                    </div>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Keyboard className="h-4 w-4 text-purple-500" />
                      <span>Keyboard Shortcuts</span>
                    </div>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4 text-orange-500" />
                      <span>Reply System</span>
                    </div>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span>Typing Indicators</span>
                    </div>
                    <Badge variant="outline" className="text-xs">Prepared</Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4 text-indigo-500" />
                      <span>Live Preview</span>
                    </div>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>

                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Keyboard Shortcuts Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Keyboard Shortcuts & Features</CardTitle>
            <CardDescription>Complete reference for all enhanced message input features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Formatting Shortcuts</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bold:</span>
                    <code className="text-xs">Ctrl+B</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Italic:</span>
                    <code className="text-xs">Ctrl+I</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Code:</span>
                    <code className="text-xs">Ctrl+`</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quote:</span>
                    <code className="text-xs">Ctrl+&gt;</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">List:</span>
                    <code className="text-xs">Ctrl+L</code>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Sending & Navigation</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Send:</span>
                    <code className="text-xs">Enter</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">New Line:</span>
                    <code className="text-xs">Shift+Enter</code>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Validation Features</h4>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <div>• Character count limits</div>
                  <div>• Content quality checks</div>
                  <div>• Real-time suggestions</div>
                  <div>• Markdown formatting hints</div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
