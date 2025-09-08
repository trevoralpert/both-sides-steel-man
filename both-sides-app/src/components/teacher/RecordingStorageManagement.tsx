/**
 * Recording Storage Management Component
 * 
 * Task 8.4.3: Comprehensive storage management with retention policies,
 * optimization tools, bulk operations, and automated lifecycle management
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
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
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
  HardDrive,
  Cloud,
  Archive,
  Database,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Calendar,
  Clock,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Filter,
  Search,
  MoreHorizontal,
  Play,
  Pause,
  Square,
  Edit,
  Eye,
  Copy,
  Share2,
  Tag,
  Star,
  Flag,
  Users,
  FileText,
  Video,
  Headphones,
  Image,
  Folder,
  FolderOpen,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Activity,
  Target,
  Award,
  Lightbulb,
  Gauge,
  Wifi,
  WifiOff,
  Lock,
  Unlock,
  Globe,
  MapPin,
  Server,
  Cpu,
  MemoryStick,
  Monitor
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

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
import { Alert, AlertDescription } from '@/components/ui/alert';

// Types
interface StorageRecording {
  id: string;
  sessionTitle: string;
  recordingDate: Date;
  duration: number;
  format: 'video' | 'audio' | 'transcript';
  originalSize: number; // MB
  compressedSize: number; // MB
  compressionRatio: number; // 0-1
  quality: string;
  status: StorageStatus;
  location: StorageLocation;
  retentionPolicy: RetentionPolicy;
  accessFrequency: AccessPattern;
  lastAccessed: Date;
  createdBy: string;
  tags: string[];
  metadata: RecordingMetadata;
  lifecycle: LifecycleStage;
  backups: BackupInfo[];
}

interface StorageLocation {
  primary: StorageProvider;
  backup?: StorageProvider;
  archive?: StorageProvider;
  region: string;
  availabilityZone: string;
  redundancy: 'none' | 'local' | 'geo' | 'multi_region';
}

interface StorageProvider {
  type: 'local' | 'aws_s3' | 'azure_blob' | 'google_cloud' | 'cdn';
  name: string;
  endpoint: string;
  storageClass: 'hot' | 'warm' | 'cold' | 'archive';
  encryption: boolean;
  cost: number; // $ per GB per month
}

interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  retentionPeriod: number; // days
  autoArchive: boolean;
  archiveAfter: number; // days
  autoDelete: boolean;
  deleteAfter: number; // days
  conditions: RetentionCondition[];
  isDefault: boolean;
  priority: number;
}

interface RetentionCondition {
  field: 'accessCount' | 'lastAccessed' | 'fileSize' | 'format' | 'quality' | 'tags' | 'createdBy';
  operator: 'gt' | 'lt' | 'eq' | 'contains' | 'not_contains';
  value: string | number;
  logic: 'and' | 'or';
}

interface AccessPattern {
  totalAccesses: number;
  uniqueUsers: number;
  lastAccessed: Date;
  accessFrequency: 'frequent' | 'occasional' | 'rare' | 'never';
  accessTrend: 'increasing' | 'stable' | 'decreasing';
  averageAccessInterval: number; // days
}

interface RecordingMetadata {
  participantCount: number;
  learningObjectives: string[];
  subject: string;
  gradeLevel: string;
  educationalValue: 'high' | 'medium' | 'low';
  privateData: boolean;
  consentExpiry?: Date;
  complianceFlags: string[];
}

interface LifecycleStage {
  current: 'active' | 'transitioning' | 'archived' | 'scheduled_deletion';
  scheduledActions: ScheduledAction[];
  history: LifecycleEvent[];
}

interface ScheduledAction {
  id: string;
  action: 'compress' | 'archive' | 'delete' | 'migrate' | 'backup';
  scheduledDate: Date;
  reason: string;
  estimatedSavings: number; // MB or $
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
}

interface LifecycleEvent {
  timestamp: Date;
  action: string;
  result: 'success' | 'failure';
  details: string;
  sizeBefore?: number;
  sizeAfter?: number;
  costImpact?: number;
}

interface BackupInfo {
  id: string;
  location: StorageProvider;
  createdAt: Date;
  size: number; // MB
  integrity: 'verified' | 'pending' | 'failed';
  lastVerified: Date;
  cost: number; // $ per month
}

interface StorageUsage {
  totalSize: number; // MB
  totalCost: number; // $ per month
  byFormat: Record<string, { size: number; count: number; cost: number }>;
  byQuality: Record<string, { size: number; count: number; cost: number }>;
  byAge: Record<string, { size: number; count: number; cost: number }>;
  byAccess: Record<string, { size: number; count: number; cost: number }>;
  projectedGrowth: {
    nextMonth: number;
    nextQuarter: number;
    nextYear: number;
  };
  optimization: OptimizationOpportunity[];
}

interface OptimizationOpportunity {
  type: 'compression' | 'archival' | 'deletion' | 'migration' | 'deduplication';
  description: string;
  potentialSavings: {
    storage: number; // MB
    cost: number; // $ per month
  };
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  affectedRecordings: number;
  estimatedDuration: string;
}

interface BulkOperation {
  id: string;
  name: string;
  operation: 'compress' | 'archive' | 'delete' | 'migrate' | 'tag' | 'retention_policy';
  criteria: BulkCriteria;
  affectedCount: number;
  progress: number; // 0-100
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: Date;
  estimatedCompletion?: Date;
  results?: BulkOperationResult;
  createdBy: string;
}

interface BulkCriteria {
  dateRange?: { start: Date; end: Date };
  formats?: string[];
  qualities?: string[];
  minSize?: number;
  maxSize?: number;
  accessFrequency?: string[];
  tags?: string[];
  retentionStatus?: string[];
}

interface BulkOperationResult {
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  totalSizeBefore: number;
  totalSizeAfter: number;
  costSavings: number;
  errors: string[];
}

type StorageStatus = 'active' | 'compressing' | 'archiving' | 'archived' | 'scheduled_deletion' | 'migrating';

interface RecordingStorageManagementProps {
  organizationId?: string;
  initialView?: 'overview' | 'recordings' | 'policies' | 'operations' | 'analytics';
  onPolicyCreate?: (policy: RetentionPolicy) => void;
  onBulkOperationStart?: (operation: BulkOperation) => void;
}

export function RecordingStorageManagement({
  organizationId,
  initialView = 'overview',
  onPolicyCreate,
  onBulkOperationStart
}: RecordingStorageManagementProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState(initialView);
  const [recordings, setRecordings] = useState<StorageRecording[]>([]);
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>([]);
  const [bulkOperations, setBulkOperations] = useState<BulkOperation[]>([]);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  
  // Filters and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  
  // Selected Items for Bulk Operations
  const [selectedRecordings, setSelectedRecordings] = useState<Set<string>>(new Set());
  
  // Dialog States
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showOptimizationDialog, setShowOptimizationDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteRecordingId, setDeleteRecordingId] = useState<string | null>(null);
  
  // Policy Creation State
  const [policyName, setPolicyName] = useState('');
  const [policyDescription, setPolicyDescription] = useState('');
  const [policyRetentionDays, setPolicyRetentionDays] = useState(365);
  const [policyAutoArchive, setPolicyAutoArchive] = useState(true);
  const [policyArchiveDays, setPolicyArchiveDays] = useState(90);
  const [policyAutoDelete, setPolicyAutoDelete] = useState(false);
  const [policyDeleteDays, setPolicyDeleteDays] = useState(1095); // 3 years
  
  // Bulk Operation State
  const [bulkOperationType, setBulkOperationType] = useState<BulkOperation['operation']>('compress');
  const [bulkCriteria, setBulkCriteria] = useState<BulkCriteria>({});

  useEffect(() => {
    loadStorageData();
    loadRetentionPolicies();
    loadBulkOperations();
    calculateStorageUsage();
  }, [organizationId]);

  const loadStorageData = () => {
    // Mock storage data
    const mockRecordings: StorageRecording[] = [
      {
        id: 'rec_1',
        sessionTitle: 'Climate Change Policy Debate',
        recordingDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        duration: 3600,
        format: 'video',
        originalSize: 2800,
        compressedSize: 2200,
        compressionRatio: 0.79,
        quality: '1080p',
        status: 'active',
        location: {
          primary: { type: 'aws_s3', name: 'Primary S3', endpoint: 's3.us-east-1.amazonaws.com', storageClass: 'hot', encryption: true, cost: 0.023 },
          backup: { type: 'aws_s3', name: 'Backup S3', endpoint: 's3.us-west-2.amazonaws.com', storageClass: 'warm', encryption: true, cost: 0.0125 },
          region: 'us-east-1',
          availabilityZone: 'us-east-1a',
          redundancy: 'geo'
        },
        retentionPolicy: {
          id: 'policy_standard',
          name: 'Standard Educational Content',
          description: 'Keep for 2 years, archive after 6 months',
          retentionPeriod: 730,
          autoArchive: true,
          archiveAfter: 180,
          autoDelete: true,
          deleteAfter: 730,
          conditions: [],
          isDefault: true,
          priority: 1
        },
        accessFrequency: {
          totalAccesses: 15,
          uniqueUsers: 8,
          lastAccessed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          accessFrequency: 'occasional',
          accessTrend: 'stable',
          averageAccessInterval: 5
        },
        lastAccessed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        createdBy: user?.id || 'teacher',
        tags: ['debate', 'climate_change', 'high_value'],
        metadata: {
          participantCount: 4,
          learningObjectives: ['Critical Thinking', 'Evidence Evaluation'],
          subject: 'Environmental Science',
          gradeLevel: '9-12',
          educationalValue: 'high',
          privateData: true,
          complianceFlags: ['FERPA', 'COPPA']
        },
        lifecycle: {
          current: 'active',
          scheduledActions: [
            {
              id: 'action_1',
              action: 'archive',
              scheduledDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
              reason: 'Automatic archival per retention policy',
              estimatedSavings: 45,
              status: 'pending'
            }
          ],
          history: [
            {
              timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              action: 'created',
              result: 'success',
              details: 'Recording uploaded and processed',
              sizeBefore: 2800,
              sizeAfter: 2200,
              costImpact: -13.8
            }
          ]
        },
        backups: [
          {
            id: 'backup_1',
            location: { type: 'aws_s3', name: 'Backup S3', endpoint: 's3.us-west-2.amazonaws.com', storageClass: 'warm', encryption: true, cost: 0.0125 },
            createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
            size: 2200,
            integrity: 'verified',
            lastVerified: new Date(Date.now() - 24 * 60 * 60 * 1000),
            cost: 27.5
          }
        ]
      },
      {
        id: 'rec_2',
        sessionTitle: 'AI Ethics Discussion',
        recordingDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        duration: 2700,
        format: 'video',
        originalSize: 1900,
        compressedSize: 1520,
        compressionRatio: 0.80,
        quality: '720p',
        status: 'archived',
        location: {
          primary: { type: 'aws_s3', name: 'Archive S3', endpoint: 's3.glacier.amazonaws.com', storageClass: 'archive', encryption: true, cost: 0.004 },
          region: 'us-east-1',
          availabilityZone: 'us-east-1b',
          redundancy: 'local'
        },
        retentionPolicy: {
          id: 'policy_standard',
          name: 'Standard Educational Content',
          description: 'Keep for 2 years, archive after 6 months',
          retentionPeriod: 730,
          autoArchive: true,
          archiveAfter: 180,
          autoDelete: true,
          deleteAfter: 730,
          conditions: [],
          isDefault: true,
          priority: 1
        },
        accessFrequency: {
          totalAccesses: 3,
          uniqueUsers: 2,
          lastAccessed: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          accessFrequency: 'rare',
          accessTrend: 'decreasing',
          averageAccessInterval: 45
        },
        lastAccessed: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        createdBy: user?.id || 'teacher',
        tags: ['discussion', 'ai_ethics', 'archived'],
        metadata: {
          participantCount: 6,
          learningObjectives: ['Ethical Reasoning', 'Technology Impact'],
          subject: 'Computer Science',
          gradeLevel: '11-12',
          educationalValue: 'medium',
          privateData: true,
          complianceFlags: ['FERPA']
        },
        lifecycle: {
          current: 'archived',
          scheduledActions: [],
          history: [
            {
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              action: 'archived',
              result: 'success',
              details: 'Automatically archived due to low access frequency',
              sizeBefore: 1520,
              sizeAfter: 1520,
              costImpact: -29.64
            }
          ]
        },
        backups: []
      }
    ];

    setRecordings(mockRecordings);
  };

  const loadRetentionPolicies = () => {
    const mockPolicies: RetentionPolicy[] = [
      {
        id: 'policy_standard',
        name: 'Standard Educational Content',
        description: 'Default policy for regular educational recordings',
        retentionPeriod: 730, // 2 years
        autoArchive: true,
        archiveAfter: 180, // 6 months
        autoDelete: true,
        deleteAfter: 730,
        conditions: [],
        isDefault: true,
        priority: 1
      },
      {
        id: 'policy_high_value',
        name: 'High-Value Content',
        description: 'Extended retention for exceptional educational content',
        retentionPeriod: 1825, // 5 years
        autoArchive: true,
        archiveAfter: 365, // 1 year
        autoDelete: false,
        deleteAfter: 1825,
        conditions: [
          { field: 'tags', operator: 'contains', value: 'high_value', logic: 'or' },
          { field: 'accessCount', operator: 'gt', value: 50, logic: 'or' }
        ],
        isDefault: false,
        priority: 2
      },
      {
        id: 'policy_temp',
        name: 'Temporary Recordings',
        description: 'Short retention for practice or test sessions',
        retentionPeriod: 90, // 3 months
        autoArchive: false,
        archiveAfter: 30,
        autoDelete: true,
        deleteAfter: 90,
        conditions: [
          { field: 'tags', operator: 'contains', value: 'temporary', logic: 'or' },
          { field: 'tags', operator: 'contains', value: 'test', logic: 'or' }
        ],
        isDefault: false,
        priority: 3
      }
    ];

    setRetentionPolicies(mockPolicies);
  };

  const loadBulkOperations = () => {
    const mockOperations: BulkOperation[] = [
      {
        id: 'bulk_1',
        name: 'Monthly Archive Operation',
        operation: 'archive',
        criteria: {
          dateRange: { start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), end: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          accessFrequency: ['rare', 'never']
        },
        affectedCount: 23,
        progress: 100,
        status: 'completed',
        startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        results: {
          processed: 23,
          successful: 22,
          failed: 1,
          skipped: 0,
          totalSizeBefore: 45600,
          totalSizeAfter: 45600,
          costSavings: 456.2,
          errors: ['Failed to archive rec_x: network timeout']
        },
        createdBy: user?.id || 'system'
      }
    ];

    setBulkOperations(mockOperations);
  };

  const calculateStorageUsage = () => {
    const mockUsage: StorageUsage = {
      totalSize: 89200, // MB
      totalCost: 892.4, // $ per month
      byFormat: {
        'video': { size: 78500, count: 45, cost: 785.2 },
        'audio': { size: 8900, count: 15, cost: 89.1 },
        'transcript': { size: 1800, count: 60, cost: 18.1 }
      },
      byQuality: {
        '1080p': { size: 56200, count: 28, cost: 562.3 },
        '720p': { size: 22300, count: 17, cost: 223.1 },
        '480p': { size: 10700, count: 15, cost: 107.0 }
      },
      byAge: {
        'Recent (0-30 days)': { size: 25600, count: 12, cost: 256.4 },
        'Medium (30-180 days)': { size: 34700, count: 23, cost: 347.2 },
        'Old (180+ days)': { size: 28900, count: 25, cost: 288.8 }
      },
      byAccess: {
        'Frequent': { size: 15800, count: 8, cost: 158.2 },
        'Occasional': { size: 34200, count: 27, cost: 342.4 },
        'Rare': { size: 28600, count: 18, cost: 286.1 },
        'Never': { size: 10600, count: 7, cost: 105.7 }
      },
      projectedGrowth: {
        nextMonth: 7200,
        nextQuarter: 21600,
        nextYear: 86400
      },
      optimization: [
        {
          type: 'archival',
          description: 'Archive 18 recordings with rare access patterns',
          potentialSavings: { storage: 0, cost: 287.4 },
          effort: 'low',
          impact: 'high',
          affectedRecordings: 18,
          estimatedDuration: '2 hours'
        },
        {
          type: 'compression',
          description: 'Re-compress older videos with better algorithms',
          potentialSavings: { storage: 12600, cost: 126.3 },
          effort: 'medium',
          impact: 'medium',
          affectedRecordings: 25,
          estimatedDuration: '8 hours'
        },
        {
          type: 'deletion',
          description: 'Delete 5 recordings past retention policy',
          potentialSavings: { storage: 8900, cost: 89.2 },
          effort: 'low',
          impact: 'low',
          affectedRecordings: 5,
          estimatedDuration: '30 minutes'
        }
      ]
    };

    setStorageUsage(mockUsage);
  };

  const createRetentionPolicy = () => {
    if (!policyName.trim()) {
      addNotification({
        type: 'error',
        title: 'Missing Information',
        message: 'Please provide a policy name.',
        read: false
      });
      return;
    }

    const newPolicy: RetentionPolicy = {
      id: `policy_${Date.now()}`,
      name: policyName,
      description: policyDescription,
      retentionPeriod: policyRetentionDays,
      autoArchive: policyAutoArchive,
      archiveAfter: policyArchiveDays,
      autoDelete: policyAutoDelete,
      deleteAfter: policyDeleteDays,
      conditions: [],
      isDefault: false,
      priority: retentionPolicies.length + 1
    };

    setRetentionPolicies(prev => [...prev, newPolicy]);
    onPolicyCreate?.(newPolicy);

    // Reset form
    setPolicyName('');
    setPolicyDescription('');
    setShowPolicyDialog(false);

    addNotification({
      type: 'success',
      title: 'Policy Created',
      message: `Retention policy "${policyName}" has been created.`,
      read: false
    });
  };

  const startBulkOperation = () => {
    if (!bulkOperationType) {
      addNotification({
        type: 'error',
        title: 'Missing Information',
        message: 'Please select an operation type.',
        read: false
      });
      return;
    }

    const affectedCount = selectedRecordings.size || 
      recordings.filter(r => matchesBulkCriteria(r, bulkCriteria)).length;

    const newOperation: BulkOperation = {
      id: `bulk_${Date.now()}`,
      name: `${bulkOperationType.charAt(0).toUpperCase() + bulkOperationType.slice(1)} Operation`,
      operation: bulkOperationType,
      criteria: bulkCriteria,
      affectedCount,
      progress: 0,
      status: 'running',
      startTime: new Date(),
      estimatedCompletion: new Date(Date.now() + affectedCount * 30000), // 30 seconds per recording
      createdBy: user?.id || 'teacher'
    };

    setBulkOperations(prev => [...prev, newOperation]);
    onBulkOperationStart?.(newOperation);

    // Simulate operation progress
    simulateBulkOperation(newOperation.id);

    setShowBulkDialog(false);
    setSelectedRecordings(new Set());

    addNotification({
      type: 'success',
      title: 'Operation Started',
      message: `Bulk ${bulkOperationType} operation started for ${affectedCount} recordings.`,
      read: false
    });
  };

  const simulateBulkOperation = (operationId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5; // 5-20% progress each interval
      
      if (progress >= 100) {
        progress = 100;
        setBulkOperations(prev => prev.map(op => 
          op.id === operationId 
            ? { 
                ...op, 
                progress: 100, 
                status: 'completed',
                results: {
                  processed: op.affectedCount,
                  successful: op.affectedCount - Math.floor(Math.random() * 2),
                  failed: Math.floor(Math.random() * 2),
                  skipped: 0,
                  totalSizeBefore: op.affectedCount * 2000,
                  totalSizeAfter: op.affectedCount * 1600,
                  costSavings: op.affectedCount * 20,
                  errors: []
                }
              }
            : op
        ));
        clearInterval(interval);
      } else {
        setBulkOperations(prev => prev.map(op => 
          op.id === operationId ? { ...op, progress } : op
        ));
      }
    }, 2000);
  };

  const matchesBulkCriteria = (recording: StorageRecording, criteria: BulkCriteria): boolean => {
    if (criteria.dateRange) {
      const recordingDate = recording.recordingDate;
      if (recordingDate < criteria.dateRange.start || recordingDate > criteria.dateRange.end) {
        return false;
      }
    }

    if (criteria.formats && !criteria.formats.includes(recording.format)) {
      return false;
    }

    if (criteria.qualities && !criteria.qualities.includes(recording.quality)) {
      return false;
    }

    if (criteria.minSize && recording.compressedSize < criteria.minSize) {
      return false;
    }

    if (criteria.maxSize && recording.compressedSize > criteria.maxSize) {
      return false;
    }

    if (criteria.accessFrequency && !criteria.accessFrequency.includes(recording.accessFrequency.accessFrequency)) {
      return false;
    }

    if (criteria.tags && !criteria.tags.some(tag => recording.tags.includes(tag))) {
      return false;
    }

    return true;
  };

  const deleteRecording = (recordingId: string) => {
    setRecordings(prev => prev.filter(r => r.id !== recordingId));
    setShowDeleteDialog(false);
    setDeleteRecordingId(null);

    addNotification({
      type: 'success',
      title: 'Recording Deleted',
      message: 'Recording has been permanently deleted.',
      read: false
    });
  };

  const formatFileSize = (mb: number) => {
    if (mb < 1024) return `${Math.round(mb)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: StorageStatus) => {
    const variants = {
      'active': 'default',
      'compressing': 'secondary',
      'archiving': 'secondary',
      'archived': 'outline',
      'scheduled_deletion': 'destructive',
      'migrating': 'secondary'
    } as const;

    return <Badge variant={variants[status] || 'outline'}>{status.replace('_', ' ')}</Badge>;
  };

  const getAccessFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'frequent': return 'text-green-600';
      case 'occasional': return 'text-blue-600';
      case 'rare': return 'text-yellow-600';
      case 'never': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const filteredRecordings = recordings.filter(recording => {
    if (searchQuery && !recording.sessionTitle.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && recording.status !== statusFilter) {
      return false;
    }
    if (formatFilter !== 'all' && recording.format !== formatFilter) {
      return false;
    }
    if (locationFilter !== 'all' && recording.location.primary.type !== locationFilter) {
      return false;
    }
    return true;
  });

  if (!storageUsage) {
    return <div>Loading storage data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <HardDrive className="h-5 w-5 mr-2" />
            Recording Storage Management
          </h3>
          <p className="text-sm text-muted-foreground">
            Comprehensive storage administration and lifecycle management
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Storage Summary */}
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{formatFileSize(storageUsage.totalSize)}</div>
              <div className="text-xs text-muted-foreground">Total Storage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatCurrency(storageUsage.totalCost)}</div>
              <div className="text-xs text-muted-foreground">Monthly Cost</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{recordings.length}</div>
              <div className="text-xs text-muted-foreground">Recordings</div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => setShowPolicyDialog(true)}>
              <Settings className="h-4 w-4 mr-2" />
              New Policy
            </Button>
            <Button onClick={() => setShowBulkDialog(true)} disabled={selectedRecordings.size === 0}>
              <Zap className="h-4 w-4 mr-2" />
              Bulk Actions ({selectedRecordings.size})
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            Storage Overview
          </TabsTrigger>
          <TabsTrigger value="recordings">
            Recordings ({recordings.length})
          </TabsTrigger>
          <TabsTrigger value="policies">
            Retention Policies ({retentionPolicies.length})
          </TabsTrigger>
          <TabsTrigger value="operations">
            Bulk Operations ({bulkOperations.length})
          </TabsTrigger>
          <TabsTrigger value="analytics">
            Usage Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Storage Usage Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <HardDrive className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Storage</p>
                    <div className="text-2xl font-bold">{formatFileSize(storageUsage.totalSize)}</div>
                    <p className="text-xs text-muted-foreground">
                      +{formatFileSize(storageUsage.projectedGrowth.nextMonth)} next month
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Cloud className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Monthly Cost</p>
                    <div className="text-2xl font-bold">{formatCurrency(storageUsage.totalCost)}</div>
                    <p className="text-xs text-muted-foreground">
                      Est. {formatCurrency(storageUsage.projectedGrowth.nextMonth * 0.01)} increase
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Archive className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Archived</p>
                    <div className="text-2xl font-bold">
                      {recordings.filter(r => r.status === 'archived').length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {Math.round((recordings.filter(r => r.status === 'archived').length / recordings.length) * 100)}% of total
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingDown className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Potential Savings</p>
                    <div className="text-2xl font-bold">
                      {formatCurrency(storageUsage.optimization.reduce((sum, opt) => sum + opt.potentialSavings.cost, 0))}
                    </div>
                    <p className="text-xs text-muted-foreground">From optimization</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Storage Distribution */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Storage by Format</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(storageUsage.byFormat).map(([format, data]) => (
                    <div key={format} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {format === 'video' ? <Video className="h-4 w-4" /> :
                         format === 'audio' ? <Headphones className="h-4 w-4" /> :
                         <FileText className="h-4 w-4" />}
                        <span className="capitalize">{format}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-medium">{formatFileSize(data.size)}</div>
                          <div className="text-xs text-muted-foreground">{data.count} files</div>
                        </div>
                        <div className="w-24 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${(data.size / storageUsage.totalSize) * 100}%` }}
                          />
                        </div>
                        <div className="text-sm font-medium min-w-0">
                          {formatCurrency(data.cost)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Storage by Access Pattern</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(storageUsage.byAccess).map(([access, data]) => (
                    <div key={access} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Activity className="h-4 w-4" />
                        <span>{access}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-medium">{formatFileSize(data.size)}</div>
                          <div className="text-xs text-muted-foreground">{data.count} recordings</div>
                        </div>
                        <div className="w-24 bg-muted rounded-full h-2">
                          <div 
                            className="bg-secondary h-2 rounded-full"
                            style={{ width: `${(data.size / storageUsage.totalSize) * 100}%` }}
                          />
                        </div>
                        <div className="text-sm font-medium min-w-0">
                          {formatCurrency(data.cost)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Optimization Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="h-5 w-5 mr-2" />
                Optimization Opportunities
              </CardTitle>
              <CardDescription>
                Automated recommendations to reduce storage costs and improve efficiency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {storageUsage.optimization.map((opportunity, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{opportunity.description}</h4>
                        <div className="text-sm text-muted-foreground mt-1">
                          {opportunity.affectedRecordings} recordings • Est. {opportunity.estimatedDuration}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={
                          opportunity.impact === 'high' ? 'default' : 
                          opportunity.impact === 'medium' ? 'secondary' : 'outline'
                        }>
                          {opportunity.impact} impact
                        </Badge>
                        <Badge variant="outline">{opportunity.effort} effort</Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <strong>Savings:</strong> {formatFileSize(opportunity.potentialSavings.storage)} storage, {formatCurrency(opportunity.potentialSavings.cost)}/month
                      </div>
                      <Button size="sm">
                        <Zap className="h-4 w-4 mr-2" />
                        Apply Optimization
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recordings" className="space-y-4">
          {/* Filters and Search */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-5">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search recordings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                    <SelectItem value="scheduled_deletion">Scheduled Deletion</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={formatFilter} onValueChange={setFormatFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Formats" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Formats</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="transcript">Transcript</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="aws_s3">AWS S3</SelectItem>
                    <SelectItem value="azure_blob">Azure Blob</SelectItem>
                    <SelectItem value="google_cloud">Google Cloud</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" onClick={() => setSelectedRecordings(new Set(filteredRecordings.map(r => r.id)))}>
                    Select All
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedRecordings(new Set())}>
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recordings List */}
          <div className="space-y-4">
            {filteredRecordings.map((recording) => (
              <Card key={recording.id} className={`${selectedRecordings.has(recording.id) ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={selectedRecordings.has(recording.id)}
                        onCheckedChange={(checked) => {
                          const newSelection = new Set(selectedRecordings);
                          if (checked) {
                            newSelection.add(recording.id);
                          } else {
                            newSelection.delete(recording.id);
                          }
                          setSelectedRecordings(newSelection);
                        }}
                      />
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold">{recording.sessionTitle}</h4>
                          {getStatusBadge(recording.status)}
                          <Badge variant="outline">{recording.format.toUpperCase()}</Badge>
                          <Badge variant="outline">{recording.quality}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Created {recording.recordingDate.toLocaleDateString()} • 
                          Last accessed {recording.lastAccessed.toLocaleDateString()} • 
                          {recording.accessFrequency.totalAccesses} total accesses
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => {
                            setDeleteRecordingId(recording.id);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    {/* Storage Info */}
                    <div>
                      <h5 className="font-medium mb-2">Storage</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Size:</span>
                          <span>{formatFileSize(recording.compressedSize)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Compression:</span>
                          <span>{Math.round((1 - recording.compressionRatio) * 100)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Location:</span>
                          <span>{recording.location.primary.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cost:</span>
                          <span>{formatCurrency(recording.compressedSize * recording.location.primary.cost)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Access Pattern */}
                    <div>
                      <h5 className="font-medium mb-2">Access Pattern</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Frequency:</span>
                          <span className={getAccessFrequencyColor(recording.accessFrequency.accessFrequency)}>
                            {recording.accessFrequency.accessFrequency}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Accesses:</span>
                          <span>{recording.accessFrequency.totalAccesses}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Unique Users:</span>
                          <span>{recording.accessFrequency.uniqueUsers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Trend:</span>
                          <span className="flex items-center">
                            {recording.accessFrequency.accessTrend === 'increasing' && <TrendingUp className="h-3 w-3 text-green-600" />}
                            {recording.accessFrequency.accessTrend === 'decreasing' && <TrendingDown className="h-3 w-3 text-red-600" />}
                            {recording.accessFrequency.accessTrend}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Retention Policy */}
                    <div>
                      <h5 className="font-medium mb-2">Retention</h5>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="font-medium">{recording.retentionPolicy.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Retention:</span>
                          <span>{recording.retentionPolicy.retentionPeriod} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Auto Archive:</span>
                          <span>{recording.retentionPolicy.autoArchive ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Auto Delete:</span>
                          <span>{recording.retentionPolicy.autoDelete ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Lifecycle */}
                    <div>
                      <h5 className="font-medium mb-2">Lifecycle</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Current Stage:</span>
                          <span className="capitalize">{recording.lifecycle.current}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Scheduled Actions:</span>
                          <span>{recording.lifecycle.scheduledActions.length}</span>
                        </div>
                        {recording.lifecycle.scheduledActions.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-muted-foreground mb-1">Next Action:</div>
                            <div className="text-xs">
                              {recording.lifecycle.scheduledActions[0].action} on{' '}
                              {recording.lifecycle.scheduledActions[0].scheduledDate.toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {recording.tags.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex flex-wrap gap-1">
                        {recording.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          {/* Retention Policies */}
          <div className="space-y-4">
            {retentionPolicies.map((policy) => (
              <Card key={policy.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        {policy.name}
                        {policy.isDefault && <Badge className="ml-2">Default</Badge>}
                      </CardTitle>
                      <CardDescription>{policy.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <h5 className="font-medium mb-2">Retention Settings</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Retention Period:</span>
                          <span>{policy.retentionPeriod} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Auto Archive:</span>
                          <span>{policy.autoArchive ? `After ${policy.archiveAfter} days` : 'Disabled'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Auto Delete:</span>
                          <span>{policy.autoDelete ? `After ${policy.deleteAfter} days` : 'Disabled'}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">Conditions</h5>
                      {policy.conditions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No conditions set</p>
                      ) : (
                        <div className="space-y-1 text-sm">
                          {policy.conditions.map((condition, index) => (
                            <div key={index}>
                              {condition.field} {condition.operator} {condition.value}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">Usage</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Priority:</span>
                          <span>{policy.priority}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Applied to:</span>
                          <span>{recordings.filter(r => r.retentionPolicy.id === policy.id).length} recordings</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          {/* Bulk Operations */}
          <div className="space-y-4">
            {bulkOperations.map((operation) => (
              <Card key={operation.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{operation.name}</CardTitle>
                      <CardDescription>
                        Created {operation.startTime?.toLocaleString() || 'Pending'} by {operation.createdBy}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        operation.status === 'completed' ? 'default' :
                        operation.status === 'running' ? 'secondary' :
                        operation.status === 'failed' ? 'destructive' : 'outline'
                      }>
                        {operation.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span>{Math.round(operation.progress)}%</span>
                      </div>
                      <Progress value={operation.progress} />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <h5 className="font-medium mb-2">Operation Details</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Type:</span>
                            <span className="capitalize">{operation.operation}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Affected:</span>
                            <span>{operation.affectedCount} recordings</span>
                          </div>
                          {operation.estimatedCompletion && (
                            <div className="flex justify-between">
                              <span>Est. Completion:</span>
                              <span>{operation.estimatedCompletion.toLocaleTimeString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {operation.results && (
                        <div>
                          <h5 className="font-medium mb-2">Results</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Processed:</span>
                              <span>{operation.results.processed}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Successful:</span>
                              <span className="text-green-600">{operation.results.successful}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Failed:</span>
                              <span className="text-red-600">{operation.results.failed}</span>
                            </div>
                            {operation.results.costSavings > 0 && (
                              <div className="flex justify-between">
                                <span>Savings:</span>
                                <span className="text-green-600">{formatCurrency(operation.results.costSavings)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div>
                        <h5 className="font-medium mb-2">Criteria</h5>
                        <div className="space-y-1 text-sm">
                          {operation.criteria.dateRange && (
                            <div>Date Range: {operation.criteria.dateRange.start.toLocaleDateString()} - {operation.criteria.dateRange.end.toLocaleDateString()}</div>
                          )}
                          {operation.criteria.formats && (
                            <div>Formats: {operation.criteria.formats.join(', ')}</div>
                          )}
                          {operation.criteria.accessFrequency && (
                            <div>Access: {operation.criteria.accessFrequency.join(', ')}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* Usage Analytics */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Storage Growth Projection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Current</span>
                      <span>{formatFileSize(storageUsage.totalSize)}</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Next Month</span>
                      <span>{formatFileSize(storageUsage.totalSize + storageUsage.projectedGrowth.nextMonth)}</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Next Quarter</span>
                      <span>{formatFileSize(storageUsage.totalSize + storageUsage.projectedGrowth.nextQuarter)}</span>
                    </div>
                    <Progress value={50} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Next Year</span>
                      <span>{formatFileSize(storageUsage.totalSize + storageUsage.projectedGrowth.nextYear)}</span>
                    </div>
                    <Progress value={25} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Primary Storage</span>
                    <span className="font-medium">{formatCurrency(storageUsage.totalCost * 0.7)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Backup Storage</span>
                    <span className="font-medium">{formatCurrency(storageUsage.totalCost * 0.2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Archive Storage</span>
                    <span className="font-medium">{formatCurrency(storageUsage.totalCost * 0.05)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Transfer & API</span>
                    <span className="font-medium">{formatCurrency(storageUsage.totalCost * 0.05)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(storageUsage.totalCost)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Storage by Age */}
          <Card>
            <CardHeader>
              <CardTitle>Storage Distribution by Age</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(storageUsage.byAge).map(([age, data]) => (
                  <div key={age} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{age}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-medium">{formatFileSize(data.size)}</div>
                        <div className="text-xs text-muted-foreground">{data.count} recordings</div>
                      </div>
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${(data.size / storageUsage.totalSize) * 100}%` }}
                        />
                      </div>
                      <div className="text-sm font-medium min-w-0">
                        {Math.round((data.size / storageUsage.totalSize) * 100)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Policy Dialog */}
      <Dialog open={showPolicyDialog} onOpenChange={setShowPolicyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Retention Policy</DialogTitle>
            <DialogDescription>
              Define automated rules for storage lifecycle management
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Policy Name</Label>
              <Input
                placeholder="Enter policy name"
                value={policyName}
                onChange={(e) => setPolicyName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe when and how this policy should be applied"
                value={policyDescription}
                onChange={(e) => setPolicyDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Retention Period (days)</Label>
              <Input
                type="number"
                value={policyRetentionDays}
                onChange={(e) => setPolicyRetentionDays(parseInt(e.target.value) || 365)}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Auto Archive</Label>
                <Switch
                  checked={policyAutoArchive}
                  onCheckedChange={setPolicyAutoArchive}
                />
              </div>
              
              {policyAutoArchive && (
                <div className="space-y-2">
                  <Label>Archive After (days)</Label>
                  <Input
                    type="number"
                    value={policyArchiveDays}
                    onChange={(e) => setPolicyArchiveDays(parseInt(e.target.value) || 90)}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Auto Delete</Label>
                <Switch
                  checked={policyAutoDelete}
                  onCheckedChange={setPolicyAutoDelete}
                />
              </div>
              
              {policyAutoDelete && (
                <div className="space-y-2">
                  <Label>Delete After (days)</Label>
                  <Input
                    type="number"
                    value={policyDeleteDays}
                    onChange={(e) => setPolicyDeleteDays(parseInt(e.target.value) || 1095)}
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPolicyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createRetentionPolicy} disabled={!policyName.trim()}>
              <Settings className="h-4 w-4 mr-2" />
              Create Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Operation Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Operation</DialogTitle>
            <DialogDescription>
              Perform actions on multiple recordings ({selectedRecordings.size} selected)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Operation Type</Label>
              <Select value={bulkOperationType} onValueChange={(value: any) => setBulkOperationType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compress">Compress</SelectItem>
                  <SelectItem value="archive">Archive</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="migrate">Migrate</SelectItem>
                  <SelectItem value="tag">Add Tags</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-1">Selected Recordings</div>
              <div className="text-sm text-muted-foreground">
                {selectedRecordings.size} recordings selected for {bulkOperationType} operation
              </div>
            </div>

            {bulkOperationType === 'delete' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This operation cannot be undone. Selected recordings will be permanently deleted.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={startBulkOperation} disabled={selectedRecordings.size === 0}>
              <Zap className="h-4 w-4 mr-2" />
              Start Operation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recording</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The recording will be permanently deleted from all storage locations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteRecordingId && deleteRecording(deleteRecordingId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Recording
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
