import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/libs/next-auth";
import dbConnect from "@/libs/mongoose";
import User from "@/models/User";

// GET /api/notifications/preferences - Get notification preferences
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

    // Return default notification preferences
    const defaultPreferences = {
      choreAssigned: true,
      choreReminder: true,
      choreCompleted: true,
      choreApproved: true,
      choreRejected: true,
      weeklyDigest: true,
      familyUpdates: true,
    };

    const preferences = user.communicationPreferences?.enabledNotifications || defaultPreferences;

    return NextResponse.json({
      preferences,
      familyId: null, // Simplified - no family-specific preferences
    });
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 },
    );
  }
}

// PUT /api/notifications/preferences - Update notification preferences
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { preferences } = await req.json();

    await dbConnect();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update user's notification preferences
    if (!user.communicationPreferences) {
      user.communicationPreferences = {
        primaryChannel: "email",
        fallbackChannels: ["sms"],
        enabledNotifications: preferences,
      };
    } else {
      user.communicationPreferences.enabledNotifications = {
        ...user.communicationPreferences.enabledNotifications,
        ...preferences,
      };
    }

    await user.save();

    return NextResponse.json({
      message: "Preferences updated successfully",
      preferences: user.communicationPreferences.enabledNotifications,
    });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 },
    );
  }
}