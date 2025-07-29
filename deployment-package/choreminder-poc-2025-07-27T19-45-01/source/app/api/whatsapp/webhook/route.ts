import { dbConnect } from "@/libs/mongoose";
import { getTwilioWhatsAppService } from "@/libs/twilio-whatsapp";
import { WhatsAppMessageTemplates } from "@/libs/whatsapp-templates";
import Chore from "@/models/Chore";
import Family from "@/models/Family";
import User from "@/models/User";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const twilioService = getTwilioWhatsAppService();

    // Get webhook data
    const formData = await req.formData();
    const webhookData: any = {};

    for (const [key, value] of formData.entries()) {
      webhookData[key] = value;
    }

    // Validate webhook signature for security
    const signature = req.headers.get("x-twilio-signature") || "";
    const url = req.url;

    if (!twilioService.validateWebhook(signature, url, webhookData)) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Process the incoming message
    const incomingMessage = twilioService.processIncomingMessage(webhookData);
    console.log("Incoming WhatsApp message:", incomingMessage);

    // Find user by phone number
    const user = await User.findOne({
      phone: { $regex: incomingMessage.from.replace(/^\+/, ""), $options: "i" },
    }).populate("family");

    if (!user) {
      // Send unknown user message
      await twilioService.sendMessage({
        to: incomingMessage.from,
        body: "❌ Sorry, I don't recognize this number. Please register in the ChoreMinder app first.",
      });

      return NextResponse.json({ message: "Unknown user" });
    }

    // Parse command from message
    const command = incomingMessage.body.toUpperCase().trim();
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
          response = WhatsAppMessageTemplates.helpMessage(user);
          break;

        case "APPROVE":
          if (user.role === "parent") {
            response = await handleChoreApproval(user, true);
          } else {
            response = "❌ Only parents can approve chores.";
          }
          break;

        case "REJECT":
          if (user.role === "parent") {
            response = await handleChoreApproval(user, false);
          } else {
            response = "❌ Only parents can reject chores.";
          }
          break;

        case "ASSIGN":
          if (user.role === "parent") {
            response =
              "📋 To assign chores, please use the ChoreMinder app. You can create detailed chores with photos, due dates, and points there!";
          } else {
            response = "❌ Only parents can assign chores.";
          }
          break;

        default:
          // Check if it's a natural language completion
          if (isCompletionMessage(command)) {
            response = await handleChoreCompletion(user);
          } else {
            response = `❓ I didn't understand "${incomingMessage.body}"\n\n${WhatsAppMessageTemplates.helpMessage(user)}`;
          }
          break;
      }

      // Send response
      if (response) {
        await twilioService.sendMessage({
          to: incomingMessage.from,
          body: response,
        });
      }

      // Log the interaction
      console.log(`WhatsApp command processed: ${command} from ${user.name}`);

      return NextResponse.json({
        message: "Message processed successfully",
        command,
        user: user.name,
      });
    } catch (error: any) {
      console.error("Error processing WhatsApp command:", error);

      // Send error message to user
      await twilioService.sendMessage({
        to: incomingMessage.from,
        body: WhatsAppMessageTemplates.errorMessage(
          "Sorry, something went wrong processing your request. Please try again.",
        ),
      });

      return NextResponse.json({
        message: "Command processed with error",
        error: error.message,
      });
    }
  } catch (error: any) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

// Handle chore completion
async function handleChoreCompletion(user: any): Promise<string> {
  try {
    // Find user's pending chores
    const pendingChores = await Chore.find({
      assignedTo: user._id,
      status: "pending",
      deletedAt: null,
    }).sort({ createdAt: -1 });

    if (pendingChores.length === 0) {
      return "🎉 You don't have any pending chores! Great job staying on top of things!";
    }

    // Complete the most recent chore
    const choreToComplete = pendingChores[0];

    choreToComplete.status = "completed";
    choreToComplete.completedAt = new Date();
    choreToComplete.history.push({
      action: "completed",
      performedBy: user._id,
      timestamp: new Date(),
      note: "Completed via WhatsApp",
    });

    await choreToComplete.save();

    // Notify parents
    if (user.family) {
      const parents = await User.find({
        family: user.family._id,
        role: "parent",
        phone: { $exists: true, $ne: null },
      });

      for (const parent of parents) {
        const context = {
          user,
          chore: choreToComplete,
          family: user.family,
          parentUser: parent,
        };

        await getTwilioWhatsAppService().sendMessage({
          to: parent.phone,
          body: WhatsAppMessageTemplates.choreCompleted(context),
        });
      }
    }

    return `✅ Great job! You've completed "${choreToComplete.title}"!\n\n🏆 You've earned ${choreToComplete.points} points!\n\nYour parent will review it soon. Keep up the awesome work! 💪`;
  } catch (error: any) {
    console.error("Error handling chore completion:", error);
    return "❌ Sorry, there was an error marking your chore as complete. Please try again or use the app.";
  }
}

// Handle status request
async function handleStatusRequest(user: any): Promise<string> {
  try {
    const pendingChores = await Chore.find({
      assignedTo: user._id,
      status: "pending",
      deletedAt: null,
    }).sort({ dueDate: 1 });

    if (pendingChores.length === 0) {
      return "🎉 No pending chores! You're all caught up!";
    }

    let message = `📋 *Your Pending Chores:*\n\n`;

    pendingChores.slice(0, 5).forEach((chore, index) => {
      const dueText = chore.dueDate
        ? ` (Due: ${chore.dueDate.toLocaleDateString()})`
        : "";
      message += `${index + 1}. ${chore.title}${dueText}\n   🏆 ${chore.points} points\n\n`;
    });

    if (pendingChores.length > 5) {
      message += `... and ${pendingChores.length - 5} more chores.\n\n`;
    }

    message += "Reply *DONE* to complete your next chore!";

    return message;
  } catch (error: any) {
    console.error("Error handling status request:", error);
    return "❌ Sorry, there was an error getting your chore status. Please try again.";
  }
}

// Handle points request
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

    return `🏆 *Your Points Summary:*

💎 Total Points: ${totalPoints}
📅 This Week: ${weeklyPoints}
✅ Completed Chores: ${approvedChores.length}

${weeklyPoints > 0 ? "Great work this week! 🌟" : "Ready to earn some points? Check your pending chores! 💪"}`;
  } catch (error: any) {
    console.error("Error handling points request:", error);
    return "❌ Sorry, there was an error getting your points. Please try again.";
  }
}

// Handle chore approval (for parents)
async function handleChoreApproval(
  user: any,
  approve: boolean,
): Promise<string> {
  try {
    // Find the most recent completed chore in the family
    const completedChore = await Chore.findOne({
      status: "completed",
      deletedAt: null,
    })
      .populate("assignedTo", "name family")
      .sort({ completedAt: -1 });

    if (!completedChore) {
      return "📋 No chores are currently waiting for approval.";
    }

    // Check if chore is in same family
    if (
      completedChore.assignedTo.family.toString() !== user.family._id.toString()
    ) {
      return "📋 No chores from your family are waiting for approval.";
    }

    // Update chore status
    completedChore.status = approve ? "approved" : "pending";
    completedChore.history.push({
      action: approve ? "approved" : "rejected",
      performedBy: user._id,
      timestamp: new Date(),
      note: `${approve ? "Approved" : "Rejected"} via WhatsApp`,
    });

    await completedChore.save();

    // Notify the child
    if (completedChore.assignedTo.phone) {
      const context = {
        user: completedChore.assignedTo,
        chore: completedChore,
        family: user.family,
      };

      const childMessage = approve
        ? WhatsAppMessageTemplates.choreApproved(context)
        : WhatsAppMessageTemplates.choreRejected(context);

      await getTwilioWhatsAppService().sendMessage({
        to: completedChore.assignedTo.phone,
        body: childMessage,
      });
    }

    const action = approve ? "approved" : "rejected";
    return `✅ Chore "${completedChore.title}" has been ${action}!\n\n${completedChore.assignedTo.name} has been notified.`;
  } catch (error: any) {
    console.error("Error handling chore approval:", error);
    return "❌ Sorry, there was an error processing the approval. Please try again.";
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
    "COMPLETE",
  ];

  return completionPhrases.some(
    (phrase) =>
      message.includes(phrase) || message.includes(phrase.toLowerCase()),
  );
}

// Handle delivery status webhooks
export async function PUT(req: NextRequest) {
  try {
    const twilioService = getTwilioWhatsAppService();

    const formData = await req.formData();
    const webhookData: any = {};

    for (const [key, value] of formData.entries()) {
      webhookData[key] = value;
    }

    // Process delivery status
    const deliveryStatus = twilioService.processDeliveryStatus(webhookData);

    console.log("WhatsApp delivery status:", deliveryStatus);

    // Optionally update database with delivery status
    // This could be used for analytics or retry logic

    return NextResponse.json({ message: "Delivery status processed" });
  } catch (error: any) {
    console.error("WhatsApp delivery status webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
