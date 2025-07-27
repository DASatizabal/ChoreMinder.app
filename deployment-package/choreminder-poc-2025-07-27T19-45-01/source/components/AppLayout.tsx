"use client";

import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, ReactNode } from "react";
import toast from "react-hot-toast";

import MobileTabBar from "./MobileTabBar";
import MobileTestHelper from "./MobileTestHelper";
import Navigation from "./Navigation";

interface FamilyContext {
  activeFamily: {
    id: string;
    name: string;
    createdBy: string;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
  } | null;
  role: string | null;
  familyCount: number;
}

interface AppLayoutProps {
  children: ReactNode;
  requiresFamily?: boolean;
  allowedRoles?: string[];
  showMobileTabBar?: boolean;
}

const AppLayout = ({
  children,
  requiresFamily = true,
  allowedRoles = [],
  showMobileTabBar = true,
}: AppLayoutProps) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [familyContext, setFamilyContext] = useState<FamilyContext | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/signin");
      return;
    }

    fetchFamilyContext();
  }, [session, status]);

  const fetchFamilyContext = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/families/context");
      if (!response.ok) {
        if (response.status === 404) {
          // No family context found - user needs to create or join a family
          setFamilyContext({
            activeFamily: null,
            role: null,
            familyCount: 0,
          });
          return;
        }
        throw new Error("Failed to fetch family context");
      }

      const data = await response.json();
      setFamilyContext(data);
    } catch (error) {
      console.error("Error fetching family context:", error);
      setError("Failed to load family information");
      toast.error("Failed to load family information");
    } finally {
      setLoading(false);
    }
  };

  const handleFamilyChange = () => {
    fetchFamilyContext();
  };

  // Check role permissions
  const hasValidRole = () => {
    if (allowedRoles.length === 0) return true;
    if (!familyContext?.role) return false;
    return (
      allowedRoles.includes(familyContext.role) ||
      allowedRoles.includes("any") ||
      session?.user?.role === "admin"
    );
  };

  // Loading state
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
          <p className="text-lg font-medium text-primary">
            Loading your dashboard... 🚀
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold mb-4 text-error">
            Something went wrong
          </h2>
          <p className="text-base-content/70 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No family state (when family is required)
  if (requiresFamily && !familyContext?.activeFamily) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <Navigation
          familyContext={familyContext}
          onFamilyChange={handleFamilyChange}
        />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-6xl mb-4">🏠</div>
            <h2 className="text-2xl font-bold mb-4 text-primary">
              Welcome to ChoreMinder!
            </h2>
            <p className="text-base-content/70 mb-6">
              You need to create a family or join an existing one to get
              started. Use the family switcher in the navigation above to create
              or join a family.
            </p>
            <div className="space-y-2 text-sm text-base-content/60">
              <p>💡 Create a family if you're a parent</p>
              <p>🔗 Join a family if someone invited you</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Invalid role state
  if (!hasValidRole()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <Navigation
          familyContext={familyContext}
          onFamilyChange={handleFamilyChange}
        />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold mb-4 text-warning">
              Access Restricted
            </h2>
            <p className="text-base-content/70 mb-6">
              You don't have permission to access this page. Your current role:{" "}
              <strong>{familyContext?.role || "unknown"}</strong>
            </p>
            <div className="space-y-2">
              <button
                onClick={() => router.push("/dashboard")}
                className="btn btn-primary btn-block"
              >
                Go to Dashboard
              </button>
              <p className="text-xs text-base-content/50">
                Required roles: {allowedRoles.join(", ")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-200 to-base-300">
      {/* Navigation */}
      <Navigation
        familyContext={familyContext}
        onFamilyChange={handleFamilyChange}
      />

      {/* Main Content */}
      <main className={`${showMobileTabBar ? "pb-20 md:pb-4" : "pb-4"}`}>
        <div className="container mx-auto px-4 py-6">{children}</div>
      </main>

      {/* Mobile Tab Bar */}
      {showMobileTabBar && familyContext && (
        <MobileTabBar familyContext={familyContext} />
      )}

      {/* Mobile Test Helper (Development only) */}
      <MobileTestHelper />
    </div>
  );
};

export default AppLayout;
