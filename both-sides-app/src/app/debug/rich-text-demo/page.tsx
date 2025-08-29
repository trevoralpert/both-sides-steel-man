'use client';

/**
 * Phase 6 Task 6.2.6: Rich Text & Content Formatting Demo
 * 
 * Comprehensive demo showcasing all rich text components:
 * - RichTextEditor with formatting toolbar
 * - MarkdownRenderer for message display
 * - EmojiPicker integration
 * - LinkPreview functionality
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RichTextEditor } from '@/components/debate-room/RichTextEditor';
import { MarkdownRenderer } from '@/components/debate-room/MarkdownRenderer';
import { EmojiPicker, EmojiItem } from '@/components/debate-room/EmojiPicker';
import { LinkPreview } from '@/components/debate-room/LinkPreview';
import { 
  Type,
  Smile,
  Link as LinkIcon,
  Eye,
  Code,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Info,
  Lightbulb
} from 'lucide-react';

const DEMO_CONTENT_TEMPLATES = {
  basic: `# Welcome to Rich Text Demo

This is a **bold statement** and this is *emphasized text*.

Here's some \`inline code\` and a [link to example](https://example.com).

> This is a blockquote with some important information.

## Lists work too:

- First item with **bold** text
- Second item with *italic* text
- Third item with \`code\`

### Numbered lists:

1. First numbered item
2. Second numbered item  
3. Third numbered item

That's the basics! 🚀`,

  advanced: `# Advanced Formatting Demo

## Text Styling
- **Bold text** for emphasis
- *Italic text* for subtle emphasis  
- ~~Strikethrough text~~ for corrections
- \`inline code\` for technical terms

## Code Blocks
\`\`\`javascript
function greet(name) {
  console.log("Hello, " + name + "!");
}
greet("World");
\`\`\`

## Links and References
Check out [GitHub](https://github.com) for code repositories.
Visit [Stack Overflow](https://stackoverflow.com) for programming help.
Learn from [Wikipedia](https://wikipedia.org) articles.

## Quotes and Citations
> "The best way to predict the future is to invent it." - Alan Kay

> This is a multi-line quote that spans
> several lines and maintains proper
> formatting throughout.

## Mixed Content
Here's a paragraph with **bold**, *italic*, and \`code\` all together! 
Don't forget to add some emojis 😀 📚 💡 to make it more engaging.

### Debate Example
**Pro Position:** Technology enhances learning by providing:
- Interactive educational content 📱
- Access to global knowledge bases 🌍  
- Personalized learning paths 🎯

**Con Position:** However, we must consider:
- Digital distraction concerns 📵
- Screen time health impacts 👁️
- Loss of traditional skills ✏️`,

  debate: `# Debate: Should AI Replace Human Teachers?

## Opening Statement - PRO Position 🤖

**Artificial Intelligence can revolutionize education** by providing:

### Key Arguments:
1. **Personalized Learning** 🎯
   - AI adapts to individual learning styles
   - Provides customized feedback and pacing
   - Identifies knowledge gaps automatically

2. **24/7 Availability** ⏰
   - Students can learn anytime, anywhere
   - No scheduling constraints
   - Instant answers to questions

3. **Consistency** 📊
   - Eliminates human bias and mood variations
   - Standardized quality across all students
   - Objective assessment and grading

> "AI tutoring systems have shown 30% improvement in student outcomes compared to traditional methods." - EdTech Research 2024

### Supporting Evidence:
- [Khan Academy AI](https://khanacademy.org) - Personalized learning success
- [Carnegie Learning](https://carnegielearning.com) - Adaptive math instruction
- [Duolingo](https://duolingo.com) - Language learning effectiveness

**In conclusion,** AI teachers offer scalable, personalized, and consistent education that can reach more students than ever before! 🌟

---

## Rebuttal - CON Position 👩‍🏫

**While AI has merits, human teachers remain irreplaceable** because:

### Critical Concerns:
1. **Emotional Intelligence** 💝
   - AI cannot provide emotional support
   - Missing empathy and understanding
   - No real human connection

2. **Creativity and Inspiration** ✨
   - Cannot inspire passion for subjects
   - Lacks creative teaching methods  
   - Missing spontaneous "aha!" moments

3. **Social Development** 🤝
   - Students need peer interaction
   - Group dynamics and collaboration
   - Social skills development

> "Education is not the filling of a pail, but the lighting of a fire." - William Butler Yeats

### The Reality Check:
~~AI is perfect~~ AI has significant limitations:
- Cannot handle unexpected situations 🤔
- Lacks cultural sensitivity and context 🌍
- No real-world experience to share 📚

**Technology should enhance, not replace human teachers.** The best education combines AI tools with human wisdom! 🎓💡`
};

const SAMPLE_LINKS = [
  'https://github.com/facebook/react',
  'https://stackoverflow.com/questions/tagged/javascript',
  'https://en.wikipedia.org/wiki/Artificial_intelligence',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://medium.com/@user/great-article-about-tech',
  'https://twitter.com/user/status/123456789',
  'https://linkedin.com/in/developer-profile'
];

export default function RichTextDemo() {
  const [editorContent, setEditorContent] = useState(DEMO_CONTENT_TEMPLATES.basic);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedLinks, setSelectedLinks] = useState<string[]>([
    'https://github.com/facebook/react',
    'https://stackoverflow.com/questions/tagged/javascript'
  ]);
  const [activeTemplate, setActiveTemplate] = useState<string>('basic');
  const [copied, setCopied] = useState(false);
  
  // Handle emoji selection
  const handleEmojiClick = useCallback((emoji: EmojiItem) => {
    setEditorContent(prev => prev + emoji.emoji);
    setShowEmojiPicker(false);
  }, []);
  
  // Load template
  const loadTemplate = useCallback((template: keyof typeof DEMO_CONTENT_TEMPLATES) => {
    setEditorContent(DEMO_CONTENT_TEMPLATES[template]);
    setActiveTemplate(template);
  }, []);
  
  // Add sample link
  const addSampleLink = useCallback((url: string) => {
    if (!selectedLinks.includes(url)) {
      setSelectedLinks(prev => [...prev, url]);
    }
  }, [selectedLinks]);
  
  // Remove link
  const removeLink = useCallback((url: string) => {
    setSelectedLinks(prev => prev.filter(link => link !== url));
  }, []);
  
  // Copy content
  const copyContent = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(editorContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [editorContent]);
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold flex items-center justify-center space-x-3">
            <Sparkles className="h-8 w-8 text-primary" />
            <span>Rich Text & Content Formatting Demo</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore advanced text formatting capabilities with markdown support, emoji picker, 
            link previews, and interactive editing features for debate messages.
          </p>
        </div>
        
        {/* Features Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="h-5 w-5" />
              <span>Features Demonstrated</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <Type className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Rich Text Editor</span>
              </div>
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-green-500" />
                <span className="text-sm">Markdown Renderer</span>
              </div>
              <div className="flex items-center space-x-2">
                <Smile className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">Emoji Picker</span>
              </div>
              <div className="flex items-center space-x-2">
                <LinkIcon className="h-4 w-4 text-purple-500" />
                <span className="text-sm">Link Previews</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Template Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5" />
                <span>Content Templates</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyContent}
                  className="flex items-center space-x-1"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(DEMO_CONTENT_TEMPLATES).map(([key, _]) => (
                <Button
                  key={key}
                  variant={activeTemplate === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => loadTemplate(key as keyof typeof DEMO_CONTENT_TEMPLATES)}
                  className="capitalize"
                >
                  {key} Format
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Main Demo Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Editor Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Type className="h-5 w-5" />
                    <span>Rich Text Editor</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="flex items-center space-x-1"
                  >
                    <Smile className="h-4 w-4" />
                    <span>Emoji</span>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RichTextEditor
                  value={editorContent}
                  onChange={setEditorContent}
                  placeholder="Start typing with rich formatting..."
                  features={{
                    bold: true,
                    italic: true,
                    strikethrough: true,
                    links: true,
                    quotes: true,
                    lists: true,
                    headings: true,
                    code: true,
                    emoji: true
                  }}
                  showPreview={true}
                  showToolbar={true}
                  onEmojiClick={() => setShowEmojiPicker(true)}
                  maxLength={4000}
                />
              </CardContent>
            </Card>
            
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="relative">
                <div className="absolute top-0 left-0 z-50">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    onClose={() => setShowEmojiPicker(false)}
                    maxRecentEmojis={12}
                    showSearch={true}
                    showCategories={true}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Preview Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Live Preview</span>
                  <Badge variant="secondary">Markdown Rendered</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 min-h-[400px] max-h-[400px] overflow-y-auto bg-muted/20">
                  {editorContent.trim() ? (
                    <MarkdownRenderer
                      content={editorContent}
                      enableLinkPreviews={true}
                      enableCodeHighlighting={true}
                      maxLinkPreviews={2}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Start typing to see the preview</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Link Previews Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <LinkIcon className="h-5 w-5" />
              <span>Link Preview Examples</span>
            </CardTitle>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Click "Add Sample Link" buttons below to see different types of link previews with rich metadata.
              </AlertDescription>
            </Alert>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Add Links */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Available Sample Links:</h4>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_LINKS.filter(link => !selectedLinks.includes(link)).map(link => (
                  <Button
                    key={link}
                    variant="outline"
                    size="sm"
                    onClick={() => addSampleLink(link)}
                    className="text-xs"
                  >
                    Add {new URL(link).hostname}
                  </Button>
                ))}
              </div>
            </div>
            
            <Separator />
            
            {/* Link Previews */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Active Link Previews:</h4>
              {selectedLinks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No links selected. Add some sample links above to see previews.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedLinks.map(url => (
                    <LinkPreview
                      key={url}
                      url={url}
                      onRemove={() => removeLink(url)}
                      showRemoveButton={true}
                      showFavicon={true}
                      showMetadata={true}
                    />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Keyboard Shortcuts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Code className="h-5 w-5" />
              <span>Keyboard Shortcuts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium">Basic Formatting</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Bold</span>
                    <Badge variant="outline" className="text-xs">Ctrl+B</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Italic</span>
                    <Badge variant="outline" className="text-xs">Ctrl+I</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Code</span>
                    <Badge variant="outline" className="text-xs">Ctrl+`</Badge>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Structure</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Quote</span>
                    <Badge variant="outline" className="text-xs">Ctrl+></Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Link</span>
                    <Badge variant="outline" className="text-xs">Ctrl+K</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>List</span>
                    <Badge variant="outline" className="text-xs">Ctrl+Shift+8</Badge>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Advanced</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Undo</span>
                    <Badge variant="outline" className="text-xs">Ctrl+Z</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Redo</span>
                    <Badge variant="outline" className="text-xs">Ctrl+Y</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Strikethrough</span>
                    <Badge variant="outline" className="text-xs">Ctrl+Shift+X</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
