import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import dbConnect from "@/libs/mongoose";
import { authOptions } from "@/libs/next-auth";
import User from "@/models/User";

// GET /api/user - Get current user info including subscription status
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

    // Check if user has access (either has customerId indicating payment, or is in development mode)
    const hasAccess =
      Boolean(user.customerId) || process.env.NODE_ENV === "development";

    return NextResponse.json({
      id: user._id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      hasAccess,
      customerId: user.customerId,
      priceId: user.priceId,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 },
    );
  }
}
