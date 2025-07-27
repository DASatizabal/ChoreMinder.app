import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbConnect } from "@/libs/mongoose";
import { getTwilioWhatsAppService } from "@/libs/twilio-whatsapp";
import { WhatsAppMessageTemplates } from "@/libs/whatsapp-templates";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { testType = "basic", phoneNumber } = body;

    // Get current user
    const user = await User.findById(session.user.id).populate("family");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const twilioService = getTwilioWhatsAppService();

    // Check if service is configured
    if (!twilioService.isConfigured()) {
      return NextResponse.json(
        {
          error: "WhatsApp service not configured",
          details:
            "Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER",
        },
        { status: 503 },
      );
    }

    // Use provided phone number or user's phone
    const targetPhone = phoneNumber || user.phone;
    if (!targetPhone) {
      return NextResponse.json(
        { error: "No phone number provided and user has no phone on file" },
        { status: 400 },
      );
    }

    let testMessage = "";
    let testResult: any = {};

    try {
      switch (testType) {
        case "basic":
          testMessage = `🧪 *WhatsApp Test Message*

Hi ${user.name}! 👋

This is a test message from ChoreMinder to verify WhatsApp integration is working correctly.

✅ If you receive this message, WhatsApp notifications are working!

Reply *HELP* to see available commands.

Time: ${new Date().toLocaleString()}`;
          break;

        case "help":
          testMessage = WhatsAppMessageTemplates.helpMessage(user);
          break;

        case "rich":
          testMessage = `🏠 *ChoreMinder Test - Rich Message*

Hello ${user.name}! 🌟

This test includes:
📱 Emojis and formatting
🔗 Multiple lines
💪 Motivational content
📊 Status indicators

Features working:
✅ Message delivery
✅ Formatting support
✅ Emoji rendering
✅ Multi-line content

Reply with any command to test two-way communication!

Family: ${user.family?.name || "Not assigned"}
User Role: ${user.role}
Test Time: ${new Date().toLocaleString()}`;
          break;

        case "error":
          // Test error handling
          testMessage = "Test error handling - this should trigger error flow";
          break;

        default:
          return NextResponse.json(
            { error: "Invalid test type" },
            { status: 400 },
          );
      }

      // Send test message
      console.log(`Sending WhatsApp test message to ${targetPhone}`);

      const response = await twilioService.sendMessage({
        to: targetPhone,
        body: testMessage,
      });

      if (response.status === "failed") {
        testResult = {
          success: false,
          error: response.errorMessage,
          errorCode: response.errorCode,
          details: "WhatsApp message failed to send",
        };
      } else {
        testResult = {
          success: true,
          messageSid: response.sid,
          status: response.status,
          details: "WhatsApp message sent successfully",
        };

        // Wait a moment and check delivery status
        setTimeout(async () => {
          try {
            const deliveryStatus = await twilioService.getMessageStatus(
              response.sid,
            );
            console.log(
              `Test message delivery status: ${deliveryStatus.status}`,
            );
          } catch (error) {
            console.log("Could not check delivery status:", error);
          }
        }, 5000);
      }
    } catch (error: any) {
      console.error("WhatsApp test send error:", error);
      testResult = {
        success: false,
        error: error.message,
        details: "Exception occurred while sending test message",
      };
    }

    // Return comprehensive test results
    return NextResponse.json({
      test: {
        type: testType,
        timestamp: new Date().toISOString(),
        targetPhone,
        user: {
          id: user._id,
          name: user.name,
          role: user.role,
          family: user.family?.name,
        },
      },
      service: twilioService.getServiceInfo(),
      result: testResult,
      recommendations: generateTestRecommendations(testResult),
    });
  } catch (error: any) {
    console.error("WhatsApp test API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

// Generate test recommendations based on results
function generateTestRecommendations(testResult: any): string[] {
  const recommendations: string[] = [];

  if (!testResult.success) {
    recommendations.push(
      "❌ WhatsApp test failed - check Twilio configuration",
    );

    if (testResult.errorCode) {
      switch (testResult.errorCode) {
        case "21211":
          recommendations.push(
            "📱 Invalid phone number format - ensure E.164 format (+1234567890)",
          );
          break;
        case "21408":
          recommendations.push(
            "⚠️ Permission denied - check WhatsApp Business API sandbox approval",
          );
          break;
        case "21610":
          recommendations.push(
            "🔧 Twilio account issue - verify account status and credits",
          );
          break;
        default:
          recommendations.push(
            `🔍 Error code ${testResult.errorCode} - check Twilio documentation`,
          );
      }
    }

    recommendations.push("🔄 Try testing with a verified phone number first");
    recommendations.push(
      "📧 Consider email fallback for critical notifications",
    );
  } else {
    recommendations.push("✅ WhatsApp integration working correctly");
    recommendations.push(
      "📱 Users can now receive chore notifications via WhatsApp",
    );
    recommendations.push(
      "💬 Two-way communication enabled for quick responses",
    );
    recommendations.push("📧 Email fallback configured as backup");
  }

  return recommendations;
}

// Get test scenarios and guidance
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const twilioService = getTwilioWhatsAppService();
    const serviceInfo = twilioService.getServiceInfo();

    return NextResponse.json({
      service: serviceInfo,
      testTypes: {
        basic: {
          name: "Basic Test",
          description: "Simple message to verify connectivity",
          recommended: true,
        },
        help: {
          name: "Help Message Test",
          description: "Test help command template",
          recommended: false,
        },
        rich: {
          name: "Rich Content Test",
          description:
            "Test message with emojis, formatting, and multiple lines",
          recommended: true,
        },
        error: {
          name: "Error Handling Test",
          description: "Test error scenarios and fallback behavior",
          recommended: false,
        },
      },
      setup: {
        requirements: [
          "TWILIO_ACCOUNT_SID environment variable",
          "TWILIO_AUTH_TOKEN environment variable",
          "TWILIO_PHONE_NUMBER environment variable (WhatsApp Business number)",
          "Phone number in user profile (E.164 format)",
          "Twilio WhatsApp sandbox approval (for testing)",
        ],
        webhookUrl: `${process.env.NEXTAUTH_URL}/api/whatsapp/webhook`,
        testing: [
          "Start with basic test to verify connectivity",
          "Test with verified phone numbers first",
          "Check delivery status for successful messages",
          "Verify two-way communication with webhook responses",
          "Test error scenarios and fallback behavior",
        ],
      },
      troubleshooting: {
        commonIssues: [
          {
            issue: "Message fails to send",
            solutions: [
              "Verify Twilio credentials are correct",
              "Check phone number format (E.164)",
              "Ensure WhatsApp Business API is approved",
              "Verify account has sufficient credits",
            ],
          },
          {
            issue: "Messages not received",
            solutions: [
              "Check if recipient has WhatsApp installed",
              "Verify phone number is correct",
              "Check message delivery status",
              "Test with verified sandbox numbers first",
            ],
          },
          {
            issue: "Webhook not receiving messages",
            solutions: [
              "Verify webhook URL in Twilio console",
              "Check webhook signature validation",
              "Ensure webhook endpoint is publicly accessible",
              "Test with ngrok for local development",
            ],
          },
        ],
      },
    });
  } catch (error: any) {
    console.error("WhatsApp test info API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
