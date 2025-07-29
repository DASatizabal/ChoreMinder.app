import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbConnect } from "@/libs/mongoose";
import { getSchedulingService } from "@/libs/scheduling";
import User from "@/models/User";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { date } = body;

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

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
        { error: "Only parents can optimize schedules" },
        { status: 403 },
      );
    }

    const schedulingService = getSchedulingService();

    // Get optimization recommendations
    const optimization = await schedulingService.optimizeFamilySchedule(
      user.familyId.toString(),
      new Date(date),
    );

    return NextResponse.json({
      date,
      optimization,
      generatedAt: new Date(),
    });
  } catch (error: any) {
    console.error("Schedule optimization API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
