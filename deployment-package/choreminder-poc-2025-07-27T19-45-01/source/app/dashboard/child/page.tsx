import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";

import AppLayout from "@/components/AppLayout";
import ChildDashboard from "@/components/ChildDashboard";
import { authOptions } from "@/lib/auth";

export default async function ChildDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/signin");
  }

  return (
    <AppLayout
      requiresFamily={true}
      allowedRoles={["child", "user", "parent", "admin"]}
    >
      <ChildDashboard />
    </AppLayout>
  );
}
