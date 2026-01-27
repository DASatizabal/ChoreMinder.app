import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";

import AppLayout from "@/components/AppLayout";
import ParentDashboard from "@/components/ParentDashboard";
import { authOptions } from "@/libs/next-auth";

export default async function ParentDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/signin");
  }

  return (
    <AppLayout requiresFamily={true} allowedRoles={["parent", "admin"]}>
      <ParentDashboard />
    </AppLayout>
  );
}
