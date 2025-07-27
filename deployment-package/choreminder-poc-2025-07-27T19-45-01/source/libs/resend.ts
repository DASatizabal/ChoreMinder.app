import { Resend } from "resend";

import { renderWelcomeEmail } from "@/components/emails/WelcomeEmail";
import config from "@/config";

const isResendConfigured = Boolean(process.env.RESEND_API_KEY);
const resend = isResendConfigured ? new Resend(process.env.RESEND_API_KEY) : null;

// Centralized email service
export const emailService = {
  /**
   * Send a welcome email to a new user
   */
  sendWelcomeEmail: async (to: string, name: string) => {
    if (!resend) {
      console.warn("Resend not configured, skipping email");
      return { success: false, error: "Email service not configured" };
    }
    
    try {
      const html = await renderWelcomeEmail({
        name,
        appName: config.appName,
        dashboardUrl: `${process.env.NEXTAUTH_URL}/dashboard`,
      });

      const { data, error } = await resend.emails.send({
        from: config.resend.fromNoReply,
        to: [to],
        subject: `Welcome to ${config.appName}!`,
        html,
      });

      if (error) {
        console.error("Error sending welcome email:", error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      return { success: false, error };
    }
  },
  /* sendWelcomeEmail: async (to: string, name: string) => {
    try {
      const { data, error } = await resend.emails.send({
        from: config.resend.fromNoReply,
        to: [to],
        subject: `Welcome to ${config.appName}!`,
        html: `
          <h1>Welcome to ${config.appName}, ${name}!</h1>
          <p>We're excited to have you on board.</p>
          <p>If you have any questions, feel free to reply to this email.</p>
        `,
      });
      
      if (error) {
        console.error('Error sending welcome email:', error);
        return { success: false, error };
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return { success: false, error };
    }
  }, */

  /**
   * Send a password reset email
   */
  sendPasswordResetEmail: async (to: string, resetLink: string) => {
    if (!resend) {
      console.warn("Resend not configured, skipping email");
      return { success: false, error: "Email service not configured" };
    }
    
    try {
      const { data, error } = await resend.emails.send({
        from: config.resend.fromNoReply,
        to: [to],
        subject: `Reset your ${config.appName} password`,
        html: `
          <h1>Reset Your Password</h1>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <p>
            <a href="${resetLink}" style="display: inline-block; background-color: #0070f3; color: white; font-weight: bold; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Reset Password
            </a>
          </p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
        `,
      });

      if (error) {
        console.error("Error sending password reset email:", error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      return { success: false, error };
    }
  },

  /**
   * Send a notification email
   */
  sendNotificationEmail: async (
    to: string,
    subject: string,
    message: string,
  ) => {
    if (!resend) {
      console.warn("Resend not configured, skipping email");
      return { success: false, error: "Email service not configured" };
    }
    
    try {
      const { data, error } = await resend.emails.send({
        from: config.resend.fromAdmin,
        to: [to],
        subject,
        html: `
          <h2>${subject}</h2>
          <div>${message}</div>
        `,
      });

      if (error) {
        console.error("Error sending notification email:", error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Failed to send notification email:", error);
      return { success: false, error };
    }
  },

  /**
   * Send chore notification email (fallback for WhatsApp)
   */
  sendChoreNotificationEmail: async (
    to: string,
    subject: string,
    chore: any,
    type: string,
    options?: any,
  ) => {
    if (!resend) {
      console.warn("Resend not configured, skipping email");
      return { success: false, error: "Email service not configured" };
    }
    
    try {
      let html = "";

      switch (type) {
        case "assigned":
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #3b82f6;">🏠 New Chore Assigned</h2>
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin: 0 0 12px 0; color: #1f2937;">${chore.title}</h3>
                ${chore.description ? `<p style="color: #6b7280;">${chore.description}</p>` : ""}
                <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-top: 16px;">
                  <div><strong>Points:</strong> ${chore.points}</div>
                  ${chore.estimatedMinutes ? `<div><strong>Est. Time:</strong> ${chore.estimatedMinutes} min</div>` : ""}
                  ${chore.dueDate ? `<div><strong>Due:</strong> ${new Date(chore.dueDate).toLocaleDateString()}</div>` : ""}
                  <div><strong>Priority:</strong> ${chore.priority.toUpperCase()}</div>
                </div>
              </div>
              <p>Log in to the <a href="${process.env.NEXTAUTH_URL}/dashboard" style="color: #3b82f6;">ChoreMinder app</a> to get started!</p>
            </div>
          `;
          break;

        case "reminder":
          const isOverdue =
            chore.dueDate && new Date() > new Date(chore.dueDate);
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: ${isOverdue ? "#ef4444" : "#f59e0b"};">${isOverdue ? "⏰ Overdue" : "🔔"} Chore Reminder</h2>
              <div style="background-color: ${isOverdue ? "#fef2f2" : "#fffbeb"}; padding: 20px; border-radius: 8px; margin: 16px 0; border-left: 4px solid ${isOverdue ? "#ef4444" : "#f59e0b"};">
                <h3 style="margin: 0 0 12px 0; color: #1f2937;">${chore.title}</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 16px;">
                  <div><strong>Points:</strong> ${chore.points}</div>
                  ${chore.dueDate ? `<div><strong>Due:</strong> ${new Date(chore.dueDate).toLocaleDateString()}</div>` : ""}
                </div>
              </div>
              <p>${isOverdue ? "Don't worry - you can still complete it!" : "Don't forget to complete your chore!"}</p>
              <p><a href="${process.env.NEXTAUTH_URL}/dashboard" style="color: #3b82f6;">Complete in ChoreMinder app</a></p>
            </div>
          `;
          break;

        case "completed":
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #10b981;">✅ Chore Completed!</h2>
              <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #10b981;">
                <h3 style="margin: 0 0 12px 0; color: #1f2937;">${chore.title}</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 16px;">
                  <div><strong>Points Earned:</strong> ${chore.points}</div>
                  <div><strong>Completed:</strong> ${new Date().toLocaleString()}</div>
                </div>
              </div>
              <p>The chore is pending your approval. <a href="${process.env.NEXTAUTH_URL}/dashboard" style="color: #3b82f6;">Review in ChoreMinder app</a></p>
            </div>
          `;
          break;

        case "approved":
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #10b981;">🌟 Chore Approved!</h2>
              <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #10b981;">
                <h3 style="margin: 0 0 12px 0; color: #1f2937;">${chore.title}</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 16px;">
                  <div><strong>Points Earned:</strong> ${chore.points}</div>
                </div>
              </div>
              <p>Congratulations! Keep up the excellent work! 🏆</p>
              <p><a href="${process.env.NEXTAUTH_URL}/dashboard" style="color: #3b82f6;">View your progress</a></p>
            </div>
          `;
          break;

        case "rejected":
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #f59e0b;">🔄 Chore Needs Attention</h2>
              <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f59e0b;">
                <h3 style="margin: 0 0 12px 0; color: #1f2937;">${chore.title}</h3>
                ${options?.reason ? `<p style="color: #92400e;"><strong>Reason:</strong> ${options.reason}</p>` : ""}
              </div>
              <p>Don't worry - everyone needs practice! Please complete it again.</p>
              <p><a href="${process.env.NEXTAUTH_URL}/dashboard" style="color: #3b82f6;">Try again in ChoreMinder app</a></p>
            </div>
          `;
          break;

        default:
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>ChoreMinder Notification</h2>
              <p>You have a new chore notification.</p>
              <p><a href="${process.env.NEXTAUTH_URL}/dashboard" style="color: #3b82f6;">Check ChoreMinder app</a></p>
            </div>
          `;
      }

      const { data, error } = await resend.emails.send({
        from: config.resend.fromAdmin,
        to: [to],
        subject,
        html,
      });

      if (error) {
        console.error("Error sending chore notification email:", error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Failed to send chore notification email:", error);
      return { success: false, error };
    }
  },
};

// Export specific functions for fallback usage
export const sendChoreNotificationEmail = async (
  context: any,
  type: string,
  options?: any,
) => {
  if (!resend) {
    console.warn("Resend not configured, skipping email");
    return { success: false, error: "Email service not configured" };
  }
  
  const { user, chore } = context;

  let subject = "";
  switch (type) {
    case "assigned":
      subject = `New Chore: ${chore.title}`;
      break;
    case "reminder":
      subject = `Reminder: ${chore.title}`;
      break;
    case "completed":
      subject = `Chore Completed: ${chore.title}`;
      break;
    case "approved":
      subject = `Chore Approved: ${chore.title}`;
      break;
    case "rejected":
      subject = `Chore Needs Attention: ${chore.title}`;
      break;
    default:
      subject = "ChoreMinder Notification";
  }

  return emailService.sendChoreNotificationEmail(
    user.email,
    subject,
    chore,
    type,
    options,
  );
};
