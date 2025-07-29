import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notificationId = params.id;

    // Forward the request to the main notifications endpoint
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/notifications`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        notificationIds: [notificationId],
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(result, { status: response.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 },
    );
  }
}
