import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import dbConnect from "@/libs/mongoose";
import { authOptions } from "@/libs/next-auth";
import Family from "@/models/Family";

// Mock invitation storage - in production, use MongoDB
const invitationStore: any[] = [];

export async function GET(
  req: NextRequest,
  { params }: { params: { familyId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { familyId } = params;

    await dbConnect();

    // Verify user has access to this family
    const family = await Family.findById(familyId);
    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    const isMember = family.members.some(
      (member: any) => member.user.toString() === session.user.id,
    );

    if (!isMember && session.user.role !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Filter invitations for this family
    const familyInvitations = invitationStore.filter(
      (inv) =>
        inv.familyId === familyId &&
        (!inv.expiresAt || new Date(inv.expiresAt) > new Date()),
    );

    return NextResponse.json({
      invitations: familyInvitations,
      total: familyInvitations.length,
    });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { familyId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { familyId } = params;
    const {
      email,
      role,
      personalMessage,
      sendWelcomeEmail = true,
      setReminder = true,
      reminderDays = 3,
      memberData,
    } = await req.json();

    if (!email || !role) {
      return NextResponse.json(
        {
          error: "Email and role are required",
        },
        { status: 400 },
      );
    }

    await dbConnect();

    // Verify family exists and user has permission
    const family = await Family.findById(familyId);
    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    const userMember = family.members.find(
      (member: any) => member.user.toString() === session.user.id,
    );

    if (
      userMember?.role !== "parent" &&
      session.user.role !== "admin"
    ) {
      return NextResponse.json(
        { error: "Only parents can invite members" },
        { status: 403 },
      );
    }

    // Check if email is already invited
    const existingInvitation = invitationStore.find(
      (inv) =>
        inv.familyId === familyId &&
        inv.email.toLowerCase() === email.toLowerCase() &&
        inv.status === "pending",
    );

    if (existingInvitation) {
      return NextResponse.json(
        {
          error: "An invitation has already been sent to this email",
        },
        { status: 400 },
      );
    }

    // Create invitation
    const invitation = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      familyId,
      familyName: family.name,
      email: email.toLowerCase(),
      role,
      invitedBy: {
        id: session.user.id,
        name: session.user.name || "Family Member",
        email: session.user.email || "",
      },
      status: "pending",
      token: Math.random().toString(36).substr(2, 32),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      sentAt: new Date().toISOString(),
      personalMessage:
        personalMessage ||
        `You've been invited to join ${family.name} on ChoreMinder!`,
      reminderCount: 0,
      memberData,
    };

    // Store invitation
    invitationStore.push(invitation);

    // Send email invitation (mock implementation)
    try {
      if (sendWelcomeEmail) {
        // In a real implementation, integrate with email service like Resend
        console.log(`Sending invitation email to ${email}`);
        console.log(
          `Invitation link: ${process.env.NEXTAUTH_URL}/invite/${invitation.token}`,
        );

        // Mock email content
        const emailContent = {
          to: email,
          subject: `You're invited to join ${family.name} on ChoreMinder!`,
          html: `
            <h2>Welcome to ChoreMinder!</h2>
            <p>${invitation.personalMessage}</p>
            <p>You've been invited to join <strong>${family.name}</strong> as a ${role}.</p>
            <a href="${process.env.NEXTAUTH_URL}/invite/${invitation.token}" 
               style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Accept Invitation
            </a>
            <p><small>This invitation expires in 7 days.</small></p>
          `,
        };

        // Here you would send the actual email
        // await sendEmail(emailContent);
      }

      // Schedule reminder if requested
      if (setReminder && reminderDays > 0) {
        // In a real implementation, schedule a reminder email
        console.log(`Reminder scheduled for ${reminderDays} days`);
      }
    } catch (emailError) {
      console.error("Error sending invitation email:", emailError);
      // Don't fail the invitation creation if email fails
    }

    return NextResponse.json({
      invitation,
      message: "Invitation sent successfully",
    });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 },
    );
  }
}
