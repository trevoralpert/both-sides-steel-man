#!/usr/bin/env node

/**
 * GitHub Actions Workflow Validator
 * Validates workflow syntax and configuration
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const WORKFLOWS_DIR = path.join(__dirname, '../workflows');

class WorkflowValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  validateWorkflows() {
    console.log('🔍 Validating GitHub Actions workflows...\n');

    if (!fs.existsSync(WORKFLOWS_DIR)) {
      this.errors.push('Workflows directory not found');
      return this.generateReport();
    }

    const workflowFiles = fs.readdirSync(WORKFLOWS_DIR)
      .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));

    if (workflowFiles.length === 0) {
      this.warnings.push('No workflow files found');
      return this.generateReport();
    }

    console.log(`📁 Found ${workflowFiles.length} workflow files:`);
    workflowFiles.forEach(file => console.log(`  - ${file}`));
    console.log('');

    workflowFiles.forEach(file => {
      this.validateWorkflowFile(path.join(WORKFLOWS_DIR, file));
    });

    return this.generateReport();
  }

  validateWorkflowFile(filePath) {
    const fileName = path.basename(filePath);
    console.log(`🔍 Validating ${fileName}...`);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const workflow = yaml.load(content);

      this.validateWorkflowStructure(workflow, fileName);
      this.validateJobs(workflow.jobs, fileName);
      this.validateTriggers(workflow.on, fileName);
      this.validateEnvironment(workflow, fileName);

      console.log(`  ✅ ${fileName} is valid\n`);
    } catch (error) {
      this.errors.push(`${fileName}: Failed to parse YAML - ${error.message}`);
      console.log(`  ❌ ${fileName} has syntax errors\n`);
    }
  }

  validateWorkflowStructure(workflow, fileName) {
    // Required fields
    if (!workflow.name) {
      this.errors.push(`${fileName}: Missing required field 'name'`);
    }

    if (!workflow.on) {
      this.errors.push(`${fileName}: Missing required field 'on' (triggers)`);
    }

    if (!workflow.jobs || Object.keys(workflow.jobs).length === 0) {
      this.errors.push(`${fileName}: Missing or empty 'jobs' section`);
    }

    // Check for common naming conventions
    if (workflow.name && !workflow.name.match(/^[🔍📊🧪⚡🛡️🚀📢🧹📋].*/)) {
      this.warnings.push(`${fileName}: Consider adding an emoji to the workflow name for better visibility`);
    }
  }

  validateJobs(jobs, fileName) {
    if (!jobs) return;

    Object.entries(jobs).forEach(([jobId, job]) => {
      // Required fields
      if (!job.name) {
        this.warnings.push(`${fileName}: Job '${jobId}' missing name`);
      }

      if (!job['runs-on']) {
        this.errors.push(`${fileName}: Job '${jobId}' missing 'runs-on'`);
      }

      if (!job.steps || job.steps.length === 0) {
        this.errors.push(`${fileName}: Job '${jobId}' has no steps`);
      }

      // Validate steps
      if (job.steps) {
        this.validateSteps(job.steps, jobId, fileName);
      }

      // Check for proper dependency chains
      if (job.needs && Array.isArray(job.needs) && job.needs.length > 5) {
        this.warnings.push(`${fileName}: Job '${jobId}' has many dependencies (${job.needs.length}), consider simplifying`);
      }

      // Check for timeout settings on long-running jobs
      if (jobId.includes('load') || jobId.includes('e2e') || jobId.includes('performance')) {
        if (!job['timeout-minutes']) {
          this.warnings.push(`${fileName}: Job '${jobId}' should have timeout-minutes set for long-running operations`);
        }
      }
    });
  }

  validateSteps(steps, jobId, fileName) {
    steps.forEach((step, index) => {
      // Check for required step fields
      if (!step.name && !step.uses) {
        this.warnings.push(`${fileName}: Job '${jobId}' step ${index + 1} missing name`);
      }

      // Check for proper checkout action
      if (step.uses && step.uses.startsWith('actions/checkout@')) {
        if (!step.uses.includes('@v4')) {
          this.warnings.push(`${fileName}: Job '${jobId}' using outdated checkout action, consider upgrading to @v4`);
        }
      }

      // Check for Node.js setup
      if (step.uses && step.uses.startsWith('actions/setup-node@')) {
        if (!step.with || !step.with['node-version']) {
          this.warnings.push(`${fileName}: Job '${jobId}' Node.js setup missing version specification`);
        }
        if (!step.with || !step.with.cache) {
          this.warnings.push(`${fileName}: Job '${jobId}' Node.js setup should enable caching for better performance`);
        }
      }

      // Check for security best practices
      if (step.run && step.run.includes('curl') && !step.run.includes('--fail')) {
        this.warnings.push(`${fileName}: Job '${jobId}' curl command should use --fail flag for better error handling`);
      }

      // Check for proper artifact handling
      if (step.uses && step.uses.startsWith('actions/upload-artifact@')) {
        if (!step.with || !step.with['retention-days']) {
          this.warnings.push(`${fileName}: Job '${jobId}' artifact upload should specify retention-days`);
        }
      }
    });
  }

  validateTriggers(triggers, fileName) {
    if (!triggers) return;

    // Convert single trigger to object format
    if (typeof triggers === 'string') {
      triggers = { [triggers]: {} };
    }

    // Check for common trigger configurations
    if (triggers.pull_request) {
      const pr = triggers.pull_request;
      if (!pr.branches && !pr.paths && !pr.types) {
        this.warnings.push(`${fileName}: pull_request trigger is very broad, consider adding branch or path filters`);
      }
    }

    if (triggers.push) {
      const push = triggers.push;
      if (!push.branches && !push.paths) {
        this.warnings.push(`${fileName}: push trigger is very broad, consider adding branch or path filters`);
      }
    }

    // Check for schedule format
    if (triggers.schedule) {
      triggers.schedule.forEach((schedule, index) => {
        if (!schedule.cron) {
          this.errors.push(`${fileName}: schedule trigger ${index + 1} missing cron expression`);
        } else {
          // Basic cron validation
          const cronParts = schedule.cron.split(' ');
          if (cronParts.length !== 5) {
            this.errors.push(`${fileName}: schedule trigger ${index + 1} has invalid cron expression format`);
          }
        }
      });
    }
  }

  validateEnvironment(workflow, fileName) {
    // Check for proper concurrency settings
    if (!workflow.concurrency && (workflow.on.pull_request || workflow.on.push)) {
      this.warnings.push(`${fileName}: Consider adding concurrency settings to cancel redundant workflow runs`);
    }

    // Check for environment variables
    if (workflow.env) {
      Object.entries(workflow.env).forEach(([key, value]) => {
        if (typeof value === 'string' && value.includes('secret') && !value.startsWith('${{ secrets.')) {
          this.warnings.push(`${fileName}: Environment variable '${key}' may contain hardcoded secrets`);
        }
      });
    }

    // Check for proper permissions (if specified)
    if (workflow.permissions) {
      const permissions = workflow.permissions;
      if (permissions === 'write-all' || (typeof permissions === 'object' && Object.values(permissions).includes('write'))) {
        this.warnings.push(`${fileName}: Workflow has broad write permissions, consider using minimal required permissions`);
      }
    }
  }

  generateReport() {
    console.log('📊 Validation Report');
    console.log('='.repeat(50));

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All workflows are valid with no issues found!\n');
      return { success: true, errors: [], warnings: [] };
    }

    if (this.errors.length > 0) {
      console.log(`❌ Errors (${this.errors.length}):`);
      this.errors.forEach(error => console.log(`  - ${error}`));
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log(`⚠️  Warnings (${this.warnings.length}):`);
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
      console.log('');
    }

    console.log('💡 Recommendations:');
    console.log('  - Fix all errors before deploying workflows');
    console.log('  - Review warnings for best practices');
    console.log('  - Test workflows in a fork before merging');
    console.log('  - Use workflow_dispatch for manual testing');
    console.log('');

    return {
      success: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }
}

// CLI execution
if (require.main === module) {
  // Check if js-yaml is available
  try {
    require.resolve('js-yaml');
  } catch (e) {
    console.error('❌ js-yaml package not found. Please install it:');
    console.error('   npm install js-yaml');
    process.exit(1);
  }

  const validator = new WorkflowValidator();
  const result = validator.validateWorkflows();

  process.exit(result.success ? 0 : 1);
}

module.exports = WorkflowValidator;
