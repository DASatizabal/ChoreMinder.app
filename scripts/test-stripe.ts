import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function testStripeConfig() {
  console.log("🔍 Testing Stripe Configuration");
  console.log("=".repeat(50));

  // Check environment variables
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePublicKey = process.env.STRIPE_PUBLIC_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log("\n📋 Environment Variables:");
  console.log(
    `STRIPE_SECRET_KEY: ${stripeSecretKey ? "✅ Present" : "❌ Missing"}`,
  );
  console.log(
    `STRIPE_PUBLIC_KEY: ${stripePublicKey ? "✅ Present" : "❌ Missing"}`,
  );
  console.log(
    `STRIPE_WEBHOOK_SECRET: ${stripeWebhookSecret ? "✅ Present" : "❌ Missing"}`,
  );

  if (stripeSecretKey) {
    console.log(
      `Secret Key starts with: ${stripeSecretKey.substring(0, 12)}...`,
    );

    // Test Stripe connection
    try {
      const Stripe = require("stripe");
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2023-08-16",
        typescript: true,
      });

      console.log("\n🔗 Testing Stripe Connection...");

      // Try to list some products to test connection
      const products = await stripe.products.list({ limit: 3 });
      console.log(
        `✅ Stripe connection successful! Found ${products.data.length} products`,
      );

      // Check if we can create a test checkout session
      console.log("\n💳 Testing Checkout Session Creation...");

      // Get price IDs from config
      const config = await import("../config");
      const testPriceId = config.default.stripe.plans[0]?.priceId;

      if (testPriceId) {
        console.log(`Using test price ID: ${testPriceId}`);

        const testSession = await stripe.checkout.sessions.create({
          mode: "subscription",
          line_items: [
            {
              price: testPriceId,
              quantity: 1,
            },
          ],
          success_url: "http://localhost:3001/onboarding",
          cancel_url: "http://localhost:3001/",
        });

        console.log(`✅ Test checkout session created: ${testSession.id}`);
        console.log(`Checkout URL: ${testSession.url}`);
      } else {
        console.log("❌ No price ID found in config");
      }
    } catch (error) {
      console.log("❌ Stripe connection failed:");
      console.error(error);
    }
  }

  console.log("\n🏁 Test completed");
}

testStripeConfig();
