import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/libs/mongoose";
import Chore from "@/models/Chore";
import Family from "@/models/Family";

interface BulkChoreData {
  title: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high";
  points: number;
  estimatedMinutes: number;
  requiresPhotoVerification: boolean;
  assignedTo?: string; // member ID
  assignedBy: {
    _id: string;
    name: string;
  };
  familyId: string;
  recurrence?: {
    type: "daily" | "weekly" | "monthly";
    interval: number;
  };
  ageGroup: "young" | "teen" | "all";
  difficulty: "easy" | "medium" | "hard";
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
    const { chores }: { chores: BulkChoreData[] } = await req.json();

    if (!chores || !Array.isArray(chores) || chores.length === 0) {
      return NextResponse.json(
        {
          error: "Chores array is required",
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
      !userMember?.permissions?.canAssignChores &&
      session.user.role !== "admin"
    ) {
      return NextResponse.json(
        { error: "No permission to create chores" },
        { status: 403 },
      );
    }

    const createdChores = [];
    const errors = [];

    for (const choreData of chores) {
      try {
        // Validate required fields
        if (!choreData.title || choreData.title.trim().length < 3) {
          errors.push({
            chore: choreData.title || "Unnamed chore",
            error: "Title must be at least 3 characters",
          });
          continue;
        }

        if (choreData.points < 1 || choreData.points > 100) {
          errors.push({
            chore: choreData.title,
            error: "Points must be between 1 and 100",
          });
          continue;
        }

        // Validate assigned member if provided
        let assignedMember = null;
        if (choreData.assignedTo) {
          assignedMember = family.members.find(
            (member: any) => member.user.toString() === choreData.assignedTo,
          );

          if (!assignedMember) {
            errors.push({
              chore: choreData.title,
              error: "Assigned member not found in family",
            });
            continue;
          }
        }

        // Create chore object
        const newChore = new Chore({
          title: choreData.title.trim(),
          description: choreData.description?.trim() || "",
          category: choreData.category || "General",
          priority: choreData.priority || "medium",
          points: choreData.points,
          estimatedMinutes: choreData.estimatedMinutes || 30,
          requiresPhotoVerification:
            choreData.requiresPhotoVerification || false,
          status: choreData.assignedTo ? "pending" : "created",
          familyId,
          assignedBy: {
            _id: session.user.id,
            name: session.user.name || "Parent",
          },
          assignedTo: assignedMember
            ? {
                _id: choreData.assignedTo,
                name: assignedMember.user.name || "Family Member",
                email: assignedMember.user.email || "",
              }
            : undefined,
          recurrence: choreData.recurrence
            ? {
                type: choreData.recurrence.type,
                interval: choreData.recurrence.interval || 1,
                nextDue: new Date(),
              }
            : undefined,
          metadata: {
            ageGroup: choreData.ageGroup || "all",
            difficulty: choreData.difficulty || "medium",
            createdDuringOnboarding: true,
          },
          history: [
            {
              action: "created",
              timestamp: new Date(),
              userId: session.user.id,
              details: {
                createdDuringOnboarding: true,
                assignedImmediately: !!choreData.assignedTo,
              },
            },
          ],
        });

        const savedChore = await newChore.save();
        createdChores.push(savedChore);
      } catch (error) {
        console.error(`Error creating chore "${choreData.title}":`, error);
        errors.push({
          chore: choreData.title,
          error:
            error instanceof Error ? error.message : "Failed to create chore",
        });
      }
    }

    // Update family's chore count
    await Family.findByIdAndUpdate(familyId, {
      $inc: { "stats.totalChores": createdChores.length },
    });

    return NextResponse.json({
      message: `Bulk chore creation completed`,
      created: createdChores.length,
      errors: errors.length,
      totalRequested: chores.length,
      chores: createdChores,
      errorDetails: errors,
    });
  } catch (error) {
    console.error("Error creating bulk chores:", error);
    return NextResponse.json(
      { error: "Failed to create chores" },
      { status: 500 },
    );
  }
}
