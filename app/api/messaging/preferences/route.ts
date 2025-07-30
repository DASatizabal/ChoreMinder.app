import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { dbConnect } from "@/libs/mongoose";
import { authOptions } from "@/libs/next-auth";
import { CommunicationPreferences } from "@/libs/unified-messaging";
import User from "@/models/User";

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

    // Return user's communication preferences with defaults
    const defaultPreferences: CommunicationPreferences = {
      primaryChannel: "whatsapp",
      fallbackChannels: ["sms", "email"],
      quietHours: {
        enabled: false,
        start: "22:00",
        end: "08:00",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      },
      maxMessagesPerHour: 10,
      enabledNotifications: {
        choreAssigned: true,
        choreReminder: true,
        choreCompleted: true,
        choreApproved: true,
        choreRejected: true,
        weeklyDigest: true,
        familyUpdates: true,
      },
    };

    const preferences = {
      ...defaultPreferences,
      ...user.communicationPreferences,
    };

    return NextResponse.json({
      preferences,
      availableChannels: {
        whatsapp: !!user.phone,
        sms: !!user.phone,
        email: !!user.email,
      },
    });
  } catch (error: any) {
    console.error("Get preferences API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { preferences } = body;

    if (!preferences) {
      return NextResponse.json(
        { error: "Preferences object is required" },
        { status: 400 },
      );
    }

    // Validate preferences structure
    const validationResult = validatePreferences(preferences);
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: "Invalid preferences", details: validationResult.errors },
        { status: 400 },
      );
    }

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validate channel availability
    if (
      preferences.primaryChannel === "whatsapp" ||
      preferences.primaryChannel === "sms"
    ) {
      if (!user.phone) {
        return NextResponse.json(
          { error: "Phone number required for WhatsApp/SMS preferences" },
          { status: 400 },
        );
      }
    }

    // Update user preferences
    user.communicationPreferences = preferences;
    await user.save();

    console.log(`Updated communication preferences for user ${user.name}`);

    return NextResponse.json({
      success: true,
      message: "Preferences updated successfully",
      preferences: user.communicationPreferences,
    });
  } catch (error: any) {
    console.error("Update preferences API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

// Test notification endpoint
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { channel, message } = body;

    if (!channel || !message) {
      return NextResponse.json(
        { error: "Channel and message are required" },
        { status: 400 },
      );
    }

    const user = await User.findById(session.user.id).populate("family");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Send test message using unified messaging
    const { getUnifiedMessagingService } = await import(
      "@/libs/unified-messaging"
    );
    const messagingService = getUnifiedMessagingService();

    const testContext = {
      user: user.toObject(),
      chore: {
        _id: "test_chore",
        title: "Test Chore",
        description: "This is a test notification",
        points: 10,
        priority: "medium",
      },
      family: { name: "Test Family" },
    };

    const result = await messagingService.sendMessage({
      userId: user._id.toString(),
      type: "assigned",
      priority: "low",
      context: testContext,
      options: {
        forceChannel: channel,
        bypassQuietHours: true,
      },
    });

    return NextResponse.json({
      success: result.success,
      channel: result.channel,
      attempts: result.attempts,
      error: result.error,
      message: result.success
        ? `Test message sent successfully via ${result.channel}`
        : `Test message failed: ${result.error}`,
    });
  } catch (error: any) {
    console.error("Test notification API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

function validatePreferences(preferences: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate primary channel
  const validChannels = ["whatsapp", "sms", "email"];
  if (
    !preferences.primaryChannel ||
    !validChannels.includes(preferences.primaryChannel)
  ) {
    errors.push("Primary channel must be one of: whatsapp, sms, email");
  }

  // Validate fallback channels
  if (!Array.isArray(preferences.fallbackChannels)) {
    errors.push("Fallback channels must be an array");
  } else {
    const invalidChannels = preferences.fallbackChannels.filter(
      (channel: string) => !validChannels.includes(channel),
    );
    if (invalidChannels.length > 0) {
      errors.push(`Invalid fallback channels: ${invalidChannels.join(", ")}`);
    }
  }

  // Validate quiet hours
  if (preferences.quietHours) {
    if (typeof preferences.quietHours.enabled !== "boolean") {
      errors.push("Quiet hours enabled must be a boolean");
    }

    if (
      preferences.quietHours.start &&
      !/^\d{2}:\d{2}$/.test(preferences.quietHours.start)
    ) {
      errors.push("Quiet hours start time must be in HH:MM format");
    }

    if (
      preferences.quietHours.end &&
      !/^\d{2}:\d{2}$/.test(preferences.quietHours.end)
    ) {
      errors.push("Quiet hours end time must be in HH:MM format");
    }
  }

  // Validate max messages per hour
  if (preferences.maxMessagesPerHour !== undefined) {
    if (
      !Number.isInteger(preferences.maxMessagesPerHour) ||
      preferences.maxMessagesPerHour < 1
    ) {
      errors.push("Max messages per hour must be a positive integer");
    }
  }

  // Validate enabled notifications
  if (preferences.enabledNotifications) {
    const requiredNotifications = [
      "choreAssigned",
      "choreReminder",
      "choreCompleted",
      "choreApproved",
      "choreRejected",
      "weeklyDigest",
      "familyUpdates",
    ];

    for (const notification of requiredNotifications) {
      if (
        preferences.enabledNotifications[notification] !== undefined &&
        typeof preferences.enabledNotifications[notification] !== "boolean"
      ) {
        errors.push(`${notification} must be a boolean`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
