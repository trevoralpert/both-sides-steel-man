/**
 * CI/CD Integration Configuration
 * Automated load testing pipeline integration
 */

export const ciConfig = {
  // CI/CD platform configurations
  github: {
    workflowFile: '.github/workflows/load-testing.yml',
    triggers: ['push', 'pull_request', 'schedule'],
    environment: 'staging',
    secrets: [
      'LOAD_TEST_API_URL',
      'LOAD_TEST_WS_URL', 
      'MONITORING_WEBHOOK_URL',
      'SLACK_WEBHOOK_URL'
    ]
  },

  // Load testing environments
  environments: {
    development: {
      baseUrl: 'http://localhost:3000',
      apiUrl: 'http://localhost:3001',
      wsUrl: 'ws://localhost:3001',
      testIntensity: 'light',
      maxDuration: '2m',
      maxVUs: 10
    },
    
    staging: {
      baseUrl: process.env.STAGING_BASE_URL || 'https://staging.bothsides.app',
      apiUrl: process.env.STAGING_API_URL || 'https://api-staging.bothsides.app',
      wsUrl: process.env.STAGING_WS_URL || 'wss://ws-staging.bothsides.app',
      testIntensity: 'medium',
      maxDuration: '5m',
      maxVUs: 50
    },
    
    production: {
      baseUrl: process.env.PROD_BASE_URL || 'https://bothsides.app',
      apiUrl: process.env.PROD_API_URL || 'https://api.bothsides.app',
      wsUrl: process.env.PROD_WS_URL || 'wss://ws.bothsides.app',
      testIntensity: 'light', // Conservative for production
      maxDuration: '3m',
      maxVUs: 25,
      safeguards: {
        maxErrorRate: 0.05, // 5% max error rate
        maxResponseTime: 1000, // 1s max response time
        autoStop: true // Stop test if thresholds exceeded
      }
    }
  },

  // Test execution policies
  executionPolicies: {
    pullRequest: {
      tests: ['websocket', 'api'],
      intensity: 'light',
      maxDuration: '2m',
      failureBehavior: 'block_merge'
    },
    
    mainBranch: {
      tests: ['websocket', 'api', 'realworld'],
      intensity: 'medium',
      maxDuration: '10m',
      failureBehavior: 'notify_team'
    },
    
    release: {
      tests: ['websocket', 'api', 'realworld', 'stress'],
      intensity: 'high',
      maxDuration: '15m',
      failureBehavior: 'block_deployment'
    },
    
    scheduled: {
      tests: ['all'],
      intensity: 'stress',
      maxDuration: '30m',
      frequency: 'daily',
      time: '02:00 UTC'
    }
  },

  // Performance baselines and thresholds
  performanceBaselines: {
    responseTime: {
      api: { p95: 500, p99: 1000 },
      websocket: { connection: 1000, message: 100 }
    },
    
    throughput: {
      api: { minRPS: 100 },
      websocket: { minConnections: 500 }
    },
    
    reliability: {
      errorRate: { max: 0.05 },
      availability: { min: 0.99 }
    },
    
    resources: {
      memory: { max: 1000 }, // MB
      cpu: { max: 80 },      // %
      connections: { max: 1000 }
    }
  },

  // Alerting and notification configuration
  alerting: {
    channels: {
      slack: {
        webhook: process.env.SLACK_WEBHOOK_URL,
        channel: '#engineering-alerts',
        mentions: ['@performance-team']
      },
      
      email: {
        recipients: [
          'devops@bothsides.app',
          'engineering@bothsides.app'
        ],
        severity: ['critical', 'warning']
      },
      
      pagerduty: {
        serviceKey: process.env.PAGERDUTY_SERVICE_KEY,
        severity: ['critical']
      }
    },
    
    rules: [
      {
        name: 'High Error Rate',
        condition: 'error_rate > 10%',
        severity: 'critical',
        channels: ['slack', 'pagerduty']
      },
      {
        name: 'Slow Response Time',
        condition: 'p95_response_time > 1000ms',
        severity: 'warning',
        channels: ['slack']
      },
      {
        name: 'Low Throughput',
        condition: 'requests_per_second < 50',
        severity: 'warning',
        channels: ['slack']
      },
      {
        name: 'Resource Exhaustion',
        condition: 'memory_usage > 90% OR cpu_usage > 90%',
        severity: 'critical',
        channels: ['slack', 'email', 'pagerduty']
      }
    ]
  },

  // Reporting and analytics
  reporting: {
    storage: {
      type: 'cloud', // 'local' or 'cloud'
      s3Bucket: process.env.LOAD_TEST_REPORTS_BUCKET,
      retention: '90d'
    },
    
    dashboards: {
      grafana: {
        url: process.env.GRAFANA_URL,
        dashboardId: 'load-testing-overview'
      },
      
      datadog: {
        apiKey: process.env.DATADOG_API_KEY,
        tags: ['service:both-sides', 'env:staging']
      }
    },
    
    trends: {
      enabled: true,
      compareWith: 'previous_run',
      alertOnRegression: true,
      regressionThreshold: 0.2 // 20% performance degradation
    }
  }
};

// GitHub Actions workflow generator
export function generateGitHubWorkflow() {
  return `
name: Load Testing

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC

jobs:
  load-test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        test-type: [websocket, api, realworld]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'yarn'
    
    - name: Install dependencies
      run: yarn install --frozen-lockfile
    
    - name: Install k6
      run: |
        sudo gpg -k
        sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install k6
    
    - name: Run Load Tests
      run: yarn load-test:\${{ matrix.test-type }}
      env:
        BASE_URL: \${{ secrets.STAGING_BASE_URL }}
        API_URL: \${{ secrets.STAGING_API_URL }}
        WS_URL: \${{ secrets.STAGING_WS_URL }}
        ENVIRONMENT: staging
        
    - name: Upload Test Results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: load-test-results-\${{ matrix.test-type }}
        path: src/__tests__/load-testing/reports/
        retention-days: 30
    
    - name: Notify on Failure
      if: failure()
      uses: 8398a7/action-slack@v3
      with:
        status: failure
        webhook_url: \${{ secrets.SLACK_WEBHOOK_URL }}
        message: "Load testing failed for \${{ matrix.test-type }}"

  performance-regression-check:
    runs-on: ubuntu-latest
    needs: load-test
    if: github.event_name == 'pull_request'
    
    steps:
    - name: Download Test Results
      uses: actions/download-artifact@v4
      with:
        path: test-results/
    
    - name: Performance Regression Analysis
      run: |
        node src/__tests__/load-testing/utils/regression-analysis.js
      env:
        GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        PR_NUMBER: \${{ github.event.number }}
`;
}

// Docker configuration for containerized testing
export const dockerConfig = {
  loadTestRunner: {
    dockerfile: `
FROM grafana/k6:latest

WORKDIR /app
COPY . .

# Install Node.js for test orchestration
RUN apk add --no-cache nodejs npm

# Install dependencies
RUN npm install

# Set default command
CMD ["node", "src/__tests__/load-testing/run-load-tests.js"]
`,
    
    compose: `
version: '3.8'

services:
  load-test-runner:
    build: .
    environment:
      - BASE_URL=\${BASE_URL:-http://app:3000}
      - API_URL=\${API_URL:-http://api:3001}
      - WS_URL=\${WS_URL:-ws://api:3001}
      - ENVIRONMENT=\${ENVIRONMENT:-test}
    depends_on:
      - app
      - api
    volumes:
      - ./reports:/app/src/__tests__/load-testing/reports
  
  app:
    build: 
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
  
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
`
  }
};

// Performance regression analysis
export class RegressionAnalyzer {
  constructor(currentResults, baselineResults) {
    this.current = currentResults;
    this.baseline = baselineResults;
  }

  analyzeRegression() {
    const analysis = {
      summary: {
        hasRegression: false,
        regressionCount: 0,
        improvementCount: 0
      },
      details: []
    };

    // Compare key metrics
    const metrics = ['avgResponseTime', 'p95ResponseTime', 'errorRate', 'requestRate'];
    
    for (const metric of metrics) {
      const currentValue = this.current.metrics?.[metric];
      const baselineValue = this.baseline.metrics?.[metric];
      
      if (currentValue && baselineValue) {
        const change = this.calculatePercentageChange(currentValue, baselineValue);
        const isRegression = this.isRegression(metric, change);
        
        analysis.details.push({
          metric,
          current: currentValue,
          baseline: baselineValue,
          change: change,
          isRegression,
          severity: this.getSeverity(metric, Math.abs(change))
        });
        
        if (isRegression) {
          analysis.summary.hasRegression = true;
          analysis.summary.regressionCount++;
        } else if (change < -5) { // 5% improvement
          analysis.summary.improvementCount++;
        }
      }
    }

    return analysis;
  }

  calculatePercentageChange(current, baseline) {
    return ((current - baseline) / baseline) * 100;
  }

  isRegression(metric, changePercent) {
    const regressionThresholds = {
      avgResponseTime: 20, // 20% slower is regression
      p95ResponseTime: 25, // 25% slower is regression
      errorRate: 50,       // 50% more errors is regression
      requestRate: -15     // 15% fewer requests is regression
    };

    const threshold = regressionThresholds[metric] || 20;
    
    if (metric === 'requestRate') {
      return changePercent < threshold; // For throughput, decrease is bad
    } else {
      return changePercent > threshold; // For latency/errors, increase is bad
    }
  }

  getSeverity(metric, changePercent) {
    if (changePercent > 50) return 'critical';
    if (changePercent > 25) return 'high';
    if (changePercent > 10) return 'medium';
    return 'low';
  }

  generateReport() {
    const analysis = this.analyzeRegression();
    
    return `
# Performance Regression Analysis

## Summary
- **Regression Detected**: ${analysis.summary.hasRegression ? '❌ YES' : '✅ NO'}
- **Regressions**: ${analysis.summary.regressionCount}
- **Improvements**: ${analysis.summary.improvementCount}

## Detailed Analysis

${analysis.details.map(detail => `
### ${detail.metric}
- **Current**: ${detail.current}
- **Baseline**: ${detail.baseline}
- **Change**: ${detail.change.toFixed(2)}%
- **Status**: ${detail.isRegression ? '❌ Regression' : '✅ OK'}
- **Severity**: ${detail.severity}
`).join('')}

## Recommendations

${analysis.summary.hasRegression ? 
  '⚠️ Performance regressions detected. Review changes and consider optimization before deployment.' :
  '✅ No significant performance regressions detected. Changes appear to maintain or improve performance.'
}
`;
  }
}

export default {
  ciConfig,
  generateGitHubWorkflow,
  dockerConfig,
  RegressionAnalyzer
};
