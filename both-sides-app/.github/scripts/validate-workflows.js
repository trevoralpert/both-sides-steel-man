#!/usr/bin/env node

/**
 * GitHub Actions Workflow Validation Script
 * Validates workflow syntax, dependencies, and best practices
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class WorkflowValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.workflowsDir = path.join(__dirname, '..', 'workflows');
  }

  /**
   * Validate all workflows
   */
  async validateAll() {
    console.log('🔍 Validating GitHub Actions workflows...\n');

    if (!fs.existsSync(this.workflowsDir)) {
      this.addError('Workflows directory not found: .github/workflows');
      return this.reportResults();
    }

    const workflowFiles = fs.readdirSync(this.workflowsDir)
      .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));

    if (workflowFiles.length === 0) {
      this.addWarning('No workflow files found in .github/workflows');
      return this.reportResults();
    }

    console.log(`Found ${workflowFiles.length} workflow file(s):`);
    workflowFiles.forEach(file => console.log(`  - ${file}`));
    console.log();

    for (const file of workflowFiles) {
      await this.validateWorkflow(file);
    }

    return this.reportResults();
  }

  /**
   * Validate individual workflow
   */
  async validateWorkflow(filename) {
    console.log(`📋 Validating ${filename}...`);
    
    const filePath = path.join(this.workflowsDir, filename);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const workflow = yaml.load(content);

      // Basic structure validation
      this.validateWorkflowStructure(workflow, filename);
      
      // Job validation
      this.validateJobs(workflow, filename);
      
      // Security validation
      this.validateSecurity(workflow, filename);
      
      // Best practices validation
      this.validateBestPractices(workflow, filename);
      
      console.log(`  ✅ ${filename} validation completed\n`);
      
    } catch (error) {
      this.addError(`Failed to parse ${filename}: ${error.message}`);
    }
  }

  /**
   * Validate workflow structure
   */
  validateWorkflowStructure(workflow, filename) {
    // Check required fields
    if (!workflow.name) {
      this.addError(`${filename}: Missing 'name' field`);
    }

    if (!workflow.on) {
      this.addError(`${filename}: Missing 'on' field (triggers)`);
    }

    if (!workflow.jobs) {
      this.addError(`${filename}: Missing 'jobs' field`);
    }

    // Validate triggers
    if (workflow.on) {
      this.validateTriggers(workflow.on, filename);
    }

    // Check for environment variables
    if (workflow.env) {
      this.validateEnvironmentVariables(workflow.env, filename);
    }
  }

  /**
   * Validate workflow triggers
   */
  validateTriggers(triggers, filename) {
    const validTriggers = [
      'push', 'pull_request', 'workflow_dispatch', 'schedule', 
      'release', 'create', 'delete', 'fork', 'gollum', 
      'issue_comment', 'issues', 'label', 'milestone', 
      'page_build', 'project', 'project_card', 'project_column',
      'public', 'pull_request_review', 'pull_request_review_comment',
      'pull_request_target', 'registry_package', 'repository_dispatch',
      'status', 'watch', 'workflow_call', 'workflow_run'
    ];

    if (Array.isArray(triggers)) {
      triggers.forEach(trigger => {
        if (typeof trigger === 'string' && !validTriggers.includes(trigger)) {
          this.addWarning(`${filename}: Unknown trigger '${trigger}'`);
        }
      });
    } else if (typeof triggers === 'object') {
      Object.keys(triggers).forEach(trigger => {
        if (!validTriggers.includes(trigger)) {
          this.addWarning(`${filename}: Unknown trigger '${trigger}'`);
        }
      });

      // Validate push/pull_request branches
      if (triggers.push && triggers.push.branches) {
        this.validateBranches(triggers.push.branches, filename, 'push');
      }
      if (triggers.pull_request && triggers.pull_request.branches) {
        this.validateBranches(triggers.pull_request.branches, filename, 'pull_request');
      }
    }
  }

  /**
   * Validate branch patterns
   */
  validateBranches(branches, filename, triggerType) {
    const recommendedBranches = ['main', 'master', 'develop', 'staging'];
    
    if (Array.isArray(branches)) {
      const hasMainBranch = branches.some(branch => 
        recommendedBranches.includes(branch) || branch.includes('main') || branch.includes('master')
      );
      
      if (!hasMainBranch && triggerType === 'push') {
        this.addWarning(`${filename}: Consider including main/master branch in push triggers`);
      }
    }
  }

  /**
   * Validate environment variables
   */
  validateEnvironmentVariables(env, filename) {
    Object.keys(env).forEach(key => {
      // Check for hardcoded secrets (basic check)
      const value = env[key];
      if (typeof value === 'string') {
        if (value.includes('password') || value.includes('token') || value.includes('key')) {
          if (!value.includes('${{') && !value.includes('secrets.')) {
            this.addError(`${filename}: Potential hardcoded secret in env.${key}`);
          }
        }
      }
    });
  }

  /**
   * Validate jobs
   */
  validateJobs(workflow, filename) {
    if (!workflow.jobs || typeof workflow.jobs !== 'object') {
      return;
    }

    const jobNames = Object.keys(workflow.jobs);
    
    if (jobNames.length === 0) {
      this.addError(`${filename}: No jobs defined`);
      return;
    }

    jobNames.forEach(jobName => {
      this.validateJob(workflow.jobs[jobName], jobName, filename);
    });

    // Check for job dependencies
    this.validateJobDependencies(workflow.jobs, filename);
  }

  /**
   * Validate individual job
   */
  validateJob(job, jobName, filename) {
    // Check required fields
    if (!job['runs-on']) {
      this.addError(`${filename}: Job '${jobName}' missing 'runs-on' field`);
    }

    // Validate runner
    if (job['runs-on']) {
      this.validateRunner(job['runs-on'], jobName, filename);
    }

    // Validate steps
    if (job.steps) {
      this.validateSteps(job.steps, jobName, filename);
    } else {
      this.addWarning(`${filename}: Job '${jobName}' has no steps`);
    }

    // Check for environment variables in job
    if (job.env) {
      this.validateEnvironmentVariables(job.env, `${filename}:${jobName}`);
    }

    // Validate timeout
    if (job['timeout-minutes'] && job['timeout-minutes'] > 360) {
      this.addWarning(`${filename}: Job '${jobName}' has very long timeout (${job['timeout-minutes']} minutes)`);
    }
  }

  /**
   * Validate runner specification
   */
  validateRunner(runner, jobName, filename) {
    const validRunners = [
      'ubuntu-latest', 'ubuntu-22.04', 'ubuntu-20.04',
      'windows-latest', 'windows-2022', 'windows-2019',
      'macos-latest', 'macos-12', 'macos-11'
    ];

    if (typeof runner === 'string') {
      if (!validRunners.includes(runner) && !runner.startsWith('self-hosted')) {
        this.addWarning(`${filename}: Job '${jobName}' uses unknown runner '${runner}'`);
      }
    } else if (Array.isArray(runner)) {
      // Matrix runner
      if (!runner.includes('self-hosted') && !runner.some(r => validRunners.includes(r))) {
        this.addWarning(`${filename}: Job '${jobName}' uses unknown runner configuration`);
      }
    }
  }

  /**
   * Validate job steps
   */
  validateSteps(steps, jobName, filename) {
    if (!Array.isArray(steps)) {
      this.addError(`${filename}: Job '${jobName}' steps must be an array`);
      return;
    }

    steps.forEach((step, index) => {
      this.validateStep(step, jobName, index, filename);
    });
  }

  /**
   * Validate individual step
   */
  validateStep(step, jobName, stepIndex, filename) {
    const stepId = step.name || step.id || `step-${stepIndex}`;

    // Check that step has either 'uses' or 'run'
    if (!step.uses && !step.run) {
      this.addError(`${filename}: Job '${jobName}', step '${stepId}' must have either 'uses' or 'run'`);
    }

    // Validate action versions
    if (step.uses) {
      this.validateActionVersion(step.uses, jobName, stepId, filename);
    }

    // Check for shell specification in run steps
    if (step.run && !step.shell && step.run.includes('|')) {
      this.addWarning(`${filename}: Job '${jobName}', step '${stepId}' uses multiline run without shell specification`);
    }

    // Check for environment variables in step
    if (step.env) {
      this.validateEnvironmentVariables(step.env, `${filename}:${jobName}:${stepId}`);
    }
  }

  /**
   * Validate action versions
   */
  validateActionVersion(uses, jobName, stepId, filename) {
    // Check for pinned versions
    if (uses.includes('@')) {
      const [action, version] = uses.split('@');
      
      // Warn about using 'main' or 'master' branches
      if (version === 'main' || version === 'master') {
        this.addWarning(`${filename}: Job '${jobName}', step '${stepId}' uses unpinned version '${version}' for '${action}'`);
      }
      
      // Check for common actions with recommended versions
      this.validateCommonActions(action, version, jobName, stepId, filename);
    } else {
      this.addError(`${filename}: Job '${jobName}', step '${stepId}' action '${uses}' missing version`);
    }
  }

  /**
   * Validate common actions
   */
  validateCommonActions(action, version, jobName, stepId, filename) {
    const recommendedVersions = {
      'actions/checkout': 'v4',
      'actions/setup-node': 'v4',
      'actions/cache': 'v3',
      'actions/upload-artifact': 'v4',
      'actions/download-artifact': 'v4'
    };

    if (recommendedVersions[action]) {
      const recommended = recommendedVersions[action];
      if (!version.startsWith(recommended.charAt(0))) {
        this.addWarning(`${filename}: Job '${jobName}', step '${stepId}' uses '${action}@${version}', consider '${recommended}'`);
      }
    }
  }

  /**
   * Validate job dependencies
   */
  validateJobDependencies(jobs, filename) {
    const jobNames = Object.keys(jobs);
    
    jobNames.forEach(jobName => {
      const job = jobs[jobName];
      if (job.needs) {
        const dependencies = Array.isArray(job.needs) ? job.needs : [job.needs];
        
        dependencies.forEach(dep => {
          if (!jobNames.includes(dep)) {
            this.addError(`${filename}: Job '${jobName}' depends on non-existent job '${dep}'`);
          }
        });
      }
    });

    // Check for circular dependencies (basic check)
    this.checkCircularDependencies(jobs, filename);
  }

  /**
   * Check for circular dependencies
   */
  checkCircularDependencies(jobs, filename) {
    const visited = new Set();
    const recursionStack = new Set();

    const hasCycle = (jobName) => {
      if (recursionStack.has(jobName)) {
        return true;
      }
      if (visited.has(jobName)) {
        return false;
      }

      visited.add(jobName);
      recursionStack.add(jobName);

      const job = jobs[jobName];
      if (job.needs) {
        const dependencies = Array.isArray(job.needs) ? job.needs : [job.needs];
        for (const dep of dependencies) {
          if (jobs[dep] && hasCycle(dep)) {
            return true;
          }
        }
      }

      recursionStack.delete(jobName);
      return false;
    };

    Object.keys(jobs).forEach(jobName => {
      if (hasCycle(jobName)) {
        this.addError(`${filename}: Circular dependency detected involving job '${jobName}'`);
      }
    });
  }

  /**
   * Validate security best practices
   */
  validateSecurity(workflow, filename) {
    // Check for pull_request_target usage
    if (workflow.on && workflow.on.pull_request_target) {
      this.addWarning(`${filename}: Uses 'pull_request_target' - ensure proper security measures`);
    }

    // Check for write permissions
    if (workflow.permissions) {
      this.validatePermissions(workflow.permissions, filename);
    }

    // Check jobs for permissions
    if (workflow.jobs) {
      Object.keys(workflow.jobs).forEach(jobName => {
        const job = workflow.jobs[jobName];
        if (job.permissions) {
          this.validatePermissions(job.permissions, `${filename}:${jobName}`);
        }
      });
    }
  }

  /**
   * Validate permissions
   */
  validatePermissions(permissions, context) {
    if (typeof permissions === 'string' && permissions === 'write-all') {
      this.addWarning(`${context}: Uses 'write-all' permissions - consider limiting scope`);
    } else if (typeof permissions === 'object') {
      Object.keys(permissions).forEach(permission => {
        if (permissions[permission] === 'write') {
          this.addWarning(`${context}: Uses write permission for '${permission}' - ensure necessary`);
        }
      });
    }
  }

  /**
   * Validate best practices
   */
  validateBestPractices(workflow, filename) {
    // Check for concurrency control
    if (!workflow.concurrency && workflow.on && (workflow.on.push || workflow.on.pull_request)) {
      this.addWarning(`${filename}: Consider adding concurrency control to prevent multiple runs`);
    }

    // Check for proper caching
    this.validateCaching(workflow, filename);

    // Check for timeout settings
    this.validateTimeouts(workflow, filename);

    // Check for proper error handling
    this.validateErrorHandling(workflow, filename);
  }

  /**
   * Validate caching usage
   */
  validateCaching(workflow, filename) {
    if (!workflow.jobs) return;

    Object.keys(workflow.jobs).forEach(jobName => {
      const job = workflow.jobs[jobName];
      if (!job.steps) return;

      const hasNodeSetup = job.steps.some(step => 
        step.uses && step.uses.includes('actions/setup-node')
      );
      const hasCache = job.steps.some(step => 
        step.uses && (step.uses.includes('actions/cache') || 
        (step.uses.includes('actions/setup-node') && step.with && step.with.cache))
      );

      if (hasNodeSetup && !hasCache) {
        this.addWarning(`${filename}: Job '${jobName}' sets up Node.js but doesn't use caching`);
      }
    });
  }

  /**
   * Validate timeout settings
   */
  validateTimeouts(workflow, filename) {
    if (!workflow.jobs) return;

    Object.keys(workflow.jobs).forEach(jobName => {
      const job = workflow.jobs[jobName];
      if (!job['timeout-minutes']) {
        this.addWarning(`${filename}: Job '${jobName}' has no timeout - consider adding timeout-minutes`);
      }
    });
  }

  /**
   * Validate error handling
   */
  validateErrorHandling(workflow, filename) {
    if (!workflow.jobs) return;

    Object.keys(workflow.jobs).forEach(jobName => {
      const job = workflow.jobs[jobName];
      if (!job.steps) return;

      const hasErrorHandling = job.steps.some(step => 
        step['continue-on-error'] !== undefined || step.if
      );

      if (!hasErrorHandling && job.steps.length > 5) {
        this.addWarning(`${filename}: Job '${jobName}' has many steps but no error handling`);
      }
    });
  }

  /**
   * Add error
   */
  addError(message) {
    this.errors.push(message);
    console.log(`  ❌ ERROR: ${message}`);
  }

  /**
   * Add warning
   */
  addWarning(message) {
    this.warnings.push(message);
    console.log(`  ⚠️  WARNING: ${message}`);
  }

  /**
   * Report validation results
   */
  reportResults() {
    console.log('\n📊 Validation Results:');
    console.log(`  Errors: ${this.errors.length}`);
    console.log(`  Warnings: ${this.warnings.length}`);

    if (this.errors.length > 0) {
      console.log('\n❌ Errors found:');
      this.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n✅ All workflows are valid!');
    }

    // Exit with error code if there are errors
    const exitCode = this.errors.length > 0 ? 1 : 0;
    
    console.log(`\n🏁 Validation completed with exit code: ${exitCode}`);
    
    return {
      success: exitCode === 0,
      errors: this.errors,
      warnings: this.warnings,
      exitCode
    };
  }
}

// Main execution
async function main() {
  const validator = new WorkflowValidator();
  const result = await validator.validateAll();
  
  if (process.env.CI) {
    process.exit(result.exitCode);
  }
  
  return result;
}

// Export for testing
module.exports = { WorkflowValidator };

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  });
}