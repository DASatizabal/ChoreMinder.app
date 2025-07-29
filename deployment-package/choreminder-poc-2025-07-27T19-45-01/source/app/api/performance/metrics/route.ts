import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getPerformanceService } from "@/libs/performance";
import User from "@/models/User";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow admins to view performance metrics
    const user = await User.findById(session.user.id);
    if (user?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const performanceService = getPerformanceService();

    const metrics = performanceService.getPerformanceMetrics();
    const dbHealth = await performanceService.getDatabaseHealth();

    return NextResponse.json({
      performance: metrics,
      database: dbHealth,
      timestamp: new Date(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
    });
  } catch (error: any) {
    console.error("Performance metrics API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow admins to clear cache
    const user = await User.findById(session.user.id);
    if (user?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const performanceService = getPerformanceService();
    performanceService.clearCache();

    return NextResponse.json({
      message: "Cache cleared successfully",
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error("Clear cache API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
