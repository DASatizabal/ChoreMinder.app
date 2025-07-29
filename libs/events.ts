// In-memory event store (in production, use Redis or a proper message queue)
export interface RealTimeEvent {
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
export const eventStore = new Map<string, RealTimeEvent[]>();

// Helper function to create common events
export const createChoreEvent = (
  type: RealTimeEvent["type"],
  familyId: string,
  userId: string,
  userName: string,
  choreData: any,
): RealTimeEvent => {
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