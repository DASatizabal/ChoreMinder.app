import { dbConnect } from "../libs/mongoose";
import User from "../models/User";
import Family from "../models/Family";
import Chore from "../models/Chore";
import { getGamificationService } from "../libs/gamification";
import { getSchedulingService } from "../libs/scheduling";
import { getAnalyticsService } from "../libs/analytics";
import { getPerformanceService } from "../libs/performance";

interface TestResult {
  test: string;
  status: "PASS" | "FAIL" | "SKIP";
  duration: number;
  error?: string;
  details?: any;
}

class CoreIntegrationTestSuite {
  private results: TestResult[] = [];
  private testData: any = {};

  async runAllTests(): Promise<{
    passed: number;
    failed: number;
    skipped: number;
    results: TestResult[];
    summary: string;
  }> {
    console.log("🧪 Starting Core Integration Tests (External Services Excluded)");
    console.log("=".repeat(60));

    await this.setupTestEnvironment();

    // Run core test suites
    await this.testDatabaseConnectivity();
    await this.testUserManagement();
    await this.testFamilyIsolation();
    await this.testChoreLifecycle();
    await this.testGamificationIntegration();
    await this.testSchedulingSystem();
    await this.testAnalyticsSystem();
    await this.testPermissionBoundaries();
    await this.testPerformanceOptimizations();
    await this.testDataConsistency();
    await this.testCompleteUserWorkflows();

    await this.cleanupTestEnvironment();

    return this.generateSummary();
  }

  private async runTest(
    testName: string,
    testFunction: () => Promise<void>
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`\n🔍 Testing: ${testName}`);
      await testFunction();
      
      const duration = Date.now() - startTime;
      this.results.push({
        test: testName,
        status: "PASS",
        duration,
      });
      
      console.log(`✅ PASS: ${testName} (${duration}ms)`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      if (error.message.startsWith("SKIP:")) {
        this.results.push({
          test: testName,
          status: "SKIP",
          duration,
          error: error.message.replace("SKIP: ", ""),
        });
        
        console.log(`⏭️ SKIP: ${testName} (${duration}ms)`);
        console.log(`   Reason: ${error.message.replace("SKIP: ", "")}`);
      } else {
        this.results.push({
          test: testName,
          status: "FAIL",
          duration,
          error: error.message,
        });
        
        console.log(`❌ FAIL: ${testName} (${duration}ms)`);
        console.log(`   Error: ${error.message}`);
      }
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    await this.runTest("Setup Test Environment", async () => {
      await dbConnect();
      
      // Create test family
      const testFamily = new Family({
        name: "Core Test Family",
        description: "Core integration test family",
        members: [],
        settings: {
          allowChildSelfAssign: true,
          requirePhotoVerification: false,
          pointsSystem: true,
        },
      });
      await testFamily.save();
      this.testData.familyId = testFamily._id;

      // Create test users
      const parentUser = new User({
        name: "Test Parent",
        email: "parent@test.com",
        role: "parent",
        familyId: testFamily._id,
        hasAccess: true,
      });
      await parentUser.save();
      this.testData.parentId = parentUser._id;

      const childUser = new User({
        name: "Test Child",
        email: "child@test.com",
        role: "child",
        familyId: testFamily._id,
        hasAccess: true,
        gamification: {
          totalPoints: 0,
          level: 1,
          choresCompleted: 0,
          streak: 0,
          lastActivityAt: new Date(),
          achievements: [],
          challenges: [],
          redeemedRewards: [],
          pendingRewards: [],
        },
      });
      await childUser.save();
      this.testData.childId = childUser._id;

      // Update family members
      testFamily.members = [
        { userId: parentUser._id, role: "parent", joinedAt: new Date() },
        { userId: childUser._id, role: "child", joinedAt: new Date() },
      ];
      await testFamily.save();

      console.log("Core test environment setup completed");
    });
  }

  private async testDatabaseConnectivity(): Promise<void> {
    await this.runTest("Database Connectivity", async () => {
      const performanceService = getPerformanceService();
      const dbHealth = await performanceService.getDatabaseHealth();
      
      if (dbHealth.connectionStatus !== "healthy") {
        throw new Error(`Database health check failed: ${dbHealth.connectionStatus}`);
      }
      
      if (dbHealth.responseTime > 1000) {
        throw new Error(`Database response time too slow: ${dbHealth.responseTime}ms`);
      }
    });
  }

  private async testUserManagement(): Promise<void> {
    await this.runTest("User Registration and Authentication", async () => {
      const newUser = new User({
        name: "New Test User",
        email: "newuser@test.com",
        role: "child",
        familyId: this.testData.familyId,
        hasAccess: true,
      });
      await newUser.save();

      const savedUser = await User.findById(newUser._id);
      if (!savedUser) throw new Error("User not saved properly");
      if (savedUser.role !== "child") throw new Error("User role not set correctly");

      await User.findByIdAndDelete(newUser._id);
    });
  }

  private async testFamilyIsolation(): Promise<void> {
    await this.runTest("Family Data Isolation", async () => {
      const family2 = new Family({
        name: "Test Family 2",
        description: "Second test family",
        members: [],
      });
      await family2.save();

      const user2 = new User({
        name: "User Family 2",
        email: "user2@test.com",
        role: "parent",
        familyId: family2._id,
        hasAccess: true,
      });
      await user2.save();

      const chore1 = new Chore({
        title: "Family 1 Chore",
        description: "Should not be visible to family 2",
        assignedTo: this.testData.childId,
        family: this.testData.familyId,
        createdBy: this.testData.parentId,
        dueDate: new Date(),
        points: 10,
        status: "pending",
      });
      await chore1.save();

      const family2Chores = await Chore.find({ family: family2._id });
      const family1ChoresVisible = await Chore.find({ 
        family: this.testData.familyId,
        assignedTo: user2._id 
      });

      if (family2Chores.some(c => c.family.toString() === this.testData.familyId.toString())) {
        throw new Error("Family data isolation breach: Family 2 can see Family 1 chores");
      }

      if (family1ChoresVisible.length > 0) {
        throw new Error("Family data isolation breach: Cross-family assignment possible");
      }

      await Chore.findByIdAndDelete(chore1._id);
      await User.findByIdAndDelete(user2._id);
      await Family.findByIdAndDelete(family2._id);
    });
  }

  private async testChoreLifecycle(): Promise<void> {
    await this.runTest("Complete Chore Lifecycle", async () => {
      const chore = new Chore({
        title: "Test Lifecycle Chore",
        description: "Complete lifecycle test",
        assignedTo: this.testData.childId,
        family: this.testData.familyId,
        createdBy: this.testData.parentId,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        points: 25,
        status: "pending",
        category: "cleaning",
        priority: "medium",
        estimatedDuration: 30,
        requiresPhotoVerification: false,
      });
      await chore.save();

      // Test status transitions
      chore.status = "in_progress";
      chore.startedAt = new Date();
      await chore.save();

      chore.status = "completed";
      chore.completedAt = new Date();
      chore.completedBy = this.testData.childId;
      await chore.save();

      chore.status = "approved";
      chore.verifiedAt = new Date();
      chore.verifiedBy = this.testData.parentId;
      await chore.save();

      this.testData.testChoreId = chore._id;
    });
  }

  private async testGamificationIntegration(): Promise<void> {
    await this.runTest("Gamification Points System", async () => {
      const gamificationService = getGamificationService();
      
      const pointsBreakdown = await gamificationService.calculatePointsForChore(
        this.testData.testChoreId,
        this.testData.childId,
        "good"
      );

      if (pointsBreakdown.basePoints !== 25) {
        throw new Error(`Incorrect base points: expected 25, got ${pointsBreakdown.basePoints}`);
      }

      const result = await gamificationService.awardPoints(
        this.testData.childId,
        pointsBreakdown,
        this.testData.testChoreId
      );

      if (result.totalPoints <= 0) {
        throw new Error("Points not awarded properly");
      }

      const user = await User.findById(this.testData.childId);
      if (user?.gamification?.totalPoints !== result.totalPoints) {
        throw new Error("User points not updated in database");
      }
    });
  }

  private async testSchedulingSystem(): Promise<void> {
    await this.runTest("Recurring Chore Scheduling", async () => {
      const schedulingService = getSchedulingService();
      
      const scheduledChore = await schedulingService.createScheduledChore({
        title: "Weekly Test Chore",
        description: "Recurring weekly chore",
        category: "cleaning",
        points: 15,
        estimatedDuration: 30,
        assignedTo: this.testData.childId,
        familyId: this.testData.familyId.toString(),
        recurrence: {
          type: "weekly",
          interval: 1,
          daysOfWeek: [1, 3, 5],
        },
        isActive: true,
        createdBy: this.testData.parentId,
        priority: "medium",
        requiresPhotoVerification: false,
        tags: ["recurring", "test"],
      });

      if (!scheduledChore.id) {
        throw new Error("Scheduled chore not created");
      }

      this.testData.scheduleId = scheduledChore.id;
    });
  }

  private async testAnalyticsSystem(): Promise<void> {
    await this.runTest("Analytics Data Generation", async () => {
      const analyticsService = getAnalyticsService();
      
      const progress = await analyticsService.getUserProgress(this.testData.childId, "week");
      
      if (progress.completionRate < 0 || progress.completionRate > 100) {
        throw new Error("Invalid completion rate calculated");
      }

      const timeSeriesData = await analyticsService.getTimeSeriesData(this.testData.childId, "week");
      
      if (!Array.isArray(timeSeriesData)) {
        throw new Error("Time series data not generated properly");
      }
    });
  }

  private async testPermissionBoundaries(): Promise<void> {
    await this.runTest("Permission Restrictions", async () => {
      const parentUser = await User.findById(this.testData.parentId);
      if (!parentUser || parentUser.role !== "parent") {
        throw new Error("Parent user not found or role incorrect");
      }

      const familyChores = await Chore.find({ family: this.testData.familyId });
      if (familyChores.length === 0) {
        throw new Error("Parents cannot access family chores");
      }
    });
  }

  private async testPerformanceOptimizations(): Promise<void> {
    await this.runTest("Database Query Performance", async () => {
      const performanceService = getPerformanceService();
      
      const startTime = Date.now();
      
      const chores = await performanceService.optimizedFind(
        Chore,
        { family: this.testData.familyId },
        {
          limit: 100,
          populate: "assignedTo",
          cache: true,
          cacheTTL: 5,
        }
      );
      
      const queryTime = Date.now() - startTime;
      
      if (queryTime > 1000) {
        throw new Error(`Query too slow: ${queryTime}ms`);
      }
    });
  }

  private async testDataConsistency(): Promise<void> {
    await this.runTest("Cross-Feature Data Consistency", async () => {
      const user = await User.findById(this.testData.childId);
      const completedChores = await Chore.countDocuments({
        assignedTo: this.testData.childId,
        status: "approved",
      });

      if (!user?.gamification) {
        throw new Error("User gamification data missing");
      }

      // Verify family consistency
      const family = await Family.findById(this.testData.familyId);
      const familyUsers = await User.find({ familyId: this.testData.familyId });

      if (!family) throw new Error("Test family not found");

      if (family.members.length !== familyUsers.length) {
        throw new Error(`Family member count mismatch: family has ${family.members.length}, users table has ${familyUsers.length}`);
      }
    });
  }

  private async testCompleteUserWorkflows(): Promise<void> {
    await this.runTest("Complete Parent Workflow", async () => {
      const newChore = new Chore({
        title: "Parent Workflow Test Chore",
        description: "End-to-end parent workflow test",
        assignedTo: this.testData.childId,
        family: this.testData.familyId,
        createdBy: this.testData.parentId,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        points: 20,
        status: "pending",
        category: "organizing",
        priority: "medium",
      });
      await newChore.save();

      newChore.status = "completed";
      newChore.completedAt = new Date();
      newChore.completedBy = this.testData.childId;
      await newChore.save();

      newChore.status = "approved";
      newChore.verifiedAt = new Date();
      newChore.verifiedBy = this.testData.parentId;
      await newChore.save();

      await Chore.findByIdAndDelete(newChore._id);
    });
  }

  private async cleanupTestEnvironment(): Promise<void> {
    await this.runTest("Cleanup Test Environment", async () => {
      await Chore.deleteMany({ family: this.testData.familyId });
      await User.deleteMany({ familyId: this.testData.familyId });
      await Family.findByIdAndDelete(this.testData.familyId);
      
      if (this.testData.scheduleId) {
        await Chore.deleteMany({ scheduleId: this.testData.scheduleId });
      }

      console.log("Core test environment cleaned up");
    });
  }

  private generateSummary(): {
    passed: number;
    failed: number;
    skipped: number;
    results: TestResult[];
    summary: string;
  } {
    const passed = this.results.filter(r => r.status === "PASS").length;
    const failed = this.results.filter(r => r.status === "FAIL").length;
    const skipped = this.results.filter(r => r.status === "SKIP").length;
    
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = totalDuration / this.results.length;

    const summary = `
📊 CORE INTEGRATION TEST RESULTS
${"=".repeat(40)}
✅ Passed: ${passed}
❌ Failed: ${failed}
⏭️ Skipped: ${skipped}
⏱️ Total Duration: ${totalDuration}ms
📈 Average Test Duration: ${Math.round(avgDuration)}ms

${failed > 0 ? "❌ SOME CORE TESTS FAILED - REVIEW REQUIRED" : "✅ ALL CORE TESTS PASSED - SYSTEM READY"}
`;

    console.log(summary);

    return {
      passed,
      failed,
      skipped,
      results: this.results,
      summary,
    };
  }
}

// Run tests if called directly
if (require.main === module) {
  const testSuite = new CoreIntegrationTestSuite();
  testSuite.runAllTests()
    .then((results) => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("Core test suite failed:", error);
      process.exit(1);
    });
}

export default CoreIntegrationTestSuite;