import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbConnect } from "@/libs/mongoose";
import { getAnalyticsService } from "@/libs/analytics";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const timeRange = (searchParams.get("timeRange") as "week" | "month" | "quarter" | "year") || "month";
    const userId = searchParams.get("userId") || session.user.id;

    await dbConnect();

    // Verify user has permission to view this data
    const requestingUser = await User.findById(session.user.id);
    const targetUser = await User.findById(userId);

    if (!requestingUser || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user can view this data (self, or parent viewing child, or admin)
    const canView = 
      userId === session.user.id || // Self
      (requestingUser.role === "parent" && requestingUser.familyId?.toString() === targetUser.familyId?.toString()) || // Parent viewing child
      requestingUser.role === "admin"; // Admin

    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const analyticsService = getAnalyticsService();

    // Get progress metrics
    const progressMetrics = await analyticsService.getUserProgress(userId, timeRange);

    // Get time series data for charts
    const timeSeriesData = await analyticsService.getTimeSeriesData(userId, timeRange);

    // Get category insights
    const categoryInsights = await analyticsService.getCategoryInsights(userId, timeRange);

    // Get trend insights
    const trendInsights = await analyticsService.getTrendInsights(userId, timeRange);

    return NextResponse.json({
      userId,
      userName: targetUser.name,
      timeRange,
      progressMetrics,
      timeSeriesData,
      categoryInsights,
      trendInsights,
      generatedAt: new Date(),
    });
  } catch (error: any) {
    console.error("Get progress analytics API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}