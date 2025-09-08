# 🚀 Both Sides - CI/CD Pipeline Documentation

## Overview

This repository uses a comprehensive CI/CD pipeline built with GitHub Actions to ensure code quality, performance, and reliability. Our automated testing and deployment pipeline includes multiple workflows designed to catch issues early and maintain high standards.

## 📋 Workflow Overview

### 🔧 Core Workflows

| Workflow | Trigger | Purpose | Duration |
|----------|---------|---------|----------|
| **🚀 Continuous Integration** | Push, PR | Complete test suite, quality gates | ~8 min |
| **🔍 Pull Request Validation** | PR open/sync | Fast validation and analysis | ~5 min |
| **📊 Performance Monitoring** | Daily, main push | Performance baselines and regression detection | ~15 min |
| **🧪 Test Quality & Flaky Detection** | Every 6h, test changes | Test reliability and performance analysis | ~10 min |

### 🎯 Workflow Details

#### 🚀 Continuous Integration (`ci.yml`)
**Triggers**: Push to main/develop, Pull Requests

**Jobs**:
1. **🔧 Setup & Validation** - Change detection and test matrix generation
2. **📦 Install Dependencies** - Dependency caching and installation
3. **🧪 Parallel Testing** - Unit, integration, type checking, linting
4. **🎭 E2E Tests** - End-to-end testing (conditional)
5. **⚡ Load Tests** - Performance testing (main branch only)
6. **🛡️ Quality Gates** - Coverage enforcement and failure detection
7. **📢 Notifications** - Slack alerts and status updates
8. **🧹 Cleanup** - Artifact management and finalization

**Key Features**:
- ✅ Parallel test execution for speed
- ✅ Smart change detection to skip unnecessary tests
- ✅ Comprehensive quality gates
- ✅ Automated notifications
- ✅ Coverage reporting and enforcement

#### 🔍 Pull Request Validation (`pr-validation.yml`)
**Triggers**: PR opened, synchronized, reopened

**Jobs**:
1. **📋 PR Analysis** - Change analysis and test strategy determination
2. **⚡ Fast Validation** - Type checking, linting, formatting
3. **🧪 Comprehensive Tests** - Full test suite (conditional)
4. **🛡️ Security & Quality** - Security audit and code quality analysis
5. **⚡ Performance Check** - Performance impact assessment
6. **📋 PR Summary** - Automated PR comments with results

**Key Features**:
- ✅ Intelligent test strategy based on changes
- ✅ Automated PR analysis and comments
- ✅ Security vulnerability scanning
- ✅ Performance impact assessment
- ✅ Bundle size analysis

#### 📊 Performance Monitoring (`performance-monitoring.yml`)
**Triggers**: Daily schedule, main branch pushes, manual dispatch

**Jobs**:
1. **📏 Performance Baseline** - Establish performance metrics
2. **🏮 Lighthouse Audit** - Web performance, accessibility, SEO
3. **⚡ Load Testing** - WebSocket and API performance testing
4. **📈 Regression Analysis** - Performance trend analysis
5. **📊 Dashboard Update** - Metrics reporting to monitoring systems
6. **📢 Notifications** - Performance alerts and summaries

**Key Features**:
- ✅ Automated performance baselines
- ✅ Lighthouse performance audits
- ✅ Load testing with k6
- ✅ Performance regression detection
- ✅ Integration with monitoring dashboards

#### 🧪 Test Quality & Flaky Detection (`test-quality.yml`)
**Triggers**: Every 6 hours, test file changes, manual dispatch

**Jobs**:
1. **📊 Test Suite Analysis** - Test inventory and structure analysis
2. **🎲 Flaky Test Detection** - Multiple test runs to detect inconsistencies
3. **📈 Flaky Analysis** - Statistical analysis of test reliability
4. **⚡ Test Performance** - Test execution time analysis
5. **📋 Quality Summary** - Overall test quality metrics and reporting

**Key Features**:
- ✅ Automated flaky test detection
- ✅ Test performance monitoring
- ✅ Quality score calculation
- ✅ Detailed analysis reports
- ✅ Proactive quality alerts

## 🛠️ Configuration

### Environment Variables

| Variable | Required | Purpose | Example |
|----------|----------|---------|---------|
| `SLACK_WEBHOOK_URL` | Optional | Slack notifications | `https://hooks.slack.com/...` |
| `LOAD_TEST_BASE_URL` | Optional | Load testing target | `https://staging.bothsides.app` |
| `E2E_BASE_URL` | Optional | E2E testing target | `https://staging.bothsides.app` |
| `MONITORING_WEBHOOK_URL` | Optional | Performance monitoring | `https://monitoring.bothsides.app/webhook` |

### Secrets Setup

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:
   - `SLACK_WEBHOOK_URL` - For Slack notifications
   - `LOAD_TEST_BASE_URL` - Target URL for load testing
   - `LOAD_TEST_API_URL` - API endpoint for load testing
   - `LOAD_TEST_WS_URL` - WebSocket endpoint for load testing

### Quality Gates

#### Coverage Thresholds
- **Lines**: 80%
- **Branches**: 75%
- **Functions**: 70%
- **Statements**: 80%

#### Performance Thresholds
- **Response Time**: P95 < 500ms
- **Error Rate**: < 5%
- **Lighthouse Performance**: > 80
- **Load Test Success Rate**: > 95%

#### Test Quality Thresholds
- **Flaky Test Tolerance**: 0%
- **Test Execution Time**: < 5 minutes
- **Coverage Regression**: < 5%

## 🚦 Status Checks

### Required Status Checks
The following checks must pass before merging:
- ✅ **Type Checking** - TypeScript compilation
- ✅ **Linting** - ESLint validation
- ✅ **Unit Tests** - Jest test suite
- ✅ **Integration Tests** - API and database tests
- ✅ **Security Audit** - Dependency vulnerability scan

### Optional Status Checks
- 🎭 **E2E Tests** - Full application testing (main branch)
- ⚡ **Load Tests** - Performance validation (main branch)
- 📊 **Performance Check** - Bundle size and metrics

## 🔧 Local Development

### Running Tests Locally
```bash
# Full test suite
yarn check-all

# Individual test types
yarn test              # Unit tests
yarn test:integration  # Integration tests
yarn playwright test   # E2E tests
yarn load-test         # Load tests

# Validation
yarn type-check        # TypeScript
yarn lint              # ESLint
yarn format:check      # Prettier
yarn workflows:validate # GitHub Actions
```

### Pre-commit Validation
```bash
# Comprehensive validation
yarn ci:validate

# Quick validation
yarn type-check && yarn lint
```

## 📊 Monitoring and Reporting

### Test Results
- **Coverage Reports**: Available in workflow artifacts
- **Test Results**: JUnit XML format for integration
- **Performance Reports**: JSON and HTML formats
- **Flaky Test Reports**: Detailed analysis with recommendations

### Notifications
- **Slack Channels**:
  - `#engineering` - CI/CD status updates
  - `#performance-monitoring` - Performance alerts
  - `#test-quality` - Test quality reports

### Dashboards
- **GitHub Actions**: Workflow run history and metrics
- **Coverage**: Integrated coverage reporting
- **Performance**: Lighthouse scores and load test results

## 🛡️ Security

### Security Scanning
- **Dependency Audit**: Automated vulnerability scanning
- **Code Quality**: Static analysis for common issues
- **Secret Detection**: Prevents accidental secret commits

### Best Practices
- ✅ Minimal required permissions
- ✅ Secure secret handling
- ✅ Input validation and sanitization
- ✅ Fail-fast on security issues

## 🚀 Deployment Pipeline

### Branch Strategy
- **`main`**: Production-ready code, full test suite
- **`develop`**: Integration branch, comprehensive testing
- **Feature branches**: Fast validation, conditional E2E

### Deployment Triggers
- **Staging**: Automatic on `develop` branch
- **Production**: Manual approval after `main` branch validation
- **Preview**: Automatic for pull requests

## 📝 Troubleshooting

### Common Issues

#### Test Failures
1. Check test logs in workflow artifacts
2. Run tests locally to reproduce
3. Review recent changes for breaking modifications
4. Check for flaky tests in quality reports

#### Performance Regressions
1. Review Lighthouse audit results
2. Compare with baseline metrics
3. Analyze bundle size changes
4. Check load test results

#### Workflow Failures
1. Validate workflow syntax: `yarn workflows:validate`
2. Check environment variables and secrets
3. Review job dependencies and conditions
4. Examine workflow logs for specific errors

### Getting Help
- **Documentation**: Check this README and workflow comments
- **Logs**: Review workflow run logs in GitHub Actions
- **Team**: Contact the engineering team in `#engineering`
- **Issues**: Create GitHub issues for persistent problems

## 🔄 Maintenance

### Regular Tasks
- **Weekly**: Review flaky test reports and fix issues
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review and optimize workflow performance

### Workflow Updates
1. Make changes to workflow files
2. Validate with `yarn workflows:validate`
3. Test in a fork or feature branch
4. Review with team before merging

---

*This CI/CD pipeline is designed to maintain high code quality while enabling rapid development. For questions or improvements, please reach out to the engineering team.*
