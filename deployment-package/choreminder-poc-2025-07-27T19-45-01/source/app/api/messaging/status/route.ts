import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getMessageScheduler } from "@/libs/message-scheduler";
import { getTwilioSMSService } from "@/libs/twilio-sms";
import { getTwilioWhatsAppService } from "@/libs/twilio-whatsapp";
import { getUnifiedMessagingService } from "@/libs/unified-messaging";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const timeRange =
      (searchParams.get("timeRange") as "hour" | "day" | "week") || "day";

    const messagingService = getUnifiedMessagingService();
    const scheduler = getMessageScheduler();
    const whatsAppService = getTwilioWhatsAppService();
    const smsService = getTwilioSMSService();

    // Get service statuses
    const serviceStatus = messagingService.getServiceStatus();
    const deliveryStats = messagingService.getDeliveryStats(timeRange);
    const schedulerStats = scheduler.getStats();
    const upcomingMessages = scheduler.getUpcomingMessages(24);

    return NextResponse.json({
      services: {
        whatsapp: {
          ...serviceStatus.whatsapp,
          available: whatsAppService.isConfigured(),
        },
        sms: {
          ...serviceStatus.sms,
          available: smsService.isConfigured(),
        },
        email: {
          ...serviceStatus.email,
          available: true,
        },
      },
      delivery: {
        timeRange,
        stats: deliveryStats,
      },
      scheduler: {
        stats: schedulerStats,
        upcoming: upcomingMessages.slice(0, 10), // Limit to 10 upcoming messages
      },
      system: {
        queueSize: serviceStatus.queueSize,
        rateLimiters: serviceStatus.rateLimiters,
        deliveryTracking: serviceStatus.deliveryTracking,
        uptime: process.uptime(),
      },
    });
  } catch (error: any) {
    console.error("Messaging status API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

// Check specific message delivery status
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { messageSid, channel } = body;

    if (!messageSid || !channel) {
      return NextResponse.json(
        { error: "Message SID and channel are required" },
        { status: 400 },
      );
    }

    let deliveryStatus = null;

    try {
      switch (channel) {
        case "whatsapp":
          const whatsAppService = getTwilioWhatsAppService();
          deliveryStatus = await whatsAppService.getMessageStatus(messageSid);
          break;

        case "sms":
          const smsService = getTwilioSMSService();
          deliveryStatus = await smsService.getMessageStatus(messageSid);
          break;

        case "email":
          // Email delivery status would require integration with email service provider
          deliveryStatus = {
            messageSid,
            status: "delivered", // Placeholder
            timestamp: new Date(),
          };
          break;

        default:
          return NextResponse.json(
            { error: "Invalid channel" },
            { status: 400 },
          );
      }

      return NextResponse.json({
        messageSid,
        channel,
        deliveryStatus,
      });
    } catch (error: any) {
      return NextResponse.json({
        messageSid,
        channel,
        deliveryStatus: null,
        error: error.message,
      });
    }
  } catch (error: any) {
    console.error("Message delivery status API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

// Health check endpoint
export async function HEAD(req: NextRequest) {
  try {
    const messagingService = getUnifiedMessagingService();
    const serviceStatus = messagingService.getServiceStatus();

    // Simple health check - return 200 if at least one service is available
    const isHealthy =
      serviceStatus.whatsapp.configured ||
      serviceStatus.sms.configured ||
      serviceStatus.email.configured;

    return new NextResponse(null, {
      status: isHealthy ? 200 : 503,
      headers: {
        "X-Service-Status": isHealthy ? "healthy" : "degraded",
        "X-Uptime": Math.floor(process.uptime()).toString(),
      },
    });
  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        "X-Service-Status": "error",
      },
    });
  }
}
