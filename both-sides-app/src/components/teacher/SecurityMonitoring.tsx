/**
 * Security Monitoring Component
 * 
 * Task 8.5.2: Comprehensive security monitoring with failed login tracking,
 * unusual activity pattern detection, and compliance reporting
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';

import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
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
  Shield,
  AlertTriangle,
  Ban,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Key,
  Globe,
  MapPin,
  Clock,
  User,
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart,
  PieChart,
  Target,
  Flag,
  Warning,
  CheckCircle2,
  XCircle,
  Info,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Settings,
  Bell,
  BellOff,
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Calendar,
  Server,
  Database,
  Wifi,
  Smartphone,
  Monitor,
  Tablet,
  Laptop,
  Router,
  Fingerprint,
  ShieldCheck,
  ShieldX,
  AlertCircle,
  Zap,
  Mail,
  Phone
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: SecuritySeverity;
  source: SecuritySource;
  description: string;
  details: SecurityEventDetails;
  user?: SecurityUser;
  location: SecurityLocation;
  device: SecurityDevice;
  outcome: 'blocked' | 'flagged' | 'allowed' | 'investigated';
  investigation: SecurityInvestigation;
  correlationId?: string;
  tags: string[];
}

type SecurityEventType = 
  | 'failed_login' | 'successful_login' | 'password_reset' | 'account_locked' 
  | 'suspicious_activity' | 'data_access' | 'privilege_escalation' | 'brute_force'
  | 'malware_detected' | 'phishing_attempt' | 'ddos_attack' | 'sql_injection'
  | 'xss_attempt' | 'csrf_attack' | 'unauthorized_api_access' | 'data_exfiltration'
  | 'account_takeover' | 'insider_threat' | 'compliance_violation';

type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

type SecuritySource = 'web_app' | 'mobile_app' | 'api' | 'admin_panel' | 'system' | 'external';

interface SecurityEventDetails {
  attemptCount?: number;
  timeWindow?: number; // minutes
  affectedResources: string[];
  attackVector?: string;
  payloadSize?: number;
  errorCodes: number[];
  signatures: string[];
  mitigationActions: string[];
  falsePositive?: boolean;
  riskScore: number; // 0-100
}

interface SecurityUser {
  id: string;
  email: string;
  name: string;
  role: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastLogin: Date;
  loginHistory: LoginAttempt[];
  anomalyScore: number; // 0-100
}

interface LoginAttempt {
  timestamp: Date;
  success: boolean;
  ipAddress: string;
  userAgent: string;
  location: SecurityLocation;
  mfaUsed: boolean;
  sessionDuration?: number; // minutes
}

interface SecurityLocation {
  ipAddress: string;
  country: string;
  region: string;
  city: string;
  isp: string;
  vpnDetected: boolean;
  torDetected: boolean;
  proxyDetected: boolean;
  riskLevel: SecuritySeverity;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface SecurityDevice {
  id: string;
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  os: string;
  browser: string;
  userAgent: string;
  fingerprint: string;
  trusted: boolean;
  firstSeen: Date;
  lastSeen: Date;
  riskScore: number; // 0-100
}

interface SecurityInvestigation {
  status: 'open' | 'in_progress' | 'resolved' | 'false_positive' | 'escalated';
  assignedTo?: string;
  notes: string[];
  evidence: SecurityEvidence[];
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

interface SecurityEvidence {
  type: 'log' | 'screenshot' | 'network_trace' | 'file' | 'metadata';
  description: string;
  data: Record<string, any>;
  timestamp: Date;
  integrity: 'verified' | 'unverified' | 'tampered';
}

interface ThreatIntelligence {
  ipReputations: IPReputation[];
  domainReputations: DomainReputation[];
  malwareSignatures: MalwareSignature[];
  vulnerabilities: SecurityVulnerability[];
  attackPatterns: AttackPattern[];
  lastUpdate: Date;
}

interface IPReputation {
  ip: string;
  reputation: 'good' | 'suspicious' | 'malicious';
  categories: string[];
  firstSeen: Date;
  lastSeen: Date;
  sources: string[];
  confidence: number; // 0-100
}

interface DomainReputation {
  domain: string;
  reputation: 'good' | 'suspicious' | 'malicious';
  categories: string[];
  registrar: string;
  createdDate: Date;
  expiryDate: Date;
  sources: string[];
  confidence: number; // 0-100
}

interface MalwareSignature {
  id: string;
  name: string;
  type: 'virus' | 'trojan' | 'worm' | 'ransomware' | 'spyware';
  signature: string;
  severity: SecuritySeverity;
  detectionRate: number; // percentage
  lastUpdate: Date;
}

interface SecurityVulnerability {
  cve: string;
  title: string;
  description: string;
  severity: SecuritySeverity;
  cvssScore: number;
  affectedSystems: string[];
  patchAvailable: boolean;
  exploitAvailable: boolean;
  publishedDate: Date;
  lastModified: Date;
}

interface AttackPattern {
  id: string;
  name: string;
  description: string;
  tactics: string[];
  techniques: string[];
  indicators: string[];
  countermeasures: string[];
  prevalence: 'low' | 'medium' | 'high';
  sophistication: 'low' | 'medium' | 'high';
}

interface ComplianceReport {
  framework: ComplianceFramework;
  period: DateRange;
  status: 'compliant' | 'non_compliant' | 'partial';
  score: number; // 0-100
  requirements: ComplianceRequirement[];
  violations: ComplianceViolation[];
  recommendations: string[];
  generatedAt: Date;
  nextReview: Date;
}

type ComplianceFramework = 'FERPA' | 'COPPA' | 'GDPR' | 'CCPA' | 'SOC2' | 'ISO27001' | 'NIST';

interface DateRange {
  start: Date;
  end: Date;
}

interface ComplianceRequirement {
  id: string;
  title: string;
  description: string;
  status: 'met' | 'not_met' | 'partial' | 'not_applicable';
  evidence: string[];
  lastAssessed: Date;
  dueDate?: Date;
}

interface ComplianceViolation {
  id: string;
  requirement: string;
  description: string;
  severity: SecuritySeverity;
  detectedAt: Date;
  resolvedAt?: Date;
  impact: string;
  remediation: string[];
  responsible: string;
}

interface SecurityMetrics {
  overview: SecurityOverview;
  authentication: AuthenticationMetrics;
  threats: ThreatMetrics;
  compliance: ComplianceMetrics;
  incidents: IncidentMetrics;
}

interface SecurityOverview {
  riskLevel: SecuritySeverity;
  securityScore: number; // 0-100
  activeThreats: number;
  blockedAttempts: number;
  falsePositives: number;
  coverage: number; // percentage
}

interface AuthenticationMetrics {
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  failureRate: number; // percentage
  mfaAdoption: number; // percentage
  accountLockouts: number;
  passwordResets: number;
  suspiciousLogins: number;
}

interface ThreatMetrics {
  totalThreats: number;
  blockedThreats: number;
  activeInvestigations: number;
  meanTimeToDetection: number; // minutes
  meanTimeToResponse: number; // minutes
  falsePositiveRate: number; // percentage
  threatsByType: Array<{ type: string; count: number }>;
  threatsBySeverity: Array<{ severity: string; count: number }>;
}

interface ComplianceMetrics {
  overallScore: number; // 0-100
  frameworkScores: Array<{ framework: string; score: number }>;
  violations: number;
  resolvedViolations: number;
  pendingRemediation: number;
  nextAudit: Date;
}

interface IncidentMetrics {
  totalIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  averageResolutionTime: number; // hours
  escalatedIncidents: number;
  incidentsByCategory: Array<{ category: string; count: number }>;
}

interface SecurityFilter {
  dateRange: DateRange;
  eventTypes: SecurityEventType[];
  severities: SecuritySeverity[];
  sources: SecuritySource[];
  outcomes: string[];
  ipAddresses: string[];
  users: string[];
  searchQuery: string;
}

interface SecurityMonitoringProps {
  organizationId?: string;
  refreshInterval?: number;
  canInvestigate?: boolean;
  canManagePolicies?: boolean;
}

export function SecurityMonitoring({
  organizationId,
  refreshInterval = 30000,
  canInvestigate = false,
  canManagePolicies = false
}: SecurityMonitoringProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [threatIntelligence, setThreatIntelligence] = useState<ThreatIntelligence | null>(null);
  const [complianceReports, setComplianceReports] = useState<ComplianceReport[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  
  // Filters
  const [filters, setFilters] = useState<SecurityFilter>({
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    },
    eventTypes: [],
    severities: [],
    sources: [],
    outcomes: [],
    ipAddresses: [],
    users: [],
    searchQuery: ''
  });
  
  // Dialog states
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showInvestigationDialog, setShowInvestigationDialog] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSecurityData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
    
    return () => stopAutoRefresh();
  }, [autoRefresh, refreshInterval]);

  const loadSecurityData = async () => {
    setIsLoading(true);
    
    // Mock security events
    const mockEvents: SecurityEvent[] = [
      {
        id: 'security_1',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        type: 'failed_login',
        severity: 'high',
        source: 'web_app',
        description: 'Multiple failed login attempts from suspicious IP',
        details: {
          attemptCount: 15,
          timeWindow: 10,
          affectedResources: ['login_endpoint'],
          attackVector: 'brute_force',
          errorCodes: [401],
          signatures: ['rapid_login_attempts'],
          mitigationActions: ['ip_blocked', 'rate_limited'],
          riskScore: 85
        },
        user: {
          id: 'user_123',
          email: 'admin@school.edu',
          name: 'System Admin',
          role: 'admin',
          riskLevel: 'low',
          lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000),
          loginHistory: [],
          anomalyScore: 15
        },
        location: {
          ipAddress: '203.0.113.45',
          country: 'Russia',
          region: 'Moscow',
          city: 'Moscow',
          isp: 'Unknown ISP',
          vpnDetected: true,
          torDetected: false,
          proxyDetected: true,
          riskLevel: 'high',
          coordinates: { latitude: 55.7558, longitude: 37.6176 }
        },
        device: {
          id: 'device_suspicious',
          type: 'desktop',
          os: 'Linux',
          browser: 'Firefox',
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
          fingerprint: 'suspicious_device_fingerprint',
          trusted: false,
          firstSeen: new Date(Date.now() - 15 * 60 * 1000),
          lastSeen: new Date(Date.now() - 15 * 60 * 1000),
          riskScore: 90
        },
        outcome: 'blocked',
        investigation: {
          status: 'open',
          notes: ['Automated detection triggered', 'IP added to blocklist'],
          evidence: [],
          createdAt: new Date(Date.now() - 15 * 60 * 1000),
          updatedAt: new Date(Date.now() - 15 * 60 * 1000)
        },
        tags: ['brute_force', 'suspicious_ip', 'blocked']
      },
      {
        id: 'security_2',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        type: 'successful_login',
        severity: 'medium',
        source: 'web_app',
        description: 'Login from new location',
        details: {
          affectedResources: ['user_session'],
          riskScore: 35
        },
        user: {
          id: 'user_456',
          email: 'teacher@school.edu',
          name: 'Jane Smith',
          role: 'teacher',
          riskLevel: 'low',
          lastLogin: new Date(Date.now() - 45 * 60 * 1000),
          loginHistory: [],
          anomalyScore: 25
        },
        location: {
          ipAddress: '192.168.1.100',
          country: 'United States',
          region: 'California',
          city: 'San Francisco',
          isp: 'Comcast',
          vpnDetected: false,
          torDetected: false,
          proxyDetected: false,
          riskLevel: 'low'
        },
        device: {
          id: 'device_known',
          type: 'mobile',
          os: 'iOS 17.0',
          browser: 'Safari',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          fingerprint: 'known_device_fingerprint',
          trusted: true,
          firstSeen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lastSeen: new Date(Date.now() - 45 * 60 * 1000),
          riskScore: 15
        },
        outcome: 'flagged',
        investigation: {
          status: 'resolved',
          notes: ['User confirmed legitimate login'],
          evidence: [],
          resolution: 'Legitimate access from mobile device',
          createdAt: new Date(Date.now() - 45 * 60 * 1000),
          updatedAt: new Date(Date.now() - 30 * 60 * 1000),
          resolvedAt: new Date(Date.now() - 30 * 60 * 1000)
        },
        tags: ['new_location', 'mobile', 'resolved']
      },
      {
        id: 'security_3',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        type: 'suspicious_activity',
        severity: 'critical',
        source: 'api',
        description: 'Potential data exfiltration attempt detected',
        details: {
          affectedResources: ['student_data', 'analytics_api'],
          attackVector: 'data_enumeration',
          payloadSize: 15728640, // 15MB
          errorCodes: [200, 403],
          signatures: ['bulk_data_access', 'unusual_query_patterns'],
          mitigationActions: ['access_revoked', 'investigation_opened'],
          riskScore: 95
        },
        user: {
          id: 'user_789',
          email: 'suspicious@external.com',
          name: 'Unknown User',
          role: 'guest',
          riskLevel: 'critical',
          lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000),
          loginHistory: [],
          anomalyScore: 95
        },
        location: {
          ipAddress: '198.51.100.42',
          country: 'Unknown',
          region: 'Unknown',
          city: 'Unknown',
          isp: 'Tor Network',
          vpnDetected: false,
          torDetected: true,
          proxyDetected: false,
          riskLevel: 'critical'
        },
        device: {
          id: 'device_unknown',
          type: 'unknown',
          os: 'Unknown',
          browser: 'Unknown',
          userAgent: 'Automated/Bot',
          fingerprint: 'unknown_fingerprint',
          trusted: false,
          firstSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
          lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
          riskScore: 100
        },
        outcome: 'investigated',
        investigation: {
          status: 'in_progress',
          assignedTo: 'security_team',
          notes: [
            'Automated detection triggered for bulk data access',
            'User account suspended pending investigation',
            'Forensic analysis initiated'
          ],
          evidence: [
            {
              type: 'log',
              description: 'API access logs showing bulk data requests',
              data: { requests: 1500, timespan: '30 minutes' },
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
              integrity: 'verified'
            }
          ],
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 30 * 60 * 1000)
        },
        tags: ['data_exfiltration', 'tor', 'critical', 'investigating']
      }
    ];

    // Mock security metrics
    const mockMetrics: SecurityMetrics = {
      overview: {
        riskLevel: 'medium',
        securityScore: 78,
        activeThreats: 3,
        blockedAttempts: 156,
        falsePositives: 12,
        coverage: 92
      },
      authentication: {
        totalLogins: 1247,
        successfulLogins: 1189,
        failedLogins: 58,
        failureRate: 4.6,
        mfaAdoption: 87.3,
        accountLockouts: 5,
        passwordResets: 23,
        suspiciousLogins: 8
      },
      threats: {
        totalThreats: 45,
        blockedThreats: 42,
        activeInvestigations: 3,
        meanTimeToDetection: 12.5,
        meanTimeToResponse: 28.7,
        falsePositiveRate: 8.2,
        threatsByType: [
          { type: 'failed_login', count: 28 },
          { type: 'suspicious_activity', count: 12 },
          { type: 'brute_force', count: 5 }
        ],
        threatsBySeverity: [
          { severity: 'critical', count: 3 },
          { severity: 'high', count: 8 },
          { severity: 'medium', count: 15 },
          { severity: 'low', count: 19 }
        ]
      },
      compliance: {
        overallScore: 94.5,
        frameworkScores: [
          { framework: 'FERPA', score: 97.2 },
          { framework: 'COPPA', score: 91.8 },
          { framework: 'SOC2', score: 94.6 }
        ],
        violations: 2,
        resolvedViolations: 18,
        pendingRemediation: 1,
        nextAudit: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      },
      incidents: {
        totalIncidents: 23,
        openIncidents: 3,
        resolvedIncidents: 20,
        averageResolutionTime: 4.5,
        escalatedIncidents: 2,
        incidentsByCategory: [
          { category: 'Authentication', count: 12 },
          { category: 'Data Access', count: 6 },
          { category: 'System', count: 5 }
        ]
      }
    };

    // Mock compliance reports
    const mockReports: ComplianceReport[] = [
      {
        framework: 'FERPA',
        period: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        },
        status: 'compliant',
        score: 97.2,
        requirements: [],
        violations: [],
        recommendations: [
          'Implement additional data encryption for student records',
          'Enhance access logging for educational records'
        ],
        generatedAt: new Date(),
        nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      }
    ];

    setSecurityEvents(mockEvents);
    setSecurityMetrics(mockMetrics);
    setComplianceReports(mockReports);
    setIsLoading(false);
  };

  const startAutoRefresh = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      loadSecurityData();
    }, refreshInterval);
  };

  const stopAutoRefresh = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const getSeverityBadge = (severity: SecuritySeverity) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-500">High</Badge>;
      case 'medium': return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'low': return <Badge variant="outline">Low</Badge>;
      default: return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getSeverityIcon = (severity: SecuritySeverity) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <Warning className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Info className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventTypeIcon = (type: SecurityEventType) => {
    switch (type) {
      case 'failed_login': return <Lock className="h-4 w-4" />;
      case 'successful_login': return <Unlock className="h-4 w-4" />;
      case 'suspicious_activity': return <Eye className="h-4 w-4" />;
      case 'brute_force': return <Ban className="h-4 w-4" />;
      case 'data_exfiltration': return <Database className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'blocked': return <Badge variant="destructive">Blocked</Badge>;
      case 'flagged': return <Badge className="bg-yellow-500">Flagged</Badge>;
      case 'allowed': return <Badge className="bg-green-500">Allowed</Badge>;
      case 'investigated': return <Badge className="bg-blue-500">Investigating</Badge>;
      default: return <Badge variant="outline">{outcome}</Badge>;
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'desktop': return <Monitor className="h-4 w-4" />;
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      case 'laptop': return <Laptop className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const filteredEvents = securityEvents.filter(event => {
    // Apply filters
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      if (!event.description.toLowerCase().includes(query) &&
          !event.user?.email.toLowerCase().includes(query) &&
          !event.location.ipAddress.includes(query)) {
        return false;
      }
    }
    
    if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(event.type)) {
      return false;
    }
    
    if (filters.severities.length > 0 && !filters.severities.includes(event.severity)) {
      return false;
    }
    
    if (filters.sources.length > 0 && !filters.sources.includes(event.source)) {
      return false;
    }
    
    if (filters.outcomes.length > 0 && !filters.outcomes.includes(event.outcome)) {
      return false;
    }
    
    return true;
  });

  // Mock chart data
  const threatTrendData = [
    { date: '2024-01-15', threats: 23, blocked: 21 },
    { date: '2024-01-16', threats: 18, blocked: 17 },
    { date: '2024-01-17', threats: 34, blocked: 31 },
    { date: '2024-01-18', threats: 28, blocked: 26 },
    { date: '2024-01-19', threats: 15, blocked: 15 },
    { date: '2024-01-20', threats: 42, blocked: 38 },
    { date: '2024-01-21', threats: 31, blocked: 29 }
  ];

  const COLORS = ['#ef4444', '#f59e0b', '#eab308', '#22c55e'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Security Monitoring
          </h3>
          <p className="text-sm text-muted-foreground">
            Threat detection, compliance monitoring, and security analytics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Security Status */}
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                {securityMetrics && getSeverityIcon(securityMetrics.overview.riskLevel)}
              </div>
              <div className="text-xs text-muted-foreground">Risk Level</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {securityMetrics?.overview.securityScore}
              </div>
              <div className="text-xs text-muted-foreground">Security Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {securityMetrics?.overview.activeThreats}
              </div>
              <div className="text-xs text-muted-foreground">Active Threats</div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="autoRefresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="autoRefresh" className="text-xs">Auto-refresh</Label>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadSecurityData()}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Security Overview</TabsTrigger>
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="threats">Threat Intelligence</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Security Score Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Security Score</p>
                    <p className="text-2xl font-bold">{securityMetrics?.overview.securityScore}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Ban className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Blocked Attempts</p>
                    <p className="text-2xl font-bold">{securityMetrics?.overview.blockedAttempts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Active Threats</p>
                    <p className="text-2xl font-bold">{securityMetrics?.overview.activeThreats}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Coverage</p>
                    <p className="text-2xl font-bold">{securityMetrics?.overview.coverage}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Authentication Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="h-5 w-5 mr-2" />
                Authentication Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h5 className="font-medium mb-4">Login Statistics</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Success Rate:</span>
                      <span className="font-medium text-green-600">
                        {((securityMetrics?.authentication.successfulLogins || 0) / (securityMetrics?.authentication.totalLogins || 1) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Failed Logins:</span>
                      <span className="font-medium">{securityMetrics?.authentication.failedLogins}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Account Lockouts:</span>
                      <span className="font-medium text-orange-600">{securityMetrics?.authentication.accountLockouts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Password Resets:</span>
                      <span className="font-medium">{securityMetrics?.authentication.passwordResets}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium mb-4">Security Posture</h5>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>MFA Adoption:</span>
                        <span>{securityMetrics?.authentication.mfaAdoption.toFixed(1)}%</span>
                      </div>
                      <Progress value={securityMetrics?.authentication.mfaAdoption} className="h-2" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Suspicious Logins:</span>
                      <span className="font-medium text-red-600">{securityMetrics?.authentication.suspiciousLogins}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Threat Analytics */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Threat Trends (7 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsLineChart data={threatTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
                    <YAxis />
                    <Tooltip labelFormatter={(date) => new Date(date).toLocaleDateString()} />
                    <Legend />
                    <Line type="monotone" dataKey="threats" stroke="#ef4444" name="Threats Detected" />
                    <Line type="monotone" dataKey="blocked" stroke="#22c55e" name="Threats Blocked" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Threats by Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={securityMetrics?.threats.threatsBySeverity}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="count"
                      nameKey="severity"
                      label
                    >
                      {securityMetrics?.threats.threatsBySeverity.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Response Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Incident Response Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {securityMetrics?.threats.meanTimeToDetection.toFixed(1)}m
                  </div>
                  <p className="text-sm text-muted-foreground">Mean Time to Detection</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {securityMetrics?.threats.meanTimeToResponse.toFixed(1)}m
                  </div>
                  <p className="text-sm text-muted-foreground">Mean Time to Response</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {securityMetrics?.incidents.averageResolutionTime.toFixed(1)}h
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Resolution Time</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {securityMetrics?.threats.falsePositiveRate.toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">False Positive Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events by description, user, or IP address..."
                    value={filters.searchQuery}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                    className="pl-8"
                  />
                </div>
                
                <div className="grid gap-4 md:grid-cols-5">
                  <Select value={filters.severities.join(',') || 'all'} onValueChange={(value) => {
                    if (value === 'all') {
                      setFilters(prev => ({ ...prev, severities: [] }));
                    } else {
                      setFilters(prev => ({ ...prev, severities: [value as SecuritySeverity] }));
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Severities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filters.eventTypes.join(',') || 'all'} onValueChange={(value) => {
                    if (value === 'all') {
                      setFilters(prev => ({ ...prev, eventTypes: [] }));
                    } else {
                      setFilters(prev => ({ ...prev, eventTypes: [value as SecurityEventType] }));
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Event Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Event Types</SelectItem>
                      <SelectItem value="failed_login">Failed Login</SelectItem>
                      <SelectItem value="successful_login">Successful Login</SelectItem>
                      <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
                      <SelectItem value="brute_force">Brute Force</SelectItem>
                      <SelectItem value="data_exfiltration">Data Exfiltration</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filters.sources.join(',') || 'all'} onValueChange={(value) => {
                    if (value === 'all') {
                      setFilters(prev => ({ ...prev, sources: [] }));
                    } else {
                      setFilters(prev => ({ ...prev, sources: [value as SecuritySource] }));
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="web_app">Web App</SelectItem>
                      <SelectItem value="mobile_app">Mobile App</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                      <SelectItem value="admin_panel">Admin Panel</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filters.outcomes.join(',') || 'all'} onValueChange={(value) => {
                    if (value === 'all') {
                      setFilters(prev => ({ ...prev, outcomes: [] }));
                    } else {
                      setFilters(prev => ({ ...prev, outcomes: [value] }));
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Outcomes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Outcomes</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                      <SelectItem value="flagged">Flagged</SelectItem>
                      <SelectItem value="allowed">Allowed</SelectItem>
                      <SelectItem value="investigated">Investigating</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" onClick={() => setFilters({
                    dateRange: { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
                    eventTypes: [], severities: [], sources: [], outcomes: [],
                    ipAddresses: [], users: [], searchQuery: ''
                  })}>
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Events List */}
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <Card 
                key={event.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  event.severity === 'critical' ? 'border-red-300 bg-red-50' :
                  event.severity === 'high' ? 'border-orange-300 bg-orange-50' : ''
                }`}
                onClick={() => {
                  setSelectedEvent(event);
                  setShowEventDialog(true);
                }}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {getEventTypeIcon(event.type)}
                        {getSeverityIcon(event.severity)}
                      </div>
                      <div>
                        <h5 className="font-medium">{event.description}</h5>
                        <div className="flex items-center space-x-2 mt-1">
                          {getSeverityBadge(event.severity)}
                          {getOutcomeBadge(event.outcome)}
                          <Badge variant="outline" className="capitalize">{event.type.replace('_', ' ')}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimeAgo(event.timestamp)}
                    </div>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-3 text-sm">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">User:</span>
                      </div>
                      <div>{event.user?.name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{event.user?.email}</div>
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Location:</span>
                      </div>
                      <div>{event.location.ipAddress}</div>
                      <div className="text-xs text-muted-foreground">
                        {event.location.city}, {event.location.country}
                        {event.location.vpnDetected && ' (VPN)'}
                        {event.location.torDetected && ' (Tor)'}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        {getDeviceIcon(event.device.type)}
                        <span className="text-muted-foreground">Device:</span>
                      </div>
                      <div className="capitalize">{event.device.type}</div>
                      <div className="text-xs text-muted-foreground">
                        {event.device.os} • {event.device.browser}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        Risk: {event.details.riskScore}/100
                      </Badge>
                      <Badge variant={event.device.trusted ? 'outline' : 'destructive'} className="text-xs">
                        {event.device.trusted ? 'Trusted Device' : 'Unknown Device'}
                      </Badge>
                    </div>
                    
                    {event.tags.length > 0 && (
                      <div className="flex space-x-1">
                        {event.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {event.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            +{event.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredEvents.length === 0 && !isLoading && (
              <Card>
                <CardContent className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No security events found matching your filters</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="threats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Threat Intelligence
              </CardTitle>
              <CardDescription>
                Real-time threat detection and intelligence analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Threat intelligence dashboard would be implemented here</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Features: IP reputation, malware signatures, attack patterns, IOCs
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          {/* Compliance Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShieldCheck className="h-5 w-5 mr-2" />
                Compliance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h5 className="font-medium mb-4">Overall Compliance Score</h5>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600 mb-2">
                      {securityMetrics?.compliance.overallScore.toFixed(1)}%
                    </div>
                    <Progress value={securityMetrics?.compliance.overallScore} className="h-3" />
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium mb-4">Framework Scores</h5>
                  <div className="space-y-3">
                    {securityMetrics?.compliance.frameworkScores.map((framework) => (
                      <div key={framework.framework}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{framework.framework}:</span>
                          <span className="font-medium">{framework.score.toFixed(1)}%</span>
                        </div>
                        <Progress value={framework.score} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-4 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{securityMetrics?.compliance.violations}</div>
                  <p className="text-sm text-muted-foreground">Active Violations</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{securityMetrics?.compliance.resolvedViolations}</div>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{securityMetrics?.compliance.pendingRemediation}</div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">Next Audit:</div>
                  <p className="text-xs text-muted-foreground">{securityMetrics?.compliance.nextAudit.toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Compliance Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {complianceReports.map((report) => (
                <div key={report.framework} className="border rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h5 className="font-semibold">{report.framework} Compliance Report</h5>
                      <p className="text-sm text-muted-foreground">
                        {report.period.start.toLocaleDateString()} - {report.period.end.toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={
                      report.status === 'compliant' ? 'bg-green-500' :
                      report.status === 'non_compliant' ? 'bg-red-500' : 'bg-yellow-500'
                    }>
                      {report.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Compliance Score:</span>
                        <span className="font-medium">{report.score.toFixed(1)}%</span>
                      </div>
                      <Progress value={report.score} className="h-2" />
                    </div>
                    
                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span>Generated:</span>
                        <span>{report.generatedAt.toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Next Review:</span>
                        <span>{report.nextReview.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {report.recommendations.length > 0 && (
                    <div className="mt-4">
                      <h6 className="font-medium mb-2">Recommendations:</h6>
                      <ul className="text-sm space-y-1">
                        {report.recommendations.slice(0, 3).map((rec, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0"></span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Event Details Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Security Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Event Information</Label>
                  <div className="border rounded-lg p-3 space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      {getEventTypeIcon(selectedEvent.type)}
                      <span className="font-medium capitalize">{selectedEvent.type.replace('_', ' ')}</span>
                      {getSeverityBadge(selectedEvent.severity)}
                    </div>
                    <p className="text-sm">{selectedEvent.description}</p>
                    <div className="text-xs text-muted-foreground">
                      {selectedEvent.timestamp.toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label>User & Device</Label>
                  <div className="border rounded-lg p-3 space-y-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span>User:</span>
                      <span>{selectedEvent.user?.name || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Email:</span>
                      <span>{selectedEvent.user?.email}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Device:</span>
                      <span className="capitalize">{selectedEvent.device.type}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Trusted:</span>
                      <Badge variant={selectedEvent.device.trusted ? 'outline' : 'destructive'} className="text-xs">
                        {selectedEvent.device.trusted ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Location Details</Label>
                  <div className="border rounded-lg p-3 space-y-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span>IP Address:</span>
                      <span className="font-mono">{selectedEvent.location.ipAddress}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Location:</span>
                      <span>{selectedEvent.location.city}, {selectedEvent.location.country}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>ISP:</span>
                      <span>{selectedEvent.location.isp}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedEvent.location.vpnDetected && <Badge variant="outline" className="text-xs">VPN</Badge>}
                      {selectedEvent.location.torDetected && <Badge variant="destructive" className="text-xs">Tor</Badge>}
                      {selectedEvent.location.proxyDetected && <Badge variant="outline" className="text-xs">Proxy</Badge>}
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label>Risk Assessment</Label>
                  <div className="border rounded-lg p-3 space-y-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span>Risk Score:</span>
                      <span className="font-medium">{selectedEvent.details.riskScore}/100</span>
                    </div>
                    <Progress value={selectedEvent.details.riskScore} className="h-2" />
                    <div className="flex justify-between text-sm">
                      <span>User Risk:</span>
                      <Badge variant="outline" className="text-xs">
                        {selectedEvent.user?.riskLevel}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Location Risk:</span>
                      <Badge variant="outline" className="text-xs">
                        {selectedEvent.location.riskLevel}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label>Investigation Status</Label>
                <div className="border rounded-lg p-3 mt-2">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline">{selectedEvent.investigation.status.replace('_', ' ')}</Badge>
                    <div className="text-sm text-muted-foreground">
                      Created: {selectedEvent.investigation.createdAt.toLocaleString()}
                    </div>
                  </div>
                  
                  {selectedEvent.investigation.notes.length > 0 && (
                    <div>
                      <h6 className="font-medium mb-2">Investigation Notes:</h6>
                      <ul className="text-sm space-y-1">
                        {selectedEvent.investigation.notes.map((note, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0"></span>
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {selectedEvent.investigation.resolution && (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                      <h6 className="font-medium text-green-800">Resolution:</h6>
                      <p className="text-sm text-green-700">{selectedEvent.investigation.resolution}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedEvent.tags.length > 0 && (
                <div>
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedEvent.tags.map((tag) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {canInvestigate && selectedEvent?.investigation.status === 'open' && (
              <Button onClick={() => setShowInvestigationDialog(true)}>
                <Eye className="h-4 w-4 mr-2" />
                Investigate
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
