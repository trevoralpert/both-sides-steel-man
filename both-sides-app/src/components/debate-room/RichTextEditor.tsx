'use client';

/**
 * Phase 6 Task 6.2.6: Rich Text Editor Component
 * 
 * Enhanced text editor with formatting toolbar, markdown support,
 * live preview, and accessibility features
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Bold,
  Italic,
  Code,
  Link,
  Quote,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Eye,
  EyeOff,
  Type,
  Smile,
  Image,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Strikethrough
} from 'lucide-react';

import { MarkdownRenderer } from './MarkdownRenderer';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
  features: {
    bold: boolean;
    italic: boolean;
    strikethrough?: boolean;
    links: boolean;
    quotes: boolean;
    lists: boolean;
    headings?: boolean;
    code?: boolean;
    images?: boolean;
    emoji?: boolean;
  };
  showPreview?: boolean;
  showToolbar?: boolean;
  compact?: boolean;
  onEmojiClick?: () => void;
  onImageUpload?: (file: File) => Promise<string>;
}

interface FormattingAction {
  key: string;
  label: string;
  icon: React.ElementType;
  shortcut?: string;
  group: 'basic' | 'structure' | 'media' | 'advanced';
  action: (text: string, selectionStart: number, selectionEnd: number) => {
    newText: string;
    newSelectionStart: number;
    newSelectionEnd: number;
  };
}

interface EditorState {
  history: string[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
}

// Create comprehensive formatting actions
function createFormattingActions(features: RichTextEditorProps['features']): FormattingAction[] {
  const actions: FormattingAction[] = [];
  
  // Basic formatting
  if (features.bold) {
    actions.push({
      key: 'bold',
      label: 'Bold',
      icon: Bold,
      shortcut: 'Ctrl+B',
      group: 'basic',
      action: (text, start, end) => {
        const selectedText = text.substring(start, end);
        const isBold = selectedText.startsWith('**') && selectedText.endsWith('**');
        
        if (isBold) {
          const newText = text.substring(0, start) + selectedText.slice(2, -2) + text.substring(end);
          return {
            newText,
            newSelectionStart: start,
            newSelectionEnd: end - 4
          };
        } else {
          const formattedText = selectedText || 'bold text';
          const newText = text.substring(0, start) + `**${formattedText}**` + text.substring(end);
          return {
            newText,
            newSelectionStart: start + 2,
            newSelectionEnd: start + 2 + formattedText.length
          };
        }
      }
    });
  }
  
  if (features.italic) {
    actions.push({
      key: 'italic',
      label: 'Italic',
      icon: Italic,
      shortcut: 'Ctrl+I',
      group: 'basic',
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
    });
  }
  
  if (features.strikethrough) {
    actions.push({
      key: 'strikethrough',
      label: 'Strikethrough',
      icon: Strikethrough,
      shortcut: 'Ctrl+Shift+X',
      group: 'basic',
      action: (text, start, end) => {
        const selectedText = text.substring(start, end);
        const isStrikethrough = selectedText.startsWith('~~') && selectedText.endsWith('~~');
        
        if (isStrikethrough) {
          const newText = text.substring(0, start) + selectedText.slice(2, -2) + text.substring(end);
          return {
            newText,
            newSelectionStart: start,
            newSelectionEnd: end - 4
          };
        } else {
          const formattedText = selectedText || 'strikethrough text';
          const newText = text.substring(0, start) + `~~${formattedText}~~` + text.substring(end);
          return {
            newText,
            newSelectionStart: start + 2,
            newSelectionEnd: start + 2 + formattedText.length
          };
        }
      }
    });
  }
  
  if (features.code) {
    actions.push({
      key: 'code',
      label: 'Code',
      icon: Code,
      shortcut: 'Ctrl+`',
      group: 'basic',
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
    });
  }
  
  // Structure formatting
  if (features.headings) {
    [1, 2, 3].forEach(level => {
      actions.push({
        key: `heading${level}`,
        label: `Heading ${level}`,
        icon: level === 1 ? Heading1 : level === 2 ? Heading2 : Heading3,
        shortcut: `Ctrl+${level}`,
        group: 'structure',
        action: (text, start, end) => {
          const lines = text.split('\n');
          const lineStart = text.lastIndexOf('\n', start - 1) + 1;
          const lineEnd = text.indexOf('\n', end);
          const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;
          
          const currentLine = text.substring(lineStart, actualLineEnd);
          const headingPrefix = '#'.repeat(level) + ' ';
          
          let newLine;
          if (currentLine.startsWith(headingPrefix)) {
            newLine = currentLine.substring(headingPrefix.length);
          } else {
            const existingHeading = currentLine.match(/^#{1,6}\s/);
            newLine = existingHeading 
              ? headingPrefix + currentLine.substring(existingHeading[0].length)
              : headingPrefix + currentLine;
          }
          
          const newText = text.substring(0, lineStart) + newLine + text.substring(actualLineEnd);
          return {
            newText,
            newSelectionStart: lineStart + headingPrefix.length,
            newSelectionEnd: lineStart + newLine.length
          };
        }
      });
    });
  }
  
  if (features.quotes) {
    actions.push({
      key: 'quote',
      label: 'Quote',
      icon: Quote,
      shortcut: 'Ctrl+>',
      group: 'structure',
      action: (text, start, end) => {
        const selectedText = text.substring(start, end);
        const lines = selectedText.split('\n');
        const quotedLines = lines.map(line => 
          line.startsWith('> ') ? line.substring(2) : `> ${line}`
        ).join('\n');
        
        const newText = text.substring(0, start) + quotedLines + text.substring(end);
        return {
          newText,
          newSelectionStart: start,
          newSelectionEnd: start + quotedLines.length
        };
      }
    });
  }
  
  if (features.lists) {
    actions.push({
      key: 'unordered-list',
      label: 'Bullet List',
      icon: List,
      shortcut: 'Ctrl+Shift+8',
      group: 'structure',
      action: (text, start, end) => {
        const selectedText = text.substring(start, end);
        const lines = selectedText.split('\n');
        const listLines = lines.map(line => 
          line.match(/^[\-\*\+]\s/) ? line.substring(2) : `- ${line}`
        ).join('\n');
        
        const newText = text.substring(0, start) + listLines + text.substring(end);
        return {
          newText,
          newSelectionStart: start,
          newSelectionEnd: start + listLines.length
        };
      }
    });
    
    actions.push({
      key: 'ordered-list',
      label: 'Numbered List',
      icon: ListOrdered,
      shortcut: 'Ctrl+Shift+7',
      group: 'structure',
      action: (text, start, end) => {
        const selectedText = text.substring(start, end);
        const lines = selectedText.split('\n');
        const listLines = lines.map((line, index) => 
          line.match(/^\d+\.\s/) ? line : `${index + 1}. ${line}`
        ).join('\n');
        
        const newText = text.substring(0, start) + listLines + text.substring(end);
        return {
          newText,
          newSelectionStart: start,
          newSelectionEnd: start + listLines.length
        };
      }
    });
  }
  
  if (features.links) {
    actions.push({
      key: 'link',
      label: 'Link',
      icon: Link,
      shortcut: 'Ctrl+K',
      group: 'media',
      action: (text, start, end) => {
        const selectedText = text.substring(start, end);
        
        if (selectedText) {
          // If text is selected, wrap it in link format
          const newText = text.substring(0, start) + `[${selectedText}](url)` + text.substring(end);
          return {
            newText,
            newSelectionStart: start + selectedText.length + 3,
            newSelectionEnd: start + selectedText.length + 6
          };
        } else {
          // Insert link template
          const linkText = '[link text](url)';
          const newText = text.substring(0, start) + linkText + text.substring(end);
          return {
            newText,
            newSelectionStart: start + 1,
            newSelectionEnd: start + 10
          };
        }
      }
    });
  }
  
  return actions;
}

// Toolbar component
function FormattingToolbar({ 
  actions, 
  onAction, 
  onUndo, 
  onRedo, 
  onTogglePreview,
  onEmojiClick,
  canUndo, 
  canRedo,
  showPreview,
  features,
  compact 
}: {
  actions: FormattingAction[];
  onAction: (action: FormattingAction) => void;
  onUndo: () => void;
  onRedo: () => void;
  onTogglePreview: () => void;
  onEmojiClick?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  showPreview: boolean;
  features: RichTextEditorProps['features'];
  compact?: boolean;
}) {
  const groupedActions = useMemo(() => {
    const groups: Record<string, FormattingAction[]> = {
      basic: [],
      structure: [],
      media: [],
      advanced: []
    };
    
    actions.forEach(action => {
      groups[action.group].push(action);
    });
    
    return groups;
  }, [actions]);
  
  const buttonSize = compact ? 'sm' : 'sm';
  const iconSize = compact ? 'h-3 w-3' : 'h-4 w-4';
  
  return (
    <div className={cn(
      "flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30",
      compact && "p-1 gap-0.5"
    )}>
      
      {/* History controls */}
      <div className="flex items-center space-x-0.5 mr-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size={buttonSize}
                onClick={onUndo}
                disabled={!canUndo}
                className="p-1"
              >
                <Undo className={iconSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Undo (Ctrl+Z)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size={buttonSize}
                onClick={onRedo}
                disabled={!canRedo}
                className="p-1"
              >
                <Redo className={iconSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Redo (Ctrl+Y)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Basic formatting */}
      {groupedActions.basic.length > 0 && (
        <>
          <div className="flex items-center space-x-0.5">
            {groupedActions.basic.map((action) => (
              <TooltipProvider key={action.key}>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant="ghost"
                      size={buttonSize}
                      onClick={() => onAction(action)}
                      className="p-1"
                    >
                      <action.icon className={iconSize} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{action.label} {action.shortcut && `(${action.shortcut})`}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
          
          <Separator orientation="vertical" className="h-6" />
        </>
      )}
      
      {/* Structure formatting */}
      {groupedActions.structure.length > 0 && (
        <>
          <div className="flex items-center space-x-0.5">
            {groupedActions.structure.map((action) => (
              <TooltipProvider key={action.key}>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant="ghost"
                      size={buttonSize}
                      onClick={() => onAction(action)}
                      className="p-1"
                    >
                      <action.icon className={iconSize} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{action.label} {action.shortcut && `(${action.shortcut})`}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
          
          <Separator orientation="vertical" className="h-6" />
        </>
      )}
      
      {/* Media */}
      {(groupedActions.media.length > 0 || features.emoji) && (
        <>
          <div className="flex items-center space-x-0.5">
            {groupedActions.media.map((action) => (
              <TooltipProvider key={action.key}>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant="ghost"
                      size={buttonSize}
                      onClick={() => onAction(action)}
                      className="p-1"
                    >
                      <action.icon className={iconSize} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{action.label} {action.shortcut && `(${action.shortcut})`}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            
            {features.emoji && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant="ghost"
                      size={buttonSize}
                      onClick={onEmojiClick}
                      className="p-1"
                    >
                      <Smile className={iconSize} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Insert emoji</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          <Separator orientation="vertical" className="h-6" />
        </>
      )}
      
      {/* Preview toggle */}
      <div className="ml-auto flex items-center space-x-0.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant={showPreview ? "default" : "ghost"}
                size={buttonSize}
                onClick={onTogglePreview}
                className="p-1"
              >
                {showPreview ? <EyeOff className={iconSize} /> : <Eye className={iconSize} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{showPreview ? 'Hide' : 'Show'} preview</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter your message...",
  maxLength = 2000,
  disabled = false,
  className,
  features,
  showPreview = false,
  showToolbar = true,
  compact = false,
  onEmojiClick,
  onImageUpload
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreviewPanel, setShowPreviewPanel] = useState(showPreview);
  const [editorState, setEditorState] = useState<EditorState>({
    history: [value],
    historyIndex: 0,
    canUndo: false,
    canRedo: false
  });
  
  const formattingActions = useMemo(() => createFormattingActions(features), [features]);
  
  // History management
  const addToHistory = useCallback((newValue: string) => {
    setEditorState(prev => {
      const newHistory = [...prev.history.slice(0, prev.historyIndex + 1), newValue];
      const newIndex = newHistory.length - 1;
      
      return {
        history: newHistory.slice(-50), // Keep last 50 states
        historyIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: false
      };
    });
  }, []);
  
  // Handle text changes
  const handleChange = useCallback((newValue: string) => {
    onChange(newValue);
    addToHistory(newValue);
  }, [onChange, addToHistory]);
  
  // Undo/Redo
  const handleUndo = useCallback(() => {
    setEditorState(prev => {
      if (prev.historyIndex > 0) {
        const newIndex = prev.historyIndex - 1;
        const newValue = prev.history[newIndex];
        onChange(newValue);
        
        return {
          ...prev,
          historyIndex: newIndex,
          canUndo: newIndex > 0,
          canRedo: true
        };
      }
      return prev;
    });
  }, [onChange]);
  
  const handleRedo = useCallback(() => {
    setEditorState(prev => {
      if (prev.historyIndex < prev.history.length - 1) {
        const newIndex = prev.historyIndex + 1;
        const newValue = prev.history[newIndex];
        onChange(newValue);
        
        return {
          ...prev,
          historyIndex: newIndex,
          canUndo: true,
          canRedo: newIndex < prev.history.length - 1
        };
      }
      return prev;
    });
  }, [onChange]);
  
  // Apply formatting
  const applyFormatting = useCallback((action: FormattingAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const result = action.action(value, start, end);
    handleChange(result.newText);
    
    // Restore selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(result.newSelectionStart, result.newSelectionEnd);
    }, 0);
  }, [value, handleChange]);
  
  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Undo/Redo
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      
      if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
        return;
      }
      
      // Formatting shortcuts
      const action = formattingActions.find(a => {
        switch (e.key.toLowerCase()) {
          case 'b': return a.key === 'bold';
          case 'i': return a.key === 'italic';
          case '`': return a.key === 'code';
          case 'k': return a.key === 'link';
          case '1': return a.key === 'heading1';
          case '2': return a.key === 'heading2';
          case '3': return a.key === 'heading3';
          case '8': return e.shiftKey && a.key === 'unordered-list';
          case '7': return e.shiftKey && a.key === 'ordered-list';
          case 'x': return e.shiftKey && a.key === 'strikethrough';
          default: return false;
        }
      });
      
      if (action) {
        e.preventDefault();
        applyFormatting(action);
        return;
      }
    }
    
    // Quote shortcut
    if (e.ctrlKey && e.key === '>') {
      e.preventDefault();
      const quoteAction = formattingActions.find(a => a.key === 'quote');
      if (quoteAction) {
        applyFormatting(quoteAction);
      }
    }
  }, [formattingActions, applyFormatting, handleUndo, handleRedo]);
  
  // Auto-resize
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, compact ? 120 : 200)}px`;
    }
  }, [value, compact]);
  
  const charCount = value.length;
  const isOverLimit = charCount > maxLength;
  
  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      
      {/* Toolbar */}
      {showToolbar && (
        <FormattingToolbar
          actions={formattingActions}
          onAction={applyFormatting}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onTogglePreview={() => setShowPreviewPanel(!showPreviewPanel)}
          onEmojiClick={onEmojiClick}
          canUndo={editorState.canUndo}
          canRedo={editorState.canRedo}
          showPreview={showPreviewPanel}
          features={features}
          compact={compact}
        />
      )}
      
      {/* Editor content */}
      {showPreviewPanel ? (
        <Tabs defaultValue="write" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b h-8">
            <TabsTrigger value="write" className="text-xs">Write</TabsTrigger>
            <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="write" className="mt-0">
            <div className="p-3">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                  "min-h-[80px] resize-none border-0 focus-visible:ring-0 shadow-none",
                  compact && "min-h-[60px] text-sm",
                  isOverLimit && "text-red-500"
                )}
                maxLength={maxLength}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="preview" className="mt-0">
            <div className={cn("p-3", compact ? "min-h-[60px]" : "min-h-[80px]")}>
              {value.trim() ? (
                <MarkdownRenderer 
                  content={value}
                  compact={compact}
                  enableLinkPreviews={false}
                />
              ) : (
                <div className="text-muted-foreground text-sm italic">
                  Nothing to preview
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="p-3">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "min-h-[80px] resize-none border-0 focus-visible:ring-0 shadow-none",
              compact && "min-h-[60px] text-sm",
              isOverLimit && "text-red-500"
            )}
            maxLength={maxLength}
          />
        </div>
      )}
      
      {/* Footer with character count */}
      <div className="flex justify-between items-center px-3 py-2 border-t bg-muted/20 text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>Markdown supported</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={cn(
            isOverLimit && "text-red-500 font-medium"
          )}>
            {charCount}/{maxLength}
          </span>
        </div>
      </div>
    </div>
  );
}

export default RichTextEditor;
