import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import dbConnect from "@/libs/mongoose";
import { authOptions } from "@/libs/next-auth";
import User from "@/models/User";

// GET /api/messaging/preferences - Get user messaging preferences
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

    // Return default preferences if none exist
    const preferences = user.communicationPreferences || {
      primaryChannel: "email",
      fallbackChannels: ["sms"],
      quietHours: {
        enabled: false,
        start: "22:00",
        end: "08:00",
        timezone: "UTC",
      },
      maxMessagesPerHour: 5,
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

    return NextResponse.json({
      preferences,
      phone: user.phone,
      email: user.email,
    });
  } catch (error) {
    console.error("Error fetching messaging preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 },
    );
  }
}

// PUT /api/messaging/preferences - Update user messaging preferences
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = await req.json();

    await dbConnect();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update preferences
    user.communicationPreferences = {
      ...user.communicationPreferences,
      ...preferences,
    };

    await user.save();

    return NextResponse.json({
      message: "Preferences updated successfully",
      preferences: user.communicationPreferences,
    });
  } catch (error) {
    console.error("Error updating messaging preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 },
    );
  }
}

// POST /api/messaging/preferences - Test messaging with current preferences
export async function POST(req: NextRequest) {
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

    // Return success without actually sending test message
    return NextResponse.json({
      success: true,
      message: "Test message functionality not implemented yet",
    });
  } catch (error) {
    console.error("Error testing messaging:", error);
    return NextResponse.json(
      { error: "Failed to test messaging" },
      { status: 500 },
    );
  }
}
