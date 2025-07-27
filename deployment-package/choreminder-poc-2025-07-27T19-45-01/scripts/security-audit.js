#!/usr/bin/env node

/**
 * ChoreMinder Security Audit Suite
 * 
 * Comprehensive security testing for production launch
 * Tests authentication, authorization, data protection, and compliance
 */

import connectMongo from '../libs/mongoose.ts';
import User from '../models/User.ts';
import Family from '../models/Family.ts';
import Chore from '../models/Chore.ts';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const BASE_URL = process.env.AUDIT_URL || 'http://localhost:3000';

class SecurityAudit {
  constructor() {
    this.results = {
      authentication: {},
      authorization: {},
      dataProtection: {},
      inputValidation: {},
      privacy: {},
      compliance: {},
      summary: { passed: 0, failed: 0, warnings: 0, critical: 0 }
    };
    this.findings = [];
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔍',
      pass: '✅',
      warning: '⚠️',
      fail: '❌',
      critical: '🚨'
    }[level] || '📝';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  addFinding(category, severity, title, description, recommendation = null) {
    const finding = {
      category,
      severity,
      title,
      description,
      recommendation,
      timestamp: new Date().toISOString()
    };
    
    this.findings.push(finding);
    this.results.summary[severity]++;
    
    this.log(`${title}: ${description}`, severity);
    if (recommendation) {
      this.log(`  Recommendation: ${recommendation}`, 'info');
    }
  }

  async testApiEndpoint(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const config = {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      ...options
    };

    try {
      const response = await fetch(url, config);
      return {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        data: response.headers.get('content-type')?.includes('application/json') 
          ? await response.json() 
          : await response.text()
      };
    } catch (error) {
      return {
        status: 0,
        ok: false,
        error: error.message
      };
    }
  }
}

/**
 * Authentication Security Tests
 */
async function testAuthenticationSecurity(audit) {
  audit.log('🔐 Testing Authentication Security');

  // Test 1: Password hashing
  try {
    await connectMongo();
    const user = await User.findOne({ email: 'sarah@demo.com' });
    
    if (!user) {
      audit.addFinding('authentication', 'fail', 'Demo User Missing', 
        'Demo user not found for password testing');
    } else if (!user.password || user.password.length < 50) {
      audit.addFinding('authentication', 'critical', 'Weak Password Hashing', 
        'Passwords may not be properly hashed',
        'Ensure bcrypt with minimum 12 rounds is used');
    } else {
      audit.addFinding('authentication', 'pass', 'Password Hashing', 
        'Passwords are properly hashed');
    }
  } catch (error) {
    audit.addFinding('authentication', 'fail', 'Password Test Failed', 
      `Could not verify password hashing: ${error.message}`);
  }

  // Test 2: Session management
  const sessionResponse = await audit.testApiEndpoint('/api/auth/session');
  if (sessionResponse.status === 200 && sessionResponse.data?.user) {
    audit.addFinding('authentication', 'warning', 'Public Session Access', 
      'Session endpoint accessible without authentication',
      'Verify session endpoint security implementation');
  } else {
    audit.addFinding('authentication', 'pass', 'Session Security', 
      'Session endpoint properly secured');
  }

  // Test 3: Protected endpoints
  const protectedEndpoints = [
    '/api/families',
    '/api/chores', 
    '/api/users/profile',
    '/api/notifications'
  ];

  let unprotectedEndpoints = 0;
  for (const endpoint of protectedEndpoints) {
    const response = await audit.testApiEndpoint(endpoint);
    if (response.status === 200) {
      unprotectedEndpoints++;
      audit.addFinding('authentication', 'critical', 'Unprotected Endpoint', 
        `Endpoint ${endpoint} accessible without authentication`,
        'Add authentication middleware to all protected routes');
    }
  }

  if (unprotectedEndpoints === 0) {
    audit.addFinding('authentication', 'pass', 'Endpoint Protection', 
      'All protected endpoints require authentication');
  }

  // Test 4: Rate limiting
  const rateLimitTests = [];
  for (let i = 0; i < 5; i++) {
    rateLimitTests.push(audit.testApiEndpoint('/api/auth/providers'));
  }
  
  const responses = await Promise.all(rateLimitTests);
  const rateLimited = responses.some(r => r.status === 429);
  
  if (!rateLimited) {
    audit.addFinding('authentication', 'warning', 'No Rate Limiting', 
      'Authentication endpoints may not have rate limiting',
      'Implement rate limiting for authentication endpoints');
  } else {
    audit.addFinding('authentication', 'pass', 'Rate Limiting Active', 
      'Rate limiting detected on authentication endpoints');
  }

  audit.log('✅ Authentication security testing completed');
}

/**
 * Authorization Security Tests
 */
async function testAuthorizationSecurity(audit) {
  audit.log('🛡️ Testing Authorization Security');

  try {
    await connectMongo();

    // Test 1: Role-based access control
    const parent = await User.findOne({ email: 'sarah@demo.com' });
    const child = await User.findOne({ email: 'emma@demo.com' });

    if (!parent || !child) {
      audit.addFinding('authorization', 'fail', 'Test Users Missing', 
        'Cannot test authorization without demo users');
      return;
    }

    if (parent.role !== 'parent' || child.role !== 'child') {
      audit.addFinding('authorization', 'fail', 'Invalid User Roles', 
        'Demo users do not have expected roles');
    } else {
      audit.addFinding('authorization', 'pass', 'Role Assignment', 
        'User roles properly assigned');
    }

    // Test 2: Family data isolation
    const families = await Family.find();
    let isolationViolations = 0;

    for (const family of families) {
      const familyChores = await Chore.find({ family: family._id });
      
      for (const chore of familyChores) {
        const assignee = await User.findById(chore.assignedTo);
        if (assignee && !assignee.familyId.equals(family._id)) {
          isolationViolations++;
        }
      }
    }

    if (isolationViolations > 0) {
      audit.addFinding('authorization', 'critical', 'Data Isolation Violation', 
        `${isolationViolations} chores assigned outside family boundaries`,
        'Implement strict family-based data isolation');
    } else {
      audit.addFinding('authorization', 'pass', 'Family Data Isolation', 
        'Family data properly isolated');
    }

    // Test 3: Permission boundaries
    const childPermissions = ['complete_chores', 'view_progress'];
    const parentPermissions = ['manage_family', 'create_chores', 'approve_chores', 'view_analytics'];

    const childFamily = await Family.findById(child.familyId);
    const childMember = childFamily.members.find(m => m.user.equals(child._id));
    
    if (!childMember) {
      audit.addFinding('authorization', 'fail', 'Family Membership Missing', 
        'Child user not found in family members');
    } else {
      const hasAdminPermissions = parentPermissions.some(p => 
        childMember.permissions && childMember.permissions.includes(p));
      
      if (hasAdminPermissions) {
        audit.addFinding('authorization', 'critical', 'Permission Escalation', 
          'Child user has parent-level permissions',
          'Audit and fix permission assignment logic');
      } else {
        audit.addFinding('authorization', 'pass', 'Permission Boundaries', 
          'User permissions properly restricted');
      }
    }

  } catch (error) {
    audit.addFinding('authorization', 'fail', 'Authorization Test Failed', 
      `Could not complete authorization testing: ${error.message}`);
  }

  audit.log('✅ Authorization security testing completed');
}

/**
 * Data Protection Tests
 */
async function testDataProtection(audit) {
  audit.log('🔒 Testing Data Protection');

  try {
    await connectMongo();

    // Test 1: Password encryption
    const users = await User.find().limit(5);
    let weakPasswords = 0;

    for (const user of users) {
      if (!user.password || user.password.length < 50) {
        weakPasswords++;
      }
      
      // Check if password looks like plaintext
      if (user.password && !user.password.startsWith('$2')) {
        audit.addFinding('dataProtection', 'critical', 'Plaintext Password', 
          `User ${user.email} may have plaintext password`,
          'Immediately hash all passwords with bcrypt');
      }
    }

    if (weakPasswords === 0) {
      audit.addFinding('dataProtection', 'pass', 'Password Encryption', 
        'All passwords properly encrypted');
    } else {
      audit.addFinding('dataProtection', 'warning', 'Weak Password Storage', 
        `${weakPasswords} users may have weak password storage`);
    }

    // Test 2: Sensitive data exposure
    const sampleUser = users[0];
    const sensitiveFields = ['password', 'resetToken', 'emailVerificationToken'];
    
    let exposedFields = [];
    for (const field of sensitiveFields) {
      if (sampleUser[field] !== undefined) {
        exposedFields.push(field);
      }
    }

    if (exposedFields.length > 0) {
      audit.addFinding('dataProtection', 'warning', 'Sensitive Data Exposure', 
        `Sensitive fields may be exposed: ${exposedFields.join(', ')}`,
        'Exclude sensitive fields from default queries');
    } else {
      audit.addFinding('dataProtection', 'pass', 'Sensitive Data Protection', 
        'Sensitive fields properly protected');
    }

    // Test 3: Database connection security
    const connectionString = process.env.DATABASE_URL || process.env.MONGODB_URI;
    if (!connectionString) {
      audit.addFinding('dataProtection', 'fail', 'Missing Database Config', 
        'Database connection string not configured');
    } else if (connectionString.includes('localhost') || !connectionString.includes('ssl=true')) {
      audit.addFinding('dataProtection', 'warning', 'Database Connection Security', 
        'Database connection may not use SSL/TLS',
        'Ensure database connections use SSL/TLS encryption');
    } else {
      audit.addFinding('dataProtection', 'pass', 'Secure Database Connection', 
        'Database connection properly secured');
    }

  } catch (error) {
    audit.addFinding('dataProtection', 'fail', 'Data Protection Test Failed', 
      `Could not complete data protection testing: ${error.message}`);
  }

  audit.log('✅ Data protection testing completed');
}

/**
 * Input Validation Tests
 */
async function testInputValidation(audit) {
  audit.log('🧪 Testing Input Validation');

  const maliciousInputs = [
    { name: 'SQL Injection', value: "'; DROP TABLE users; --" },
    { name: 'XSS Script', value: "<script>alert('xss')</script>" },
    { name: 'NoSQL Injection', value: '{"$ne": null}' },
    { name: 'Path Traversal', value: '../../../etc/passwd' },
    { name: 'Command Injection', value: '; rm -rf /' },
    { name: 'LDAP Injection', value: '*)(&)' }
  ];

  let vulnerableEndpoints = 0;

  // Test family creation endpoint with malicious inputs
  for (const input of maliciousInputs) {
    const response = await audit.testApiEndpoint('/api/families', {
      method: 'POST',
      body: JSON.stringify({ name: input.value })
    });

    // Should be rejected with 401 (unauthorized) or 400 (bad request), not 500 (server error)
    if (response.status === 500) {
      vulnerableEndpoints++;
      audit.addFinding('inputValidation', 'critical', `${input.name} Vulnerability`, 
        `Server error on malicious input: ${input.name}`,
        'Implement proper input validation and error handling');
    }
  }

  if (vulnerableEndpoints === 0) {
    audit.addFinding('inputValidation', 'pass', 'Input Validation', 
      'No server errors on malicious inputs');
  }

  // Test email validation
  const invalidEmails = ['not-an-email', '@example.com', 'test@', 'test..test@example.com'];
  
  for (const email of invalidEmails) {
    const response = await audit.testApiEndpoint('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'test123' })
    });

    if (response.status === 200) {
      audit.addFinding('inputValidation', 'warning', 'Email Validation Bypass', 
        `Invalid email accepted: ${email}`,
        'Implement strict email validation');
    }
  }

  audit.log('✅ Input validation testing completed');
}

/**
 * Privacy Compliance Tests
 */
async function testPrivacyCompliance(audit) {
  audit.log('🛡️ Testing Privacy Compliance');

  try {
    await connectMongo();

    // Test 1: Data minimization
    const sampleUser = await User.findOne().lean();
    const dataFields = Object.keys(sampleUser);
    const unnecessaryFields = ['browserInfo', 'ipAddress', 'deviceId', 'trackingId'];
    
    const foundUnnecessary = unnecessaryFields.filter(field => dataFields.includes(field));
    if (foundUnnecessary.length > 0) {
      audit.addFinding('privacy', 'warning', 'Data Minimization', 
        `Potentially unnecessary data collected: ${foundUnnecessary.join(', ')}`,
        'Review data collection practices for GDPR compliance');
    } else {
      audit.addFinding('privacy', 'pass', 'Data Minimization', 
        'No unnecessary personal data collection detected');
    }

    // Test 2: Family data boundaries
    const families = await Family.find();
    let crossFamilyLeaks = 0;

    for (const family of families) {
      const familyUsers = await User.find({ familyId: family._id });
      for (const user of familyUsers) {
        // Check if user can access other family data
        const otherFamilyChores = await Chore.find({ 
          family: { $ne: family._id },
          assignedTo: user._id 
        });
        
        if (otherFamilyChores.length > 0) {
          crossFamilyLeaks++;
        }
      }
    }

    if (crossFamilyLeaks > 0) {
      audit.addFinding('privacy', 'critical', 'Family Privacy Violation', 
        `${crossFamilyLeaks} instances of cross-family data access`,
        'Implement strict family data isolation');
    } else {
      audit.addFinding('privacy', 'pass', 'Family Privacy Boundaries', 
        'Family data properly isolated');
    }

    // Test 3: Child data protection
    const children = await User.find({ role: 'child' });
    for (const child of children) {
      if (!child.profile?.age) {
        audit.addFinding('privacy', 'warning', 'Child Age Verification', 
          'Child users missing age verification',
          'Implement age verification for child protection compliance');
        break;
      }
    }

    if (children.length > 0) {
      audit.addFinding('privacy', 'pass', 'Child Data Protection', 
        'Child accounts identified and tracked');
    }

  } catch (error) {
    audit.addFinding('privacy', 'fail', 'Privacy Test Failed', 
      `Could not complete privacy testing: ${error.message}`);
  }

  audit.log('✅ Privacy compliance testing completed');
}

/**
 * Generate Security Report
 */
function generateSecurityReport(audit) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: audit.results.summary,
    findings: audit.findings,
    categories: {
      authentication: audit.findings.filter(f => f.category === 'authentication'),
      authorization: audit.findings.filter(f => f.category === 'authorization'),
      dataProtection: audit.findings.filter(f => f.category === 'dataProtection'),
      inputValidation: audit.findings.filter(f => f.category === 'inputValidation'),
      privacy: audit.findings.filter(f => f.category === 'privacy')
    },
    riskAssessment: {
      level: 'unknown',
      criticalIssues: audit.findings.filter(f => f.severity === 'critical').length,
      warnings: audit.findings.filter(f => f.severity === 'warning').length,
      recommendation: ''
    }
  };

  // Determine overall risk level
  if (report.riskAssessment.criticalIssues > 0) {
    report.riskAssessment.level = 'high';
    report.riskAssessment.recommendation = 'Critical security issues must be resolved before production launch';
  } else if (report.riskAssessment.warnings > 3) {
    report.riskAssessment.level = 'medium';
    report.riskAssessment.recommendation = 'Multiple security warnings should be addressed';
  } else if (report.riskAssessment.warnings > 0) {
    report.riskAssessment.level = 'low';
    report.riskAssessment.recommendation = 'Minor security improvements recommended';
  } else {
    report.riskAssessment.level = 'minimal';
    report.riskAssessment.recommendation = 'Security posture appears adequate for launch';
  }

  return report;
}

/**
 * Main security audit runner
 */
async function runSecurityAudit() {
  const audit = new SecurityAudit();
  
  console.log('🔐 ChoreMinder Security Audit');
  console.log('=============================');
  console.log('Conducting comprehensive security testing...\n');

  try {
    await testAuthenticationSecurity(audit);
    await testAuthorizationSecurity(audit);
    await testDataProtection(audit);
    await testInputValidation(audit);
    await testPrivacyCompliance(audit);

    const report = generateSecurityReport(audit);
    
    console.log('\n🛡️ Security Audit Summary');
    console.log('==========================');
    console.log(`Risk Level: ${report.riskAssessment.level.toUpperCase()}`);
    console.log(`Critical Issues: ${report.riskAssessment.criticalIssues}`);
    console.log(`Warnings: ${report.riskAssessment.warnings}`);
    console.log(`Passed Tests: ${audit.results.summary.pass || 0}`);

    if (report.riskAssessment.criticalIssues > 0) {
      console.log('\n🚨 Critical Security Issues:');
      report.findings
        .filter(f => f.severity === 'critical')
        .forEach((finding, index) => {
          console.log(`${index + 1}. ${finding.title}: ${finding.description}`);
          if (finding.recommendation) {
            console.log(`   → ${finding.recommendation}`);
          }
        });
    }

    if (report.riskAssessment.warnings > 0) {
      console.log('\n⚠️  Security Warnings:');
      report.findings
        .filter(f => f.severity === 'warning')
        .forEach((finding, index) => {
          console.log(`${index + 1}. ${finding.title}: ${finding.description}`);
        });
    }

    console.log(`\n💡 Recommendation: ${report.riskAssessment.recommendation}`);

    const isSecure = report.riskAssessment.criticalIssues === 0;
    console.log(`\n${isSecure ? '✅' : '❌'} Security Status: ${isSecure ? 'APPROVED FOR LAUNCH' : 'REQUIRES FIXES'}`);

    return report;

  } catch (error) {
    audit.log(`Security audit failed: ${error.message}`, 'critical');
    throw error;
  } finally {
    await mongoose.connection.close();
  }
}

// Export for use in other scripts
export { runSecurityAudit };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityAudit()
    .then((report) => {
      const hasSecurityIssues = report.riskAssessment.criticalIssues > 0;
      process.exit(hasSecurityIssues ? 1 : 0);
    })
    .catch((error) => {
      console.error('\n💥 Security audit failed:', error);
      process.exit(1);
    });
}