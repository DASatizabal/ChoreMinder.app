import { Types, Document } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import dbConnect from "@/libs/mongoose";
import { authOptions } from "@/libs/next-auth";
import Chore from "@/models/Chore";
import Family from "@/models/Family";
import User from "@/models/User";

// Define a type for the user document with populated families
type UserWithFamilies = Document<
  unknown,
  {},
  {
    _id: Types.ObjectId;
    families: Array<{ _id: Types.ObjectId }>;
  }
> & {
  _id: Types.ObjectId;
  families: Array<{ _id: Types.ObjectId }>;
};

// GET /api/chores - Get all chores for user's families
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Parse query parameters for filtering and pagination
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assignedTo");
    const familyId = searchParams.get("familyId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const skip = parseInt(searchParams.get("skip") || "0", 10);

    // Get user's families
    const user = await User.findById(session.user.id).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find families the user belongs to
    const families = await Family.find({
      "members.user": new Types.ObjectId(session.user.id),
    }).lean();

    if (families.length === 0) {
      // User has no families, return empty result
      return NextResponse.json({
        chores: [],
        pagination: {
          total: 0,
          limit,
          skip,
          hasMore: false,
        },
      });
    }

    const userFamilyIds = families.map((f) => f._id);

    // Build query filter
    const filter: Record<string, any> = {
      family: familyId
        ? new Types.ObjectId(familyId)
        : { $in: userFamilyIds },
      deletedAt: null, // Exclude soft-deleted chores
    };

    // If a specific familyId was provided, verify user belongs to it
    if (familyId) {
      const isMember = userFamilyIds.some(
        (id) => id.toString() === familyId
      );
      if (!isMember) {
        return NextResponse.json(
          { error: "You are not a member of this family" },
          { status: 403 }
        );
      }
    }

    // Apply status filter if provided
    if (status) {
      filter.status = status;
    }

    // Apply assignedTo filter if provided
    if (assignedTo) {
      filter.assignedTo = new Types.ObjectId(assignedTo);
    }

    // Get total count for pagination
    const total = await Chore.countDocuments(filter);

    // Query chores with population
    const chores = await Chore.find(filter)
      .populate("assignedTo", "name email avatar")
      .populate("createdBy", "name email")
      .populate("family", "name")
      .sort({ dueDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      chores,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + chores.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching chores:", error);
    return NextResponse.json(
      { error: "Failed to fetch chores" },
      { status: 500 },
    );
  }
}

// POST /api/chores - Create a new chore
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      familyId,
      assignedTo,
      dueDate,
      priority,
      points,
      requiresPhotoVerification,
      recurrence,
      instructions,
      category,
    } = body;

    // Validate required fields
    if (!title || !familyId || !assignedTo) {
      return NextResponse.json(
        { error: "Title, familyId, and assignedTo are required" },
        { status: 400 },
      );
    }

    await dbConnect();

    // Verify user belongs to the family and has permission to create chores
    const family = await Family.findById(familyId);
    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    // Type assertion for family members with role
    const familyWithMembers = family as unknown as {
      members: Array<{
        user: Types.ObjectId;
        role: "parent" | "child" | "admin";
      }>;
    };

    const userMember = familyWithMembers.members.find(
      (m) => m.user.toString() === session.user.id,
    );

    if (!userMember) {
      return NextResponse.json(
        { error: "You are not a member of this family" },
        { status: 403 },
      );
    }

    // Only parents and guardians can create chores
    if (!["parent", "guardian"].includes(userMember.role)) {
      return NextResponse.json(
        { error: "Only parents and guardians can create chores" },
        { status: 403 },
      );
    }

    // Validate assignedTo if provided
    if (assignedTo) {
      const assignedMember = family.members.find(
        (m: any) => m.user.toString() === assignedTo,
      );
      if (!assignedMember) {
        return NextResponse.json(
          { error: "Assigned user is not a member of this family" },
          { status: 400 },
        );
      }
    }

    // Create the chore
    const chore = await Chore.create({
      title,
      description,
      family: new Types.ObjectId(familyId),
      assignedTo: new Types.ObjectId(assignedTo),
      assignedBy: new Types.ObjectId(session.user.id),
      createdBy: new Types.ObjectId(session.user.id),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority: priority || "medium",
      points: points || 10,
      requiresPhotoVerification: requiresPhotoVerification || false,
      recurrence: recurrence || { type: "none" },
      instructions: instructions || [],
      category: category || "general",
      status: "pending",
      history: [
        {
          action: "created",
          timestamp: new Date(),
          user: new Types.ObjectId(session.user.id),
        },
      ],
    });

    // Populate the response
    const populatedChore = await Chore.findById(chore._id)
      .populate("assignedTo", "name email avatar")
      .populate("createdBy", "name email")
      .populate("family", "name");

    // TODO: Send notification to assigned user
    // await sendNotification(assignedTo, 'chore_assigned', chore);

    return NextResponse.json(populatedChore, { status: 201 });
  } catch (error) {
    console.error("Error creating chore:", error);
    return NextResponse.json(
      { error: "Failed to create chore" },
      { status: 500 },
    );
  }
}

// PUT /api/chores - Bulk update chores
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { choreIds, updates } = await req.json();

    if (!Array.isArray(choreIds) || choreIds.length === 0) {
      return NextResponse.json(
        { error: "choreIds array is required" },
        { status: 400 },
      );
    }

    await dbConnect();

    // Get user's families with proper typing
    const user = (await User.findById(session.user.id)
      .populate<{ families: Array<{ _id: Types.ObjectId }> }>("families")
      .lean()
      .exec()) as unknown as UserWithFamilies | null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Safely access families with type assertion
    const userWithFamilies = user as unknown as UserWithFamilies;
    const userFamilyIds = (userWithFamilies.families || []).map((family) =>
      family._id.toString(),
    );

    // Verify all chores belong to user's families
    const chores = await Chore.find({
      _id: { $in: choreIds },
      family: { $in: userFamilyIds },
    });

    if (chores.length !== choreIds.length) {
      return NextResponse.json(
        { error: "Some chores not found or unauthorized" },
        { status: 403 },
      );
    }

    // Apply updates
    const updatePromises = chores.map(async (chore) => {
      // Apply allowed updates
      if (updates.status) chore.status = updates.status;
      if (updates.priority) chore.priority = updates.priority;
      if (updates.dueDate !== undefined) chore.dueDate = updates.dueDate;

      // Add history entry
      chore.history.push({
        action: "bulk_updated",
        timestamp: new Date(),
        user: new Types.ObjectId(session.user.id),
        details: updates,
      });

      return chore.save();
    });

    const updatedChores = await Promise.all(updatePromises);

    return NextResponse.json({
      message: "Chores updated successfully",
      updated: updatedChores.length,
    });
  } catch (error) {
    console.error("Error bulk updating chores:", error);
    return NextResponse.json(
      { error: "Failed to update chores" },
      { status: 500 },
    );
  }
}
