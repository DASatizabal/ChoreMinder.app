import { NextRequest, NextResponse } from "next/server";

// POST /api/whatsapp/webhook - WhatsApp webhook handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Simplified webhook response - WhatsApp functionality not fully implemented
    console.log("WhatsApp webhook received:", body);

    return NextResponse.json({
      success: true,
      message: "WhatsApp webhook functionality not implemented yet",
    });
  } catch (error) {
    console.error("Error handling WhatsApp webhook:", error);
    return NextResponse.json(
      { error: "Failed to handle webhook" },
      { status: 500 },
    );
  }
}

// GET /api/whatsapp/webhook - WhatsApp webhook verification
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    // Simplified verification - return challenge for webhook setup
    if (mode === "subscribe" && challenge) {
      return NextResponse.json(challenge);
    }

    return NextResponse.json(
      { error: "Invalid verification request" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error verifying WhatsApp webhook:", error);
    return NextResponse.json(
      { error: "Failed to verify webhook" },
      { status: 500 },
    );
  }
}
