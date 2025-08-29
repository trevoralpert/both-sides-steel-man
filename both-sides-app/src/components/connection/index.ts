/**
 * Phase 6 Task 6.2.1: Connection Components Export
 * 
 * Centralized exports for WebSocket connection status and management components
 */

// Connection status components
export { 
  ConnectionStatusIndicator,
  ConnectionErrorAlert,
  ReconnectionDialog,
  ConnectionQualityIndicator
} from './ConnectionStatusIndicator';

export type {
  ConnectionStatusIndicatorProps,
  ConnectionErrorAlertProps,
  ReconnectionDialogProps
} from './ConnectionStatusIndicator';

// Connection hooks
export { 
  useRealtimeConnection,
  useConversationConnection,
  useConnectionStatus
} from '@/lib/hooks/useRealtimeConnection';

export type {
  ConnectionState,
  ConnectionConfig,
  RealtimeConnection
} from '@/lib/hooks/useRealtimeConnection';
