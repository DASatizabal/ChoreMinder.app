#!/usr/bin/env node

/**
 * ChoreMinder Launch Readiness Checklist
 * 
 * Quick validation that all systems are ready for POC launch
 */

import connectMongo from '../libs/mongoose.ts';
import User from '../models/User.ts';
import Family from '../models/Family.ts';
import Chore from '../models/Chore.ts';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';

class LaunchChecklist {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      checks: []
    };
  }

  async check(name, testFunction) {
    try {
      console.log(`🔍 Checking: ${name}...`);
      const result = await testFunction();
      console.log(`✅ ${name}: ${result}`);
      this.results.checks.push({ name, status: 'pass', result });
      this.results.passed++;
      return true;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      this.results.checks.push({ name, status: 'fail', error: error.message });
      this.results.failed++;
      return false;
    }
  }

  async runChecklist() {
    console.log('🚀 ChoreMinder Launch Readiness Checklist');
    console.log('==========================================\n');

    // Database connectivity
    await this.check('Database Connection', async () => {
      await connectMongo();
      return 'Connected to MongoDB successfully';
    });

    // Models validation
    await this.check('Data Models', async () => {
      const userCount = await User.countDocuments();
      const familyCount = await Family.countDocuments();
      const choreCount = await Chore.countDocuments();
      return `Users: ${userCount}, Families: ${familyCount}, Chores: ${choreCount}`;
    });

    // API endpoints
    await this.check('API Health', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/providers`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return `API responding on ${BASE_URL}`;
    });

    // Environment configuration
    await this.check('Environment Variables', async () => {
      const required = [
        'DATABASE_URL',
        'NEXTAUTH_SECRET',
        'RESEND_API_KEY',
        'STRIPE_SECRET_KEY',
        'AWS_ACCESS_KEY_ID'
      ];
      
      const missing = required.filter(key => !process.env[key]);
      if (missing.length > 0) {
        throw new Error(`Missing: ${missing.join(', ')}`);
      }
      return `All ${required.length} required variables configured`;
    });

    // Core functionality
    await this.check('Core Models Schema', async () => {
      // Test that models can be instantiated
      const testUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        role: 'user'
      });
      
      const testFamily = new Family({
        name: 'Test Family',
        members: []
      });
      
      const testChore = new Chore({
        title: 'Test Chore',
        description: 'Test description',
        family: testFamily._id,
        assignedTo: testUser._id,
        assignedBy: testUser._id,
        category: 'test',
        status: 'pending',
        dueDate: new Date(),
        points: { base: 10, bonus: 0, total: 10 },
        estimatedDuration: 15,
        difficulty: 'easy'
      });

      return 'All models can be instantiated';
    });

    // Report results
    console.log('\n📊 Launch Checklist Results');
    console.log('============================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📊 Success Rate: ${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%`);

    if (this.results.failed === 0) {
      console.log('\n🎉 ALL SYSTEMS GO! ChoreMinder is ready for launch! 🚀');
    } else {
      console.log('\n⚠️  Some issues found. Please resolve before launch.');
      console.log('\nFailed Checks:');
      this.results.checks
        .filter(c => c.status === 'fail')
        .forEach((check, index) => {
          console.log(`${index + 1}. ${check.name}: ${check.error}`);
        });
    }

    return this.results.failed === 0;
  }
}

// Run the checklist
const checklist = new LaunchChecklist();

checklist.runChecklist()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n💥 Launch checklist failed:', error);
    process.exit(1);
  });