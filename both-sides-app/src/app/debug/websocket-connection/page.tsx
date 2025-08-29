'use client';

/**
 * Phase 6 Task 6.2.1: WebSocket Connection Demo
 * 
 * Debug page for testing WebSocket connection management,
 * connection status indicators, and real-time functionality
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ConnectionStatusIndicator,
  ConnectionErrorAlert,
  ConnectionQualityIndicator,
  useConversationConnection,
  useConnectionStatus
} from '@/components/connection';
import { ArrowLeft, Send, Zap, Activity, MessageSquare, Users, Wifi } from 'lucide-react';
import Link from 'next/link';

interface TestMessage {
  id: string;
  content: string;
  timestamp: Date;
  type: 'sent' | 'received';
}

export default function WebSocketConnectionDemo() {
  const [conversationId, setConversationId] = useState('demo-conversation-123');
  const [testMessage, setTestMessage] = useState('');
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [isTestingLatency, setIsTestingLatency] = useState(false);
  const [latencyResults, setLatencyResults] = useState<number[]>([]);

  // Connection hook
  const connection = useConversationConnection(conversationId);
  const connectionStatus = useConnectionStatus(connection);

  // Subscribe to messages
  useEffect(() => {
    const unsubscribe = connection.subscribe('message', (data: any) => {
      if (data.data && data.data.content) {
        const newMessage: TestMessage = {
          id: data.id || `received-${Date.now()}`,
          content: data.data.content,
          timestamp: new Date(data.timestamp || Date.now()),
          type: 'received'
        };
        
        setMessages(prev => [...prev, newMessage]);
      }
    });

    return unsubscribe;
  }, [connection]);

  // Send test message
  const handleSendMessage = async () => {
    if (!testMessage.trim() || !connection.isConnected) return;

    const message: TestMessage = {
      id: `sent-${Date.now()}`,
      content: testMessage,
      timestamp: new Date(),
      type: 'sent'
    };

    setMessages(prev => [...prev, message]);

    try {
      await connection.sendMessage({
        content: testMessage,
        type: 'test'
      });
      setTestMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Test latency
  const testLatency = async () => {
    if (!connection.isConnected) return;
    
    setIsTestingLatency(true);
    const results: number[] = [];
    
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      
      try {
        await connection.sendMessage({
          type: 'ping',
          timestamp: start
        });
        
        // Wait for response (simulated)
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
        
        const latency = Date.now() - start;
        results.push(latency);
        
        setLatencyResults([...results]);
      } catch (error) {
        console.error('Latency test failed:', error);
        break;
      }
      
      // Wait between pings
      if (i < 4) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setIsTestingLatency(false);
  };

  // Clear messages
  const clearMessages = () => {
    setMessages([]);
    setLatencyResults([]);
  };

  const averageLatency = latencyResults.length > 0 
    ? Math.round(latencyResults.reduce((a, b) => a + b, 0) / latencyResults.length)
    : undefined;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild size="sm">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">WebSocket Connection Demo</h1>
            <p className="text-muted-foreground">Task 6.2.1: Testing real-time connection management and status indicators</p>
          </div>
        </div>

        {/* Connection Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wifi className="h-5 w-5" />
              <span>Connection Configuration</span>
            </CardTitle>
            <CardDescription>Configure and monitor WebSocket connection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Connection ID Input */}
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Label htmlFor="conversationId">Conversation ID</Label>
                <Input
                  id="conversationId"
                  value={conversationId}
                  onChange={(e) => setConversationId(e.target.value)}
                  placeholder="Enter conversation ID"
                />
              </div>
              <div className="pt-6">
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Reconnect
                </Button>
              </div>
            </div>

            <Separator />

            {/* Connection Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Compact Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Compact Status</Label>
                <ConnectionStatusIndicator
                  connection={connection}
                  variant="compact"
                  showLatency={true}
                  showReconnectButton={true}
                />
              </div>

              {/* Minimal Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Minimal Status</Label>
                <ConnectionStatusIndicator
                  connection={connection}
                  variant="minimal"
                />
              </div>

              {/* Quality Indicator */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Connection Quality</Label>
                <div className="flex items-center space-x-3">
                  <ConnectionQualityIndicator latency={connection.latency} />
                  {connection.latency && (
                    <span className="text-sm text-muted-foreground">
                      {Math.round(connection.latency)}ms
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Status */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Detailed Status</Label>
              <ConnectionStatusIndicator
                connection={connection}
                variant="detailed"
                showLatency={true}
                showReconnectButton={true}
              />
            </div>

            {/* Connection Error Alert */}
            <ConnectionErrorAlert
              connection={connection}
              onRetry={connection.reconnect}
            />
          </CardContent>
        </Card>

        <Tabs defaultValue="testing" className="w-full">
          
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="testing">Message Testing</TabsTrigger>
            <TabsTrigger value="latency">Latency Testing</TabsTrigger>
            <TabsTrigger value="metrics">Connection Metrics</TabsTrigger>
          </TabsList>

          {/* Message Testing Tab */}
          <TabsContent value="testing" className="space-y-6">
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Real-time Message Testing</span>
                </CardTitle>
                <CardDescription>Test message sending and receiving via WebSocket</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Message Input */}
                <div className="flex space-x-2">
                  <Input
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter test message..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={!connection.isConnected}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!connection.isConnected || !testMessage.trim()}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                  <Button 
                    onClick={clearMessages}
                    variant="outline"
                  >
                    Clear
                  </Button>
                </div>

                {/* Connection Status */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={connectionStatus.isConnected ? 'default' : 'destructive'}
                      >
                        {connection.connectionState}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {connectionStatus.isConnected ? 'Ready to send' : 'Cannot send messages'}
                      </span>
                    </div>
                  </div>
                  {connection.latency && (
                    <div className="text-sm text-muted-foreground">
                      Latency: {Math.round(connection.latency)}ms
                    </div>
                  )}
                </div>

                {/* Message History */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'sent' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] p-3 rounded-lg ${
                        message.type === 'sent' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.type === 'sent' 
                            ? 'text-primary-foreground/70' 
                            : 'text-muted-foreground'
                        }`}>
                          {message.timestamp.toLocaleTimeString()} • {message.type}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {messages.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No messages yet. Send a test message to begin.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Latency Testing Tab */}
          <TabsContent value="latency" className="space-y-6">
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Latency & Performance Testing</span>
                </CardTitle>
                <CardDescription>Test connection latency and performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Test Controls */}
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={testLatency}
                    disabled={!connection.isConnected || isTestingLatency}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {isTestingLatency ? 'Testing...' : 'Test Latency'}
                  </Button>
                  
                  <Button
                    onClick={() => setLatencyResults([])}
                    variant="outline"
                    disabled={latencyResults.length === 0}
                  >
                    Clear Results
                  </Button>
                  
                  {isTestingLatency && (
                    <div className="flex items-center space-x-2">
                      <Progress value={(latencyResults.length / 5) * 100} className="w-32" />
                      <span className="text-sm text-muted-foreground">
                        {latencyResults.length}/5
                      </span>
                    </div>
                  )}
                </div>

                {/* Latency Results */}
                {latencyResults.length > 0 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {latencyResults.map((latency, index) => (
                        <div key={index} className="text-center p-3 bg-muted rounded-lg">
                          <div className="text-2xl font-bold">{latency}ms</div>
                          <div className="text-xs text-muted-foreground">Ping {index + 1}</div>
                        </div>
                      ))}
                      
                      {averageLatency && (
                        <div className="text-center p-3 bg-primary/10 rounded-lg">
                          <div className="text-2xl font-bold text-primary">{averageLatency}ms</div>
                          <div className="text-xs text-muted-foreground">Average</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <ConnectionQualityIndicator latency={averageLatency} />
                      <span className="text-sm text-muted-foreground">
                        Connection Quality: {
                          !averageLatency ? 'Unknown' :
                          averageLatency < 50 ? 'Excellent' :
                          averageLatency < 100 ? 'Good' :
                          averageLatency < 200 ? 'Fair' : 'Poor'
                        }
                      </span>
                    </div>
                  </div>
                )}
                
                {!connection.isConnected && (
                  <Alert>
                    <Activity className="h-4 w-4" />
                    <AlertDescription>
                      Connection required for latency testing. Please establish a connection first.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Connection Metrics Tab */}
          <TabsContent value="metrics" className="space-y-6">
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Connection Metrics</span>
                </CardTitle>
                <CardDescription>Real-time connection statistics and health metrics</CardDescription>
              </CardHeader>
              <CardContent>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  {/* Connection State */}
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-lg font-semibold capitalize">{connection.connectionState}</div>
                    <div className="text-sm text-muted-foreground">Connection State</div>
                  </div>

                  {/* Connection ID */}
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-lg font-semibold font-mono">
                      {connection.connectionId?.slice(-8) || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Connection ID</div>
                  </div>

                  {/* Reconnect Attempts */}
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-lg font-semibold">{connection.reconnectAttempt}</div>
                    <div className="text-sm text-muted-foreground">Reconnect Attempts</div>
                  </div>

                  {/* Last Connected */}
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-lg font-semibold">
                      {connection.lastConnectedAt ? 
                        connection.lastConnectedAt.toLocaleTimeString() : 
                        'Never'
                      }
                    </div>
                    <div className="text-sm text-muted-foreground">Last Connected</div>
                  </div>

                  {/* Messages Sent */}
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-lg font-semibold">
                      {messages.filter(m => m.type === 'sent').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Messages Sent</div>
                  </div>

                  {/* Messages Received */}
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-lg font-semibold">
                      {messages.filter(m => m.type === 'received').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Messages Received</div>
                  </div>
                </div>

                {/* Connection Timeline */}
                <div className="mt-6 space-y-2">
                  <Label className="text-sm font-medium">Connection Events</Label>
                  <div className="space-y-1 max-h-32 overflow-y-auto text-xs font-mono bg-muted p-3 rounded">
                    <div className="text-muted-foreground">
                      {new Date().toLocaleTimeString()} - Connection status: {connection.connectionState}
                    </div>
                    {connection.error && (
                      <div className="text-red-600">
                        {new Date().toLocaleTimeString()} - Error: {connection.error}
                      </div>
                    )}
                    {connection.reconnectAttempt > 0 && (
                      <div className="text-orange-600">
                        {new Date().toLocaleTimeString()} - Reconnect attempt #{connection.reconnectAttempt}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
