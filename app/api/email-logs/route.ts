import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/libs/next-auth";
import { getEmailLogs, getEmailStats, addEmailLog, clearEmailLogs } from "@/libs/email-storage";

// GET /api/email-logs - Get all email logs
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // In a real app, check if user is admin
    // For now, anyone can view logs in development
    
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const type = searchParams.get("type");

    const logs = getEmailLogs(limit, type);
    const stats = getEmailStats();

    return NextResponse.json({
      logs,
      total: logs.length,
      stats,
    });
  } catch (error) {
    console.error("Error fetching email logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch email logs" },
      { status: 500 }
    );
  }
}

// POST /api/email-logs - Add email log entry
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, to, subject, details, success = true } = await req.json();

    const logEntry = addEmailLog({
      type,
      to,
      subject,
      details,
      success,
    });

    return NextResponse.json({ 
      message: "Email log stored successfully",
      logId: logEntry.id 
    });
  } catch (error) {
    console.error("Error storing email log:", error);
    return NextResponse.json(
      { error: "Failed to store email log" },
      { status: 500 }
    );
  }
}

// DELETE /api/email-logs - Clear all email logs
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clearedCount = clearEmailLogs();

    return NextResponse.json({ 
      message: `Cleared ${clearedCount} email log entries` 
    });
  } catch (error) {
    console.error("Error clearing email logs:", error);
    return NextResponse.json(
      { error: "Failed to clear email logs" },
      { status: 500 }
    );
  }
}

// Email logs are now managed by the shared storage module