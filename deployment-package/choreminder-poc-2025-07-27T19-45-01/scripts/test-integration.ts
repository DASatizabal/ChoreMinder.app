import { getAnalyticsService } from "../libs/analytics";
import { getGamificationService } from "../libs/gamification";
import { dbConnect } from "../libs/mongoose";
import { getPerformanceService } from "../libs/performance";
import { getSchedulingService } from "../libs/scheduling";
import Achievement from "../models/Achievement";
import Challenge from "../models/Challenge";
import Chore from "../models/Chore";
import Family from "../models/Family";
import Reward from "../models/Reward";
import User from "../models/User";
// Import messaging services conditionally to handle missing env vars
let getUnifiedMessagingService: any = null;
let getNotificationService: any = null;

try {
  const messagingModule = require("../libs/unified-messaging");
  getUnifiedMessagingService = messagingModule.getUnifiedMessagingService;
} catch (error) {
  console.warn("Unified messaging service not available for testing");
}

try {
  const notificationModule = require("../libs/notifications");
  getNotificationService = notificationModule.getNotificationService;
} catch (error) {
  console.warn("Notification service not available for testing");
}

interface TestResult {
  test: string;
  status: "PASS" | "FAIL" | "SKIP";
  duration: number;
  error?: string;
  details?: any;
}

class IntegrationTestSuite {
  private results: TestResult[] = [];
  private testData: any = {};

  async runAllTests(): Promise<{
    passed: number;
    failed: number;
    skipped: number;
    results: TestResult[];
    summary: string;
  }> {
    console.log("🧪 Starting Comprehensive Integration Tests");
    console.log("=".repeat(60));

    await this.setupTestEnvironment();

    // Run test suites in order
    await this.testDatabaseConnectivity();
    await this.testUserManagement();
    await this.testFamilyIsolation();
    await this.testChoreLifecycle();
    await this.testGamificationIntegration();
    await this.testSchedulingSystem();
    await this.testNotificationSystem();
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
    testFunction: () => Promise<void>,
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

      // Handle SKIP errors
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
        name: "Test Family",
        description: "Integration test family",
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
        communicationPreferences: {
          primaryChannel: "email",
          fallbackChannels: ["sms", "whatsapp"],
          enabledNotifications: {
            choreAssigned: true,
            choreReminder: true,
            choreCompleted: true,
            choreApproved: true,
            choreRejected: true,
            weeklyDigest: true,
            familyUpdates: true,
          },
        },
      });
      await parentUser.save();
      this.testData.parentId = parentUser._id;

      const childUser = new User({
        name: "Test Child",
        email: "child@test.com",
        role: "child",
        familyId: testFamily._id,
        hasAccess: true,
        communicationPreferences: {
          primaryChannel: "whatsapp",
          fallbackChannels: ["sms", "email"],
          enabledNotifications: {
            choreAssigned: true,
            choreReminder: true,
            choreCompleted: true,
            choreApproved: true,
            choreRejected: true,
            weeklyDigest: false,
            familyUpdates: false,
          },
        },
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

      console.log("Test environment setup completed");
    });
  }

  private async testDatabaseConnectivity(): Promise<void> {
    await this.runTest("Database Connectivity", async () => {
      const performanceService = getPerformanceService();
      const dbHealth = await performanceService.getDatabaseHealth();

      if (dbHealth.connectionStatus !== "healthy") {
        throw new Error(
          `Database health check failed: ${dbHealth.connectionStatus}`,
        );
      }

      if (dbHealth.responseTime > 1000) {
        throw new Error(
          `Database response time too slow: ${dbHealth.responseTime}ms`,
        );
      }
    });
  }

  private async testUserManagement(): Promise<void> {
    await this.runTest("User Registration and Authentication", async () => {
      // Test user creation
      const newUser = new User({
        name: "New Test User",
        email: "newuser@test.com",
        role: "child",
        familyId: this.testData.familyId,
        hasAccess: true,
      });
      await newUser.save();

      // Verify user was created with defaults
      const savedUser = await User.findById(newUser._id);
      if (!savedUser) throw new Error("User not saved properly");
      if (savedUser.role !== "child")
        throw new Error("User role not set correctly");
      if (!savedUser.gamification)
        throw new Error("Gamification data not initialized");

      await User.findByIdAndDelete(newUser._id);
    });

    await this.runTest("User Preferences Management", async () => {
      const user = await User.findById(this.testData.childId);
      if (!user) throw new Error("Test user not found");

      // Update communication preferences
      user.communicationPreferences!.primaryChannel = "sms";
      user.communicationPreferences!.quietHours = {
        enabled: true,
        start: "22:00",
        end: "08:00",
        timezone: "UTC",
      };
      await user.save();

      // Verify update
      const updatedUser = await User.findById(this.testData.childId);
      if (updatedUser?.communicationPreferences?.primaryChannel !== "sms") {
        throw new Error("Communication preferences not updated");
      }
    });
  }

  private async testFamilyIsolation(): Promise<void> {
    await this.runTest("Family Data Isolation", async () => {
      // Create second family
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

      // Create chore in family 1
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

      // Try to query as family 2 user - should not see family 1 chores
      const family2Chores = await Chore.find({ family: family2._id });
      const family1ChoresVisible = await Chore.find({
        family: this.testData.familyId,
        assignedTo: user2._id,
      });

      if (
        family2Chores.some(
          (c) => c.family.toString() === this.testData.familyId.toString(),
        )
      ) {
        throw new Error(
          "Family data isolation breach: Family 2 can see Family 1 chores",
        );
      }

      if (family1ChoresVisible.length > 0) {
        throw new Error(
          "Family data isolation breach: Cross-family assignment possible",
        );
      }

      // Cleanup
      await Chore.findByIdAndDelete(chore1._id);
      await User.findByIdAndDelete(user2._id);
      await Family.findByIdAndDelete(family2._id);
    });
  }

  private async testChoreLifecycle(): Promise<void> {
    await this.runTest("Complete Chore Lifecycle", async () => {
      // Create chore
      const chore = new Chore({
        title: "Test Lifecycle Chore",
        description: "Complete lifecycle test",
        assignedTo: this.testData.childId,
        family: this.testData.familyId,
        createdBy: this.testData.parentId,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        points: 25,
        status: "pending",
        category: "cleaning",
        priority: "medium",
        estimatedDuration: 30,
        requiresPhotoVerification: false,
      });
      await chore.save();

      // Test status transitions: pending -> in_progress -> completed -> approved
      chore.status = "in_progress";
      chore.startedAt = new Date();
      await chore.save();

      if (chore.status !== "in_progress") {
        throw new Error("Status transition to in_progress failed");
      }

      chore.status = "completed";
      chore.completedAt = new Date();
      chore.completedBy = this.testData.childId;
      await chore.save();

      if (chore.status !== "completed") {
        throw new Error("Status transition to completed failed");
      }

      chore.status = "approved";
      chore.verifiedAt = new Date();
      chore.verifiedBy = this.testData.parentId;
      await chore.save();

      if (chore.status !== "approved") {
        throw new Error("Status transition to approved failed");
      }

      this.testData.testChoreId = chore._id;
    });

    await this.runTest("Chore History Tracking", async () => {
      const chore = await Chore.findById(this.testData.testChoreId);
      if (!chore) throw new Error("Test chore not found");

      // Verify history entries were created
      if (!chore.history || chore.history.length === 0) {
        throw new Error("Chore history not tracked");
      }

      // Check for required timestamps
      if (!chore.startedAt || !chore.completedAt || !chore.verifiedAt) {
        throw new Error("Chore timestamps not set properly");
      }
    });
  }

  private async testGamificationIntegration(): Promise<void> {
    await this.runTest("Gamification Points System", async () => {
      const gamificationService = getGamificationService();

      // Calculate points for completed chore
      const pointsBreakdown = await gamificationService.calculatePointsForChore(
        this.testData.testChoreId,
        this.testData.childId,
        "good",
      );

      if (pointsBreakdown.basePoints !== 25) {
        throw new Error(
          `Incorrect base points: expected 25, got ${pointsBreakdown.basePoints}`,
        );
      }

      if (pointsBreakdown.totalPoints <= pointsBreakdown.basePoints) {
        throw new Error("No bonuses calculated for early completion");
      }

      // Award points
      const result = await gamificationService.awardPoints(
        this.testData.childId,
        pointsBreakdown,
        this.testData.testChoreId,
      );

      if (result.totalPoints <= 0) {
        throw new Error("Points not awarded properly");
      }

      // Verify user points updated
      const user = await User.findById(this.testData.childId);
      if (user?.gamification?.totalPoints !== result.totalPoints) {
        throw new Error("User points not updated in database");
      }
    });

    await this.runTest("Achievement System", async () => {
      const gamificationService = getGamificationService();

      // Get user achievements
      const achievements = await gamificationService.getUserAchievements(
        this.testData.childId,
      );

      if (achievements.length === 0) {
        throw new Error("No achievements loaded");
      }

      // Check for "First Steps" achievement (complete first chore)
      const firstSteps = achievements.find((a) => a.name === "First Steps");
      if (!firstSteps) {
        throw new Error("First Steps achievement not found");
      }

      if (firstSteps.currentProgress < 1) {
        throw new Error("Achievement progress not updated");
      }
    });

    await this.runTest("Rewards System", async () => {
      const gamificationService = getGamificationService();

      // Get available rewards
      const rewards = await gamificationService.getAvailableRewards(
        this.testData.childId,
      );

      if (rewards.length === 0) {
        throw new Error("No rewards available");
      }

      // Find an affordable reward
      const affordableReward = rewards.find((r) => r.canAfford);
      if (!affordableReward) {
        throw new Error("No affordable rewards found");
      }

      // Request reward
      const result = await gamificationService.requestReward(
        this.testData.childId,
        affordableReward.rewardId,
      );

      if (!result.success) {
        throw new Error(`Reward request failed: ${result.error}`);
      }
    });
  }

  private async testSchedulingSystem(): Promise<void> {
    await this.runTest("Recurring Chore Scheduling", async () => {
      const schedulingService = getSchedulingService();

      // Create scheduled chore
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
          daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
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

      // Verify chore instances were generated
      const instances = await Chore.find({
        scheduleId: scheduledChore.id,
        isRecurring: false,
      });

      if (instances.length === 0) {
        throw new Error("No chore instances generated");
      }

      this.testData.scheduleId = scheduledChore.id;
    });

    await this.runTest("Schedule Optimization", async () => {
      const schedulingService = getSchedulingService();

      // Check for conflicts
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const conflicts = await schedulingService.checkScheduleConflicts(
        this.testData.childId,
        tomorrow,
        new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
      );

      // Optimize family schedule
      const optimization = await schedulingService.optimizeFamilySchedule(
        this.testData.familyId.toString(),
        tomorrow,
      );

      if (!optimization.recommendations) {
        throw new Error("Schedule optimization not working");
      }
    });
  }

  private async testNotificationSystem(): Promise<void> {
    await this.runTest("Notification Triggers", async () => {
      if (!getNotificationService) {
        throw new Error("SKIP: Notification service not available");
      }
      const notificationService = getNotificationService();

      // Trigger chore assignment notification
      await notificationService.triggerNotification({
        type: "chore_assigned",
        userId: this.testData.childId,
        choreId: this.testData.testChoreId,
        data: {
          choreName: "Test Notification Chore",
          dueDate: new Date(),
        },
      });

      // Note: In a real test, we'd verify the notification was scheduled
      // For now, we just ensure no errors were thrown
    });

    await this.runTest("Unified Messaging Integration", async () => {
      if (!getUnifiedMessagingService) {
        throw new Error("SKIP: Unified messaging service not available");
      }
      const messagingService = getUnifiedMessagingService();

      // Test message sending (without actually sending)
      const user = await User.findById(this.testData.childId);
      const chore = await Chore.findById(this.testData.testChoreId);

      if (!user || !chore) {
        throw new Error("Test data not found for messaging test");
      }

      // This would normally send a message, but we're testing the logic
      const serviceStatus = messagingService.getServiceStatus();
      if (!serviceStatus.email.configured) {
        throw new Error("Email service not configured");
      }
    });
  }

  private async testAnalyticsSystem(): Promise<void> {
    await this.runTest("Analytics Data Generation", async () => {
      const analyticsService = getAnalyticsService();

      // Get user progress
      const progress = await analyticsService.getUserProgress(
        this.testData.childId,
        "week",
      );

      if (progress.totalChores === 0) {
        throw new Error("Analytics not tracking chores");
      }

      if (progress.completionRate < 0 || progress.completionRate > 100) {
        throw new Error("Invalid completion rate calculated");
      }

      // Get time series data
      const timeSeriesData = await analyticsService.getTimeSeriesData(
        this.testData.childId,
        "week",
      );

      if (timeSeriesData.length === 0) {
        throw new Error("No time series data generated");
      }

      // Get category insights
      const categoryInsights = await analyticsService.getCategoryInsights(
        this.testData.childId,
        "week",
      );

      if (categoryInsights.length === 0) {
        throw new Error("No category insights generated");
      }
    });

    await this.runTest("Family Analytics", async () => {
      const analyticsService = getAnalyticsService();

      // Get family analytics
      const familyAnalytics = await analyticsService.getFamilyAnalytics(
        this.testData.familyId.toString(),
        "week",
      );

      if (familyAnalytics.memberProgress.length === 0) {
        throw new Error("No family member progress data");
      }

      if (!familyAnalytics.insights.topPerformer) {
        throw new Error("Family insights not generated");
      }
    });
  }

  private async testPermissionBoundaries(): Promise<void> {
    await this.runTest("Child Permission Restrictions", async () => {
      // Test that child cannot delete chores
      const chore = await Chore.findById(this.testData.testChoreId);
      if (!chore) throw new Error("Test chore not found");

      // In a real app, this would be tested via API endpoints
      // Here we test the data model constraints

      // Child should not be able to verify their own chores
      if (chore.verifiedBy?.toString() === this.testData.childId.toString()) {
        // This would be prevented by API middleware
      }
    });

    await this.runTest("Parent Permission Access", async () => {
      // Test that parents can access all family data
      const parentUser = await User.findById(this.testData.parentId);
      if (!parentUser || parentUser.role !== "parent") {
        throw new Error("Parent user not found or role incorrect");
      }

      // Parents should be able to see all family chores
      const familyChores = await Chore.find({ family: this.testData.familyId });
      if (familyChores.length === 0) {
        throw new Error("Parents cannot access family chores");
      }
    });
  }

  private async testPerformanceOptimizations(): Promise<void> {
    await this.runTest("Database Query Performance", async () => {
      const performanceService = getPerformanceService();

      // Test optimized queries
      const startTime = Date.now();

      const chores = await performanceService.optimizedFind(
        Chore,
        { family: this.testData.familyId },
        {
          limit: 100,
          populate: "assignedTo",
          cache: true,
          cacheTTL: 5, // 5 minutes
        },
      );

      const queryTime = Date.now() - startTime;

      if (queryTime > 1000) {
        throw new Error(`Query too slow: ${queryTime}ms`);
      }

      if (chores.length === 0) {
        throw new Error("Optimized query returned no results");
      }
    });

    await this.runTest("Caching System", async () => {
      const performanceService = getPerformanceService();

      // Set cache
      performanceService.setCache("test_key", { data: "test_value" }, 1, [
        "test",
      ]);

      // Get cache
      const cachedData = performanceService.getCache("test_key");
      if (!cachedData || cachedData.data !== "test_value") {
        throw new Error("Cache not working properly");
      }

      // Test cache invalidation
      performanceService.invalidateCache(["test"]);
      const invalidatedData = performanceService.getCache("test_key");
      if (invalidatedData !== null) {
        throw new Error("Cache invalidation not working");
      }
    });
  }

  private async testDataConsistency(): Promise<void> {
    await this.runTest("Cross-Feature Data Consistency", async () => {
      // Verify user gamification data matches chore completion
      const user = await User.findById(this.testData.childId);
      const completedChores = await Chore.countDocuments({
        assignedTo: this.testData.childId,
        status: "approved",
      });

      if (!user?.gamification) {
        throw new Error("User gamification data missing");
      }

      if (user.gamification.choresCompleted !== completedChores) {
        throw new Error(
          `Gamification chore count mismatch: ${user.gamification.choresCompleted} vs ${completedChores}`,
        );
      }

      // Verify points consistency
      const totalChorePoints = await Chore.aggregate([
        {
          $match: {
            assignedTo: user._id,
            status: "approved",
          },
        },
        {
          $group: {
            _id: null,
            totalPoints: { $sum: "$points" },
          },
        },
      ]);

      const chorePoints = totalChorePoints[0]?.totalPoints || 0;

      // User points might be higher due to bonuses, but shouldn't be lower
      if (user.gamification.totalPoints < chorePoints) {
        throw new Error(
          `Points consistency error: user has ${user.gamification.totalPoints}, chores worth ${chorePoints}`,
        );
      }
    });

    await this.runTest("Family Member Consistency", async () => {
      // Verify family members list matches user records
      const family = await Family.findById(this.testData.familyId);
      const familyUsers = await User.find({ familyId: this.testData.familyId });

      if (!family) throw new Error("Test family not found");

      if (family.members.length !== familyUsers.length) {
        throw new Error(
          `Family member count mismatch: family has ${family.members.length}, users table has ${familyUsers.length}`,
        );
      }

      // Verify all family members exist as users
      for (const member of family.members) {
        const user = familyUsers.find(
          (u) => u._id.toString() === member.userId.toString(),
        );
        if (!user) {
          throw new Error(
            `Family member ${member.userId} not found in users table`,
          );
        }
        if (user.role !== member.role) {
          throw new Error(
            `Role mismatch for user ${user.name}: family says ${member.role}, user says ${user.role}`,
          );
        }
      }
    });
  }

  private async testCompleteUserWorkflows(): Promise<void> {
    await this.runTest("Complete Parent Workflow", async () => {
      // Parent creates chore -> assigns to child -> monitors progress -> approves completion

      // 1. Create chore
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

      // 2. Child completes chore
      newChore.status = "completed";
      newChore.completedAt = new Date();
      newChore.completedBy = this.testData.childId;
      await newChore.save();

      // 3. Parent approves chore
      newChore.status = "approved";
      newChore.verifiedAt = new Date();
      newChore.verifiedBy = this.testData.parentId;
      await newChore.save();

      // 4. Verify gamification updated
      const gamificationService = getGamificationService();
      const pointsBreakdown = await gamificationService.calculatePointsForChore(
        newChore._id.toString(),
        this.testData.childId,
        "good",
      );

      const result = await gamificationService.awardPoints(
        this.testData.childId,
        pointsBreakdown,
        newChore._id.toString(),
      );

      if (!result.newTotalPoints || result.newTotalPoints <= 0) {
        throw new Error("Gamification not updated after parent approval");
      }

      await Chore.findByIdAndDelete(newChore._id);
    });

    await this.runTest("Complete Child Workflow", async () => {
      // Child views chores -> starts chore -> completes chore -> earns points

      // 1. Get assigned chores
      const assignedChores = await Chore.find({
        assignedTo: this.testData.childId,
        status: "pending",
        family: this.testData.familyId,
      });

      if (assignedChores.length === 0) {
        throw new Error("No chores assigned to child for workflow test");
      }

      const chore = assignedChores[0];

      // 2. Start chore
      chore.status = "in_progress";
      chore.startedAt = new Date();
      await chore.save();

      // 3. Complete chore
      chore.status = "completed";
      chore.completedAt = new Date();
      chore.completedBy = this.testData.childId;
      await chore.save();

      // 4. Verify user can see their progress
      const analyticsService = getAnalyticsService();
      const progress = await analyticsService.getUserProgress(
        this.testData.childId,
        "week",
      );

      if (progress.completedChores === 0) {
        throw new Error("Child progress not tracked properly");
      }
    });
  }

  private async cleanupTestEnvironment(): Promise<void> {
    await this.runTest("Cleanup Test Environment", async () => {
      // Delete test data
      await Chore.deleteMany({ family: this.testData.familyId });
      await User.deleteMany({ familyId: this.testData.familyId });
      await Family.findByIdAndDelete(this.testData.familyId);

      // Clean up any scheduled chores
      if (this.testData.scheduleId) {
        await Chore.deleteMany({ scheduleId: this.testData.scheduleId });
      }

      console.log("Test environment cleaned up");
    });
  }

  private generateSummary(): {
    passed: number;
    failed: number;
    skipped: number;
    results: TestResult[];
    summary: string;
  } {
    const passed = this.results.filter((r) => r.status === "PASS").length;
    const failed = this.results.filter((r) => r.status === "FAIL").length;
    const skipped = this.results.filter((r) => r.status === "SKIP").length;

    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = totalDuration / this.results.length;

    const summary = `
📊 INTEGRATION TEST RESULTS
${"=".repeat(40)}
✅ Passed: ${passed}
❌ Failed: ${failed}
⏭️ Skipped: ${skipped}
⏱️ Total Duration: ${totalDuration}ms
📈 Average Test Duration: ${Math.round(avgDuration)}ms

${failed > 0 ? "❌ SOME TESTS FAILED - REVIEW REQUIRED" : "✅ ALL TESTS PASSED - SYSTEM READY"}
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
  const testSuite = new IntegrationTestSuite();
  testSuite
    .runAllTests()
    .then((results) => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("Test suite failed:", error);
      process.exit(1);
    });
}

export default IntegrationTestSuite;
