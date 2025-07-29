import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { getMessageScheduler } from "@/libs/message-scheduler";
import { dbConnect } from "@/libs/mongoose";
import { authOptions } from "@/libs/next-auth";
import {
  getUnifiedMessagingService,
  MessageRequest,
} from "@/libs/unified-messaging";
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
    const {
      userId,
      choreId,
      type,
      priority = "medium",
      reason,
      scheduleAt,
      forceChannel,
      bypassQuietHours = false,
    } = body;

    // Validate required fields
    if (!userId || !type) {
      return NextResponse.json(
        { error: "Missing required fields: userId, type" },
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
      "digest",
      "update",
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

    // Check if users are in the same family (except for admin users)
    if (
      currentUser.role !== "admin" &&
      currentUser.family?._id.toString() !== targetUser.family?._id.toString()
    ) {
      return NextResponse.json(
        { error: "Users must be in the same family" },
        { status: 403 },
      );
    }

    // Get chore if choreId provided
    let chore = null;
    if (choreId) {
      chore = await Chore.findById(choreId)
        .populate("assignedTo", "name phone email role")
        .populate("createdBy", "name phone email role");

      if (!chore) {
        return NextResponse.json({ error: "Chore not found" }, { status: 404 });
      }
    }

    // Get family information
    const family = await Family.findById(targetUser.family._id).populate(
      "members",
      "name phone email role",
    );

    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    // Prepare message context
    const context = {
      user: targetUser.toObject(),
      chore: chore
        ? {
            ...chore.toObject(),
            assignedTo: chore.assignedTo,
            createdBy: chore.createdBy,
          }
        : {
            _id: "general",
            title: "Family Update",
            description: "General family notification",
            points: 0,
            priority: "medium",
          },
      family: family.toObject(),
      parentUser: type === "completed" ? currentUser : undefined,
    };

    // Create message request
    const messageRequest: MessageRequest = {
      userId: targetUser._id.toString(),
      type,
      priority,
      context,
      options: {
        reason,
        forceChannel,
        bypassQuietHours,
        scheduleAt: scheduleAt ? new Date(scheduleAt) : undefined,
      },
    };

    const messagingService = getUnifiedMessagingService();

    // Handle scheduled vs immediate sending
    if (scheduleAt && new Date(scheduleAt) > new Date()) {
      const scheduler = getMessageScheduler();
      const scheduledId = await scheduler.scheduleMessage(
        messageRequest,
        new Date(scheduleAt),
      );

      return NextResponse.json({
        success: true,
        scheduled: true,
        scheduledId,
        scheduleAt: new Date(scheduleAt).toISOString(),
        message: "Message scheduled successfully",
      });
    } else {
      // Send immediately
      const result = await messagingService.sendMessage(messageRequest);

      // Log notification in chore if applicable
      if (chore && (type === "assigned" || type === "reminder")) {
        await Chore.findByIdAndUpdate(choreId, {
          $push: {
            notifications: {
              type,
              method: result.channel,
              sentAt: new Date(),
              recipient: userId,
              success: result.success,
              messageSid: result.messageSid,
            },
          },
        });
      }

      return NextResponse.json({
        success: result.success,
        scheduled: false,
        channel: result.channel,
        messageSid: result.messageSid,
        attempts: result.attempts,
        error: result.error,
        message: result.success
          ? `Message sent successfully via ${result.channel}`
          : `Message failed: ${result.error}`,
      });
    }
  } catch (error: any) {
    console.error("Unified messaging send API error:", error);
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
    const { notifications, scheduleAt } = body;

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

    const messagingService = getUnifiedMessagingService();
    const scheduler = getMessageScheduler();
    const results = [];

    for (const notification of notifications) {
      const {
        userId,
        choreId,
        type,
        priority = "medium",
        reason,
        forceChannel,
      } = notification;

      try {
        // Get target user and validate
        const targetUser = await User.findById(userId).populate("family");
        if (!targetUser) {
          results.push({
            userId,
            choreId,
            success: false,
            error: "Target user not found",
          });
          continue;
        }

        // Check family membership (except for admin)
        if (
          currentUser.role !== "admin" &&
          currentUser.family?._id.toString() !==
            targetUser.family?._id.toString()
        ) {
          results.push({
            userId,
            choreId,
            success: false,
            error: "Users must be in the same family",
          });
          continue;
        }

        // Get chore if provided
        let chore = null;
        if (choreId) {
          chore = await Chore.findById(choreId)
            .populate("assignedTo", "name phone email role")
            .populate("createdBy", "name phone email role");
        }

        // Get family
        const family = await Family.findById(targetUser.family._id).populate(
          "members",
          "name phone email role",
        );

        const context = {
          user: targetUser.toObject(),
          chore: chore
            ? {
                ...chore.toObject(),
                assignedTo: chore.assignedTo,
                createdBy: chore.createdBy,
              }
            : {
                _id: "bulk",
                title: "Bulk Notification",
                description: "Bulk family notification",
                points: 0,
                priority: "medium",
              },
          family: family.toObject(),
          parentUser: type === "completed" ? currentUser : undefined,
        };

        const messageRequest: MessageRequest = {
          userId: targetUser._id.toString(),
          type,
          priority,
          context,
          options: {
            reason,
            forceChannel,
            scheduleAt: scheduleAt ? new Date(scheduleAt) : undefined,
          },
        };

        // Handle scheduling vs immediate sending
        if (scheduleAt && new Date(scheduleAt) > new Date()) {
          const scheduledId = await scheduler.scheduleMessage(
            messageRequest,
            new Date(scheduleAt),
          );

          results.push({
            userId,
            choreId,
            success: true,
            scheduled: true,
            scheduledId,
          });
        } else {
          const result = await messagingService.sendMessage(messageRequest);

          results.push({
            userId,
            choreId,
            success: result.success,
            scheduled: false,
            channel: result.channel,
            messageSid: result.messageSid,
            error: result.error,
          });

          // Log notification if successful and applicable
          if (
            result.success &&
            chore &&
            (type === "assigned" || type === "reminder")
          ) {
            await Chore.findByIdAndUpdate(choreId, {
              $push: {
                notifications: {
                  type,
                  method: result.channel,
                  sentAt: new Date(),
                  recipient: userId,
                  success: result.success,
                  messageSid: result.messageSid,
                },
              },
            });
          }
        }
      } catch (error: any) {
        results.push({
          userId,
          choreId,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;
    const scheduledCount = results.filter((r) => r.scheduled).length;

    return NextResponse.json({
      success: failureCount === 0,
      total: results.length,
      successCount,
      failureCount,
      scheduledCount,
      results,
    });
  } catch (error: any) {
    console.error("Bulk messaging API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
