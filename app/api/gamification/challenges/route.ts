import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { getGamificationService } from "@/libs/gamification";
import { dbConnect } from "@/libs/mongoose";
import { authOptions } from "@/libs/next-auth";
import Challenge from "@/models/Challenge";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const gamificationService = getGamificationService();
    const challenges = await gamificationService.getUserChallenges(
      session.user.id,
    );

    return NextResponse.json({
      challenges,
      activeCount: challenges.filter((c) => !c.isCompleted).length,
      completedCount: challenges.filter((c) => c.isCompleted).length,
    });
  } catch (error: any) {
    console.error("Get challenges API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

// Create personal challenge
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type } = body;

    await dbConnect();

    const gamificationService = getGamificationService();

    if (type === "weekly") {
      const challenge = await gamificationService.createWeeklyPersonalChallenge(
        session.user.id,
      );
      return NextResponse.json({
        message: "Weekly challenge created",
        challenge,
      });
    }

    return NextResponse.json(
      { error: "Invalid challenge type" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("Create challenge API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

// Update challenge progress
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { challengeId, progress } = body;

    if (!challengeId || progress === undefined) {
      return NextResponse.json(
        { error: "Challenge ID and progress are required" },
        { status: 400 },
      );
    }

    await dbConnect();

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 },
      );
    }

    // Update user's challenge progress
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const challengeIndex =
      user.gamification?.challenges?.findIndex(
        (c) => c.challengeId.toString() === challengeId,
      ) ?? -1;

    const isCompleted = progress >= challenge.targetValue;

    if (challengeIndex >= 0) {
      // Update existing challenge progress
      await User.findByIdAndUpdate(session.user.id, {
        $set: {
          [`gamification.challenges.${challengeIndex}.currentProgress`]:
            progress,
          [`gamification.challenges.${challengeIndex}.isCompleted`]:
            isCompleted,
          ...(isCompleted && {
            [`gamification.challenges.${challengeIndex}.completedAt`]:
              new Date(),
          }),
        },
      });
    } else {
      // Add new challenge progress
      await User.findByIdAndUpdate(session.user.id, {
        $push: {
          "gamification.challenges": {
            challengeId,
            currentProgress: progress,
            isCompleted,
            ...(isCompleted && { completedAt: new Date() }),
          },
        },
      });
    }

    // Award points if challenge completed
    if (isCompleted) {
      await User.findByIdAndUpdate(session.user.id, {
        $inc: { "gamification.totalPoints": challenge.pointsReward },
      });
    }

    return NextResponse.json({
      message: "Challenge progress updated",
      challengeId,
      progress,
      isCompleted,
      pointsAwarded: isCompleted ? challenge.pointsReward : 0,
    });
  } catch (error: any) {
    console.error("Update challenge API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
