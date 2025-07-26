import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";

// Simple in-memory storage for demo purposes
// In production, this would be stored in the database
let helpRequests: any[] = [];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { choreId, message, type } = await request.json();

    if (!choreId || !message) {
      return NextResponse.json(
        { error: "Chore ID and message are required" },
        { status: 400 }
      );
    }

    // Create help request object
    const helpRequest = {
      _id: `help_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      choreId,
      userId: session.user.id,
      message,
      type: type || "question",
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    // Store in memory (in production, save to database)
    helpRequests.push(helpRequest);

    return NextResponse.json({
      success: true,
      request: helpRequest,
    });
  } catch (error) {
    console.error("Error creating help request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const choreId = searchParams.get("choreId");
    const userId = searchParams.get("userId") || session.user.id;

    // Filter help requests
    let filteredRequests = helpRequests.filter(req => req.userId === userId);
    
    if (choreId) {
      filteredRequests = filteredRequests.filter(req => req.choreId === choreId);
    }

    // Sort by creation date (newest first)
    filteredRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      requests: filteredRequests,
    });
  } catch (error) {
    console.error("Error fetching help requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}