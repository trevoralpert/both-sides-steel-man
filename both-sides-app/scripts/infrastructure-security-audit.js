#!/usr/bin/env node

/**
 * Infrastructure Security Audit Script
 * Comprehensive security assessment of infrastructure configuration
 */

const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');

class InfrastructureSecurityAudit {
  constructor() {
    this.auditResults = {
      timestamp: new Date().toISOString(),
      overallScore: 0,
      categories: {
        ssl: { score: 0, findings: [], recommendations: [] },
        headers: { score: 0, findings: [], recommendations: [] },
        environment: { score: 0, findings: [], recommendations: [] },
        dependencies: { score: 0, findings: [], recommendations: [] },
        configuration: { score: 0, findings: [], recommendations: [] },
        secrets: { score: 0, findings: [], recommendations: [] }
      }
    };
  }

  async runAudit() {
    console.log('🔒 Starting Infrastructure Security Audit...\n');

    try {
      await this.auditSSLConfiguration();
      await this.auditSecurityHeaders();
      await this.auditEnvironmentSecurity();
      await this.auditDependencySecurity();
      await this.auditConfigurationSecurity();
      await this.auditSecretsManagement();

      this.calculateOverallScore();
      this.generateReport();
      
      console.log('\n✅ Infrastructure security audit completed!');
      
    } catch (error) {
      console.error('\n❌ Infrastructure security audit failed:', error.message);
      process.exit(1);
    }
  }

  async auditSSLConfiguration() {
    console.log('🔐 Auditing SSL/TLS Configuration...');
    const sslCategory = this.auditResults.categories.ssl;

    try {
      // Check Next.js configuration for HTTPS redirects
      const nextConfigPath = 'next.config.ts';
      if (fs.existsSync(nextConfigPath)) {
        const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
        
        if (nextConfig.includes('Strict-Transport-Security')) {
          sslCategory.findings.push('✅ HSTS header configured in Next.js');
          sslCategory.score += 25;
        } else {
          sslCategory.findings.push('⚠️ HSTS header not found in Next.js config');
          sslCategory.recommendations.push('Add Strict-Transport-Security header');
        }

        if (nextConfig.includes('https') || nextConfig.includes('secure')) {
          sslCategory.findings.push('✅ HTTPS configuration detected');
          sslCategory.score += 25;
        } else {
          sslCategory.findings.push('⚠️ No explicit HTTPS configuration found');
          sslCategory.recommendations.push('Configure HTTPS redirects and secure cookies');
        }
      }

      // Check middleware for HTTPS enforcement
      const middlewarePath = 'src/middleware.ts';
      if (fs.existsSync(middlewarePath)) {
        const middleware = fs.readFileSync(middlewarePath, 'utf8');
        
        if (middleware.includes('https') || middleware.includes('secure')) {
          sslCategory.findings.push('✅ HTTPS enforcement in middleware');
          sslCategory.score += 25;
        } else {
          sslCategory.findings.push('⚠️ No HTTPS enforcement in middleware');
          sslCategory.recommendations.push('Add HTTPS enforcement to middleware');
        }
      }

      // Check for secure cookie settings
      const cookieSecurityCheck = this.checkSecureCookieSettings();
      if (cookieSecurityCheck.secure) {
        sslCategory.findings.push('✅ Secure cookie settings found');
        sslCategory.score += 25;
      } else {
        sslCategory.findings.push('⚠️ Secure cookie settings not found');
        sslCategory.recommendations.push('Configure secure cookie settings (httpOnly, secure, sameSite)');
      }

      console.log('  ✅ SSL/TLS audit completed');
    } catch (error) {
      console.error('  ❌ SSL/TLS audit failed:', error.message);
      sslCategory.findings.push(`❌ SSL audit error: ${error.message}`);
    }
  }

  async auditSecurityHeaders() {
    console.log('🛡️ Auditing Security Headers...');
    const headersCategory = this.auditResults.categories.headers;

    try {
      const nextConfigPath = 'next.config.ts';
      if (fs.existsSync(nextConfigPath)) {
        const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
        
        const requiredHeaders = [
          { name: 'X-Frame-Options', points: 15 },
          { name: 'X-Content-Type-Options', points: 15 },
          { name: 'X-XSS-Protection', points: 15 },
          { name: 'Strict-Transport-Security', points: 20 },
          { name: 'Content-Security-Policy', points: 25 },
          { name: 'Referrer-Policy', points: 10 }
        ];

        for (const header of requiredHeaders) {
          if (nextConfig.includes(header.name)) {
            headersCategory.findings.push(`✅ ${header.name} header configured`);
            headersCategory.score += header.points;
          } else {
            headersCategory.findings.push(`⚠️ ${header.name} header missing`);
            headersCategory.recommendations.push(`Add ${header.name} security header`);
          }
        }

        // Check CSP configuration quality
        if (nextConfig.includes('Content-Security-Policy')) {
          if (nextConfig.includes("'unsafe-eval'") || nextConfig.includes("'unsafe-inline'")) {
            headersCategory.findings.push('⚠️ CSP contains unsafe directives');
            headersCategory.recommendations.push('Remove unsafe-eval and unsafe-inline from CSP where possible');
          } else {
            headersCategory.findings.push('✅ CSP configuration appears secure');
          }
        }
      }

      console.log('  ✅ Security headers audit completed');
    } catch (error) {
      console.error('  ❌ Security headers audit failed:', error.message);
      headersCategory.findings.push(`❌ Headers audit error: ${error.message}`);
    }
  }

  async auditEnvironmentSecurity() {
    console.log('🌍 Auditing Environment Security...');
    const envCategory = this.auditResults.categories.environment;

    try {
      // Check for environment files
      const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
      const foundEnvFiles = envFiles.filter(file => fs.existsSync(file));

      if (foundEnvFiles.length > 0) {
        envCategory.findings.push(`✅ Environment files found: ${foundEnvFiles.join(', ')}`);
        envCategory.score += 20;
      } else {
        envCategory.findings.push('⚠️ No environment files found');
        envCategory.recommendations.push('Create .env.local for local development');
      }

      // Check .gitignore for environment files
      if (fs.existsSync('.gitignore')) {
        const gitignore = fs.readFileSync('.gitignore', 'utf8');
        if (gitignore.includes('.env')) {
          envCategory.findings.push('✅ Environment files excluded from git');
          envCategory.score += 30;
        } else {
          envCategory.findings.push('⚠️ Environment files not excluded from git');
          envCategory.recommendations.push('Add .env* to .gitignore');
        }
      }

      // Check for required environment variables
      const requiredEnvVars = [
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        'CLERK_SECRET_KEY',
        'DATABASE_URL',
        'NEXTAUTH_SECRET'
      ];

      let envVarScore = 0;
      for (const envVar of requiredEnvVars) {
        if (process.env[envVar]) {
          envVarScore += 12.5; // 50 points total for all env vars
        }
      }
      envCategory.score += envVarScore;

      if (envVarScore === 50) {
        envCategory.findings.push('✅ All required environment variables configured');
      } else {
        envCategory.findings.push('⚠️ Some required environment variables missing');
        envCategory.recommendations.push('Configure all required environment variables');
      }

      console.log('  ✅ Environment security audit completed');
    } catch (error) {
      console.error('  ❌ Environment security audit failed:', error.message);
      envCategory.findings.push(`❌ Environment audit error: ${error.message}`);
    }
  }

  async auditDependencySecurity() {
    console.log('📦 Auditing Dependency Security...');
    const depsCategory = this.auditResults.categories.dependencies;

    try {
      // Check for security-related packages
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      const securityPackages = [
        'helmet',
        'cors',
        'express-rate-limit',
        'express-validator',
        'bcryptjs',
        'jsonwebtoken'
      ];

      let securityPackagesFound = 0;
      for (const pkg of securityPackages) {
        if (allDeps[pkg]) {
          securityPackagesFound++;
        }
      }

      const securityScore = (securityPackagesFound / securityPackages.length) * 40;
      depsCategory.score += securityScore;
      depsCategory.findings.push(`✅ ${securityPackagesFound}/${securityPackages.length} security packages installed`);

      // Run npm audit
      try {
        execSync('yarn npm audit --severity moderate --json > audit-results.json', { stdio: 'pipe' });
        
        if (fs.existsSync('audit-results.json')) {
          const auditResults = JSON.parse(fs.readFileSync('audit-results.json', 'utf8'));
          
          if (auditResults.metadata && auditResults.metadata.vulnerabilities) {
            const vulns = auditResults.metadata.vulnerabilities;
            const totalVulns = vulns.total || 0;
            
            if (totalVulns === 0) {
              depsCategory.findings.push('✅ No security vulnerabilities found');
              depsCategory.score += 60;
            } else {
              depsCategory.findings.push(`⚠️ ${totalVulns} security vulnerabilities found`);
              depsCategory.recommendations.push('Run yarn npm audit fix to resolve vulnerabilities');
            }
          }
          
          // Clean up
          fs.unlinkSync('audit-results.json');
        }
      } catch (auditError) {
        // If audit fails, assume vulnerabilities exist
        depsCategory.findings.push('⚠️ Could not run security audit');
        depsCategory.recommendations.push('Manually run yarn npm audit to check for vulnerabilities');
      }

      console.log('  ✅ Dependency security audit completed');
    } catch (error) {
      console.error('  ❌ Dependency security audit failed:', error.message);
      depsCategory.findings.push(`❌ Dependency audit error: ${error.message}`);
    }
  }

  async auditConfigurationSecurity() {
    console.log('⚙️ Auditing Configuration Security...');
    const configCategory = this.auditResults.categories.configuration;

    try {
      // Check TypeScript configuration
      if (fs.existsSync('tsconfig.json')) {
        const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
        
        if (tsConfig.compilerOptions && tsConfig.compilerOptions.strict) {
          configCategory.findings.push('✅ TypeScript strict mode enabled');
          configCategory.score += 20;
        } else {
          configCategory.findings.push('⚠️ TypeScript strict mode not enabled');
          configCategory.recommendations.push('Enable TypeScript strict mode for better type safety');
        }
      }

      // Check ESLint configuration for security rules
      const eslintConfigs = ['.eslintrc.js', '.eslintrc.json', 'eslint.config.mjs'];
      let eslintConfigFound = false;
      
      for (const configFile of eslintConfigs) {
        if (fs.existsSync(configFile)) {
          eslintConfigFound = true;
          const eslintConfig = fs.readFileSync(configFile, 'utf8');
          
          if (eslintConfig.includes('security') || eslintConfig.includes('no-secrets')) {
            configCategory.findings.push('✅ ESLint security plugins configured');
            configCategory.score += 30;
          } else {
            configCategory.findings.push('⚠️ ESLint security plugins not configured');
            configCategory.recommendations.push('Add eslint-plugin-security and eslint-plugin-no-secrets');
          }
          break;
        }
      }

      if (!eslintConfigFound) {
        configCategory.findings.push('⚠️ No ESLint configuration found');
        configCategory.recommendations.push('Configure ESLint with security plugins');
      }

      // Check Jest configuration for security
      if (fs.existsSync('jest.config.js')) {
        configCategory.findings.push('✅ Jest configuration found');
        configCategory.score += 15;
      }

      // Check for security middleware configuration
      if (fs.existsSync('src/middleware.ts')) {
        const middleware = fs.readFileSync('src/middleware.ts', 'utf8');
        
        if (middleware.includes('rate-limit') || middleware.includes('security')) {
          configCategory.findings.push('✅ Security middleware configured');
          configCategory.score += 35;
        } else {
          configCategory.findings.push('⚠️ Security middleware not configured');
          configCategory.recommendations.push('Add security middleware for rate limiting and validation');
        }
      }

      console.log('  ✅ Configuration security audit completed');
    } catch (error) {
      console.error('  ❌ Configuration security audit failed:', error.message);
      configCategory.findings.push(`❌ Configuration audit error: ${error.message}`);
    }
  }

  async auditSecretsManagement() {
    console.log('🔑 Auditing Secrets Management...');
    const secretsCategory = this.auditResults.categories.secrets;

    try {
      // Check for hardcoded secrets in source code
      const secretPatterns = [
        /password\s*=\s*['"][^'"]+['"]/gi,
        /api[_-]?key\s*=\s*['"][^'"]+['"]/gi,
        /secret\s*=\s*['"][^'"]+['"]/gi,
        /token\s*=\s*['"][^'"]+['"]/gi,
        /pk_[a-zA-Z0-9]{24,}/g,  // Stripe publishable keys
        /sk_[a-zA-Z0-9]{24,}/g,  // Stripe secret keys
        /AKIA[0-9A-Z]{16}/g,     // AWS access keys
      ];

      let hardcodedSecretsFound = false;
      const sourceFiles = this.getSourceFiles();

      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, 'utf8');
        
        for (const pattern of secretPatterns) {
          if (pattern.test(content)) {
            hardcodedSecretsFound = true;
            secretsCategory.findings.push(`⚠️ Potential hardcoded secret in ${file}`);
            break;
          }
        }
      }

      if (!hardcodedSecretsFound) {
        secretsCategory.findings.push('✅ No hardcoded secrets detected');
        secretsCategory.score += 40;
      } else {
        secretsCategory.recommendations.push('Remove hardcoded secrets and use environment variables');
      }

      // Check environment variable usage
      const envVarUsage = this.checkEnvironmentVariableUsage();
      if (envVarUsage.count > 0) {
        secretsCategory.findings.push(`✅ ${envVarUsage.count} environment variables used`);
        secretsCategory.score += 30;
      } else {
        secretsCategory.findings.push('⚠️ No environment variable usage detected');
        secretsCategory.recommendations.push('Use environment variables for configuration');
      }

      // Check for .env in .gitignore
      if (fs.existsSync('.gitignore')) {
        const gitignore = fs.readFileSync('.gitignore', 'utf8');
        if (gitignore.includes('.env')) {
          secretsCategory.findings.push('✅ Environment files excluded from version control');
          secretsCategory.score += 30;
        } else {
          secretsCategory.findings.push('⚠️ Environment files not excluded from version control');
          secretsCategory.recommendations.push('Add .env* to .gitignore');
        }
      }

      console.log('  ✅ Secrets management audit completed');
    } catch (error) {
      console.error('  ❌ Secrets management audit failed:', error.message);
      secretsCategory.findings.push(`❌ Secrets audit error: ${error.message}`);
    }
  }

  checkSecureCookieSettings() {
    const sourceFiles = this.getSourceFiles();
    let secureSettings = false;

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('httpOnly') && content.includes('secure') && content.includes('sameSite')) {
        secureSettings = true;
        break;
      }
    }

    return { secure: secureSettings };
  }

  checkEnvironmentVariableUsage() {
    const sourceFiles = this.getSourceFiles();
    let envVarCount = 0;

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const matches = content.match(/process\.env\.[A-Z_]+/g);
      if (matches) {
        envVarCount += matches.length;
      }
    }

    return { count: envVarCount };
  }

  getSourceFiles() {
    const files = [];
    
    const scanDirectory = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = `${dir}/${item}`;
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx'))) {
          files.push(fullPath);
        }
      }
    };

    scanDirectory('src');
    
    // Also check root configuration files
    const rootFiles = ['next.config.ts', 'next.config.js', 'middleware.ts'];
    for (const file of rootFiles) {
      if (fs.existsSync(file)) {
        files.push(file);
      }
    }

    return files;
  }

  calculateOverallScore() {
    const categories = this.auditResults.categories;
    const totalScore = Object.values(categories).reduce((sum, category) => sum + category.score, 0);
    const maxScore = 600; // 100 points per category
    
    this.auditResults.overallScore = Math.round((totalScore / maxScore) * 100);
  }

  generateReport() {
    const reportPath = 'infrastructure-security-report.md';
    const results = this.auditResults;
    
    let report = `# 🔒 Infrastructure Security Audit Report

**Generated**: ${results.timestamp}  
**Overall Security Score**: ${results.overallScore}/100

## 📊 Category Scores

| Category | Score | Status |
|----------|-------|--------|
`;

    for (const [categoryName, category] of Object.entries(results.categories)) {
      const status = category.score >= 80 ? '✅ Excellent' : 
                    category.score >= 60 ? '⚠️ Good' : 
                    category.score >= 40 ? '⚠️ Needs Improvement' : '❌ Poor';
      
      report += `| ${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} | ${category.score}/100 | ${status} |\n`;
    }

    report += '\n## 🔍 Detailed Findings\n\n';

    for (const [categoryName, category] of Object.entries(results.categories)) {
      report += `### ${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} Security\n\n`;
      
      if (category.findings.length > 0) {
        report += '**Findings:**\n';
        for (const finding of category.findings) {
          report += `- ${finding}\n`;
        }
        report += '\n';
      }

      if (category.recommendations.length > 0) {
        report += '**Recommendations:**\n';
        for (const recommendation of category.recommendations) {
          report += `- ${recommendation}\n`;
        }
        report += '\n';
      }

      report += '---\n\n';
    }

    report += `## 🎯 Overall Assessment

`;

    if (results.overallScore >= 80) {
      report += `🎉 **Excellent Security Posture** (${results.overallScore}/100)

Your infrastructure demonstrates strong security practices with comprehensive protections in place.`;
    } else if (results.overallScore >= 60) {
      report += `👍 **Good Security Posture** (${results.overallScore}/100)

Your infrastructure has solid security foundations but could benefit from addressing the recommendations above.`;
    } else if (results.overallScore >= 40) {
      report += `⚠️ **Moderate Security Posture** (${results.overallScore}/100)

Your infrastructure has basic security measures but requires significant improvements to meet enterprise standards.`;
    } else {
      report += `🚨 **Poor Security Posture** (${results.overallScore}/100)

Your infrastructure has critical security gaps that need immediate attention. Please prioritize the recommendations above.`;
    }

    report += `

## 📞 Next Steps

1. **Address Critical Issues**: Focus on categories scoring below 60
2. **Implement Recommendations**: Follow the specific recommendations for each category
3. **Regular Audits**: Run this audit regularly to maintain security posture
4. **Security Training**: Ensure team members are trained on security best practices
5. **Monitoring**: Implement continuous security monitoring and alerting

---
*This report was generated by the Infrastructure Security Audit tool*`;

    fs.writeFileSync(reportPath, report);
    console.log(`\n📋 Infrastructure security report generated: ${reportPath}`);
    
    // Also save JSON results
    fs.writeFileSync('infrastructure-security-results.json', JSON.stringify(results, null, 2));
    console.log(`📄 Detailed results saved: infrastructure-security-results.json`);
  }
}

// CLI execution
if (require.main === module) {
  const audit = new InfrastructureSecurityAudit();
  audit.runAudit().catch(error => {
    console.error('❌ Infrastructure security audit failed:', error);
    process.exit(1);
  });
}

module.exports = InfrastructureSecurityAudit;
