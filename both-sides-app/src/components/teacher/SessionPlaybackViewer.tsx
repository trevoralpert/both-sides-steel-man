/**
 * Session Playback Viewer Component
 * 
 * Task 8.4.3: Advanced playback and review tools with timeline navigation,
 * annotation capabilities, speed controls, and keyword search for educational review
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  Search,
  Bookmark,
  MessageSquare,
  Edit,
  Save,
  Download,
  Share2,
  Eye,
  EyeOff,
  Clock,
  Users,
  Tag,
  Star,
  Flag,
  MoreHorizontal,
  Trash2,
  Copy,
  ExternalLink,
  Filter,
  SortDesc,
  Calendar,
  FileText,
  Video,
  Headphones,
  Settings,
  Zap,
  Target,
  TrendingUp,
  BarChart3,
  Activity,
  AlertCircle,
  CheckCircle2,
  Info,
  Award,
  Lightbulb,
  Brain,
  Mic,
  Camera,
  MonitorSpeaker,
  Volume1,
  VolumeOff,
  Subtitles,
  Captions,
  Languages,
  Timer,
  MousePointer,
  Pen,
  Highlighter,
  Type,
  Shapes,
  Palette
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface PlaybackSession {
  id: string;
  sessionId: string;
  sessionTitle: string;
  recordingDate: Date;
  duration: number; // seconds
  format: 'video' | 'audio' | 'transcript_only';
  quality: {
    videoResolution?: string;
    audioBitrate: number;
    hasSubtitles: boolean;
    hasTranscript: boolean;
  };
  participants: PlaybackParticipant[];
  timeline: TimelineEvent[];
  annotations: Annotation[];
  bookmarks: Bookmark[];
  transcript: TranscriptSegment[];
  chapters: Chapter[];
  metadata: PlaybackMetadata;
  access: AccessControls;
}

interface PlaybackParticipant {
  id: string;
  name: string;
  role: string;
  color: string; // For timeline visualization
  speakingTime: number; // seconds
  contributionCount: number;
  highlights: string[];
  isAnonymized: boolean;
}

interface TimelineEvent {
  id: string;
  timestamp: number; // seconds from start
  type: 'message' | 'phase_change' | 'intervention' | 'highlight' | 'bookmark' | 'annotation';
  participantId?: string;
  title: string;
  description?: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  metadata?: Record<string, any>;
}

interface Annotation {
  id: string;
  timestamp: number;
  duration?: number; // for range annotations
  type: 'note' | 'highlight' | 'question' | 'insight' | 'concern' | 'assessment' | 'feedback';
  content: string;
  participantId?: string; // who the annotation is about
  createdBy: string;
  createdAt: Date;
  lastModified: Date;
  tags: string[];
  isPrivate: boolean;
  color: string;
  position?: { x: number; y: number }; // for video annotations
  responses: AnnotationResponse[];
}

interface AnnotationResponse {
  id: string;
  parentId: string;
  content: string;
  createdBy: string;
  createdAt: Date;
  type: 'reply' | 'resolution' | 'action_item';
}

interface Bookmark {
  id: string;
  timestamp: number;
  title: string;
  description?: string;
  category: 'key_moment' | 'learning_objective' | 'skill_demonstration' | 'issue' | 'achievement' | 'custom';
  createdBy: string;
  createdAt: Date;
  tags: string[];
  isShared: boolean;
  color: string;
}

interface TranscriptSegment {
  id: string;
  startTime: number;
  endTime: number;
  speakerId: string;
  speakerName: string;
  text: string;
  confidence: number;
  isHighlight: boolean;
  annotations: string[];
  searchMatches?: { start: number; end: number }[];
}

interface Chapter {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  description?: string;
  thumbnail?: string;
  keyEvents: string[];
  learningObjectives: string[];
}

interface PlaybackMetadata {
  totalEngagementScore: number;
  participationBalance: number;
  keyMoments: number;
  learningObjectivesAchieved: string[];
  skillsObserved: string[];
  improvementAreas: string[];
  teacherNotes: string;
  educationalValue: 'high' | 'medium' | 'low';
  recommendedFollowUp: string[];
}

interface AccessControls {
  canDownload: boolean;
  canShare: boolean;
  canAnnotate: boolean;
  canBookmark: boolean;
  canExport: boolean;
  viewersAllowed: string[];
  expiryDate?: Date;
}

interface PlaybackSettings {
  playbackSpeed: number;
  volume: number;
  showSubtitles: boolean;
  showTranscript: boolean;
  showTimeline: boolean;
  showAnnotations: boolean;
  showBookmarks: boolean;
  autoScrollTranscript: boolean;
  highlightCurrentSpeaker: boolean;
  anonymizeParticipants: boolean;
}

interface SessionPlaybackViewerProps {
  sessionId: string;
  recordingId: string;
  initialTimestamp?: number;
  onAnnotationCreate?: (annotation: Annotation) => void;
  onBookmarkCreate?: (bookmark: Bookmark) => void;
  onInsightGenerated?: (insight: string) => void;
}

export function SessionPlaybackViewer({
  sessionId,
  recordingId,
  initialTimestamp = 0,
  onAnnotationCreate,
  onBookmarkCreate,
  onInsightGenerated
}: SessionPlaybackViewerProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const playerRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const [playbackSession, setPlaybackSession] = useState<PlaybackSession | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTimestamp);
  const [settings, setSettings] = useState<PlaybackSettings>({
    playbackSpeed: 1.0,
    volume: 0.8,
    showSubtitles: true,
    showTranscript: true,
    showTimeline: true,
    showAnnotations: true,
    showBookmarks: true,
    autoScrollTranscript: true,
    highlightCurrentSpeaker: true,
    anonymizeParticipants: false
  });
  
  // UI State
  const [activeTab, setActiveTab] = useState('viewer');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TranscriptSegment[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [showAnnotationDialog, setShowAnnotationDialog] = useState(false);
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Annotation Creation
  const [newAnnotationType, setNewAnnotationType] = useState<Annotation['type']>('note');
  const [newAnnotationContent, setNewAnnotationContent] = useState('');
  const [newAnnotationTags, setNewAnnotationTags] = useState<string[]>([]);
  const [newAnnotationColor, setNewAnnotationColor] = useState('#3b82f6');
  
  // Bookmark Creation
  const [newBookmarkTitle, setNewBookmarkTitle] = useState('');
  const [newBookmarkDescription, setNewBookmarkDescription] = useState('');
  const [newBookmarkCategory, setNewBookmarkCategory] = useState<Bookmark['category']>('key_moment');
  
  // Filters
  const [annotationFilter, setAnnotationFilter] = useState<string>('all');
  const [participantFilter, setParticipantFilter] = useState<string>('all');

  useEffect(() => {
    loadPlaybackSession();
  }, [recordingId]);

  useEffect(() => {
    if (playbackSession && searchQuery) {
      performSearch(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, playbackSession]);

  const loadPlaybackSession = () => {
    // Mock playback session data
    const mockSession: PlaybackSession = {
      id: recordingId,
      sessionId,
      sessionTitle: 'Climate Change Policy Debate',
      recordingDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      duration: 3600, // 1 hour
      format: 'video',
      quality: {
        videoResolution: '1080p',
        audioBitrate: 256,
        hasSubtitles: true,
        hasTranscript: true
      },
      participants: [
        { id: 'p1', name: 'Alice Johnson', role: 'Debater A', color: '#ef4444', speakingTime: 1200, contributionCount: 34, highlights: ['Excellent climate data citation', 'Strong rebuttal on economics'], isAnonymized: false },
        { id: 'p2', name: 'Bob Chen', role: 'Debater B', color: '#3b82f6', speakingTime: 1150, contributionCount: 29, highlights: ['Creative policy solutions', 'Good evidence synthesis'], isAnonymized: false },
        { id: 'p3', name: 'Carol Davis', role: 'Moderator', color: '#10b981', speakingTime: 450, contributionCount: 12, highlights: ['Effective moderation', 'Good question prompts'], isAnonymized: false }
      ],
      timeline: [
        { id: '1', timestamp: 0, type: 'phase_change', title: 'Debate Opening', description: 'Introduction and opening statements', importance: 'medium', category: 'structure' },
        { id: '2', timestamp: 300, type: 'message', participantId: 'p1', title: 'Strong Opening Argument', description: 'Alice presents compelling climate evidence', importance: 'high', category: 'argument' },
        { id: '3', timestamp: 600, type: 'message', participantId: 'p2', title: 'Economic Counter-argument', description: 'Bob challenges economic assumptions', importance: 'high', category: 'argument' },
        { id: '4', timestamp: 900, type: 'intervention', title: 'Teacher Guidance', description: 'Redirected discussion to evidence quality', importance: 'medium', category: 'moderation' },
        { id: '5', timestamp: 1200, type: 'highlight', participantId: 'p1', title: 'Breakthrough Moment', description: 'Key insight on policy implementation', importance: 'critical', category: 'learning' },
        { id: '6', timestamp: 1800, type: 'phase_change', title: 'Rebuttal Phase', description: 'Cross-examination and rebuttals', importance: 'medium', category: 'structure' },
        { id: '7', timestamp: 2400, type: 'bookmark', title: 'Excellent Evidence Use', description: 'Model example of source citation', importance: 'high', category: 'skill' },
        { id: '8', timestamp: 3000, type: 'message', participantId: 'p2', title: 'Closing Statement', description: 'Strong synthesis of arguments', importance: 'high', category: 'argument' }
      ],
      annotations: [
        {
          id: 'a1',
          timestamp: 305,
          type: 'highlight',
          content: 'Excellent use of peer-reviewed climate data. This demonstrates strong research skills and source evaluation.',
          participantId: 'p1',
          createdBy: user?.id || 'teacher',
          createdAt: new Date(),
          lastModified: new Date(),
          tags: ['research_skills', 'evidence_quality', 'climate_science'],
          isPrivate: false,
          color: '#22c55e',
          responses: []
        },
        {
          id: 'a2',
          timestamp: 605,
          type: 'question',
          content: 'Could explore the economic argument further. What specific policies would address both environmental and economic concerns?',
          participantId: 'p2',
          createdBy: user?.id || 'teacher',
          createdAt: new Date(),
          lastModified: new Date(),
          tags: ['economics', 'policy_analysis', 'critical_thinking'],
          isPrivate: false,
          color: '#f59e0b',
          responses: [
            {
              id: 'r1',
              parentId: 'a2',
              content: 'Student showed good understanding in follow-up discussion',
              createdBy: user?.id || 'teacher',
              createdAt: new Date(),
              type: 'resolution'
            }
          ]
        },
        {
          id: 'a3',
          timestamp: 1205,
          type: 'insight',
          content: 'This moment shows genuine perspective shift - student is integrating opposing viewpoints constructively.',
          participantId: 'p1',
          createdBy: user?.id || 'teacher',
          createdAt: new Date(),
          lastModified: new Date(),
          tags: ['perspective_taking', 'critical_thinking', 'growth'],
          isPrivate: false,
          color: '#8b5cf6',
          responses: []
        }
      ],
      bookmarks: [
        {
          id: 'b1',
          timestamp: 300,
          title: 'Strong Opening - Evidence Quality',
          description: 'Model example of effective evidence presentation',
          category: 'skill_demonstration',
          createdBy: user?.id || 'teacher',
          createdAt: new Date(),
          tags: ['evidence', 'presentation', 'model_example'],
          isShared: true,
          color: '#3b82f6'
        },
        {
          id: 'b2',
          timestamp: 1200,
          title: 'Breakthrough Learning Moment',
          description: 'Student demonstrates significant conceptual understanding',
          category: 'learning_objective',
          createdBy: user?.id || 'teacher',
          createdAt: new Date(),
          tags: ['learning_objective', 'understanding', 'breakthrough'],
          isShared: false,
          color: '#22c55e'
        },
        {
          id: 'b3',
          timestamp: 2400,
          title: 'Exemplary Source Citation',
          description: 'Perfect example for teaching proper evidence use',
          category: 'achievement',
          createdBy: user?.id || 'teacher',
          createdAt: new Date(),
          tags: ['citation', 'research', 'exemplary'],
          isShared: true,
          color: '#f59e0b'
        }
      ],
      transcript: generateMockTranscript(),
      chapters: [
        { id: 'c1', title: 'Opening Statements', startTime: 0, endTime: 600, description: 'Initial position presentations', keyEvents: ['1', '2'], learningObjectives: ['Argument structure', 'Evidence presentation'] },
        { id: 'c2', title: 'Cross Examination', startTime: 600, endTime: 1800, description: 'Challenge and defend positions', keyEvents: ['3', '4', '5'], learningObjectives: ['Critical thinking', 'Evidence evaluation'] },
        { id: 'c3', title: 'Rebuttal Phase', startTime: 1800, endTime: 3000, description: 'Address counterarguments', keyEvents: ['6', '7'], learningObjectives: ['Synthesis', 'Perspective taking'] },
        { id: 'c4', title: 'Closing Arguments', startTime: 3000, endTime: 3600, description: 'Final statements and synthesis', keyEvents: ['8'], learningObjectives: ['Synthesis', 'Persuasive communication'] }
      ],
      metadata: {
        totalEngagementScore: 87,
        participationBalance: 92,
        keyMoments: 5,
        learningObjectivesAchieved: ['Critical Thinking', 'Evidence Evaluation', 'Respectful Debate'],
        skillsObserved: ['Research', 'Analysis', 'Communication', 'Collaboration'],
        improvementAreas: ['Economic analysis depth', 'Counter-argument development'],
        teacherNotes: 'Strong session overall. Students showed good growth in evidence use and respectful disagreement.',
        educationalValue: 'high',
        recommendedFollowUp: ['Economics module review', 'Practice with counter-arguments', 'Peer feedback session']
      },
      access: {
        canDownload: true,
        canShare: false,
        canAnnotate: true,
        canBookmark: true,
        canExport: true,
        viewersAllowed: [user?.id || 'teacher'],
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    };

    setPlaybackSession(mockSession);
    setCurrentTime(initialTimestamp);
  };

  const generateMockTranscript = (): TranscriptSegment[] => {
    return [
      {
        id: 't1', startTime: 0, endTime: 15, speakerId: 'p3', speakerName: 'Carol Davis',
        text: 'Welcome everyone to today\'s debate on climate change policy. We\'ll begin with opening statements.',
        confidence: 0.95, isHighlight: false, annotations: []
      },
      {
        id: 't2', startTime: 20, endTime: 45, speakerId: 'p1', speakerName: 'Alice Johnson',
        text: 'Thank you, Carol. The scientific consensus is clear - we need immediate action on climate change. According to the IPCC report, we have less than a decade to reduce emissions by 45%.',
        confidence: 0.92, isHighlight: true, annotations: ['a1']
      },
      {
        id: 't3', startTime: 50, endTime: 75, speakerId: 'p2', speakerName: 'Bob Chen',
        text: 'While I agree climate change is serious, we must consider the economic impacts. Rapid transitions could harm working families and developing economies.',
        confidence: 0.89, isHighlight: false, annotations: ['a2']
      },
      {
        id: 't4', startTime: 80, endTime: 100, speakerId: 'p1', speakerName: 'Alice Johnson',
        text: 'That\'s exactly why we need a just transition - green jobs, retraining programs, and support for affected communities.',
        confidence: 0.94, isHighlight: false, annotations: []
      },
      {
        id: 't5', startTime: 105, endTime: 125, speakerId: 'p2', speakerName: 'Bob Chen',
        text: 'I appreciate that perspective, Alice. How do we ensure these programs are adequately funded without harming economic growth?',
        confidence: 0.91, isHighlight: true, annotations: ['a3']
      }
      // More transcript segments would follow...
    ];
  };

  const performSearch = (query: string) => {
    if (!playbackSession || !query.trim()) {
      setSearchResults([]);
      return;
    }

    const results = playbackSession.transcript.filter(segment =>
      segment.text.toLowerCase().includes(query.toLowerCase()) ||
      segment.speakerName.toLowerCase().includes(query.toLowerCase())
    );

    // Add search highlights
    const highlightedResults = results.map(segment => ({
      ...segment,
      searchMatches: findMatches(segment.text, query)
    }));

    setSearchResults(highlightedResults);
  };

  const findMatches = (text: string, query: string) => {
    const matches = [];
    const regex = new RegExp(query.toLowerCase(), 'gi');
    let match;
    
    while ((match = regex.exec(text.toLowerCase())) !== null) {
      matches.push({ start: match.index, end: match.index + query.length });
    }
    
    return matches;
  };

  const togglePlayback = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const seekTo = (timestamp: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = timestamp;
      setCurrentTime(timestamp);
    }
  };

  const changeSpeed = (speed: number) => {
    if (playerRef.current) {
      playerRef.current.playbackRate = speed;
      setSettings(prev => ({ ...prev, playbackSpeed: speed }));
    }
  };

  const changeVolume = (volume: number) => {
    if (playerRef.current) {
      playerRef.current.volume = volume;
      setSettings(prev => ({ ...prev, volume }));
    }
  };

  const createAnnotation = () => {
    if (!playbackSession || !newAnnotationContent.trim()) {
      addNotification({
        type: 'error',
        title: 'Content Required',
        message: 'Please enter annotation content.'
      });
      return;
    }

    const annotation: Annotation = {
      id: `a${Date.now()}`,
      timestamp: currentTime,
      type: newAnnotationType,
      content: newAnnotationContent,
      createdBy: user?.id || 'teacher',
      createdAt: new Date(),
      lastModified: new Date(),
      tags: newAnnotationTags,
      isPrivate: false,
      color: newAnnotationColor,
      responses: []
    };

    setPlaybackSession(prev => prev ? {
      ...prev,
      annotations: [...prev.annotations, annotation]
    } : prev);

    onAnnotationCreate?.(annotation);
    
    // Reset form
    setNewAnnotationContent('');
    setNewAnnotationTags([]);
    setShowAnnotationDialog(false);
    
    addNotification({
      type: 'success',
      title: 'Annotation Created',
      message: `${newAnnotationType} annotation added at ${formatTime(currentTime)}.`
    });
  };

  const createBookmark = () => {
    if (!playbackSession || !newBookmarkTitle.trim()) {
      addNotification({
        type: 'error',
        title: 'Title Required',
        message: 'Please enter a bookmark title.'
      });
      return;
    }

    const bookmark: Bookmark = {
      id: `b${Date.now()}`,
      timestamp: currentTime,
      title: newBookmarkTitle,
      description: newBookmarkDescription,
      category: newBookmarkCategory,
      createdBy: user?.id || 'teacher',
      createdAt: new Date(),
      tags: [],
      isShared: false,
      color: '#3b82f6'
    };

    setPlaybackSession(prev => prev ? {
      ...prev,
      bookmarks: [...prev.bookmarks, bookmark]
    } : prev);

    onBookmarkCreate?.(bookmark);
    
    // Reset form
    setNewBookmarkTitle('');
    setNewBookmarkDescription('');
    setShowBookmarkDialog(false);
    
    addNotification({
      type: 'success',
      title: 'Bookmark Created',
      message: `Bookmark "${newBookmarkTitle}" created at ${formatTime(currentTime)}.`
    });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getAnnotationIcon = (type: Annotation['type']) => {
    switch (type) {
      case 'note': return <Edit className="h-4 w-4" />;
      case 'highlight': return <Highlighter className="h-4 w-4" />;
      case 'question': return <MessageSquare className="h-4 w-4" />;
      case 'insight': return <Lightbulb className="h-4 w-4" />;
      case 'concern': return <AlertCircle className="h-4 w-4" />;
      case 'assessment': return <Target className="h-4 w-4" />;
      case 'feedback': return <MessageSquare className="h-4 w-4" />;
      default: return <Edit className="h-4 w-4" />;
    }
  };

  const getBookmarkIcon = (category: Bookmark['category']) => {
    switch (category) {
      case 'key_moment': return <Star className="h-4 w-4" />;
      case 'learning_objective': return <Target className="h-4 w-4" />;
      case 'skill_demonstration': return <Award className="h-4 w-4" />;
      case 'issue': return <Flag className="h-4 w-4" />;
      case 'achievement': return <CheckCircle2 className="h-4 w-4" />;
      default: return <Bookmark className="h-4 w-4" />;
    }
  };

  const filteredAnnotations = playbackSession?.annotations.filter(annotation => {
    if (annotationFilter !== 'all' && annotation.type !== annotationFilter) return false;
    if (participantFilter !== 'all' && annotation.participantId !== participantFilter) return false;
    return true;
  }) || [];

  if (!playbackSession) {
    return <div>Loading playback session...</div>;
  }

  const currentChapter = playbackSession.chapters.find(c => 
    currentTime >= c.startTime && currentTime < c.endTime
  );

  const currentTranscriptSegment = playbackSession.transcript.find(t =>
    currentTime >= t.startTime && currentTime < t.endTime
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Play className="h-5 w-5 mr-2" />
            Session Playback Viewer
          </h3>
          <p className="text-sm text-muted-foreground">
            {playbackSession.sessionTitle} • {formatTime(playbackSession.duration)}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Session Info */}
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{playbackSession.format.toUpperCase()}</Badge>
            <Badge variant="outline">{playbackSession.quality.videoResolution || `${playbackSession.quality.audioBitrate}kbps`}</Badge>
            <Badge variant={playbackSession.metadata.educationalValue === 'high' ? 'default' : 'secondary'}>
              {playbackSession.metadata.educationalValue.toUpperCase()} VALUE
            </Badge>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setShowAnnotationDialog(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Add Note
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowBookmarkDialog(true)}>
              <Bookmark className="h-4 w-4 mr-2" />
              Bookmark
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  Download Recording
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Session
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileText className="h-4 w-4 mr-2" />
                  Export Transcript
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Playback Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="viewer">
            Video Player
          </TabsTrigger>
          <TabsTrigger value="transcript">
            Transcript ({playbackSession.transcript.length})
          </TabsTrigger>
          <TabsTrigger value="annotations">
            Annotations ({playbackSession.annotations.length})
          </TabsTrigger>
          <TabsTrigger value="timeline">
            Timeline ({playbackSession.timeline.length})
          </TabsTrigger>
          <TabsTrigger value="insights">
            Insights & Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="viewer" className="space-y-6">
          {/* Video Player */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardContent className="p-0">
                {/* Video Container */}
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  {playbackSession.format === 'video' ? (
                    <video
                      ref={playerRef}
                      className="w-full h-full"
                      poster="/api/placeholder/800/450"
                      onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    >
                      <source src="/api/mock-video.mp4" type="video/mp4" />
                      {settings.showSubtitles && (
                        <track kind="subtitles" src="/api/mock-subtitles.vtt" srcLang="en" label="English" default />
                      )}
                    </video>
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-900 to-purple-900">
                      <div className="text-center text-white">
                        <Headphones className="h-24 w-24 mx-auto mb-4 opacity-50" />
                        <h3 className="text-2xl font-semibold mb-2">Audio Only</h3>
                        <p className="text-blue-200">Listening to session recording</p>
                        <div className="mt-4 text-4xl font-mono">
                          {formatTime(currentTime)} / {formatTime(playbackSession.duration)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timeline Overlay */}
                  {settings.showTimeline && (
                    <div className="absolute bottom-20 left-4 right-4">
                      <div className="bg-black/75 rounded px-3 py-2">
                        <div className="flex items-center space-x-4 text-white text-sm">
                          <span>{formatTime(currentTime)}</span>
                          <div className="flex-1 relative">
                            <Progress 
                              value={(currentTime / playbackSession.duration) * 100} 
                              className="h-2"
                            />
                            {/* Timeline Events */}
                            {playbackSession.timeline.map((event) => (
                              <div
                                key={event.id}
                                className="absolute top-0 w-1 h-2 bg-yellow-400 cursor-pointer"
                                style={{ left: `${(event.timestamp / playbackSession.duration) * 100}%` }}
                                onClick={() => seekTo(event.timestamp)}
                                title={event.title}
                              />
                            ))}
                            {/* Bookmarks */}
                            {playbackSession.bookmarks.map((bookmark) => (
                              <div
                                key={bookmark.id}
                                className="absolute top-0 w-1 h-2 bg-green-400 cursor-pointer"
                                style={{ left: `${(bookmark.timestamp / playbackSession.duration) * 100}%` }}
                                onClick={() => seekTo(bookmark.timestamp)}
                                title={bookmark.title}
                              />
                            ))}
                          </div>
                          <span>{formatTime(playbackSession.duration)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Controls Overlay */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-black/75 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        {/* Playback Controls */}
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => seekTo(Math.max(0, currentTime - 10))}>
                            <Rewind className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={togglePlayback}>
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => seekTo(Math.min(playbackSession.duration, currentTime + 10))}>
                            <FastForward className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Speed Control */}
                        <div className="flex items-center space-x-2">
                          <Label className="text-white text-sm">Speed:</Label>
                          <Select value={settings.playbackSpeed.toString()} onValueChange={(value) => changeSpeed(parseFloat(value))}>
                            <SelectTrigger className="w-20 h-8 text-white border-white/20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0.25">0.25x</SelectItem>
                              <SelectItem value="0.5">0.5x</SelectItem>
                              <SelectItem value="0.75">0.75x</SelectItem>
                              <SelectItem value="1">1x</SelectItem>
                              <SelectItem value="1.25">1.25x</SelectItem>
                              <SelectItem value="1.5">1.5x</SelectItem>
                              <SelectItem value="2">2x</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Volume Control */}
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => changeVolume(settings.volume > 0 ? 0 : 0.8)}>
                            {settings.volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                          </Button>
                          <Slider
                            value={[settings.volume * 100]}
                            onValueChange={([value]) => changeVolume(value / 100)}
                            max={100}
                            step={1}
                            className="w-20"
                          />
                        </div>

                        {/* Fullscreen */}
                        <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
                          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Side Panel */}
            <div className="space-y-4">
              {/* Current Chapter */}
              {currentChapter && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Current Chapter</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="font-medium">{currentChapter.title}</h4>
                      <p className="text-sm text-muted-foreground">{currentChapter.description}</p>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(currentChapter.startTime)} - {formatTime(currentChapter.endTime)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Current Speaker */}
              {currentTranscriptSegment && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Current Speaker</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ 
                            backgroundColor: playbackSession.participants.find(p => p.id === currentTranscriptSegment.speakerId)?.color || '#gray' 
                          }}
                        />
                        <span className="font-medium">{currentTranscriptSegment.speakerName}</span>
                      </div>
                      <p className="text-sm">{currentTranscriptSegment.text}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowAnnotationDialog(true)} className="justify-start">
                      <Edit className="h-4 w-4 mr-2" />
                      Add Annotation
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowBookmarkDialog(true)} className="justify-start">
                      <Bookmark className="h-4 w-4 mr-2" />
                      Create Bookmark
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Timestamp
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="transcript" className="space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transcript..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
              
              {searchResults.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transcript */}
          <Card>
            <CardContent className="pt-4">
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {(searchResults.length > 0 ? searchResults : playbackSession.transcript).map((segment) => {
                    const participant = playbackSession.participants.find(p => p.id === segment.speakerId);
                    const isCurrentSegment = currentTime >= segment.startTime && currentTime < segment.endTime;
                    
                    return (
                      <div
                        key={segment.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          isCurrentSegment ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                        } ${segment.isHighlight ? 'border-l-4 border-l-yellow-400' : ''}`}
                        onClick={() => seekTo(segment.startTime)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex items-center space-x-2 min-w-0">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: participant?.color || '#gray' }}
                            />
                            <span className="font-medium text-sm truncate">
                              {segment.speakerName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(segment.startTime)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-2 ml-5">
                          <p className="text-sm">
                            {searchQuery && segment.searchMatches ? (
                              // Highlight search matches
                              segment.text.split('').map((char, index) => {
                                const isHighlighted = segment.searchMatches?.some(match => 
                                  index >= match.start && index < match.end
                                );
                                return isHighlighted ? (
                                  <mark key={index} className="bg-yellow-200">{char}</mark>
                                ) : char;
                              }).join('')
                            ) : segment.text}
                          </p>
                          
                          {segment.annotations.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {segment.annotations.map((annotationId) => {
                                const annotation = playbackSession.annotations.find(a => a.id === annotationId);
                                return annotation ? (
                                  <Badge key={annotationId} variant="outline" className="text-xs">
                                    {getAnnotationIcon(annotation.type)}
                                    <span className="ml-1">{annotation.type}</span>
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="annotations" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex space-x-4">
                <div className="space-y-2">
                  <Label>Filter by Type</Label>
                  <Select value={annotationFilter} onValueChange={setAnnotationFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="note">Notes</SelectItem>
                      <SelectItem value="highlight">Highlights</SelectItem>
                      <SelectItem value="question">Questions</SelectItem>
                      <SelectItem value="insight">Insights</SelectItem>
                      <SelectItem value="concern">Concerns</SelectItem>
                      <SelectItem value="assessment">Assessments</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Filter by Participant</Label>
                  <Select value={participantFilter} onValueChange={setParticipantFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Participants</SelectItem>
                      {playbackSession.participants.map((participant) => (
                        <SelectItem key={participant.id} value={participant.id}>
                          {participant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Annotations List */}
          <div className="space-y-4">
            {filteredAnnotations.length === 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center py-8">
                    <Edit className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Annotations</h3>
                    <p className="text-muted-foreground mb-4">
                      {playbackSession.annotations.length === 0 
                        ? "No annotations have been created yet"
                        : "No annotations match your current filters"
                      }
                    </p>
                    <Button onClick={() => setShowAnnotationDialog(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Create First Annotation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredAnnotations.map((annotation) => {
                const participant = annotation.participantId ? 
                  playbackSession.participants.find(p => p.id === annotation.participantId) : null;
                
                return (
                  <Card key={annotation.id} className={`border-l-4`} style={{ borderLeftColor: annotation.color }}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            {getAnnotationIcon(annotation.type)}
                            <Badge variant="outline" className="capitalize">
                              {annotation.type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatTime(annotation.timestamp)}
                            </span>
                            {participant && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-sm text-muted-foreground">
                                  {participant.name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => seekTo(annotation.timestamp)}>
                            <Play className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-3">{annotation.content}</p>
                      
                      {annotation.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {annotation.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {annotation.responses.length > 0 && (
                        <div className="border-t pt-3 mt-3 space-y-2">
                          {annotation.responses.map((response) => (
                            <div key={response.id} className="bg-muted rounded p-2 text-sm">
                              <div className="font-medium mb-1">
                                {response.type === 'resolution' ? 'Resolution' : 'Reply'}
                              </div>
                              <p>{response.content}</p>
                              <div className="text-xs text-muted-foreground mt-1">
                                {response.createdAt.toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                        <div>
                          Created: {annotation.createdAt.toLocaleString()}
                        </div>
                        <div>
                          {annotation.isPrivate && (
                            <Badge variant="outline" className="text-xs">
                              <Lock className="h-3 w-3 mr-1" />
                              Private
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          {/* Timeline Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>Session Timeline</CardTitle>
              <CardDescription>
                Key events, interventions, and milestones throughout the session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline Track */}
                <div className="relative h-4 bg-muted rounded-full mb-8">
                  <Progress 
                    value={(currentTime / playbackSession.duration) * 100} 
                    className="h-4"
                  />
                  
                  {/* Current Position Indicator */}
                  <div
                    className="absolute top-0 w-1 h-4 bg-primary cursor-pointer"
                    style={{ left: `${(currentTime / playbackSession.duration) * 100}%` }}
                  />

                  {/* Timeline Events */}
                  {playbackSession.timeline.map((event, index) => {
                    const position = (event.timestamp / playbackSession.duration) * 100;
                    const isImportant = event.importance === 'high' || event.importance === 'critical';
                    
                    return (
                      <div
                        key={event.id}
                        className="absolute cursor-pointer group"
                        style={{ left: `${position}%`, top: '16px' }}
                        onClick={() => seekTo(event.timestamp)}
                      >
                        <div className={`w-3 h-3 rounded-full border-2 border-white ${
                          event.type === 'message' ? 'bg-blue-500' :
                          event.type === 'phase_change' ? 'bg-green-500' :
                          event.type === 'intervention' ? 'bg-orange-500' :
                          event.type === 'highlight' ? 'bg-yellow-500' :
                          event.type === 'bookmark' ? 'bg-purple-500' :
                          'bg-gray-500'
                        } ${isImportant ? 'ring-2 ring-current' : ''}`} />
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                            {event.title}
                            <div className="text-xs opacity-75">{formatTime(event.timestamp)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Chapter Markers */}
                <div className="space-y-2">
                  {playbackSession.chapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => seekTo(chapter.startTime)}
                    >
                      <div className="text-sm font-mono text-muted-foreground min-w-0">
                        {formatTime(chapter.startTime)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{chapter.title}</h4>
                        <p className="text-sm text-muted-foreground">{chapter.description}</p>
                      </div>
                      <Badge variant="outline">
                        {formatTime(chapter.endTime - chapter.startTime)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline Events</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {playbackSession.timeline
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .map((event) => {
                      const participant = event.participantId ? 
                        playbackSession.participants.find(p => p.id === event.participantId) : null;
                      
                      return (
                        <div
                          key={event.id}
                          className="flex items-start space-x-4 p-3 rounded-lg hover:bg-muted cursor-pointer"
                          onClick={() => seekTo(event.timestamp)}
                        >
                          <div className="text-sm font-mono text-muted-foreground min-w-0">
                            {formatTime(event.timestamp)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium">{event.title}</h4>
                              <Badge variant="outline" className="capitalize">
                                {event.type.replace('_', ' ')}
                              </Badge>
                              <Badge variant={
                                event.importance === 'critical' ? 'destructive' :
                                event.importance === 'high' ? 'default' :
                                event.importance === 'medium' ? 'secondary' : 'outline'
                              }>
                                {event.importance}
                              </Badge>
                            </div>
                            {event.description && (
                              <p className="text-sm text-muted-foreground">{event.description}</p>
                            )}
                            {participant && (
                              <div className="flex items-center space-x-2 mt-2">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: participant.color }}
                                />
                                <span className="text-sm">{participant.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {/* Session Analytics */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Session Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Overall Engagement</div>
                    <div className="text-2xl font-bold">{playbackSession.metadata.totalEngagementScore}%</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Participation Balance</div>
                    <div className="text-2xl font-bold">{playbackSession.metadata.participationBalance}%</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Key Moments</div>
                    <div className="text-2xl font-bold">{playbackSession.metadata.keyMoments}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Educational Value</div>
                    <Badge variant={playbackSession.metadata.educationalValue === 'high' ? 'default' : 'secondary'}>
                      {playbackSession.metadata.educationalValue.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="text-sm font-medium mb-2">Learning Objectives Achieved</div>
                  <div className="flex flex-wrap gap-1">
                    {playbackSession.metadata.learningObjectivesAchieved.map((objective) => (
                      <Badge key={objective} variant="default" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {objective}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Skills Observed</div>
                  <div className="flex flex-wrap gap-1">
                    {playbackSession.metadata.skillsObserved.map((skill) => (
                      <Badge key={skill} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Participant Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {playbackSession.participants.map((participant) => (
                    <div key={participant.id} className="border rounded p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: participant.color }}
                        />
                        <span className="font-medium">{participant.name}</span>
                        <Badge variant="outline" className="text-xs">{participant.role}</Badge>
                      </div>
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span>Speaking Time:</span>
                          <span>{formatTime(participant.speakingTime)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Contributions:</span>
                          <span>{participant.contributionCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Speaking Ratio:</span>
                          <span>{Math.round((participant.speakingTime / playbackSession.duration) * 100)}%</span>
                        </div>
                      </div>
                      {participant.highlights.length > 0 && (
                        <div className="mt-2">
                          <div className="text-sm font-medium mb-1">Highlights:</div>
                          <div className="space-y-1">
                            {participant.highlights.map((highlight, index) => (
                              <div key={index} className="text-xs bg-muted rounded px-2 py-1">
                                {highlight}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Teacher Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Teacher Notes & Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Session Notes</Label>
                <div className="mt-2 p-3 bg-muted rounded-lg text-sm">
                  {playbackSession.metadata.teacherNotes}
                </div>
              </div>

              <div>
                <Label>Areas for Improvement</Label>
                <div className="mt-2 space-y-1">
                  {playbackSession.metadata.improvementAreas.map((area, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span>{area}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Recommended Follow-up</Label>
                <div className="mt-2 space-y-1">
                  {playbackSession.metadata.recommendedFollowUp.map((action, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <Lightbulb className="h-4 w-4 text-blue-500" />
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Annotation Dialog */}
      <Dialog open={showAnnotationDialog} onOpenChange={setShowAnnotationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Annotation</DialogTitle>
            <DialogDescription>
              Add a note, highlight, or insight at the current timestamp ({formatTime(currentTime)})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Annotation Type</Label>
              <Select value={newAnnotationType} onValueChange={(value: any) => setNewAnnotationType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="highlight">Highlight</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                  <SelectItem value="insight">Insight</SelectItem>
                  <SelectItem value="concern">Concern</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                placeholder="Enter your annotation content..."
                value={newAnnotationContent}
                onChange={(e) => setNewAnnotationContent(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                placeholder="e.g., critical_thinking, evidence_use"
                value={newAnnotationTags.join(', ')}
                onChange={(e) => setNewAnnotationTags(e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex space-x-2">
                {['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'].map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${newAnnotationColor === color ? 'border-primary' : 'border-muted'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewAnnotationColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnnotationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createAnnotation} disabled={!newAnnotationContent.trim()}>
              <Save className="h-4 w-4 mr-2" />
              Save Annotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Bookmark Dialog */}
      <Dialog open={showBookmarkDialog} onOpenChange={setShowBookmarkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Bookmark</DialogTitle>
            <DialogDescription>
              Mark an important moment at the current timestamp ({formatTime(currentTime)})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Enter bookmark title..."
                value={newBookmarkTitle}
                onChange={(e) => setNewBookmarkTitle(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Add additional details..."
                value={newBookmarkDescription}
                onChange={(e) => setNewBookmarkDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newBookmarkCategory} onValueChange={(value: any) => setNewBookmarkCategory(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="key_moment">Key Moment</SelectItem>
                  <SelectItem value="learning_objective">Learning Objective</SelectItem>
                  <SelectItem value="skill_demonstration">Skill Demonstration</SelectItem>
                  <SelectItem value="issue">Issue</SelectItem>
                  <SelectItem value="achievement">Achievement</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookmarkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createBookmark} disabled={!newBookmarkTitle.trim()}>
              <Bookmark className="h-4 w-4 mr-2" />
              Save Bookmark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
