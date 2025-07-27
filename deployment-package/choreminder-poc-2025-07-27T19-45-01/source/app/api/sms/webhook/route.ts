import { NextRequest, NextResponse } from "next/server";

import { dbConnect } from "@/libs/mongoose";
import { getTwilioSMSService } from "@/libs/twilio-sms";
import Chore from "@/models/Chore";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const smsService = getTwilioSMSService();

    // Get webhook data
    const formData = await req.formData();
    const webhookData: any = {};

    for (const [key, value] of formData.entries()) {
      webhookData[key] = value;
    }

    // Validate webhook signature for security
    const signature = req.headers.get("x-twilio-signature") || "";
    const url = req.url;

    if (!smsService.validateWebhook(signature, url, webhookData)) {
      console.error("Invalid SMS webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Process the incoming SMS
    const incomingSMS = smsService.processIncomingSMS(webhookData);
    console.log("Incoming SMS message:", incomingSMS);

    // Find user by phone number
    const user = await User.findOne({
      phone: { $regex: incomingSMS.from.replace(/^\+/, ""), $options: "i" },
    }).populate("family");

    if (!user) {
      // Send unknown user message
      await smsService.sendMessage({
        to: incomingSMS.from,
        body: "ChoreMinder: Sorry, I don't recognize this number. Please register in the app first.",
      });

      return NextResponse.json({ message: "Unknown user" });
    }

    // Parse command from message
    const command = incomingSMS.body.toUpperCase().trim();
    let response = "";

    try {
      switch (command) {
        case "DONE":
        case "COMPLETE":
        case "FINISHED":
          response = await handleChoreCompletion(user);
          break;

        case "STATUS":
        case "LIST":
          response = await handleStatusRequest(user);
          break;

        case "POINTS":
        case "SCORE":
          response = await handlePointsRequest(user);
          break;

        case "HELP":
        case "COMMANDS":
          response = generateHelpMessage(user);
          break;

        case "STOP":
        case "UNSUBSCRIBE":
          response = await handleUnsubscribe(user);
          break;

        case "START":
        case "SUBSCRIBE":
          response = await handleSubscribe(user);
          break;

        default:
          // Check if it's a natural language completion
          if (isCompletionMessage(command)) {
            response = await handleChoreCompletion(user);
          } else {
            response = `ChoreMinder: I didn't understand "${incomingSMS.body}". Text HELP for commands.`;
          }
          break;
      }

      // Send response (keep SMS short and simple)
      if (response) {
        await smsService.sendMessage({
          to: incomingSMS.from,
          body: response,
        });
      }

      // Log the interaction
      console.log(`SMS command processed: ${command} from ${user.name}`);

      return NextResponse.json({
        message: "SMS processed successfully",
        command,
        user: user.name,
      });
    } catch (error: any) {
      console.error("Error processing SMS command:", error);

      // Send error message to user
      await smsService.sendMessage({
        to: incomingSMS.from,
        body: "ChoreMinder: Sorry, something went wrong. Please try again or use the app.",
      });

      return NextResponse.json({
        message: "SMS processed with error",
        error: error.message,
      });
    }
  } catch (error: any) {
    console.error("SMS webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

// Handle chore completion via SMS
async function handleChoreCompletion(user: any): Promise<string> {
  try {
    // Find user's pending chores
    const pendingChores = await Chore.find({
      assignedTo: user._id,
      status: "pending",
      deletedAt: null,
    }).sort({ createdAt: -1 });

    if (pendingChores.length === 0) {
      return "ChoreMinder: No pending chores! Great job!";
    }

    // Complete the most recent chore
    const choreToComplete = pendingChores[0];

    choreToComplete.status = "completed";
    choreToComplete.completedAt = new Date();
    choreToComplete.history.push({
      action: "completed",
      performedBy: user._id,
      timestamp: new Date(),
      note: "Completed via SMS",
    });

    await choreToComplete.save();

    // Notify parents via SMS
    if (user.family) {
      const parents = await User.find({
        family: user.family._id,
        role: "parent",
        phone: { $exists: true, $ne: null },
      });

      const smsService = getTwilioSMSService();
      for (const parent of parents) {
        await smsService.sendMessage({
          to: parent.phone,
          body: `ChoreMinder: ${user.name} completed "${choreToComplete.title}" (${choreToComplete.points} pts). Review in app to approve.`,
        });
      }
    }

    return `ChoreMinder: Great! "${choreToComplete.title}" completed. Earned ${choreToComplete.points} points. Parent will review.`;
  } catch (error: any) {
    console.error("Error handling SMS chore completion:", error);
    return "ChoreMinder: Error completing chore. Please try again or use the app.";
  }
}

// Handle status request via SMS
async function handleStatusRequest(user: any): Promise<string> {
  try {
    const pendingChores = await Chore.find({
      assignedTo: user._id,
      status: "pending",
      deletedAt: null,
    }).sort({ dueDate: 1 });

    if (pendingChores.length === 0) {
      return "ChoreMinder: No pending chores! You're all caught up!";
    }

    let message = `ChoreMinder: ${pendingChores.length} pending chores:\n`;

    pendingChores.slice(0, 3).forEach((chore, index) => {
      const dueText = chore.dueDate
        ? ` (Due: ${chore.dueDate.toLocaleDateString()})`
        : "";
      message += `${index + 1}. ${chore.title} - ${chore.points}pts${dueText}\n`;
    });

    if (pendingChores.length > 3) {
      message += `...and ${pendingChores.length - 3} more. Check app for full list.`;
    } else {
      message += "Text DONE to complete your next chore!";
    }

    return message;
  } catch (error: any) {
    console.error("Error handling SMS status request:", error);
    return "ChoreMinder: Error getting status. Please try again.";
  }
}

// Handle points request via SMS
async function handlePointsRequest(user: any): Promise<string> {
  try {
    const approvedChores = await Chore.find({
      assignedTo: user._id,
      status: "approved",
      deletedAt: null,
    });

    const totalPoints = approvedChores.reduce(
      (sum, chore) => sum + chore.points,
      0,
    );
    const thisWeekChores = approvedChores.filter((chore) => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return chore.completedAt && chore.completedAt > weekAgo;
    });

    const weeklyPoints = thisWeekChores.reduce(
      (sum, chore) => sum + chore.points,
      0,
    );

    return `ChoreMinder: You have ${totalPoints} total points! This week: ${weeklyPoints} points from ${thisWeekChores.length} chores. Keep it up!`;
  } catch (error: any) {
    console.error("Error handling SMS points request:", error);
    return "ChoreMinder: Error getting points. Please try again.";
  }
}

// Generate help message for SMS
function generateHelpMessage(user: any): string {
  let message = "ChoreMinder SMS Commands:\n";
  message += "DONE - Complete your next chore\n";
  message += "STATUS - Check pending chores\n";
  message += "POINTS - See your points\n";
  message += "HELP - Show this message\n";
  message += "STOP - Unsubscribe from SMS\n";

  if (user.role === "parent") {
    message += "\nParent: Use the app for full features!";
  }

  return message;
}

// Handle unsubscribe
async function handleUnsubscribe(user: any): Promise<string> {
  try {
    // Update user preferences to disable SMS
    await User.findByIdAndUpdate(user._id, {
      $set: {
        "communicationPreferences.enabledNotifications.choreAssigned": false,
        "communicationPreferences.enabledNotifications.choreReminder": false,
        "communicationPreferences.enabledNotifications.choreCompleted": false,
        "communicationPreferences.enabledNotifications.choreApproved": false,
        "communicationPreferences.enabledNotifications.choreRejected": false,
      },
    });

    return "ChoreMinder: You've been unsubscribed from SMS notifications. You can re-enable them in the app. Text START to resubscribe.";
  } catch (error) {
    return "ChoreMinder: Error processing unsubscribe. Please contact support.";
  }
}

// Handle subscribe
async function handleSubscribe(user: any): Promise<string> {
  try {
    // Update user preferences to enable SMS
    await User.findByIdAndUpdate(user._id, {
      $set: {
        "communicationPreferences.enabledNotifications.choreAssigned": true,
        "communicationPreferences.enabledNotifications.choreReminder": true,
        "communicationPreferences.enabledNotifications.choreCompleted": true,
        "communicationPreferences.enabledNotifications.choreApproved": true,
        "communicationPreferences.enabledNotifications.choreRejected": true,
      },
    });

    return "ChoreMinder: You're now subscribed to SMS notifications! Text HELP for commands or STOP to unsubscribe.";
  } catch (error) {
    return "ChoreMinder: Error processing subscription. Please contact support.";
  }
}

// Check if message is a natural language completion
function isCompletionMessage(message: string): boolean {
  const completionPhrases = [
    "COMPLETED",
    "FINISH",
    "I'M DONE",
    "ALL DONE",
    "TASK DONE",
    "CHORE DONE",
    "YES",
    "OK",
    "GOOD",
  ];

  return completionPhrases.some(
    (phrase) =>
      message.includes(phrase) || message.includes(phrase.toLowerCase()),
  );
}

// Handle delivery status webhooks
export async function PUT(req: NextRequest) {
  try {
    const smsService = getTwilioSMSService();

    const formData = await req.formData();
    const webhookData: any = {};

    for (const [key, value] of formData.entries()) {
      webhookData[key] = value;
    }

    // Process delivery status
    console.log("SMS delivery status:", {
      messageSid: webhookData.MessageSid,
      status: webhookData.MessageStatus,
      errorCode: webhookData.ErrorCode,
      errorMessage: webhookData.ErrorMessage,
    });

    // Optionally update database with delivery status
    // This could be used for analytics or retry logic

    return NextResponse.json({ message: "SMS delivery status processed" });
  } catch (error: any) {
    console.error("SMS delivery status webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
