"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

interface SubscriptionGateProps {
  children: React.ReactNode;
}

interface User {
  hasAccess: boolean;
  customerId?: string;
  priceId?: string;
}

const SubscriptionGate = ({ children }: SubscriptionGateProps) => {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSubscription = async () => {
      if (status === "loading") return;

      if (status === "unauthenticated") {
        router.push("/api/auth/signin");
        return;
      }

      try {
        const response = await fetch("/api/user");
        if (!response.ok) throw new Error("Failed to fetch user");

        const userData = await response.json();
        setUser(userData);

        // Check if user has active subscription
        if (!userData.hasAccess) {
          // In development, show warning but allow access
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "⚠️ User has no subscription but development mode allows access",
            );
            setUser({ ...userData, hasAccess: true });
          } else {
            // Redirect to pricing page
            router.push("/#pricing");
            return;
          }
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
        // If error, redirect to pricing for safety
        router.push("/#pricing");
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [session, status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-lg">Verifying your subscription...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.hasAccess) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold mb-4 text-primary">
            Subscription Required
          </h2>
          <p className="text-base-content/70 mb-6">
            You need an active subscription to access ChoreMinder features.
          </p>
          <a href="/#pricing" className="btn btn-primary btn-lg">
            Choose Your Plan
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default SubscriptionGate;
