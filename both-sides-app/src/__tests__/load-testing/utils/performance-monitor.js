/**
 * Performance Monitoring and Alerting System
 * Comprehensive monitoring, metrics collection, and reporting for load tests
 */

import { check } from 'k6';
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';
import http from 'k6/http';
import { loadTestConfig } from '../config/load-test-config.js';

// Advanced custom metrics
export const responseTimeBreakdown = {
  dns: new Trend('dns_lookup_time'),
  tcp: new Trend('tcp_connect_time'),
  tls: new Trend('tls_handshake_time'),
  request: new Trend('request_send_time'),
  waiting: new Trend('server_processing_time'),
  receiving: new Trend('response_receive_time')
};

export const businessMetrics = {
  userRegistrations: new Counter('user_registrations'),
  debateSessionsCreated: new Counter('debate_sessions_created'),
  messagesExchanged: new Counter('messages_exchanged'),
  aiCoachingRequests: new Counter('ai_coaching_requests'),
  surveyCompletions: new Counter('survey_completions')
};

export const systemMetrics = {
  memoryUsage: new Gauge('system_memory_usage_mb'),
  cpuUsage: new Gauge('system_cpu_usage_percent'),
  diskUsage: new Gauge('system_disk_usage_percent'),
  networkBandwidth: new Gauge('network_bandwidth_mbps'),
  activeConnections: new Gauge('active_connections_count')
};

export const errorMetrics = {
  httpErrors: new Counter('http_errors_total'),
  websocketErrors: new Counter('websocket_errors_total'),
  databaseErrors: new Counter('database_errors_total'),
  authenticationErrors: new Counter('authentication_errors_total'),
  timeoutErrors: new Counter('timeout_errors_total')
};

export const performanceThresholds = {
  critical: {
    responseTime: 1000, // ms
    errorRate: 0.05,    // 5%
    availability: 0.99   // 99%
  },
  warning: {
    responseTime: 500,   // ms
    errorRate: 0.02,     // 2%
    availability: 0.995  // 99.5%
  }
};

export class PerformanceMonitor {
  constructor() {
    this.startTime = Date.now();
    this.alerts = [];
    this.metrics = new Map();
    this.thresholdViolations = new Map();
  }

  // Core monitoring methods
  recordResponseTime(operation, duration, details = {}) {
    const metric = new Trend(`${operation}_response_time`);
    metric.add(duration);
    
    // Record detailed timing breakdown if available
    if (details.timings) {
      responseTimeBreakdown.dns.add(details.timings.dns || 0);
      responseTimeBreakdown.tcp.add(details.timings.connecting || 0);
      responseTimeBreakdown.tls.add(details.timings.tls_handshaking || 0);
      responseTimeBreakdown.request.add(details.timings.sending || 0);
      responseTimeBreakdown.waiting.add(details.timings.waiting || 0);
      responseTimeBreakdown.receiving.add(details.timings.receiving || 0);
    }
    
    // Check thresholds
    this.checkPerformanceThreshold(operation, 'responseTime', duration);
  }

  recordBusinessMetric(metricName, value = 1) {
    if (businessMetrics[metricName]) {
      if (businessMetrics[metricName].add) {
        businessMetrics[metricName].add(value);
      } else {
        businessMetrics[metricName].set(value);
      }
    }
  }

  recordError(errorType, details = {}) {
    if (errorMetrics[`${errorType}Errors`]) {
      errorMetrics[`${errorType}Errors`].add(1);
    }
    
    // Log error details for debugging
    console.error(`${errorType} Error:`, details);
    
    // Check error rate thresholds
    this.checkErrorRateThreshold(errorType);
  }

  async collectSystemMetrics() {
    try {
      const response = await http.get(`${loadTestConfig.apiUrl}/api/health/system`, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        const metrics = response.json();
        
        if (metrics.memory) {
          systemMetrics.memoryUsage.add(metrics.memory.used);
        }
        
        if (metrics.cpu) {
          systemMetrics.cpuUsage.add(metrics.cpu.percentage);
        }
        
        if (metrics.disk) {
          systemMetrics.diskUsage.add(metrics.disk.percentage);
        }
        
        if (metrics.network) {
          systemMetrics.networkBandwidth.add(metrics.network.bandwidth);
        }
        
        if (metrics.connections) {
          systemMetrics.activeConnections.add(metrics.connections.active);
        }
        
        // Check system resource thresholds
        this.checkSystemThresholds(metrics);
      }
    } catch (error) {
      console.warn('Failed to collect system metrics:', error);
      this.recordError('system', { message: error.message });
    }
  }

  // Threshold monitoring
  checkPerformanceThreshold(operation, metric, value) {
    const thresholds = performanceThresholds;
    const key = `${operation}_${metric}`;
    
    if (metric === 'responseTime') {
      if (value > thresholds.critical.responseTime) {
        this.triggerAlert('critical', `${operation} response time exceeded critical threshold: ${value}ms`);
      } else if (value > thresholds.warning.responseTime) {
        this.triggerAlert('warning', `${operation} response time exceeded warning threshold: ${value}ms`);
      }
    }
  }

  checkErrorRateThreshold(errorType) {
    // This would need to be implemented with proper rate calculation
    // For now, we'll use a simple counter-based approach
    const errorCount = this.getMetricValue(`${errorType}Errors`) || 0;
    const totalRequests = this.getMetricValue('http_reqs') || 1;
    const errorRate = errorCount / totalRequests;
    
    if (errorRate > performanceThresholds.critical.errorRate) {
      this.triggerAlert('critical', `${errorType} error rate exceeded critical threshold: ${(errorRate * 100).toFixed(2)}%`);
    } else if (errorRate > performanceThresholds.warning.errorRate) {
      this.triggerAlert('warning', `${errorType} error rate exceeded warning threshold: ${(errorRate * 100).toFixed(2)}%`);
    }
  }

  checkSystemThresholds(metrics) {
    if (metrics.memory && metrics.memory.percentage > 90) {
      this.triggerAlert('critical', `Memory usage critical: ${metrics.memory.percentage}%`);
    }
    
    if (metrics.cpu && metrics.cpu.percentage > 85) {
      this.triggerAlert('warning', `CPU usage high: ${metrics.cpu.percentage}%`);
    }
    
    if (metrics.disk && metrics.disk.percentage > 95) {
      this.triggerAlert('critical', `Disk usage critical: ${metrics.disk.percentage}%`);
    }
  }

  // Alerting system
  triggerAlert(severity, message) {
    const alert = {
      severity,
      message,
      timestamp: new Date().toISOString(),
      testId: __ENV.TEST_ID || 'unknown'
    };
    
    this.alerts.push(alert);
    console.log(`🚨 ${severity.toUpperCase()} ALERT: ${message}`);
    
    // Send to external alerting system if configured
    if (loadTestConfig.monitoring.alertingWebhook) {
      this.sendExternalAlert(alert);
    }
  }

  async sendExternalAlert(alert) {
    try {
      await http.post(loadTestConfig.monitoring.alertingWebhook, JSON.stringify({
        ...alert,
        source: 'k6-load-test',
        environment: loadTestConfig.environment
      }), {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
    } catch (error) {
      console.error('Failed to send external alert:', error);
    }
  }

  // Reporting and analysis
  generatePerformanceReport() {
    const testDuration = (Date.now() - this.startTime) / 1000;
    
    const report = {
      testSummary: {
        duration: testDuration,
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date().toISOString(),
        environment: loadTestConfig.environment
      },
      performanceMetrics: {
        responseTime: this.calculatePercentiles('http_req_duration'),
        throughput: this.calculateThroughput(),
        errorRate: this.calculateErrorRate(),
        availability: this.calculateAvailability()
      },
      resourceUtilization: {
        memory: this.getMetricSummary('system_memory_usage_mb'),
        cpu: this.getMetricSummary('system_cpu_usage_percent'),
        network: this.getMetricSummary('network_bandwidth_mbps')
      },
      businessMetrics: {
        userRegistrations: this.getMetricValue('user_registrations'),
        debateSessionsCreated: this.getMetricValue('debate_sessions_created'),
        messagesExchanged: this.getMetricValue('messages_exchanged'),
        aiCoachingRequests: this.getMetricValue('ai_coaching_requests')
      },
      alerts: {
        total: this.alerts.length,
        critical: this.alerts.filter(a => a.severity === 'critical').length,
        warnings: this.alerts.filter(a => a.severity === 'warning').length,
        details: this.alerts
      },
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  calculatePercentiles(metricName) {
    // This is a simplified implementation
    // In practice, k6 provides built-in percentile calculations
    return {
      p50: 'N/A', // Would be calculated from actual data
      p95: 'N/A',
      p99: 'N/A',
      max: 'N/A'
    };
  }

  calculateThroughput() {
    const totalRequests = this.getMetricValue('http_reqs') || 0;
    const testDuration = (Date.now() - this.startTime) / 1000;
    return totalRequests / testDuration;
  }

  calculateErrorRate() {
    const totalRequests = this.getMetricValue('http_reqs') || 1;
    const failedRequests = this.getMetricValue('http_req_failed') || 0;
    return failedRequests / totalRequests;
  }

  calculateAvailability() {
    const errorRate = this.calculateErrorRate();
    return 1 - errorRate;
  }

  getMetricValue(metricName) {
    // This would interface with k6's metric system
    // Simplified implementation for demonstration
    return this.metrics.get(metricName) || 0;
  }

  getMetricSummary(metricName) {
    return {
      min: 'N/A',
      max: 'N/A',
      avg: 'N/A',
      current: this.getMetricValue(metricName)
    };
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Performance recommendations
    if (this.calculateErrorRate() > 0.05) {
      recommendations.push({
        category: 'reliability',
        priority: 'high',
        message: 'Error rate is above 5%. Consider investigating error causes and implementing retry mechanisms.'
      });
    }
    
    if (this.getMetricValue('system_memory_usage_mb') > 1000) {
      recommendations.push({
        category: 'resources',
        priority: 'medium',
        message: 'Memory usage is high. Consider optimizing memory usage or scaling resources.'
      });
    }
    
    if (this.alerts.length > 10) {
      recommendations.push({
        category: 'monitoring',
        priority: 'high',
        message: 'High number of alerts triggered. Review alert thresholds and system performance.'
      });
    }
    
    // Business recommendations
    const throughput = this.calculateThroughput();
    if (throughput < 10) {
      recommendations.push({
        category: 'performance',
        priority: 'medium',
        message: 'Low throughput detected. Consider optimizing database queries and API response times.'
      });
    }
    
    return recommendations;
  }

  // Real-time monitoring dashboard data
  getDashboardData() {
    return {
      realTime: {
        currentUsers: this.getMetricValue('concurrent_users'),
        requestsPerSecond: this.calculateThroughput(),
        errorRate: this.calculateErrorRate() * 100,
        avgResponseTime: this.getMetricValue('http_req_duration_avg')
      },
      system: {
        memoryUsage: this.getMetricValue('system_memory_usage_mb'),
        cpuUsage: this.getMetricValue('system_cpu_usage_percent'),
        activeConnections: this.getMetricValue('active_connections_count')
      },
      business: {
        activeDebates: this.getMetricValue('debate_sessions_created'),
        messagesPerMinute: this.getMetricValue('messages_exchanged') / ((Date.now() - this.startTime) / 60000),
        userEngagement: this.calculateUserEngagement()
      }
    };
  }

  calculateUserEngagement() {
    const totalUsers = this.getMetricValue('concurrent_users') || 1;
    const activeUsers = this.getMetricValue('messages_exchanged') || 0;
    return (activeUsers / totalUsers) * 100;
  }

  // Export methods for external monitoring systems
  async exportMetricsToInfluxDB(influxConfig) {
    if (!influxConfig.url) return;
    
    try {
      const metrics = this.generatePerformanceReport();
      
      await http.post(`${influxConfig.url}/write`, 
        this.formatInfluxDBData(metrics),
        {
          headers: {
            'Authorization': `Token ${influxConfig.token}`,
            'Content-Type': 'text/plain'
          }
        }
      );
    } catch (error) {
      console.error('Failed to export metrics to InfluxDB:', error);
    }
  }

  formatInfluxDBData(metrics) {
    const timestamp = Date.now() * 1000000; // InfluxDB expects nanoseconds
    let data = '';
    
    // Format performance metrics
    data += `performance,test_id=${__ENV.TEST_ID || 'unknown'} `;
    data += `response_time=${metrics.performanceMetrics.responseTime.p95 || 0},`;
    data += `throughput=${metrics.performanceMetrics.throughput || 0},`;
    data += `error_rate=${metrics.performanceMetrics.errorRate || 0} `;
    data += `${timestamp}\n`;
    
    // Format business metrics
    data += `business,test_id=${__ENV.TEST_ID || 'unknown'} `;
    data += `user_registrations=${metrics.businessMetrics.userRegistrations || 0},`;
    data += `debate_sessions=${metrics.businessMetrics.debateSessionsCreated || 0},`;
    data += `messages_exchanged=${metrics.businessMetrics.messagesExchanged || 0} `;
    data += `${timestamp}\n`;
    
    return data;
  }

  // Cleanup and finalization
  finalize() {
    console.log('📊 Performance Monitoring Summary:');
    console.log(`- Test Duration: ${(Date.now() - this.startTime) / 1000}s`);
    console.log(`- Total Alerts: ${this.alerts.length}`);
    console.log(`- Critical Alerts: ${this.alerts.filter(a => a.severity === 'critical').length}`);
    console.log(`- Warning Alerts: ${this.alerts.filter(a => a.severity === 'warning').length}`);
    
    return this.generatePerformanceReport();
  }
}

// Global performance monitor instance
export const globalPerformanceMonitor = new PerformanceMonitor();

// Convenience functions for common monitoring tasks
export function monitorApiCall(operation, responsePromise) {
  const startTime = Date.now();
  
  return responsePromise.then(response => {
    const duration = Date.now() - startTime;
    globalPerformanceMonitor.recordResponseTime(operation, duration, {
      status: response.status,
      timings: response.timings
    });
    
    if (response.status >= 400) {
      globalPerformanceMonitor.recordError('http', {
        status: response.status,
        operation
      });
    }
    
    return response;
  }).catch(error => {
    const duration = Date.now() - startTime;
    globalPerformanceMonitor.recordError('timeout', {
      operation,
      duration,
      message: error.message
    });
    throw error;
  });
}

export function monitorWebSocketConnection(connectionPromise) {
  const startTime = Date.now();
  
  return connectionPromise.then(connection => {
    const duration = Date.now() - startTime;
    globalPerformanceMonitor.recordResponseTime('websocket_connect', duration);
    
    return connection;
  }).catch(error => {
    globalPerformanceMonitor.recordError('websocket', {
      message: error.message,
      duration: Date.now() - startTime
    });
    throw error;
  });
}

export default {
  PerformanceMonitor,
  globalPerformanceMonitor,
  monitorApiCall,
  monitorWebSocketConnection,
  responseTimeBreakdown,
  businessMetrics,
  systemMetrics,
  errorMetrics,
  performanceThresholds
};
