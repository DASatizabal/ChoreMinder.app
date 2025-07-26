"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

interface MobileTabBarProps {
  familyContext: FamilyContext;
}

const MobileTabBar = ({ familyContext }: MobileTabBarProps) => {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Determine user role and interface
  const isParent = familyContext?.role === "parent" || familyContext?.activeFamily?.createdBy === session?.user?.id;
  const isChild = familyContext?.role === "child" || familyContext?.role === "user";
  const isAdmin = session?.user?.role === "admin";

  const parentTabs = [
    {
      href: "/dashboard/parent",
      label: "Home",
      icon: "🏠",
      active: pathname === "/dashboard/parent"
    },
    {
      href: "/dashboard/parent/chores",
      label: "Chores",
      icon: "📋",
      active: pathname === "/dashboard/parent/chores"
    },
    {
      href: "/dashboard/parent/family",
      label: "Family",
      icon: "👨‍👩‍👧‍👦",
      active: pathname === "/dashboard/parent/family"
    },
    {
      href: "/dashboard/parent/help",
      label: "Help",
      icon: "🆘",
      active: pathname === "/dashboard/parent/help"
    },
    {
      href: "/dashboard/parent/analytics",
      label: "Stats",
      icon: "📊",
      active: pathname === "/dashboard/parent/analytics"
    }
  ];

  const childTabs = [
    {
      href: "/dashboard/child",
      label: "Home",
      icon: "🌟",
      active: pathname === "/dashboard/child"
    },
    {
      href: "/dashboard/child/chores",
      label: "Chores",
      icon: "📝",
      active: pathname === "/dashboard/child/chores"
    },
    {
      href: "/dashboard/child/achievements",
      label: "Badges",
      icon: "🏆",
      active: pathname === "/dashboard/child/achievements"
    },
    {
      href: "/dashboard/child/photos",
      label: "Photos",
      icon: "📸",
      active: pathname === "/dashboard/child/photos"
    },
    {
      href: "/dashboard/child/progress",
      label: "Progress",
      icon: "📈",
      active: pathname === "/dashboard/child/progress"
    }
  ];

  const adminTabs = [
    {
      href: "/dashboard/admin",
      label: "Admin",
      icon: "⚙️",
      active: pathname === "/dashboard/admin"
    },
    {
      href: "/dashboard/admin/families",
      label: "Families",
      icon: "🏘️",
      active: pathname === "/dashboard/admin/families"
    },
    {
      href: "/dashboard/admin/users",
      label: "Users",
      icon: "👥",
      active: pathname === "/dashboard/admin/users"
    }
  ];

  const getTabs = () => {
    if (isAdmin) return adminTabs;
    if (isParent) return parentTabs;
    if (isChild) return childTabs;
    return [];
  };

  const tabs = getTabs();

  if (tabs.length === 0) return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50" data-mobile-tab-bar>
      {/* Background with blur effect */}
      <div className="bg-base-100/95 backdrop-blur-md border-t border-base-300 shadow-lg">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`btn btn-ghost btn-sm h-auto py-2 px-1 flex flex-col items-center gap-1 text-xs transition-all ${
                tab.active 
                  ? "bg-primary text-primary-content shadow-lg transform scale-105" 
                  : "text-base-content/70 hover:text-base-content hover:bg-base-200"
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className="leading-none font-medium">{tab.label}</span>
            </Link>
          ))}
        </div>
        
        {/* Visual indicator for active tab */}
        <div className="h-1 bg-gradient-to-r from-primary via-secondary to-accent opacity-20"></div>
      </div>
    </div>
  );
};

export default MobileTabBar;