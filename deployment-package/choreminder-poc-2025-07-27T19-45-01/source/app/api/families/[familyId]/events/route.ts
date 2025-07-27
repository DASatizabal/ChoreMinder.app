import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/libs/mongoose";
import Family from "@/models/Family";

// In-memory event store (in production, use Redis or a proper message queue)
interface RealTimeEvent {
  id: string;
  type:
    | "chore_assigned"
    | "chore_completed"
    | "chore_approved"
    | "chore_rejected"
    | "member_joined"
    | "points_awarded"
    | "badge_earned";
  familyId: string;
  userId: string;
  userName: string;
  data: any;
  timestamp: string;
}

// Simple in-memory store (replace with Redis in production)
const eventStore = new Map<string, RealTimeEvent[]>();

export async function GET(
  req: NextRequest,
  { params }: { params: { familyId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { familyId } = params;
    const url = new URL(req.url);
    const since = url.searchParams.get("since");

    await dbConnect();

    // Verify user is member of family
    const family = await Family.findById(familyId);
    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    const userMember = family.members.find(
      (member: any) => member.user.toString() === session.user.id,
    );

    if (!userMember) {
      return NextResponse.json(
        { error: "Not a family member" },
        { status: 403 },
      );
    }

    // Get events for this family
    const familyEvents = eventStore.get(familyId) || [];

    let filteredEvents = familyEvents;

    // Filter events since the provided ID
    if (since) {
      const sinceIndex = familyEvents.findIndex((event) => event.id === since);
      if (sinceIndex !== -1) {
        filteredEvents = familyEvents.slice(sinceIndex + 1);
      }
    }

    // Return last 20 events if no filter
    if (!since) {
      filteredEvents = familyEvents.slice(-20);
    }

    return NextResponse.json({
      events: filteredEvents,
      total: familyEvents.length,
      familyId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { familyId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { familyId } = params;
    const eventData = await req.json();

    await dbConnect();

    // Verify user is member of family
    const family = await Family.findById(familyId);
    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    const userMember = family.members.find(
      (member: any) => member.user.toString() === session.user.id,
    );

    if (!userMember) {
      return NextResponse.json(
        { error: "Not a family member" },
        { status: 403 },
      );
    }

    // Create new event
    const newEvent: RealTimeEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: eventData.type,
      familyId,
      userId: session.user.id,
      userName: session.user.name || "Family Member",
      data: eventData.data || {},
      timestamp: new Date().toISOString(),
    };

    // Store event
    const familyEvents = eventStore.get(familyId) || [];
    familyEvents.push(newEvent);

    // Keep only last 100 events per family
    if (familyEvents.length > 100) {
      familyEvents.splice(0, familyEvents.length - 100);
    }

    eventStore.set(familyId, familyEvents);

    // In production, you'd also broadcast this to WebSocket connections
    // broadcastToFamily(familyId, newEvent);

    return NextResponse.json({
      event: newEvent,
      success: true,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 },
    );
  }
}

// Helper function to create common events
export const createChoreEvent = (
  type: RealTimeEvent["type"],
  familyId: string,
  userId: string,
  userName: string,
  choreData: any,
) => {
  const event: RealTimeEvent = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    familyId,
    userId,
    userName,
    data: choreData,
    timestamp: new Date().toISOString(),
  };

  const familyEvents = eventStore.get(familyId) || [];
  familyEvents.push(event);

  if (familyEvents.length > 100) {
    familyEvents.splice(0, familyEvents.length - 100);
  }

  eventStore.set(familyId, familyEvents);

  return event;
};
