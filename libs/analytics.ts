"use server";

import Chore from "@/models/Chore";
import Family from "@/models/Family";
import User from "@/models/User";

import { dbConnect } from "./mongoose";

export interface ProgressMetrics {
  totalChores: number;
  completedChores: number;
  completionRate: number;
  totalPoints: number;
  averageCompletionTime: number; // in hours
  streakDays: number;
  improvementTrend: "improving" | "stable" | "declining";
  consistencyScore: number; // 0-100
}

export interface TimeSeriesData {
  date: string;
  completed: number;
  points: number;
  streakDays: number;
}

export interface CategoryInsights {
  category: string;
  totalChores: number;
  completedChores: number;
  completionRate: number;
  averagePoints: number;
  favoriteDay: string;
  improvementSuggestion: string;
}

export interface FamilyAnalytics {
  overview: {
    totalFamilyChores: number;
    totalFamilyPoints: number;
    averageCompletionRate: number;
    activeChildren: number;
    thisWeekImprovement: number;
  };
  memberProgress: Array<{
    userId: string;
    name: string;
    completionRate: number;
    totalPoints: number;
    level: number;
    streak: number;
    thisWeekChores: number;
    trend: "improving" | "stable" | "declining";
  }>;
  insights: {
    topPerformer: string;
    mostImproved: string;
    consistencyChampion: string;
    suggestions: string[];
  };
}

export interface TrendInsight {
  type: "achievement" | "improvement" | "suggestion" | "celebration";
  title: string;
  description: string;
  icon: string;
  priority: "high" | "medium" | "low";
  actionable?: boolean;
  action?: string;
}

class AnalyticsService {
  /**
   * Get individual user progress metrics
   */
  async getUserProgress(
    userId: string,
    timeRange: "week" | "month" | "quarter" | "year" = "month",
  ): Promise<ProgressMetrics> {
    await dbConnect();

    const daysBack = this.getDaysForTimeRange(timeRange);
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    // Get all user's chores in the time range
    const chores = await Chore.find({
      assignedTo: userId,
      createdAt: { $gte: startDate },
      deletedAt: null,
    });

    const completedChores = chores.filter(
      (c) =>
        (c.status as any) === "approved" || (c.status as any) === "verified",
    );

    // Calculate completion rate
    const completionRate =
      chores.length > 0 ? (completedChores.length / chores.length) * 100 : 0;

    // Calculate total points
    const totalPoints = completedChores.reduce(
      (sum, chore) => sum + (chore.points || 0),
      0,
    );

    // Calculate average completion time
    const avgCompletionTime =
      this.calculateAverageCompletionTime(completedChores);

    // Get current streak
    const streakDays = await this.getUserStreak(userId);

    // Calculate improvement trend
    const improvementTrend = await this.calculateImprovementTrend(
      userId,
      timeRange,
    );

    // Calculate consistency score
    const consistencyScore = this.calculateConsistencyScore(
      completedChores,
      daysBack,
    );

    return {
      totalChores: chores.length,
      completedChores: completedChores.length,
      completionRate: Math.round(completionRate * 100) / 100,
      totalPoints,
      averageCompletionTime: Math.round(avgCompletionTime * 10) / 10,
      streakDays,
      improvementTrend,
      consistencyScore: Math.round(consistencyScore),
    };
  }

  /**
   * Get time series data for charts
   */
  async getTimeSeriesData(
    userId: string,
    timeRange: "week" | "month" | "quarter" | "year" = "month",
  ): Promise<TimeSeriesData[]> {
    await dbConnect();

    const daysBack = this.getDaysForTimeRange(timeRange);
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    // Group chores by date
    const chores = await Chore.aggregate([
      {
        $match: {
          assignedTo: userId,
          completedAt: { $gte: startDate },
          status: { $in: ["approved", "verified"] },
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$completedAt",
            },
          },
          completed: { $sum: 1 },
          points: { $sum: "$points" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Fill in missing dates with zero values
    const timeSeriesData: TimeSeriesData[] = [];
    const choreMap = new Map(chores.map((c) => [c._id, c]));

    for (let i = 0; i < daysBack; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateString = date.toISOString().split("T")[0];
      const choreData = choreMap.get(dateString);

      timeSeriesData.push({
        date: dateString,
        completed: choreData?.completed || 0,
        points: choreData?.points || 0,
        streakDays: 0, // Will be calculated separately if needed
      });
    }

    return timeSeriesData;
  }

  /**
   * Get category-based insights
   */
  async getCategoryInsights(
    userId: string,
    timeRange: "week" | "month" | "quarter" | "year" = "month",
  ): Promise<CategoryInsights[]> {
    await dbConnect();

    const daysBack = this.getDaysForTimeRange(timeRange);
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const categoryData = await Chore.aggregate([
      {
        $match: {
          assignedTo: userId,
          createdAt: { $gte: startDate },
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: "$category",
          totalChores: { $sum: 1 },
          completedChores: {
            $sum: {
              $cond: [{ $in: ["$status", ["approved", "verified"]] }, 1, 0],
            },
          },
          totalPoints: {
            $sum: {
              $cond: [
                { $in: ["$status", ["approved", "verified"]] },
                "$points",
                0,
              ],
            },
          },
          completionDays: {
            $push: {
              $cond: [
                { $in: ["$status", ["approved", "verified"]] },
                { $dayOfWeek: "$completedAt" },
                null,
              ],
            },
          },
        },
      },
    ]);

    return categoryData.map((cat) => {
      const completionRate =
        cat.totalChores > 0 ? (cat.completedChores / cat.totalChores) * 100 : 0;
      const averagePoints =
        cat.completedChores > 0 ? cat.totalPoints / cat.completedChores : 0;

      // Find most common completion day
      const validDays = cat.completionDays.filter((d: any) => d !== null);
      const dayFrequency = validDays.reduce((acc: any, day: any) => {
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      }, {} as any);

      const favoriteDay =
        Object.keys(dayFrequency).length > 0
          ? this.getDayName(
              Object.keys(dayFrequency).reduce((a, b) =>
                dayFrequency[a] > dayFrequency[b] ? a : b,
              ),
            )
          : "No pattern";

      return {
        category: cat._id || "Uncategorized",
        totalChores: cat.totalChores,
        completedChores: cat.completedChores,
        completionRate: Math.round(completionRate * 100) / 100,
        averagePoints: Math.round(averagePoints * 100) / 100,
        favoriteDay,
        improvementSuggestion: this.generateImprovementSuggestion(
          completionRate,
          cat._id,
        ),
      };
    });
  }

  /**
   * Get family analytics
   */
  async getFamilyAnalytics(
    familyId: string,
    timeRange: "week" | "month" | "quarter" | "year" = "month",
  ): Promise<FamilyAnalytics> {
    await dbConnect();

    const daysBack = this.getDaysForTimeRange(timeRange);
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    // Get family members (children only)
    const familyMembers = await User.find({
      familyId,
      role: "child",
    }).select("_id name gamification");

    // Get family chores data
    const familyChores = await Chore.aggregate([
      {
        $match: {
          assignedTo: { $in: familyMembers.map((m) => m._id) },
          createdAt: { $gte: startDate },
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: "$assignedTo",
          totalChores: { $sum: 1 },
          completedChores: {
            $sum: {
              $cond: [{ $in: ["$status", ["approved", "verified"]] }, 1, 0],
            },
          },
          totalPoints: {
            $sum: {
              $cond: [
                { $in: ["$status", ["approved", "verified"]] },
                "$points",
                0,
              ],
            },
          },
          thisWeekChores: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$status", ["approved", "verified"]] },
                    {
                      $gte: [
                        "$completedAt",
                        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const choreMap = new Map(familyChores.map((c) => [c._id.toString(), c]));

    // Calculate member progress
    const memberProgress = await Promise.all(
      familyMembers.map(async (member) => {
        const choreData = choreMap.get(member._id.toString()) || {
          totalChores: 0,
          completedChores: 0,
          totalPoints: 0,
          thisWeekChores: 0,
        };

        const completionRate =
          choreData.totalChores > 0
            ? (choreData.completedChores / choreData.totalChores) * 100
            : 0;

        const trend = await this.calculateImprovementTrend(
          member._id.toString(),
          timeRange,
        );

        return {
          userId: member._id.toString(),
          name: member.name,
          completionRate: Math.round(completionRate * 100) / 100,
          totalPoints: choreData.totalPoints,
          level: member.gamification?.level || 1,
          streak: member.gamification?.streak || 0,
          thisWeekChores: choreData.thisWeekChores,
          trend,
        };
      }),
    );

    // Calculate overview stats
    const totalFamilyChores = familyChores.reduce(
      (sum, c) => sum + c.totalChores,
      0,
    );
    const totalFamilyPoints = familyChores.reduce(
      (sum, c) => sum + c.totalPoints,
      0,
    );
    const averageCompletionRate =
      memberProgress.length > 0
        ? memberProgress.reduce((sum, m) => sum + m.completionRate, 0) /
          memberProgress.length
        : 0;

    // Calculate improvement
    const thisWeekTotal = memberProgress.reduce(
      (sum, m) => sum + m.thisWeekChores,
      0,
    );
    const lastWeekTotal = await this.getLastWeekTotal(familyId);
    const thisWeekImprovement =
      lastWeekTotal > 0
        ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100
        : 0;

    // Generate insights
    const insights = this.generateFamilyInsights(memberProgress);

    return {
      overview: {
        totalFamilyChores,
        totalFamilyPoints,
        averageCompletionRate: Math.round(averageCompletionRate * 100) / 100,
        activeChildren: familyMembers.length,
        thisWeekImprovement: Math.round(thisWeekImprovement * 100) / 100,
      },
      memberProgress: memberProgress as any,
      insights,
    };
  }

  /**
   * Generate trend insights and suggestions
   */
  async getTrendInsights(
    userId: string,
    timeRange: "week" | "month" | "quarter" | "year" = "month",
  ): Promise<TrendInsight[]> {
    const insights: TrendInsight[] = [];

    const progress = await this.getUserProgress(userId, timeRange);
    const user = await User.findById(userId);

    // Achievement insights
    if (progress.completionRate >= 90) {
      insights.push({
        type: "celebration",
        title: "Amazing Consistency! 🌟",
        description: `You're completing ${progress.completionRate}% of your chores! Keep up the excellent work!`,
        icon: "🏆",
        priority: "high",
      });
    }

    // Improvement insights
    if (progress.improvementTrend === "improving") {
      insights.push({
        type: "improvement",
        title: "You're Getting Better! 📈",
        description:
          "Your completion rate has improved compared to last period. Great progress!",
        icon: "⬆️",
        priority: "medium",
      });
    }

    // Streak insights
    if (progress.streakDays >= 7) {
      insights.push({
        type: "celebration",
        title: `${progress.streakDays}-Day Streak! 🔥`,
        description:
          "You're building an amazing habit! Consistency is the key to success.",
        icon: "🔥",
        priority: "high",
      });
    }

    // Suggestion insights
    if (progress.completionRate < 70) {
      insights.push({
        type: "suggestion",
        title: "Let's Boost Your Success Rate! 💪",
        description:
          "Try breaking larger chores into smaller steps, or ask for help when needed.",
        icon: "💡",
        priority: "medium",
        actionable: true,
        action: "View tips for success",
      });
    }

    // Consistency insights
    if (progress.consistencyScore >= 80) {
      insights.push({
        type: "achievement",
        title: "Consistency Champion! ⭐",
        description: `Your consistency score of ${progress.consistencyScore}% shows great daily habits!`,
        icon: "📅",
        priority: "medium",
      });
    }

    return insights;
  }

  /**
   * Export family report data
   */
  async exportFamilyReport(
    familyId: string,
    timeRange: "week" | "month" | "quarter" | "year" = "month",
  ): Promise<{
    summary: any;
    memberData: any[];
    chartData: any;
    insights: TrendInsight[];
    generatedAt: Date;
  }> {
    const familyAnalytics = await this.getFamilyAnalytics(familyId, timeRange);
    const family = await Family.findById(familyId);

    // Get chart data for each member
    const chartData = await Promise.all(
      familyAnalytics.memberProgress.map(async (member) => ({
        userId: member.userId,
        name: member.name,
        timeSeriesData: await this.getTimeSeriesData(member.userId, timeRange),
        categoryInsights: await this.getCategoryInsights(
          member.userId,
          timeRange,
        ),
      })),
    );

    // Get combined insights
    const allInsights = await Promise.all(
      familyAnalytics.memberProgress.map((member) =>
        this.getTrendInsights(member.userId, timeRange),
      ),
    );

    return {
      summary: {
        familyName: family?.name || "Family",
        timeRange,
        reportPeriod: {
          start: new Date(
            Date.now() -
              this.getDaysForTimeRange(timeRange) * 24 * 60 * 60 * 1000,
          ),
          end: new Date(),
        },
        overview: familyAnalytics.overview,
        topInsights: familyAnalytics.insights,
      },
      memberData: familyAnalytics.memberProgress,
      chartData,
      insights: allInsights.flat(),
      generatedAt: new Date(),
    };
  }

  // Helper methods
  private getDaysForTimeRange(timeRange: string): number {
    switch (timeRange) {
      case "week":
        return 7;
      case "month":
        return 30;
      case "quarter":
        return 90;
      case "year":
        return 365;
      default:
        return 30;
    }
  }

  private calculateAverageCompletionTime(chores: any[]): number {
    const validChores = chores.filter((c) => c.startedAt && c.completedAt);
    if (validChores.length === 0) return 0;

    const totalTime = validChores.reduce((sum, chore) => {
      const startTime = new Date(chore.startedAt).getTime();
      const endTime = new Date(chore.completedAt).getTime();
      return sum + (endTime - startTime);
    }, 0);

    return totalTime / validChores.length / (1000 * 60 * 60); // Convert to hours
  }

  private async getUserStreak(userId: string): Promise<number> {
    const chores = await Chore.find({
      assignedTo: userId,
      status: { $in: ["approved", "verified"] },
      completedAt: { $exists: true },
      deletedAt: null,
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

  private async calculateImprovementTrend(
    userId: string,
    timeRange: string,
  ): Promise<"improving" | "stable" | "declining"> {
    const daysBack = this.getDaysForTimeRange(timeRange);
    const halfPeriod = Math.floor(daysBack / 2);

    const firstHalfStart = new Date(
      Date.now() - daysBack * 24 * 60 * 60 * 1000,
    );
    const firstHalfEnd = new Date(
      Date.now() - halfPeriod * 24 * 60 * 60 * 1000,
    );
    const secondHalfStart = firstHalfEnd;
    const secondHalfEnd = new Date();

    const [firstHalfChores, secondHalfChores] = await Promise.all([
      Chore.countDocuments({
        assignedTo: userId,
        status: { $in: ["approved", "verified"] },
        completedAt: { $gte: firstHalfStart, $lt: firstHalfEnd },
        deletedAt: null,
      }),
      Chore.countDocuments({
        assignedTo: userId,
        status: { $in: ["approved", "verified"] },
        completedAt: { $gte: secondHalfStart, $lt: secondHalfEnd },
        deletedAt: null,
      }),
    ]);

    const difference = secondHalfChores - firstHalfChores;
    const changePercentage =
      firstHalfChores > 0 ? (difference / firstHalfChores) * 100 : 0;

    if (changePercentage > 10) return "improving";
    if (changePercentage < -10) return "declining";
    return "stable";
  }

  private calculateConsistencyScore(chores: any[], totalDays: number): number {
    if (chores.length === 0) return 0;

    // Group chores by date
    const dateGroups = new Map();
    chores.forEach((chore) => {
      if (chore.completedAt) {
        const date = new Date(chore.completedAt).toDateString();
        dateGroups.set(date, (dateGroups.get(date) || 0) + 1);
      }
    });

    const activeDays = dateGroups.size;
    return (activeDays / totalDays) * 100;
  }

  private getDayName(dayNumber: string): string {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[parseInt(dayNumber) - 1] || "Unknown";
  }

  private generateImprovementSuggestion(
    completionRate: number,
    category: string,
  ): string {
    if (completionRate >= 90) {
      return `Excellent work on ${category} chores! You're a champion! 🏆`;
    } else if (completionRate >= 70) {
      return `Good progress on ${category}! Try setting reminders to boost completion rate.`;
    } else if (completionRate >= 50) {
      return `${category} chores need attention. Break them into smaller steps for success!`;
    } else {
      return `Focus on ${category} chores - start with just one per day to build the habit.`;
    }
  }

  private generateFamilyInsights(memberProgress: any[]): any {
    if (memberProgress.length === 0) {
      return {
        topPerformer: "No data available",
        mostImproved: "No data available",
        consistencyChampion: "No data available",
        suggestions: [],
      };
    }

    const topPerformer = memberProgress.reduce((top, member) =>
      member.completionRate > top.completionRate ? member : top,
    );

    const mostImproved =
      memberProgress.filter((m) => m.trend === "improving")[0] || topPerformer;

    const consistencyChampion = memberProgress.reduce((champion, member) =>
      member.streak > champion.streak ? member : champion,
    );

    const suggestions = [
      "Celebrate weekly achievements together as a family! 🎉",
      "Try family chore challenges for extra motivation! 💪",
      "Consider adjusting chore difficulty based on completion rates.",
      "Use positive reinforcement for consistent improvements! ⭐",
    ];

    return {
      topPerformer: topPerformer.name,
      mostImproved: mostImproved.name,
      consistencyChampion: consistencyChampion.name,
      suggestions,
    };
  }

  private async getLastWeekTotal(familyId: string): Promise<number> {
    const familyMembers = await User.find({
      familyId,
      role: "child",
    }).select("_id");

    const lastWeekStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const lastWeekEnd = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const lastWeekChores = await Chore.countDocuments({
      assignedTo: { $in: familyMembers.map((m) => m._id) },
      status: { $in: ["approved", "verified"] },
      completedAt: { $gte: lastWeekStart, $lt: lastWeekEnd },
      deletedAt: null,
    });

    return lastWeekChores;
  }
}

// Singleton instance
let analyticsService: AnalyticsService | null = null;

export const getAnalyticsService = (): AnalyticsService => {
  if (!analyticsService) {
    analyticsService = new AnalyticsService();
  }
  return analyticsService;
};

export { AnalyticsService };
