import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import ChoreManagement from "@/components/ChoreManagement";

export default async function ChoreManagementPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/signin");
  }

  return <ChoreManagement />;
}