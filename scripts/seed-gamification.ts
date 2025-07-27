import { dbConnect } from "../libs/mongoose";
import Achievement from "../models/Achievement";
import Challenge from "../models/Challenge";
import Reward from "../models/Reward";

async function seedGamificationData() {
  try {
    await dbConnect();
    console.log("Connected to database");

    // Clear existing data
    await Achievement.deleteMany({});
    await Challenge.deleteMany({});
    await Reward.deleteMany({});
    console.log("Cleared existing gamification data");

    // Seed Achievements
    const achievements = [
      // Completion Achievements
      {
        name: "First Steps",
        description: "Complete your first chore",
        category: "completion",
        type: "chores_completed",
        targetValue: 1,
        tier: "bronze",
        icon: "👶",
        pointsReward: 50,
        active: true,
      },
      {
        name: "Getting Started",
        description: "Complete 5 chores",
        category: "completion",
        type: "chores_completed",
        targetValue: 5,
        tier: "bronze",
        icon: "🌱",
        pointsReward: 100,
        active: true,
      },
      {
        name: "Chore Champion",
        description: "Complete 25 chores",
        category: "completion",
        type: "chores_completed",
        targetValue: 25,
        tier: "silver",
        icon: "⭐",
        pointsReward: 250,
        active: true,
      },
      {
        name: "Super Helper",
        description: "Complete 50 chores",
        category: "completion",
        type: "chores_completed",
        targetValue: 50,
        tier: "gold",
        icon: "🏆",
        pointsReward: 500,
        active: true,
      },
      {
        name: "Household Hero",
        description: "Complete 100 chores",
        category: "completion",
        type: "chores_completed",
        targetValue: 100,
        tier: "platinum",
        icon: "🦸",
        pointsReward: 1000,
        active: true,
      },

      // Points Achievements
      {
        name: "Point Collector",
        description: "Earn 100 points",
        category: "milestone",
        type: "points_earned",
        targetValue: 100,
        tier: "bronze",
        icon: "💎",
        pointsReward: 25,
        active: true,
      },
      {
        name: "Point Master",
        description: "Earn 500 points",
        category: "milestone",
        type: "points_earned",
        targetValue: 500,
        tier: "silver",
        icon: "💰",
        pointsReward: 100,
        active: true,
      },
      {
        name: "Point Legend",
        description: "Earn 1000 points",
        category: "milestone",
        type: "points_earned",
        targetValue: 1000,
        tier: "gold",
        icon: "👑",
        pointsReward: 200,
        active: true,
      },

      // Consistency Achievements
      {
        name: "On a Roll",
        description: "Complete chores 3 days in a row",
        category: "consistency",
        type: "streak_days",
        targetValue: 3,
        tier: "bronze",
        icon: "🔥",
        pointsReward: 75,
        active: true,
      },
      {
        name: "Streak Master",
        description: "Complete chores 7 days in a row",
        category: "consistency",
        type: "streak_days",
        targetValue: 7,
        tier: "silver",
        icon: "⚡",
        pointsReward: 150,
        active: true,
      },
      {
        name: "Unstoppable",
        description: "Complete chores 14 days in a row",
        category: "consistency",
        type: "streak_days",
        targetValue: 14,
        tier: "gold",
        icon: "🚀",
        pointsReward: 300,
        active: true,
      },

      // Quality Achievements
      {
        name: "Perfect Week",
        description: "Complete all assigned chores in a week",
        category: "quality",
        type: "perfect_week",
        targetValue: 1,
        tier: "gold",
        icon: "✨",
        pointsReward: 200,
        badgeReward: "Weekly Champion",
        active: true,
      },
    ];

    const createdAchievements = await Achievement.insertMany(achievements);
    console.log(`Created ${createdAchievements.length} achievements`);

    // Seed Global Challenges
    const now = new Date();
    const challenges = [
      {
        name: "Chore Challenge Week",
        description: "Complete 5 chores this week to earn bonus points!",
        type: "weekly",
        targetValue: 5,
        pointsReward: 100,
        badgeReward: "Weekly Warrior",
        category: "global",
        difficulty: "medium",
        icon: "🎯",
        startDate: now,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week
        active: true,
        participants: [],
      },
      {
        name: "Early Bird Special",
        description: "Complete 3 chores before their due date this month",
        type: "monthly",
        targetValue: 3,
        pointsReward: 150,
        category: "global",
        difficulty: "medium",
        icon: "🐦",
        startDate: now,
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 1 month
        active: true,
        participants: [],
      },
      {
        name: "Daily Dash",
        description: "Complete at least 1 chore today",
        type: "daily",
        targetValue: 1,
        pointsReward: 20,
        category: "global",
        difficulty: "easy",
        icon: "🏃",
        startDate: now,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 1 day
        active: true,
        participants: [],
      },
    ];

    const createdChallenges = await Challenge.insertMany(challenges);
    console.log(`Created ${createdChallenges.length} challenges`);

    // Seed Rewards
    const rewards = [
      // Privileges
      {
        name: "Extra Screen Time",
        description: "30 minutes of extra screen time",
        category: "privileges",
        pointsCost: 50,
        icon: "📱",
        requiresParentApproval: true,
        active: true,
        tags: ["screen", "time"],
        ageGroup: "all",
        createdBy: null, // Will be set by admin
      },
      {
        name: "Stay Up 30 Minutes Later",
        description: "Stay up 30 minutes past bedtime on weekend",
        category: "privileges",
        pointsCost: 75,
        icon: "🌙",
        requiresParentApproval: true,
        active: true,
        tags: ["bedtime", "weekend"],
        ageGroup: "all",
        createdBy: null,
      },
      {
        name: "Choose Family Movie",
        description: "Pick the movie for family movie night",
        category: "privileges",
        pointsCost: 100,
        icon: "🎬",
        requiresParentApproval: false,
        active: true,
        tags: ["movie", "family"],
        ageGroup: "all",
        createdBy: null,
      },

      // Treats
      {
        name: "Special Dessert",
        description: "Choose a special dessert for dinner",
        category: "treats",
        pointsCost: 60,
        icon: "🍰",
        requiresParentApproval: true,
        active: true,
        tags: ["dessert", "food"],
        ageGroup: "all",
        createdBy: null,
      },
      {
        name: "Favorite Snack",
        description: "Get your favorite snack from the store",
        category: "treats",
        pointsCost: 40,
        icon: "🍿",
        requiresParentApproval: true,
        active: true,
        tags: ["snack", "store"],
        ageGroup: "all",
        createdBy: null,
      },

      // Activities
      {
        name: "Friend Playdate",
        description: "Invite a friend over for a playdate",
        category: "activities",
        pointsCost: 150,
        icon: "👫",
        requiresParentApproval: true,
        active: true,
        tags: ["friend", "social"],
        ageGroup: "all",
        createdBy: null,
      },
      {
        name: "Special Outing",
        description: "Choose a special place to visit with family",
        category: "activities",
        pointsCost: 200,
        icon: "🎡",
        requiresParentApproval: true,
        active: true,
        tags: ["outing", "family"],
        ageGroup: "all",
        createdBy: null,
      },
      {
        name: "Art & Craft Time",
        description: "Special art and craft session with supplies",
        category: "activities",
        pointsCost: 80,
        icon: "🎨",
        requiresParentApproval: false,
        active: true,
        tags: ["art", "craft", "creative"],
        ageGroup: "young",
        createdBy: null,
      },

      // Items
      {
        name: "Small Toy",
        description: "A small toy of your choice (under $10)",
        category: "items",
        pointsCost: 300,
        value: 10,
        icon: "🧸",
        requiresParentApproval: true,
        active: true,
        tags: ["toy", "reward"],
        ageGroup: "young",
        createdBy: null,
      },
      {
        name: "Book of Choice",
        description: "A new book you'd like to read",
        category: "items",
        pointsCost: 250,
        value: 15,
        icon: "📚",
        requiresParentApproval: true,
        active: true,
        tags: ["book", "reading"],
        ageGroup: "all",
        createdBy: null,
      },

      // Small instant rewards (no approval needed)
      {
        name: "Virtual High Five",
        description: "A special congratulations message!",
        category: "experiences",
        pointsCost: 5,
        icon: "🙌",
        requiresParentApproval: false,
        active: true,
        tags: ["congratulations", "instant"],
        ageGroup: "all",
        createdBy: null,
      },
      {
        name: "Gold Star",
        description: "Earn a special gold star badge!",
        category: "experiences",
        pointsCost: 10,
        icon: "⭐",
        requiresParentApproval: false,
        active: true,
        tags: ["badge", "star"],
        ageGroup: "all",
        createdBy: null,
      },
    ];

    const createdRewards = await Reward.insertMany(rewards);
    console.log(`Created ${createdRewards.length} rewards`);

    console.log("✅ Gamification data seeded successfully!");
    console.log("\n📊 Summary:");
    console.log(`- ${createdAchievements.length} achievements created`);
    console.log(`- ${createdChallenges.length} challenges created`);
    console.log(`- ${createdRewards.length} rewards created`);
    
    console.log("\n🏆 Achievement Tiers:");
    console.log("- Bronze: First Steps, Getting Started, Point Collector, On a Roll");
    console.log("- Silver: Chore Champion, Point Master, Streak Master");
    console.log("- Gold: Super Helper, Point Legend, Unstoppable, Perfect Week");
    console.log("- Platinum: Household Hero");

    console.log("\n🎯 Challenge Types:");
    console.log("- Daily: Daily Dash (1 chore/day)");
    console.log("- Weekly: Chore Challenge Week (5 chores/week)");
    console.log("- Monthly: Early Bird Special (3 early completions)");

    console.log("\n🎁 Reward Categories:");
    console.log("- Privileges: Screen time, bedtime, movie choice");
    console.log("- Treats: Desserts and snacks");
    console.log("- Activities: Playdates, outings, crafts");
    console.log("- Items: Toys, books");
    console.log("- Experiences: Virtual rewards and badges");

  } catch (error) {
    console.error("❌ Error seeding gamification data:", error);
  } finally {
    process.exit(0);
  }
}

seedGamificationData();