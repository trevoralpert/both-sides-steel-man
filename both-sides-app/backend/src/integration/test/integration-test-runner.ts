#!/usr/bin/env node

import { ContinuousTestingPipeline, PipelineConfig } from './pipeline/continuous-testing-pipeline';
import { RegressionTestSuite } from './automation/regression-test-suite';
import { IntegrationTestScenarios } from './scenarios/integration-test-scenarios';
import { DataValidationTools } from './validation/data-validation-tools';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { ExternalIdMappingService } from '../services/external-id-mapping.service';
import { ChangeTrackingService } from '../services/change-tracking/change-tracking.service';
import * as yargs from 'yargs';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Integration Test Runner
 * 
 * Command-line interface for executing integration tests with various
 * configurations and modes. Supports local development, CI/CD integration,
 * and production validation scenarios.
 * 
 * Usage Examples:
 * npm run test:integration                          # Run all critical tests
 * npm run test:integration -- --suite functional   # Run functional tests only
 * npm run test:integration -- --performance        # Run performance benchmarks
 * npm run test:integration -- --pipeline ci        # Run CI pipeline
 * npm run test:integration -- --validate-data      # Run data validation only
 * npm run test:integration -- --load-test          # Run load tests
 * npm run test:integration -- --config custom.json # Use custom configuration
 */

interface CLIOptions {
  suite?: 'functional' | 'performance' | 'security' | 'reliability' | 'data-integrity' | 'all';
  scenario?: string;
  pipeline?: 'ci' | 'cd' | 'dev' | 'prod';
  performance?: boolean;
  security?: boolean;
  validation?: boolean;
  loadTest?: boolean;
  config?: string;
  output?: string;
  format?: 'json' | 'xml' | 'html' | 'all';
  parallel?: boolean;
  timeout?: number;
  retries?: number;
  verbose?: boolean;
  dryRun?: boolean;
  baseline?: string;
  environment?: 'development' | 'staging' | 'production';
  cleanup?: boolean;
  help?: boolean;
}

class IntegrationTestRunner {
  private pipeline: ContinuousTestingPipeline;
  private regressionSuite: RegressionTestSuite;
  private testScenarios: IntegrationTestScenarios;
  private validationTools: DataValidationTools;

  constructor() {
    // Initialize services (in a real implementation, these would be properly injected)
    const mockPrisma = this.createMockPrismaService();
    const mockRedis = this.createMockRedisService();
    const mockMappingService = {} as ExternalIdMappingService;
    const mockChangeTracking = {} as ChangeTrackingService;

    this.pipeline = new ContinuousTestingPipeline(mockPrisma, mockRedis);
    this.regressionSuite = new RegressionTestSuite();
    this.testScenarios = new IntegrationTestScenarios();
    this.validationTools = new DataValidationTools(
      mockPrisma,
      mockRedis,
      mockMappingService,
      mockChangeTracking
    );
  }

  /**
   * Main entry point for CLI
   */
  async run(argv: string[]): Promise<void> {
    const options = this.parseArguments(argv);

    if (options.help) {
      this.printHelp();
      return;
    }

    console.log('🚀 Starting Integration Test Runner...\n');

    try {
      if (options.dryRun) {
        console.log('🏃 Dry run mode - showing what would be executed:\n');
        await this.showDryRun(options);
        return;
      }

      await this.executeTests(options);
      
      console.log('\n✅ Integration Test Runner completed successfully!');
      process.exit(0);

    } catch (error) {
      console.error('\n❌ Integration Test Runner failed:', error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  /**
   * Execute tests based on options
   */
  private async executeTests(options: CLIOptions): Promise<void> {
    if (options.pipeline) {
      await this.runPipeline(options);
    } else if (options.suite) {
      await this.runTestSuite(options);
    } else if (options.scenario) {
      await this.runScenario(options);
    } else if (options.performance) {
      await this.runPerformanceTests(options);
    } else if (options.security) {
      await this.runSecurityTests(options);
    } else if (options.validation) {
      await this.runValidationTests(options);
    } else if (options.loadTest) {
      await this.runLoadTests(options);
    } else {
      // Default: run critical tests
      await this.runCriticalTests(options);
    }
  }

  /**
   * Run pipeline mode
   */
  private async runPipeline(options: CLIOptions): Promise<void> {
    const config = await this.loadPipelineConfig(options);
    const result = await this.pipeline.executePipeline(config);
    
    console.log(`\n📊 Pipeline Results:`);
    console.log(`   Status: ${result.status.toUpperCase()}`);
    console.log(`   Duration: ${Math.round(result.duration / 1000)}s`);
    console.log(`   Test Suites: ${result.testSuites.length}`);
    console.log(`   Quality Gates: ${result.qualityGates.filter(g => g.passed).length}/${result.qualityGates.length} passed`);
    
    if (result.artifacts.length > 0) {
      console.log(`   Artifacts: ${result.artifacts.length} generated`);
    }
  }

  /**
   * Run specific test suite
   */
  private async runTestSuite(options: CLIOptions): Promise<void> {
    console.log(`🧪 Running ${options.suite} test suite...`);
    
    if (options.suite === 'all') {
      const config = this.createRegressionConfig(options);
      const result = await this.regressionSuite.runRegressionTests(config);
      this.printTestResults(result.summary, result.regressions);
    } else {
      const result = await this.regressionSuite.runTestCategory(options.suite!);
      this.printTestResults(result.summary, result.regressions);
    }
  }

  /**
   * Run specific scenario
   */
  private async runScenario(options: CLIOptions): Promise<void> {
    console.log(`🎯 Running scenario: ${options.scenario}`);
    
    await this.testScenarios.initialize();
    const result = await this.testScenarios.runScenario(options.scenario!);
    await this.testScenarios.cleanup();

    console.log(`\n📊 Scenario Results:`);
    console.log(`   Status: ${result.success ? 'PASS' : 'FAIL'}`);
    console.log(`   Duration: ${result.duration}ms`);
    console.log(`   Records: ${result.metrics.recordsProcessed}`);
    console.log(`   Errors: ${result.metrics.errorCount}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log(`\n❌ Errors:`);
      result.errors.forEach(error => console.log(`   • ${error}`));
    }
  }

  /**
   * Run performance tests
   */
  private async runPerformanceTests(options: CLIOptions): Promise<void> {
    console.log('⚡ Running performance tests...');
    
    const result = await this.regressionSuite.runPerformanceBenchmarks(options.baseline);
    this.printPerformanceResults(result.performance, result.regressions);
  }

  /**
   * Run security tests
   */
  private async runSecurityTests(options: CLIOptions): Promise<void> {
    console.log('🔒 Running security tests...');
    
    const result = await this.regressionSuite.runTestCategory('security');
    this.printSecurityResults(result.summary, result.scenarios);
  }

  /**
   * Run validation tests
   */
  private async runValidationTests(options: CLIOptions): Promise<void> {
    console.log('🔍 Running data validation tests...');
    
    const integrityResult = await this.validationTools.validateDataIntegrity();
    const syncResult = await this.validationTools.verifySyncAccuracy('test-system');
    const errorResult = await this.validationTools.testErrorHandling();

    console.log(`\n📊 Validation Results:`);
    console.log(`   Data Integrity: ${integrityResult.valid ? 'PASS' : 'FAIL'} (${integrityResult.score.toFixed(1)}%)`);
    console.log(`   Sync Accuracy: ${syncResult.accurate ? 'PASS' : 'FAIL'} (${syncResult.accuracyScore.toFixed(1)}%)`);
    console.log(`   Error Handling: ${Object.values(errorResult).every(r => r) ? 'PASS' : 'FAIL'}`);
    
    if (integrityResult.errors.length > 0) {
      console.log(`\n❌ Data Integrity Errors (${integrityResult.errors.length}):`);
      integrityResult.errors.slice(0, 5).forEach(error => {
        console.log(`   • ${error.entityType}:${error.entityId} - ${error.message}`);
      });
    }

    if (integrityResult.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      integrityResult.recommendations.forEach(rec => console.log(`   • ${rec}`));
    }
  }

  /**
   * Run load tests
   */
  private async runLoadTests(options: CLIOptions): Promise<void> {
    console.log('🏋️ Running load tests...');
    
    const loadConfig = {
      recordCount: 1000,
      concurrentUsers: 10,
      duration: 60, // 1 minute
      rampUpTime: 10,
      operations: [
        { type: 'read' as const, weight: 70, entityType: 'user' },
        { type: 'write' as const, weight: 20, entityType: 'user' },
        { type: 'update' as const, weight: 10, entityType: 'user' },
      ],
      thresholds: {
        maxResponseTime: 1000,
        maxErrorRate: 5,
        minThroughput: 100,
        maxMemoryUsage: 512,
        maxCpuUsage: 80,
      },
    };

    const result = await this.validationTools.performLoadTesting(loadConfig);
    this.printLoadTestResults(result);
  }

  /**
   * Run critical tests (default)
   */
  private async runCriticalTests(options: CLIOptions): Promise<void> {
    console.log('⚡ Running critical tests...');
    
    const result = await this.regressionSuite.runCriticalTests();
    this.printTestResults(result.summary, result.regressions);
  }

  /**
   * Show dry run
   */
  private async showDryRun(options: CLIOptions): Promise<void> {
    console.log('📋 Test Plan:');
    
    if (options.pipeline) {
      const config = await this.loadPipelineConfig(options);
      console.log(`   Pipeline: ${options.pipeline}`);
      console.log(`   Environment: ${config.environment}`);
      console.log(`   Test Suites: ${config.testSuites.length}`);
      console.log(`   Quality Gates: ${config.qualityGates.length}`);
    } else {
      const scenarios = this.testScenarios.getTestScenarios();
      const filtered = scenarios.filter(s => 
        !options.suite || s.category === options.suite || options.suite === 'all'
      );
      
      console.log(`   Scenarios: ${filtered.length}`);
      console.log(`   Categories: ${[...new Set(filtered.map(s => s.category))].join(', ')}`);
      console.log(`   Priorities: ${[...new Set(filtered.map(s => s.priority))].join(', ')}`);
    }

    console.log(`   Output: ${options.output || './test-results'}`);
    console.log(`   Format: ${options.format || 'json'}`);
    console.log(`   Parallel: ${options.parallel !== false}`);
    console.log(`   Timeout: ${options.timeout || 60000}ms`);
  }

  // Configuration and helper methods

  private parseArguments(argv: string[]): CLIOptions {
    return yargs(argv.slice(2))
      .option('suite', {
        type: 'string',
        choices: ['functional', 'performance', 'security', 'reliability', 'data-integrity', 'all'],
        description: 'Run specific test suite',
      })
      .option('scenario', {
        type: 'string',
        description: 'Run specific test scenario',
      })
      .option('pipeline', {
        type: 'string',
        choices: ['ci', 'cd', 'dev', 'prod'],
        description: 'Run in pipeline mode',
      })
      .option('performance', {
        type: 'boolean',
        description: 'Run performance benchmarks',
      })
      .option('security', {
        type: 'boolean',
        description: 'Run security tests',
      })
      .option('validation', {
        type: 'boolean',
        description: 'Run data validation tests',
      })
      .option('load-test', {
        type: 'boolean',
        description: 'Run load tests',
      })
      .option('config', {
        type: 'string',
        description: 'Custom configuration file',
      })
      .option('output', {
        type: 'string',
        default: './test-results',
        description: 'Output directory',
      })
      .option('format', {
        type: 'string',
        choices: ['json', 'xml', 'html', 'all'],
        default: 'json',
        description: 'Report format',
      })
      .option('parallel', {
        type: 'boolean',
        default: true,
        description: 'Run tests in parallel',
      })
      .option('timeout', {
        type: 'number',
        default: 60000,
        description: 'Test timeout in milliseconds',
      })
      .option('retries', {
        type: 'number',
        default: 2,
        description: 'Number of retries for failed tests',
      })
      .option('verbose', {
        type: 'boolean',
        default: false,
        description: 'Verbose output',
      })
      .option('dry-run', {
        type: 'boolean',
        default: false,
        description: 'Show what would be executed without running',
      })
      .option('baseline', {
        type: 'string',
        description: 'Performance baseline file',
      })
      .option('environment', {
        type: 'string',
        choices: ['development', 'staging', 'production'],
        default: 'development',
        description: 'Target environment',
      })
      .option('cleanup', {
        type: 'boolean',
        default: true,
        description: 'Clean up after tests',
      })
      .option('help', {
        type: 'boolean',
        alias: 'h',
        description: 'Show help',
      })
      .argv as CLIOptions;
  }

  private async loadPipelineConfig(options: CLIOptions): Promise<PipelineConfig> {
    if (options.config) {
      const configPath = path.resolve(options.config);
      const configData = await fs.readFile(configPath, 'utf8');
      return JSON.parse(configData);
    }

    return this.createDefaultPipelineConfig(options);
  }

  private createDefaultPipelineConfig(options: CLIOptions): PipelineConfig {
    return {
      environment: options.environment || 'development',
      trigger: {
        type: 'manual',
      },
      testSuites: [
        {
          name: 'Integration Tests',
          type: 'integration',
          enabled: true,
          parallel: options.parallel !== false,
          timeout: options.timeout || 60000,
          retryCount: options.retries || 2,
          config: {},
        },
        {
          name: 'Validation Tests',
          type: 'validation',
          enabled: options.validation || false,
          parallel: false,
          timeout: 120000,
          retryCount: 1,
          config: {},
        },
      ],
      reporting: {
        formats: [options.format || 'json'],
        destinations: [
          {
            type: 'file',
            config: { path: options.output || './test-results' },
          },
        ],
        retention: 30,
        publicReports: false,
        comparisons: false,
      },
      notifications: {
        enabled: false,
        channels: [],
        conditions: [],
        templates: {},
      },
      qualityGates: [
        {
          name: 'Test Pass Rate',
          type: 'test_pass_rate',
          threshold: 95,
          operator: '>=',
          action: 'fail',
        },
      ],
      artifacts: {
        enabled: true,
        types: ['reports', 'logs'],
        retention: 7,
        compression: false,
        storage: 'local',
      },
      cleanup: {
        enabled: options.cleanup !== false,
        testData: true,
        tempFiles: true,
        logs: false,
        artifacts: false,
        retentionDays: 7,
      },
    };
  }

  private createRegressionConfig(options: CLIOptions): any {
    return {
      parallel: options.parallel !== false,
      maxConcurrency: 5,
      timeoutMs: options.timeout || 60000,
      retryCount: options.retries || 2,
      categories: options.suite === 'all' 
        ? ['functional', 'performance', 'security', 'reliability', 'data-integrity']
        : [options.suite],
      priorities: ['critical', 'high', 'medium', 'low'],
      generateReport: true,
      reportFormat: options.format || 'json',
      benchmarkMode: options.performance || false,
      baselinePath: options.baseline,
      outputPath: options.output || './test-results',
    };
  }

  // Output formatting methods

  private printTestResults(summary: any, regressions: any[]): void {
    console.log(`\n📊 Test Results:`);
    console.log(`   Total: ${summary.total}`);
    console.log(`   Passed: ${summary.passed}`);
    console.log(`   Failed: ${summary.failed}`);
    console.log(`   Pass Rate: ${summary.passRate.toFixed(1)}%`);
    console.log(`   Duration: ${Math.round(summary.duration / 1000)}s`);
    
    if (regressions.length > 0) {
      console.log(`\n⚠️  Regressions (${regressions.length}):`);
      regressions.slice(0, 5).forEach(r => {
        console.log(`   • ${r.scenarioName}: ${r.description}`);
      });
    }
  }

  private printPerformanceResults(performance: any, regressions: any[]): void {
    console.log(`\n⚡ Performance Results:`);
    console.log(`   Duration: ${Math.round(performance.overallDuration / 1000)}s`);
    console.log(`   Throughput: ${performance.throughput.recordsPerSecond.toFixed(1)} records/sec`);
    console.log(`   Memory: ${Math.round(performance.memoryUsage.peak / 1024 / 1024)}MB peak`);
    console.log(`   Slowest: ${performance.slowestScenario}`);
    console.log(`   Fastest: ${performance.fastestScenario}`);
    
    if (regressions.some(r => r.type === 'performance')) {
      const perfRegressions = regressions.filter(r => r.type === 'performance');
      console.log(`\n⚠️  Performance Regressions (${perfRegressions.length}):`);
      perfRegressions.slice(0, 3).forEach(r => {
        console.log(`   • ${r.scenarioName}: ${r.description}`);
      });
    }
  }

  private printSecurityResults(summary: any, scenarios: any[]): void {
    console.log(`\n🔒 Security Test Results:`);
    console.log(`   Pass Rate: ${summary.passRate.toFixed(1)}%`);
    console.log(`   Critical Tests: ${scenarios.filter(s => s.scenario.priority === 'critical').length}`);
    
    const failed = scenarios.filter(s => !s.result.success);
    if (failed.length > 0) {
      console.log(`\n❌ Failed Security Tests (${failed.length}):`);
      failed.slice(0, 5).forEach(s => {
        console.log(`   • ${s.scenario.name}: ${s.result.errors?.[0] || 'Test failed'}`);
      });
    }
  }

  private printLoadTestResults(result: any): void {
    console.log(`\n🏋️ Load Test Results:`);
    console.log(`   Success: ${result.success ? 'PASS' : 'FAIL'}`);
    console.log(`   Operations: ${result.summary.totalOperations}`);
    console.log(`   Throughput: ${result.summary.throughput.toFixed(1)} ops/sec`);
    console.log(`   Error Rate: ${result.summary.errorRate.toFixed(1)}%`);
    console.log(`   Avg Response: ${result.summary.averageResponseTime.toFixed(1)}ms`);
    console.log(`   Peak Memory: ${Math.round(result.performance.peakMemoryUsage)}MB`);
    
    if (result.thresholdViolations.length > 0) {
      console.log(`\n⚠️  Threshold Violations (${result.thresholdViolations.length}):`);
      result.thresholdViolations.forEach(v => {
        console.log(`   • ${v.threshold}: ${v.actual} ${v.message}`);
      });
    }
  }

  private printHelp(): void {
    console.log(`
🧪 Integration Test Runner

Usage: npm run test:integration [options]

Commands:
  --suite <type>          Run specific test suite (functional, performance, security, etc.)
  --scenario <name>       Run specific test scenario
  --pipeline <mode>       Run in pipeline mode (ci, cd, dev, prod)
  --performance          Run performance benchmarks
  --security             Run security tests
  --validation           Run data validation tests  
  --load-test            Run load tests

Options:
  --config <file>        Custom configuration file
  --output <dir>         Output directory (default: ./test-results)
  --format <type>        Report format: json, xml, html, all (default: json)
  --parallel             Run tests in parallel (default: true)
  --timeout <ms>         Test timeout in milliseconds (default: 60000)
  --retries <num>        Number of retries (default: 2)
  --baseline <file>      Performance baseline file
  --environment <env>    Target environment (development, staging, production)
  --verbose              Verbose output
  --dry-run              Show execution plan without running
  --no-cleanup           Skip cleanup after tests
  --help, -h             Show this help message

Examples:
  npm run test:integration                          # Run critical tests
  npm run test:integration -- --suite functional   # Run functional tests  
  npm run test:integration -- --performance        # Run performance tests
  npm run test:integration -- --pipeline ci        # Run CI pipeline
  npm run test:integration -- --load-test          # Run load tests
  npm run test:integration -- --dry-run            # Show execution plan
    `);
  }

  // Mock services for standalone operation
  private createMockPrismaService(): any {
    return {
      integration: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
      externalSystemMapping: { findUnique: jest.fn(), upsert: jest.fn(), findMany: jest.fn() },
      integrationAuditLog: { create: jest.fn() },
      integrationConfiguration: { findUnique: jest.fn(), upsert: jest.fn() },
    };
  }

  private createMockRedisService(): any {
    const storage = new Map();
    return {
      get: jest.fn((key: string) => Promise.resolve(storage.get(key) || null)),
      set: jest.fn((key: string, value: any) => Promise.resolve(storage.set(key, value))),
      setex: jest.fn((key: string, ttl: number, value: any) => Promise.resolve(storage.set(key, value))),
      del: jest.fn((key: string) => Promise.resolve(storage.delete(key))),
    };
  }
}

// CLI entry point
if (require.main === module) {
  const runner = new IntegrationTestRunner();
  runner.run(process.argv).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { IntegrationTestRunner };
