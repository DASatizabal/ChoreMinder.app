import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { getAnalyticsService } from "@/libs/analytics";
import { dbConnect } from "@/libs/mongoose";
import { authOptions } from "@/libs/next-auth";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const timeRange =
      (searchParams.get("timeRange") as
        | "week"
        | "month"
        | "quarter"
        | "year") || "month";

    await dbConnect();

    const user = await User.findById(session.user.id);
    if (!user?.familyId) {
      return NextResponse.json(
        { error: "User not in a family" },
        { status: 400 },
      );
    }

    // Verify user is parent or admin
    if (!["parent", "admin"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only parents can view family analytics" },
        { status: 403 },
      );
    }

    const analyticsService = getAnalyticsService();

    // Get family analytics
    const familyAnalytics = await analyticsService.getFamilyAnalytics(
      user.familyId.toString(),
      timeRange,
    );

    return NextResponse.json({
      familyId: user.familyId.toString(),
      timeRange,
      analytics: familyAnalytics,
      generatedAt: new Date(),
    });
  } catch (error: any) {
    console.error("Get family analytics API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
