import { NextResponse } from "next/server";
import { dbConnect } from "@/libs/mongoose";
import User from "@/models/User";

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test database connection first
    await dbConnect();
    console.log("Database connection successful");

    // Fetch users from the database using Mongoose
    const users = await User.find({}, {
      name: 1,
      email: 1,
      role: 1,
      createdAt: 1,
      updatedAt: 1,
    }).sort({ createdAt: -1 });

    console.log("Users fetched successfully");

    // Set cache headers (adjust as needed)
    const cacheControl =
      process.env.NODE_ENV === "production"
        ? "public, s-maxage=60, stale-while-revalidate=300"
        : "no-store";

    return NextResponse.json(users, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": cacheControl,
      },
    });
  } catch (error) {
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      name: (error as any)?.name,
      code: (error as any)?.code,
      stack: (error as any)?.stack,
    });

    return NextResponse.json(
      {
        error: "Failed to fetch users",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
        code: (error as any)?.code || "UNKNOWN_ERROR",
      },
      { status: 500 },
    );
  }
}
