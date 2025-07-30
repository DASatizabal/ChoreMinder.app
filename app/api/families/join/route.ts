import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";

import dbConnect from "@/libs/mongoose";
import { authOptions } from "@/libs/next-auth";
import Family from "@/models/Family";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: "Invitation code is required" },
        { status: 400 },
      );
    }

    await dbConnect();

    // Get invitation from global store
    const globalThis = global as any;
    const familyInvites = globalThis.familyInvites || new Map();
    const invitation = familyInvites.get(code.toUpperCase());

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation code" },
        { status: 404 },
      );
    }

    // Check if invitation has expired
    if (new Date() > new Date(invitation.expiresAt)) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 },
      );
    }

    // Get the family
    const family = await Family.findById(invitation.familyId);
    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    // Check if user is already in the family
    const existingMember = family.members.find(
      (m: any) => m.user.toString() === session.user.id,
    );

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this family" },
        { status: 400 },
      );
    }

    // Add member to family with proper ObjectId
    const newMember = {
      user: new Types.ObjectId(session.user.id),
      name: session.user.name || "New Member",
      role: invitation.role || "child",
    };

    family.members.push(newMember);
    await family.save();

    // Remove used invitation
    familyInvites.delete(code.toUpperCase());

    return NextResponse.json({
      message: "Successfully joined family",
      family: {
        id: family._id,
        name: family.name,
        role: invitation.role,
      },
    });
  } catch (error) {
    console.error("Error joining family:", error);
    return NextResponse.json(
      { error: "Failed to join family" },
      { status: 500 },
    );
  }
}