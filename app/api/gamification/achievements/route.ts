import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbConnect } from "@/libs/mongoose";
import { getGamificationService } from "@/libs/gamification";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const gamificationService = getGamificationService();
    const achievements = await gamificationService.getUserAchievements(session.user.id);

    return NextResponse.json({
      achievements,
      totalCount: achievements.length,
      completedCount: achievements.filter(a => a.isCompleted).length,
    });
  } catch (error: any) {
    console.error("Get achievements API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// Award achievement manually (for testing or admin purposes)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { achievementId, currentProgress } = body;

    if (!achievementId) {
      return NextResponse.json(
        { error: "Achievement ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // For now, just return success - actual achievement awarding happens automatically
    // through the gamification service when chores are completed
    
    return NextResponse.json({
      message: "Achievement progress updated",
      achievementId,
      currentProgress: currentProgress || 0,
    });
  } catch (error: any) {
    console.error("Award achievement API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}