/**
 * Session Recording Infrastructure Component
 * 
 * Task 8.4.3: Automatic session transcript generation, privacy-compliant recording
 * with consent management, and selective recording options for educational purposes
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Video,
  Mic,
  Square,
  Play,
  Pause,
  FileText,
  Shield,
  Clock,
  Users,
  Eye,
  EyeOff,
  Download,
  Upload,
  Settings,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Calendar,
  Tag,
  Filter,
  Search,
  MoreHorizontal,
  Trash2,
  Edit,
  Share2,
  Lock,
  Unlock,
  Monitor,
  Headphones,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  HardDrive,
  Cloud,
  Database,
  Archive,
  RefreshCw,
  AlertCircle,
  UserCheck,
  UserX,
  Globe,
  MapPin,
  Phone,
  MessageSquare,
  Camera,
  CameraOff,
  MicOff,
  Activity,
  TrendingUp,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface RecordingSession {
  id: string;
  sessionId: string;
  sessionTitle: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // seconds
  status: 'preparing' | 'recording' | 'paused' | 'completed' | 'failed' | 'processing';
  recordingType: 'full_session' | 'highlights_only' | 'audio_only' | 'transcript_only' | 'custom';
  participants: RecordingParticipant[];
  consent: ConsentManagement;
  storage: StorageInfo;
  transcript: TranscriptData;
  quality: RecordingQuality;
  privacy: PrivacySettings;
  metadata: RecordingMetadata;
}

interface RecordingParticipant {
  id: string;
  name: string;
  role: 'student' | 'teacher' | 'observer';
  consentStatus: 'pending' | 'granted' | 'denied' | 'expired';
  consentTimestamp?: Date;
  recordingPreferences: {
    allowVideo: boolean;
    allowAudio: boolean;
    allowTranscript: boolean;
    anonymizeTranscript: boolean;
  };
  participationTime: number; // seconds
  messagesCount: number;
  highlights: string[]; // Key moments/contributions
}

interface ConsentManagement {
  isRequired: boolean;
  allParticipantsConsented: boolean;
  consentExpiryDays: number;
  consentTemplate: string;
  automaticRenewal: boolean;
  parentalConsentRequired: boolean;
  consentRecords: ConsentRecord[];
}

interface ConsentRecord {
  participantId: string;
  consentType: 'full' | 'partial' | 'minimal';
  consentData: {
    video: boolean;
    audio: boolean;
    transcript: boolean;
    sharing: boolean;
    analytics: boolean;
  };
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  parentalConsent?: boolean;
  expiryDate: Date;
}

interface StorageInfo {
  provider: 'local' | 'aws_s3' | 'azure' | 'google_cloud';
  region: string;
  encryption: 'aes256' | 'aws_kms' | 'azure_vault' | 'google_kms';
  compressionLevel: 'none' | 'low' | 'medium' | 'high';
  expectedSize: number; // MB
  actualSize?: number; // MB
  storageUrl?: string;
  backupLocations: string[];
  retentionPeriod: number; // days
}

interface TranscriptData {
  isEnabled: boolean;
  language: string;
  accuracy: number; // 0-100
  speakerIdentification: boolean;
  timestamped: boolean;
  punctuated: boolean;
  confidenceThreshold: number;
  customVocabulary: string[];
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  segments: TranscriptSegment[];
  summary?: string;
  keywords: string[];
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
  tags: string[];
  emotions?: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

interface RecordingQuality {
  videoResolution: '720p' | '1080p' | '4k' | 'adaptive';
  videoFrameRate: 24 | 30 | 60;
  audioBitrate: 128 | 256 | 320; // kbps
  videoCodec: 'h264' | 'h265' | 'vp9' | 'av1';
  audioCodec: 'aac' | 'mp3' | 'opus';
  adaptiveBitrate: boolean;
  networkOptimization: boolean;
}

interface PrivacySettings {
  anonymizeParticipants: boolean;
  blurFaces: boolean;
  muffleVoices: boolean;
  redactSensitiveInfo: boolean;
  watermarkVideo: boolean;
  accessControlList: string[]; // User IDs with access
  sharingRestrictions: {
    allowDownload: boolean;
    allowSharing: boolean;
    allowEmbedding: boolean;
    allowScreenshots: boolean;
  };
  dataProcessingLocation: string;
  complianceStandards: ('FERPA' | 'COPPA' | 'GDPR' | 'CCPA')[];
}

interface RecordingMetadata {
  creator: string;
  createdAt: Date;
  lastModified: Date;
  tags: string[];
  description: string;
  academicSubject: string;
  gradeLevel: string;
  learningObjectives: string[];
  customFields: Record<string, string>;
}

interface RecordingTemplate {
  id: string;
  name: string;
  description: string;
  recordingType: RecordingSession['recordingType'];
  quality: RecordingQuality;
  privacy: PrivacySettings;
  consent: Partial<ConsentManagement>;
  isDefault: boolean;
  createdBy: string;
  usageCount: number;
}

interface SessionRecordingInfrastructureProps {
  sessionId: string;
  sessionTitle: string;
  participants: any[];
  isLiveSession: boolean;
  onRecordingStart?: (recordingId: string) => void;
  onRecordingStop?: (recordingId: string) => void;
  onRecordingError?: (error: string) => void;
}

export function SessionRecordingInfrastructure({
  sessionId,
  sessionTitle,
  participants = [],
  isLiveSession = true,
  onRecordingStart,
  onRecordingStop,
  onRecordingError
}: SessionRecordingInfrastructureProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [currentRecording, setCurrentRecording] = useState<RecordingSession | null>(null);
  const [recordingHistory, setRecordingHistory] = useState<RecordingSession[]>([]);
  const [recordingTemplates, setRecordingTemplates] = useState<RecordingTemplate[]>([]);
  
  // Recording controls
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<RecordingSession['recordingType']>('full_session');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  
  // Quality settings
  const [videoQuality, setVideoQuality] = useState<RecordingQuality['videoResolution']>('1080p');
  const [audioQuality, setAudioQuality] = useState<RecordingQuality['audioBitrate']>(256);
  
  // Privacy settings
  const [requireConsent, setRequireConsent] = useState(true);
  const [anonymizeParticipants, setAnonymizeParticipants] = useState(false);
  const [encryptStorage, setEncryptStorage] = useState(true);
  
  // Consent management
  const [consentStatus, setConsentStatus] = useState<Record<string, boolean>>({});
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  
  // Storage settings
  const [storageProvider, setStorageProvider] = useState<StorageInfo['provider']>('aws_s3');
  const [retentionDays, setRetentionDays] = useState(365);

  useEffect(() => {
    initializeRecordingSystem();
    loadRecordingTemplates();
    checkParticipantConsent();
  }, [sessionId, participants]);

  const initializeRecordingSystem = () => {
    // Initialize recording system with default settings
    const mockRecordingHistory: RecordingSession[] = [
      {
        id: 'rec_1',
        sessionId: sessionId,
        sessionTitle: sessionTitle,
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
        duration: 3600,
        status: 'completed',
        recordingType: 'full_session',
        participants: participants.map(p => ({
          id: p.id,
          name: p.name,
          role: 'student',
          consentStatus: 'granted',
          consentTimestamp: new Date(),
          recordingPreferences: {
            allowVideo: true,
            allowAudio: true,
            allowTranscript: true,
            anonymizeTranscript: false
          },
          participationTime: 3400,
          messagesCount: 45,
          highlights: ['Great argument about climate policy', 'Excellent evidence citation']
        })),
        consent: {
          isRequired: true,
          allParticipantsConsented: true,
          consentExpiryDays: 365,
          consentTemplate: 'Standard educational recording consent',
          automaticRenewal: false,
          parentalConsentRequired: false,
          consentRecords: []
        },
        storage: {
          provider: 'aws_s3',
          region: 'us-east-1',
          encryption: 'aws_kms',
          compressionLevel: 'medium',
          expectedSize: 2500,
          actualSize: 2347,
          retentionPeriod: 365,
          backupLocations: ['us-west-2', 'eu-west-1']
        },
        transcript: {
          isEnabled: true,
          language: 'en-US',
          accuracy: 94,
          speakerIdentification: true,
          timestamped: true,
          punctuated: true,
          confidenceThreshold: 0.8,
          customVocabulary: ['debate', 'argument', 'evidence', 'rebuttal'],
          processingStatus: 'completed',
          segments: [],
          summary: 'Climate change debate focusing on policy solutions and evidence-based arguments.',
          keywords: ['climate', 'policy', 'evidence', 'sustainability', 'economics']
        },
        quality: {
          videoResolution: '1080p',
          videoFrameRate: 30,
          audioBitrate: 256,
          videoCodec: 'h264',
          audioCodec: 'aac',
          adaptiveBitrate: true,
          networkOptimization: true
        },
        privacy: {
          anonymizeParticipants: false,
          blurFaces: false,
          muffleVoices: false,
          redactSensitiveInfo: true,
          watermarkVideo: true,
          accessControlList: [user?.id || 'teacher'],
          sharingRestrictions: {
            allowDownload: true,
            allowSharing: false,
            allowEmbedding: false,
            allowScreenshots: true
          },
          dataProcessingLocation: 'US',
          complianceStandards: ['FERPA', 'COPPA']
        },
        metadata: {
          creator: user?.id || 'teacher',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          lastModified: new Date(Date.now() - 1 * 60 * 60 * 1000),
          tags: ['debate', 'climate-change', 'educational'],
          description: 'Student debate on climate change policy solutions',
          academicSubject: 'Environmental Science',
          gradeLevel: '9-12',
          learningObjectives: ['Critical thinking', 'Evidence evaluation', 'Public speaking'],
          customFields: {}
        }
      }
    ];

    setRecordingHistory(mockRecordingHistory);
  };

  const loadRecordingTemplates = () => {
    const templates: RecordingTemplate[] = [
      {
        id: 'template_1',
        name: 'Standard Debate Recording',
        description: 'Full session recording with transcripts and standard privacy settings',
        recordingType: 'full_session',
        quality: {
          videoResolution: '1080p',
          videoFrameRate: 30,
          audioBitrate: 256,
          videoCodec: 'h264',
          audioCodec: 'aac',
          adaptiveBitrate: true,
          networkOptimization: true
        },
        privacy: {
          anonymizeParticipants: false,
          blurFaces: false,
          muffleVoices: false,
          redactSensitiveInfo: true,
          watermarkVideo: true,
          accessControlList: [],
          sharingRestrictions: {
            allowDownload: true,
            allowSharing: false,
            allowEmbedding: false,
            allowScreenshots: true
          },
          dataProcessingLocation: 'US',
          complianceStandards: ['FERPA']
        },
        consent: {
          isRequired: true,
          consentExpiryDays: 365,
          automaticRenewal: false
        },
        isDefault: true,
        createdBy: user?.id || 'system',
        usageCount: 234
      },
      {
        id: 'template_2',
        name: 'Privacy-Enhanced Recording',
        description: 'High privacy recording with participant anonymization',
        recordingType: 'audio_only',
        quality: {
          videoResolution: '720p',
          videoFrameRate: 24,
          audioBitrate: 320,
          videoCodec: 'h264',
          audioCodec: 'aac',
          adaptiveBitrate: false,
          networkOptimization: true
        },
        privacy: {
          anonymizeParticipants: true,
          blurFaces: true,
          muffleVoices: true,
          redactSensitiveInfo: true,
          watermarkVideo: true,
          accessControlList: [],
          sharingRestrictions: {
            allowDownload: false,
            allowSharing: false,
            allowEmbedding: false,
            allowScreenshots: false
          },
          dataProcessingLocation: 'US',
          complianceStandards: ['FERPA', 'COPPA', 'GDPR']
        },
        consent: {
          isRequired: true,
          consentExpiryDays: 180,
          parentalConsentRequired: true
        },
        isDefault: false,
        createdBy: user?.id || 'system',
        usageCount: 67
      },
      {
        id: 'template_3',
        name: 'Highlights Only',
        description: 'Record only key moments and highlights from the session',
        recordingType: 'highlights_only',
        quality: {
          videoResolution: '720p',
          videoFrameRate: 30,
          audioBitrate: 256,
          videoCodec: 'h265',
          audioCodec: 'opus',
          adaptiveBitrate: true,
          networkOptimization: true
        },
        privacy: {
          anonymizeParticipants: false,
          blurFaces: false,
          muffleVoices: false,
          redactSensitiveInfo: false,
          watermarkVideo: false,
          accessControlList: [],
          sharingRestrictions: {
            allowDownload: true,
            allowSharing: true,
            allowEmbedding: true,
            allowScreenshots: true
          },
          dataProcessingLocation: 'US',
          complianceStandards: ['FERPA']
        },
        consent: {
          isRequired: false,
          consentExpiryDays: 730
        },
        isDefault: false,
        createdBy: user?.id || 'system',
        usageCount: 156
      }
    ];

    setRecordingTemplates(templates);
    if (templates.length > 0) {
      setSelectedTemplate(templates.find(t => t.isDefault)?.id || templates[0].id);
    }
  };

  const checkParticipantConsent = () => {
    // Check consent status for all participants
    const consent: Record<string, boolean> = {};
    participants.forEach(participant => {
      // In a real app, this would check actual consent records
      consent[participant.id] = Math.random() > 0.2; // 80% have consented
    });
    setConsentStatus(consent);
  };

  const startRecording = async () => {
    if (!requireConsent || Object.values(consentStatus).every(Boolean)) {
      const recordingId = `rec_${Date.now()}`;
      
      const newRecording: RecordingSession = {
        id: recordingId,
        sessionId,
        sessionTitle,
        startTime: new Date(),
        duration: 0,
        status: 'recording',
        recordingType,
        participants: participants.map(p => ({
          id: p.id,
          name: p.name,
          role: 'student',
          consentStatus: consentStatus[p.id] ? 'granted' : 'pending',
          consentTimestamp: new Date(),
          recordingPreferences: {
            allowVideo: true,
            allowAudio: true,
            allowTranscript: true,
            anonymizeTranscript: anonymizeParticipants
          },
          participationTime: 0,
          messagesCount: 0,
          highlights: []
        })),
        consent: {
          isRequired: requireConsent,
          allParticipantsConsented: Object.values(consentStatus).every(Boolean),
          consentExpiryDays: 365,
          consentTemplate: 'Standard educational recording consent',
          automaticRenewal: false,
          parentalConsentRequired: false,
          consentRecords: []
        },
        storage: {
          provider: storageProvider,
          region: 'us-east-1',
          encryption: encryptStorage ? 'aws_kms' : 'aes256',
          compressionLevel: 'medium',
          expectedSize: 0,
          retentionPeriod: retentionDays,
          backupLocations: []
        },
        transcript: {
          isEnabled: recordingType !== 'audio_only',
          language: 'en-US',
          accuracy: 0,
          speakerIdentification: true,
          timestamped: true,
          punctuated: true,
          confidenceThreshold: 0.8,
          customVocabulary: [],
          processingStatus: 'pending',
          segments: [],
          keywords: []
        },
        quality: {
          videoResolution: videoQuality,
          videoFrameRate: 30,
          audioBitrate: audioQuality,
          videoCodec: 'h264',
          audioCodec: 'aac',
          adaptiveBitrate: true,
          networkOptimization: true
        },
        privacy: {
          anonymizeParticipants,
          blurFaces: anonymizeParticipants,
          muffleVoices: false,
          redactSensitiveInfo: true,
          watermarkVideo: true,
          accessControlList: [user?.id || 'teacher'],
          sharingRestrictions: {
            allowDownload: true,
            allowSharing: false,
            allowEmbedding: false,
            allowScreenshots: true
          },
          dataProcessingLocation: 'US',
          complianceStandards: ['FERPA']
        },
        metadata: {
          creator: user?.id || 'teacher',
          createdAt: new Date(),
          lastModified: new Date(),
          tags: [],
          description: '',
          academicSubject: '',
          gradeLevel: '',
          learningObjectives: [],
          customFields: {}
        }
      };

      setCurrentRecording(newRecording);
      setIsRecording(true);
      onRecordingStart?.(recordingId);

      addNotification({
        type: 'success',
        title: 'Recording Started',
        message: `Session recording has begun with ${recordingType.replace('_', ' ')} settings.`
      });

      // Simulate real-time recording updates
      const interval = setInterval(() => {
        setCurrentRecording(prev => prev ? {
          ...prev,
          duration: prev.duration + 1,
          storage: {
            ...prev.storage,
            expectedSize: prev.storage.expectedSize + Math.floor(Math.random() * 5) + 1
          }
        } : null);
      }, 1000);

      // Store interval for cleanup
      (window as any).recordingInterval = interval;

    } else {
      setShowConsentDialog(true);
      addNotification({
        type: 'error',
        title: 'Consent Required',
        message: 'All participants must consent before recording can begin.'
      });
    }
  };

  const stopRecording = async () => {
    if (currentRecording && isRecording) {
      clearInterval((window as any).recordingInterval);
      
      const completedRecording = {
        ...currentRecording,
        endTime: new Date(),
        status: 'processing' as const,
        transcript: {
          ...currentRecording.transcript,
          processingStatus: 'processing' as const
        }
      };

      setCurrentRecording(completedRecording);
      setRecordingHistory(prev => [completedRecording, ...prev]);
      setIsRecording(false);
      onRecordingStop?.(currentRecording.id);

      addNotification({
        type: 'info',
        title: 'Recording Stopped',
        message: 'Session recording has ended and is being processed.'
      });

      // Simulate processing completion
      setTimeout(() => {
        setCurrentRecording(prev => prev ? {
          ...prev,
          status: 'completed',
          transcript: {
            ...prev.transcript,
            processingStatus: 'completed',
            accuracy: Math.floor(Math.random() * 10) + 90
          }
        } : null);

        addNotification({
          type: 'success',
          title: 'Recording Processed',
          message: 'Session recording and transcript are ready for review.'
        });
      }, 5000);
    }
  };

  const pauseRecording = () => {
    if (currentRecording && isRecording) {
      setCurrentRecording(prev => prev ? { ...prev, status: 'paused' } : null);
      clearInterval((window as any).recordingInterval);
      addNotification({
        type: 'info',
        title: 'Recording Paused',
        message: 'Session recording has been paused.'
      });
    }
  };

  const resumeRecording = () => {
    if (currentRecording && currentRecording.status === 'paused') {
      setCurrentRecording(prev => prev ? { ...prev, status: 'recording' } : null);
      addNotification({
        type: 'success',
        title: 'Recording Resumed',
        message: 'Session recording has resumed.'
      });
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = recordingTemplates.find(t => t.id === templateId);
    if (template) {
      setRecordingType(template.recordingType);
      setVideoQuality(template.quality.videoResolution);
      setAudioQuality(template.quality.audioBitrate);
      setAnonymizeParticipants(template.privacy.anonymizeParticipants);
      setRequireConsent(template.consent.isRequired || true);
      
      addNotification({
        type: 'success',
        title: 'Template Applied',
        message: `Recording settings updated from template: ${template.name}`
      });
    }
  };

  const requestConsent = (participantId: string) => {
    // In a real app, this would send consent request
    setTimeout(() => {
      setConsentStatus(prev => ({ ...prev, [participantId]: true }));
      addNotification({
        type: 'success',
        title: 'Consent Granted',
        message: `Participant consent has been granted.`
      });
    }, 2000);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (mb: number) => {
    if (mb < 1024) return `${Math.round(mb)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const getStatusBadge = (status: RecordingSession['status']) => {
    switch (status) {
      case 'recording':
        return <Badge className="bg-red-500 animate-pulse">Recording</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'processing':
        return <Badge variant="outline">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const allConsented = Object.values(consentStatus).every(Boolean);
  const consentedCount = Object.values(consentStatus).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Video className="h-5 w-5 mr-2" />
            Session Recording Infrastructure
          </h3>
          <p className="text-sm text-muted-foreground">
            Privacy-compliant recording with automatic transcripts
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Recording Status */}
          {currentRecording && (
            <div className="flex items-center space-x-2">
              {getStatusBadge(currentRecording.status)}
              <span className="text-sm text-muted-foreground">
                {formatDuration(currentRecording.duration)}
              </span>
              {currentRecording.storage.expectedSize > 0 && (
                <span className="text-sm text-muted-foreground">
                  {formatFileSize(currentRecording.storage.expectedSize)}
                </span>
              )}
            </div>
          )}
          
          {/* Recording Controls */}
          <div className="flex items-center space-x-2">
            {!isRecording ? (
              <Button 
                onClick={startRecording} 
                disabled={requireConsent && !allConsented}
                className="bg-red-600 hover:bg-red-700"
              >
                <Video className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            ) : currentRecording?.status === 'paused' ? (
              <>
                <Button onClick={resumeRecording}>
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
                <Button variant="destructive" onClick={stopRecording}>
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={pauseRecording}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
                <Button variant="destructive" onClick={stopRecording}>
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setShowSettingsDialog(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Consent Alert */}
      {requireConsent && !allConsented && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Participant consent required:</strong> {consentedCount} of {participants.length} participants have consented. 
            Recording cannot begin until all participants provide consent.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            Current Recording
          </TabsTrigger>
          <TabsTrigger value="consent">
            Consent Management ({consentedCount}/{participants.length})
          </TabsTrigger>
          <TabsTrigger value="settings">
            Recording Settings
          </TabsTrigger>
          <TabsTrigger value="history">
            Recording History ({recordingHistory.length})
          </TabsTrigger>
          <TabsTrigger value="templates">
            Templates ({recordingTemplates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Current Recording Overview */}
          {currentRecording ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    Recording Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2 text-sm">
                    <div>
                      <div className="font-medium">Status</div>
                      <div>{getStatusBadge(currentRecording.status)}</div>
                    </div>
                    <div>
                      <div className="font-medium">Recording Type</div>
                      <div className="text-muted-foreground">{currentRecording.recordingType.replace('_', ' ')}</div>
                    </div>
                    <div>
                      <div className="font-medium">Duration</div>
                      <div className="text-muted-foreground">{formatDuration(currentRecording.duration)}</div>
                    </div>
                    <div>
                      <div className="font-medium">File Size</div>
                      <div className="text-muted-foreground">{formatFileSize(currentRecording.storage.expectedSize)}</div>
                    </div>
                    <div>
                      <div className="font-medium">Quality</div>
                      <div className="text-muted-foreground">{currentRecording.quality.videoResolution} @ {currentRecording.quality.audioBitrate}kbps</div>
                    </div>
                    <div>
                      <div className="font-medium">Participants</div>
                      <div className="text-muted-foreground">{currentRecording.participants.length} active</div>
                    </div>
                  </div>

                  {currentRecording.transcript.isEnabled && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">Transcript Processing</span>
                        <Badge variant="outline">{currentRecording.transcript.processingStatus}</Badge>
                      </div>
                      {currentRecording.transcript.processingStatus === 'processing' ? (
                        <div className="space-y-2">
                          <Progress value={75} className="w-full" />
                          <p className="text-xs text-muted-foreground">
                            Processing speech-to-text with {currentRecording.transcript.language} language model...
                          </p>
                        </div>
                      ) : currentRecording.transcript.processingStatus === 'completed' ? (
                        <p className="text-sm text-muted-foreground">
                          Transcript ready with {currentRecording.transcript.accuracy}% accuracy
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Transcript will be generated after recording completion
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Privacy & Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Consent Required:</span>
                      <Badge variant={currentRecording.consent.isRequired ? "default" : "outline"}>
                        {currentRecording.consent.isRequired ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>All Consented:</span>
                      <Badge variant={currentRecording.consent.allParticipantsConsented ? "default" : "destructive"}>
                        {currentRecording.consent.allParticipantsConsented ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Anonymized:</span>
                      <Badge variant={currentRecording.privacy.anonymizeParticipants ? "default" : "outline"}>
                        {currentRecording.privacy.anonymizeParticipants ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Encrypted Storage:</span>
                      <Badge variant="default">
                        {currentRecording.storage.encryption.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Compliance:</span>
                      <div className="flex gap-1">
                        {currentRecording.privacy.complianceStandards.map((standard) => (
                          <Badge key={standard} variant="outline" className="text-xs">
                            {standard}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="text-sm font-medium mb-2">Data Processing</div>
                    <div className="text-sm text-muted-foreground">
                      Location: {currentRecording.privacy.dataProcessingLocation}<br/>
                      Retention: {currentRecording.storage.retentionPeriod} days<br/>
                      Provider: {currentRecording.storage.provider.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <div className="text-center py-8">
                  <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Active Recording</h3>
                  <p className="text-muted-foreground mb-4">
                    Start recording to monitor session progress and generate transcripts
                  </p>
                  <Button 
                    onClick={startRecording} 
                    disabled={requireConsent && !allConsented}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Start Recording
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="consent" className="space-y-4">
          {/* Consent Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCheck className="h-5 w-5 mr-2" />
                Participant Consent Status
              </CardTitle>
              <CardDescription>
                Manage participant consent for session recording
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        {consentStatus[participant.id] ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{participant.name}</div>
                        <div className="text-sm text-muted-foreground">{participant.role || 'Student'}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={consentStatus[participant.id] ? "default" : "destructive"}>
                        {consentStatus[participant.id] ? 'Consented' : 'Pending'}
                      </Badge>
                      {!consentStatus[participant.id] && (
                        <Button size="sm" variant="outline" onClick={() => requestConsent(participant.id)}>
                          Request Consent
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Consent Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Consent Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="require-consent">Require Participant Consent</Label>
                <Switch
                  id="require-consent"
                  checked={requireConsent}
                  onCheckedChange={setRequireConsent}
                />
              </div>
              <div className="space-y-2">
                <Label>Consent Expiry (days)</Label>
                <Input
                  type="number"
                  value={365}
                  min="1"
                  max="3650"
                  className="w-32"
                />
              </div>
              <div className="space-y-2">
                <Label>Consent Template</Label>
                <Textarea
                  placeholder="Enter consent template text..."
                  rows={4}
                  defaultValue="I consent to the recording of this educational debate session for pedagogical purposes. I understand that the recording may be used for assessment, review, and educational improvement."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {/* Recording Settings */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Recording Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Recording Type</Label>
                  <Select value={recordingType} onValueChange={(value: any) => setRecordingType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_session">Full Session</SelectItem>
                      <SelectItem value="highlights_only">Highlights Only</SelectItem>
                      <SelectItem value="audio_only">Audio Only</SelectItem>
                      <SelectItem value="transcript_only">Transcript Only</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Video Quality</Label>
                    <Select value={videoQuality} onValueChange={(value: any) => setVideoQuality(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="720p">720p HD</SelectItem>
                        <SelectItem value="1080p">1080p Full HD</SelectItem>
                        <SelectItem value="4k">4K Ultra HD</SelectItem>
                        <SelectItem value="adaptive">Adaptive Quality</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Audio Bitrate</Label>
                    <Select value={audioQuality.toString()} onValueChange={(value) => setAudioQuality(parseInt(value) as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="128">128 kbps</SelectItem>
                        <SelectItem value="256">256 kbps</SelectItem>
                        <SelectItem value="320">320 kbps</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Storage Provider</Label>
                  <Select value={storageProvider} onValueChange={(value: any) => setStorageProvider(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aws_s3">Amazon S3</SelectItem>
                      <SelectItem value="azure">Azure Storage</SelectItem>
                      <SelectItem value="google_cloud">Google Cloud Storage</SelectItem>
                      <SelectItem value="local">Local Storage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Retention Period (days)</Label>
                  <Input
                    type="number"
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(parseInt(e.target.value))}
                    min="1"
                    max="3650"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Privacy Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="anonymize">Anonymize Participants</Label>
                  <Switch
                    id="anonymize"
                    checked={anonymizeParticipants}
                    onCheckedChange={setAnonymizeParticipants}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="encrypt">Encrypt Storage</Label>
                  <Switch
                    id="encrypt"
                    checked={encryptStorage}
                    onCheckedChange={setEncryptStorage}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Compliance Standards</Label>
                  <div className="space-y-2">
                    {['FERPA', 'COPPA', 'GDPR', 'CCPA'].map((standard) => (
                      <div key={standard} className="flex items-center space-x-2">
                        <Checkbox id={standard} defaultChecked={standard === 'FERPA'} />
                        <Label htmlFor={standard}>{standard}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Data Processing Location</Label>
                  <Select defaultValue="US">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="EU">European Union</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {/* Recording History */}
          <div className="space-y-4">
            {recordingHistory.length === 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center py-8">
                    <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Recording History</h3>
                    <p className="text-muted-foreground">
                      Previous session recordings will appear here
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              recordingHistory.map((recording) => (
                <Card key={recording.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{recording.sessionTitle}</CardTitle>
                        <CardDescription>
                          {recording.startTime.toLocaleDateString()} at {recording.startTime.toLocaleTimeString()}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(recording.status)}
                        <Badge variant="outline">
                          {recording.recordingType.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-4 text-sm">
                      <div>
                        <div className="font-medium">Duration</div>
                        <div className="text-muted-foreground">{formatDuration(recording.duration)}</div>
                      </div>
                      <div>
                        <div className="font-medium">File Size</div>
                        <div className="text-muted-foreground">
                          {recording.storage.actualSize ? formatFileSize(recording.storage.actualSize) : 'Processing...'}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">Participants</div>
                        <div className="text-muted-foreground">{recording.participants.length} total</div>
                      </div>
                      <div>
                        <div className="font-medium">Transcript</div>
                        <div className="text-muted-foreground">
                          {recording.transcript.isEnabled ? 
                            `${recording.transcript.accuracy}% accuracy` : 
                            'Not available'
                          }
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>ID: {recording.id}</span>
                        <span>•</span>
                        <span>{recording.storage.provider.replace('_', ' ').toUpperCase()}</span>
                        <span>•</span>
                        <span>{recording.privacy.complianceStandards.join(', ')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm">
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          {/* Recording Templates */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recordingTemplates.map((template) => (
              <Card key={template.id} className={`cursor-pointer transition-colors ${
                selectedTemplate === template.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
              }`} onClick={() => setSelectedTemplate(template.id)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription className="mt-1">{template.description}</CardDescription>
                    </div>
                    {template.isDefault && (
                      <Badge variant="outline" className="text-xs">Default</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="capitalize">{template.recordingType.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quality:</span>
                      <span>{template.quality.videoResolution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Privacy:</span>
                      <Badge variant={template.privacy.anonymizeParticipants ? "default" : "outline"} className="text-xs">
                        {template.privacy.anonymizeParticipants ? 'Anonymous' : 'Standard'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Compliance:</span>
                      <div className="flex gap-1">
                        {template.privacy.complianceStandards.slice(0, 2).map((standard) => (
                          <Badge key={standard} variant="outline" className="text-xs">
                            {standard}
                          </Badge>
                        ))}
                        {template.privacy.complianceStandards.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.privacy.complianceStandards.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Used {template.usageCount} times</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => applyTemplate(template.id)}>
                      Apply Template
                    </Button>
                    <Button size="sm" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Recording Settings</DialogTitle>
            <DialogDescription>
              Configure recording parameters and privacy settings
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Quick Settings */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Recording Type</Label>
                <Select value={recordingType} onValueChange={(value: any) => setRecordingType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_session">Full Session</SelectItem>
                    <SelectItem value="highlights_only">Highlights Only</SelectItem>
                    <SelectItem value="audio_only">Audio Only</SelectItem>
                    <SelectItem value="transcript_only">Transcript Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Video Quality</Label>
                <Select value={videoQuality} onValueChange={(value: any) => setVideoQuality(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="720p">720p HD</SelectItem>
                    <SelectItem value="1080p">1080p Full HD</SelectItem>
                    <SelectItem value="4k">4K Ultra HD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="settings-consent">Require Participant Consent</Label>
                <Switch
                  id="settings-consent"
                  checked={requireConsent}
                  onCheckedChange={setRequireConsent}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="settings-anonymize">Anonymize Participants</Label>
                <Switch
                  id="settings-anonymize"
                  checked={anonymizeParticipants}
                  onCheckedChange={setAnonymizeParticipants}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="settings-encrypt">Encrypt Storage</Label>
                <Switch
                  id="settings-encrypt"
                  checked={encryptStorage}
                  onCheckedChange={setEncryptStorage}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowSettingsDialog(false)}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Consent Dialog */}
      <Dialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-amber-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Participant Consent Required
            </DialogTitle>
            <DialogDescription>
              Some participants have not yet consented to recording. Recording cannot begin until all participants provide consent.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              {participants.filter(p => !consentStatus[p.id]).map((participant) => (
                <div key={participant.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span>{participant.name}</span>
                  <Button size="sm" variant="outline" onClick={() => requestConsent(participant.id)}>
                    Send Request
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConsentDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
