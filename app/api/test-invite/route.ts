import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/libs/next-auth";

// Test endpoint to verify invitation API is working
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, role = "child" } = await req.json();

    console.log("🧪 [TEST INVITE] Received request:", {
      email,
      role,
      userId: session.user.id,
      userName: session.user.name,
    });

    // Simulate invitation creation
    const inviteCode = `TEST${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    return NextResponse.json({
      success: true,
      message: "Test invitation created successfully",
      inviteCode,
      email,
      role,
      inviteLink: `http://localhost:3000/join-family?code=${inviteCode}`,
      test: true,
    });
  } catch (error) {
    console.error("🧪 [TEST INVITE] Error:", error);
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "Test invite endpoint is working",
    timestamp: new Date().toISOString(),
  });
}
