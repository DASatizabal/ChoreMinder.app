"use server";

import {
  getUnifiedMessagingService,
  MessageRequest,
} from "./unified-messaging";

interface ScheduledMessage {
  id: string;
  userId: string;
  type: string;
  scheduleAt: Date;
  request: MessageRequest;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  lastAttemptAt?: Date;
  status: "pending" | "sent" | "failed" | "cancelled";
}

interface RecurringRule {
  id: string;
  userId: string;
  type: string;
  cronExpression: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun: Date;
  template: Partial<MessageRequest>;
}

interface MessageThrottle {
  userId: string;
  channel: "whatsapp" | "sms" | "email";
  count: number;
  windowStart: Date;
  windowDuration: number; // in milliseconds
  limit: number;
}

class MessageSchedulerService {
  private messagingService = getUnifiedMessagingService();
  private scheduledMessages: Map<string, ScheduledMessage> = new Map();
  private recurringRules: Map<string, RecurringRule> = new Map();
  private throttles: Map<string, MessageThrottle> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startProcessing();
  }

  /**
   * Schedule a message for future delivery
   */
  async scheduleMessage(
    request: MessageRequest,
    scheduleAt: Date,
    maxAttempts = 3,
  ): Promise<string> {
    const id = this.generateId();

    const scheduledMessage: ScheduledMessage = {
      id,
      userId: request.userId,
      type: request.type,
      scheduleAt,
      request,
      attempts: 0,
      maxAttempts,
      createdAt: new Date(),
      status: "pending",
    };

    this.scheduledMessages.set(id, scheduledMessage);

    console.log(
      `Message scheduled: ${id} for user ${request.userId} at ${scheduleAt.toISOString()}`,
    );

    return id;
  }

  /**
   * Schedule recurring message
   */
  async scheduleRecurring(
    userId: string,
    type: string,
    cronExpression: string,
    template: Partial<MessageRequest>,
  ): Promise<string> {
    const id = this.generateId();

    const rule: RecurringRule = {
      id,
      userId,
      type,
      cronExpression,
      enabled: true,
      nextRun: this.calculateNextRun(cronExpression),
      template,
    };

    this.recurringRules.set(id, rule);

    console.log(
      `Recurring message scheduled: ${id} for user ${userId} with cron ${cronExpression}`,
    );

    return id;
  }

  /**
   * Cancel scheduled message
   */
  async cancelScheduledMessage(messageId: string): Promise<boolean> {
    const message = this.scheduledMessages.get(messageId);
    if (message && message.status === "pending") {
      message.status = "cancelled";
      console.log(`Cancelled scheduled message: ${messageId}`);
      return true;
    }
    return false;
  }

  /**
   * Pause/resume recurring rule
   */
  async toggleRecurringRule(
    ruleId: string,
    enabled: boolean,
  ): Promise<boolean> {
    const rule = this.recurringRules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      if (enabled) {
        rule.nextRun = this.calculateNextRun(rule.cronExpression);
      }
      console.log(
        `Recurring rule ${ruleId} ${enabled ? "enabled" : "disabled"}`,
      );
      return true;
    }
    return false;
  }

  /**
   * Check if user is throttled for specific channel
   */
  isThrottled(userId: string, channel: "whatsapp" | "sms" | "email"): boolean {
    const key = `${userId}_${channel}`;
    const throttle = this.throttles.get(key);

    if (!throttle) return false;

    const now = new Date();
    const windowEnd = new Date(
      throttle.windowStart.getTime() + throttle.windowDuration,
    );

    // Reset window if expired
    if (now > windowEnd) {
      this.throttles.delete(key);
      return false;
    }

    return throttle.count >= throttle.limit;
  }

  /**
   * Update throttle counter
   */
  updateThrottle(userId: string, channel: "whatsapp" | "sms" | "email") {
    const key = `${userId}_${channel}`;
    const now = new Date();
    const throttle = this.throttles.get(key);

    if (throttle) {
      const windowEnd = new Date(
        throttle.windowStart.getTime() + throttle.windowDuration,
      );

      if (now > windowEnd) {
        // Reset window
        throttle.count = 1;
        throttle.windowStart = now;
      } else {
        throttle.count++;
      }
    } else {
      // Create new throttle
      this.throttles.set(key, {
        userId,
        channel,
        count: 1,
        windowStart: now,
        windowDuration: this.getThrottleWindow(channel),
        limit: this.getThrottleLimit(channel),
      });
    }
  }

  /**
   * Get throttle limits for different channels
   */
  private getThrottleLimit(channel: "whatsapp" | "sms" | "email"): number {
    switch (channel) {
      case "whatsapp":
        return 20; // 20 messages per hour
      case "sms":
        return 10; // 10 SMS per hour (cost consideration)
      case "email":
        return 50; // 50 emails per hour
      default:
        return 10;
    }
  }

  /**
   * Get throttle window duration
   */
  private getThrottleWindow(channel: "whatsapp" | "sms" | "email"): number {
    return 60 * 60 * 1000; // 1 hour in milliseconds
  }

  /**
   * Schedule reminder messages based on chore due dates
   */
  async scheduleChoreReminders(
    choreId: string,
    dueDate: Date,
    assignedUserId: string,
    context: any,
  ) {
    const now = new Date();
    const timeToDue = dueDate.getTime() - now.getTime();

    // Schedule reminders at different intervals
    const reminderTimes = [
      { hours: 24, label: "24h" },
      { hours: 4, label: "4h" },
      { hours: 1, label: "1h" },
    ];

    for (const reminder of reminderTimes) {
      const reminderTime = new Date(
        dueDate.getTime() - reminder.hours * 60 * 60 * 1000,
      );

      // Only schedule if reminder time is in the future
      if (reminderTime > now) {
        const request: MessageRequest = {
          userId: assignedUserId,
          type: "reminder",
          priority: reminder.hours <= 4 ? "high" : "medium",
          context,
          options: {
            scheduleAt: reminderTime,
          },
        };

        await this.scheduleMessage(request, reminderTime);
        console.log(
          `Scheduled ${reminder.label} reminder for chore ${choreId} at ${reminderTime.toISOString()}`,
        );
      }
    }
  }

  /**
   * Schedule digest messages (daily/weekly summaries)
   */
  async scheduleDigestMessage(
    userId: string,
    type: "daily" | "weekly",
    preferredTime: string = "09:00",
  ) {
    const cronExpression =
      type === "daily"
        ? `0 ${preferredTime.split(":")[1]} ${preferredTime.split(":")[0]} * * *` // Daily at preferred time
        : `0 ${preferredTime.split(":")[1]} ${preferredTime.split(":")[0]} * * 1`; // Weekly on Monday

    const template: Partial<MessageRequest> = {
      userId,
      type: "digest",
      priority: "low",
    };

    await this.scheduleRecurring(
      userId,
      `${type}_digest`,
      cronExpression,
      template,
    );
  }

  /**
   * Start background processing
   */
  private startProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(async () => {
      await this.processScheduledMessages();
      await this.processRecurringRules();
      this.cleanupExpiredThrottles();
    }, 60000); // Process every minute

    console.log("Message scheduler started");
  }

  /**
   * Stop background processing
   */
  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log("Message scheduler stopped");
    }
  }

  /**
   * Process scheduled messages
   */
  private async processScheduledMessages() {
    const now = new Date();
    const dueMessages = Array.from(this.scheduledMessages.values()).filter(
      (msg) =>
        msg.status === "pending" &&
        msg.scheduleAt <= now &&
        msg.attempts < msg.maxAttempts,
    );

    if (dueMessages.length === 0) return;

    console.log(`Processing ${dueMessages.length} scheduled messages`);

    for (const message of dueMessages) {
      try {
        message.attempts++;
        message.lastAttemptAt = new Date();

        const result = await this.messagingService.sendMessage(message.request);

        if (result.success) {
          message.status = "sent";
          console.log(
            `Scheduled message ${message.id} sent successfully via ${result.channel}`,
          );
        } else {
          if (message.attempts >= message.maxAttempts) {
            message.status = "failed";
            console.error(
              `Scheduled message ${message.id} failed after ${message.attempts} attempts`,
            );
          } else {
            // Schedule retry in 5 minutes
            message.scheduleAt = new Date(now.getTime() + 5 * 60 * 1000);
            console.log(
              `Retrying scheduled message ${message.id} in 5 minutes`,
            );
          }
        }
      } catch (error) {
        console.error(
          `Error processing scheduled message ${message.id}:`,
          error,
        );
        if (message.attempts >= message.maxAttempts) {
          message.status = "failed";
        }
      }
    }
  }

  /**
   * Process recurring rules
   */
  private async processRecurringRules() {
    const now = new Date();
    const dueRules = Array.from(this.recurringRules.values()).filter(
      (rule) => rule.enabled && rule.nextRun <= now,
    );

    if (dueRules.length === 0) return;

    console.log(`Processing ${dueRules.length} recurring rules`);

    for (const rule of dueRules) {
      try {
        // Create message request from template
        const request: MessageRequest = {
          userId: rule.userId,
          type: rule.type as any,
          priority: "low",
          context: {} as any, // This would need to be populated based on current data
          ...rule.template,
        };

        await this.messagingService.sendMessage(request);

        rule.lastRun = now;
        rule.nextRun = this.calculateNextRun(rule.cronExpression);

        console.log(
          `Recurring rule ${rule.id} executed, next run: ${rule.nextRun.toISOString()}`,
        );
      } catch (error) {
        console.error(`Error processing recurring rule ${rule.id}:`, error);
      }
    }
  }

  /**
   * Calculate next run time from cron expression
   */
  private calculateNextRun(cronExpression: string): Date {
    // This is a simplified cron parser
    // In production, use a proper cron library like 'node-cron' or 'cron-parser'
    const now = new Date();
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
    return nextHour;
  }

  /**
   * Clean up expired throttles
   */
  private cleanupExpiredThrottles() {
    const now = new Date();
    const expiredThrottles: string[] = [];

    for (const [key, throttle] of this.throttles.entries()) {
      const windowEnd = new Date(
        throttle.windowStart.getTime() + throttle.windowDuration,
      );
      if (now > windowEnd) {
        expiredThrottles.push(key);
      }
    }

    expiredThrottles.forEach((key) => this.throttles.delete(key));

    if (expiredThrottles.length > 0) {
      console.log(`Cleaned up ${expiredThrottles.length} expired throttles`);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get scheduling statistics
   */
  getStats() {
    const scheduledMessages = Array.from(this.scheduledMessages.values());
    const recurringRules = Array.from(this.recurringRules.values());

    return {
      scheduledMessages: {
        total: scheduledMessages.length,
        pending: scheduledMessages.filter((m) => m.status === "pending").length,
        sent: scheduledMessages.filter((m) => m.status === "sent").length,
        failed: scheduledMessages.filter((m) => m.status === "failed").length,
        cancelled: scheduledMessages.filter((m) => m.status === "cancelled")
          .length,
      },
      recurringRules: {
        total: recurringRules.length,
        enabled: recurringRules.filter((r) => r.enabled).length,
        disabled: recurringRules.filter((r) => !r.enabled).length,
      },
      throttles: {
        active: this.throttles.size,
        byChannel: {
          whatsapp: Array.from(this.throttles.values()).filter(
            (t) => t.channel === "whatsapp",
          ).length,
          sms: Array.from(this.throttles.values()).filter(
            (t) => t.channel === "sms",
          ).length,
          email: Array.from(this.throttles.values()).filter(
            (t) => t.channel === "email",
          ).length,
        },
      },
    };
  }

  /**
   * Get upcoming scheduled messages
   */
  getUpcomingMessages(hours = 24) {
    const now = new Date();
    const cutoff = new Date(now.getTime() + hours * 60 * 60 * 1000);

    return Array.from(this.scheduledMessages.values())
      .filter((msg) => msg.status === "pending" && msg.scheduleAt <= cutoff)
      .sort((a, b) => a.scheduleAt.getTime() - b.scheduleAt.getTime());
  }
}

// Singleton instance
let messageScheduler: MessageSchedulerService | null = null;

export const getMessageScheduler = (): MessageSchedulerService => {
  if (!messageScheduler) {
    messageScheduler = new MessageSchedulerService();
  }
  return messageScheduler;
};

export type { ScheduledMessage, RecurringRule, MessageThrottle };
export { MessageSchedulerService };
