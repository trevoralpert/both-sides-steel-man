'use client';

/**
 * Phase 6 Task 6.2.3: Enhanced Message Input Component
 * 
 * Rich text input with markdown support, real-time validation,
 * formatting toolbar, and typing indicator integration
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Send, 
  Loader2,
  Bold,
  Italic,
  Code,
  Link,
  Quote,
  List,
  Type,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Smile
} from 'lucide-react';

import { EmojiPicker, EmojiItem } from './EmojiPicker';
import { RichTextEditor } from './RichTextEditor';

export interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (content: string) => Promise<void>;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  isConnected?: boolean;
  className?: string;
  
  // Reply context
  replyToMessage?: {
    id: string;
    content: string;
    authorName: string;
  };
  onCancelReply?: () => void;
  
  // Validation and moderation
  enableRealTimeValidation?: boolean;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  
  // Rich text features
  enableMarkdownShortcuts?: boolean;
  enableFormattingToolbar?: boolean;
  enableRichTextMode?: boolean;
  enableEmojiPicker?: boolean;
  showPreview?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

interface FormattingAction {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action: (text: string, selectionStart: number, selectionEnd: number) => {
    newText: string;
    newSelectionStart: number;
    newSelectionEnd: number;
  };
}

// Content validation functions
function validateMessageContent(content: string, maxLength: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Basic validation
  if (content.length === 0) {
    errors.push('Message cannot be empty');
  }
  
  if (content.length > maxLength) {
    errors.push(`Message exceeds ${maxLength} character limit`);
  }
  
  // Content quality checks
  const upperCaseRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (upperCaseRatio > 0.7 && content.length > 10) {
    warnings.push('Excessive use of capital letters may be perceived as shouting');
  }
  
  const repeatedChars = /(.)\1{4,}/g;
  if (repeatedChars.test(content)) {
    warnings.push('Avoid excessive repeated characters');
  }
  
  // Constructive suggestions
  if (content.length < 10 && content.trim().length > 0) {
    suggestions.push('Consider elaborating on your point for a more meaningful contribution');
  }
  
  const questionCount = (content.match(/\?/g) || []).length;
  if (questionCount > 3) {
    suggestions.push('Consider focusing on one or two key questions');
  }
  
  // Check for potential markdown
  const hasMarkdownPatterns = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g.test(content);
  if (!hasMarkdownPatterns && content.length > 50) {
    suggestions.push('Use **bold** or *italic* to emphasize key points');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

// Markdown shortcuts and formatting actions
function createFormattingActions(): FormattingAction[] {
  return [
    {
      key: 'bold',
      label: 'Bold',
      icon: Bold,
      shortcut: 'Ctrl+B',
      action: (text, start, end) => {
        const selectedText = text.substring(start, end);
        const isBold = selectedText.startsWith('**') && selectedText.endsWith('**');
        
        if (isBold) {
          // Remove bold formatting
          const newText = text.substring(0, start) + selectedText.slice(2, -2) + text.substring(end);
          return {
            newText,
            newSelectionStart: start,
            newSelectionEnd: end - 4
          };
        } else {
          // Add bold formatting
          const formattedText = selectedText || 'bold text';
          const newText = text.substring(0, start) + `**${formattedText}**` + text.substring(end);
          return {
            newText,
            newSelectionStart: start + 2,
            newSelectionEnd: start + 2 + formattedText.length
          };
        }
      }
    },
    {
      key: 'italic',
      label: 'Italic',
      icon: Italic,
      shortcut: 'Ctrl+I',
      action: (text, start, end) => {
        const selectedText = text.substring(start, end);
        const isItalic = selectedText.startsWith('*') && selectedText.endsWith('*') && !selectedText.startsWith('**');
        
        if (isItalic) {
          const newText = text.substring(0, start) + selectedText.slice(1, -1) + text.substring(end);
          return {
            newText,
            newSelectionStart: start,
            newSelectionEnd: end - 2
          };
        } else {
          const formattedText = selectedText || 'italic text';
          const newText = text.substring(0, start) + `*${formattedText}*` + text.substring(end);
          return {
            newText,
            newSelectionStart: start + 1,
            newSelectionEnd: start + 1 + formattedText.length
          };
        }
      }
    },
    {
      key: 'code',
      label: 'Code',
      icon: Code,
      shortcut: 'Ctrl+`',
      action: (text, start, end) => {
        const selectedText = text.substring(start, end);
        const isCode = selectedText.startsWith('`') && selectedText.endsWith('`');
        
        if (isCode) {
          const newText = text.substring(0, start) + selectedText.slice(1, -1) + text.substring(end);
          return {
            newText,
            newSelectionStart: start,
            newSelectionEnd: end - 2
          };
        } else {
          const formattedText = selectedText || 'code';
          const newText = text.substring(0, start) + `\`${formattedText}\`` + text.substring(end);
          return {
            newText,
            newSelectionStart: start + 1,
            newSelectionEnd: start + 1 + formattedText.length
          };
        }
      }
    },
    {
      key: 'quote',
      label: 'Quote',
      icon: Quote,
      shortcut: 'Ctrl+>',
      action: (text, start, end) => {
        const selectedText = text.substring(start, end);
        const lines = selectedText.split('\n');
        const quotedLines = lines.map(line => `> ${line}`).join('\n');
        const newText = text.substring(0, start) + quotedLines + text.substring(end);
        return {
          newText,
          newSelectionStart: start,
          newSelectionEnd: start + quotedLines.length
        };
      }
    },
    {
      key: 'list',
      label: 'Bullet List',
      icon: List,
      shortcut: 'Ctrl+L',
      action: (text, start, end) => {
        const selectedText = text.substring(start, end) || 'List item';
        const lines = selectedText.split('\n');
        const listItems = lines.map(line => `- ${line.replace(/^- /, '')}`).join('\n');
        const newText = text.substring(0, start) + listItems + text.substring(end);
        return {
          newText,
          newSelectionStart: start,
          newSelectionEnd: start + listItems.length
        };
      }
    }
  ];
}

// Message preview with markdown rendering
function MessagePreview({ content, className }: { content: string; className?: string }) {
  const renderedContent = useMemo(() => {
    let rendered = content;
    
    // Simple markdown rendering
    rendered = rendered.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    rendered = rendered.replace(/\*(.*?)\*/g, '<em>$1</em>');
    rendered = rendered.replace(/`(.*?)`/g, '<code class="bg-accent px-1 py-0.5 rounded text-sm">$1</code>');
    rendered = rendered.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-accent pl-3 text-muted-foreground italic">$1</blockquote>');
    rendered = rendered.replace(/^- (.+)$/gm, '<li class="list-disc ml-4">$1</li>');
    rendered = rendered.replace(/(<li.*<\/li>)/gm, '<ul>$1</ul>');
    
    return rendered;
  }, [content]);
  
  if (!content.trim()) {
    return (
      <div className={cn("text-muted-foreground text-sm italic", className)}>
        Start typing to see preview...
      </div>
    );
  }
  
  return (
    <div 
      className={cn("text-sm leading-relaxed", className)}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
}

export function MessageInput({
  value,
  onChange,
  onSend,
  placeholder = "Share your thoughts...",
  maxLength = 2000,
  disabled = false,
  isConnected = true,
  className,
  replyToMessage,
  onCancelReply,
  enableRealTimeValidation = true,
  onTypingStart,
  onTypingStop,
  enableMarkdownShortcuts = true,
  enableFormattingToolbar = true,
  enableRichTextMode = true,
  enableEmojiPicker = true,
  showPreview = false
}: MessageInputProps) {
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showPreviewPanel, setShowPreviewPanel] = useState(showPreview);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [useRichTextMode, setUseRichTextMode] = useState(enableRichTextMode);
  
  // Validation results
  const validation = useMemo(() => 
    enableRealTimeValidation ? validateMessageContent(value, maxLength) : { isValid: true, errors: [], warnings: [], suggestions: [] },
    [value, maxLength, enableRealTimeValidation]
  );
  
  // Formatting actions
  const formattingActions = useMemo(() => createFormattingActions(), []);
  
  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);
  
  // Handle typing indicators
  const handleInputChange = useCallback((newValue: string) => {
    onChange(newValue);
    
    // Typing indicator logic
    if (!isTyping && newValue.length > 0) {
      setIsTyping(true);
      onTypingStart?.();
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout for typing stop
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTypingStop?.();
    }, 1000);
  }, [onChange, isTyping, onTypingStart, onTypingStop]);
  
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter (not Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && validation.isValid && !disabled && isConnected) {
        handleSend();
      }
      return;
    }
    
    // Markdown shortcuts
    if (enableMarkdownShortcuts && (e.ctrlKey || e.metaKey)) {
      const action = formattingActions.find(a => {
        switch (e.key.toLowerCase()) {
          case 'b': return a.key === 'bold';
          case 'i': return a.key === 'italic';
          case '`': return a.key === 'code';
          case '.': return a.key === 'quote';
          case 'l': return a.key === 'list';
          default: return false;
        }
      });
      
      if (action) {
        e.preventDefault();
        applyFormatting(action);
      }
    }
  }, [value, validation.isValid, disabled, isConnected, enableMarkdownShortcuts, formattingActions]);
  
  // Apply formatting action
  const applyFormatting = useCallback((action: FormattingAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const result = action.action(value, start, end);
    
    handleInputChange(result.newText);
    
    // Restore selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(result.newSelectionStart, result.newSelectionEnd);
    }, 0);
  }, [value, handleInputChange]);
  
  // Handle emoji selection
  const handleEmojiClick = useCallback((emoji: EmojiItem) => {
    onChange(value + emoji.emoji);
    setShowEmojiPicker(false);
  }, [value, onChange]);
  
  // Send message
  const handleSend = useCallback(async () => {
    if (!value.trim() || !validation.isValid || disabled || isSending) return;
    
    setIsSending(true);
    try {
      await onSend(value.trim());
      onChange('');
      setShowValidation(false);
      
      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        onTypingStop?.();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }, [value, validation.isValid, disabled, isSending, onSend, onChange, isTyping, onTypingStop]);
  
  // Character count status
  const characterCount = value.length;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isOverLimit = characterCount > maxLength;
  
  // Input state classes
  const inputStateClass = cn(
    validation.errors.length > 0 && "border-red-500 focus-visible:ring-red-500",
    validation.warnings.length > 0 && validation.errors.length === 0 && "border-yellow-500 focus-visible:ring-yellow-500",
    !isConnected && "opacity-60"
  );
  
  return (
    <TooltipProvider>
      <div className={cn("space-y-3", className)}>
        
        {/* Reply Context */}
        {replyToMessage && (
          <div className="bg-accent/30 border-l-2 border-primary p-3 rounded-r-md">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Replying to {replyToMessage.authorName}
                </div>
                <div className="text-sm line-clamp-2">
                  {replyToMessage.content}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelReply}
                className="h-auto p-1 ml-2"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Formatting Toolbar */}
        {enableFormattingToolbar && (
          <Card className="p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                {formattingActions.map((action) => (
                  <Tooltip key={action.key}>
                    <TooltipTrigger>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => applyFormatting(action)}
                        disabled={disabled}
                        className="h-8 w-8 p-0"
                      >
                        <action.icon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{action.label}</p>
                      {action.shortcut && (
                        <p className="text-xs text-muted-foreground">{action.shortcut}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
              
              <div className="flex items-center space-x-1">
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowValidation(!showValidation)}
                      className="h-8 w-8 p-0"
                    >
                      <CheckCircle className={cn(
                        "h-4 w-4",
                        validation.isValid ? "text-green-500" : "text-red-500"
                      )} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Validation: {validation.isValid ? 'Passed' : 'Issues detected'}</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPreviewPanel(!showPreviewPanel)}
                      className="h-8 w-8 p-0"
                    >
                      {showPreviewPanel ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{showPreviewPanel ? 'Hide' : 'Show'} Preview</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </Card>
        )}
        
        {/* Input Area */}
        {useRichTextMode && enableRichTextMode ? (
          <div className="relative">
            <RichTextEditor
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              maxLength={maxLength}
              disabled={disabled || isSending}
              features={{
                bold: true,
                italic: true,
                strikethrough: true,
                links: true,
                quotes: true,
                lists: true,
                headings: false,
                code: true,
                emoji: enableEmojiPicker
              }}
              showPreview={showPreviewPanel}
              showToolbar={enableFormattingToolbar}
              compact={true}
              onEmojiClick={() => setShowEmojiPicker(true)}
              className="mb-2"
            />
            
            {/* Send Button */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                {/* Mode Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUseRichTextMode(false)}
                  className="text-xs"
                >
                  <Type className="h-3 w-3 mr-1" />
                  Basic Mode
                </Button>
              </div>
              
              <Button
                onClick={handleSend}
                disabled={!value.trim() || !validation.isValid || disabled || isSending || !isConnected}
                size="default"
                className="px-6"
                aria-label="Send message"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled || isSending}
                className={cn(
                  "min-h-[60px] max-h-[200px] resize-none",
                  "focus-visible:ring-2 focus-visible:ring-primary",
                  inputStateClass
                )}
                aria-label="Message input"
                aria-describedby="character-count validation-info"
              />
            </div>
            
            {/* Controls */}
            <div className="flex flex-col space-y-1">
              {enableRichTextMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUseRichTextMode(true)}
                  className="h-8 w-8 p-0"
                  title="Rich Text Mode"
                >
                  <Type className="h-4 w-4" />
                </Button>
              )}
              
              {enableEmojiPicker && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="h-8 w-8 p-0"
                  title="Add Emoji"
                >
                  <Smile className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <Button
              onClick={handleSend}
              disabled={!value.trim() || !validation.isValid || disabled || isSending || !isConnected}
              size="default"
              className="h-[60px] px-4"
              aria-label="Send message"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
        
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="relative">
            <div className="absolute bottom-full right-0 mb-2 z-50">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                onClose={() => setShowEmojiPicker(false)}
                compact={true}
                maxRecentEmojis={12}
              />
            </div>
          </div>
        )}
        
        {/* Input Info Bar */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center space-x-3 text-muted-foreground">
            <span>Enter to send, Shift+Enter for new line</span>
            {isTyping && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Typing...
              </Badge>
            )}
            {!isConnected && (
              <Badge variant="destructive" className="text-xs">
                Offline
              </Badge>
            )}
          </div>
          
          <span 
            id="character-count"
            className={cn(
              "font-mono",
              isOverLimit && "text-red-500 font-semibold",
              isNearLimit && !isOverLimit && "text-yellow-600 font-medium"
            )}
            aria-live="polite"
          >
            {characterCount}/{maxLength}
          </span>
        </div>
        
        {/* Validation Display */}
        {showValidation && (validation.errors.length > 0 || validation.warnings.length > 0 || validation.suggestions.length > 0) && (
          <div className="space-y-2" id="validation-info">
            {validation.errors.map((error, index) => (
              <Alert key={`error-${index}`} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            ))}
            
            {validation.warnings.map((warning, index) => (
              <Alert key={`warning-${index}`} variant="default" className="border-yellow-500">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-xs">{warning}</AlertDescription>
              </Alert>
            ))}
            
            {validation.suggestions.map((suggestion, index) => (
              <Alert key={`suggestion-${index}`} variant="default" className="border-blue-500">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-xs">{suggestion}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}
        
        {/* Preview Panel */}
        {showPreviewPanel && (
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Preview</h4>
              <Type className="h-4 w-4 text-muted-foreground" />
            </div>
            <MessagePreview content={value} className="min-h-[60px]" />
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}

export default MessageInput;
