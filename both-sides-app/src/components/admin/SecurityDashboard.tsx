/**
 * Real-time Security Monitoring Dashboard
 * Provides comprehensive security event visualization and monitoring
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Users, 
  Lock, 
  Eye, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';

// Mock data interfaces (would be replaced with actual API calls)
interface SecurityMetrics {
  totalAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  resolvedAlerts: number;
  averageResponseTime: number;
  falsePositiveRate: number;
  activeThreats: number;
  blockedAttempts: number;
  monitoredUsers: number;
  systemHealth: number;
}

interface SecurityAlert {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  triggeredAt: Date;
  description: string;
  affectedUsers: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
}

interface ThreatTrend {
  category: string;
  count: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
}

interface UserActivity {
  userId: string;
  userName: string;
  riskScore: number;
  alertCount: number;
  lastActivity: Date;
  status: 'normal' | 'suspicious' | 'blocked';
}

export default function SecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalAlerts: 0,
    criticalAlerts: 0,
    highAlerts: 0,
    mediumAlerts: 0,
    lowAlerts: 0,
    resolvedAlerts: 0,
    averageResponseTime: 0,
    falsePositiveRate: 0,
    activeThreats: 0,
    blockedAttempts: 0,
    monitoredUsers: 0,
    systemHealth: 100
  });

  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [threatTrends, setThreatTrends] = useState<ThreatTrend[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Mock data loading
  useEffect(() => {
    const loadSecurityData = async () => {
      setIsLoading(true);
      
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock metrics
      setMetrics({
        totalAlerts: 247,
        criticalAlerts: 3,
        highAlerts: 12,
        mediumAlerts: 45,
        lowAlerts: 187,
        resolvedAlerts: 235,
        averageResponseTime: 4.2,
        falsePositiveRate: 0.08,
        activeThreats: 5,
        blockedAttempts: 1247,
        monitoredUsers: 2847,
        systemHealth: 98.5
      });

      // Mock alerts
      setAlerts([
        {
          id: '1',
          title: 'Multiple Failed Login Attempts',
          severity: 'high',
          category: 'Authentication',
          status: 'investigating',
          triggeredAt: new Date(Date.now() - 15 * 60 * 1000),
          description: 'Detected 15 failed login attempts from IP 192.168.1.100',
          affectedUsers: 3,
          riskLevel: 'high'
        },
        {
          id: '2',
          title: 'Unusual Data Access Pattern',
          severity: 'medium',
          category: 'Data Access',
          status: 'open',
          triggeredAt: new Date(Date.now() - 45 * 60 * 1000),
          description: 'User accessing unusually large amount of student records',
          affectedUsers: 1,
          riskLevel: 'medium'
        },
        {
          id: '3',
          title: 'Privilege Escalation Attempt',
          severity: 'critical',
          category: 'Authorization',
          status: 'resolved',
          triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          description: 'Attempted unauthorized admin access',
          affectedUsers: 1,
          riskLevel: 'critical'
        }
      ]);

      // Mock threat trends
      setThreatTrends([
        { category: 'Authentication', count: 45, trend: 'increasing', changePercent: 12.5 },
        { category: 'Data Access', count: 23, trend: 'stable', changePercent: -2.1 },
        { category: 'Authorization', count: 8, trend: 'decreasing', changePercent: -15.3 },
        { category: 'System Integrity', count: 12, trend: 'increasing', changePercent: 8.7 }
      ]);

      // Mock user activity
      setUserActivity([
        { userId: 'user1', userName: 'John Doe', riskScore: 85, alertCount: 5, lastActivity: new Date(), status: 'suspicious' },
        { userId: 'user2', userName: 'Jane Smith', riskScore: 45, alertCount: 2, lastActivity: new Date(), status: 'normal' },
        { userId: 'user3', userName: 'Bob Johnson', riskScore: 95, alertCount: 8, lastActivity: new Date(), status: 'blocked' }
      ]);

      setLastUpdate(new Date());
      setIsLoading(false);
    };

    loadSecurityData();
    
    // Set up real-time updates
    const interval = setInterval(loadSecurityData, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <AlertCircle className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'stable': return <Activity className="h-4 w-4 text-blue-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'open': { color: 'bg-red-100 text-red-800', label: 'Open' },
      'investigating': { color: 'bg-yellow-100 text-yellow-800', label: 'Investigating' },
      'resolved': { color: 'bg-green-100 text-green-800', label: 'Resolved' },
      'false_positive': { color: 'bg-gray-100 text-gray-800', label: 'False Positive' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const criticalAlertsCount = alerts.filter(alert => alert.severity === 'critical' && alert.status === 'open').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 animate-pulse" />
          <p>Loading security dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time security monitoring and threat detection
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <Button variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlertsCount > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Critical Security Alerts</AlertTitle>
          <AlertDescription className="text-red-700">
            {criticalAlertsCount} critical security alert{criticalAlertsCount > 1 ? 's' : ''} require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.resolvedAlerts} resolved ({Math.round((metrics.resolvedAlerts / metrics.totalAlerts) * 100)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Threats</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.activeThreats}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.blockedAttempts} blocked attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageResponseTime}m</div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.systemHealth}%</div>
            <Progress value={metrics.systemHealth} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
          <TabsTrigger value="threats">Threat Analysis</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* Security Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Alert Severity Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Alert Severity</CardTitle>
                <CardDescription>Distribution of alert severities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm">Critical</span>
                  </div>
                  <span className="font-medium">{metrics.criticalAlerts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-sm">High</span>
                  </div>
                  <span className="font-medium">{metrics.highAlerts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Medium</span>
                  </div>
                  <span className="font-medium">{metrics.mediumAlerts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Low</span>
                  </div>
                  <span className="font-medium">{metrics.lowAlerts}</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Security Alerts</CardTitle>
                <CardDescription>Latest security events and incidents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                      <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)}`}>
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium truncate">{alert.title}</h4>
                          {getStatusBadge(alert.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                          <span>{alert.category}</span>
                          <span>{alert.affectedUsers} users affected</span>
                          <span>{alert.triggeredAt.toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Threat Analysis Tab */}
        <TabsContent value="threats" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Threat Trends</CardTitle>
                <CardDescription>Security threat categories and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {threatTrends.map((trend) => (
                    <div key={trend.category} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getTrendIcon(trend.trend)}
                        <div>
                          <div className="font-medium">{trend.category}</div>
                          <div className="text-sm text-muted-foreground">{trend.count} incidents</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          trend.trend === 'increasing' ? 'text-red-600' : 
                          trend.trend === 'decreasing' ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          {trend.changePercent > 0 ? '+' : ''}{trend.changePercent}%
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">{trend.trend}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Threat Intelligence</CardTitle>
                <CardDescription>Security insights and recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Authentication Threats Increasing</AlertTitle>
                    <AlertDescription>
                      Failed login attempts have increased by 12.5% this week. Consider implementing additional MFA requirements.
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Authorization Controls Effective</AlertTitle>
                    <AlertDescription>
                      Privilege escalation attempts have decreased by 15.3% due to improved access controls.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Activity Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>High-Risk Users</CardTitle>
              <CardDescription>Users with elevated security risk scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userActivity.map((user) => (
                  <div key={user.userId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${
                        user.status === 'blocked' ? 'bg-red-500' :
                        user.status === 'suspicious' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                      <div>
                        <div className="font-medium">{user.userName}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.alertCount} alerts • Last active: {user.lastActivity.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-medium">Risk Score: {user.riskScore}</div>
                        <Progress value={user.riskScore} className="w-20" />
                      </div>
                      <Badge className={
                        user.status === 'blocked' ? 'bg-red-100 text-red-800' :
                        user.status === 'suspicious' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-green-100 text-green-800'
                      }>
                        {user.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>FERPA Compliance</CardTitle>
                <CardDescription>Student data access monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Student Record Access</span>
                    <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Data Export Requests</span>
                    <Badge className="bg-green-100 text-green-800">Tracked</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Audit Trail Integrity</span>
                    <Badge className="bg-green-100 text-green-800">Verified</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>COPPA Compliance</CardTitle>
                <CardDescription>Children's privacy protection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Parental Consent</span>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Data Collection Limits</span>
                    <Badge className="bg-green-100 text-green-800">Enforced</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Age Verification</span>
                    <Badge className="bg-green-100 text-green-800">Verified</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
