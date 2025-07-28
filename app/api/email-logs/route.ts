import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/libs/next-auth";

// Store email logs in memory for development (in production, use database)
const emailLogs: Array<{
  id: string;
  timestamp: string;
  type: string;
  to: string;
  subject: string;
  details: any;
  success: boolean;
}> = [];

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

    let filteredLogs = emailLogs;
    
    if (type) {
      filteredLogs = emailLogs.filter(log => log.type === type);
    }

    // Sort by timestamp (newest first) and limit
    const sortedLogs = filteredLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return NextResponse.json({
      logs: sortedLogs,
      total: filteredLogs.length,
      stats: {
        totalEmails: emailLogs.length,
        invitations: emailLogs.filter(log => log.type === "invitation").length,
        notifications: emailLogs.filter(log => log.type === "notification").length,
        successful: emailLogs.filter(log => log.success).length,
        failed: emailLogs.filter(log => !log.success).length,
      }
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

    const logEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type,
      to,
      subject,
      details,
      success,
    };

    emailLogs.push(logEntry);

    // Keep only last 1000 logs to prevent memory issues
    if (emailLogs.length > 1000) {
      emailLogs.splice(0, emailLogs.length - 1000);
    }

    console.log(`📧 [EMAIL LOG STORED] ${type.toUpperCase()}:`, logEntry);

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

    const clearedCount = emailLogs.length;
    emailLogs.length = 0; // Clear the array

    console.log(`📧 [EMAIL LOGS CLEARED] Removed ${clearedCount} log entries`);

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

// Export the email logs array for other modules to use
export { emailLogs };