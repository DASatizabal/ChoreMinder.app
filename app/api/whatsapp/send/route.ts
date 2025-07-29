import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { dbConnect } from "@/libs/mongoose";
import { authOptions } from "@/libs/next-auth";
import { whatsAppMessenger } from "@/libs/whatsapp-templates";
import Chore from "@/models/Chore";
import Family from "@/models/Family";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { choreId, userId, type, reason, fallbackToEmail = true } = body;

    // Validate required fields
    if (!choreId || !userId || !type) {
      return NextResponse.json(
        { error: "Missing required fields: choreId, userId, type" },
        { status: 400 },
      );
    }

    // Validate notification type
    const validTypes = [
      "assigned",
      "reminder",
      "completed",
      "approved",
      "rejected",
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid notification type" },
        { status: 400 },
      );
    }

    // Get current user
    const currentUser = await User.findById(session.user.id).populate("family");
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get target user
    const targetUser = await User.findById(userId).populate("family");
    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 },
      );
    }

    // Check if users are in the same family
    if (
      currentUser.family?._id.toString() !== targetUser.family?._id.toString()
    ) {
      return NextResponse.json(
        { error: "Users must be in the same family" },
        { status: 403 },
      );
    }

    // Get chore with populated fields
    const chore = await Chore.findById(choreId)
      .populate("assignedTo", "name phone role")
      .populate("createdBy", "name phone role");

    if (!chore) {
      return NextResponse.json({ error: "Chore not found" }, { status: 404 });
    }

    // Get family information
    const family = await Family.findById(currentUser.family._id).populate(
      "members",
      "name phone role",
    );

    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    // Prepare message context
    const context = {
      user: targetUser,
      chore: {
        ...chore.toObject(),
        assignedTo: chore.assignedTo,
        createdBy: chore.createdBy,
      },
      family: family.toObject(),
      parentUser: type === "completed" ? currentUser : undefined,
    };

    // Send WhatsApp notification
    const result = await whatsAppMessenger.sendChoreNotification(
      context,
      type,
      { reason, fallbackToEmail },
    );

    if (result.success) {
      // Log successful notification
      console.log(
        `${type} notification sent via ${result.method} for chore ${choreId} to user ${userId}`,
      );

      // Optionally update chore with notification timestamp
      if (type === "assigned" || type === "reminder") {
        await Chore.findByIdAndUpdate(choreId, {
          $push: {
            notifications: {
              type,
              method: result.method,
              sentAt: new Date(),
              recipient: userId,
            },
          },
        });
      }

      return NextResponse.json({
        success: true,
        method: result.method,
        message: `Notification sent successfully via ${result.method}`,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          method: result.method,
          error: result.error,
          message: `Failed to send notification via ${result.method}`,
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("WhatsApp send API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

// Bulk send endpoint
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { notifications, fallbackToEmail = true } = body;

    // Validate notifications array
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return NextResponse.json(
        { error: "Notifications array is required" },
        { status: 400 },
      );
    }

    // Get current user
    const currentUser = await User.findById(session.user.id).populate("family");
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const results = [];

    for (const notification of notifications) {
      const { choreId, userId, type, reason } = notification;

      try {
        // Get target user
        const targetUser = await User.findById(userId).populate("family");
        if (!targetUser) {
          results.push({
            choreId,
            userId,
            success: false,
            error: "Target user not found",
          });
          continue;
        }

        // Check family membership
        if (
          currentUser.family?._id.toString() !==
          targetUser.family?._id.toString()
        ) {
          results.push({
            choreId,
            userId,
            success: false,
            error: "Users must be in the same family",
          });
          continue;
        }

        // Get chore
        const chore = await Chore.findById(choreId)
          .populate("assignedTo", "name phone role")
          .populate("createdBy", "name phone role");

        if (!chore) {
          results.push({
            choreId,
            userId,
            success: false,
            error: "Chore not found",
          });
          continue;
        }

        // Get family
        const family = await Family.findById(currentUser.family._id).populate(
          "members",
          "name phone role",
        );

        const context = {
          user: targetUser,
          chore: {
            ...chore.toObject(),
            assignedTo: chore.assignedTo,
            createdBy: chore.createdBy,
          },
          family: family.toObject(),
          parentUser: type === "completed" ? currentUser : undefined,
        };

        // Send notification
        const result = await whatsAppMessenger.sendChoreNotification(
          context,
          type,
          { reason, fallbackToEmail },
        );

        results.push({
          choreId,
          userId,
          success: result.success,
          method: result.method,
          error: result.error,
        });

        // Log notification if successful
        if (result.success && (type === "assigned" || type === "reminder")) {
          await Chore.findByIdAndUpdate(choreId, {
            $push: {
              notifications: {
                type,
                method: result.method,
                sentAt: new Date(),
                recipient: userId,
              },
            },
          });
        }
      } catch (error: any) {
        results.push({
          choreId,
          userId,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      success: failureCount === 0,
      total: results.length,
      successCount,
      failureCount,
      results,
    });
  } catch (error: any) {
    console.error("WhatsApp bulk send API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
