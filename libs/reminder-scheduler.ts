// libs/reminder-scheduler.ts
import dbConnect from "@/libs/mongoose";
import Chore from "@/models/Chore";
import Family from "@/models/Family";
import NotificationPreferences from "@/models/NotificationPreferences";
import User from "@/models/User";

import { notificationService } from "./notification-service";

export interface ReminderJob {
  choreId: string;
  userId: string;
  familyId: string;
  reminderType: "first" | "second" | "final";
  scheduledFor: Date;
}

// Reminder scheduler service
export const reminderScheduler = {
  /**
   * Schedule reminders for a chore based on user preferences
   */
  scheduleRemindersForChore: async (choreId: string) => {
    try {
      await dbConnect();

      const chore = await Chore.findById(choreId)
        .populate("assignedTo", "email name")
        .populate("family", "name");

      if (!chore || !chore.dueDate || !chore.assignedTo) {
        console.log("Chore not found or missing required data for reminders");
        return;
      }

      // Skip if chore is already completed or verified
      if (["completed", "verified"].includes(chore.status)) {
        console.log("Chore already completed, skipping reminders");
        return;
      }

      // Get user's notification preferences
      let preferences = await NotificationPreferences.findOne({
        user: chore.assignedTo._id,
        family: chore.family._id,
      });

      if (!preferences) {
        preferences = await NotificationPreferences.create({
          user: chore.assignedTo._id,
          family: chore.family._id,
          email: { enabled: true, choreReminders: true },
          push: { enabled: true, choreReminders: true },
        });
      }

      if (!preferences.email.enabled || !preferences.email.choreReminders) {
        console.log("User has disabled chore reminders");
        return;
      }

      const now = new Date();
      const dueDate = new Date(chore.dueDate);

      // Calculate reminder times based on preferences
      const firstReminderTime = new Date(dueDate);
      firstReminderTime.setDate(
        dueDate.getDate() - preferences.reminderTiming.firstReminder,
      );

      const secondReminderTime = new Date(dueDate);
      secondReminderTime.setDate(
        dueDate.getDate() - preferences.reminderTiming.secondReminder,
      );

      const finalReminderTime = new Date(dueDate);
      finalReminderTime.setHours(
        dueDate.getHours() - preferences.reminderTiming.finalReminder,
      );

      // Schedule reminders that are in the future
      const reminders = [];

      if (
        firstReminderTime > now &&
        preferences.reminderTiming.firstReminder > 0
      ) {
        reminders.push({
          type: "first",
          scheduledFor: firstReminderTime,
          daysUntilDue: preferences.reminderTiming.firstReminder,
        });
      }

      if (
        secondReminderTime > now &&
        preferences.reminderTiming.secondReminder > 0
      ) {
        reminders.push({
          type: "second",
          scheduledFor: secondReminderTime,
          daysUntilDue: preferences.reminderTiming.secondReminder,
        });
      }

      if (
        finalReminderTime > now &&
        preferences.reminderTiming.finalReminder > 0
      ) {
        reminders.push({
          type: "final",
          scheduledFor: finalReminderTime,
          daysUntilDue: 0, // Same day
        });
      }

      console.log(
        `Scheduled ${reminders.length} reminders for chore ${choreId}`,
      );
      return reminders;
    } catch (error) {
      console.error("Error scheduling chore reminders:", error);
    }
  },

  /**
   * Process due reminders (to be called by cron job or scheduler)
   */
  processDueReminders: async () => {
    try {
      await dbConnect();

      const now = new Date();
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Find chores that need reminders
      const choresDueForReminders = await Chore.find({
        dueDate: { $gte: now, $lte: oneDayFromNow },
        status: { $in: ["pending", "in_progress"] },
        assignedTo: { $exists: true, $ne: null },
      })
        .populate("assignedTo", "email name")
        .populate("assignedBy", "name")
        .populate("family", "name");

      console.log(
        `Found ${choresDueForReminders.length} chores due for reminders`,
      );

      for (const chore of choresDueForReminders) {
        try {
          // Skip if no assignedTo, family, or dueDate
          if (!chore.assignedTo || !chore.family || !chore.dueDate) {
            continue;
          }

          // Get user preferences
          let preferences = await NotificationPreferences.findOne({
            user: chore.assignedTo._id,
            family: chore.family._id,
          });

          if (!preferences) {
            preferences = await NotificationPreferences.create({
              user: chore.assignedTo._id,
              family: chore.family._id,
              email: { enabled: true, choreReminders: true },
              push: { enabled: true, choreReminders: true },
            });
          }

          // Skip if user has disabled reminders
          if (!preferences.email.enabled || !preferences.email.choreReminders) {
            continue;
          }

          // Check quiet hours (simplified check - always allow for now)
          // TODO: Implement proper quiet hours checking if needed

          // Calculate days until due
          const daysUntilDue = Math.ceil(
            (chore.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );

          // Check if we should send a reminder based on preferences
          let shouldSendReminder = false;

          if (daysUntilDue <= 0) {
            // Overdue or due today
            shouldSendReminder = true;
          } else if (
            daysUntilDue === preferences.reminderTiming.firstReminder
          ) {
            shouldSendReminder = true;
          } else if (
            daysUntilDue === preferences.reminderTiming.secondReminder
          ) {
            shouldSendReminder = true;
          } else if (
            daysUntilDue === 0 &&
            chore.dueDate.getTime() - now.getTime() <=
              preferences.reminderTiming.finalReminder * 60 * 60 * 1000
          ) {
            shouldSendReminder = true;
          }

          if (shouldSendReminder) {
            // Check rate limiting - don't send more than one reminder per day
            const lastReminderTime =
              preferences.lastNotifications?.choreReminder;
            if (lastReminderTime) {
              const hoursSinceLastReminder =
                (now.getTime() - lastReminderTime.getTime()) / (1000 * 60 * 60);
              if (hoursSinceLastReminder < 12) {
                // At least 12 hours between reminders
                console.log(
                  `Rate limiting: Skipping reminder for chore ${chore._id}`,
                );
                continue;
              }
            }

            // Send reminder
            const result =
              await notificationService.sendChoreReminderNotification({
                choreId: chore._id.toString(),
                choreTitle: chore.title,
                choreDescription: chore.description,
                assignedTo: {
                  id: chore.assignedTo._id.toString(),
                  name: (chore.assignedTo as any).name || "User",
                  email: (chore.assignedTo as any).email || "",
                },
                assignedBy: {
                  id: (chore.assignedBy as any)?._id?.toString() || "",
                  name: (chore.assignedBy as any)?.name || "Parent",
                  email: (chore.assignedBy as any)?.email || "",
                },
                family: {
                  id: chore.family._id.toString(),
                  name: (chore.family as any).name || "Family",
                },
                dueDate: chore.dueDate,
                daysUntilDue: Math.max(0, daysUntilDue),
                priority: chore.priority,
                points: chore.points,
                requiresPhotoVerification: chore.requiresPhotoVerification,
              });

            if (result.success) {
              // Update last notification timestamp
              await NotificationPreferences.findByIdAndUpdate(preferences._id, {
                lastNotifications: {
                  ...preferences.lastNotifications,
                  choreReminder: new Date(),
                },
              });
              console.log(
                `Sent reminder for chore ${chore._id} to ${(chore.assignedTo as any).email || "user"}`,
              );
            } else {
              console.error(
                `Failed to send reminder for chore ${chore._id}:`,
                result.error,
              );
            }
          }
        } catch (error) {
          console.error(
            `Error processing reminder for chore ${chore._id}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error("Error processing due reminders:", error);
    }
  },

  /**
   * Process daily digests (to be called by cron job)
   */
  processDailyDigests: async () => {
    try {
      await dbConnect();

      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

      // Find users who want daily digests at this time
      const preferences = await NotificationPreferences.find({
        "email.enabled": true,
        "email.dailyDigest": true,
        dailyDigestTime: currentTime,
      })
        .populate("user", "email name")
        .populate("family", "name");

      console.log(
        `Found ${preferences.length} users for daily digest at ${currentTime}`,
      );

      for (const pref of preferences) {
        try {
          // Check if we've already sent today's digest
          const lastDigestTime = pref.lastNotifications?.dailyDigest;
          if (
            lastDigestTime &&
            lastDigestTime.toISOString().split("T")[0] === today
          ) {
            continue; // Already sent today
          }

          // Check quiet hours (simplified check - always allow for now)
          // TODO: Implement proper quiet hours checking if needed

          // Get family stats for today
          const yesterdayStart = new Date(now);
          yesterdayStart.setDate(yesterdayStart.getDate() - 1);
          yesterdayStart.setHours(0, 0, 0, 0);

          const todayEnd = new Date(now);
          todayEnd.setHours(23, 59, 59, 999);

          // Get completed chores
          const completedChores = await Chore.find({
            family: pref.family._id,
            status: { $in: ["completed", "verified"] },
            completedAt: { $gte: yesterdayStart, $lte: todayEnd },
          }).populate("assignedTo", "name");

          // Get overdue chores
          const overdueChores = await Chore.find({
            family: pref.family._id,
            dueDate: { $lt: now },
            status: { $in: ["pending", "in_progress"] },
          }).populate("assignedTo", "name");

          // Get pending photo approvals
          const pendingApprovals = await Chore.countDocuments({
            family: pref.family._id,
            "photoVerification.status": "pending",
          });

          const digest = {
            completedChores: completedChores.map((chore) => ({
              title: chore.title,
              completedBy: (chore.assignedTo as any)?.name || "Unknown",
              points: chore.points,
            })),
            overdueChores: overdueChores.map((chore) => ({
              title: chore.title,
              assignedTo: (chore.assignedTo as any)?.name || "Unknown",
              daysOverdue: Math.ceil(
                (now.getTime() - (chore.dueDate as any).getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            })),
            pendingApprovals,
            totalPointsEarned: completedChores.reduce(
              (total, chore) => total + chore.points,
              0,
            ),
          };

          // Send digest
          const result = await notificationService.sendDailyDigest(
            (pref.user as any).email || "user@example.com",
            (pref.family as any).name || "Family",
            digest,
          );

          if (result.success) {
            await NotificationPreferences.findByIdAndUpdate(pref._id, {
              lastNotifications: {
                ...pref.lastNotifications,
                dailyDigest: new Date(),
              },
            });
            console.log(
              `Sent daily digest to ${(pref.user as any).email || "user"}`,
            );
          } else {
            console.error(
              `Failed to send daily digest to ${(pref.user as any).email || "user"}:`,
              result.error,
            );
          }
        } catch (error) {
          console.error(
            `Error processing daily digest for user ${pref.user._id}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error("Error processing daily digests:", error);
    }
  },

  /**
   * Get reminder statistics for debugging
   */
  getReminderStats: async (familyId?: string) => {
    try {
      await dbConnect();

      const query = familyId ? { family: familyId } : {};

      const now = new Date();
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const stats = {
        choresDueToday: await Chore.countDocuments({
          ...query,
          dueDate: { $gte: now, $lt: oneDayFromNow },
          status: { $in: ["pending", "in_progress"] },
        }),
        choresDueThisWeek: await Chore.countDocuments({
          ...query,
          dueDate: { $gte: now, $lt: oneWeekFromNow },
          status: { $in: ["pending", "in_progress"] },
        }),
        overdueChores: await Chore.countDocuments({
          ...query,
          dueDate: { $lt: now },
          status: { $in: ["pending", "in_progress"] },
        }),
        usersWithRemindersEnabled: await NotificationPreferences.countDocuments(
          {
            ...(familyId ? { family: familyId } : {}),
            "email.enabled": true,
            "email.choreReminders": true,
          },
        ),
        usersWithDailyDigest: await NotificationPreferences.countDocuments({
          ...(familyId ? { family: familyId } : {}),
          "email.enabled": true,
          "email.dailyDigest": true,
        }),
      };

      return stats;
    } catch (error) {
      console.error("Error getting reminder stats:", error);
      return null;
    }
  },
};
