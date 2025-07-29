import { getGamificationService } from "../libs/gamification";
import { dbConnect } from "../libs/mongoose";
import Achievement from "../models/Achievement";
import Challenge from "../models/Challenge";
import Chore from "../models/Chore";
import Family from "../models/Family";
import Reward from "../models/Reward";
import User from "../models/User";

async function seedDemoData() {
  try {
    console.log("🌱 Seeding Demo Data for POC Demonstration");
    console.log("=".repeat(50));

    await dbConnect();

    // Clear existing demo data
    await User.deleteMany({ email: { $regex: /@demo\.com$/ } });
    await Family.deleteMany({ name: { $regex: /demo/i } });
    await Chore.deleteMany({ title: { $regex: /demo/i } });

    // Create Demo Users first
    console.log("👤 Creating Demo Users...");

    // Parent 1 - Sarah Johnson
    const parentSarah = new User({
      name: "Sarah Johnson",
      email: "sarah@demo.com",
      role: "parent",
      // familyId will be set after family creation
      hasAccess: true,
      image:
        "https://images.unsplash.com/photo-1494790108755-2616b612b5bc?w=150&h=150&fit=crop&crop=face",
      communicationPreferences: {
        primaryChannel: "email",
        fallbackChannels: ["sms", "whatsapp"],
        quietHours: {
          enabled: true,
          start: "22:00",
          end: "07:00",
          timezone: "America/New_York",
        },
        maxMessagesPerHour: 5,
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
    await parentSarah.save();

    // Parent 2 - Mike Johnson
    const parentMike = new User({
      name: "Mike Johnson",
      email: "mike@demo.com",
      role: "parent",
      // familyId will be set after family creation
      hasAccess: true,
      image:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      communicationPreferences: {
        primaryChannel: "sms",
        fallbackChannels: ["email", "whatsapp"],
        enabledNotifications: {
          choreAssigned: false,
          choreReminder: false,
          choreCompleted: true,
          choreApproved: false,
          choreRejected: true,
          weeklyDigest: true,
          familyUpdates: true,
        },
      },
    });
    await parentMike.save();

    // Child 1 - Emma Johnson (12 years old)
    const childEmma = new User({
      name: "Emma Johnson",
      email: "emma@demo.com",
      role: "child",
      // familyId will be set after family creation
      hasAccess: true,
      image:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
      communicationPreferences: {
        primaryChannel: "whatsapp",
        fallbackChannels: ["sms"],
        quietHours: {
          enabled: true,
          start: "21:00",
          end: "07:30",
          timezone: "America/New_York",
        },
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
        totalPoints: 485,
        level: 3,
        choresCompleted: 24,
        streak: 5,
        lastActivityAt: new Date(),
        achievements: [],
        challenges: [],
        redeemedRewards: [],
        pendingRewards: [],
      },
    });
    await childEmma.save();

    // Child 2 - Alex Johnson (9 years old)
    const childAlex = new User({
      name: "Alex Johnson",
      email: "alex@demo.com",
      role: "child",
      // familyId will be set after family creation
      hasAccess: true,
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      communicationPreferences: {
        primaryChannel: "sms",
        fallbackChannels: ["email"],
        quietHours: {
          enabled: true,
          start: "20:30",
          end: "08:00",
          timezone: "America/New_York",
        },
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
        totalPoints: 320,
        level: 2,
        choresCompleted: 18,
        streak: 3,
        lastActivityAt: new Date(),
        achievements: [],
        challenges: [],
        redeemedRewards: [],
        pendingRewards: [],
      },
    });
    await childAlex.save();

    // Create Demo Family
    console.log("👨‍👩‍👧‍👦 Creating Demo Family...");
    const demoFamily = new Family({
      name: "The Johnson Family",
      description:
        "A loving family learning responsibility through ChoreMinder",
      createdBy: parentSarah._id,
      settings: {
        allowChildSelfAssign: true,
        requirePhotoVerification: false,
        pointsSystem: true,
        weeklyGoals: true,
        publicLeaderboard: false,
      },
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      members: [
        {
          user: parentSarah._id,
          name: parentSarah.name,
          role: "parent",
          joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
        {
          user: parentMike._id,
          name: parentMike.name,
          role: "parent",
          joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
        {
          user: childEmma._id,
          name: childEmma.name,
          role: "child",
          joinedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        },
        {
          user: childAlex._id,
          name: childAlex.name,
          role: "child",
          joinedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        },
      ],
    });
    await demoFamily.save();

    // Update users with family ID
    parentSarah.familyId = demoFamily._id;
    parentMike.familyId = demoFamily._id;
    childEmma.familyId = demoFamily._id;
    childAlex.familyId = demoFamily._id;

    await parentSarah.save();
    await parentMike.save();
    await childEmma.save();
    await childAlex.save();

    // Create Historical Chores (Past 30 days)
    console.log("📋 Creating Historical Chores...");

    const choreTemplates = [
      {
        title: "Make your bed",
        category: "organizing",
        points: 10,
        duration: 5,
        priority: "low",
      },
      {
        title: "Take out trash",
        category: "cleaning",
        points: 15,
        duration: 10,
        priority: "medium",
      },
      {
        title: "Load dishwasher",
        category: "cleaning",
        points: 20,
        duration: 15,
        priority: "medium",
      },
      {
        title: "Vacuum living room",
        category: "cleaning",
        points: 25,
        duration: 20,
        priority: "medium",
      },
      {
        title: "Water plants",
        category: "maintenance",
        points: 10,
        duration: 10,
        priority: "low",
      },
      {
        title: "Feed pets",
        category: "maintenance",
        points: 15,
        duration: 5,
        priority: "high",
      },
      {
        title: "Organize bookshelf",
        category: "organizing",
        points: 30,
        duration: 30,
        priority: "low",
      },
      {
        title: "Wipe down bathroom counter",
        category: "cleaning",
        points: 15,
        duration: 10,
        priority: "medium",
      },
      {
        title: "Sort laundry",
        category: "organizing",
        points: 20,
        duration: 15,
        priority: "medium",
      },
      {
        title: "Sweep kitchen floor",
        category: "cleaning",
        points: 20,
        duration: 15,
        priority: "medium",
      },
    ];

    const historicalChores = [];
    const statuses = [
      "verified",
      "verified",
      "verified",
      "completed",
      "pending",
    ];

    // Generate chores for the past 30 days
    for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
      const date = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000);

      // Each child gets 1-3 chores per day
      for (const child of [childEmma, childAlex]) {
        const numChores = Math.floor(Math.random() * 3) + 1;

        for (let i = 0; i < numChores; i++) {
          const template =
            choreTemplates[Math.floor(Math.random() * choreTemplates.length)];
          const status = statuses[Math.floor(Math.random() * statuses.length)];

          const dueDate = new Date(date);
          dueDate.setHours(Math.floor(Math.random() * 12) + 8); // Between 8 AM and 8 PM

          const chore = new Chore({
            title: template.title,
            description: `${template.title} - keep our home clean and organized!`,
            assignedTo: child._id,
            family: demoFamily._id,
            createdBy: Math.random() > 0.5 ? parentSarah._id : parentMike._id,
            assignedBy: Math.random() > 0.5 ? parentSarah._id : parentMike._id,
            dueDate,
            points: template.points,
            status,
            category: template.category,
            priority: template.priority,
            estimatedDuration: template.duration,
            requiresPhotoVerification: Math.random() > 0.7,
            createdAt: new Date(date.getTime() - 60 * 60 * 1000), // Created 1 hour before due
            startedAt:
              status !== "pending"
                ? new Date(dueDate.getTime() - 30 * 60 * 1000)
                : undefined,
            completedAt:
              status === "verified" || status === "completed"
                ? dueDate
                : undefined,
            completedBy:
              status === "verified" || status === "completed"
                ? child._id
                : undefined,
            verifiedAt:
              status === "verified"
                ? new Date(dueDate.getTime() + 60 * 60 * 1000)
                : undefined,
            verifiedBy:
              status === "verified"
                ? Math.random() > 0.5
                  ? parentSarah._id
                  : parentMike._id
                : undefined,
            history: [
              {
                action: "created",
                timestamp: new Date(date.getTime() - 60 * 60 * 1000),
                user: Math.random() > 0.5 ? parentSarah._id : parentMike._id,
                details: { status: "pending" },
              },
              ...(status !== "pending"
                ? [
                    {
                      action: "status_changed",
                      timestamp: dueDate,
                      user: child._id,
                      details: { from: "pending", to: "completed" },
                    },
                  ]
                : []),
              ...(status === "verified"
                ? [
                    {
                      action: "status_changed",
                      timestamp: new Date(dueDate.getTime() + 60 * 60 * 1000),
                      user:
                        Math.random() > 0.5 ? parentSarah._id : parentMike._id,
                      details: { from: "completed", to: "verified" },
                    },
                  ]
                : []),
            ],
          });

          historicalChores.push(chore);
        }
      }
    }

    await Chore.insertMany(historicalChores);
    console.log(`Created ${historicalChores.length} historical chores`);

    // Create Current/Future Chores
    console.log("📅 Creating Current and Future Chores...");

    const currentChores = [];

    // Today's chores
    const today = new Date();
    for (const child of [childEmma, childAlex]) {
      const templates = [
        {
          title: "Make your bed",
          category: "organizing",
          points: 10,
          duration: 5,
        },
        {
          title: "Pack school lunch",
          category: "cooking",
          points: 15,
          duration: 15,
        },
        {
          title: "Tidy room",
          category: "organizing",
          points: 20,
          duration: 20,
        },
      ];

      for (let i = 0; i < templates.length; i++) {
        const template = templates[i];
        const dueTime = new Date(today);
        dueTime.setHours(8 + i * 4, 0, 0, 0); // 8 AM, 12 PM, 4 PM

        const chore = new Chore({
          title: template.title,
          description: `${template.title} - part of your daily routine!`,
          assignedTo: child._id,
          family: demoFamily._id,
          createdBy: parentSarah._id,
          assignedBy: parentSarah._id,
          dueDate: dueTime,
          points: template.points,
          status: i === 0 ? "completed" : i === 1 ? "in_progress" : "pending",
          category: template.category,
          priority: "medium",
          estimatedDuration: template.duration,
          requiresPhotoVerification: false,
          startedAt:
            i <= 1 ? new Date(dueTime.getTime() - 30 * 60 * 1000) : undefined,
          completedAt: i === 0 ? dueTime : undefined,
          completedBy: i === 0 ? child._id : undefined,
        });

        currentChores.push(chore);
      }
    }

    // Tomorrow's chores
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    for (const child of [childEmma, childAlex]) {
      const weekend_chores = [
        {
          title: "Clean your room",
          category: "cleaning",
          points: 30,
          duration: 45,
        },
        {
          title: "Help with groceries",
          category: "organizing",
          points: 20,
          duration: 30,
        },
        { title: "Wash car", category: "outdoor", points: 40, duration: 60 },
      ];

      for (let i = 0; i < weekend_chores.length; i++) {
        const template = weekend_chores[i];
        const dueTime = new Date(tomorrow);
        dueTime.setHours(10 + i * 2, 0, 0, 0);

        const chore = new Chore({
          title: template.title,
          description: `${template.title} - weekend family activities!`,
          assignedTo: child._id,
          family: demoFamily._id,
          createdBy: parentMike._id,
          assignedBy: parentMike._id,
          dueDate: dueTime,
          points: template.points,
          status: "pending",
          category: template.category,
          priority: i === 2 ? "low" : "medium",
          estimatedDuration: template.duration,
          requiresPhotoVerification: i === 2, // Car wash requires photo
        });

        currentChores.push(chore);
      }
    }

    await Chore.insertMany(currentChores);
    console.log(`Created ${currentChores.length} current/future chores`);

    // Award some achievements
    console.log("🏆 Setting up Achievements...");

    const gamificationService = getGamificationService();

    // Award points for completed chores and unlock achievements
    const emmaCompletedChores = await Chore.find({
      assignedTo: childEmma._id,
      status: "verified",
    });

    const alexCompletedChores = await Chore.find({
      assignedTo: childAlex._id,
      status: "verified",
    });

    console.log(`Emma completed ${emmaCompletedChores.length} chores`);
    console.log(`Alex completed ${alexCompletedChores.length} chores`);

    // Create demo rewards
    console.log("🎁 Creating Demo Rewards...");

    const demoRewards = [
      {
        name: "30 Minutes Extra Screen Time",
        description: "Enjoy 30 extra minutes of screen time on weekends",
        category: "privileges",
        pointsCost: 50,
        icon: "📱",
        requiresParentApproval: true,
        active: true,
        tags: ["screen-time", "weekend"],
        ageGroup: "all",
        createdBy: parentSarah._id,
      },
      {
        name: "Choose Family Movie Night",
        description: "Pick the movie for the next family movie night",
        category: "privileges",
        pointsCost: 75,
        icon: "🎬",
        requiresParentApproval: false,
        active: true,
        tags: ["movie", "family"],
        ageGroup: "all",
        createdBy: parentSarah._id,
      },
      {
        name: "Special Dessert",
        description: "Choose a special dessert for this week",
        category: "treats",
        pointsCost: 40,
        icon: "🍰",
        requiresParentApproval: true,
        active: true,
        tags: ["dessert", "treat"],
        ageGroup: "all",
        createdBy: parentMike._id,
      },
      {
        name: "Friend Sleepover",
        description: "Invite a friend for a sleepover weekend",
        category: "activities",
        pointsCost: 200,
        icon: "🏠",
        requiresParentApproval: true,
        active: true,
        tags: ["friend", "sleepover"],
        ageGroup: "all",
        createdBy: parentSarah._id,
      },
      {
        name: "New Book",
        description: "Choose a new book (up to $15)",
        category: "items",
        pointsCost: 150,
        value: 15,
        icon: "📚",
        requiresParentApproval: true,
        active: true,
        tags: ["book", "reading"],
        ageGroup: "all",
        createdBy: parentMike._id,
      },
      {
        name: "Gold Star Badge",
        description: "Earn a special gold star for your profile!",
        category: "experiences",
        pointsCost: 25,
        icon: "⭐",
        requiresParentApproval: false,
        active: true,
        tags: ["badge", "achievement"],
        ageGroup: "all",
        createdBy: parentSarah._id,
      },
    ];

    await Reward.insertMany(demoRewards);
    console.log(`Created ${demoRewards.length} demo rewards`);

    // Add some pending reward requests
    const goldStarReward = await Reward.findOne({ name: "Gold Star Badge" });
    const movieReward = await Reward.findOne({
      name: "Choose Family Movie Night",
    });

    if (goldStarReward) {
      childEmma.gamification!.pendingRewards.push({
        rewardId: goldStarReward._id,
        requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        pointsCost: goldStarReward.pointsCost,
      });
      await childEmma.save();
    }

    if (movieReward) {
      childAlex.gamification!.redeemedRewards.push({
        rewardId: movieReward._id,
        redeemedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        pointsCost: movieReward.pointsCost,
      });
      await childAlex.save();
    }

    console.log("✅ Demo Data Seeding Complete!");
    console.log("\n📊 Demo Data Summary:");
    console.log(`👨‍👩‍👧‍👦 Family: ${demoFamily.name}`);
    console.log(
      `👤 Users: ${[parentSarah, parentMike, childEmma, childAlex].map((u) => u.name).join(", ")}`,
    );
    console.log(
      `📋 Total Chores: ${historicalChores.length + currentChores.length}`,
    );
    console.log(`🎁 Rewards: ${demoRewards.length}`);
    console.log(`\n🎯 POC Demo Ready!`);
    console.log("\nDemo Login Credentials:");
    console.log("Parent: sarah@demo.com");
    console.log("Child: emma@demo.com");
    console.log(
      "\n🚀 Start the demo with a populated family showing real usage patterns!",
    );
  } catch (error) {
    console.error("❌ Error seeding demo data:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  seedDemoData();
}

export default seedDemoData;
