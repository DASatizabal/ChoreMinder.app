import { dbConnect } from "../libs/mongoose";
import User from "../models/User";
import Family from "../models/Family";
import Chore from "../models/Chore";
import { getPerformanceService } from "../libs/performance";
import { getAnalyticsService } from "../libs/analytics";

interface PerformanceTest {
  name: string;
  duration: number;
  throughput?: number;
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    delta: number;
  };
  status: "PASS" | "FAIL";
  threshold: number;
  error?: string;
}

class PerformanceTestSuite {
  private results: PerformanceTest[] = [];
  private testData: any = {};

  async runPerformanceTests(): Promise<{
    results: PerformanceTest[];
    summary: string;
    overallStatus: "PASS" | "FAIL";
  }> {
    console.log("🚀 Starting Performance Validation Tests");
    console.log("=" .repeat(50));

    await this.setupPerformanceTestData();

    // Run performance tests
    await this.testDatabaseQueryPerformance();
    await this.testCachePerformance();
    await this.testBulkOperations();
    await this.testConcurrentRequests();
    await this.testMemoryLeaks();
    await this.testAnalyticsPerformance();

    await this.cleanupPerformanceTestData();

    return this.generatePerformanceSummary();
  }

  private async runPerformanceTest(
    testName: string,
    testFunction: () => Promise<void>,
    thresholdMs: number
  ): Promise<void> {
    const memoryBefore = process.memoryUsage();
    const startTime = Date.now();
    
    try {
      console.log(`\n⚡ Performance Test: ${testName}`);
      await testFunction();
      
      const duration = Date.now() - startTime;
      const memoryAfter = process.memoryUsage();
      const memoryDelta = memoryAfter.heapUsed - memoryBefore.heapUsed;
      
      const status = duration <= thresholdMs ? "PASS" : "FAIL";
      
      this.results.push({
        name: testName,
        duration,
        memoryUsage: {
          before: memoryBefore,
          after: memoryAfter,
          delta: memoryDelta,
        },
        status,
        threshold: thresholdMs,
      });
      
      console.log(`${status === "PASS" ? "✅" : "❌"} ${testName}: ${duration}ms (threshold: ${thresholdMs}ms)`);
      if (memoryDelta > 0) {
        console.log(`   Memory: +${this.formatBytes(memoryDelta)}`);
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const memoryAfter = process.memoryUsage();
      
      this.results.push({
        name: testName,
        duration,
        memoryUsage: {
          before: memoryBefore,
          after: memoryAfter,
          delta: memoryAfter.heapUsed - memoryBefore.heapUsed,
        },
        status: "FAIL",
        threshold: thresholdMs,
        error: error.message,
      });
      
      console.log(`❌ ${testName} FAILED: ${error.message}`);
    }
  }

  private async setupPerformanceTestData(): Promise<void> {
    await dbConnect();
    
    // Clean up any existing test data first
    await User.deleteMany({ 
      $or: [
        { email: { $regex: /@perftest\.com$/ } },
        { email: { $regex: /perfuser\d+@test\.com/ } }
      ]
    });
    await Family.deleteMany({ name: { $regex: /Performance Test/ } });
    await Chore.deleteMany({ 
      $or: [
        { category: { $in: ["testing", "concurrent"] } },
        { title: { $regex: /Performance Test/ } }
      ]
    });
    
    // Create a test admin user first
    const adminUser = new User({
      name: "Performance Test Admin",
      email: "admin@perftest.com",
      role: "parent",
      hasAccess: true,
    });
    await adminUser.save();
    
    // Create test family
    const testFamily = new Family({
      name: "Performance Test Family",
      description: "Family for performance testing",
      members: [
        { 
          user: adminUser._id, 
          name: adminUser.name,
          role: "parent", 
          joinedAt: new Date() 
        }
      ],
      createdBy: adminUser._id,
    });
    await testFamily.save();
    
    // Update admin user with family ID
    adminUser.familyId = testFamily._id;
    await adminUser.save();
    
    this.testData.familyId = testFamily._id;
    this.testData.adminId = adminUser._id;

    // Create test users
    const users = [];
    for (let i = 0; i < 10; i++) {
      const user = new User({
        name: `Perf Test User ${i}`,
        email: `perfuser${i}@test.com`,
        role: i % 3 === 0 ? "parent" : "child",
        familyId: testFamily._id,
        hasAccess: true,
        gamification: {
          totalPoints: Math.floor(Math.random() * 1000),
          level: Math.floor(Math.random() * 10) + 1,
          choresCompleted: Math.floor(Math.random() * 50),
          streak: Math.floor(Math.random() * 15),
          lastActivityAt: new Date(),
          achievements: [],
          challenges: [],
          redeemedRewards: [],
          pendingRewards: [],
        },
      });
      await user.save();
      users.push(user);
    }
    this.testData.users = users;

    // Create test chores
    const chores = [];
    const categories = ["cleaning", "organizing", "maintenance", "outdoor", "cooking"];
    const statuses = ["pending", "in_progress", "completed", "verified"];
    
    for (let i = 0; i < 1000; i++) {
      const assignedUser = users[Math.floor(Math.random() * users.length)];
      const chore = new Chore({
        title: `Performance Test Chore ${i}`,
        description: `Description for chore ${i}`,
        assignedTo: assignedUser._id,
        family: testFamily._id,
        createdBy: users[0]._id, // First user as creator
        assignedBy: users[0]._id, // Same user as assigner
        dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000), // Random due date within 30 days
        points: Math.floor(Math.random() * 50) + 10,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        category: categories[Math.floor(Math.random() * categories.length)],
        priority: ["low", "medium", "high"][Math.floor(Math.random() * 3)],
        estimatedDuration: Math.floor(Math.random() * 120) + 15, // 15-135 minutes
        completedAt: Math.random() > 0.5 ? new Date() : undefined,
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Random creation date within 90 days
      });
      await chore.save();
      chores.push(chore);
    }
    this.testData.chores = chores;

    console.log(`Created ${users.length} users and ${chores.length} chores for performance testing`);
  }

  private async testDatabaseQueryPerformance(): Promise<void> {
    await this.runPerformanceTest("Simple Chore Query", async () => {
      await Chore.find({ family: this.testData.familyId }).limit(100);
    }, 100);

    await this.runPerformanceTest("Complex Aggregation Query", async () => {
      await Chore.aggregate([
        { $match: { family: this.testData.familyId } },
        {
          $group: {
            _id: "$category",
            totalChores: { $sum: 1 },
            avgPoints: { $avg: "$points" },
            completedChores: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
          },
        },
        { $sort: { totalChores: -1 } },
      ]);
    }, 200);

    await this.runPerformanceTest("Populated Query", async () => {
      await Chore.find({ family: this.testData.familyId })
        .populate("assignedTo", "name")
        .populate("createdBy", "name")
        .limit(50);
    }, 300);

    await this.runPerformanceTest("Optimized Query with Performance Service", async () => {
      const performanceService = getPerformanceService();
      await performanceService.optimizedFind(
        Chore,
        { family: this.testData.familyId },
        {
          limit: 100,
          populate: "assignedTo",
          cache: true,
          lean: true,
        }
      );
    }, 50);
  }

  private async testCachePerformance(): Promise<void> {
    const performanceService = getPerformanceService();

    await this.runPerformanceTest("Cache Write Performance", async () => {
      for (let i = 0; i < 1000; i++) {
        performanceService.setCache(`test_key_${i}`, { data: `test_data_${i}` }, 30);
      }
    }, 100);

    await this.runPerformanceTest("Cache Read Performance", async () => {
      for (let i = 0; i < 1000; i++) {
        performanceService.getCache(`test_key_${i}`);
      }
    }, 50);

    await this.runPerformanceTest("Cache Invalidation Performance", async () => {
      performanceService.invalidateCache(["test"]);
    }, 20);
  }

  private async testBulkOperations(): Promise<void> {
    const performanceService = getPerformanceService();

    await this.runPerformanceTest("Bulk Insert Performance", async () => {
      const testDocs = [];
      for (let i = 0; i < 100; i++) {
        testDocs.push({
          title: `Bulk Test Chore ${i}`,
          description: `Bulk inserted chore ${i}`,
          assignedTo: this.testData.users[0]._id,
          family: this.testData.familyId,
          createdBy: this.testData.users[0]._id,
          assignedBy: this.testData.users[0]._id,
          dueDate: new Date(),
          points: 10,
          status: "pending",
          category: "testing",
        });
      }

      const results = await performanceService.batchInsert(Chore, testDocs, 20);
      
      // Clean up
      await Chore.deleteMany({ category: "testing" });
      
      if (results.length !== 100) {
        throw new Error(`Expected 100 docs, got ${results.length}`);
      }
    }, 500);

    await this.runPerformanceTest("Bulk Update Performance", async () => {
      const updates = [];
      for (let i = 0; i < 100; i++) {
        updates.push({
          filter: { _id: this.testData.chores[i]._id },
          update: { $set: { priority: "high" } },
        });
      }

      await performanceService.batchUpdate(Chore, updates, 25);
    }, 300);
  }

  private async testConcurrentRequests(): Promise<void> {
    await this.runPerformanceTest("Concurrent Read Requests", async () => {
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          Chore.find({ family: this.testData.familyId }).limit(10).lean()
        );
      }
      await Promise.all(promises);
    }, 1000);

    await this.runPerformanceTest("Concurrent Write Requests", async () => {
      const promises = [];
      for (let i = 0; i < 20; i++) {
        const chore = new Chore({
          title: `Concurrent Test Chore ${i}`,
          description: `Concurrently created chore ${i}`,
          assignedTo: this.testData.users[0]._id,
          family: this.testData.familyId,
          createdBy: this.testData.users[0]._id,
          assignedBy: this.testData.users[0]._id,
          dueDate: new Date(),
          points: 10,
          status: "pending",
          category: "concurrent",
        });
        promises.push(chore.save());
      }
      
      await Promise.all(promises);
      
      // Clean up
      await Chore.deleteMany({ category: "concurrent" });
    }, 1500);
  }

  private async testMemoryLeaks(): Promise<void> {
    const initialMemory = process.memoryUsage();

    await this.runPerformanceTest("Memory Leak Detection", async () => {
      // Perform operations that could cause memory leaks
      for (let i = 0; i < 100; i++) {
        // Query and hold references
        const chores = await Chore.find({ family: this.testData.familyId }).limit(50);
        
        // Process data
        const processed = chores.map(chore => ({
          id: chore._id,
          title: chore.title,
          points: chore.points,
        }));
        
        // Simulate some processing
        const sum = processed.reduce((acc, chore) => acc + chore.points, 0);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Fail if memory increased by more than 50MB
      if (memoryIncrease > 50 * 1024 * 1024) {
        throw new Error(`Potential memory leak: ${this.formatBytes(memoryIncrease)} increase`);
      }
    }, 5000);
  }

  private async testAnalyticsPerformance(): Promise<void> {
    const analyticsService = getAnalyticsService();

    await this.runPerformanceTest("User Progress Analytics", async () => {
      for (const user of this.testData.users.slice(0, 5)) {
        await analyticsService.getUserProgress(user._id.toString(), "month");
      }
    }, 500);

    await this.runPerformanceTest("Time Series Data Generation", async () => {
      for (const user of this.testData.users.slice(0, 3)) {
        await analyticsService.getTimeSeriesData(user._id.toString(), "month");
      }
    }, 800);

    await this.runPerformanceTest("Family Analytics", async () => {
      await analyticsService.getFamilyAnalytics(this.testData.familyId.toString(), "month");
    }, 1000);

    await this.runPerformanceTest("Category Insights", async () => {
      for (const user of this.testData.users.slice(0, 3)) {
        await analyticsService.getCategoryInsights(user._id.toString(), "month");
      }
    }, 600);
  }

  private async cleanupPerformanceTestData(): Promise<void> {
    // Delete test data
    await Chore.deleteMany({ family: this.testData.familyId });
    await User.deleteMany({ familyId: this.testData.familyId });
    if (this.testData.adminId) {
      await User.findByIdAndDelete(this.testData.adminId);
    }
    await Family.findByIdAndDelete(this.testData.familyId);

    console.log("Performance test data cleaned up");
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  private generatePerformanceSummary(): {
    results: PerformanceTest[];
    summary: string;
    overallStatus: "PASS" | "FAIL";
  } {
    const passed = this.results.filter(r => r.status === "PASS").length;
    const failed = this.results.filter(r => r.status === "FAIL").length;
    
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;
    const slowestTest = this.results.reduce((slowest, current) => 
      current.duration > slowest.duration ? current : slowest
    );
    const fastestTest = this.results.reduce((fastest, current) => 
      current.duration < fastest.duration ? current : fastest
    );

    const totalMemoryDelta = this.results.reduce((sum, r) => sum + Math.max(0, r.memoryUsage.delta), 0);

    const overallStatus = failed === 0 ? "PASS" : "FAIL";

    const summary = `
🚀 PERFORMANCE TEST RESULTS
${"=".repeat(40)}
✅ Passed: ${passed}
❌ Failed: ${failed}
📊 Average Duration: ${Math.round(avgDuration)}ms
⚡ Fastest Test: ${fastestTest.name} (${fastestTest.duration}ms)
🐌 Slowest Test: ${slowestTest.name} (${slowestTest.duration}ms)
💾 Total Memory Delta: ${this.formatBytes(totalMemoryDelta)}

${failed > 0 ? "❌ PERFORMANCE ISSUES DETECTED" : "✅ ALL PERFORMANCE TESTS PASSED"}

DETAILED RESULTS:
${this.results.map(r => 
  `${r.status === "PASS" ? "✅" : "❌"} ${r.name}: ${r.duration}ms (threshold: ${r.threshold}ms)${r.error ? ` - ${r.error}` : ""}`
).join("\n")}
`;

    console.log(summary);

    return {
      results: this.results,
      summary,
      overallStatus,
    };
  }
}

// Run performance tests if called directly
if (require.main === module) {
  const performanceTests = new PerformanceTestSuite();
  performanceTests.runPerformanceTests()
    .then((results) => {
      process.exit(results.overallStatus === "FAIL" ? 1 : 0);
    })
    .catch((error) => {
      console.error("Performance test suite failed:", error);
      process.exit(1);
    });
}

export default PerformanceTestSuite;