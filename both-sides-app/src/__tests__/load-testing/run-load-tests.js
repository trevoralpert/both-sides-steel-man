/**
 * Load Test Runner
 * Orchestrates and manages different load testing scenarios
 */

const { execSync } = require('child_process');
const { existsSync, mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');

const LOAD_TEST_DIR = './src/__tests__/load-testing';
const REPORTS_DIR = `${LOAD_TEST_DIR}/reports`;

// Ensure reports directory exists
if (!existsSync(REPORTS_DIR)) {
  mkdirSync(REPORTS_DIR, { recursive: true });
}

// Test configurations
const testConfigurations = {
  websocket: {
    name: 'WebSocket Load Test',
    script: `${LOAD_TEST_DIR}/scenarios/websocket-load-test.js`,
    description: 'Tests WebSocket connections and real-time messaging performance',
    duration: '5m',
    expectedVUs: 100
  },
  
  api: {
    name: 'API Throughput Test',
    script: `${LOAD_TEST_DIR}/scenarios/api-throughput-test.js`,
    description: 'Tests API endpoint performance and database load',
    duration: '5m',
    expectedRPS: 100
  },
  
  realworld: {
    name: 'Real-World Simulation',
    script: `${LOAD_TEST_DIR}/scenarios/real-world-simulation.js`,
    description: 'Simulates realistic usage patterns and classroom scenarios',
    duration: '10m',
    expectedVUs: 200
  },
  
  stress: {
    name: 'Stress Test',
    script: `${LOAD_TEST_DIR}/scenarios/websocket-load-test.js`,
    description: 'Tests system behavior under extreme load conditions',
    config: 'stressTestWebSockets',
    duration: '7m',
    expectedVUs: 500
  }
};

class LoadTestRunner {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async runAllTests() {
    console.log('🚀 Starting comprehensive load testing suite...');
    console.log(`📅 Test started at: ${new Date().toISOString()}`);
    
    for (const [testKey, config] of Object.entries(testConfigurations)) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🧪 Running: ${config.name}`);
      console.log(`📝 Description: ${config.description}`);
      console.log(`⏱️  Expected Duration: ${config.duration}`);
      console.log(`${'='.repeat(60)}\n`);
      
      try {
        const result = await this.runSingleTest(testKey, config);
        this.results.push(result);
        
        console.log(`✅ ${config.name} completed successfully`);
        this.logTestResult(result);
        
        // Brief pause between tests
        await this.sleep(5000);
        
      } catch (error) {
        console.error(`❌ ${config.name} failed:`, error.message);
        this.results.push({
          testKey,
          name: config.name,
          status: 'failed',
          error: error.message,
          duration: 0
        });
      }
    }
    
    await this.generateFinalReport();
  }

  async runSingleTest(testKey, config) {
    const startTime = Date.now();
    const reportFile = join(REPORTS_DIR, `${testKey}-${Date.now()}.json`);
    
    // Build k6 command
    let command = `k6 run`;
    command += ` --out json=${reportFile}`;
    command += ` --summary-export=${join(REPORTS_DIR, `${testKey}-summary.json`)}`;
    
    // Add environment variables
    command += ` --env BASE_URL=${process.env.BASE_URL || 'http://localhost:3000'}`;
    command += ` --env API_URL=${process.env.API_URL || 'http://localhost:3001'}`;
    command += ` --env WS_URL=${process.env.WS_URL || 'ws://localhost:3001'}`;
    command += ` --env TEST_ID=${testKey}-${Date.now()}`;
    command += ` --env ENVIRONMENT=${process.env.NODE_ENV || 'test'}`;
    
    // Add test-specific configurations
    if (config.config) {
      command += ` --env CONFIG=${config.config}`;
    }
    
    command += ` ${config.script}`;
    
    console.log(`🔧 Executing: ${command}`);
    
    try {
      // Execute k6 test
      const output = execSync(command, { 
        encoding: 'utf8', 
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout: 20 * 60 * 1000 // 20 minute timeout
      });
      
      const duration = Date.now() - startTime;
      
      // Parse results
      const result = this.parseTestResults(testKey, config, output, duration, reportFile);
      
      return result;
      
    } catch (error) {
      throw new Error(`k6 execution failed: ${error.message}`);
    }
  }

  parseTestResults(testKey, config, output, duration, reportFile) {
    // Extract key metrics from k6 output
    const lines = output.split('\n');
    const metrics = {};
    
    // Parse summary metrics
    for (const line of lines) {
      // Extract response time metrics
      if (line.includes('http_req_duration') && line.includes('avg=')) {
        const avgMatch = line.match(/avg=([0-9.]+)ms/);
        const p95Match = line.match(/p\(95\)=([0-9.]+)ms/);
        if (avgMatch) metrics.avgResponseTime = parseFloat(avgMatch[1]);
        if (p95Match) metrics.p95ResponseTime = parseFloat(p95Match[1]);
      }
      
      // Extract request metrics
      if (line.includes('http_reqs') && line.includes('rate=')) {
        const rateMatch = line.match(/rate=([0-9.]+)\/s/);
        if (rateMatch) metrics.requestRate = parseFloat(rateMatch[1]);
      }
      
      // Extract error rate
      if (line.includes('http_req_failed') && line.includes('rate=')) {
        const errorMatch = line.match(/rate=([0-9.]+)%/);
        if (errorMatch) metrics.errorRate = parseFloat(errorMatch[1]);
      }
      
      // Extract VU metrics
      if (line.includes('vus_max') && line.includes('max=')) {
        const vuMatch = line.match(/max=([0-9]+)/);
        if (vuMatch) metrics.maxVUs = parseInt(vuMatch[1]);
      }
    }
    
    // Determine test status
    const status = this.determineTestStatus(metrics, config);
    
    return {
      testKey,
      name: config.name,
      description: config.description,
      status,
      duration: duration / 1000, // Convert to seconds
      metrics,
      reportFile,
      timestamp: new Date().toISOString(),
      passed: status === 'passed',
      output: output.slice(-1000) // Keep last 1000 characters of output
    };
  }

  determineTestStatus(metrics, config) {
    // Define pass/fail criteria
    const criteria = {
      maxErrorRate: 10, // 10% max error rate
      maxResponseTime: 1000, // 1000ms max response time
      minRequestRate: 1 // Minimum 1 req/s
    };
    
    if (metrics.errorRate > criteria.maxErrorRate) {
      return 'failed - high error rate';
    }
    
    if (metrics.p95ResponseTime > criteria.maxResponseTime) {
      return 'failed - slow response time';
    }
    
    if (metrics.requestRate < criteria.minRequestRate) {
      return 'failed - low throughput';
    }
    
    return 'passed';
  }

  logTestResult(result) {
    console.log(`\n📊 Test Results for ${result.name}:`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Duration: ${result.duration.toFixed(1)}s`);
    
    if (result.metrics.avgResponseTime) {
      console.log(`   Avg Response Time: ${result.metrics.avgResponseTime.toFixed(1)}ms`);
    }
    
    if (result.metrics.p95ResponseTime) {
      console.log(`   95th Percentile Response Time: ${result.metrics.p95ResponseTime.toFixed(1)}ms`);
    }
    
    if (result.metrics.requestRate) {
      console.log(`   Request Rate: ${result.metrics.requestRate.toFixed(1)} req/s`);
    }
    
    if (result.metrics.errorRate !== undefined) {
      console.log(`   Error Rate: ${result.metrics.errorRate.toFixed(2)}%`);
    }
    
    if (result.metrics.maxVUs) {
      console.log(`   Max Virtual Users: ${result.metrics.maxVUs}`);
    }
  }

  async generateFinalReport() {
    const totalDuration = (Date.now() - this.startTime) / 1000;
    const passedTests = this.results.filter(r => r.status === 'passed').length;
    const failedTests = this.results.length - passedTests;
    
    const report = {
      summary: {
        totalTests: this.results.length,
        passedTests,
        failedTests,
        successRate: (passedTests / this.results.length) * 100,
        totalDuration: totalDuration,
        timestamp: new Date().toISOString()
      },
      environment: {
        baseUrl: process.env.BASE_URL || 'http://localhost:3000',
        apiUrl: process.env.API_URL || 'http://localhost:3001',
        wsUrl: process.env.WS_URL || 'ws://localhost:3001',
        nodeEnv: process.env.NODE_ENV || 'test'
      },
      results: this.results,
      recommendations: this.generateRecommendations()
    };
    
    // Write final report
    const finalReportPath = join(REPORTS_DIR, `load-test-final-report-${Date.now()}.json`);
    writeFileSync(finalReportPath, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    await this.generateHTMLReport(report, finalReportPath.replace('.json', '.html'));
    
    // Log final summary
    this.logFinalSummary(report);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    const failedTests = this.results.filter(r => r.status !== 'passed');
    const highErrorRateTests = this.results.filter(r => r.metrics?.errorRate > 5);
    const slowResponseTests = this.results.filter(r => r.metrics?.p95ResponseTime > 500);
    
    if (failedTests.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'reliability',
        message: `${failedTests.length} test(s) failed. Review error logs and system capacity.`
      });
    }
    
    if (highErrorRateTests.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'error-handling',
        message: 'High error rates detected. Implement better error handling and retry mechanisms.'
      });
    }
    
    if (slowResponseTests.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        message: 'Slow response times detected. Consider optimizing database queries and API endpoints.'
      });
    }
    
    // Performance recommendations
    const avgResponseTimes = this.results
      .filter(r => r.metrics?.avgResponseTime)
      .map(r => r.metrics.avgResponseTime);
    
    if (avgResponseTimes.length > 0) {
      const overallAvg = avgResponseTimes.reduce((a, b) => a + b, 0) / avgResponseTimes.length;
      
      if (overallAvg > 200) {
        recommendations.push({
          priority: 'medium',
          category: 'optimization',
          message: `Overall average response time is ${overallAvg.toFixed(1)}ms. Consider performance optimizations.`
        });
      }
    }
    
    return recommendations;
  }

  async generateHTMLReport(report, htmlPath) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Load Testing Report - Both Sides</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric-label { color: #666; margin-top: 5px; }
        .test-results { margin-bottom: 30px; }
        .test-item { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff; }
        .test-item.failed { border-left-color: #dc3545; }
        .test-item.passed { border-left-color: #28a745; }
        .recommendations { background: #fff3cd; padding: 20px; border-radius: 8px; border: 1px solid #ffeaa7; }
        .recommendation { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
        .high-priority { border-left: 4px solid #dc3545; }
        .medium-priority { border-left: 4px solid #ffc107; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Both Sides - Load Testing Report</h1>
            <p class="timestamp">Generated on ${report.summary.timestamp}</p>
        </div>
        
        <div class="summary">
            <div class="metric-card">
                <div class="metric-value">${report.summary.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.passedTests}</div>
                <div class="metric-label">Passed Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.failedTests}</div>
                <div class="metric-label">Failed Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.successRate.toFixed(1)}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.totalDuration.toFixed(1)}s</div>
                <div class="metric-label">Total Duration</div>
            </div>
        </div>
        
        <div class="test-results">
            <h2>📊 Test Results</h2>
            ${report.results.map(result => `
                <div class="test-item ${result.passed ? 'passed' : 'failed'}">
                    <h3>${result.name}</h3>
                    <p>${result.description}</p>
                    <p><strong>Status:</strong> ${result.status}</p>
                    <p><strong>Duration:</strong> ${result.duration.toFixed(1)}s</p>
                    ${result.metrics?.avgResponseTime ? `<p><strong>Avg Response Time:</strong> ${result.metrics.avgResponseTime.toFixed(1)}ms</p>` : ''}
                    ${result.metrics?.errorRate !== undefined ? `<p><strong>Error Rate:</strong> ${result.metrics.errorRate.toFixed(2)}%</p>` : ''}
                    ${result.metrics?.requestRate ? `<p><strong>Request Rate:</strong> ${result.metrics.requestRate.toFixed(1)} req/s</p>` : ''}
                </div>
            `).join('')}
        </div>
        
        ${report.recommendations.length > 0 ? `
        <div class="recommendations">
            <h2>💡 Recommendations</h2>
            ${report.recommendations.map(rec => `
                <div class="recommendation ${rec.priority}-priority">
                    <strong>${rec.category.toUpperCase()}:</strong> ${rec.message}
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        <div style="margin-top: 30px; text-align: center; color: #666;">
            <p>Report generated by Both Sides Load Testing Suite</p>
        </div>
    </div>
</body>
</html>`;
    
    writeFileSync(htmlPath, html);
    console.log(`📄 HTML report generated: ${htmlPath}`);
  }

  logFinalSummary(report) {
    console.log('\n' + '='.repeat(80));
    console.log('🏁 LOAD TESTING COMPLETE - FINAL SUMMARY');
    console.log('='.repeat(80));
    console.log(`📊 Tests Run: ${report.summary.totalTests}`);
    console.log(`✅ Passed: ${report.summary.passedTests}`);
    console.log(`❌ Failed: ${report.summary.failedTests}`);
    console.log(`📈 Success Rate: ${report.summary.successRate.toFixed(1)}%`);
    console.log(`⏱️  Total Duration: ${report.summary.totalDuration.toFixed(1)}s`);
    console.log('='.repeat(80));
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Key Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`   ${rec.priority.toUpperCase()}: ${rec.message}`);
      });
    }
    
    console.log(`\n📁 Detailed reports saved in: ${REPORTS_DIR}`);
    console.log('='.repeat(80));
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface - check if running directly
async function main() {
  const runner = new LoadTestRunner();
  
  const testType = process.argv[2];
  
  if (testType && testConfigurations[testType]) {
    // Run single test
    console.log(`Running single test: ${testType}`);
    try {
      const result = await runner.runSingleTest(testType, testConfigurations[testType]);
      runner.results.push(result);
      await runner.generateFinalReport();
    } catch (error) {
      console.error('Test failed:', error);
      process.exit(1);
    }
  } else if (testType === 'list') {
    // List available tests
    console.log('Available load tests:');
    Object.entries(testConfigurations).forEach(([key, config]) => {
      console.log(`  ${key}: ${config.description}`);
    });
  } else {
    // Run all tests
    try {
      await runner.runAllTests();
      const failedTests = runner.results.filter(r => !r.passed).length;
      process.exit(failedTests > 0 ? 1 : 0);
    } catch (error) {
      console.error('Load testing suite failed:', error);
      process.exit(1);
    }
  }
}

// Only run main if this is the entry point
if (process.argv[1].endsWith('run-load-tests.js')) {
  main();
}

module.exports = LoadTestRunner;
