"use server";

import { dbConnect } from "./mongoose";
import Chore from "@/models/Chore";
import User from "@/models/User";
// import { getUnifiedMessagingService } from "./unified-messaging"; // Disabled for testing

export interface RecurrencePattern {
  type: "daily" | "weekly" | "monthly" | "custom";
  interval: number; // Every N days/weeks/months
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  dayOfMonth?: number; // 1-31
  weekOfMonth?: number; // 1-4, or -1 for last week
  endDate?: Date;
  maxOccurrences?: number;
  skipHolidays?: boolean;
  timezone?: string;
}

export interface ScheduledChore {
  id: string;
  title: string;
  description: string;
  category: string;
  points: number;
  estimatedDuration: number;
  assignedTo: string;
  familyId: string;
  recurrence: RecurrencePattern;
  nextDue: Date;
  lastGenerated?: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  priority: "low" | "medium" | "high" | "urgent";
  requiresPhotoVerification: boolean;
  instructions?: string;
  tags: string[];
}

export interface ScheduleConflict {
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

class SchedulingService {
  /**
   * Create a scheduled chore with recurrence pattern
   */
  async createScheduledChore(
    choreData: Omit<ScheduledChore, "id" | "nextDue" | "createdAt">
  ): Promise<ScheduledChore> {
    await dbConnect();

    const nextDue = this.calculateNextDueDate(choreData.recurrence, new Date());
    
    const scheduledChore: ScheduledChore = {
      ...choreData,
      id: this.generateId(),
      nextDue,
      createdAt: new Date(),
    };

    // Store in database (extend Chore model to support scheduling)
    const chore = new Chore({
      title: scheduledChore.title,
      description: scheduledChore.description,
      category: scheduledChore.category,
      points: scheduledChore.points,
      estimatedDuration: scheduledChore.estimatedDuration,
      assignedTo: scheduledChore.assignedTo,
      family: scheduledChore.familyId,
      createdBy: scheduledChore.createdBy,
      dueDate: scheduledChore.nextDue,
      priority: scheduledChore.priority,
      requiresPhotoVerification: scheduledChore.requiresPhotoVerification,
      instructions: scheduledChore.instructions,
      tags: scheduledChore.tags,
      isRecurring: true,
      recurrencePattern: scheduledChore.recurrence,
      scheduleId: scheduledChore.id,
      status: "scheduled",
    });

    await chore.save();

    // Generate initial instances if needed
    await this.generateUpcomingInstances(scheduledChore.id, 30); // Generate 30 days ahead

    return scheduledChore;
  }

  /**
   * Calculate next due date based on recurrence pattern
   */
  calculateNextDueDate(pattern: RecurrencePattern, fromDate: Date = new Date()): Date {
    const nextDate = new Date(fromDate);
    
    switch (pattern.type) {
      case "daily":
        nextDate.setDate(nextDate.getDate() + pattern.interval);
        break;

      case "weekly":
        if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
          // Find next occurrence of specified day(s)
          const currentDay = nextDate.getDay();
          const sortedDays = [...pattern.daysOfWeek].sort((a, b) => a - b);
          
          let nextDay = sortedDays.find(day => day > currentDay);
          if (!nextDay) {
            // Next week
            nextDay = sortedDays[0];
            nextDate.setDate(nextDate.getDate() + (7 - currentDay + nextDay));
          } else {
            nextDate.setDate(nextDate.getDate() + (nextDay - currentDay));
          }
          
          // Apply interval (every N weeks)
          if (pattern.interval > 1) {
            nextDate.setDate(nextDate.getDate() + (pattern.interval - 1) * 7);
          }
        } else {
          nextDate.setDate(nextDate.getDate() + 7 * pattern.interval);
        }
        break;

      case "monthly":
        if (pattern.dayOfMonth) {
          nextDate.setMonth(nextDate.getMonth() + pattern.interval);
          nextDate.setDate(Math.min(pattern.dayOfMonth, this.getDaysInMonth(nextDate)));
        } else if (pattern.weekOfMonth && pattern.daysOfWeek?.[0] !== undefined) {
          // Nth weekday of month (e.g., 2nd Tuesday)
          nextDate.setMonth(nextDate.getMonth() + pattern.interval);
          this.setNthWeekdayOfMonth(nextDate, pattern.weekOfMonth, pattern.daysOfWeek[0]);
        } else {
          nextDate.setMonth(nextDate.getMonth() + pattern.interval);
        }
        break;

      case "custom":
        // For custom patterns, add interval days
        nextDate.setDate(nextDate.getDate() + pattern.interval);
        break;
    }

    // Skip holidays if requested
    if (pattern.skipHolidays) {
      nextDate = this.skipHolidays(nextDate);
    }

    return nextDate;
  }

  /**
   * Generate upcoming chore instances
   */
  async generateUpcomingInstances(scheduleId: string, daysAhead: number = 30): Promise<void> {
    await dbConnect();

    const scheduledChore = await Chore.findOne({ scheduleId, isRecurring: true });
    if (!scheduledChore || !scheduledChore.recurrencePattern) return;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    let currentDate = scheduledChore.lastGenerated || new Date();
    const instances: any[] = [];

    while (currentDate <= endDate) {
      const nextDue = this.calculateNextDueDate(scheduledChore.recurrencePattern, currentDate);
      
      if (nextDue > endDate) break;

      // Check if instance already exists
      const existingInstance = await Chore.findOne({
        scheduleId,
        dueDate: {
          $gte: new Date(nextDue.getTime() - 12 * 60 * 60 * 1000), // 12 hours before
          $lte: new Date(nextDue.getTime() + 12 * 60 * 60 * 1000), // 12 hours after
        },
      });

      if (!existingInstance) {
        instances.push({
          title: scheduledChore.title,
          description: scheduledChore.description,
          category: scheduledChore.category,
          points: scheduledChore.points,
          estimatedDuration: scheduledChore.estimatedDuration,
          assignedTo: scheduledChore.assignedTo,
          family: scheduledChore.family,
          createdBy: scheduledChore.createdBy,
          dueDate: nextDue,
          priority: scheduledChore.priority,
          requiresPhotoVerification: scheduledChore.requiresPhotoVerification,
          instructions: scheduledChore.instructions,
          tags: scheduledChore.tags,
          isRecurring: false,
          scheduleId,
          status: "pending",
          generatedAt: new Date(),
        });
      }

      currentDate = nextDue;
    }

    if (instances.length > 0) {
      await Chore.insertMany(instances);
      
      // Update last generated date
      await Chore.findByIdAndUpdate(scheduledChore._id, {
        lastGenerated: currentDate,
      });

      console.log(`Generated ${instances.length} chore instances for schedule ${scheduleId}`);
    }
  }

  /**
   * Check for scheduling conflicts
   */
  async checkScheduleConflicts(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ScheduleConflict[]> {
    await dbConnect();

    const chores = await Chore.find({
      assignedTo: userId,
      dueDate: { $gte: startDate, $lte: endDate },
      status: { $in: ["pending", "in_progress"] },
      deletedAt: null,
    }).sort({ dueDate: 1 });

    const conflictsByDate = new Map<string, any[]>();

    chores.forEach(chore => {
      const dateKey = chore.dueDate.toDateString();
      if (!conflictsByDate.has(dateKey)) {
        conflictsByDate.set(dateKey, []);
      }
      conflictsByDate.get(dateKey)!.push({
        choreId: chore._id.toString(),
        title: chore.title,
        assignedTo: chore.assignedTo.toString(),
        estimatedDuration: chore.estimatedDuration || 30,
      });
    });

    const conflicts: ScheduleConflict[] = [];

    conflictsByDate.forEach((dayChores, dateStr) => {
      const totalDuration = dayChores.reduce((sum, chore) => sum + chore.estimatedDuration, 0);
      
      if (totalDuration > 180 || dayChores.length > 5) { // More than 3 hours or 5 chores
        conflicts.push({
          date: new Date(dateStr),
          conflicts: dayChores,
          totalDuration,
          recommendation: this.generateConflictRecommendation(dayChores, totalDuration),
        });
      }
    });

    return conflicts;
  }

  /**
   * Optimize family schedule
   */
  async optimizeFamilySchedule(familyId: string, date: Date): Promise<{
    recommendations: string[];
    redistributions: Array<{
      choreId: string;
      currentAssignee: string;
      suggestedAssignee: string;
      reason: string;
    }>;
  }> {
    await dbConnect();

    const familyMembers = await User.find({
      familyId,
      role: "child",
    }).select("_id name");

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const chores = await Chore.find({
      family: familyId,
      dueDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ["pending", "in_progress"] },
      deletedAt: null,
    }).populate("assignedTo", "name");

    const workloadByMember = new Map();
    familyMembers.forEach(member => {
      workloadByMember.set(member._id.toString(), {
        name: member.name,
        chores: [],
        totalDuration: 0,
      });
    });

    chores.forEach(chore => {
      const assigneeId = chore.assignedTo._id.toString();
      if (workloadByMember.has(assigneeId)) {
        const workload = workloadByMember.get(assigneeId);
        workload.chores.push(chore);
        workload.totalDuration += chore.estimatedDuration || 30;
      }
    });

    const recommendations: string[] = [];
    const redistributions: any[] = [];

    // Find overloaded and underloaded members
    const workloads = Array.from(workloadByMember.values());
    const avgWorkload = workloads.reduce((sum, w) => sum + w.totalDuration, 0) / workloads.length;
    
    const overloaded = workloads.filter(w => w.totalDuration > avgWorkload * 1.5);
    const underloaded = workloads.filter(w => w.totalDuration < avgWorkload * 0.5);

    if (overloaded.length > 0 && underloaded.length > 0) {
      recommendations.push("Consider redistributing chores to balance workload across family members.");
      
      // Suggest redistributions
      overloaded.forEach(overloadedMember => {
        const choreToMove = overloadedMember.chores
          .sort((a, b) => (a.estimatedDuration || 30) - (b.estimatedDuration || 30))[0];
        
        const targetMember = underloaded[0];
        
        redistributions.push({
          choreId: choreToMove._id.toString(),
          currentAssignee: overloadedMember.name,
          suggestedAssignee: targetMember.name,
          reason: `Balance workload: ${overloadedMember.name} has ${overloadedMember.totalDuration} min, ${targetMember.name} has ${targetMember.totalDuration} min`,
        });
      });
    }

    if (workloads.some(w => w.totalDuration > 240)) {
      recommendations.push("Some family members have over 4 hours of chores scheduled. Consider spreading tasks across multiple days.");
    }

    if (workloads.every(w => w.chores.length === 0)) {
      recommendations.push("No chores scheduled for this day. Great job staying on top of tasks!");
    }

    return { recommendations, redistributions };
  }

  /**
   * Update chore schedule
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<ScheduledChore>
  ): Promise<boolean> {
    await dbConnect();

    try {
      // Update the master schedule
      await Chore.findOneAndUpdate(
        { scheduleId, isRecurring: true },
        {
          ...updates,
          ...(updates.recurrence && {
            recurrencePattern: updates.recurrence,
            nextDue: this.calculateNextDueDate(updates.recurrence, new Date()),
          }),
        }
      );

      // Update future instances if recurrence changed
      if (updates.recurrence) {
        await Chore.updateMany(
          {
            scheduleId,
            isRecurring: false,
            status: "pending",
            dueDate: { $gte: new Date() },
          },
          { $set: { deletedAt: new Date() } } // Soft delete old instances
        );

        // Generate new instances
        await this.generateUpcomingInstances(scheduleId, 30);
      }

      return true;
    } catch (error) {
      console.error("Error updating schedule:", error);
      return false;
    }
  }

  /**
   * Get scheduled chores for a family
   */
  async getFamilySchedule(
    familyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    chores: any[];
    conflicts: ScheduleConflict[];
    recommendations: string[];
  }> {
    await dbConnect();

    const chores = await Chore.find({
      family: familyId,
      dueDate: { $gte: startDate, $lte: endDate },
      deletedAt: null,
    })
    .populate("assignedTo", "name")
    .sort({ dueDate: 1 });

    // Check for conflicts across all family members
    const familyMembers = await User.find({
      familyId,
      role: "child",
    }).select("_id");

    const allConflicts: ScheduleConflict[] = [];
    for (const member of familyMembers) {
      const conflicts = await this.checkScheduleConflicts(
        member._id.toString(),
        startDate,
        endDate
      );
      allConflicts.push(...conflicts);
    }

    // Generate family-wide recommendations
    const recommendations: string[] = [];
    const optimization = await this.optimizeFamilySchedule(familyId, startDate);
    recommendations.push(...optimization.recommendations);

    return {
      chores,
      conflicts: allConflicts,
      recommendations,
    };
  }

  /**
   * Process scheduled chores (run daily)
   */
  async processScheduledChores(): Promise<void> {
    console.log("Processing scheduled chores...");

    try {
      // Generate upcoming instances for all active schedules
      const activeSchedules = await Chore.find({
        isRecurring: true,
        isActive: { $ne: false },
      });

      for (const schedule of activeSchedules) {
        await this.generateUpcomingInstances(schedule.scheduleId, 7); // Generate 1 week ahead
      }

      // Send notifications for due chores
      await this.sendScheduleNotifications();

      console.log("Scheduled chores processing completed");
    } catch (error) {
      console.error("Error processing scheduled chores:", error);
    }
  }

  // Helper methods
  private generateId(): string {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  private setNthWeekdayOfMonth(date: Date, week: number, dayOfWeek: number): void {
    date.setDate(1);
    const firstDay = date.getDay();
    const offset = (dayOfWeek - firstDay + 7) % 7;
    
    if (week === -1) {
      // Last occurrence
      date.setMonth(date.getMonth() + 1, 0); // Last day of month
      date.setDate(date.getDate() - ((date.getDay() - dayOfWeek + 7) % 7));
    } else {
      date.setDate(1 + offset + (week - 1) * 7);
    }
  }

  private skipHolidays(date: Date): Date {
    // Simple holiday checking (can be enhanced with holiday API)
    const holidays = [
      "2024-01-01", // New Year's Day
      "2024-07-04", // Independence Day
      "2024-12-25", // Christmas
      // Add more holidays as needed
    ];

    const dateStr = date.toISOString().split('T')[0];
    if (holidays.includes(dateStr)) {
      // Move to next day
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      return this.skipHolidays(nextDate); // Recursive in case next day is also a holiday
    }

    return date;
  }

  private generateConflictRecommendation(chores: any[], totalDuration: number): string {
    if (totalDuration > 240) {
      return `High workload day (${Math.round(totalDuration / 60)}h total). Consider spreading some chores to other days.`;
    } else if (chores.length > 5) {
      return `Many tasks scheduled (${chores.length} chores). Group similar tasks together for efficiency.`;
    } else {
      return "Manageable workload, but monitor for stress levels.";
    }
  }

  private async sendScheduleNotifications(): Promise<void> {
    // Send reminders for chores due today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dueChores = await Chore.find({
      dueDate: { $gte: today, $lt: tomorrow },
      status: "pending",
      deletedAt: null,
    }).populate("assignedTo family");

    // const messagingService = getUnifiedMessagingService(); // Disabled for testing

    for (const chore of dueChores) {
      try {
        // await messagingService.sendMessage({ // Disabled for testing
        console.log(`Chore reminder: ${chore.title} is due soon`);
        /*
          userId: chore.assignedTo._id.toString(),
          type: "reminder",
          priority: "medium",
          context: {
            user: chore.assignedTo,
            chore,
            family: chore.family,
          },
        });
        */
      } catch (error) {
        console.error(`Failed to send reminder for chore ${chore._id}:`, error);
      }
    }
  }
}

// Singleton instance
let schedulingService: SchedulingService | null = null;

export const getSchedulingService = (): SchedulingService => {
  if (!schedulingService) {
    schedulingService = new SchedulingService();
  }
  return schedulingService;
};

export { SchedulingService };