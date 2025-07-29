import ChoreManagement from "@/components/ChoreManagement";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";

export default async function ChoreManagementPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/signin");
  }

  return <ChoreManagement />;
}
