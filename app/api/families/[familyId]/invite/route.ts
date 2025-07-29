// app/api/families/[id]/invite/route.ts
import crypto from "crypto";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { sendFamilyInvitationEmail } from "@/libs/email";
import { addEmailLog } from "@/libs/email-storage";
import dbConnect from "@/libs/mongoose";
import { authOptions } from "@/libs/next-auth";
import Family from "@/models/Family";
import User from "@/models/User";

interface RouteParams {
  params: {
    familyId: string;
  };
}

// POST /api/families/[familyId]/invite - Create invitation code
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    console.log(`📨 [INVITE API] Called with familyId: ${params.familyId}`);

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, role = "child" } = await req.json();
    console.log(`📨 [INVITE API] Request data:`, {
      email,
      role,
      userId: session.user.id,
    });

    // Validate email
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 },
      );
    }

    // Validate role
    const validRoles = ["parent", "child", "admin"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be parent, child, or admin" },
        { status: 400 },
      );
    }

    // Handle mock family data for development
    if (params.familyId === "mock_family_id") {
      // Generate invite code for mock family
      const inviteCode = crypto.randomBytes(8).toString("hex").toUpperCase();

      // Log the email sending attempt
      console.log(`📧 [EMAIL LOG] Invitation sent:`, {
        timestamp: new Date().toISOString(),
        to: email,
        role,
        inviteCode,
        invitedBy: session.user.id,
        familyName: "Smith Family",
        inviteLink: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/join-family?code=${inviteCode}`,
      });

      // Actually send the email using Resend
      const emailResult = await sendFamilyInvitationEmail({
        to: email,
        inviterName: session.user.name || "A family member",
        familyName: "Smith Family",
        inviteCode,
        inviteLink: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/join-family?code=${inviteCode}`,
        role,
      });

      // Store in email logs
      try {
        addEmailLog({
          type: "invitation",
          to: email,
          subject: `🏠 You're invited to join Smith Family on ChoreMinder!`,
          details: {
            role,
            inviteCode,
            invitedBy: session.user.name || session.user.id,
            familyName: "Smith Family",
            inviteLink: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/join-family?code=${inviteCode}`,
            messageId: emailResult.messageId,
            emailSent: emailResult.success,
            emailError: emailResult.error,
          },
          success: emailResult.success,
        });
      } catch (logError) {
        console.error("Failed to log email:", logError);
      }

      // Return response with email status
      if (!emailResult.success) {
        console.error("Failed to send invitation email:", emailResult.error);
        // Still return success but note the email issue
      }

      return NextResponse.json({
        message: emailResult.success
          ? "Invitation created and email sent successfully"
          : "Invitation created but email failed to send",
        inviteCode,
        inviteLink: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/join-family?code=${inviteCode}`,
        inviterName: session.user.name || "Family Member",
        familyName: "Smith Family",
        instructions: `Share this code with ${email}: ${inviteCode}`,
        emailSent: emailResult.success,
        emailStatus: emailResult.success ? "sent" : "failed",
        emailError: emailResult.error,
        messageId: emailResult.messageId,
      });
    }

    await dbConnect();

    const family = await Family.findById(params.familyId);
    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    // Check if user has permission to invite (only parents can invite)
    const userMember = family.members.find(
      (m: any) => m.user.toString() === session.user.id,
    );

    if (!userMember || userMember.role !== "parent") {
      return NextResponse.json(
        { error: "You do not have permission to invite members" },
        { status: 403 },
      );
    }

    // Check if email is already a member
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const isAlreadyMember = family.members.some(
        (m: any) => m.user.toString() === existingUser._id.toString(),
      );
      if (isAlreadyMember) {
        return NextResponse.json(
          { error: "This email is already a member of the family" },
          { status: 400 },
        );
      }
    }

    // Generate simple invite code
    const inviteCode = crypto.randomBytes(8).toString("hex").toUpperCase();

    // Store invite info in memory (in production, use Redis or database)
    const inviteInfo = {
      email,
      role,
      familyId: params.familyId,
      invitedBy: session.user.id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    // Store in memory (replace with proper storage in production)
    const globalThis = global as any;
    globalThis.familyInvites = globalThis.familyInvites || new Map();
    globalThis.familyInvites.set(inviteCode, inviteInfo);

    // Get inviter details
    const inviter = await User.findById(session.user.id);

    // Log the email sending attempt
    console.log(`📧 [EMAIL LOG] Invitation sent:`, {
      timestamp: new Date().toISOString(),
      to: email,
      role,
      inviteCode,
      invitedBy: session.user.id,
      inviterName: inviter?.name,
      familyId: family._id,
      familyName: family.name,
      inviteLink: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/join-family?code=${inviteCode}`,
    });

    // Actually send the email using Resend
    const emailResult = await sendFamilyInvitationEmail({
      to: email,
      inviterName: inviter?.name || "A family member",
      familyName: family.name,
      inviteCode,
      inviteLink: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/join-family?code=${inviteCode}`,
      role,
    });

    // Store in email logs
    try {
      addEmailLog({
        type: "invitation",
        to: email,
        subject: `🏠 You're invited to join ${family.name} on ChoreMinder!`,
        details: {
          role,
          inviteCode,
          invitedBy: inviter?.name || session.user.id,
          familyId: family._id,
          familyName: family.name,
          inviteLink: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/join-family?code=${inviteCode}`,
          messageId: emailResult.messageId,
          emailSent: emailResult.success,
          emailError: emailResult.error,
        },
        success: emailResult.success,
      });
    } catch (logError) {
      console.error("Failed to log email:", logError);
    }

    return NextResponse.json({
      message: emailResult.success
        ? "Invitation created and email sent successfully"
        : "Invitation created but email failed to send",
      inviteCode,
      inviteLink: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/join-family?code=${inviteCode}`,
      inviterName: inviter?.name,
      familyName: family.name,
      instructions: `Share this code with ${email}: ${inviteCode}`,
      emailSent: emailResult.success,
      emailStatus: emailResult.success ? "sent" : "failed",
      emailError: emailResult.error,
      messageId: emailResult.messageId,
    });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 },
    );
  }
}

// GET /api/families/[id]/invite - Get pending invitations
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const family = await Family.findById(params.familyId);
    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    // Check if user is a member
    const userMember = family.members.find(
      (m: any) => m.user.toString() === session.user.id,
    );

    if (!userMember) {
      return NextResponse.json(
        { error: "You are not a member of this family" },
        { status: 403 },
      );
    }

    // Get active invitations from global store
    const now = new Date();
    const activeInvitations = [];
    
    const globalThis = global as any;
    const familyInvites = globalThis.familyInvites || new Map();
    
    for (const [code, invite] of familyInvites.entries()) {
      const inviteData = invite as any;
      if (inviteData.familyId === params.familyId && new Date(inviteData.expiresAt) > now) {
        activeInvitations.push({
          code: userMember.role === "parent" ? code : "***", // Only show code to parents
          email: inviteData.email,
          role: inviteData.role,
          createdAt: inviteData.createdAt,
          expiresAt: inviteData.expiresAt,
        });
      }
    }

    return NextResponse.json({
      invitations: activeInvitations,
    });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 },
    );
  }
}
