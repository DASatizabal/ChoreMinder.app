import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { dbConnect } from "@/libs/mongoose";
import { authOptions } from "@/libs/next-auth";
import { getTwilioWhatsAppService } from "@/libs/twilio-whatsapp";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const twilioService = getTwilioWhatsAppService();
    const serviceInfo = twilioService.getServiceInfo();

    // Get current user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has WhatsApp enabled
    const hasWhatsAppNumber = !!user.phone;
    const isWhatsAppAvailable = hasWhatsAppNumber && serviceInfo.configured;

    return NextResponse.json({
      service: {
        configured: serviceInfo.configured,
        fromNumber: serviceInfo.fromNumber,
        accountSid: serviceInfo.accountSid,
      },
      user: {
        hasWhatsAppNumber,
        phone: user.phone ? `***${user.phone.slice(-4)}` : null,
        isWhatsAppAvailable,
      },
      features: {
        sendNotifications: isWhatsAppAvailable,
        receiveCommands: isWhatsAppAvailable,
        fallbackToEmail: true,
      },
    });
  } catch (error: any) {
    console.error("WhatsApp status API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

// Check message delivery status
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { messageSid } = body;

    if (!messageSid) {
      return NextResponse.json(
        { error: "Message SID is required" },
        { status: 400 },
      );
    }

    const twilioService = getTwilioWhatsAppService();
    const deliveryStatus = await twilioService.getMessageStatus(messageSid);

    return NextResponse.json({
      messageSid,
      status: deliveryStatus.status,
      errorCode: deliveryStatus.errorCode,
      errorMessage: deliveryStatus.errorMessage,
      timestamp: deliveryStatus.timestamp,
    });
  } catch (error: any) {
    console.error("Message status check error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
