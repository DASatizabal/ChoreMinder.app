import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import dbConnect from "@/libs/mongoose";
import { authOptions } from "@/libs/next-auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Simple mock response for now - in production this would query the database
    const familyContext = {
      activeFamily: {
        id: "mock_family_id",
        name: "Smith Family",
        createdBy: session.user.id,
        memberCount: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      role: "parent", // or "child" based on user data
      familyCount: 1,
    };

    return NextResponse.json(familyContext);
  } catch (error) {
    console.error("Error fetching family context:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
