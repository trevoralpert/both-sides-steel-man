import { IntegrationTestScenarios, TestResult, TestScenario } from '../scenarios/integration-test-scenarios';
import { ExternalSystemMockServer, MockServerConfig } from '../mocks/external-system-mock-server';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Automated Regression Test Suite
 * 
 * Comprehensive automated testing framework that runs regression tests,
 * generates reports, integrates with CI/CD, and provides performance
 * benchmarking for the integration layer.
 * 
 * Features:
 * - Automated test execution with parallel processing
 * - Regression detection and reporting
 * - Performance benchmarking and alerts
 * - CI/CD pipeline integration
 * - Detailed test reporting and analytics
 * - Test data management and cleanup
 */

export interface RegressionTestConfig {
  parallel: boolean;
  maxConcurrency: number;
  timeoutMs: number;
  retryCount: number;
  categories: ('functional' | 'performance' | 'security' | 'reliability' | 'data-integrity')[];
  priorities: ('critical' | 'high' | 'medium' | 'low')[];
  generateReport: boolean;
  reportFormat: 'json' | 'xml' | 'html' | 'all';
  benchmarkMode: boolean;
  baselinePath?: string;
  outputPath: string;
}

export interface RegressionTestResult {
  runId: string;
  timestamp: string;
  configuration: RegressionTestConfig;
  summary: TestRunSummary;
  scenarios: ScenarioResult[];
  performance: PerformanceSummary;
  regressions: RegressionDetection[];
  environment: EnvironmentInfo;
}

export interface TestRunSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  passRate: number;
  coverage: TestCoverage;
}

export interface ScenarioResult {
  scenario: TestScenario;
  result: TestResult;
  retryCount: number;
  regression: boolean;
  performanceRegression: boolean;
  baseline?: PerformanceBaseline;
}

export interface PerformanceSummary {
  overallDuration: number;
  averageScenarioDuration: number;
  slowestScenario: string;
  fastestScenario: string;
  memoryUsage: {
    peak: number;
    average: number;
    final: number;
  };
  throughput: {
    recordsPerSecond: number;
    requestsPerSecond: number;
  };
}

export interface RegressionDetection {
  scenarioName: string;
  type: 'functional' | 'performance' | 'data';
  description: string;
  previousResult?: any;
  currentResult: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
}

export interface TestCoverage {
  scenarios: {
    total: number;
    executed: number;
    percentage: number;
  };
  categories: Record<string, number>;
  priorities: Record<string, number>;
  features: Record<string, boolean>;
}

export interface EnvironmentInfo {
  nodeVersion: string;
  platform: string;
  cpuCount: number;
  totalMemory: number;
  availableMemory: number;
  gitCommit?: string;
  buildNumber?: string;
  timestamp: string;
}

export interface PerformanceBaseline {
  scenarioName: string;
  averageDuration: number;
  peakMemory: number;
  throughput: number;
  recordsProcessed: number;
  createdAt: string;
  environment: string;
}

export class RegressionTestSuite {
  private testScenarios: IntegrationTestScenarios;
  private mockServers: Map<string, ExternalSystemMockServer> = new Map();
  private baselines: Map<string, PerformanceBaseline> = new Map();

  constructor() {
    this.testScenarios = new IntegrationTestScenarios();
  }

  /**
   * Run complete regression test suite
   */
  async runRegressionTests(config: RegressionTestConfig): Promise<RegressionTestResult> {
    const runId = this.generateRunId();
    console.log(`🧪 Starting regression test run: ${runId}`);
    
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    try {
      // Initialize test environment
      await this.setupTestEnvironment();
      
      // Load baseline data if benchmarking
      if (config.benchmarkMode && config.baselinePath) {
        await this.loadBaselines(config.baselinePath);
      }

      // Get scenarios to run based on configuration
      const scenarios = this.filterScenarios(config);
      console.log(`📋 Running ${scenarios.length} test scenarios`);

      // Run scenarios
      const scenarioResults = await this.executeScenarios(scenarios, config);

      // Calculate summary and performance metrics
      const endTime = Date.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;

      const summary = this.calculateTestSummary(scenarioResults, duration);
      const performance = this.calculatePerformanceSummary(scenarioResults, startMemory, endMemory, duration);
      const regressions = this.detectRegressions(scenarioResults);

      const result: RegressionTestResult = {
        runId,
        timestamp: new Date().toISOString(),
        configuration: config,
        summary,
        scenarios: scenarioResults,
        performance,
        regressions,
        environment: this.getEnvironmentInfo(),
      };

      // Generate reports if requested
      if (config.generateReport) {
        await this.generateReports(result, config);
      }

      // Update baselines if benchmarking
      if (config.benchmarkMode) {
        await this.updateBaselines(scenarioResults, config);
      }

      console.log(`✅ Regression test run completed: ${runId}`);
      console.log(`📊 Summary: ${summary.passed}/${summary.total} passed (${summary.passRate.toFixed(1)}%)`);
      
      if (regressions.length > 0) {
        console.log(`⚠️  ${regressions.length} regressions detected`);
      }

      return result;

    } finally {
      await this.cleanupTestEnvironment();
    }
  }

  /**
   * Run specific test category
   */
  async runTestCategory(
    category: 'functional' | 'performance' | 'security' | 'reliability' | 'data-integrity',
    config: Partial<RegressionTestConfig> = {}
  ): Promise<RegressionTestResult> {
    const fullConfig: RegressionTestConfig = {
      parallel: true,
      maxConcurrency: 3,
      timeoutMs: 60000,
      retryCount: 2,
      categories: [category],
      priorities: ['critical', 'high', 'medium', 'low'],
      generateReport: true,
      reportFormat: 'json',
      benchmarkMode: false,
      outputPath: './test-results',
      ...config,
    };

    return this.runRegressionTests(fullConfig);
  }

  /**
   * Run critical tests only (for quick CI checks)
   */
  async runCriticalTests(): Promise<RegressionTestResult> {
    return this.runRegressionTests({
      parallel: true,
      maxConcurrency: 5,
      timeoutMs: 30000,
      retryCount: 1,
      categories: ['functional', 'security'],
      priorities: ['critical'],
      generateReport: true,
      reportFormat: 'json',
      benchmarkMode: false,
      outputPath: './test-results',
    });
  }

  /**
   * Run performance benchmarks
   */
  async runPerformanceBenchmarks(baselinePath?: string): Promise<RegressionTestResult> {
    return this.runRegressionTests({
      parallel: false,
      maxConcurrency: 1,
      timeoutMs: 120000,
      retryCount: 0,
      categories: ['performance'],
      priorities: ['critical', 'high', 'medium'],
      generateReport: true,
      reportFormat: 'all',
      benchmarkMode: true,
      baselinePath,
      outputPath: './performance-results',
    });
  }

  /**
   * Setup test environment with mock servers
   */
  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...');
    
    await this.testScenarios.initialize();

    // Start additional mock servers for different provider types
    const mockServerConfigs: Array<{name: string; config: MockServerConfig}> = [
      {
        name: 'google-classroom',
        config: {
          port: 3003,
          providerType: 'google-classroom',
          dataConfig: { organizationCount: 3, userCount: 150, classCount: 20, enrollmentCount: 400 },
          behaviorConfig: {
            responseDelayMs: { min: 100, max: 300 },
            errorRate: 0.01,
            authErrorRate: 0.005,
            dataCorruptionRate: 0.001,
            rateLimitConfig: { enabled: true, requestsPerMinute: 100 },
          },
          features: {
            supportsPagination: true,
            supportsWebhooks: true,
            supportsRealTime: false,
            supportsIncrementalSync: true,
            supportsBulkOperations: false,
          },
        },
      },
      {
        name: 'canvas',
        config: {
          port: 3004,
          providerType: 'canvas',
          dataConfig: { organizationCount: 5, userCount: 300, classCount: 40, enrollmentCount: 800 },
          behaviorConfig: {
            responseDelayMs: { min: 50, max: 150 },
            errorRate: 0.015,
            authErrorRate: 0.01,
            dataCorruptionRate: 0.002,
            rateLimitConfig: { enabled: true, requestsPerMinute: 200 },
          },
          features: {
            supportsPagination: true,
            supportsWebhooks: false,
            supportsRealTime: false,
            supportsIncrementalSync: false,
            supportsBulkOperations: true,
          },
        },
      },
    ];

    // Start mock servers
    for (const { name, config } of mockServerConfigs) {
      const mockServer = new ExternalSystemMockServer(config);
      await mockServer.start();
      this.mockServers.set(name, mockServer);
      console.log(`🎭 Started ${name} mock server on port ${config.port}`);
    }
  }

  /**
   * Cleanup test environment
   */
  private async cleanupTestEnvironment(): Promise<void> {
    console.log('🧹 Cleaning up test environment...');
    
    // Stop mock servers
    for (const [name, server] of this.mockServers) {
      await server.stop();
      console.log(`🛑 Stopped ${name} mock server`);
    }
    this.mockServers.clear();

    // Cleanup test scenarios
    await this.testScenarios.cleanup();
  }

  /**
   * Filter scenarios based on configuration
   */
  private filterScenarios(config: RegressionTestConfig): TestScenario[] {
    const allScenarios = this.testScenarios.getTestScenarios();
    
    return allScenarios.filter(scenario => {
      return config.categories.includes(scenario.category) &&
             config.priorities.includes(scenario.priority);
    });
  }

  /**
   * Execute scenarios with parallel processing and retries
   */
  private async executeScenarios(
    scenarios: TestScenario[],
    config: RegressionTestConfig
  ): Promise<ScenarioResult[]> {
    const results: ScenarioResult[] = [];

    if (config.parallel) {
      // Execute scenarios in parallel with concurrency limit
      const chunks = this.chunkArray(scenarios, config.maxConcurrency);
      
      for (const chunk of chunks) {
        const chunkPromises = chunk.map(scenario => this.executeScenarioWithRetry(scenario, config));
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
      }
    } else {
      // Execute scenarios sequentially
      for (const scenario of scenarios) {
        const result = await this.executeScenarioWithRetry(scenario, config);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Execute single scenario with retry logic
   */
  private async executeScenarioWithRetry(
    scenario: TestScenario,
    config: RegressionTestConfig
  ): Promise<ScenarioResult> {
    console.log(`🧪 Running: ${scenario.name}`);
    
    let lastError: any;
    let retryCount = 0;
    let result: TestResult | null = null;

    while (retryCount <= config.retryCount) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Test timeout')), config.timeoutMs)
        );

        const testPromise = this.testScenarios.runScenario(scenario.name);
        result = await Promise.race([testPromise, timeoutPromise]);
        
        if (result.success) {
          break;
        } else {
          throw new Error(result.errors?.join(', ') || 'Test failed');
        }
      } catch (error) {
        lastError = error;
        retryCount++;
        
        if (retryCount <= config.retryCount) {
          console.log(`🔄 Retrying ${scenario.name} (attempt ${retryCount + 1}/${config.retryCount + 1})`);
          await this.delay(1000 * retryCount); // Exponential backoff
        }
      }
    }

    if (!result || !result.success) {
      result = {
        success: false,
        duration: 0,
        metrics: {
          recordsProcessed: 0,
          apiCalls: 0,
          cacheHits: 0,
          cacheMisses: 0,
          errorCount: 1,
          warningCount: 0,
        },
        errors: [lastError?.message || 'Unknown error'],
      };
    }

    const baseline = this.baselines.get(scenario.name);
    const regression = this.detectFunctionalRegression(result, baseline);
    const performanceRegression = this.detectPerformanceRegression(result, baseline);

    console.log(`${result.success ? '✅' : '❌'} ${scenario.name}: ${result.success ? 'PASS' : 'FAIL'} (${result.duration}ms)`);

    return {
      scenario,
      result,
      retryCount,
      regression,
      performanceRegression,
      baseline,
    };
  }

  /**
   * Calculate test run summary
   */
  private calculateTestSummary(results: ScenarioResult[], duration: number): TestRunSummary {
    const total = results.length;
    const passed = results.filter(r => r.result.success).length;
    const failed = total - passed;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    const categories: Record<string, number> = {};
    const priorities: Record<string, number> = {};
    const features: Record<string, boolean> = {
      externalIdMapping: true,
      dataSync: true,
      changeTracking: true,
      conflictResolution: true,
      authentication: true,
      security: true,
      caching: true,
      monitoring: true,
    };

    results.forEach(r => {
      categories[r.scenario.category] = (categories[r.scenario.category] || 0) + 1;
      priorities[r.scenario.priority] = (priorities[r.scenario.priority] || 0) + 1;
    });

    return {
      total,
      passed,
      failed,
      skipped: 0,
      duration,
      passRate,
      coverage: {
        scenarios: {
          total,
          executed: total,
          percentage: 100,
        },
        categories,
        priorities,
        features,
      },
    };
  }

  /**
   * Calculate performance summary
   */
  private calculatePerformanceSummary(
    results: ScenarioResult[],
    startMemory: NodeJS.MemoryUsage,
    endMemory: NodeJS.MemoryUsage,
    duration: number
  ): PerformanceSummary {
    const durations = results.map(r => r.result.duration);
    const totalRecords = results.reduce((sum, r) => sum + r.result.metrics.recordsProcessed, 0);
    const totalRequests = results.reduce((sum, r) => sum + r.result.metrics.apiCalls, 0);

    const averageScenarioDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const slowestResult = results.reduce((max, r) => r.result.duration > max.result.duration ? r : max);
    const fastestResult = results.reduce((min, r) => r.result.duration < min.result.duration ? r : min);

    return {
      overallDuration: duration,
      averageScenarioDuration,
      slowestScenario: slowestResult.scenario.name,
      fastestScenario: fastestResult.scenario.name,
      memoryUsage: {
        peak: Math.max(startMemory.heapUsed, endMemory.heapUsed),
        average: (startMemory.heapUsed + endMemory.heapUsed) / 2,
        final: endMemory.heapUsed,
      },
      throughput: {
        recordsPerSecond: duration > 0 ? (totalRecords / duration) * 1000 : 0,
        requestsPerSecond: duration > 0 ? (totalRequests / duration) * 1000 : 0,
      },
    };
  }

  /**
   * Detect regressions compared to baseline
   */
  private detectRegressions(results: ScenarioResult[]): RegressionDetection[] {
    const regressions: RegressionDetection[] = [];

    for (const result of results) {
      if (result.regression) {
        regressions.push({
          scenarioName: result.scenario.name,
          type: 'functional',
          description: 'Test that previously passed is now failing',
          currentResult: result.result,
          severity: result.scenario.priority === 'critical' ? 'critical' : 'high',
          impact: 'Test failure indicates potential regression in functionality',
        });
      }

      if (result.performanceRegression) {
        regressions.push({
          scenarioName: result.scenario.name,
          type: 'performance',
          description: 'Performance has degraded compared to baseline',
          previousResult: result.baseline,
          currentResult: result.result,
          severity: 'medium',
          impact: 'Performance degradation may affect user experience',
        });
      }
    }

    return regressions;
  }

  /**
   * Generate test reports in various formats
   */
  private async generateReports(result: RegressionTestResult, config: RegressionTestConfig): Promise<void> {
    console.log('📄 Generating test reports...');
    
    // Ensure output directory exists
    await fs.mkdir(config.outputPath, { recursive: true });

    const formats = config.reportFormat === 'all' 
      ? ['json', 'xml', 'html'] 
      : [config.reportFormat];

    for (const format of formats) {
      switch (format) {
        case 'json':
          await this.generateJSONReport(result, config.outputPath);
          break;
        case 'xml':
          await this.generateXMLReport(result, config.outputPath);
          break;
        case 'html':
          await this.generateHTMLReport(result, config.outputPath);
          break;
      }
    }
  }

  /**
   * Generate JSON report
   */
  private async generateJSONReport(result: RegressionTestResult, outputPath: string): Promise<void> {
    const reportPath = path.join(outputPath, `test-report-${result.runId}.json`);
    await fs.writeFile(reportPath, JSON.stringify(result, null, 2));
    console.log(`📄 JSON report generated: ${reportPath}`);
  }

  /**
   * Generate XML report (JUnit format)
   */
  private async generateXMLReport(result: RegressionTestResult, outputPath: string): Promise<void> {
    const xml = this.generateJUnitXML(result);
    const reportPath = path.join(outputPath, `test-report-${result.runId}.xml`);
    await fs.writeFile(reportPath, xml);
    console.log(`📄 XML report generated: ${reportPath}`);
  }

  /**
   * Generate HTML report
   */
  private async generateHTMLReport(result: RegressionTestResult, outputPath: string): Promise<void> {
    const html = this.generateHTMLContent(result);
    const reportPath = path.join(outputPath, `test-report-${result.runId}.html`);
    await fs.writeFile(reportPath, html);
    console.log(`📄 HTML report generated: ${reportPath}`);
  }

  /**
   * Load performance baselines
   */
  private async loadBaselines(baselinePath: string): Promise<void> {
    try {
      const baselineData = await fs.readFile(baselinePath, 'utf8');
      const baselines: PerformanceBaseline[] = JSON.parse(baselineData);
      
      for (const baseline of baselines) {
        this.baselines.set(baseline.scenarioName, baseline);
      }
      
      console.log(`📊 Loaded ${baselines.length} performance baselines`);
    } catch (error) {
      console.log(`⚠️  Could not load baselines from ${baselinePath}: ${error.message}`);
    }
  }

  /**
   * Update performance baselines
   */
  private async updateBaselines(results: ScenarioResult[], config: RegressionTestConfig): Promise<void> {
    const baselines: PerformanceBaseline[] = [];
    
    for (const result of results) {
      if (result.result.success) {
        baselines.push({
          scenarioName: result.scenario.name,
          averageDuration: result.result.duration,
          peakMemory: result.result.metrics.memoryUsage || 0,
          throughput: result.result.duration > 0 ? (result.result.metrics.recordsProcessed / result.result.duration) * 1000 : 0,
          recordsProcessed: result.result.metrics.recordsProcessed,
          createdAt: new Date().toISOString(),
          environment: this.getEnvironmentInfo().platform,
        });
      }
    }
    
    const baselineFilePath = path.join(config.outputPath, 'baselines.json');
    await fs.writeFile(baselineFilePath, JSON.stringify(baselines, null, 2));
    console.log(`📊 Updated ${baselines.length} performance baselines`);
  }

  // Helper methods

  private generateRunId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private detectFunctionalRegression(result: TestResult, baseline?: PerformanceBaseline): boolean {
    // A functional regression is when a test that previously passed now fails
    return baseline !== undefined && result.success === false;
  }

  private detectPerformanceRegression(result: TestResult, baseline?: PerformanceBaseline): boolean {
    if (!baseline) return false;
    
    // Performance regression if current duration is 50% slower than baseline
    const threshold = baseline.averageDuration * 1.5;
    return result.duration > threshold;
  }

  private getEnvironmentInfo(): EnvironmentInfo {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      cpuCount: require('os').cpus().length,
      totalMemory: require('os').totalmem(),
      availableMemory: require('os').freemem(),
      gitCommit: process.env.GIT_COMMIT,
      buildNumber: process.env.BUILD_NUMBER,
      timestamp: new Date().toISOString(),
    };
  }

  private generateJUnitXML(result: RegressionTestResult): string {
    const testsuites = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Integration Test Suite" tests="${result.summary.total}" failures="${result.summary.failed}" time="${result.summary.duration / 1000}">
  <testsuite name="Integration Tests" tests="${result.summary.total}" failures="${result.summary.failed}" time="${result.summary.duration / 1000}">
    ${result.scenarios.map(s => `
    <testcase classname="${s.scenario.category}" name="${s.scenario.name}" time="${s.result.duration / 1000}">
      ${!s.result.success ? `<failure message="${s.result.errors?.[0] || 'Test failed'}">${s.result.errors?.join('\n') || 'Unknown failure'}</failure>` : ''}
    </testcase>`).join('')}
  </testsuite>
</testsuites>`;
    
    return testsuites;
  }

  private generateHTMLContent(result: RegressionTestResult): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Integration Test Report - ${result.runId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .pass { color: green; } .fail { color: red; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .regression { background-color: #ffebee; }
    </style>
</head>
<body>
    <h1>Integration Test Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p>Run ID: ${result.runId}</p>
        <p>Timestamp: ${result.timestamp}</p>
        <p>Total Tests: ${result.summary.total}</p>
        <p>Passed: <span class="pass">${result.summary.passed}</span></p>
        <p>Failed: <span class="fail">${result.summary.failed}</span></p>
        <p>Pass Rate: ${result.summary.passRate.toFixed(1)}%</p>
        <p>Duration: ${(result.summary.duration / 1000).toFixed(2)}s</p>
    </div>
    
    ${result.regressions.length > 0 ? `
    <div style="background: #ffebee; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <h2>Regressions Detected (${result.regressions.length})</h2>
        <ul>
            ${result.regressions.map(r => `<li><strong>${r.scenarioName}</strong>: ${r.description}</li>`).join('')}
        </ul>
    </div>
    ` : ''}
    
    <h2>Test Results</h2>
    <table>
        <thead>
            <tr>
                <th>Scenario</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Result</th>
                <th>Duration (ms)</th>
                <th>Records</th>
                <th>Errors</th>
            </tr>
        </thead>
        <tbody>
            ${result.scenarios.map(s => `
            <tr class="${s.regression ? 'regression' : ''}">
                <td>${s.scenario.name}</td>
                <td>${s.scenario.category}</td>
                <td>${s.scenario.priority}</td>
                <td class="${s.result.success ? 'pass' : 'fail'}">${s.result.success ? 'PASS' : 'FAIL'}</td>
                <td>${s.result.duration}</td>
                <td>${s.result.metrics.recordsProcessed}</td>
                <td>${s.result.metrics.errorCount}</td>
            </tr>`).join('')}
        </tbody>
    </table>
</body>
</html>`;
  }
}
