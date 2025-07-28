"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

import ParentDashboard from "@/components/ParentDashboard";
import ChildDashboard from "@/components/ChildDashboard";

export const dynamic = "force-dynamic";

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

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [familyContext, setFamilyContext] = useState<FamilyContext | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch family context to determine user role
  useEffect(() => {
    const fetchFamilyContext = async () => {
      if (!session?.user) return;
      
      try {
        const response = await fetch("/api/families/context");
        if (!response.ok) throw new Error("Failed to fetch family context");
        const data = await response.json();
        setFamilyContext(data);
      } catch (error) {
        console.error("Error fetching family context:", error);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchFamilyContext();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [session, status]);

  // Show loading state
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show appropriate dashboard based on user role
  if (familyContext?.role === "parent") {
    return <ParentDashboard />;
  } else if (familyContext?.role === "child") {
    return <ChildDashboard />;
  }

  // Default fallback for users without a role or family
  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto">
        <div className="text-6xl mb-4">🏠</div>
        <h2 className="text-2xl font-bold mb-4 text-primary">Welcome to ChoreMinder!</h2>
        <p className="text-base-content/70 mb-6">
          Get started by joining or creating a family to begin managing chores.
        </p>
        <a href="/dashboard/families" className="btn btn-primary btn-lg">
          Get Started
        </a>
      </div>
    </div>
  );
}
