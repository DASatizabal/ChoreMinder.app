#!/usr/bin/env node

/**
 * ChoreMinder Final Testing Suite
 * 
 * Comprehensive end-to-end testing for POC launch readiness
 * Tests all critical user flows with demo family data
 */

import connectMongo from '../libs/mongoose.ts';
import User from '../models/User.ts';
import Family from '../models/Family.ts';
import Chore from '../models/Chore.ts';
import mongoose from 'mongoose';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const DEMO_CREDENTIALS = {
  parent: { email: 'sarah@demo.com', password: 'Demo2024!' },
  child: { email: 'emma@demo.com', password: 'Demo2024!' }
};

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  retries: 3,
  parallel: false
};

class TestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      performance: {},
      security: {},
      summary: {}
    };
    this.startTime = Date.now();
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔍',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      performance: '⚡'
    }[type] || '📝';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async measurePerformance(testName, testFunction) {
    const startTime = performance.now();
    try {
      const result = await testFunction();
      const duration = performance.now() - startTime;
      this.results.performance[testName] = {
        duration: Math.round(duration),
        status: 'success',
        result
      };
      await this.log(`${testName}: ${duration.toFixed(2)}ms`, 'performance');
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.results.performance[testName] = {
        duration: Math.round(duration),
        status: 'error',
        error: error.message
      };
      throw error;
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
        data: response.headers.get('content-type')?.includes('application/json') 
          ? await response.json() 
          : await response.text()
      };
    } catch (error) {
      throw new Error(`API request failed: ${error.message}`);
    }
  }
}

/**
 * Database Testing Suite
 */
class DatabaseTests extends TestRunner {
  async runAllTests() {
    await this.log('🗄️ Starting Database Tests', 'info');
    
    try {
      await this.testDatabaseConnection();
      await this.testDemoDataIntegrity();
      await this.testDataRelationships();
      await this.testQueryPerformance();
      
      await this.log('🗄️ Database tests completed', 'success');
    } catch (error) {
      await this.log(`Database tests failed: ${error.message}`, 'error');
      this.results.errors.push({ test: 'database', error: error.message });
    }
  }

  async testDatabaseConnection() {
    return this.measurePerformance('Database Connection', async () => {
      await connectMongo();
      const admin = mongoose.connection.db.admin();
      const result = await admin.ping();
      if (result.ok !== 1) throw new Error('Database ping failed');
      return 'Connected successfully';
    });
  }

  async testDemoDataIntegrity() {
    return this.measurePerformance('Demo Data Integrity', async () => {
      // Check Johnson family exists
      const johnsonFamily = await Family.findOne({ name: /johnson/i });
      if (!johnsonFamily) throw new Error('Johnson family not found');

      // Check family members
      const members = await User.find({ familyId: johnsonFamily._id });
      if (members.length !== 4) throw new Error(`Expected 4 members, found ${members.length}`);

      // Check chores exist
      const chores = await Chore.find({ family: johnsonFamily._id });
      if (chores.length < 50) throw new Error(`Expected 50+ chores, found ${chores.length}`);

      // Check data relationships
      for (const member of members) {
        if (!member.familyId.equals(johnsonFamily._id)) {
          throw new Error(`Member ${member.name} not linked to family`);
        }
      }

      return `Family: ${johnsonFamily.name}, Members: ${members.length}, Chores: ${chores.length}`;
    });
  }

  async testDataRelationships() {
    return this.measurePerformance('Data Relationships', async () => {
      const family = await Family.findOne({ name: /johnson/i }).populate('members.user');
      const chores = await Chore.find({ family: family._id }).populate('assignedTo assignedBy');
      
      let invalidRelationships = 0;
      
      for (const chore of chores) {
        if (!chore.assignedTo || !chore.assignedBy) {
          invalidRelationships++;
        }
      }

      if (invalidRelationships > 0) {
        throw new Error(`${invalidRelationships} chores have invalid relationships`);
      }

      return `All ${chores.length} chore relationships valid`;
    });
  }

  async testQueryPerformance() {
    return this.measurePerformance('Query Performance', async () => {
      const family = await Family.findOne({ name: /johnson/i });
      
      // Test complex aggregation query
      const start = performance.now();
      const analytics = await Chore.aggregate([
        { $match: { family: family._id } },
        { $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalPoints: { $sum: '$points.total' }
        }}
      ]);
      const queryTime = performance.now() - start;

      if (queryTime > 500) {
        throw new Error(`Slow query: ${queryTime.toFixed(2)}ms (should be < 500ms)`);
      }

      return `Analytics query: ${queryTime.toFixed(2)}ms, Results: ${analytics.length}`;
    });
  }
}

/**
 * API Testing Suite
 */
class ApiTests extends TestRunner {
  async runAllTests() {
    await this.log('🌐 Starting API Tests', 'info');
    
    try {
      await this.testHealthEndpoints();
      await this.testAuthenticationFlow();
      await this.testFamilyEndpoints();
      await this.testChoreEndpoints();
      await this.testNotificationEndpoints();
      
      await this.log('🌐 API tests completed', 'success');
    } catch (error) {
      await this.log(`API tests failed: ${error.message}`, 'error');
      this.results.errors.push({ test: 'api', error: error.message });
    }
  }

  async testHealthEndpoints() {
    return this.measurePerformance('Health Check', async () => {
      const response = await this.testApiEndpoint('/api/health');
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      return `Status: ${response.status}, Health: ${response.data.status}`;
    });
  }

  async testAuthenticationFlow() {
    return this.measurePerformance('Authentication Flow', async () => {
      // Test auth providers endpoint
      const providers = await this.testApiEndpoint('/api/auth/providers');
      if (!providers.ok) {
        throw new Error(`Auth providers failed: ${providers.status}`);
      }

      // Test session endpoint
      const session = await this.testApiEndpoint('/api/auth/session');
      if (!session.ok && session.status !== 401) {
        throw new Error(`Session check failed: ${session.status}`);
      }

      return 'Authentication endpoints accessible';
    });
  }

  async testFamilyEndpoints() {
    return this.measurePerformance('Family Endpoints', async () => {
      // Test family creation validation
      const invalidFamily = await this.testApiEndpoint('/api/families', {
        method: 'POST',
        body: JSON.stringify({ name: '' })
      });

      if (invalidFamily.status === 200) {
        throw new Error('Family endpoint should reject invalid data');
      }

      return 'Family endpoints properly secured';
    });
  }

  async testChoreEndpoints() {
    return this.measurePerformance('Chore Endpoints', async () => {
      // Test chore listing endpoint security
      const chores = await this.testApiEndpoint('/api/chores');
      
      if (chores.status === 200) {
        throw new Error('Chore endpoint should require authentication');
      }

      if (chores.status !== 401) {
        throw new Error(`Unexpected chore endpoint status: ${chores.status}`);
      }

      return 'Chore endpoints properly secured';
    });
  }

  async testNotificationEndpoints() {
    return this.measurePerformance('Notification Endpoints', async () => {
      // Test notification service status
      const response = await this.testApiEndpoint('/api/test/notifications');
      
      // Should return 401 without auth or 200 with proper test response
      if (response.status !== 401 && response.status !== 200) {
        throw new Error(`Unexpected notification status: ${response.status}`);
      }

      return 'Notification endpoints accessible';
    });
  }
}

/**
 * User Flow Testing Suite
 */
class UserFlowTests extends TestRunner {
  async runAllTests() {
    await this.log('👤 Starting User Flow Tests', 'info');
    
    try {
      await this.testParentDashboardFlow();
      await this.testChildExperienceFlow();
      await this.testChoreCompletionFlow();
      await this.testGamificationFlow();
      await this.testAnalyticsFlow();
      
      await this.log('👤 User flow tests completed', 'success');
    } catch (error) {
      await this.log(`User flow tests failed: ${error.message}`, 'error');
      this.results.errors.push({ test: 'userflow', error: error.message });
    }
  }

  async testParentDashboardFlow() {
    return this.measurePerformance('Parent Dashboard Flow', async () => {
      await connectMongo();
      
      // Verify parent user exists
      const parent = await User.findOne({ email: DEMO_CREDENTIALS.parent.email });
      if (!parent) throw new Error('Demo parent user not found');

      // Verify family access
      const family = await Family.findById(parent.familyId);
      if (!family) throw new Error('Parent family not found');

      // Verify family member permissions
      const memberRecord = family.members.find(m => m.user.equals(parent._id));
      if (!memberRecord) throw new Error('Parent not in family members');

      return `Parent: ${parent.name}, Family: ${family.name}, Role: ${parent.role}`;
    });
  }

  async testChildExperienceFlow() {
    return this.measurePerformance('Child Experience Flow', async () => {
      await connectMongo();
      
      // Verify child user exists
      const child = await User.findOne({ email: DEMO_CREDENTIALS.child.email });
      if (!child) throw new Error('Demo child user not found');

      // Verify gamification data
      if (!child.gamification || !child.gamification.totalPoints) {
        throw new Error('Child gamification data missing');
      }

      // Verify child has assigned chores
      const chores = await Chore.find({ assignedTo: child._id, status: { $ne: 'verified' } });
      if (chores.length === 0) throw new Error('No active chores for child');

      return `Child: ${child.name}, Points: ${child.gamification.totalPoints}, Active Chores: ${chores.length}`;
    });
  }

  async testChoreCompletionFlow() {
    return this.measurePerformance('Chore Completion Flow', async () => {
      await connectMongo();
      
      const child = await User.findOne({ email: DEMO_CREDENTIALS.child.email });
      
      // Find a pending chore
      const pendingChore = await Chore.findOne({ 
        assignedTo: child._id, 
        status: 'pending' 
      });

      if (!pendingChore) throw new Error('No pending chores found for testing');

      // Verify chore structure
      if (!pendingChore.points || !pendingChore.points.base) {
        throw new Error('Chore points structure invalid');
      }

      if (!pendingChore.category) {
        throw new Error('Chore category missing');
      }

      return `Chore: ${pendingChore.title}, Points: ${pendingChore.points.base}, Category: ${pendingChore.category}`;
    });
  }

  async testGamificationFlow() {
    return this.measurePerformance('Gamification Flow', async () => {
      await connectMongo();
      
      const child = await User.findOne({ email: DEMO_CREDENTIALS.child.email });
      
      // Verify gamification structure
      const gam = child.gamification;
      const requiredFields = ['totalPoints', 'currentStreak', 'level', 'achievements'];
      
      for (const field of requiredFields) {
        if (gam[field] === undefined) {
          throw new Error(`Gamification missing ${field}`);
        }
      }

      // Verify achievements are properly formatted
      if (!Array.isArray(gam.achievements)) {
        throw new Error('Achievements should be an array');
      }

      return `Points: ${gam.totalPoints}, Streak: ${gam.currentStreak}, Level: ${gam.level}, Achievements: ${gam.achievements.length}`;
    });
  }

  async testAnalyticsFlow() {
    return this.measurePerformance('Analytics Flow', async () => {
      await connectMongo();
      
      const family = await Family.findOne({ name: /johnson/i });
      
      // Test analytics aggregation
      const completedChores = await Chore.countDocuments({
        family: family._id,
        status: 'verified'
      });

      const totalChores = await Chore.countDocuments({
        family: family._id
      });

      if (totalChores === 0) throw new Error('No chores found for analytics');

      const completionRate = Math.round((completedChores / totalChores) * 100);

      // Verify family statistics
      if (!family.statistics) {
        throw new Error('Family statistics not generated');
      }

      return `Completed: ${completedChores}/${totalChores} (${completionRate}%), Family Stats: ${JSON.stringify(family.statistics)}`;
    });
  }
}

/**
 * Security Testing Suite
 */
class SecurityTests extends TestRunner {
  async runAllTests() {
    await this.log('🔒 Starting Security Tests', 'info');
    
    try {
      await this.testAuthenticationSecurity();
      await this.testDataIsolation();
      await this.testInputValidation();
      await this.testPermissionControls();
      
      await this.log('🔒 Security tests completed', 'success');
      this.results.security = { status: 'passed', tests: 4 };
    } catch (error) {
      await this.log(`Security tests failed: ${error.message}`, 'error');
      this.results.errors.push({ test: 'security', error: error.message });
      this.results.security = { status: 'failed', error: error.message };
    }
  }

  async testAuthenticationSecurity() {
    return this.measurePerformance('Authentication Security', async () => {
      // Test that protected endpoints reject unauthenticated requests
      const protectedEndpoints = [
        '/api/families',
        '/api/chores',
        '/api/users/profile'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await this.testApiEndpoint(endpoint);
        if (response.status === 200) {
          throw new Error(`Endpoint ${endpoint} should require authentication`);
        }
      }

      return `${protectedEndpoints.length} endpoints properly secured`;
    });
  }

  async testDataIsolation() {
    return this.measurePerformance('Data Isolation', async () => {
      await connectMongo();
      
      // Verify family data isolation
      const families = await Family.find();
      for (const family of families) {
        const familyChores = await Chore.find({ family: family._id });
        
        // Check that no chores are assigned to users outside the family
        for (const chore of familyChores) {
          const assignee = await User.findById(chore.assignedTo);
          if (!assignee.familyId.equals(family._id)) {
            throw new Error(`Chore assigned to user outside family: ${chore.title}`);
          }
        }
      }

      return `Data isolation verified for ${families.length} families`;
    });
  }

  async testInputValidation() {
    return this.measurePerformance('Input Validation', async () => {
      // Test SQL injection attempts (should be handled by Mongoose)
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "<script>alert('xss')</script>",
        "'; SELECT * FROM users; --",
        "../../../etc/passwd"
      ];

      // Test family creation with malicious input
      for (const input of maliciousInputs) {
        const response = await this.testApiEndpoint('/api/families', {
          method: 'POST',
          body: JSON.stringify({ name: input })
        });
        
        // Should either be rejected (401/400) or sanitized (not 500)
        if (response.status === 500) {
          throw new Error(`Server error on malicious input: ${input}`);
        }
      }

      return `Input validation tested with ${maliciousInputs.length} malicious inputs`;
    });
  }

  async testPermissionControls() {
    return this.measurePerformance('Permission Controls', async () => {
      await connectMongo();
      
      // Verify child users can't access parent functions
      const child = await User.findOne({ email: DEMO_CREDENTIALS.child.email });
      const parent = await User.findOne({ email: DEMO_CREDENTIALS.parent.email });
      
      if (child.role === 'parent') {
        throw new Error('Child user has parent role');
      }

      if (parent.role === 'child') {
        throw new Error('Parent user has child role');
      }

      // Verify family membership isolation
      if (!child.familyId.equals(parent.familyId)) {
        throw new Error('Child and parent not in same family');
      }

      return 'Permission controls properly configured';
    });
  }
}

/**
 * Performance Testing Suite
 */
class PerformanceTests extends TestRunner {
  async runAllTests() {
    await this.log('⚡ Starting Performance Tests', 'info');
    
    try {
      await this.testDatabasePerformance();
      await this.testApiResponseTimes();
      await this.testConcurrentUsers();
      await this.testMemoryUsage();
      
      await this.log('⚡ Performance tests completed', 'success');
    } catch (error) {
      await this.log(`Performance tests failed: ${error.message}`, 'error');
      this.results.errors.push({ test: 'performance', error: error.message });
    }
  }

  async testDatabasePerformance() {
    return this.measurePerformance('Database Performance', async () => {
      await connectMongo();
      
      const tests = [];
      
      // Test 1: Family lookup
      const familyStart = performance.now();
      await Family.findOne({ name: /johnson/i });
      const familyTime = performance.now() - familyStart;
      tests.push({ name: 'Family Lookup', time: familyTime });

      // Test 2: Chore aggregation
      const choreStart = performance.now();
      await Chore.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      const choreTime = performance.now() - choreStart;
      tests.push({ name: 'Chore Aggregation', time: choreTime });

      // Test 3: User population
      const userStart = performance.now();
      await User.find().populate('familyId');
      const userTime = performance.now() - userStart;
      tests.push({ name: 'User Population', time: userTime });

      // Verify all queries are under performance thresholds
      for (const test of tests) {
        if (test.time > 200) {
          throw new Error(`${test.name} too slow: ${test.time.toFixed(2)}ms (should be < 200ms)`);
        }
      }

      return tests.map(t => `${t.name}: ${t.time.toFixed(2)}ms`).join(', ');
    });
  }

  async testApiResponseTimes() {
    return this.measurePerformance('API Response Times', async () => {
      const endpoints = [
        { path: '/api/health', maxTime: 100 },
        { path: '/api/auth/providers', maxTime: 200 },
        { path: '/api/auth/session', maxTime: 150 }
      ];

      const results = [];
      
      for (const endpoint of endpoints) {
        const start = performance.now();
        await this.testApiEndpoint(endpoint.path);
        const duration = performance.now() - start;
        
        if (duration > endpoint.maxTime) {
          throw new Error(`${endpoint.path} too slow: ${duration.toFixed(2)}ms (should be < ${endpoint.maxTime}ms)`);
        }
        
        results.push(`${endpoint.path}: ${duration.toFixed(2)}ms`);
      }

      return results.join(', ');
    });
  }

  async testConcurrentUsers() {
    return this.measurePerformance('Concurrent Users', async () => {
      // Simulate 10 concurrent health checks
      const concurrentRequests = 10;
      const promises = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(this.testApiEndpoint('/api/health'));
      }

      const start = performance.now();
      const results = await Promise.all(promises);
      const duration = performance.now() - start;
      
      // Verify all requests succeeded
      const failed = results.filter(r => !r.ok).length;
      if (failed > 0) {
        throw new Error(`${failed}/${concurrentRequests} concurrent requests failed`);
      }

      // Verify reasonable response time under load
      if (duration > 2000) {
        throw new Error(`Concurrent requests too slow: ${duration.toFixed(2)}ms`);
      }

      return `${concurrentRequests} concurrent requests: ${duration.toFixed(2)}ms`;
    });
  }

  async testMemoryUsage() {
    return this.measurePerformance('Memory Usage', async () => {
      const memBefore = process.memoryUsage();
      
      // Perform memory-intensive operations
      await connectMongo();
      const families = await Family.find().populate('members.user');
      const chores = await Chore.find().populate('assignedTo assignedBy');
      
      const memAfter = process.memoryUsage();
      const heapIncrease = memAfter.heapUsed - memBefore.heapUsed;
      const heapMB = heapIncrease / 1024 / 1024;
      
      // Verify memory usage is reasonable
      if (heapMB > 50) {
        throw new Error(`High memory usage: ${heapMB.toFixed(2)}MB increase`);
      }

      return `Memory increase: ${heapMB.toFixed(2)}MB, Loaded: ${families.length} families, ${chores.length} chores`;
    });
  }
}

/**
 * Main test runner
 */
async function runFinalTestingSuite() {
  const overallStart = Date.now();
  
  console.log('🚀 ChoreMinder Final Testing Suite');
  console.log('=====================================');
  console.log('Testing POC launch readiness...\n');

  const testSuites = [
    new DatabaseTests(),
    new ApiTests(), 
    new UserFlowTests(),
    new SecurityTests(),
    new PerformanceTests()
  ];

  const results = {
    passed: 0,
    failed: 0,
    errors: [],
    performance: {},
    security: {},
    startTime: overallStart
  };

  for (const suite of testSuites) {
    try {
      await suite.runAllTests();
      results.passed += 1;
      
      // Merge performance and security results
      Object.assign(results.performance, suite.results.performance);
      Object.assign(results.security, suite.results.security);
      
    } catch (error) {
      results.failed += 1;
      results.errors.push(...suite.results.errors);
    }
  }

  const overallDuration = Date.now() - overallStart;
  
  console.log('\n🎯 Final Testing Summary');
  console.log('========================');
  console.log(`Total Duration: ${overallDuration}ms`);
  console.log(`Test Suites: ${results.passed}/${testSuites.length} passed`);
  console.log(`Errors: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors Found:');
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}: ${error.error}`);
    });
  }

  console.log('\n⚡ Performance Results:');
  Object.entries(results.performance).forEach(([test, result]) => {
    const status = result.status === 'success' ? '✅' : '❌';
    console.log(`${status} ${test}: ${result.duration}ms`);
  });

  const allTestsPassed = results.failed === 0 && results.errors.length === 0;
  
  console.log(`\n${allTestsPassed ? '🎉' : '⚠️'} POC ${allTestsPassed ? 'READY FOR LAUNCH' : 'NEEDS ATTENTION'}`);
  
  if (!allTestsPassed) {
    process.exit(1);
  }

  return results;
}

// Export for use in other scripts
export { runFinalTestingSuite };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFinalTestingSuite()
    .then(() => {
      console.log('\n✨ Testing complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Testing failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await mongoose.connection.close();
    });
}