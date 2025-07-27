#!/usr/bin/env node

/**
 * Simple system validation for ChoreMinder POC launch
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';

console.log('🚀 ChoreMinder POC Launch Validation');
console.log('=====================================\n');

let passed = 0;
let failed = 0;

async function check(name, testFunction) {
  try {
    console.log(`🔍 ${name}...`);
    const result = await testFunction();
    console.log(`✅ ${name}: ${result}`);
    passed++;
    return true;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    failed++;
    return false;
  }
}

async function runValidation() {
  // Check environment variables
  await check('Environment Configuration', async () => {
    const required = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'RESEND_API_KEY'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing: ${missing.join(', ')}`);
    }
    return `${required.length} variables configured`;
  });

  // Check API server
  await check('API Server', async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/providers`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return `Responding on ${BASE_URL}`;
    } catch (error) {
      if (error.message.includes('ECONNREFUSED')) {
        throw new Error('Server not running - start with: npm run dev');
      }
      throw error;
    }
  });

  // Check basic functionality
  await check('Next.js Route Resolution', async () => {
    const response = await fetch(`${BASE_URL}/`);
    if (!response.ok) throw new Error(`Homepage HTTP ${response.status}`);
    return 'Homepage accessible';
  });

  // Summary
  console.log('\n📊 Launch Validation Results');
  console.log('=============================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  const successRate = Math.round((passed / (passed + failed)) * 100);
  console.log(`📊 Success Rate: ${successRate}%`);

  if (failed === 0) {
    console.log('\n🎉 VALIDATION PASSED! ChoreMinder POC is ready for launch! 🚀');
    console.log('\n📋 Next Steps:');
    console.log('1. Run: npm run demo:create (to create demo data)');
    console.log('2. Login with: sarah@demo.com / Demo2024!');
    console.log('3. Demo URL: http://localhost:3001');
    console.log('4. POC is ready for stakeholder demonstrations!');
  } else {
    console.log('\n⚠️  Issues found. Resolve before proceeding.');
  }

  return failed === 0;
}

runValidation()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n💥 Validation failed:', error);
    process.exit(1);
  });