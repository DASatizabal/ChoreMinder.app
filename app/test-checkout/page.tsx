"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function TestCheckoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const testDirectCheckout = async () => {
    console.log("🧪 Testing direct checkout flow");
    console.log("Status:", status, "Session:", !!session);

    if (status === "unauthenticated") {
      console.log("❌ Need to sign in first");
      return;
    }

    if (status === "loading") {
      console.log("⏳ Still loading...");
      return;
    }

    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: "price_1RnslmRojmUDLEIpRrJnf2w1", // Mid plan
          mode: "subscription",
          successUrl: `${window.location.origin}/onboarding`,
          cancelUrl: `${window.location.origin}/`,
        }),
      });

      const data = await response.json();
      console.log("API Response:", data);

      if (data.url) {
        console.log("✅ Got checkout URL:", data.url);
        // Don't redirect, just log it
      } else {
        console.log("❌ No URL in response");
      }
    } catch (error) {
      console.error("❌ Error:", error);
    }
  };

  const testCheckoutPageRedirect = () => {
    console.log("🧪 Testing checkout page redirect");
    const url = `/checkout?priceId=price_1RnslmRojmUDLEIpRrJnf2w1&mode=subscription`;
    console.log("Redirecting to:", url);
    router.push(url);
  };

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Checkout Flow Test</h1>

        <div className="space-y-4 mb-8">
          <div className="card bg-base-200 p-4">
            <p>
              <strong>Authentication Status:</strong> {status}
            </p>
            <p>
              <strong>Has Session:</strong> {session ? "Yes" : "No"}
            </p>
            {session && (
              <p>
                <strong>User:</strong> {session.user?.email}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <button
            className="btn btn-primary btn-block"
            onClick={testDirectCheckout}
          >
            Test Direct API Call (Check Console)
          </button>

          <button
            className="btn btn-secondary btn-block"
            onClick={testCheckoutPageRedirect}
          >
            Test Checkout Page Redirect
          </button>

          <div className="text-sm text-base-content/70">
            Open browser console to see debug output
          </div>
        </div>
      </div>
    </div>
  );
}
