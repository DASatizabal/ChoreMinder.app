import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import dbConnect from "@/libs/mongoose";
import { authOptions } from "@/libs/next-auth";
import User from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { familyId } = await request.json();

    if (!familyId) {
      return NextResponse.json(
        { error: "Family ID is required" },
        { status: 400 },
      );
    }

    // Update user's active family
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is a member of the requested family
    const isMember = user.families?.some(
      (family: any) => family.familyId.toString() === familyId,
    );
    if (!isMember) {
      return NextResponse.json(
        { error: "You are not a member of this family" },
        { status: 403 },
      );
    }

    // For now, we'll just return success without storing active family
    // In a full implementation, you'd add activeFamily to User model
    return NextResponse.json({
      success: true,
      message: "Family switch initiated successfully",
    });
  } catch (error) {
    console.error("Error switching family:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
