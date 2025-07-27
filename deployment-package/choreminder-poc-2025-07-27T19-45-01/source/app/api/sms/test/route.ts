import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbConnect } from "@/libs/mongoose";
import { getTwilioSMSService } from "@/libs/twilio-sms";
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

    const smsService = getTwilioSMSService();

    // Check if service is configured
    if (!smsService.isConfigured()) {
      return NextResponse.json(
        {
          error: "SMS service not configured",
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
          testMessage = `ChoreMinder SMS Test

Hi ${user.name}! This is a test SMS to verify messaging is working.

Reply HELP for commands.

Time: ${new Date().toLocaleString()}`;
          break;

        case "chore":
          testMessage = `ChoreMinder: New chore "Test Chore" assigned. 10 points. Due: ${new Date().toLocaleDateString()}. Reply DONE when complete.`;
          break;

        case "reminder":
          testMessage = `ChoreMinder: Reminder - "Test Chore" is pending. 10 points available. Reply DONE to complete.`;
          break;

        case "short":
          testMessage = `ChoreMinder: Test message ${new Date().getTime()}`;
          break;

        case "validation":
          // Test phone number validation
          const validation = await smsService.validatePhoneNumber(targetPhone);
          return NextResponse.json({
            test: { type: testType, targetPhone },
            validation,
            service: smsService.getServiceInfo(),
          });

        default:
          return NextResponse.json(
            { error: "Invalid test type" },
            { status: 400 },
          );
      }

      // Send test message
      console.log(`Sending SMS test message to ${targetPhone}`);

      const response = await smsService.sendMessage({
        to: targetPhone,
        body: testMessage,
      });

      if (response.status === "failed") {
        testResult = {
          success: false,
          error: response.errorMessage,
          errorCode: response.errorCode,
          details: "SMS message failed to send",
        };
      } else {
        testResult = {
          success: true,
          messageSid: response.sid,
          status: response.status,
          details: "SMS message sent successfully",
          segments: smsService.estimateSMSSegments(testMessage),
        };

        // Wait a moment and check delivery status
        setTimeout(async () => {
          try {
            const deliveryStatus = await smsService.getMessageStatus(
              response.sid,
            );
            console.log(`Test SMS delivery status: ${deliveryStatus.status}`);
          } catch (error) {
            console.log("Could not check SMS delivery status:", error);
          }
        }, 5000);
      }
    } catch (error: any) {
      console.error("SMS test send error:", error);
      testResult = {
        success: false,
        error: error.message,
        details: "Exception occurred while sending test SMS",
      };
    }

    // Return comprehensive test results
    return NextResponse.json({
      test: {
        type: testType,
        timestamp: new Date().toISOString(),
        targetPhone,
        messageLength: testMessage.length,
        user: {
          id: user._id,
          name: user.name,
          role: user.role,
          family: user.family?.name,
        },
      },
      service: smsService.getServiceInfo(),
      result: testResult,
      recommendations: generateTestRecommendations(testResult),
    });
  } catch (error: any) {
    console.error("SMS test API error:", error);
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
    recommendations.push("❌ SMS test failed - check Twilio configuration");

    if (testResult.errorCode) {
      switch (testResult.errorCode) {
        case "21211":
          recommendations.push(
            "📱 Invalid phone number format - ensure E.164 format (+1234567890)",
          );
          break;
        case "21408":
          recommendations.push(
            "⚠️ Permission denied - check Twilio account permissions",
          );
          break;
        case "21610":
          recommendations.push(
            "🔧 Twilio account issue - verify account status and credits",
          );
          break;
        case "30007":
          recommendations.push(
            "📵 Message filtered - recipient may have blocked SMS",
          );
          break;
        default:
          recommendations.push(
            `🔍 Error code ${testResult.errorCode} - check Twilio documentation`,
          );
      }
    }

    recommendations.push("🔄 Try testing with a different phone number");
    recommendations.push(
      "📧 Email fallback will be used for critical notifications",
    );
  } else {
    recommendations.push("✅ SMS integration working correctly");
    recommendations.push(
      "📱 Users can now receive chore notifications via SMS",
    );
    recommendations.push("💬 Two-way SMS communication enabled");

    if (testResult.segments > 1) {
      recommendations.push(
        `📊 Message uses ${testResult.segments} SMS segments - consider shortening for cost efficiency`,
      );
    }

    recommendations.push("🔄 Test WhatsApp integration for richer messaging");
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

    const smsService = getTwilioSMSService();
    const serviceInfo = smsService.getServiceInfo();

    return NextResponse.json({
      service: serviceInfo,
      testTypes: {
        basic: {
          name: "Basic SMS Test",
          description: "Simple SMS to verify connectivity",
          recommended: true,
        },
        chore: {
          name: "Chore Assignment Test",
          description: "Test chore assignment notification format",
          recommended: true,
        },
        reminder: {
          name: "Reminder Test",
          description: "Test chore reminder notification format",
          recommended: false,
        },
        short: {
          name: "Short Message Test",
          description: "Test minimal SMS format",
          recommended: false,
        },
        validation: {
          name: "Phone Validation Test",
          description: "Validate phone number without sending SMS",
          recommended: true,
        },
      },
      setup: {
        requirements: [
          "TWILIO_ACCOUNT_SID environment variable",
          "TWILIO_AUTH_TOKEN environment variable",
          "TWILIO_PHONE_NUMBER environment variable (SMS-capable number)",
          "Phone number in user profile (E.164 format)",
          "Sufficient Twilio account credits",
        ],
        webhookUrl: `${process.env.NEXTAUTH_URL}/api/sms/webhook`,
        costs: {
          outbound: "$0.0075 per SMS segment (US)",
          inbound: "$0.0075 per SMS (US)",
          segments: "160 characters per segment (GSM), 70 for Unicode",
        },
        testing: [
          "Start with phone validation to check number format",
          "Test with short messages first to minimize costs",
          "Verify webhook URL is configured in Twilio console",
          "Test two-way communication with reply commands",
          "Monitor delivery status for successful messages",
        ],
      },
      limits: {
        messageLength: {
          gsm: "160 characters per segment",
          unicode: "70 characters per segment",
          maxSegments: "10 (recommended limit)",
        },
        rateLimits: {
          perSecond: "1 message per second (default)",
          perDay: "Varies by account type and verification status",
        },
        compliance: [
          "Include opt-out instructions (STOP)",
          "Respect quiet hours (10 PM - 8 AM local time)",
          "Obtain proper consent before sending",
          "Follow carrier guidelines and regulations",
        ],
      },
      troubleshooting: {
        commonIssues: [
          {
            issue: "SMS not delivered",
            solutions: [
              "Check phone number format (must include country code)",
              "Verify recipient can receive SMS",
              "Check Twilio account status and credits",
              "Review carrier filtering and delivery reports",
            ],
          },
          {
            issue: "High costs",
            solutions: [
              "Keep messages under 160 characters",
              "Avoid special characters that trigger Unicode",
              "Use abbreviations and concise language",
              "Consider WhatsApp for longer messages",
            ],
          },
          {
            issue: "Webhook not receiving replies",
            solutions: [
              "Verify webhook URL in Twilio console",
              "Check webhook endpoint is publicly accessible",
              "Ensure proper signature validation",
              "Test with ngrok for local development",
            ],
          },
        ],
      },
    });
  } catch (error: any) {
    console.error("SMS test info API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
