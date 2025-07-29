import {
  isEmailBlacklisted,
  getBlacklistReason,
} from "../libs/email-blacklist";

const testEmails = [
  "davidpresbaywood@gmail.com",
  "david.satizabal001@gmail.com",
  "dasatizabal@gmail.com",
  "test@example.com",
  "DAVIDPRESBAYWOOD@GMAIL.COM", // Test case sensitivity
];

console.log("🔍 Testing Email Blacklist");
console.log("=".repeat(50));

testEmails.forEach((email) => {
  const isBlacklisted = isEmailBlacklisted(email);
  const reason = getBlacklistReason(email);

  console.log(`\n📧 ${email}`);
  console.log(`   Blacklisted: ${isBlacklisted ? "❌ YES" : "✅ NO"}`);
  if (isBlacklisted) {
    console.log(`   Reason: ${reason}`);
  }
});

console.log("\n🎯 Blacklist test completed");
