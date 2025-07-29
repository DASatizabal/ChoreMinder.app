import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import dbConnect from "@/libs/mongoose";
import { authOptions } from "@/libs/next-auth";
import Family from "@/models/Family";
import User from "@/models/User";

interface FamilySetupData {
  name: string;
  description: string;
  rules: string[];
  settings: {
    allowChildDecline: boolean;
    requirePhotoVerification: boolean;
    pointsEnabled: boolean;
    reminderFrequency: "daily" | "weekly" | "custom";
    timezone: string;
  };
  members: Array<{
    name: string;
    email: string;
    role: "parent" | "child";
    age?: number;
    preferences: {
      favoriteChores: string[];
      notifications: boolean;
      reminderTime: string;
    };
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const familyData: FamilySetupData = await req.json();

    if (!familyData.name || familyData.name.trim().length < 3) {
      return NextResponse.json(
        {
          error: "Family name must be at least 3 characters long",
        },
        { status: 400 },
      );
    }

    await dbConnect();

    // Check if user already has a family
    const existingUser = await User.findById(session.user.id);
    if (existingUser?.familyId) {
      return NextResponse.json(
        {
          error: "User already belongs to a family",
        },
        { status: 400 },
      );
    }

    // Create the family
    const family = new Family({
      name: familyData.name.trim(),
      description: familyData.description?.trim() || "",
      createdBy: session.user.id,
      settings: {
        allowChildDecline: familyData.settings.allowChildDecline,
        requirePhotoVerification: familyData.settings.requirePhotoVerification,
        pointsEnabled: familyData.settings.pointsEnabled,
        reminderFrequency: familyData.settings.reminderFrequency,
        timezone: familyData.settings.timezone,
      },
      rules: familyData.rules.filter((rule) => rule.trim().length > 0),
      members: [
        {
          user: session.user.id,
          role: "parent",
          joinedAt: new Date(),
          status: "active",
          permissions: {
            canAssignChores: true,
            canApproveChores: true,
            canManageFamily: true,
            canInviteMembers: true,
          },
        },
      ],
    });

    const savedFamily = await family.save();

    // Update user with family ID
    await User.findByIdAndUpdate(session.user.id, {
      familyId: savedFamily._id,
      role: "parent",
    });

    // Create invitation records for family members
    const invitations = [];
    for (const member of familyData.members) {
      if (member.email && member.email.trim()) {
        try {
          // Create invitation record
          const invitationData = {
            familyId: savedFamily._id.toString(),
            familyName: familyData.name,
            email: member.email.trim(),
            role: member.role,
            invitedBy: {
              id: session.user.id,
              name: session.user.name || "Family Member",
              email: session.user.email || "",
            },
            personalMessage: `Welcome to our family on ChoreMinder! We're excited to have you join us in making household management fun and rewarding.`,
            memberData: {
              name: member.name,
              age: member.age,
              preferences: member.preferences,
            },
          };

          // Send invitation email
          const inviteResponse = await fetch(
            `${process.env.NEXTAUTH_URL}/api/families/${savedFamily._id}/invitations`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Cookie: req.headers.get("cookie") || "",
              },
              body: JSON.stringify(invitationData),
            },
          );

          if (inviteResponse.ok) {
            const inviteResult = await inviteResponse.json();
            invitations.push(inviteResult.invitation);
          }
        } catch (error) {
          console.error(`Failed to send invitation to ${member.email}:`, error);
          // Continue with family creation even if some invitations fail
        }
      }
    }

    // Return the complete family data
    const populatedFamily = await Family.findById(savedFamily._id)
      .populate("members.user", "name email image")
      .populate("createdBy", "name email");

    return NextResponse.json({
      family: populatedFamily,
      invitationsSent: invitations.length,
      message: `Family "${familyData.name}" created successfully! ${invitations.length} invitations sent.`,
    });
  } catch (error) {
    console.error("Error creating family:", error);
    return NextResponse.json(
      { error: "Failed to create family. Please try again." },
      { status: 500 },
    );
  }
}
