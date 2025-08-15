import { Injectable, Logger } from '@nestjs/common';
import { ConnectionManagerService } from '../connection-manager.service';
import { PresenceService } from './presence.service';
import { ConnectionQualityMetrics } from '../dto/presence-state.dto';

export interface QualityMeasurement {
  userId: string;
  timestamp: Date;
  latency: number;
  reliability: number;
  packetsLost: number;
  jitter?: number;
  bandwidth?: number;
  metadata?: {
    testType: 'ping' | 'echo' | 'throughput';
    duration: number;
    payloadSize: number;
  };
}

export interface ConnectionHealthReport {
  userId: string;
  overallQuality: 'excellent' | 'good' | 'poor';
  metrics: {
    averageLatency: number;
    reliability: number;
    packetLoss: number;
    jitter: number;
    uptime: number;
  };
  recommendations: string[];
  lastMeasured: Date;
  measurementHistory: QualityMeasurement[];
}

@Injectable()
export class ConnectionQualityService {
  private readonly logger = new Logger(ConnectionQualityService.name);
  private readonly qualityMetrics = new Map<string, ConnectionQualityMetrics>();
  private readonly measurementHistory = new Map<string, QualityMeasurement[]>();
  private readonly qualitySubscriptions = new Map<string, (quality: string) => void>();
  
  // Configuration
  private readonly MEASUREMENT_INTERVAL_MS = 30000; // 30 seconds
  private readonly HISTORY_RETENTION_SIZE = 100; // Keep last 100 measurements
  private readonly QUALITY_THRESHOLDS = {
    excellent: { latency: 200, reliability: 0.98, packetLoss: 0.01 },
    good: { latency: 500, reliability: 0.95, packetLoss: 0.03 },
    poor: { latency: Infinity, reliability: 0, packetLoss: 1.0 },
  };
  private readonly CLEANUP_INTERVAL_MS = 300000; // 5 minutes

  constructor(
    private readonly connectionManagerService: ConnectionManagerService,
    private readonly presenceService: PresenceService,
  ) {
    this.startQualityMonitoring();
    this.startQualityCleanup();
  }

  /**
   * Record a connection quality measurement
   */
  recordMeasurement(measurement: QualityMeasurement): void {
    const { userId } = measurement;
    
    // Update metrics
    let metrics = this.qualityMetrics.get(userId);
    if (!metrics) {
      metrics = {
        userId,
        latency: measurement.latency,
        reliability: measurement.reliability,
        packetsLost: measurement.packetsLost,
        reconnectionCount: 0,
        lastMeasured: measurement.timestamp,
      };
    } else {
      // Calculate rolling averages
      const alpha = 0.3; // Exponential smoothing factor
      metrics.latency = alpha * measurement.latency + (1 - alpha) * metrics.latency;
      metrics.reliability = alpha * measurement.reliability + (1 - alpha) * metrics.reliability;
      metrics.packetsLost = alpha * measurement.packetsLost + (1 - alpha) * metrics.packetsLost;
      metrics.lastMeasured = measurement.timestamp;
    }
    
    this.qualityMetrics.set(userId, metrics);

    // Store measurement in history
    let history = this.measurementHistory.get(userId);
    if (!history) {
      history = [];
      this.measurementHistory.set(userId, history);
    }
    
    history.push(measurement);
    
    // Keep only recent measurements
    if (history.length > this.HISTORY_RETENTION_SIZE) {
      history.shift();
    }

    // Determine quality level
    const qualityLevel = this.calculateQualityLevel(metrics);
    
    // Update presence service with connection quality
    this.presenceService.updateConnectionQuality(userId, {
      latency: metrics.latency,
      reliability: metrics.reliability,
      packetsLost: metrics.packetsLost,
    });

    // Notify subscribers of quality changes
    const subscription = this.qualitySubscriptions.get(userId);
    if (subscription) {
      subscription(qualityLevel);
    }

    this.logger.debug(`Recorded quality measurement for user ${userId}: ${qualityLevel} (latency: ${Math.round(metrics.latency)}ms, reliability: ${Math.round(metrics.reliability * 100)}%)`);
  }

  /**
   * Perform active connection quality test
   */
  async performQualityTest(userId: string): Promise<QualityMeasurement> {
    const connectionState = this.connectionManagerService.getConnectionState('', userId); // Simplified lookup
    
    if (!connectionState || connectionState.status !== 'connected') {
      throw new Error(`User ${userId} is not connected`);
    }

    const startTime = Date.now();
    
    try {
      // Perform ping test using Ably stats call
      const ablyClient = this.connectionManagerService.getAblyClient('', userId);
      if (!ablyClient) {
        throw new Error('No Ably client found for user');
      }

      await ablyClient.stats();
      
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      const measurement: QualityMeasurement = {
        userId,
        timestamp: new Date(),
        latency,
        reliability: connectionState.reconnectAttempts === 0 ? 1.0 : Math.max(0.5, 1.0 - connectionState.reconnectAttempts * 0.1),
        packetsLost: 0, // Would need more sophisticated testing to determine
        metadata: {
          testType: 'ping',
          duration: latency,
          payloadSize: 0,
        },
      };

      this.recordMeasurement(measurement);
      return measurement;
      
    } catch (error) {
      this.logger.warn(`Quality test failed for user ${userId}:`, error);
      
      const failedMeasurement: QualityMeasurement = {
        userId,
        timestamp: new Date(),
        latency: 5000, // High latency for failed test
        reliability: 0.0,
        packetsLost: 1.0,
        metadata: {
          testType: 'ping',
          duration: Date.now() - startTime,
          payloadSize: 0,
        },
      };
      
      this.recordMeasurement(failedMeasurement);
      return failedMeasurement;
    }
  }

  /**
   * Get connection health report for a user
   */
  getConnectionHealthReport(userId: string): ConnectionHealthReport | null {
    const metrics = this.qualityMetrics.get(userId);
    const history = this.measurementHistory.get(userId) || [];
    
    if (!metrics || history.length === 0) {
      return null;
    }

    // Calculate aggregate metrics
    const totalMeasurements = history.length;
    const averageLatency = history.reduce((sum, m) => sum + m.latency, 0) / totalMeasurements;
    const averageReliability = history.reduce((sum, m) => sum + m.reliability, 0) / totalMeasurements;
    const averagePacketLoss = history.reduce((sum, m) => sum + m.packetsLost, 0) / totalMeasurements;
    
    // Calculate jitter (latency variance)
    const latencyVariance = history.reduce((sum, m) => sum + Math.pow(m.latency - averageLatency, 2), 0) / totalMeasurements;
    const jitter = Math.sqrt(latencyVariance);
    
    // Calculate uptime (percentage of successful measurements)
    const successfulMeasurements = history.filter(m => m.reliability > 0.5).length;
    const uptime = successfulMeasurements / totalMeasurements;

    const overallQuality = this.calculateQualityLevel({
      userId,
      latency: averageLatency,
      reliability: averageReliability,
      packetsLost: averagePacketLoss,
      reconnectionCount: 0,
      lastMeasured: metrics.lastMeasured,
    });

    const recommendations = this.generateRecommendations(overallQuality, {
      latency: averageLatency,
      reliability: averageReliability,
      packetLoss: averagePacketLoss,
      jitter,
    });

    return {
      userId,
      overallQuality,
      metrics: {
        averageLatency,
        reliability: averageReliability,
        packetLoss: averagePacketLoss,
        jitter,
        uptime,
      },
      recommendations,
      lastMeasured: metrics.lastMeasured,
      measurementHistory: history.slice(-20), // Include last 20 measurements
    };
  }

  /**
   * Subscribe to connection quality changes for a user
   */
  subscribeToQualityChanges(userId: string, callback: (quality: 'excellent' | 'good' | 'poor') => void): void {
    this.qualitySubscriptions.set(userId, callback);
    
    // Immediately call with current quality if available
    const metrics = this.qualityMetrics.get(userId);
    if (metrics) {
      const currentQuality = this.calculateQualityLevel(metrics);
      callback(currentQuality);
    }
    
    this.logger.debug(`Subscribed to quality changes for user ${userId}`);
  }

  /**
   * Unsubscribe from quality changes
   */
  unsubscribeFromQualityChanges(userId: string): void {
    this.qualitySubscriptions.delete(userId);
    this.logger.debug(`Unsubscribed from quality changes for user ${userId}`);
  }

  /**
   * Get quality metrics for all monitored users
   */
  getAllQualityMetrics(): Map<string, ConnectionQualityMetrics> {
    return new Map(this.qualityMetrics);
  }

  /**
   * Record reconnection event
   */
  recordReconnection(userId: string): void {
    const metrics = this.qualityMetrics.get(userId);
    if (metrics) {
      metrics.reconnectionCount++;
      
      // Reduce reliability score based on reconnection frequency
      const reliabilityPenalty = Math.min(0.1 * metrics.reconnectionCount, 0.5);
      metrics.reliability = Math.max(0.1, metrics.reliability - reliabilityPenalty);
      
      this.logger.debug(`Recorded reconnection for user ${userId}, count: ${metrics.reconnectionCount}`);
    }
  }

  // Private helper methods

  private calculateQualityLevel(metrics: ConnectionQualityMetrics): 'excellent' | 'good' | 'poor' {
    const { latency, reliability, packetsLost } = metrics;
    
    if (latency <= this.QUALITY_THRESHOLDS.excellent.latency &&
        reliability >= this.QUALITY_THRESHOLDS.excellent.reliability &&
        packetsLost <= this.QUALITY_THRESHOLDS.excellent.packetLoss) {
      return 'excellent';
    } else if (latency <= this.QUALITY_THRESHOLDS.good.latency &&
               reliability >= this.QUALITY_THRESHOLDS.good.reliability &&
               packetsLost <= this.QUALITY_THRESHOLDS.good.packetLoss) {
      return 'good';
    } else {
      return 'poor';
    }
  }

  private generateRecommendations(
    quality: 'excellent' | 'good' | 'poor',
    metrics: { latency: number; reliability: number; packetLoss: number; jitter: number }
  ): string[] {
    const recommendations: string[] = [];
    
    if (quality === 'poor') {
      if (metrics.latency > 1000) {
        recommendations.push('High latency detected - check network connection');
      }
      if (metrics.reliability < 0.8) {
        recommendations.push('Low connection reliability - consider switching networks');
      }
      if (metrics.packetLoss > 0.05) {
        recommendations.push('High packet loss detected - network may be congested');
      }
      if (metrics.jitter > 200) {
        recommendations.push('High jitter detected - connection is unstable');
      }
    } else if (quality === 'good') {
      if (metrics.latency > 300) {
        recommendations.push('Moderate latency - closer server connection may improve experience');
      }
      if (metrics.reliability < 0.95) {
        recommendations.push('Occasional connection issues - monitor network stability');
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Connection quality is optimal');
    }
    
    return recommendations;
  }

  /**
   * Start periodic quality monitoring
   */
  private startQualityMonitoring(): void {
    setInterval(async () => {
      // Get all active connections and test quality
      const connectionStates = new Map(); // Would get from connection manager
      
      for (const [userId] of this.qualityMetrics) {
        try {
          await this.performQualityTest(userId);
        } catch (error) {
          this.logger.warn(`Failed to perform quality test for user ${userId}:`, error);
        }
      }
    }, this.MEASUREMENT_INTERVAL_MS);
  }

  /**
   * Clean up old metrics and history
   */
  private startQualityCleanup(): void {
    setInterval(() => {
      const now = new Date();
      const expireTime = 60 * 60 * 1000; // 1 hour
      
      // Clean up old metrics
      for (const [userId, metrics] of this.qualityMetrics.entries()) {
        if (now.getTime() - metrics.lastMeasured.getTime() > expireTime) {
          this.qualityMetrics.delete(userId);
          this.measurementHistory.delete(userId);
          this.qualitySubscriptions.delete(userId);
          this.logger.debug(`Cleaned up quality data for inactive user: ${userId}`);
        }
      }
      
      // Clean up old history entries
      for (const [userId, history] of this.measurementHistory.entries()) {
        const recentHistory = history.filter(
          measurement => now.getTime() - measurement.timestamp.getTime() < expireTime
        );
        
        if (recentHistory.length !== history.length) {
          this.measurementHistory.set(userId, recentHistory);
        }
      }
    }, this.CLEANUP_INTERVAL_MS);
  }
}
