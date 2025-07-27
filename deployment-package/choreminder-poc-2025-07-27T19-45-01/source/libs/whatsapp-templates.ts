import { getTwilioWhatsAppService, WhatsAppMessage } from "./twilio-whatsapp";

interface User {
  _id: string;
  name: string;
  phone?: string;
  role: "parent" | "child" | "admin";
}

interface Chore {
  _id: string;
  title: string;
  description?: string;
  assignedTo: User;
  createdBy: User;
  dueDate?: Date;
  estimatedMinutes?: number;
  points: number;
  status: "pending" | "in_progress" | "completed" | "approved" | "rejected";
  priority: "low" | "medium" | "high";
  category?: string;
  recurrence?: {
    type: "daily" | "weekly" | "monthly";
    interval: number;
  };
}

interface Family {
  _id: string;
  name: string;
  members: User[];
}

interface MessageContext {
  user: User;
  chore: Chore;
  family: Family;
  parentUser?: User;
}

class WhatsAppMessageTemplates {
  /**
   * Generate chore assignment message
   */
  static choreAssigned(context: MessageContext): string {
    const { user, chore, family } = context;
    const dueText = chore.dueDate
      ? ` by ${chore.dueDate.toLocaleDateString()}`
      : "";
    const estimatedText = chore.estimatedMinutes
      ? ` (~${chore.estimatedMinutes} min)`
      : "";

    return `🏠 *ChoreMinder - New Chore Assigned*

Hi ${user.name}! 👋

You've been assigned a new chore in the ${family.name} family:

📋 *${chore.title}*
${chore.description ? `📝 ${chore.description}\n` : ""}🏆 Points: ${chore.points}
⏱️ Estimated time${estimatedText}
📅 Due${dueText}
🔥 Priority: ${chore.priority.toUpperCase()}

${this.getMotivationalMessage(chore.priority)}

Reply with *DONE* when completed or *HELP* for assistance.`;
  }

  /**
   * Generate chore reminder message
   */
  static choreReminder(context: MessageContext): string {
    const { user, chore } = context;
    const isOverdue = chore.dueDate && new Date() > chore.dueDate;

    if (isOverdue) {
      return `⏰ *OVERDUE CHORE REMINDER*

Hi ${user.name}! 

Your chore "${chore.title}" was due ${chore.dueDate?.toLocaleDateString()}.

Don't worry - you can still complete it! 💪

Reply *DONE* when finished or *HELP* if you need assistance.`;
    }

    return `🔔 *Chore Reminder*

Hi ${user.name}! 

Don't forget about your chore:

📋 *${chore.title}*
🏆 ${chore.points} points
${chore.dueDate ? `📅 Due: ${chore.dueDate.toLocaleDateString()}\n` : ""}
Reply *DONE* when completed! 🎯`;
  }

  /**
   * Generate chore completion confirmation
   */
  static choreCompleted(context: MessageContext): string {
    const { user, chore, parentUser } = context;

    if (parentUser) {
      // Message to parent
      return `✅ *Chore Completed*

Great news! ${user.name} has completed:

📋 *${chore.title}*
🏆 ${chore.points} points earned
⏱️ Completed: ${new Date().toLocaleTimeString()}

The chore is pending your approval. Review it in the ChoreMinder app.

Reply *APPROVE* to approve or *REJECT* to request changes.`;
    } else {
      // Confirmation to child
      return `🎉 *Chore Completed!*

Awesome job, ${user.name}! 

You've completed "${chore.title}" and earned ${chore.points} points! 🏆

Your parent will review and approve it soon. Keep up the great work! 💪`;
    }
  }

  /**
   * Generate chore approval message
   */
  static choreApproved(context: MessageContext): string {
    const { user, chore } = context;

    return `🌟 *Chore Approved!*

Congratulations, ${user.name}! 

Your chore "${chore.title}" has been approved! 

🏆 You've earned ${chore.points} points!
⭐ Keep up the excellent work!

${this.getCelebrationMessage()}`;
  }

  /**
   * Generate chore rejection message
   */
  static choreRejected(context: MessageContext, reason?: string): string {
    const { user, chore } = context;

    return `🔄 *Chore Needs Attention*

Hi ${user.name},

Your chore "${chore.title}" needs to be redone.

${reason ? `📝 Reason: ${reason}\n` : ""}
Don't worry - everyone needs practice! 💪

Please complete it again and reply *DONE* when finished.`;
  }

  /**
   * Generate daily progress summary
   */
  static dailyProgress(user: User, stats: any): string {
    const { completed, pending, points, streak } = stats;

    return `📊 *Daily Progress Summary*

Hi ${user.name}! Here's your day so far:

✅ Completed: ${completed} chores
📋 Pending: ${pending} chores
🏆 Points earned: ${points}
🔥 Streak: ${streak} days

${this.getProgressEncouragement(completed, pending)}

Keep going! 💪`;
  }

  /**
   * Generate weekly achievement message
   */
  static weeklyAchievement(user: User, achievement: any): string {
    return `🏆 *Weekly Achievement Unlocked!*

Congratulations, ${user.name}! 🎉

You've earned the "${achievement.name}" achievement!

${achievement.description}

🏆 Bonus points: ${achievement.points}
⭐ Keep up the amazing work!

Your family is proud of you! 👨‍👩‍👧‍👦`;
  }

  /**
   * Generate family leaderboard update
   */
  static familyLeaderboard(family: Family, leaderboard: any[]): string {
    const topPerformers = leaderboard.slice(0, 3);

    let message = `🏆 *${family.name} Family Leaderboard*\n\nThis week's top performers:\n\n`;

    topPerformers.forEach((member, index) => {
      const medal = ["🥇", "🥈", "🥉"][index] || "🏅";
      message += `${medal} ${member.name}: ${member.points} points\n`;
    });

    message += `\nKeep working together! 👨‍👩‍👧‍👦💪`;

    return message;
  }

  /**
   * Generate help message with commands
   */
  static helpMessage(user: User): string {
    return `❓ *ChoreMinder Help*

Hi ${user.name}! Here are the commands you can use:

*DONE* - Mark current chore as completed
*STATUS* - Check your pending chores
*POINTS* - See your current points
*HELP* - Show this help message

${
  user.role === "parent"
    ? `\n*Parent Commands:*
*APPROVE* - Approve last completed chore
*REJECT* - Reject last completed chore
*ASSIGN* - Get help with assigning chores\n`
    : ""
}
Need more help? Contact your family admin or check the ChoreMinder app! 📱`;
  }

  /**
   * Generate error message
   */
  static errorMessage(error: string): string {
    return `❌ *Oops! Something went wrong*

${error}

Please try again or contact support if the problem persists.

Reply *HELP* for available commands.`;
  }

  /**
   * Generate service unavailable message
   */
  static serviceUnavailable(): string {
    return `🚫 *Service Temporarily Unavailable*

ChoreMinder is currently undergoing maintenance.

Your message has been saved and will be processed when service is restored.

Thank you for your patience! 🙏`;
  }

  /**
   * Get motivational message based on priority
   */
  private static getMotivationalMessage(priority: string): string {
    const messages = {
      high: "This is important - tackle it first! 🔥",
      medium: "You've got this! Take your time and do it well. 💪",
      low: "Perfect for when you have some free time! 😊",
    };

    return messages[priority as keyof typeof messages] || messages.medium;
  }

  /**
   * Get progress encouragement
   */
  private static getProgressEncouragement(
    completed: number,
    pending: number,
  ): string {
    if (completed === 0 && pending > 0) {
      return "Ready to start your day? You've got this! 🚀";
    } else if (pending === 0) {
      return "Amazing! You've completed everything for today! 🌟";
    } else if (completed > pending) {
      return "You're on fire! Just a few more to go! 🔥";
    } else {
      return "Great progress! Keep up the momentum! 💫";
    }
  }

  /**
   * Get celebration message
   */
  private static getCelebrationMessage(): string {
    const messages = [
      "You're a chore champion! 🏆",
      "Your hard work is paying off! 💎",
      "Keep shining bright! ⭐",
      "You're making your family proud! 👨‍👩‍👧‍👦",
      "Excellence in action! 🚀",
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }
}

/**
 * Main function to send WhatsApp messages with fallback to email
 */
export class WhatsAppMessenger {
  private twilioService = getTwilioWhatsAppService();

  /**
   * Send chore notification with fallback
   */
  async sendChoreNotification(
    context: MessageContext,
    type: "assigned" | "reminder" | "completed" | "approved" | "rejected",
    options?: { reason?: string; fallbackToEmail?: boolean },
  ): Promise<{
    success: boolean;
    method: "whatsapp" | "email";
    error?: string;
  }> {
    const { user } = context;
    const { fallbackToEmail = true } = options || {};

    // Check if user has WhatsApp number
    if (!user.phone) {
      if (fallbackToEmail) {
        return this.fallbackToEmail(context, type, options);
      }
      return {
        success: false,
        method: "whatsapp",
        error: "No phone number provided",
      };
    }

    // Generate message based on type
    let messageBody: string;
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
        messageBody = "Unknown notification type";
    }

    // Send WhatsApp message
    try {
      const response = await this.twilioService.sendMessage({
        to: user.phone,
        body: messageBody,
      });

      if (response.status === "failed") {
        console.error("WhatsApp message failed:", response.errorMessage);

        if (fallbackToEmail) {
          return this.fallbackToEmail(context, type, options);
        }

        return {
          success: false,
          method: "whatsapp",
          error: response.errorMessage,
        };
      }

      console.log(`WhatsApp message sent successfully: ${response.sid}`);
      return { success: true, method: "whatsapp" };
    } catch (error: any) {
      console.error("WhatsApp service error:", error);

      if (fallbackToEmail) {
        return this.fallbackToEmail(context, type, options);
      }

      return {
        success: false,
        method: "whatsapp",
        error: error.message,
      };
    }
  }

  /**
   * Send bulk notifications to family members
   */
  async sendBulkNotifications(
    contexts: MessageContext[],
    type: "assigned" | "reminder" | "completed" | "approved" | "rejected",
    options?: { reason?: string; fallbackToEmail?: boolean },
  ): Promise<
    Array<{
      userId: string;
      success: boolean;
      method: "whatsapp" | "email";
      error?: string;
    }>
  > {
    const results = await Promise.allSettled(
      contexts.map((context) =>
        this.sendChoreNotification(context, type, options),
      ),
    );

    return results.map((result, index) => ({
      userId: contexts[index].user._id,
      ...(result.status === "fulfilled"
        ? result.value
        : {
            success: false,
            method: "whatsapp" as const,
            error: result.reason?.message,
          }),
    }));
  }

  /**
   * Fallback to email notification
   */
  private async fallbackToEmail(
    context: MessageContext,
    type: string,
    options?: any,
  ): Promise<{ success: boolean; method: "email"; error?: string }> {
    try {
      // Import email service dynamically to avoid circular dependencies
      const { sendChoreNotificationEmail } = await import("./emails");

      await sendChoreNotificationEmail(context, type, options);

      console.log("Fallback email sent successfully");
      return { success: true, method: "email" };
    } catch (error: any) {
      console.error("Email fallback failed:", error);
      return {
        success: false,
        method: "email",
        error: error.message,
      };
    }
  }

  /**
   * Check if WhatsApp is available for user
   */
  isWhatsAppAvailable(user: User): boolean {
    return !!(user.phone && this.twilioService.isConfigured());
  }

  /**
   * Get service status
   */
  getServiceStatus() {
    return this.twilioService.getServiceInfo();
  }
}

// Export templates and messenger
export { WhatsAppMessageTemplates, WhatsAppMessenger };

// Export singleton instance
export const whatsAppMessenger = new WhatsAppMessenger();
