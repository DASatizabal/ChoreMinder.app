import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { familyId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { familyId } = params;
    const {
      emails,
      role,
      personalMessage,
      sendWelcomeEmail = true,
      setReminder = true,
      reminderDays = 3,
    } = await req.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        {
          error: "Emails array is required",
        },
        { status: 400 },
      );
    }

    if (!role) {
      return NextResponse.json(
        {
          error: "Role is required",
        },
        { status: 400 },
      );
    }

    let sentCount = 0;
    let skippedCount = 0;
    const results = [];

    // Send individual invitations for each email
    for (const email of emails) {
      try {
        const response = await fetch(
          `${process.env.NEXTAUTH_URL}/api/families/${familyId}/invitations`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: req.headers.get("cookie") || "",
            },
            body: JSON.stringify({
              email: email.trim(),
              role,
              personalMessage,
              sendWelcomeEmail,
              setReminder,
              reminderDays,
            }),
          },
        );

        if (response.ok) {
          const result = await response.json();
          results.push({
            email,
            status: "sent",
            invitation: result.invitation,
          });
          sentCount++;
        } else {
          const error = await response.json();
          results.push({ email, status: "skipped", reason: error.error });
          skippedCount++;
        }
      } catch (error) {
        console.error(`Error sending invitation to ${email}:`, error);
        results.push({
          email,
          status: "error",
          reason: "Failed to send invitation",
        });
        skippedCount++;
      }
    }

    return NextResponse.json({
      message: `Bulk invitation completed`,
      sentCount,
      skippedCount,
      totalRequested: emails.length,
      results,
    });
  } catch (error) {
    console.error("Error sending bulk invitations:", error);
    return NextResponse.json(
      { error: "Failed to send bulk invitations" },
      { status: 500 },
    );
  }
}
