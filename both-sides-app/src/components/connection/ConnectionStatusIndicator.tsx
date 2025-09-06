'use client';

/**
 * Phase 6 Task 6.2.1: Connection Status Components
 * 
 * Visual indicators for WebSocket connection status with user feedback
 * and manual reconnection controls
 */

import React, { useState } from 'react';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Wifi,
  WifiOff,
  Loader2,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Clock,
  Signal,
  Zap,
  X
} from 'lucide-react';
import { ConnectionState, RealtimeConnection } from '@/lib/hooks/useRealtimeConnection';
import { useConnectionStatus } from '@/lib/hooks/useRealtimeConnection';

export interface ConnectionStatusIndicatorProps {
  connection: RealtimeConnection;
  variant?: 'compact' | 'detailed' | 'minimal';
  showLatency?: boolean;
  showReconnectButton?: boolean;
  className?: string;
}

export interface ConnectionErrorAlertProps {
  connection: RealtimeConnection;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export interface ReconnectionDialogProps {
  isOpen: boolean;
  connection: RealtimeConnection;
  onClose: () => void;
  onReconnect: () => void;
}

// Get status configuration for different connection states
function getStatusConfig(state: ConnectionState, isOnline: boolean) {
  if (!isOnline) {
    return {
      icon: WifiOff,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      label: 'Offline',
      description: 'No internet connection',
      variant: 'destructive' as const,
      pulse: false
    };
  }

  switch (state) {
    case 'connected':
      return {
        icon: CheckCircle,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        label: 'Connected',
        description: 'Real-time connection active',
        variant: 'default' as const,
        pulse: false
      };
    
    case 'connecting':
      return {
        icon: Loader2,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        label: 'Connecting',
        description: 'Establishing connection...',
        variant: 'secondary' as const,
        pulse: true
      };
    
    case 'disconnected':
      return {
        icon: WifiOff,
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        label: 'Disconnected',
        description: 'Connection lost',
        variant: 'outline' as const,
        pulse: false
      };
    
    case 'failed':
      return {
        icon: AlertTriangle,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        label: 'Failed',
        description: 'Connection failed',
        variant: 'destructive' as const,
        pulse: false
      };
    
    case 'suspended':
      return {
        icon: Clock,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
        label: 'Suspended',
        description: 'Connection suspended',
        variant: 'outline' as const,
        pulse: false
      };
    
    default:
      return {
        icon: WifiOff,
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        label: 'Unknown',
        description: 'Connection status unknown',
        variant: 'outline' as const,
        pulse: false
      };
  }
}

// Compact connection status indicator
export function ConnectionStatusIndicator({
  connection,
  variant = 'compact',
  showLatency = true,
  showReconnectButton = true,
  className
}: ConnectionStatusIndicatorProps) {
  const status = useConnectionStatus(connection);
  const config = getStatusConfig(connection.connectionState, status.isOnline);
  const [showDialog, setShowDialog] = useState(false);

  const IconComponent = config.icon;

  if (variant === 'minimal') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className={cn("flex items-center", className)}>
              <IconComponent 
                className={cn(
                  "h-4 w-4",
                  config.color,
                  config.pulse && "animate-spin"
                )} 
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{config.label}</p>
              <p className="text-xs text-muted-foreground">{config.description}</p>
              {showLatency && status.latency && (
                <p className="text-xs">Latency: {Math.round(status.latency)}ms</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <div className={cn(
          "flex items-center space-x-1.5 px-2 py-1 rounded-md text-xs font-medium",
          config.bgColor,
          config.color
        )}>
          <IconComponent 
            className={cn(
              "h-3.5 w-3.5",
              config.pulse && "animate-spin"
            )} 
          />
          <span>{config.label}</span>
        </div>
        
        {showLatency && status.latency && (
          <Badge variant="outline" className="text-xs">
            {Math.round(status.latency)}ms
          </Badge>
        )}
        
        {showReconnectButton && !status.isConnected && status.canReconnect && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowDialog(true)}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reconnect
          </Button>
        )}

        <ReconnectionDialog
          isOpen={showDialog}
          connection={connection}
          onClose={() => setShowDialog(false)}
          onReconnect={() => {
            connection.reconnect();
            setShowDialog(false);
          }}
        />
      </div>
    );
  }

  // Detailed variant
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "p-2 rounded-full",
            config.bgColor
          )}>
            <IconComponent 
              className={cn(
                "h-5 w-5",
                config.color,
                config.pulse && "animate-spin"
              )} 
            />
          </div>
          
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium">{config.label}</span>
              <Badge variant={config.variant} className="text-xs">
                {connection.connectionState}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {config.description}
            </p>
            
            {/* Connection details */}
            <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
              {status.latency && (
                <div className="flex items-center space-x-1">
                  <Signal className="h-3 w-3" />
                  <span>{Math.round(status.latency)}ms</span>
                </div>
              )}
              
              {connection.lastConnectedAt && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    Last: {connection.lastConnectedAt.toLocaleTimeString()}
                  </span>
                </div>
              )}
              
              {connection.reconnectAttempt > 0 && (
                <div className="flex items-center space-x-1">
                  <RefreshCw className="h-3 w-3" />
                  <span>Attempt {connection.reconnectAttempt}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {showReconnectButton && !status.isConnected && status.canReconnect && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDialog(true)}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reconnect
          </Button>
        )}
      </div>

      <ReconnectionDialog
        isOpen={showDialog}
        connection={connection}
        onClose={() => setShowDialog(false)}
        onReconnect={() => {
          connection.reconnect();
          setShowDialog(false);
        }}
      />
    </Card>
  );
}

// Connection error alert component
export function ConnectionErrorAlert({
  connection,
  onRetry,
  onDismiss,
  className
}: ConnectionErrorAlertProps) {
  const status = useConnectionStatus(connection);

  if (status.isConnected || !connection.error) {
    return null;
  }

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <div className="flex-1">
        <div className="font-medium">Connection Error</div>
        <AlertDescription className="mt-1">
          {connection.error}
          {connection.reconnectAttempt > 0 && (
            <span className="ml-2 text-xs">
              (Attempt {connection.reconnectAttempt})
            </span>
          )}
        </AlertDescription>
      </div>
      <div className="flex items-center space-x-2">
        {onRetry && status.canReconnect && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
        {onDismiss && (
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </Alert>
  );
}

// Reconnection dialog component
export function ReconnectionDialog({
  isOpen,
  connection,
  onClose,
  onReconnect
}: ReconnectionDialogProps) {
  const status = useConnectionStatus(connection);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    onReconnect();
    
    // Auto-close dialog after successful reconnection
    setTimeout(() => {
      if (connection.isConnected) {
        onClose();
      }
      setIsReconnecting(false);
    }, 3000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <WifiOff className="h-5 w-5 text-red-500" />
            <span>Connection Lost</span>
          </DialogTitle>
          <DialogDescription>
            The real-time connection has been interrupted. This may affect your ability 
            to send and receive messages in real-time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Connection status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium">Connection Status</p>
              <p className="text-xs text-muted-foreground">
                {getStatusConfig(connection.connectionState, status.isOnline).description}
              </p>
            </div>
            <Badge variant={getStatusConfig(connection.connectionState, status.isOnline).variant}>
              {connection.connectionState}
            </Badge>
          </div>

          {/* Reconnection progress */}
          {isReconnecting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Reconnecting...</span>
                <span>{connection.reconnectAttempt}/10</span>
              </div>
              <Progress value={(connection.reconnectAttempt / 10) * 100} />
            </div>
          )}

          {/* Connection details */}
          {connection.error && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {connection.error}
              </AlertDescription>
            </Alert>
          )}

          {!status.isOnline && (
            <Alert>
              <WifiOff className="h-4 w-4" />
              <AlertDescription>
                Your device appears to be offline. Please check your internet connection.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button variant="outline" onClick={onClose}>
            Continue Offline
          </Button>
          <Button 
            onClick={handleReconnect}
            disabled={!status.canReconnect || isReconnecting}
          >
            {isReconnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reconnecting...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Connection quality indicator
export function ConnectionQualityIndicator({ 
  latency,
  className 
}: { 
  latency?: number;
  className?: string;
}) {
  if (!latency) return null;

  const getQuality = (ms: number) => {
    if (ms < 50) return { level: 'excellent', color: 'text-green-500', bars: 4 };
    if (ms < 100) return { level: 'good', color: 'text-green-400', bars: 3 };
    if (ms < 200) return { level: 'fair', color: 'text-yellow-500', bars: 2 };
    return { level: 'poor', color: 'text-red-500', bars: 1 };
  };

  const quality = getQuality(latency);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={cn("flex items-center space-x-1", className)}>
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 bg-current rounded-full transition-opacity",
                  i < quality.bars ? quality.color : 'text-gray-300',
                  `h-${2 + i}` // Heights: 2, 3, 4, 5
                )}
              />
            ))}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium capitalize">{quality.level} Connection</p>
          <p className="text-xs">{Math.round(latency)}ms latency</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ConnectionStatusIndicator;
