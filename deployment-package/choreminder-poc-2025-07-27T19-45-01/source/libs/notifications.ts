"use server";

import { dbConnect } from "./mongoose";
import { getUnifiedMessagingService } from "./unified-messaging";
import User from "@/models/User";
import Chore from "@/models/Chore";

export interface NotificationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    event: "chore_assigned" | "chore_due_soon" | "chore_overdue" | "chore_completed" | "chore_approved" | "streak_milestone" | "points_milestone";
    conditions: {
      timeOffset?: number; // Minutes before/after event
      priority?: ("low" | "medium" | "high" | "urgent")[];
      categories?: string[];
      users?: string[];
      minStreak?: number;
      minPoints?: number;
    };
  };
  actions: {
    channels: ("whatsapp" | "sms" | "email")[];
    template: string;
    priority: "low" | "medium" | "high" | "urgent";
    escalation?: {
      enabled: boolean;
      delayMinutes: number;
      escalateToParents: boolean;
      maxAttempts: number;
    };
  };
  scheduling: {
    respectQuietHours: boolean;
    quietHours?: {
      start: string;
      end: string;
      timezone: string;
    };
    maxPerHour: number;
    cooldownMinutes: number;
    daysOfWeek?: number[]; // 0-6, Sunday = 0
  };
  isActive: boolean;
  familyId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationSchedule {
  id: string;
  ruleId: string;
  userId: string;
  choreId?: string;
  scheduledAt: Date;
  attempts: number;
  maxAttempts: number;
  status: "pending" | "sent" | "failed" | "cancelled";
  lastAttemptAt?: Date;
  escalationLevel: number;
  metadata: {
    trigger: string;
    originalEvent: any;
  };
}

class NotificationService {
  private scheduledNotifications: Map<string, NotificationSchedule> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize notification service
   */
  initialize(): void {
    // Start processing scheduled notifications every minute
    this.processingInterval = setInterval(() => {
      this.processScheduledNotifications();
    }, 60 * 1000);

    console.log("Notification service initialized");
  }

  /**
   * Shutdown notification service
   */
  shutdown(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    console.log("Notification service shutdown");
  }

  /**
   * Create notification rule
   */
  async createNotificationRule(rule: Omit<NotificationRule, "id" | "createdAt" | "updatedAt">): Promise<NotificationRule> {
    const newRule: NotificationRule = {
      ...rule,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store in database (would need a NotificationRule model)
    console.log("Created notification rule:", newRule.name);
    
    return newRule;
  }

  /**
   * Trigger notification based on event
   */
  async triggerNotification(event: {
    type: "chore_assigned" | "chore_due_soon" | "chore_overdue" | "chore_completed" | "chore_approved" | "streak_milestone" | "points_milestone";
    userId: string;
    choreId?: string;
    data: any;
  }): Promise<void> {
    try {
      await dbConnect();

      const user = await User.findById(event.userId).populate("family");
      if (!user) return;

      // Get applicable notification rules
      const rules = await this.getApplicableRules(event, user);

      for (const rule of rules) {
        await this.scheduleNotification(rule, event, user);
      }
    } catch (error) {
      console.error("Error triggering notification:", error);
    }
  }

  /**
   * Schedule a notification
   */
  private async scheduleNotification(
    rule: NotificationRule,
    event: any,
    user: any
  ): Promise<void> {
    const now = new Date();
    let scheduledAt = new Date(now);

    // Apply time offset if specified
    if (rule.trigger.conditions.timeOffset) {
      scheduledAt.setMinutes(scheduledAt.getMinutes() + rule.trigger.conditions.timeOffset);
    }

    // Check quiet hours
    if (rule.scheduling.respectQuietHours) {
      scheduledAt = this.adjustForQuietHours(scheduledAt, user, rule.scheduling.quietHours);
    }

    // Check rate limiting
    if (!this.isWithinRateLimit(user._id.toString(), rule.scheduling.maxPerHour)) {
      // Delay until rate limit resets
      scheduledAt = this.getNextAvailableSlot(user._id.toString(), rule.scheduling.maxPerHour);
    }

    const notification: NotificationSchedule = {
      id: this.generateId(),
      ruleId: rule.id,
      userId: user._id.toString(),
      choreId: event.choreId,
      scheduledAt,
      attempts: 0,
      maxAttempts: rule.actions.escalation?.maxAttempts || 3,
      status: "pending",
      escalationLevel: 0,
      metadata: {
        trigger: event.type,
        originalEvent: event.data,
      },
    };

    this.scheduledNotifications.set(notification.id, notification);
    console.log(`Scheduled notification ${notification.id} for ${scheduledAt.toISOString()}`);
  }

  /**
   * Process scheduled notifications
   */
  private async processScheduledNotifications(): Promise<void> {
    const now = new Date();
    const pendingNotifications = Array.from(this.scheduledNotifications.values())
      .filter(n => n.status === "pending" && n.scheduledAt <= now);

    for (const notification of pendingNotifications) {
      await this.sendNotification(notification);
    }
  }

  /**
   * Send individual notification
   */
  private async sendNotification(notification: NotificationSchedule): Promise<void> {
    try {
      const user = await User.findById(notification.userId);
      if (!user) {
        this.markNotificationFailed(notification, "User not found");
        return;
      }

      const rule = await this.getNotificationRule(notification.ruleId);
      if (!rule || !rule.isActive) {
        this.markNotificationFailed(notification, "Rule not found or inactive");
        return;
      }

      // Check cooldown
      if (!this.isOutsideCooldown(user._id.toString(), rule.scheduling.cooldownMinutes)) {
        // Reschedule for later
        notification.scheduledAt = new Date(Date.now() + rule.scheduling.cooldownMinutes * 60 * 1000);
        return;
      }

      // Prepare message context
      const messageContext = await this.prepareMessageContext(notification, user);
      const messagingService = getUnifiedMessagingService();

      // Send message
      const result = await messagingService.sendMessage({
        userId: user._id.toString(),
        type: this.mapEventToMessageType(notification.metadata.trigger),
        priority: rule.actions.priority,
        context: messageContext,
        options: {
          forceChannel: rule.actions.channels[0], // Use first preferred channel
          bypassQuietHours: !rule.scheduling.respectQuietHours,
        },
      });

      if (result.success) {
        this.markNotificationSent(notification);
      } else {
        await this.handleNotificationFailure(notification, rule, result.error);
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      await this.handleNotificationFailure(notification, null, error.message);
    }
  }

  /**
   * Handle notification failure and escalation
   */
  private async handleNotificationFailure(
    notification: NotificationSchedule,
    rule: NotificationRule | null,
    error?: string
  ): Promise<void> {
    notification.attempts++;
    notification.lastAttemptAt = new Date();

    if (notification.attempts >= notification.maxAttempts) {
      this.markNotificationFailed(notification, error || "Max attempts reached");
      
      // Try escalation
      if (rule?.actions.escalation?.enabled && rule.actions.escalation.escalateToParents) {
        await this.escalateToParents(notification, rule);
      }
    } else {
      // Reschedule for retry
      const retryDelay = rule?.actions.escalation?.delayMinutes || 30;
      notification.scheduledAt = new Date(Date.now() + retryDelay * 60 * 1000);
      notification.status = "pending";
    }
  }

  /**
   * Escalate notification to parents
   */
  private async escalateToParents(notification: NotificationSchedule, rule: NotificationRule): Promise<void> {
    try {
      const user = await User.findById(notification.userId).populate("family");
      if (!user?.family) return;

      const parents = await User.find({
        family: user.family._id,
        role: "parent",
      });

      const messagingService = getUnifiedMessagingService();

      for (const parent of parents) {
        const escalationContext = {
          user: parent,
          chore: notification.choreId ? await Chore.findById(notification.choreId) : null,
          family: user.family,
          childUser: user,
        };

        await messagingService.sendMessage({
          userId: parent._id.toString(),
          type: "update",
          priority: "high",
          context: escalationContext,
          options: {
            reason: `Notification escalation: ${user.name} may need attention regarding a chore reminder.`,
          },
        });
      }

      console.log(`Escalated notification ${notification.id} to ${parents.length} parents`);
    } catch (error) {
      console.error("Error escalating notification:", error);
    }
  }

  /**
   * Adjust notification time for quiet hours
   */
  private adjustForQuietHours(
    scheduledAt: Date,
    user: any,
    ruleQuietHours?: { start: string; end: string; timezone: string }
  ): Date {
    const userPrefs = user.communicationPreferences;
    const quietHours = ruleQuietHours || userPrefs?.quietHours;

    if (!quietHours?.enabled) return scheduledAt;

    const time = scheduledAt.toTimeString().substring(0, 5); // HH:MM format
    const start = quietHours.start;
    const end = quietHours.end;

    const isInQuietHours = this.isTimeInRange(time, start, end);

    if (isInQuietHours) {
      // Move to end of quiet hours
      const nextAvailable = new Date(scheduledAt);
      const [endHour, endMinute] = end.split(":").map(Number);
      nextAvailable.setHours(endHour, endMinute, 0, 0);

      // If end time is before current time (spans midnight), move to next day
      if (nextAvailable <= scheduledAt) {
        nextAvailable.setDate(nextAvailable.getDate() + 1);
      }

      return nextAvailable;
    }

    return scheduledAt;
  }

  /**
   * Check if current time is within rate limit
   */
  private isWithinRateLimit(userId: string, maxPerHour: number): boolean {
    // Implementation would track sent notifications per user per hour
    // For now, return true (simplified)
    return true;
  }

  /**
   * Check if outside cooldown period
   */
  private isOutsideCooldown(userId: string, cooldownMinutes: number): boolean {
    // Implementation would track last notification time per user
    // For now, return true (simplified)
    return true;
  }

  /**
   * Get next available time slot considering rate limits
   */
  private getNextAvailableSlot(userId: string, maxPerHour: number): Date {
    // Implementation would calculate next available slot
    // For now, return current time + 1 hour (simplified)
    return new Date(Date.now() + 60 * 60 * 1000);
  }

  /**
   * Get applicable notification rules for event
   */
  private async getApplicableRules(event: any, user: any): Promise<NotificationRule[]> {
    // This would query database for applicable rules
    // For now, return default rules (simplified)
    return this.getDefaultRules(user);
  }

  /**
   * Get default notification rules
   */
  private getDefaultRules(user: any): NotificationRule[] {
    const baseRule = {
      id: "default",
      familyId: user.family?._id?.toString(),
      createdBy: "system",
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      scheduling: {
        respectQuietHours: true,
        maxPerHour: 5,
        cooldownMinutes: 30,
      },
    };

    return [
      {
        ...baseRule,
        name: "Chore Due Soon",
        description: "Remind when chore is due within 2 hours",
        trigger: {
          event: "chore_due_soon",
          conditions: { timeOffset: -120 }, // 2 hours before
        },
        actions: {
          channels: ["whatsapp", "sms"],
          template: "chore_reminder",
          priority: "medium",
        },
      },
      {
        ...baseRule,
        name: "Chore Overdue",
        description: "Alert when chore is overdue",
        trigger: {
          event: "chore_overdue",
          conditions: { timeOffset: 60 }, // 1 hour after due
        },
        actions: {
          channels: ["sms", "email"],
          template: "chore_overdue",
          priority: "high",
          escalation: {
            enabled: true,
            delayMinutes: 60,
            escalateToParents: true,
            maxAttempts: 2,
          },
        },
      },
    ];
  }

  /**
   * Prepare message context for notification
   */
  private async prepareMessageContext(notification: NotificationSchedule, user: any): Promise<any> {
    const context: any = {
      user,
      family: user.family,
    };

    if (notification.choreId) {
      context.chore = await Chore.findById(notification.choreId);
    }

    return context;
  }

  /**
   * Map event type to message type
   */
  private mapEventToMessageType(eventType: string): any {
    const mapping = {
      chore_assigned: "assigned",
      chore_due_soon: "reminder",
      chore_overdue: "reminder",
      chore_completed: "completed",
      chore_approved: "approved",
      streak_milestone: "update",
      points_milestone: "update",
    };

    return mapping[eventType] || "update";
  }

  /**
   * Mark notification as sent
   */
  private markNotificationSent(notification: NotificationSchedule): void {
    notification.status = "sent";
    notification.lastAttemptAt = new Date();
    console.log(`Notification ${notification.id} sent successfully`);
  }

  /**
   * Mark notification as failed
   */
  private markNotificationFailed(notification: NotificationSchedule, reason?: string): void {
    notification.status = "failed";
    notification.lastAttemptAt = new Date();
    console.log(`Notification ${notification.id} failed: ${reason}`);
  }

  /**
   * Get notification rule by ID
   */
  private async getNotificationRule(ruleId: string): Promise<NotificationRule | null> {
    // This would query database for rule
    // For now, return a default rule (simplified)
    const defaultRules = this.getDefaultRules({});
    return defaultRules.find(r => r.id === ruleId) || null;
  }

  /**
   * Check if time is within range
   */
  private isTimeInRange(time: string, start: string, end: string): boolean {
    const timeMinutes = this.timeToMinutes(time);
    const startMinutes = this.timeToMinutes(start);
    const endMinutes = this.timeToMinutes(end);

    if (startMinutes <= endMinutes) {
      return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
    } else {
      // Range spans midnight
      return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
    }
  }

  /**
   * Convert time string to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
let notificationService: NotificationService | null = null;

export const getNotificationService = (): NotificationService => {
  if (!notificationService) {
    notificationService = new NotificationService();
    notificationService.initialize();
  }
  return notificationService;
};

export { NotificationService };