import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import dbConnect from "@/libs/mongoose";
import { authOptions } from "@/libs/next-auth";
import Chore from "@/models/Chore";
import Family from "@/models/Family";
import User from "@/models/User";

// GET /api/admin/stats - Get system statistics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get user statistics
    const totalUsers = await User.countDocuments();
    const usersToday = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    const usersThisWeek = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    // Get user roles breakdown
    const userRoles = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);

    // Get family statistics
    const totalFamilies = await Family.countDocuments();
    const familiesWithMembers = await Family.aggregate([
      { $project: { memberCount: { $size: "$members" } } },
      {
        $group: {
          _id: null,
          avgMembers: { $avg: "$memberCount" },
          totalMembers: { $sum: "$memberCount" },
        },
      },
    ]);

    // Get chore statistics
    const totalChores = await Chore.countDocuments();
    const completedChores = await Chore.countDocuments({ status: "completed" });
    const pendingChores = await Chore.countDocuments({ status: "pending" });

    // Recent user registrations (last 10)
    const recentUsers = await User.find(
      {},
      { name: 1, email: 1, createdAt: 1, role: 1 },
    )
      .sort({ createdAt: -1 })
      .limit(10);

    return NextResponse.json({
      users: {
        total: totalUsers,
        today: usersToday,
        thisWeek: usersThisWeek,
        roles: userRoles,
        recent: recentUsers,
      },
      families: {
        total: totalFamilies,
        averageMembers: familiesWithMembers[0]?.avgMembers || 0,
        totalFamilyMembers: familiesWithMembers[0]?.totalMembers || 0,
      },
      chores: {
        total: totalChores,
        completed: completedChores,
        pending: pendingChores,
        completionRate:
          totalChores > 0
            ? ((completedChores / totalChores) * 100).toFixed(1)
            : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching admin statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 },
    );
  }
}
