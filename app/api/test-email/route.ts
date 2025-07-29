import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { sendTestEmail } from "@/libs/email";
import { authOptions } from "@/libs/next-auth";

// Test endpoint to verify Resend email setup
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 },
      );
    }

    console.log(`🧪 [TEST EMAIL] Sending test email to: ${email}`);

    const result = await sendTestEmail(email);

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? "Test email sent successfully!"
        : "Failed to send test email",
      messageId: result.messageId,
      error: result.error,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("🧪 [TEST EMAIL] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Test email failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "Test email endpoint is ready",
    instructions: "POST with { email: 'your@email.com' } to send a test email",
    timestamp: new Date().toISOString(),
  });
}
