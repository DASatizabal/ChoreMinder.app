"use server";

import Achievement from "@/models/Achievement";
import Challenge from "@/models/Challenge";
import Chore from "@/models/Chore";
import Reward from "@/models/Reward";
import User from "@/models/User";

import { dbConnect } from "./mongoose";
// import { getUnifiedMessagingService } from "./unified-messaging"; // Disabled for testing

export interface PointsBreakdown {
  basePoints: number;
  timeBonus: number;
  qualityBonus: number;
  streakBonus: number;
  challengeBonus: number;
  totalPoints: number;
  bonusReasons: string[];
}

export interface AchievementProgress {
  achievementId: string;
  name: string;
  description: string;
  category: string;
  currentProgress: number;
  targetValue: number;
  isCompleted: boolean;
  completedAt?: Date;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
}

export interface ActiveChallenge {
  challengeId: string;
  name: string;
  description: string;
  type: "daily" | "weekly" | "monthly";
  targetValue: number;
  currentProgress: number;
  pointsReward: number;
  badgeReward?: string;
  expiresAt: Date;
  isCompleted: boolean;
}

class GamificationService {
  /**
   * Calculate points for chore completion with bonuses
   */
  async calculatePointsForChore(
    choreId: string,
    userId: string,
    completionQuality: "excellent" | "good" | "satisfactory" = "good",
  ): Promise<PointsBreakdown> {
    await dbConnect();

    const chore = await Chore.findById(choreId);
    const user = await User.findById(userId);

    if (!chore || !user) {
      throw new Error("Chore or user not found");
    }

    const breakdown: PointsBreakdown = {
      basePoints: chore.points || 10,
      timeBonus: 0,
      qualityBonus: 0,
      streakBonus: 0,
      challengeBonus: 0,
      totalPoints: 0,
      bonusReasons: [],
    };

    // Time bonus - completed early
    if (chore.dueDate) {
      const now = new Date();
      const dueDate = new Date(chore.dueDate);
      const hoursEarly = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursEarly > 24) {
        breakdown.timeBonus = Math.round(breakdown.basePoints * 0.2);
        breakdown.bonusReasons.push("Completed 1+ days early!");
      } else if (hoursEarly > 12) {
        breakdown.timeBonus = Math.round(breakdown.basePoints * 0.1);
        breakdown.bonusReasons.push("Completed early!");
      }
    }

    // Quality bonus based on completion quality
    switch (completionQuality) {
      case "excellent":
        breakdown.qualityBonus = Math.round(breakdown.basePoints * 0.3);
        breakdown.bonusReasons.push("Excellent work quality!");
        break;
      case "good":
        breakdown.qualityBonus = Math.round(breakdown.basePoints * 0.1);
        breakdown.bonusReasons.push("Good job!");
        break;
    }

    // Streak bonus - consecutive days of chore completion
    const streak = await this.getUserStreak(userId);
    if (streak >= 7) {
      breakdown.streakBonus = Math.round(breakdown.basePoints * 0.25);
      breakdown.bonusReasons.push(`${streak}-day streak bonus!`);
    } else if (streak >= 3) {
      breakdown.streakBonus = Math.round(breakdown.basePoints * 0.15);
      breakdown.bonusReasons.push(`${streak}-day streak!`);
    }

    // Challenge bonus - check if this completes any active challenges
    const challengeBonus = await this.calculateChallengeBonus(userId, chore);
    breakdown.challengeBonus = challengeBonus.points;
    if (challengeBonus.reasons.length > 0) {
      breakdown.bonusReasons.push(...challengeBonus.reasons);
    }

    breakdown.totalPoints =
      breakdown.basePoints +
      breakdown.timeBonus +
      breakdown.qualityBonus +
      breakdown.streakBonus +
      breakdown.challengeBonus;

    return breakdown;
  }

  /**
   * Award points and check for achievements
   */
  async awardPoints(
    userId: string,
    pointsBreakdown: PointsBreakdown,
    choreId: string,
  ): Promise<{
    newAchievements: AchievementProgress[];
    totalPoints: number;
    newLevel?: number;
  }> {
    await dbConnect();

    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Update user's total points
    const currentPoints = user.gamification?.totalPoints || 0;
    const newTotalPoints = currentPoints + pointsBreakdown.totalPoints;

    await User.findByIdAndUpdate(userId, {
      $set: {
        "gamification.totalPoints": newTotalPoints,
        "gamification.lastActivityAt": new Date(),
      },
      $inc: {
        "gamification.choresCompleted": 1,
      },
    });

    // Check for level up
    const currentLevel = this.calculateLevel(currentPoints);
    const newLevel = this.calculateLevel(newTotalPoints);

    // Check for new achievements
    const newAchievements = await this.checkForNewAchievements(userId);

    // Send achievement notifications
    if (newAchievements.length > 0) {
      await this.sendAchievementNotifications(userId, newAchievements);
    }

    return {
      newAchievements,
      totalPoints: newTotalPoints,
      newLevel: newLevel > currentLevel ? newLevel : undefined,
    };
  }

  /**
   * Get user's current achievement progress
   */
  async getUserAchievements(userId: string): Promise<AchievementProgress[]> {
    await dbConnect();

    const user = await User.findById(userId).populate(
      "gamification.achievements.achievementId",
    );
    const allAchievements = await Achievement.find({ active: true });

    const userAchievements = user?.gamification?.achievements || [];

    return allAchievements.map((achievement) => {
      const userAchievement = userAchievements.find(
        (ua) => ua.achievementId.toString() === achievement._id.toString(),
      );

      return {
        achievementId: achievement._id.toString(),
        name: achievement.name,
        description: achievement.description,
        category: achievement.category,
        currentProgress: userAchievement?.currentProgress || 0,
        targetValue: achievement.targetValue,
        isCompleted: userAchievement?.isCompleted || false,
        completedAt: userAchievement?.completedAt,
        icon: achievement.icon,
        tier: achievement.tier,
      };
    });
  }

  /**
   * Get user's active challenges
   */
  async getUserChallenges(userId: string): Promise<ActiveChallenge[]> {
    await dbConnect();

    const now = new Date();
    const challenges = await Challenge.find({
      active: true,
      expiresAt: { $gt: now },
    });

    const user = await User.findById(userId);
    const userChallenges = user?.gamification?.challenges || [];

    return challenges.map((challenge) => {
      const userChallenge = userChallenges.find(
        (uc) => uc.challengeId.toString() === challenge._id.toString(),
      );

      return {
        challengeId: challenge._id.toString(),
        name: challenge.name,
        description: challenge.description,
        type: challenge.type,
        targetValue: challenge.targetValue,
        currentProgress: userChallenge?.currentProgress || 0,
        pointsReward: challenge.pointsReward,
        badgeReward: challenge.badgeReward,
        expiresAt: challenge.expiresAt,
        isCompleted: userChallenge?.isCompleted || false,
      };
    });
  }

  /**
   * Create weekly personal challenges
   */
  async createWeeklyPersonalChallenge(
    userId: string,
  ): Promise<ActiveChallenge> {
    await dbConnect();

    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get user's historical performance to create personalized challenge
    const lastWeekChores = await Chore.find({
      assignedTo: userId,
      completedAt: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      status: "approved",
    });

    const avgWeeklyChores = lastWeekChores.length;
    const targetChores = Math.max(3, Math.ceil(avgWeeklyChores * 1.2)); // 20% improvement

    const challenge = new Challenge({
      name: "Personal Best Week",
      description: `Complete ${targetChores} chores this week - beat your personal best!`,
      type: "weekly",
      targetValue: targetChores,
      pointsReward: targetChores * 10,
      badgeReward: "Weekly Champion",
      createdFor: userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      active: true,
    });

    await challenge.save();

    return {
      challengeId: challenge._id.toString(),
      name: challenge.name,
      description: challenge.description,
      type: challenge.type,
      targetValue: challenge.targetValue,
      currentProgress: 0,
      pointsReward: challenge.pointsReward,
      badgeReward: challenge.badgeReward,
      expiresAt: challenge.expiresAt,
      isCompleted: false,
    };
  }

  /**
   * Get available rewards for user
   */
  async getAvailableRewards(userId: string): Promise<any[]> {
    await dbConnect();

    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const userPoints = user.gamification?.totalPoints || 0;
    const userLevel = this.calculateLevel(userPoints);

    const rewards = await Reward.find({
      active: true,
      $or: [
        { requiredLevel: { $lte: userLevel } },
        { requiredPoints: { $lte: userPoints } },
      ],
    }).sort({ pointsCost: 1 });

    return rewards.map((reward) => ({
      rewardId: reward._id.toString(),
      name: reward.name,
      description: reward.description,
      category: reward.category,
      pointsCost: reward.pointsCost,
      requiredLevel: reward.requiredLevel,
      icon: reward.icon,
      canAfford: userPoints >= reward.pointsCost,
      requiresApproval: reward.requiresParentApproval,
    }));
  }

  /**
   * Request reward redemption
   */
  async requestReward(
    userId: string,
    rewardId: string,
  ): Promise<{
    success: boolean;
    needsApproval: boolean;
    error?: string;
  }> {
    await dbConnect();

    const user = await User.findById(userId);
    const reward = await Reward.findById(rewardId);

    if (!user || !reward) {
      return {
        success: false,
        needsApproval: false,
        error: "User or reward not found",
      };
    }

    const userPoints = user.gamification?.totalPoints || 0;

    if (userPoints < reward.pointsCost) {
      return {
        success: false,
        needsApproval: false,
        error: "Insufficient points",
      };
    }

    if (reward.requiresParentApproval) {
      // Add to pending approvals
      await User.findByIdAndUpdate(userId, {
        $push: {
          "gamification.pendingRewards": {
            rewardId,
            requestedAt: new Date(),
            pointsCost: reward.pointsCost,
          },
        },
      });

      // Notify parents
      await this.notifyParentsOfRewardRequest(userId, reward);

      return { success: true, needsApproval: true };
    } else {
      // Auto-approve simple rewards
      await this.approveReward(userId, rewardId);
      return { success: true, needsApproval: false };
    }
  }

  /**
   * Calculate user level based on points
   */
  private calculateLevel(points: number): number {
    // Level progression: 100, 300, 600, 1000, 1500, 2100, 2800...
    // Each level requires more points than the last
    let level = 1;
    let requiredPoints = 100;
    let totalRequired = 0;

    while (totalRequired + requiredPoints <= points) {
      totalRequired += requiredPoints;
      level++;
      requiredPoints += 200; // Increase requirement by 200 each level
    }

    return level;
  }

  /**
   * Get user's current streak
   */
  private async getUserStreak(userId: string): Promise<number> {
    const chores = await Chore.find({
      assignedTo: userId,
      status: "approved",
      completedAt: { $exists: true },
    }).sort({ completedAt: -1 });

    let streak = 0;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const chore of chores) {
      const choreDate = new Date(chore.completedAt!);
      choreDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor(
        (currentDate.getTime() - choreDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff === streak) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (daysDiff > streak) {
        break;
      }
    }

    return streak;
  }

  /**
   * Calculate challenge bonus points
   */
  private async calculateChallengeBonus(
    userId: string,
    chore: any,
  ): Promise<{ points: number; reasons: string[] }> {
    const activeChallenges = await this.getUserChallenges(userId);
    let totalBonus = 0;
    const reasons: string[] = [];

    for (const challenge of activeChallenges) {
      if (!challenge.isCompleted) {
        const newProgress = challenge.currentProgress + 1;

        if (newProgress >= challenge.targetValue) {
          totalBonus += Math.round(challenge.pointsReward * 0.1); // 10% bonus for completing challenge
          reasons.push(`Challenge "${challenge.name}" bonus!`);
        }
      }
    }

    return { points: totalBonus, reasons };
  }

  /**
   * Check for newly earned achievements
   */
  private async checkForNewAchievements(
    userId: string,
  ): Promise<AchievementProgress[]> {
    const user = await User.findById(userId);
    if (!user) return [];

    const allAchievements = await Achievement.find({ active: true });
    const userAchievements = user.gamification?.achievements || [];
    const newAchievements: AchievementProgress[] = [];

    for (const achievement of allAchievements) {
      const userAchievement = userAchievements.find(
        (ua) => ua.achievementId.toString() === achievement._id.toString(),
      );

      if (!userAchievement || !userAchievement.isCompleted) {
        const currentProgress = await this.calculateAchievementProgress(
          userId,
          achievement,
        );

        if (currentProgress >= achievement.targetValue) {
          // Mark as completed
          await User.findByIdAndUpdate(userId, {
            $pull: {
              "gamification.achievements": { achievementId: achievement._id },
            },
          });

          await User.findByIdAndUpdate(userId, {
            $push: {
              "gamification.achievements": {
                achievementId: achievement._id,
                currentProgress,
                isCompleted: true,
                completedAt: new Date(),
              },
            },
          });

          newAchievements.push({
            achievementId: achievement._id.toString(),
            name: achievement.name,
            description: achievement.description,
            category: achievement.category,
            currentProgress,
            targetValue: achievement.targetValue,
            isCompleted: true,
            completedAt: new Date(),
            icon: achievement.icon,
            tier: achievement.tier,
          });
        }
      }
    }

    return newAchievements;
  }

  /**
   * Calculate current progress for an achievement
   */
  private async calculateAchievementProgress(
    userId: string,
    achievement: any,
  ): Promise<number> {
    switch (achievement.type) {
      case "chores_completed":
        const choreCount = await Chore.countDocuments({
          assignedTo: userId,
          status: "approved",
        });
        return choreCount;

      case "points_earned":
        const user = await User.findById(userId);
        return user?.gamification?.totalPoints || 0;

      case "streak_days":
        return await this.getUserStreak(userId);

      case "perfect_week":
        // Check if user completed all assigned chores in the last week
        const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const assignedChores = await Chore.countDocuments({
          assignedTo: userId,
          createdAt: { $gte: weekStart },
        });
        const completedChores = await Chore.countDocuments({
          assignedTo: userId,
          createdAt: { $gte: weekStart },
          status: "approved",
        });
        return assignedChores > 0 && assignedChores === completedChores ? 1 : 0;

      default:
        return 0;
    }
  }

  /**
   * Send achievement notifications
   */
  private async sendAchievementNotifications(
    userId: string,
    achievements: AchievementProgress[],
  ): Promise<void> {
    // const messagingService = getUnifiedMessagingService(); // Disabled for testing
    const user = await User.findById(userId);

    if (!user) return;

    for (const achievement of achievements) {
      try {
        // await messagingService.sendMessage({ // Disabled for testing
        console.log(
          `🏆 Achievement Unlocked: ${achievement.name}! ${achievement.description}`,
        );
        // });
      } catch (error) {
        console.error("Failed to send achievement notification:", error);
      }
    }
  }

  /**
   * Notify parents of reward request
   */
  private async notifyParentsOfRewardRequest(
    userId: string,
    reward: any,
  ): Promise<void> {
    const user = await User.findById(userId).populate("family");
    if (!user?.family) return;

    const parents = await User.find({
      family: user.family._id,
      role: "parent",
    });

    // const messagingService = getUnifiedMessagingService(); // Disabled for testing

    for (const parent of parents) {
      try {
        // await messagingService.sendMessage({ // Disabled for testing
        console.log(
          `${user.name} wants to redeem "${reward.name}" for ${reward.pointsCost} points. Review in the app to approve.`,
        );
        // });
      } catch (error) {
        console.error("Failed to send reward approval notification:", error);
      }
    }
  }

  /**
   * Approve reward redemption
   */
  private async approveReward(userId: string, rewardId: string): Promise<void> {
    const reward = await Reward.findById(rewardId);
    if (!reward) return;

    await User.findByIdAndUpdate(userId, {
      $inc: { "gamification.totalPoints": -reward.pointsCost },
      $push: {
        "gamification.redeemedRewards": {
          rewardId,
          redeemedAt: new Date(),
          pointsCost: reward.pointsCost,
        },
      },
      $pull: {
        "gamification.pendingRewards": { rewardId },
      },
    });
  }
}

// Singleton instance
let gamificationService: GamificationService | null = null;

export const getGamificationService = (): GamificationService => {
  if (!gamificationService) {
    gamificationService = new GamificationService();
  }
  return gamificationService;
};

export { GamificationService };
