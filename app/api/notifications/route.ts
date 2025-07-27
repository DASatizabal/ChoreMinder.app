import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/libs/mongoose";
import Chore from "@/models/Chore";
import Family from "@/models/Family";
import User from "@/models/User";

// Mock notification storage - in production, use MongoDB or Redis
let notificationStore: any[] = [];

interface Notification {
  id: string;
  type:
    | "chore_assigned"
    | "chore_accepted"
    | "chore_declined"
    | "chore_in_progress"
    | "chore_completed"
    | "photo_submitted"
    | "photo_approved"
    | "photo_rejected"
    | "reminder"
    | "escalation"
    | "system";
  priority: "low" | "medium" | "high" | "urgent";
  title: string;
  message: string;
  choreId?: string;
  choreName?: string;
  fromUser?: {
    id: string;
    name: string;
    role: string;
  };
  toUser: {
    id: string;
    name: string;
    role: string;
  };
  familyId: string;
  timestamp: string;
  read: boolean;
  actionRequired: boolean;
  actions?: Array<{
    id: string;
    label: string;
    type: "primary" | "secondary" | "success" | "warning" | "error";
    endpoint: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    data?: any;
  }>;
  expiresAt?: string;
  metadata?: {
    choreStage?: string;
    points?: number;
    dueDate?: string;
    photoUrl?: string;
    reason?: string;
  };
}

// Notification templates
const getNotificationTemplate = (
  type: Notification["type"],
  metadata: any = {},
) => {
  const templates = {
    chore_assigned: {
      priority: "medium" as const,
      title: "New Chore Assigned! 📋",
      message: `You have a new chore: ${metadata.choreName || "Unknown"}. Worth ${metadata.points || 0} points!`,
      actionRequired: true,
      actions: [
        {
          id: "accept",
          label: "Accept",
          type: "success" as const,
          endpoint: `/api/chores/${metadata.choreId}/status`,
          method: "PUT" as const,
          data: { status: "in_progress" },
        },
        {
          id: "decline",
          label: "Can't Do Now",
          type: "warning" as const,
          endpoint: `/api/chores/${metadata.choreId}/decline`,
          method: "POST" as const,
        },
      ],
    },
    chore_accepted: {
      priority: "medium" as const,
      title: "Chore Accepted! 🚀",
      message: `${metadata.fromUserName || "Someone"} accepted the chore: ${metadata.choreName || "Unknown"}`,
      actionRequired: false,
    },
    chore_declined: {
      priority: "high" as const,
      title: "Chore Declined 💬",
      message: `${metadata.fromUserName || "Someone"} can't do ${metadata.choreName || "the chore"} right now.${metadata.reason ? ` Reason: ${metadata.reason}` : ""}`,
      actionRequired: true,
      actions: [
        {
          id: "reassign",
          label: "Reassign",
          type: "primary" as const,
          endpoint: `/api/chores/${metadata.choreId}/reassign`,
          method: "POST" as const,
        },
      ],
    },
    chore_in_progress: {
      priority: "low" as const,
      title: "Chore Started! 💪",
      message: `${metadata.fromUserName || "Someone"} started working on ${metadata.choreName || "a chore"}`,
      actionRequired: false,
    },
    chore_completed: {
      priority: "medium" as const,
      title: "Chore Completed! 🎉",
      message: `${metadata.fromUserName || "Someone"} completed ${metadata.choreName || "a chore"} and earned ${metadata.points || 0} points!`,
      actionRequired: false,
    },
    photo_submitted: {
      priority: "high" as const,
      title: "Photo Submitted for Review 📸",
      message: `${metadata.fromUserName || "Someone"} submitted a photo for ${metadata.choreName || "a chore"}. Please review!`,
      actionRequired: true,
      actions: [
        {
          id: "review",
          label: "Review Photo",
          type: "primary" as const,
          endpoint: `/api/chores/${metadata.choreId}/photos/review`,
          method: "GET" as const,
        },
      ],
    },
    photo_approved: {
      priority: "medium" as const,
      title: "Photo Approved! ⭐",
      message: `Great work! Your photo for ${metadata.choreName || "the chore"} was approved. You earned ${metadata.points || 0} points!`,
      actionRequired: false,
    },
    photo_rejected: {
      priority: "high" as const,
      title: "Photo Needs Improvement 📝",
      message: `Your photo for ${metadata.choreName || "the chore"} needs improvement.${metadata.reason ? ` ${metadata.reason}` : ""}`,
      actionRequired: true,
      actions: [
        {
          id: "resubmit",
          label: "Take New Photo",
          type: "warning" as const,
          endpoint: `/api/chores/${metadata.choreId}/photos/resubmit`,
          method: "GET" as const,
        },
      ],
    },
    reminder: {
      priority: "medium" as const,
      title: "Friendly Reminder 🔔",
      message: `Don't forget about ${metadata.choreName || "your chore"}!${metadata.timeLeft ? ` ${metadata.timeLeft} remaining.` : ""}`,
      actionRequired: false,
    },
    escalation: {
      priority: "urgent" as const,
      title: "Attention Required! ⚠️",
      message: `${metadata.choreName || "A chore"} is overdue. Please take action immediately.`,
      actionRequired: true,
      actions: [
        {
          id: "intervene",
          label: "Take Action",
          type: "error" as const,
          endpoint: `/api/chores/${metadata.choreId}/escalate`,
          method: "POST" as const,
        },
      ],
    },
    system: {
      priority: "low" as const,
      title: "System Notification ℹ️",
      message: metadata.message || "System notification",
      actionRequired: false,
    },
  };

  return templates[type] || templates.system;
};

// GET - Fetch notifications for a user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get("familyId");
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "20");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    if (!familyId || !userId) {
      return NextResponse.json(
        { error: "Missing familyId or userId" },
        { status: 400 },
      );
    }

    await dbConnect();

    // Verify user access to family
    const family = await Family.findById(familyId);
    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    const isMember = family.members.some(
      (member: any) => member.user.toString() === session.user.id,
    );

    if (!isMember && session.user.role !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Filter notifications for this user and family
    let userNotifications = notificationStore.filter(
      (notification) =>
        notification.toUser.id === userId &&
        notification.familyId === familyId &&
        (!notification.expiresAt ||
          new Date(notification.expiresAt) > new Date()),
    );

    if (unreadOnly) {
      userNotifications = userNotifications.filter((n) => !n.read);
    }

    // Sort by timestamp (newest first) and limit
    userNotifications = userNotifications
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, limit);

    return NextResponse.json({
      notifications: userNotifications,
      total: userNotifications.length,
      unreadCount: userNotifications.filter((n) => !n.read).length,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}

// POST - Create a new notification
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      type,
      choreId,
      familyId,
      fromUserId,
      toUserId,
      metadata = {},
    } = await req.json();

    if (!type || !familyId || !fromUserId || !toUserId) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: type, familyId, fromUserId, toUserId",
        },
        { status: 400 },
      );
    }

    await dbConnect();

    // Verify family access
    const family = await Family.findById(familyId);
    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    const isMember = family.members.some(
      (member: any) => member.user.toString() === session.user.id,
    );

    if (!isMember && session.user.role !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get user information
    const fromUser = await User.findById(fromUserId);
    const toUser = await User.findById(toUserId);

    if (!fromUser || !toUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get chore information if provided
    let chore = null;
    if (choreId) {
      chore = await Chore.findById(choreId);
      if (chore) {
        metadata.choreName = chore.title;
        metadata.points = chore.points;
        metadata.choreId = choreId;
      }
    }

    // Add user names to metadata
    metadata.fromUserName = fromUser.name;
    metadata.toUserName = toUser.name;

    // Get template for notification type
    const template = getNotificationTemplate(type, metadata);

    // Create notification
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      priority: template.priority,
      title: template.title,
      message: template.message,
      choreId,
      choreName: metadata.choreName,
      fromUser: {
        id: fromUserId,
        name: fromUser.name,
        role: fromUser.role,
      },
      toUser: {
        id: toUserId,
        name: toUser.name,
        role: toUser.role,
      },
      familyId,
      timestamp: new Date().toISOString(),
      read: false,
      actionRequired: template.actionRequired,
      actions: template.actions,
      metadata,
    };

    // Set expiration if defined in template
    if (template.autoExpire) {
      const expirationTime = new Date();
      expirationTime.setMinutes(
        expirationTime.getMinutes() + template.autoExpire,
      );
      notification.expiresAt = expirationTime.toISOString();
    }

    // Store notification (in production, save to database)
    notificationStore.push(notification);

    // Keep only last 1000 notifications to prevent memory issues
    if (notificationStore.length > 1000) {
      notificationStore = notificationStore.slice(-1000);
    }

    return NextResponse.json({
      notification,
      message: "Notification created successfully",
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 },
    );
  }
}

// PUT - Mark notifications as read
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notificationIds, markAllAsRead, familyId, userId } =
      await req.json();

    if (markAllAsRead) {
      // Mark all notifications as read for user
      notificationStore = notificationStore.map((notification) => {
        if (
          notification.toUser.id === userId &&
          notification.familyId === familyId
        ) {
          return { ...notification, read: true };
        }
        return notification;
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      notificationStore = notificationStore.map((notification) => {
        if (notificationIds.includes(notification.id)) {
          return { ...notification, read: true };
        }
        return notification;
      });
    }

    return NextResponse.json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 },
    );
  }
}
