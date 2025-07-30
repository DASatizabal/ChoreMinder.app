import { NextResponse } from "next/server";
import { dbConnect } from "@/libs/mongoose";
import User from "@/models/User";
import mongoose from "mongoose";

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test the database connection
    await dbConnect();

    // Get database name from the connection string
    const dbName =
      process.env.DATABASE_URL?.split("/").pop()?.split("?")[0] || 
      process.env.MONGODB_URI?.split("/").pop()?.split("?")[0] || 
      "test";

    // Get connection state
    const connectionState = mongoose.connection.readyState;
    const connectionStates = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    // Get collection names
    const db = mongoose.connection.db;
    const collections = await db?.listCollections().toArray() || [];
    const collectionNames = collections.map((collection) => collection.name);

    // Check if users collection exists
    const usersCollectionExists = collectionNames.includes("users");

    // Count documents in users collection
    const userCount = usersCollectionExists ? await User.countDocuments() : 0;

    // Get sample users (limited data for security)
    const sampleUsers = usersCollectionExists
      ? await User.find({}, { name: 1, email: 1, role: 1, createdAt: 1 }).limit(5)
      : [];

    return NextResponse.json({
      success: true,
      database: {
        name: dbName,
        connectionState: connectionStates[connectionState as keyof typeof connectionStates],
        collections: collectionNames,
      },
      users: {
        count: userCount,
        sample: sampleUsers,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
