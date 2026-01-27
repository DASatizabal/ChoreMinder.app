import dotenv from "dotenv";
import mongoose from "mongoose";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

const connectMongo = async () => {
  // Return cached connection if available
  if (cached.conn) {
    return cached.conn;
  }

  const connectionString = process.env.DATABASE_URL || process.env.MONGODB_URI;

  if (!connectionString) {
    throw new Error(
      "Add the DATABASE_URL environment variable inside .env.local to use mongoose",
    );
  }

  // Return existing promise if connection is in progress
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(connectionString, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
};

export default connectMongo;
export { connectMongo as dbConnect };
