import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbConnect } from "@/libs/mongoose";
import { getSchedulingService } from "@/libs/scheduling";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = new Date(searchParams.get("start") || Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = new Date(searchParams.get("end") || Date.now() + 60 * 24 * 60 * 60 * 1000);

    await dbConnect();

    const user = await User.findById(session.user.id);
    if (!user?.familyId) {
      return NextResponse.json({ error: "User not in a family" }, { status: 400 });
    }

    // Verify user is parent or admin (calendar access control)
    if (!["parent", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Only parents can view family calendar" }, { status: 403 });
    }

    const schedulingService = getSchedulingService();

    // Get family schedule data
    const scheduleData = await schedulingService.getFamilySchedule(
      user.familyId.toString(),
      startDate,
      endDate
    );

    return NextResponse.json({
      chores: scheduleData.chores,
      conflicts: scheduleData.conflicts,
      recommendations: scheduleData.recommendations,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      generatedAt: new Date(),
    });
  } catch (error: any) {
    console.error("Family calendar API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}