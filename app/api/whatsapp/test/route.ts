import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/libs/next-auth";

// POST /api/whatsapp/test - Test WhatsApp functionality
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageType = "simple", recipient } = await req.json();

    // Simplified test response
    return NextResponse.json({
      success: true,
      message: "WhatsApp test functionality not implemented yet",
      test: {
        messageType,
        recipient: recipient || "Test recipient",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error testing WhatsApp:", error);
    return NextResponse.json(
      { error: "Failed to test WhatsApp" },
      { status: 500 },
    );
  }
}