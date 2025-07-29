import * as dotenv from "dotenv";
import mongoose from "mongoose";

// Load environment variables
dotenv.config({ path: ".env.local" });

const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;

if (!uri) {
  console.error("No database URI found in environment variables");
  process.exit(1);
}

const emailsToRemove = [
  "davidpresbaywood@gmail.com",
  "david.satizabal001@gmail.com",
];

async function removeUsers() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");
    const accountsCollection = db.collection("accounts");

    console.log("\n🔍 Checking users to remove...");

    // First, find the users to get their IDs
    const usersToRemove = await usersCollection
      .find({
        email: { $in: emailsToRemove },
      })
      .toArray();

    if (usersToRemove.length === 0) {
      console.log("❌ No users found with the specified emails");
      return;
    }

    console.log("\n📋 Users found:");
    usersToRemove.forEach((user, index) => {
      console.log(
        `${index + 1}. ${user.email} (${user.name || "No name"}) - ID: ${user._id}`,
      );
    });

    const userIds = usersToRemove.map((user) => user._id);

    console.log("\n🗑️  Removing users and associated data...");

    // Remove users
    const userDeleteResult = await usersCollection.deleteMany({
      _id: { $in: userIds },
    });

    console.log(`✅ Deleted ${userDeleteResult.deletedCount} users`);

    // Remove associated OAuth accounts
    const accountDeleteResult = await accountsCollection.deleteMany({
      userId: { $in: userIds },
    });

    console.log(
      `✅ Deleted ${accountDeleteResult.deletedCount} OAuth accounts`,
    );

    // Check other collections for user references
    const collections = await db.listCollections().toArray();
    const collectionsToCheck = ["families", "chores", "verification_tokens"];

    for (const collectionName of collectionsToCheck) {
      if (collections.find((c) => c.name === collectionName)) {
        const collection = db.collection(collectionName);

        // Check families collection for user references
        if (collectionName === "families") {
          const familyDeleteResult = await collection.deleteMany({
            createdBy: { $in: userIds.map((id) => id.toString()) },
          });
          if (familyDeleteResult.deletedCount > 0) {
            console.log(
              `✅ Deleted ${familyDeleteResult.deletedCount} families created by removed users`,
            );
          }

          // Remove users from family members arrays
          const familyUpdateResult = await collection.updateMany(
            { "members.user": { $in: userIds } },
            { $pull: { members: { user: { $in: userIds } } } },
          );
          if (familyUpdateResult.modifiedCount > 0) {
            console.log(
              `✅ Removed users from ${familyUpdateResult.modifiedCount} family member lists`,
            );
          }
        }

        // Check chores collection
        if (collectionName === "chores") {
          const choreDeleteResult = await collection.deleteMany({
            $or: [
              { createdBy: { $in: userIds.map((id) => id.toString()) } },
              { assignedTo: { $in: userIds.map((id) => id.toString()) } },
            ],
          });
          if (choreDeleteResult.deletedCount > 0) {
            console.log(
              `✅ Deleted ${choreDeleteResult.deletedCount} chores associated with removed users`,
            );
          }
        }

        // Check verification tokens
        if (collectionName === "verification_tokens") {
          const tokenDeleteResult = await collection.deleteMany({
            identifier: { $in: emailsToRemove },
          });
          if (tokenDeleteResult.deletedCount > 0) {
            console.log(
              `✅ Deleted ${tokenDeleteResult.deletedCount} verification tokens`,
            );
          }
        }
      }
    }

    console.log("\n✅ User removal completed successfully!");
    console.log("\n📊 Final verification...");

    // Verify removal
    const remainingUsers = await usersCollection
      .find({
        email: { $in: emailsToRemove },
      })
      .toArray();

    if (remainingUsers.length === 0) {
      console.log("✅ Confirmed: Users have been completely removed");
    } else {
      console.log("❌ Warning: Some users still remain in database");
    }

    // Show updated user count
    const totalUsers = await usersCollection.countDocuments();
    console.log(`📈 Total remaining users: ${totalUsers}`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

// Confirmation before deletion
console.log("⚠️  WARNING: This will permanently delete the following users:");
emailsToRemove.forEach((email, index) => {
  console.log(`${index + 1}. ${email}`);
});

console.log("\n🔄 Starting user removal process...");
removeUsers();
