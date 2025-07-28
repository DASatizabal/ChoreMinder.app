"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

import ButtonAccount from "./ButtonAccount";
import FamilySwitcher from "./FamilySwitcher";

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

interface NavigationProps {
  familyContext: FamilyContext | null;
  onFamilyChange: () => void;
}

const Navigation = ({ familyContext, onFamilyChange }: NavigationProps) => {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState({
    helpRequests: 0,
    pendingPhotos: 0,
    newAchievements: 0,
  });

  // Determine user role and interface
  const isParent =
    familyContext?.role === "parent" ||
    familyContext?.activeFamily?.createdBy === session?.user?.id;
  const isChild =
    familyContext?.role === "child" || familyContext?.role === "user";
  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    if (isParent && familyContext?.activeFamily?.id) {
      fetchParentNotifications();
    } else if (isChild) {
      fetchChildNotifications();
    }
  }, [isParent, isChild, familyContext?.activeFamily?.id]);

  const fetchParentNotifications = async () => {
    try {
      // Fetch help requests count
      const helpResponse = await fetch(
        `/api/help-requests?status=pending&familyId=${familyContext?.activeFamily?.id}`,
      );
      const helpData = await helpResponse.json();

      // Fetch pending photos count
      const photosResponse = await fetch(
        `/api/chores?familyId=${familyContext?.activeFamily?.id}&requiresPhotoReview=true`,
      );
      const photosData = await photosResponse.json();

      setNotifications({
        helpRequests: helpData.requests?.length || 0,
        pendingPhotos: photosData.chores?.length || 0,
        newAchievements: 0,
      });
    } catch (error) {
      console.error("Error fetching parent notifications:", error);
    }
  };

  const fetchChildNotifications = async () => {
    try {
      // Fetch new achievements or completed chores waiting for approval
      const response = await fetch(
        `/api/chores?assignedTo=${session?.user?.id}&status=completed`,
      );
      const data = await response.json();

      setNotifications({
        helpRequests: 0,
        pendingPhotos: 0,
        newAchievements: data.chores?.length || 0,
      });
    } catch (error) {
      console.error("Error fetching child notifications:", error);
    }
  };

  const parentNavItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: "🏠",
      description: "Family overview",
      active: pathname === "/dashboard",
    },
    {
      href: "/dashboard/families",
      label: "Family Management",
      icon: "👨‍👩‍👧‍👦",
      description: "Manage family members",
      active: pathname === "/dashboard/families",
    },
    {
      href: "/dashboard/parent/chores",
      label: "Chore Management",
      icon: "📋",
      description: "Manage family chores",
      active: pathname === "/dashboard/parent/chores",
      badge:
        notifications.pendingPhotos > 0
          ? notifications.pendingPhotos
          : undefined,
    },
    {
      href: "/dashboard/parent/help",
      label: "Help Requests",
      icon: "🆘",
      description: "Review help requests",
      active: pathname === "/dashboard/parent/help",
      badge:
        notifications.helpRequests > 0 ? notifications.helpRequests : undefined,
    },
    {
      href: "/dashboard/parent/analytics",
      label: "Progress Analytics",
      icon: "📊",
      description: "Family progress",
      active: pathname === "/dashboard/parent/analytics",
    },
    {
      href: "/dashboard/email-logs",
      label: "Email Logs",
      icon: "📧",
      description: "View sent emails",
      active: pathname === "/dashboard/email-logs",
    },
  ];

  const childNavItems = [
    {
      href: "/dashboard",
      label: "My Dashboard",
      icon: "🌟",
      description: "Your awesome space",
      active: pathname === "/dashboard",
    },
    {
      href: "/dashboard/child/chores",
      label: "My Chores",
      icon: "📝",
      description: "Tasks to complete",
      active: pathname === "/dashboard/child/chores",
    },
    {
      href: "/dashboard/child/achievements",
      label: "Achievements",
      icon: "🏆",
      description: "Your badges & rewards",
      active: pathname === "/dashboard/child/achievements",
      badge:
        notifications.newAchievements > 0
          ? notifications.newAchievements
          : undefined,
    },
    {
      href: "/dashboard/child/photos",
      label: "Photo Missions",
      icon: "📸",
      description: "Upload chore photos",
      active: pathname === "/dashboard/child/photos",
    },
    {
      href: "/dashboard/child/progress",
      label: "My Progress",
      icon: "📈",
      description: "See your growth",
      active: pathname === "/dashboard/child/progress",
    },
  ];

  const adminNavItems = [
    {
      href: "/dashboard/admin",
      label: "Admin Panel",
      icon: "⚙️",
      description: "System administration",
      active: pathname === "/dashboard/admin",
    },
    {
      href: "/dashboard/admin/families",
      label: "All Families",
      icon: "🏘️",
      description: "Manage all families",
      active: pathname === "/dashboard/admin/families",
    },
    {
      href: "/dashboard/admin/users",
      label: "User Management",
      icon: "👥",
      description: "Manage users",
      active: pathname === "/dashboard/admin/users",
    },
  ];

  const getNavItems = () => {
    if (isAdmin) return adminNavItems;
    if (isParent) return parentNavItems;
    if (isChild) return childNavItems;
    return [];
  };

  const navItems = getNavItems();

  const handleRoleSwitch = () => {
    if (isParent && familyContext?.activeFamily) {
      // Switch to child view
      router.push("/dashboard");
    } else if (isChild && familyContext?.activeFamily) {
      // Switch to parent view (if user has parent role)
      router.push("/dashboard");
    }
  };

  const canSwitchRoles = familyContext?.activeFamily && (isParent || isChild);

  return (
    <>
      {/* Desktop Navigation */}
      <div className="navbar bg-base-100 shadow-lg border-b-2 border-primary/10 sticky top-0 z-50">
        <div className="navbar-start">
          {/* Mobile menu button */}
          <div className="dropdown lg:hidden">
            <label
              tabIndex={0}
              className="btn btn-ghost"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </label>
          </div>

          {/* Logo */}
          <Link
            href="/"
            className="btn btn-ghost text-xl font-bold text-primary"
          >
            <span className="text-2xl mr-2">🏠</span>
            ChoreMinder
          </Link>
        </div>

        <div className="navbar-center hidden lg:flex">
          {/* Desktop Navigation Items */}
          <ul className="menu menu-horizontal px-1 gap-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`btn btn-ghost btn-sm relative tooltip tooltip-bottom ${
                    item.active ? "bg-primary text-primary-content" : ""
                  }`}
                  data-tip={item.description}
                >
                  <span className="text-lg mr-1">{item.icon}</span>
                  <span className="hidden xl:inline">{item.label}</span>
                  {item.badge && (
                    <div className="badge badge-error badge-sm absolute -top-2 -right-2">
                      {item.badge}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="navbar-end gap-2">
          {/* Family Switcher */}
          {familyContext && (
            <FamilySwitcher
              familyContext={familyContext}
              onFamilyChange={onFamilyChange}
            />
          )}

          {/* Role Switch Button */}
          {canSwitchRoles && (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-sm">
                <span className="text-lg mr-1">{isParent ? "👨‍👩‍👧‍👦" : "🧒"}</span>
                <span className="hidden sm:inline">
                  {isParent ? "Parent View" : "Child View"}
                </span>
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </label>
              <ul
                tabIndex={0}
                className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
              >
                <li>
                  <button
                    onClick={() => router.push("/dashboard")}
                    className={`${isParent ? "active" : ""}`}
                  >
                    <span className="text-lg mr-2">👨‍👩‍👧‍👦</span>
                    Parent Dashboard
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => router.push("/dashboard")}
                    className={`${isChild ? "active" : ""}`}
                  >
                    <span className="text-lg mr-2">🧒</span>
                    Child Dashboard
                  </button>
                </li>
              </ul>
            </div>
          )}

          {/* Account Button */}
          <ButtonAccount />
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-base-100 shadow-lg border-b border-primary/10 sticky top-16 z-40">
          <div className="p-4">
            <ul className="menu gap-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`btn btn-ghost justify-start relative ${
                      item.active ? "bg-primary text-primary-content" : ""
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="text-lg mr-3">{item.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="font-bold">{item.label}</div>
                      <div className="text-xs opacity-70">
                        {item.description}
                      </div>
                    </div>
                    {item.badge && (
                      <div className="badge badge-error badge-sm">
                        {item.badge}
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Mobile Role Switch */}
            {canSwitchRoles && <div className="divider">Switch View</div>}
            {canSwitchRoles && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    router.push("/dashboard");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`btn btn-outline btn-sm ${isParent ? "btn-primary" : ""}`}
                >
                  <span className="text-lg mr-1">👨‍👩‍👧‍👦</span>
                  Parent
                </button>
                <button
                  onClick={() => {
                    router.push("/dashboard");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`btn btn-outline btn-sm ${isChild ? "btn-primary" : ""}`}
                >
                  <span className="text-lg mr-1">🧒</span>
                  Child
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Navigation;
