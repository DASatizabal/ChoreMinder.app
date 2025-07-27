"use client";

import { useSession } from "next-auth/react";
import { ReactNode } from "react";

import NotificationSystem from "./NotificationSystem";

interface NotificationLayoutProps {
  children: ReactNode;
  familyId: string;
  userRole: "parent" | "child" | "admin";
  showNotifications?: boolean;
}

const NotificationLayout = ({
  children,
  familyId,
  userRole,
  showNotifications = true,
}: NotificationLayoutProps) => {
  const { data: session } = useSession();

  if (!session?.user?.id || !familyId) {
    return <>{children}</>;
  }

  const handleNotificationAction = (notificationId: string, action: string) => {
    console.log(
      `Notification action: ${action} for notification ${notificationId}`,
    );
    // This could trigger additional UI updates or data refreshes
  };

  return (
    <div className="relative">
      {children}

      {showNotifications && (
        <div className="fixed top-4 right-4 z-50">
          <NotificationSystem
            familyId={familyId}
            userId={session.user.id}
            userRole={userRole}
            onNotificationAction={handleNotificationAction}
            enableRealtime={true}
          />
        </div>
      )}
    </div>
  );
};

export default NotificationLayout;
