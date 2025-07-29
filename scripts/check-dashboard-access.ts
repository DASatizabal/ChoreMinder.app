import * as dotenv from "dotenv";
import mongoose from "mongoose";

// Load environment variables
dotenv.config({ path: ".env.local" });

const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;

if (!uri) {
  console.error("No database URI found in environment variables");
  process.exit(1);
}

async function checkDashboardAccess() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    // Get all users with their access details
    const users = await usersCollection
      .find(
        {},
        {
          name: 1,
          email: 1,
          customerId: 1,
          priceId: 1,
          role: 1,
          createdAt: 1,
        },
      )
      .sort({ _id: -1 })
      .toArray();

    console.log("\n📊 Dashboard Access Report");
    console.log("=".repeat(60));

    let hasAccessCount = 0;
    let noAccessCount = 0;

    console.log("\n✅ USERS WITH DASHBOARD ACCESS:");
    console.log("-".repeat(40));

    users.forEach((user, index) => {
      const hasCustomerId = Boolean(user.customerId);
      const hasAccess = hasCustomerId || process.env.NODE_ENV === "development";

      if (hasAccess) {
        hasAccessCount++;
        console.log(`${hasAccessCount}. ${user.email || "No email"}`);
        console.log(`   Name: ${user.name || "No name"}`);
        console.log(`   Role: ${user.role || "No role"}`);
        console.log(
          `   Customer ID: ${user.customerId || "None (dev mode allows access)"}`,
        );
        console.log(`   Price ID: ${user.priceId || "None"}`);
        console.log(`   Created: ${user._id.getTimestamp()}`);
        console.log("");
      }
    });

    if (hasAccessCount === 0) {
      console.log("   No users with paid subscriptions found.");
      console.log("   (In development mode, all users have access)");
    }

    console.log("\n❌ USERS WITHOUT DASHBOARD ACCESS (Production):");
    console.log("-".repeat(45));

    users.forEach((user) => {
      const hasCustomerId = Boolean(user.customerId);

      if (!hasCustomerId) {
        noAccessCount++;
        console.log(`${noAccessCount}. ${user.email || "No email"}`);
        console.log(`   Name: ${user.name || "No name"}`);
        console.log(
          `   Status: No subscription (would be blocked in production)`,
        );
        console.log("");
      }
    });

    if (noAccessCount === 0) {
      console.log("   All users have valid subscriptions!");
    }

    console.log("\n📈 SUMMARY:");
    console.log(`   Total Users: ${users.length}`);
    console.log(`   With Paid Access: ${hasAccessCount}`);
    console.log(`   Without Paid Access: ${noAccessCount}`);
    console.log(
      `   Development Mode: ${process.env.NODE_ENV === "development" ? "YES (all users can access)" : "NO"}`,
    );
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

checkDashboardAccess();
