/**
 * Phase 6 Task 6.1.5: Deep Linking Utilities
 * 
 * Utilities for creating and handling deep links to specific debate sections,
 * messages, phases, and other content
 */

import { DebatePhase } from '@/types/debate';

export interface DeepLinkConfig {
  conversationId: string;
  matchId?: string;
  phase?: DebatePhase;
  messageId?: string;
  timestamp?: number;
  tab?: string;
  participantId?: string;
  highlightText?: string;
}

export interface ParsedDeepLink {
  isValid: boolean;
  config: DeepLinkConfig | null;
  error?: string;
}

/**
 * Generate a deep link URL for debate content
 */
export function generateDeepLink(
  config: DeepLinkConfig,
  baseUrl?: string
): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const path = `/debate/${config.conversationId}`;
  
  const searchParams = new URLSearchParams();
  
  // Add optional parameters
  if (config.matchId) searchParams.set('matchId', config.matchId);
  if (config.phase) searchParams.set('phase', config.phase);
  if (config.messageId) searchParams.set('messageId', config.messageId);
  if (config.timestamp) searchParams.set('timestamp', config.timestamp.toString());
  if (config.tab) searchParams.set('tab', config.tab);
  if (config.participantId) searchParams.set('participant', config.participantId);
  if (config.highlightText) searchParams.set('highlight', encodeURIComponent(config.highlightText));

  const queryString = searchParams.toString();
  return `${base}${path}${queryString ? `?${queryString}` : ''}`;
}

/**
 * Parse a deep link URL and extract debate configuration
 */
export function parseDeepLink(url: string): ParsedDeepLink {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    // Check if it's a debate URL
    if (pathParts[0] !== 'debate' || !pathParts[1]) {
      return {
        isValid: false,
        config: null,
        error: 'Not a valid debate URL'
      };
    }

    const conversationId = pathParts[1];
    const searchParams = urlObj.searchParams;

    const config: DeepLinkConfig = {
      conversationId,
      matchId: searchParams.get('matchId') || undefined,
      phase: (searchParams.get('phase') as DebatePhase) || undefined,
      messageId: searchParams.get('messageId') || undefined,
      timestamp: searchParams.get('timestamp') ? Number(searchParams.get('timestamp')) : undefined,
      tab: searchParams.get('tab') || undefined,
      participantId: searchParams.get('participant') || undefined,
      highlightText: searchParams.get('highlight') ? decodeURIComponent(searchParams.get('highlight')!) : undefined
    };

    // Validate phase if provided
    if (config.phase) {
      const validPhases: DebatePhase[] = [
        'PREPARATION', 'OPENING', 'DISCUSSION', 'REBUTTAL', 'CLOSING', 'REFLECTION', 'COMPLETED'
      ];
      if (!validPhases.includes(config.phase)) {
        return {
          isValid: false,
          config: null,
          error: `Invalid phase: ${config.phase}`
        };
      }
    }

    return {
      isValid: true,
      config
    };
  } catch (error) {
    return {
      isValid: false,
      config: null,
      error: error instanceof Error ? error.message : 'Invalid URL format'
    };
  }
}

/**
 * Generate shareable link with current state
 */
export function generateShareableLink(
  conversationId: string,
  options: {
    includePhase?: boolean;
    includeMessage?: boolean;
    includeTimestamp?: boolean;
    customMessage?: string;
  } = {}
): string {
  const config: DeepLinkConfig = { conversationId };
  
  if (typeof window !== 'undefined') {
    const currentUrl = new URL(window.location.href);
    const searchParams = currentUrl.searchParams;
    
    if (options.includePhase && searchParams.get('phase')) {
      config.phase = searchParams.get('phase') as DebatePhase;
    }
    
    if (options.includeMessage && searchParams.get('messageId')) {
      config.messageId = searchParams.get('messageId')!;
    }
    
    if (options.includeTimestamp) {
      config.timestamp = Date.now();
    }
  }

  return generateDeepLink(config);
}

/**
 * Create a shareable text with link
 */
export function generateShareText(
  conversationId: string,
  topicTitle: string,
  options: {
    includePhase?: boolean;
    includeMessage?: boolean;
    customMessage?: string;
  } = {}
): { text: string; url: string } {
  const url = generateShareableLink(conversationId, options);
  
  let text = `Check out this debate: "${topicTitle}"`;
  
  if (options.customMessage) {
    text = options.customMessage;
  } else if (options.includeMessage) {
    text += ' (specific message highlighted)';
  } else if (options.includePhase) {
    text += ' - join the discussion!';
  }
  
  return { text, url };
}

/**
 * Handle deep link navigation effects
 */
export function handleDeepLinkEffects(
  config: DeepLinkConfig,
  handlers: {
    onPhaseChange?: (phase: DebatePhase) => void;
    onMessageScroll?: (messageId: string) => void;
    onTabChange?: (tab: string) => void;
    onParticipantFocus?: (participantId: string) => void;
    onTextHighlight?: (text: string) => void;
  }
) {
  // Handle phase navigation
  if (config.phase && handlers.onPhaseChange) {
    handlers.onPhaseChange(config.phase);
  }

  // Handle message scrolling
  if (config.messageId && handlers.onMessageScroll) {
    // Delay to ensure DOM is ready
    setTimeout(() => {
      handlers.onMessageScroll!(config.messageId!);
    }, 100);
  }

  // Handle tab changes
  if (config.tab && handlers.onTabChange) {
    handlers.onTabChange(config.tab);
  }

  // Handle participant focus
  if (config.participantId && handlers.onParticipantFocus) {
    handlers.onParticipantFocus(config.participantId);
  }

  // Handle text highlighting
  if (config.highlightText && handlers.onTextHighlight) {
    setTimeout(() => {
      handlers.onTextHighlight!(config.highlightText!);
    }, 200);
  }
}

/**
 * Utility to generate quick action links
 */
export const QuickLinks = {
  // Link to specific debate phase
  phase: (conversationId: string, phase: DebatePhase, matchId?: string) =>
    generateDeepLink({ conversationId, phase, matchId }),

  // Link to specific message
  message: (conversationId: string, messageId: string, timestamp?: number) =>
    generateDeepLink({ conversationId, messageId, timestamp }),

  // Link to specific tab
  tab: (conversationId: string, tab: string) =>
    generateDeepLink({ conversationId, tab }),

  // Link to participant profile in context
  participant: (conversationId: string, participantId: string) =>
    generateDeepLink({ conversationId, participantId, tab: 'participants' }),

  // Link with text highlighting
  highlight: (conversationId: string, highlightText: string) =>
    generateDeepLink({ conversationId, highlightText, timestamp: Date.now() })
};

/**
 * Copy link to clipboard with feedback
 */
export async function copyDeepLink(
  config: DeepLinkConfig,
  options: {
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: (url: string) => void;
    onError?: (error: Error) => void;
  } = {}
): Promise<boolean> {
  try {
    const url = generateDeepLink(config);
    await navigator.clipboard.writeText(url);
    
    if (options.onSuccess) {
      options.onSuccess(url);
    }
    
    // In a real app, show toast notification
    console.log(options.successMessage || 'Link copied to clipboard!');
    return true;
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error('Failed to copy link');
    
    if (options.onError) {
      options.onError(errorObj);
    }
    
    console.error(options.errorMessage || 'Failed to copy link', errorObj);
    return false;
  }
}

/**
 * Validate conversation access for deep links
 */
export async function validateDeepLinkAccess(
  config: DeepLinkConfig,
  userId?: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Mock validation - in real app, this would be an API call
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Allow demo conversations
    if (config.conversationId.startsWith('demo-')) {
      return { valid: true };
    }
    
    // Mock validation logic
    if (!userId) {
      return { valid: false, reason: 'Authentication required' };
    }
    
    // Mock permission check
    const hasAccess = Math.random() > 0.1; // 90% success rate for demo
    if (!hasAccess) {
      return { valid: false, reason: 'You do not have access to this debate' };
    }
    
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      reason: 'Failed to validate access' 
    };
  }
}

export default {
  generateDeepLink,
  parseDeepLink,
  generateShareableLink,
  generateShareText,
  handleDeepLinkEffects,
  QuickLinks,
  copyDeepLink,
  validateDeepLinkAccess
};
