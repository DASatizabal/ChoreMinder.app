"use client";

import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

import apiClient from "@/libs/api";

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const priceId = searchParams.get("priceId");
  const mode = searchParams.get("mode") || "payment";

  useEffect(() => {
    const processCheckout = async () => {
      if (status === "loading") {
        // Add timeout to prevent infinite loading
        setTimeout(() => {
          if (status === "loading") {
            window.location.href = "/";
          }
        }, 10000); // 10 second timeout
        return;
      }

      if (status === "unauthenticated") {
        window.location.href = "/api/auth/signin";
        return;
      }

      if (!priceId) {
        window.location.href = "/";
        return;
      }

      try {
        const { url }: { url: string } = await apiClient.post(
          "/stripe/create-checkout",
          {
            priceId,
            successUrl: `${window.location.origin}/onboarding`,
            cancelUrl: `${window.location.origin}/`,
            mode,
          },
        );

        if (url) {
          window.location.href = url;
        } else {
          window.location.href = "/";
        }
      } catch (e) {
        console.error("Error creating checkout session:", e);
        window.location.href = "/";
      }
    };

    processCheckout();
  }, [session, status, priceId, mode]);

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center">
      <div className="text-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-4 text-lg">Redirecting to checkout...</p>
      </div>
    </div>
  );
}
