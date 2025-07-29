import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function testCheckoutAPI() {
  console.log("🧪 Testing Checkout API Endpoint");
  console.log("=".repeat(50));

  // Get config to check price IDs
  const config = await import("../config");
  const plans = config.default.stripe.plans;

  console.log("\n📋 Available Plans:");
  plans.forEach((plan, index) => {
    console.log(`${index + 1}. ${plan.name}`);
    console.log(`   Price ID: ${plan.priceId}`);
    console.log(
      `   Development: ${process.env.NODE_ENV === "development" ? "YES" : "NO"}`,
    );
  });

  // Test API call
  const testPriceId = plans[1]?.priceId; // Mid plan (most popular)

  if (!testPriceId) {
    console.log("❌ No price ID found to test");
    return;
  }

  console.log(`\n🎯 Testing API call with Price ID: ${testPriceId}`);

  try {
    const response = await fetch(
      "http://localhost:3001/api/stripe/create-checkout",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Note: This will fail without authentication, but we can see the error
        },
        body: JSON.stringify({
          priceId: testPriceId,
          mode: "subscription",
          successUrl: "http://localhost:3001/onboarding",
          cancelUrl: "http://localhost:3001/",
        }),
      },
    );

    const data = await response.json();

    console.log(`\n📊 API Response:`);
    console.log(`Status: ${response.status}`);
    console.log(`Data:`, data);

    if (response.ok && data.url) {
      console.log(`✅ Checkout URL created: ${data.url}`);
    } else {
      console.log(`❌ API Error: ${data.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("❌ Network Error:", error);
  }

  console.log("\n🏁 Test completed");
}

testCheckoutAPI();
