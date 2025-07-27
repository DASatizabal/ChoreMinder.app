#!/usr/bin/env node

/**
 * ChoreMinder Performance Benchmark Suite
 * 
 * Comprehensive performance testing for production readiness
 * Measures response times, throughput, and resource usage
 */

import { performance } from 'perf_hooks';
import { Worker } from 'worker_threads';
import connectMongo from '../libs/mongoose.ts';
import User from '../models/User.ts';
import Family from '../models/Family.ts';
import Chore from '../models/Chore.ts';
import mongoose from 'mongoose';

const BASE_URL = process.env.BENCHMARK_URL || 'http://localhost:3000';

class PerformanceBenchmark {
  constructor() {
    this.results = {
      database: {},
      api: {},
      load: {},
      memory: {},
      summary: {}
    };
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📊',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      performance: '⚡'
    }[type] || '📝';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async measureOperation(name, operation, iterations = 1) {
    const measurements = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        await operation();
        const duration = performance.now() - start;
        measurements.push(duration);
      } catch (error) {
        this.log(`Error in ${name}: ${error.message}`, 'error');
        measurements.push(null);
      }
    }

    const validMeasurements = measurements.filter(m => m !== null);
    if (validMeasurements.length === 0) {
      throw new Error(`All ${iterations} iterations of ${name} failed`);
    }

    const stats = {
      min: Math.min(...validMeasurements),
      max: Math.max(...validMeasurements),
      avg: validMeasurements.reduce((a, b) => a + b, 0) / validMeasurements.length,
      p95: this.percentile(validMeasurements, 95),
      p99: this.percentile(validMeasurements, 99),
      successRate: (validMeasurements.length / iterations) * 100,
      iterations: iterations
    };

    this.log(`${name}: avg=${stats.avg.toFixed(2)}ms, p95=${stats.p95.toFixed(2)}ms, success=${stats.successRate.toFixed(1)}%`, 'performance');
    return stats;
  }

  percentile(values, percentile) {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  async testApiEndpoint(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const config = {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      ...options
    };

    const response = await fetch(url, config);
    return {
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      size: response.headers.get('content-length') || 0
    };
  }
}

/**
 * Database Performance Tests
 */
async function testDatabasePerformance(benchmark) {
  benchmark.log('🗄️ Testing Database Performance');
  
  await connectMongo();
  
  // Test 1: Basic queries
  benchmark.results.database.basicQueries = await benchmark.measureOperation(
    'Database Basic Queries',
    async () => {
      await Family.findOne({ name: /johnson/i });
      await User.find({ role: 'child' }).limit(10);
      await Chore.find({ status: 'pending' }).limit(20);
    },
    50
  );

  // Test 2: Complex aggregations
  benchmark.results.database.aggregations = await benchmark.measureOperation(
    'Database Aggregations',
    async () => {
      await Chore.aggregate([
        { $match: { status: 'verified' } },
        { $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalPoints: { $sum: '$points.total' },
          avgDuration: { $avg: '$estimatedDuration' }
        }},
        { $sort: { totalPoints: -1 } }
      ]);
    },
    25
  );

  // Test 3: Population queries
  benchmark.results.database.population = await benchmark.measureOperation(
    'Database Population',
    async () => {
      await Chore.find({ status: 'verified' })
        .populate('assignedTo assignedBy')
        .limit(50);
    },
    25
  );

  // Test 4: Write operations
  benchmark.results.database.writes = await benchmark.measureOperation(
    'Database Writes',
    async () => {
      const testChore = new Chore({
        title: 'Performance Test Chore',
        description: 'Test chore for performance benchmarking',
        family: new mongoose.Types.ObjectId(),
        assignedTo: new mongoose.Types.ObjectId(),
        assignedBy: new mongoose.Types.ObjectId(),
        category: 'test',
        status: 'pending',
        dueDate: new Date(),
        points: { base: 10, bonus: 0, total: 10 },
        estimatedDuration: 15,
        difficulty: 'easy'
      });
      
      await testChore.save();
      await Chore.deleteOne({ _id: testChore._id });
    },
    10
  );

  benchmark.log('✅ Database performance testing completed');
}

/**
 * API Performance Tests
 */
async function testApiPerformance(benchmark) {
  benchmark.log('🌐 Testing API Performance');

  const endpoints = [
    { path: '/api/health', name: 'Health Check' },
    { path: '/api/auth/providers', name: 'Auth Providers' },
    { path: '/api/auth/session', name: 'Session Check' },
    { path: '/', name: 'Homepage' },
    { path: '/dashboard', name: 'Dashboard' }
  ];

  for (const endpoint of endpoints) {
    benchmark.results.api[endpoint.name] = await benchmark.measureOperation(
      `API ${endpoint.name}`,
      async () => {
        await benchmark.testApiEndpoint(endpoint.path);
      },
      20
    );
  }

  benchmark.log('✅ API performance testing completed');
}

/**
 * Load Testing
 */
async function testLoadPerformance(benchmark) {
  benchmark.log('🔥 Testing Load Performance');

  // Test concurrent requests
  const concurrentLevels = [1, 5, 10, 20];
  
  for (const concurrent of concurrentLevels) {
    benchmark.results.load[`concurrent_${concurrent}`] = await benchmark.measureOperation(
      `Concurrent Requests (${concurrent})`,
      async () => {
        const promises = [];
        for (let i = 0; i < concurrent; i++) {
          promises.push(benchmark.testApiEndpoint('/api/health'));
        }
        await Promise.all(promises);
      },
      5
    );
  }

  // Test database connection pool under load
  benchmark.results.load.database_concurrent = await benchmark.measureOperation(
    'Database Concurrent Queries',
    async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(Family.findOne({ name: /johnson/i }));
      }
      await Promise.all(promises);
    },
    10
  );

  benchmark.log('✅ Load performance testing completed');
}

/**
 * Memory Usage Testing
 */
async function testMemoryPerformance(benchmark) {
  benchmark.log('🧠 Testing Memory Performance');

  const getMemoryUsage = () => {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024) // MB
    };
  };

  const baseline = getMemoryUsage();
  benchmark.results.memory.baseline = baseline;

  // Test memory usage under load
  await connectMongo();
  
  // Load data into memory
  const families = await Family.find().populate('members.user');
  const chores = await Chore.find().populate('assignedTo assignedBy').limit(1000);
  const users = await User.find().populate('familyId');

  const afterLoad = getMemoryUsage();
  benchmark.results.memory.afterDataLoad = afterLoad;
  benchmark.results.memory.dataLoadIncrease = {
    rss: afterLoad.rss - baseline.rss,
    heapUsed: afterLoad.heapUsed - baseline.heapUsed,
    heapTotal: afterLoad.heapTotal - baseline.heapTotal
  };

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
    const afterGC = getMemoryUsage();
    benchmark.results.memory.afterGC = afterGC;
  }

  benchmark.log(`Memory Usage - Baseline: ${baseline.heapUsed}MB, After Load: ${afterLoad.heapUsed}MB, Increase: ${afterLoad.heapUsed - baseline.heapUsed}MB`);
  benchmark.log('✅ Memory performance testing completed');
}

/**
 * Generate Performance Report
 */
function generatePerformanceReport(benchmark) {
  const report = {
    timestamp: new Date().toISOString(),
    duration: Date.now() - benchmark.startTime,
    results: benchmark.results,
    summary: {
      database: {
        status: 'unknown',
        issues: []
      },
      api: {
        status: 'unknown', 
        issues: []
      },
      load: {
        status: 'unknown',
        issues: []
      },
      memory: {
        status: 'unknown',
        issues: []
      }
    }
  };

  // Analyze database performance
  const dbResults = benchmark.results.database;
  if (dbResults.basicQueries?.avg > 100) {
    report.summary.database.issues.push(`Slow basic queries: ${dbResults.basicQueries.avg.toFixed(2)}ms`);
  }
  if (dbResults.aggregations?.avg > 500) {
    report.summary.database.issues.push(`Slow aggregations: ${dbResults.aggregations.avg.toFixed(2)}ms`);
  }
  report.summary.database.status = report.summary.database.issues.length === 0 ? 'good' : 'warning';

  // Analyze API performance
  const apiResults = benchmark.results.api;
  Object.entries(apiResults).forEach(([name, stats]) => {
    if (stats.avg > 200) {
      report.summary.api.issues.push(`Slow ${name}: ${stats.avg.toFixed(2)}ms`);
    }
    if (stats.successRate < 100) {
      report.summary.api.issues.push(`${name} failures: ${(100 - stats.successRate).toFixed(1)}%`);
    }
  });
  report.summary.api.status = report.summary.api.issues.length === 0 ? 'good' : 'warning';

  // Analyze load performance
  const loadResults = benchmark.results.load;
  if (loadResults.concurrent_20?.avg > 1000) {
    report.summary.load.issues.push(`High concurrent latency: ${loadResults.concurrent_20.avg.toFixed(2)}ms`);
  }
  report.summary.load.status = report.summary.load.issues.length === 0 ? 'good' : 'warning';

  // Analyze memory usage
  const memResults = benchmark.results.memory;
  if (memResults.dataLoadIncrease?.heapUsed > 100) {
    report.summary.memory.issues.push(`High memory usage: ${memResults.dataLoadIncrease.heapUsed}MB increase`);
  }
  report.summary.memory.status = report.summary.memory.issues.length === 0 ? 'good' : 'warning';

  return report;
}

/**
 * Main benchmark runner
 */
async function runPerformanceBenchmark() {
  const benchmark = new PerformanceBenchmark();
  
  console.log('⚡ ChoreMinder Performance Benchmark');
  console.log('====================================');
  console.log('Testing production performance...\n');

  try {
    await testDatabasePerformance(benchmark);
    await testApiPerformance(benchmark);
    await testLoadPerformance(benchmark);
    await testMemoryPerformance(benchmark);

    const report = generatePerformanceReport(benchmark);
    
    console.log('\n📊 Performance Report Summary');
    console.log('=============================');
    console.log(`Test Duration: ${report.duration}ms`);
    console.log(`Database: ${report.summary.database.status.toUpperCase()}`);
    console.log(`API: ${report.summary.api.status.toUpperCase()}`);
    console.log(`Load: ${report.summary.load.status.toUpperCase()}`);
    console.log(`Memory: ${report.summary.memory.status.toUpperCase()}`);

    // Show issues if any
    const allIssues = [
      ...report.summary.database.issues,
      ...report.summary.api.issues,
      ...report.summary.load.issues,
      ...report.summary.memory.issues
    ];

    if (allIssues.length > 0) {
      console.log('\n⚠️  Performance Issues Found:');
      allIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    } else {
      console.log('\n🎉 All performance benchmarks passed!');
    }

    // Key metrics summary
    console.log('\n📈 Key Metrics:');
    if (benchmark.results.database.basicQueries) {
      console.log(`• Database Query Time: ${benchmark.results.database.basicQueries.avg.toFixed(2)}ms avg`);
    }
    if (benchmark.results.api['Health Check']) {
      console.log(`• API Response Time: ${benchmark.results.api['Health Check'].avg.toFixed(2)}ms avg`);
    }
    if (benchmark.results.load.concurrent_10) {
      console.log(`• 10 Concurrent Requests: ${benchmark.results.load.concurrent_10.avg.toFixed(2)}ms avg`);
    }
    if (benchmark.results.memory.dataLoadIncrease) {
      console.log(`• Memory Usage Increase: ${benchmark.results.memory.dataLoadIncrease.heapUsed}MB`);
    }

    console.log('\n✨ Performance benchmark completed!');
    return report;

  } catch (error) {
    benchmark.log(`Performance benchmark failed: ${error.message}`, 'error');
    throw error;
  } finally {
    await mongoose.connection.close();
  }
}

// Export for use in other scripts
export { runPerformanceBenchmark };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPerformanceBenchmark()
    .then((report) => {
      const hasIssues = Object.values(report.summary).some(section => section.status !== 'good');
      process.exit(hasIssues ? 1 : 0);
    })
    .catch((error) => {
      console.error('\n💥 Benchmark failed:', error);
      process.exit(1);
    });
}