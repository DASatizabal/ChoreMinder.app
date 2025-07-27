"use server";

import { sendChoreNotificationEmail } from "./resend";
import { getTwilioSMSService, SMSMessage } from "./twilio-sms";
import { getTwilioWhatsAppService, WhatsAppMessage } from "./twilio-whatsapp";

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "parent" | "child" | "admin";
  communicationPreferences?: CommunicationPreferences;
}

interface CommunicationPreferences {
  primaryChannel: "whatsapp" | "sms" | "email";
  fallbackChannels: ("whatsapp" | "sms" | "email")[];
  quietHours?: {
    enabled: boolean;
    start: string; // "22:00"
    end: string; // "08:00"
    timezone: string;
  };
  maxMessagesPerHour?: number;
  enabledNotifications: {
    choreAssigned: boolean;
    choreReminder: boolean;
    choreCompleted: boolean;
    choreApproved: boolean;
    choreRejected: boolean;
    weeklyDigest: boolean;
    familyUpdates: boolean;
  };
}

interface MessageContext {
  user: User;
  chore: any;
  family: any;
  parentUser?: User;
}

interface MessageRequest {
  userId: string;
  type:
    | "assigned"
    | "reminder"
    | "completed"
    | "approved"
    | "rejected"
    | "digest"
    | "update";
  priority: "low" | "medium" | "high" | "urgent";
  context: MessageContext;
  options?: {
    reason?: string;
    scheduleAt?: Date;
    forceChannel?: "whatsapp" | "sms" | "email";
    bypassQuietHours?: boolean;
  };
}

interface MessageResult {
  success: boolean;
  channel: "whatsapp" | "sms" | "email";
  messageSid?: string;
  error?: string;
  attempts: ChannelAttempt[];
  deliveredAt: Date;
  scheduledAt?: Date;
}

interface ChannelAttempt {
  channel: "whatsapp" | "sms" | "email";
  success: boolean;
  error?: string;
  timestamp: Date;
  messageSid?: string;
}

class UnifiedMessagingService {
  private whatsAppService = getTwilioWhatsAppService();
  private smsService = getTwilioSMSService();
  private messageQueue: Map<string, MessageRequest[]> = new Map();
  private rateLimiters: Map<string, { count: number; resetTime: Date }> =
    new Map();
  private deliveryTracking: Map<string, MessageResult> = new Map();

  /**
   * Send message with intelligent fallback
   */
  async sendMessage(request: MessageRequest): Promise<MessageResult> {
    const { userId, type, priority, context, options } = request;
    const { user } = context;

    console.log(`Sending ${type} message to user ${userId} (${user.name})`);

    const result: MessageResult = {
      success: false,
      channel: "email", // Default fallback
      attempts: [],
      deliveredAt: new Date(),
      scheduledAt: options?.scheduleAt,
    };

    // Check if message should be scheduled
    if (options?.scheduleAt && options.scheduleAt > new Date()) {
      return this.scheduleMessage(request);
    }

    // Check quiet hours and rate limits
    if (!this.shouldSendNow(user, priority, options?.bypassQuietHours)) {
      return this.scheduleMessage({
        ...request,
        options: { ...options, scheduleAt: this.getNextAvailableTime(user) },
      });
    }

    // Get user's communication preferences
    const preferences = this.getUserPreferences(user);
    const channelOrder = this.getChannelOrder(
      preferences,
      options?.forceChannel,
    );

    // Try each channel in order
    for (const channel of channelOrder) {
      const attempt = await this.attemptChannel(channel, request);
      result.attempts.push(attempt);

      if (attempt.success) {
        result.success = true;
        result.channel = channel;
        result.messageSid = attempt.messageSid;
        break;
      }

      // Log failed attempt
      console.warn(
        `${channel} delivery failed for user ${userId}: ${attempt.error}`,
      );
    }

    // Update rate limiter
    this.updateRateLimit(userId);

    // Store delivery result
    const trackingId = `${userId}_${Date.now()}`;
    this.deliveryTracking.set(trackingId, result);

    if (!result.success) {
      console.error(`All delivery channels failed for user ${userId}`);
      result.error = "All delivery channels failed";
    }

    return result;
  }

  /**
   * Send bulk messages with batch processing
   */
  async sendBulkMessages(requests: MessageRequest[]): Promise<MessageResult[]> {
    const batchSize = 10; // Process in batches to avoid overwhelming services
    const results: MessageResult[] = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((request) => this.sendMessage(request)),
      );

      const processedResults = batchResults.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          return {
            success: false,
            channel: "email" as const,
            attempts: [],
            deliveredAt: new Date(),
            error: result.reason?.message || "Unknown error",
          };
        }
      });

      results.push(...processedResults);

      // Small delay between batches
      if (i + batchSize < requests.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Attempt to send via specific channel
   */
  private async attemptChannel(
    channel: "whatsapp" | "sms" | "email",
    request: MessageRequest,
  ): Promise<ChannelAttempt> {
    const { context, type, options } = request;
    const { user } = context;

    const attempt: ChannelAttempt = {
      channel,
      success: false,
      timestamp: new Date(),
    };

    try {
      switch (channel) {
        case "whatsapp":
          if (!user.phone || !this.whatsAppService.isConfigured()) {
            throw new Error("WhatsApp not available");
          }

          const whatsAppResult = await this.sendWhatsAppMessage(request);
          attempt.success = whatsAppResult.success;
          attempt.messageSid = whatsAppResult.messageSid;
          attempt.error = whatsAppResult.error;
          break;

        case "sms":
          if (!user.phone || !this.smsService.isConfigured()) {
            throw new Error("SMS not available");
          }

          const smsResult = await this.sendSMSMessage(request);
          attempt.success = smsResult.success;
          attempt.messageSid = smsResult.messageSid;
          attempt.error = smsResult.error;
          break;

        case "email":
          const emailResult = await this.sendEmailMessage(request);
          attempt.success = emailResult.success;
          attempt.error = emailResult.error;
          break;

        default:
          throw new Error(`Unknown channel: ${channel}`);
      }
    } catch (error: any) {
      attempt.error = error.message;
    }

    return attempt;
  }

  /**
   * Send WhatsApp message
   */
  private async sendWhatsAppMessage(request: MessageRequest) {
    const { context, type, options } = request;

    // Import templates dynamically to avoid circular dependencies
    const { WhatsAppMessageTemplates } = await import("./whatsapp-templates");

    let messageBody = "";
    switch (type) {
      case "assigned":
        messageBody = WhatsAppMessageTemplates.choreAssigned(context);
        break;
      case "reminder":
        messageBody = WhatsAppMessageTemplates.choreReminder(context);
        break;
      case "completed":
        messageBody = WhatsAppMessageTemplates.choreCompleted(context);
        break;
      case "approved":
        messageBody = WhatsAppMessageTemplates.choreApproved(context);
        break;
      case "rejected":
        messageBody = WhatsAppMessageTemplates.choreRejected(
          context,
          options?.reason,
        );
        break;
      default:
        messageBody = "ChoreMinder notification";
    }

    const response = await this.whatsAppService.sendMessage({
      to: context.user.phone!,
      body: messageBody,
    });

    return {
      success: response.status !== "failed",
      messageSid: response.sid,
      error: response.errorMessage,
    };
  }

  /**
   * Send SMS message
   */
  private async sendSMSMessage(request: MessageRequest) {
    const { context, type, options } = request;

    // Generate SMS-optimized message (shorter, no emojis)
    let messageBody = "";
    const { user, chore } = context;

    switch (type) {
      case "assigned":
        messageBody = `ChoreMinder: New chore "${chore.title}" assigned. ${chore.points} points. Due: ${chore.dueDate ? new Date(chore.dueDate).toLocaleDateString() : "No deadline"}. Check app for details.`;
        break;
      case "reminder":
        messageBody = `ChoreMinder: Reminder - "${chore.title}" is pending. ${chore.points} points available. Complete in app.`;
        break;
      case "completed":
        messageBody = `ChoreMinder: ${user.name} completed "${chore.title}" (${chore.points} points). Review in app to approve.`;
        break;
      case "approved":
        messageBody = `ChoreMinder: Great job! "${chore.title}" approved. You earned ${chore.points} points!`;
        break;
      case "rejected":
        messageBody = `ChoreMinder: "${chore.title}" needs attention. ${options?.reason ? `Reason: ${options.reason}. ` : ""}Please redo and resubmit.`;
        break;
      default:
        messageBody = "ChoreMinder notification - check app for details.";
    }

    const response = await this.smsService.sendMessage({
      to: context.user.phone!,
      body: messageBody,
    });

    return {
      success: response.status !== "failed",
      messageSid: response.sid,
      error: response.errorMessage,
    };
  }

  /**
   * Send email message
   */
  private async sendEmailMessage(request: MessageRequest) {
    const { context, type, options } = request;

    try {
      await sendChoreNotificationEmail(context, type, options);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule message for later delivery
   */
  private async scheduleMessage(
    request: MessageRequest,
  ): Promise<MessageResult> {
    const { userId } = request;
    const scheduleTime =
      request.options?.scheduleAt ||
      this.getNextAvailableTime(request.context.user);

    // Add to queue
    if (!this.messageQueue.has(userId)) {
      this.messageQueue.set(userId, []);
    }
    this.messageQueue.get(userId)!.push({
      ...request,
      options: { ...request.options, scheduleAt: scheduleTime },
    });

    console.log(
      `Message scheduled for ${request.context.user.name} at ${scheduleTime.toISOString()}`,
    );

    return {
      success: true,
      channel: "email", // Will be determined when actually sent
      attempts: [],
      deliveredAt: new Date(),
      scheduledAt: scheduleTime,
    };
  }

  /**
   * Check if message should be sent now
   */
  private shouldSendNow(
    user: User,
    priority: string,
    bypassQuietHours = false,
  ): boolean {
    // Urgent messages always go through
    if (priority === "urgent" || bypassQuietHours) {
      return true;
    }

    // Check quiet hours
    if (!this.isWithinQuietHours(user)) {
      return true;
    }

    // Check rate limits
    if (!this.isWithinRateLimit(user._id)) {
      return false;
    }

    return true;
  }

  /**
   * Check if current time is within user's quiet hours
   */
  private isWithinQuietHours(user: User): boolean {
    const preferences = this.getUserPreferences(user);

    if (!preferences.quietHours?.enabled) {
      return false;
    }

    const now = new Date();
    const timezone = preferences.quietHours.timezone || "UTC";

    // This is a simplified check - in production, use a proper timezone library
    const currentHour = now.getHours();
    const startHour = parseInt(preferences.quietHours.start.split(":")[0]);
    const endHour = parseInt(preferences.quietHours.end.split(":")[0]);

    if (startHour <= endHour) {
      return currentHour >= startHour && currentHour < endHour;
    } else {
      // Quiet hours span midnight
      return currentHour >= startHour || currentHour < endHour;
    }
  }

  /**
   * Check rate limits
   */
  private isWithinRateLimit(userId: string): boolean {
    const limiter = this.rateLimiters.get(userId);
    if (!limiter) return true;

    const now = new Date();
    if (now > limiter.resetTime) {
      this.rateLimiters.delete(userId);
      return true;
    }

    return limiter.count < 10; // Default limit
  }

  /**
   * Update rate limiter
   */
  private updateRateLimit(userId: string) {
    const now = new Date();
    const resetTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

    const limiter = this.rateLimiters.get(userId);
    if (limiter && now < limiter.resetTime) {
      limiter.count++;
    } else {
      this.rateLimiters.set(userId, { count: 1, resetTime });
    }
  }

  /**
   * Get next available time for messaging
   */
  private getNextAvailableTime(user: User): Date {
    const preferences = this.getUserPreferences(user);
    const now = new Date();

    if (!preferences.quietHours?.enabled) {
      return new Date(now.getTime() + 60000); // 1 minute from now
    }

    // Calculate next available time after quiet hours
    const endHour = parseInt(preferences.quietHours.end.split(":")[0]);
    const nextAvailable = new Date(now);
    nextAvailable.setHours(endHour, 0, 0, 0);

    if (nextAvailable <= now) {
      nextAvailable.setDate(nextAvailable.getDate() + 1);
    }

    return nextAvailable;
  }

  /**
   * Get user communication preferences with defaults
   */
  private getUserPreferences(user: User): CommunicationPreferences {
    return {
      primaryChannel: "whatsapp",
      fallbackChannels: ["sms", "email"],
      quietHours: {
        enabled: false,
        start: "22:00",
        end: "08:00",
        timezone: "UTC",
      },
      maxMessagesPerHour: 10,
      enabledNotifications: {
        choreAssigned: true,
        choreReminder: true,
        choreCompleted: true,
        choreApproved: true,
        choreRejected: true,
        weeklyDigest: true,
        familyUpdates: true,
      },
      ...user.communicationPreferences,
    };
  }

  /**
   * Get channel order based on preferences
   */
  private getChannelOrder(
    preferences: CommunicationPreferences,
    forceChannel?: string,
  ): ("whatsapp" | "sms" | "email")[] {
    if (forceChannel) {
      return [forceChannel as "whatsapp" | "sms" | "email"];
    }

    const order = [preferences.primaryChannel, ...preferences.fallbackChannels];
    return [...new Set(order)] as ("whatsapp" | "sms" | "email")[];
  }

  /**
   * Process scheduled messages
   */
  async processScheduledMessages(): Promise<void> {
    const now = new Date();

    for (const [userId, messages] of this.messageQueue.entries()) {
      const dueMessages = messages.filter(
        (msg) => msg.options?.scheduleAt && msg.options.scheduleAt <= now,
      );

      if (dueMessages.length > 0) {
        console.log(
          `Processing ${dueMessages.length} scheduled messages for user ${userId}`,
        );

        for (const message of dueMessages) {
          await this.sendMessage({
            ...message,
            options: { ...message.options, scheduleAt: undefined },
          });
        }

        // Remove processed messages
        this.messageQueue.set(
          userId,
          messages.filter((msg) => !dueMessages.includes(msg)),
        );
      }
    }
  }

  /**
   * Get delivery statistics
   */
  getDeliveryStats(timeRange: "hour" | "day" | "week" = "day") {
    const now = new Date();
    const cutoff = new Date();

    switch (timeRange) {
      case "hour":
        cutoff.setHours(cutoff.getHours() - 1);
        break;
      case "day":
        cutoff.setDate(cutoff.getDate() - 1);
        break;
      case "week":
        cutoff.setDate(cutoff.getDate() - 7);
        break;
    }

    const recentResults = Array.from(this.deliveryTracking.values()).filter(
      (result) => result.deliveredAt > cutoff,
    );

    const stats = {
      total: recentResults.length,
      successful: recentResults.filter((r) => r.success).length,
      failed: recentResults.filter((r) => !r.success).length,
      byChannel: {
        whatsapp: recentResults.filter((r) => r.channel === "whatsapp").length,
        sms: recentResults.filter((r) => r.channel === "sms").length,
        email: recentResults.filter((r) => r.channel === "email").length,
      },
      avgAttempts:
        recentResults.reduce((sum, r) => sum + r.attempts.length, 0) /
          recentResults.length || 0,
    };

    return stats;
  }

  /**
   * Get service status
   */
  getServiceStatus() {
    return {
      whatsapp: this.whatsAppService.getServiceInfo(),
      sms: this.smsService.getServiceInfo(),
      email: { configured: true }, // Email is always available
      queueSize: Array.from(this.messageQueue.values()).reduce(
        (sum, msgs) => sum + msgs.length,
        0,
      ),
      rateLimiters: this.rateLimiters.size,
      deliveryTracking: this.deliveryTracking.size,
    };
  }
}

// Singleton instance
let unifiedMessaging: UnifiedMessagingService | null = null;

export const getUnifiedMessagingService = (): UnifiedMessagingService => {
  if (!unifiedMessaging) {
    unifiedMessaging = new UnifiedMessagingService();
  }
  return unifiedMessaging;
};

export type {
  MessageRequest,
  MessageResult,
  CommunicationPreferences,
  ChannelAttempt,
  MessageContext,
};

export { UnifiedMessagingService };
