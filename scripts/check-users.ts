import * as dotenv from "dotenv";
import mongoose from "mongoose";

// Load environment variables
dotenv.config({ path: ".env.local" });

const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;

if (!uri) {
  console.error("No database URI found in environment variables");
  process.exit(1);
}

async function checkUsers() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    // Check users collection directly
    const db = mongoose.connection.db;

    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log("\n📋 Available collections:");
    collections.forEach((col) => console.log(`  - ${col.name}`));

    // Check users collection
    const usersCollection = db.collection("users");
    const totalUsers = await usersCollection.countDocuments();
    console.log(`\n👥 Total registered users: ${totalUsers}`);

    if (totalUsers > 0) {
      // Get recent users
      const recentUsers = await usersCollection
        .find({})
        .sort({ _id: -1 })
        .limit(10)
        .toArray();

      console.log("\n📊 Recent users:");
      recentUsers.forEach((user, index) => {
        console.log(
          `  ${index + 1}. ${user.name || "No name"} (${user.email || "No email"}) - Created: ${user._id.getTimestamp()}`,
        );
      });

      // Check for any roles
      const userRoles = await usersCollection
        .aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }])
        .toArray();

      console.log("\n🎭 User roles:");
      userRoles.forEach((role) => {
        console.log(`  - ${role._id || "No role"}: ${role.count} users`);
      });
    } else {
      console.log("No users found in database");
    }

    // Check other collections
    if (collections.find((c) => c.name === "families")) {
      const familiesCount = await db.collection("families").countDocuments();
      console.log(`\n👨‍👩‍👧‍👦 Total families: ${familiesCount}`);
    }

    if (collections.find((c) => c.name === "chores")) {
      const choresCount = await db.collection("chores").countDocuments();
      console.log(`📝 Total chores: ${choresCount}`);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

checkUsers();
