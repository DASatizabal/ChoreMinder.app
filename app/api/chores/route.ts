import { Types, Document } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/libs/next-auth";
import dbConnect from "@/libs/mongoose";
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

    // For now, return mock data to get the dashboard working
    // TODO: Implement proper database queries once family relationships are set up
    const mockChores = [
      {
        _id: "mock_chore_1",
        title: "Clean Your Room",
        description: "Make your bed, organize clothes, and vacuum",
        status: "pending",
        points: 10,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        assignedTo: {
          _id: session.user.id,
          name: session.user.name || "User",
          email: session.user.email,
        },
        createdBy: {
          _id: "parent_id",
          name: "Parent",
          email: "parent@example.com",
        },
        family: {
          _id: "mock_family_id",
          name: "Smith Family",
        },
        category: "household",
        priority: "medium",
        requiresPhotoVerification: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: "mock_chore_2",
        title: "Take Out Trash",
        description: "Empty all trash cans and take bags to the curb",
        status: "completed",
        points: 5,
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date().toISOString(),
        assignedTo: {
          _id: session.user.id,
          name: session.user.name || "User",
          email: session.user.email,
        },
        createdBy: {
          _id: "parent_id",
          name: "Parent",
          email: "parent@example.com",
        },
        family: {
          _id: "mock_family_id",
          name: "Smith Family",
        },
        category: "household",
        priority: "high",
        requiresPhotoVerification: false,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: "mock_chore_3",
        title: "Do Homework",
        description: "Complete math and science assignments",
        status: "in_progress",
        points: 15,
        dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        assignedTo: {
          _id: session.user.id,
          name: session.user.name || "User",
          email: session.user.email,
        },
        createdBy: {
          _id: "parent_id",
          name: "Parent",
          email: "parent@example.com",
        },
        family: {
          _id: "mock_family_id",
          name: "Smith Family",
        },
        category: "education",
        priority: "high",
        requiresPhotoVerification: false,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Parse query parameters for filtering
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assignedTo");
    
    let filteredChores = mockChores;
    
    // Filter by status if provided
    if (status) {
      filteredChores = filteredChores.filter(chore => chore.status === status);
    }
    
    // Filter by assignedTo if provided
    if (assignedTo) {
      filteredChores = filteredChores.filter(chore => chore.assignedTo._id === assignedTo);
    }

    return NextResponse.json({
      chores: filteredChores,
      pagination: {
        total: filteredChores.length,
        limit: 50,
        skip: 0,
        hasMore: false,
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
