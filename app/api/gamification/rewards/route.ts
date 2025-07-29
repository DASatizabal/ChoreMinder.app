import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { getGamificationService } from "@/libs/gamification";
import { dbConnect } from "@/libs/mongoose";
import { authOptions } from "@/libs/next-auth";
import Reward from "@/models/Reward";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const gamificationService = getGamificationService();
    const rewards = await gamificationService.getAvailableRewards(
      session.user.id,
    );

    // Get user's pending and redeemed rewards
    const user = await User.findById(session.user.id);
    const pendingRewards = user?.gamification?.pendingRewards || [];
    const redeemedRewards = user?.gamification?.redeemedRewards || [];

    return NextResponse.json({
      availableRewards: rewards,
      pendingRewards: pendingRewards.map((pr) => ({
        rewardId: pr.rewardId.toString(),
        requestedAt: pr.requestedAt,
        pointsCost: pr.pointsCost,
      })),
      redeemedRewards: redeemedRewards.map((rr) => ({
        rewardId: rr.rewardId.toString(),
        redeemedAt: rr.redeemedAt,
        pointsCost: rr.pointsCost,
      })),
      userPoints: user?.gamification?.totalPoints || 0,
    });
  } catch (error: any) {
    console.error("Get rewards API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

// Request reward redemption
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { rewardId } = body;

    if (!rewardId) {
      return NextResponse.json(
        { error: "Reward ID is required" },
        { status: 400 },
      );
    }

    await dbConnect();

    const gamificationService = getGamificationService();
    const result = await gamificationService.requestReward(
      session.user.id,
      rewardId,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      message: result.needsApproval
        ? "Reward request sent to parents for approval"
        : "Reward redeemed successfully",
      needsApproval: result.needsApproval,
      rewardId,
    });
  } catch (error: any) {
    console.error("Request reward API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

// Approve/deny reward (for parents)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { childId, rewardId, action } = body;

    if (!childId || !rewardId || !action) {
      return NextResponse.json(
        { error: "Child ID, reward ID, and action are required" },
        { status: 400 },
      );
    }

    if (!["approve", "deny"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'approve' or 'deny'" },
        { status: 400 },
      );
    }

    await dbConnect();

    // Verify user is a parent and child is in same family
    const parent = await User.findById(session.user.id);
    const child = await User.findById(childId);

    if (!parent || !child || parent.role !== "parent") {
      return NextResponse.json(
        { error: "Unauthorized - must be a parent" },
        { status: 403 },
      );
    }

    if (parent.familyId?.toString() !== child.familyId?.toString()) {
      return NextResponse.json(
        { error: "Child not in same family" },
        { status: 403 },
      );
    }

    const reward = await Reward.findById(rewardId);
    if (!reward) {
      return NextResponse.json({ error: "Reward not found" }, { status: 404 });
    }

    if (action === "approve") {
      // Deduct points and move to redeemed rewards
      await User.findByIdAndUpdate(childId, {
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

      // Update reward redemption count
      await Reward.findByIdAndUpdate(rewardId, {
        $inc: { currentRedemptions: 1 },
      });
    } else {
      // Just remove from pending rewards
      await User.findByIdAndUpdate(childId, {
        $pull: {
          "gamification.pendingRewards": { rewardId },
        },
      });
    }

    return NextResponse.json({
      message: `Reward ${action}d successfully`,
      action,
      rewardId,
      childId,
    });
  } catch (error: any) {
    console.error("Approve/deny reward API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
