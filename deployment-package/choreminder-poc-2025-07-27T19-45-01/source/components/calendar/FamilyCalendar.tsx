"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    choreId: string;
    assignedTo: string;
    assigneeName: string;
    category: string;
    points: number;
    status: string;
    priority: string;
    estimatedDuration: number;
    description?: string;
  };
}

interface ChoreConflict {
  date: Date;
  conflicts: Array<{
    choreId: string;
    title: string;
    assignedTo: string;
    estimatedDuration: number;
  }>;
  totalDuration: number;
  recommendation: string;
}

export default function FamilyCalendar() {
  const { data: session } = useSession();
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [conflicts, setConflicts] = useState<ChoreConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dayGridMonth");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showConflicts, setShowConflicts] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [filterBy, setFilterBy] = useState<string>("all");

  useEffect(() => {
    if (session?.user?.id) {
      fetchCalendarData();
      fetchFamilyMembers();
    }
  }, [session]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 60);

      const response = await fetch(
        `/api/calendar/family?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
      );

      if (response.ok) {
        const data = await response.json();
        setEvents(transformChoresToEvents(data.chores));
        setConflicts(data.conflicts || []);
      }
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFamilyMembers = async () => {
    try {
      const response = await fetch("/api/families/members");
      if (response.ok) {
        const data = await response.json();
        setFamilyMembers(data.members || []);
      }
    } catch (error) {
      console.error("Error fetching family members:", error);
    }
  };

  const transformChoresToEvents = (chores: any[]): CalendarEvent[] => {
    return chores
      .filter(chore => {
        if (filterBy === "all") return true;
        return chore.assignedTo._id === filterBy;
      })
      .map((chore) => {
        const color = getChoreColor(chore.category, chore.priority);
        
        return {
          id: chore._id,
          title: `${chore.title} (${chore.assignedTo.name})`,
          start: new Date(chore.dueDate),
          end: chore.estimatedDuration 
            ? new Date(new Date(chore.dueDate).getTime() + chore.estimatedDuration * 60000)
            : undefined,
          allDay: false,
          backgroundColor: color.bg,
          borderColor: color.border,
          textColor: color.text,
          extendedProps: {
            choreId: chore._id,
            assignedTo: chore.assignedTo._id,
            assigneeName: chore.assignedTo.name,
            category: chore.category,
            points: chore.points,
            status: chore.status,
            priority: chore.priority,
            estimatedDuration: chore.estimatedDuration || 30,
            description: chore.description,
          },
        };
      });
  };

  const getChoreColor = (category: string, priority: string) => {
    const colors = {
      cleaning: { bg: "#3B82F6", border: "#2563EB", text: "#FFFFFF" },
      organizing: { bg: "#10B981", border: "#059669", text: "#FFFFFF" },
      maintenance: { bg: "#F59E0B", border: "#D97706", text: "#FFFFFF" },
      outdoor: { bg: "#8B5CF6", border: "#7C3AED", text: "#FFFFFF" },
      cooking: { bg: "#EF4444", border: "#DC2626", text: "#FFFFFF" },
      default: { bg: "#6B7280", border: "#4B5563", text: "#FFFFFF" },
    };

    let baseColor = colors[category] || colors.default;

    // Adjust opacity based on priority
    if (priority === "urgent") {
      baseColor = { ...baseColor, bg: baseColor.bg + "FF" }; // Full opacity
    } else if (priority === "high") {
      baseColor = { ...baseColor, bg: baseColor.bg + "DD" }; // Slightly transparent
    } else if (priority === "medium") {
      baseColor = { ...baseColor, bg: baseColor.bg + "BB" }; // More transparent
    } else {
      baseColor = { ...baseColor, bg: baseColor.bg + "99" }; // Most transparent
    }

    return baseColor;
  };

  const handleDateClick = (info: any) => {
    setSelectedDate(info.date);
    const dayEvents = events.filter(event => 
      event.start.toDateString() === info.date.toDateString()
    );
    
    if (dayEvents.length > 0) {
      // Show day details modal or sidebar
      console.log("Day events:", dayEvents);
    }
  };

  const handleEventClick = (info: any) => {
    const event = info.event;
    const props = event.extendedProps;
    
    // Show chore details modal
    console.log("Chore details:", {
      id: event.id,
      title: event.title,
      ...props,
    });
  };

  const handleEventDrop = async (info: any) => {
    try {
      const choreId = info.event.id;
      const newDate = info.event.start;

      const response = await fetch(`/api/chores/${choreId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: newDate }),
      });

      if (!response.ok) {
        info.revert(); // Revert the drag if API call fails
        alert("Failed to update chore date");
      }
    } catch (error) {
      console.error("Error updating chore date:", error);
      info.revert();
    }
  };

  const handleDateSelect = (info: any) => {
    // Handle date range selection for creating new chores
    const start = info.start;
    const end = info.end;
    
    console.log("Date range selected:", { start, end });
    // Open create chore modal with pre-filled dates
  };

  const createChore = async (choreData: any) => {
    try {
      const response = await fetch("/api/chores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(choreData),
      });

      if (response.ok) {
        await fetchCalendarData(); // Refresh calendar
      }
    } catch (error) {
      console.error("Error creating chore:", error);
    }
  };

  const optimizeSchedule = async (date: Date) => {
    try {
      const response = await fetch("/api/calendar/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: date.toISOString() }),
      });

      if (response.ok) {
        const optimization = await response.json();
        console.log("Schedule optimization:", optimization);
        // Show optimization suggestions
      }
    } catch (error) {
      console.error("Error optimizing schedule:", error);
    }
  };

  const exportCalendar = (format: "ics" | "pdf") => {
    const params = new URLSearchParams({
      format,
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    });

    window.open(`/api/calendar/export?${params.toString()}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-base-content mb-2">
            📅 Family Calendar
          </h1>
          <p className="text-base-content/70">
            Plan, track, and optimize your family's chore schedule
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* View Selector */}
          <select 
            className="select select-bordered select-sm"
            value={view}
            onChange={(e) => {
              setView(e.target.value);
              calendarRef.current?.getApi().changeView(e.target.value);
            }}
          >
            <option value="dayGridMonth">Month View</option>
            <option value="timeGridWeek">Week View</option>
            <option value="timeGridDay">Day View</option>
          </select>

          {/* Member Filter */}
          <select 
            className="select select-bordered select-sm"
            value={filterBy}
            onChange={(e) => {
              setFilterBy(e.target.value);
              fetchCalendarData();
            }}
          >
            <option value="all">All Members</option>
            {familyMembers.map(member => (
              <option key={member._id} value={member._id}>
                {member.name}
              </option>
            ))}
          </select>

          {/* Conflicts Toggle */}
          <button 
            className={`btn btn-sm ${showConflicts ? "btn-warning" : "btn-outline"}`}
            onClick={() => setShowConflicts(!showConflicts)}
          >
            {showConflicts ? "Hide" : "Show"} Conflicts ({conflicts.length})
          </button>

          {/* Export Options */}
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-sm btn-outline">
              📤 Export
            </label>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-40">
              <li><button onClick={() => exportCalendar("ics")}>iCal (.ics)</button></li>
              <li><button onClick={() => exportCalendar("pdf")}>PDF Report</button></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Conflicts Alert */}
      {showConflicts && conflicts.length > 0 && (
        <div className="alert alert-warning mb-4">
          <div className="flex items-start gap-3">
            <span>⚠️</span>
            <div>
              <h3 className="font-bold">Schedule Conflicts Detected</h3>
              <p className="text-sm">
                {conflicts.length} day(s) have potential scheduling conflicts. 
                Click on conflicted dates for optimization suggestions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Component */}
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body p-4">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={view}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={events}
            editable={true}
            selectable={true}
            selectMirror={true}
            droppable={true}
            weekends={true}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            select={handleDateSelect}
            height="auto"
            eventTimeFormat={{
              hour: "numeric",
              minute: "2-digit",
              meridiem: "short",
            }}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            nowIndicator={true}
            dayMaxEvents={3}
            moreLinkText="more chores"
            eventClassNames={(info) => {
              const props = info.event.extendedProps;
              const classes = ["cursor-pointer", "hover:opacity-80"];
              
              if (props.status === "completed") {
                classes.push("opacity-60", "line-through");
              }
              
              if (props.priority === "urgent") {
                classes.push("ring-2", "ring-red-500");
              }
              
              return classes;
            }}
            dayCellClassNames={(info) => {
              const dateStr = info.date.toDateString();
              const hasConflicts = conflicts.some(conflict => 
                conflict.date.toDateString() === dateStr
              );
              
              return hasConflicts ? ["bg-warning/20", "border-warning"] : [];
            }}
            eventContent={(info) => {
              const props = info.event.extendedProps;
              return (
                <div className="p-1 text-xs">
                  <div className="font-medium truncate">{info.event.title}</div>
                  <div className="flex items-center gap-1 text-xs opacity-80">
                    <span>{props.points}pts</span>
                    <span>•</span>
                    <span>{props.estimatedDuration}min</span>
                  </div>
                </div>
              );
            }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="card bg-base-200 shadow-lg mt-4">
        <div className="card-body p-4">
          <h3 className="font-bold mb-3">📋 Calendar Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>Cleaning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Organizing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span>Maintenance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span>Outdoor</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Cooking</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-base-content/60">
            <span>• Drag & drop to reschedule</span>
            <span>• Click dates to view details</span>
            <span>• Ring border = urgent priority</span>
            <span>• Faded = completed</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <div className="stat bg-primary text-primary-content rounded-lg p-4">
          <div className="stat-title text-primary-content/70">Total Events</div>
          <div className="stat-value text-2xl">{events.length}</div>
        </div>
        
        <div className="stat bg-warning text-warning-content rounded-lg p-4">
          <div className="stat-title text-warning-content/70">Conflicts</div>
          <div className="stat-value text-2xl">{conflicts.length}</div>
        </div>
        
        <div className="stat bg-success text-success-content rounded-lg p-4">
          <div className="stat-title text-success-content/70">Completed</div>
          <div className="stat-value text-2xl">
            {events.filter(e => e.extendedProps.status === "completed").length}
          </div>
        </div>
        
        <div className="stat bg-info text-info-content rounded-lg p-4">
          <div className="stat-title text-info-content/70">This Week</div>
          <div className="stat-value text-2xl">
            {events.filter(e => {
              const eventDate = new Date(e.start);
              const now = new Date();
              const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
              const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
              return eventDate >= weekStart && eventDate < weekEnd;
            }).length}
          </div>
        </div>
      </div>
    </div>
  );
}