import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { getGamificationService } from "@/libs/gamification";
import { dbConnect } from "@/libs/mongoose";
import { authOptions } from "@/libs/next-auth";
import Chore from "@/models/Chore";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate level and next level requirements
    const gamificationService = getGamificationService();
    const currentPoints = user.gamification?.totalPoints || 0;
    const currentLevel = Math.floor(currentPoints / 100) + 1; // Simple level calculation
    const pointsForNextLevel = currentLevel * 100;
    const pointsToNextLevel = pointsForNextLevel - currentPoints;

    // Get recent activity
    const recentChores = await Chore.find({
      assignedTo: session.user.id,
      status: "approved",
      completedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
    })
      .sort({ completedAt: -1 })
      .limit(10);

    const weeklyPoints = await Chore.aggregate([
      {
        $match: {
          assignedTo: user._id,
          status: "approved",
          completedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: null,
          totalPoints: { $sum: "$points" },
          totalChores: { $sum: 1 },
        },
      },
    ]);

    const thisWeekStats = weeklyPoints[0] || { totalPoints: 0, totalChores: 0 };

    return NextResponse.json({
      totalPoints: currentPoints,
      level: currentLevel,
      pointsToNextLevel,
      streak: user.gamification?.streak || 0,
      choresCompleted: user.gamification?.choresCompleted || 0,
      weeklyStats: thisWeekStats,
      recentActivity: recentChores.map((chore) => ({
        id: chore._id,
        title: chore.title,
        points: chore.points,
        completedAt: chore.completedAt,
      })),
      lastActivityAt: user.gamification?.lastActivityAt,
    });
  } catch (error: any) {
    console.error("Get points API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

// Calculate points for chore completion (used by chore completion API)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { choreId, quality = "good" } = body;

    if (!choreId) {
      return NextResponse.json(
        { error: "Chore ID is required" },
        { status: 400 },
      );
    }

    await dbConnect();

    const gamificationService = getGamificationService();

    // Calculate points breakdown
    const pointsBreakdown = await gamificationService.calculatePointsForChore(
      choreId,
      session.user.id,
      quality,
    );

    // Award points and check achievements
    const result = await gamificationService.awardPoints(
      session.user.id,
      pointsBreakdown,
      choreId,
    );

    return NextResponse.json({
      pointsBreakdown,
      newTotalPoints: result.totalPoints,
      newAchievements: result.newAchievements,
      levelUp: result.newLevel
        ? {
            oldLevel: result.newLevel - 1,
            newLevel: result.newLevel,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Calculate points API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

// Get leaderboard (family only - positive encouragement)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findById(session.user.id);
    if (!user?.familyId) {
      return NextResponse.json(
        { error: "User not in a family" },
        { status: 400 },
      );
    }

    // Get family members' progress (children only)
    const familyMembers = await User.find({
      familyId: user.familyId,
      role: "child",
    })
      .select("name gamification")
      .sort({ "gamification.totalPoints": -1 });

    const leaderboard = familyMembers.map((member, index) => ({
      id: member._id,
      name: member.name,
      totalPoints: member.gamification?.totalPoints || 0,
      level: Math.floor((member.gamification?.totalPoints || 0) / 100) + 1,
      choresCompleted: member.gamification?.choresCompleted || 0,
      position: index + 1,
      isCurrentUser: member._id.toString() === session.user.id,
    }));

    return NextResponse.json({
      leaderboard,
      userPosition: leaderboard.find((m) => m.isCurrentUser)?.position || 0,
      message:
        "Keep up the great work! Every chore completed makes you stronger! 💪",
    });
  } catch (error: any) {
    console.error("Get leaderboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
