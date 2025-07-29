"use client";

import { useOfflineSync } from "@/hooks/useOfflineSync";
import { usePerformanceOptimization } from "@/hooks/usePerformanceOptimization";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";

import {
  InteractiveButton,
  FloatingActionButton,
} from "../ui/MicroInteractions";

import OfflineIndicator from "./OfflineIndicator";

interface MobileLayoutClientProps {
  children: React.ReactNode;
}

const MobileLayoutClient = ({ children }: MobileLayoutClientProps) => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { adaptiveSettings, isLowEndDevice } = usePerformanceOptimization();
  const { pendingCount, isOnline } = useOfflineSync();

  const [showBottomNav, setShowBottomNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [activeTab, setActiveTab] = useState("");
  const [showQuickActions, setShowQuickActions] = useState(false);

  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Set active tab based on current path
    if (pathname.includes("/dashboard")) setActiveTab("dashboard");
    else if (pathname.includes("/chores")) setActiveTab("chores");
    else if (pathname.includes("/family")) setActiveTab("family");
    else if (pathname.includes("/achievements")) setActiveTab("achievements");
    else if (pathname.includes("/profile")) setActiveTab("profile");
    else setActiveTab("");
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down
        setIsScrollingDown(true);
        setShowBottomNav(false);
      } else {
        // Scrolling up
        setIsScrollingDown(false);
        setShowBottomNav(true);
      }

      setLastScrollY(currentScrollY);

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Show nav after scroll ends
      scrollTimeoutRef.current = setTimeout(() => {
        setShowBottomNav(true);
      }, 1000);
    };

    if (adaptiveSettings.animationsEnabled) {
      window.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [lastScrollY, adaptiveSettings.animationsEnabled]);

  const navigationItems = [
    {
      key: "dashboard",
      label: "Home",
      icon: "🏠",
      href: "/dashboard",
      badge: null,
    },
    {
      key: "chores",
      label: "Chores",
      icon: "📋",
      href: "/chores",
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      key: "family",
      label: "Family",
      icon: "👨‍👩‍👧‍👦",
      href: "/family",
      badge: null,
    },
    {
      key: "achievements",
      label: "Awards",
      icon: "🏆",
      href: "/achievements",
      badge: null,
    },
    {
      key: "profile",
      label: "Profile",
      icon: "👤",
      href: "/profile",
      badge: null,
    },
  ];

  const quickActions = [
    {
      icon: "➕",
      label: "Add Chore",
      action: () => {
        /* Navigate to add chore */
      },
      color: "bg-blue-500",
    },
    {
      icon: "📸",
      label: "Quick Photo",
      action: () => {
        /* Open camera */
      },
      color: "bg-green-500",
    },
    {
      icon: "⚡",
      label: "Quick Complete",
      action: () => {
        /* Quick complete flow */
      },
      color: "bg-yellow-500",
    },
  ];

  if (!session) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Offline indicator */}
      <OfflineIndicator position="top" />

      {/* Main content */}
      <main className="relative">{children}</main>

      {/* Quick Actions FAB */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowQuickActions(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 50 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed bottom-24 right-6 z-50 space-y-3"
          >
            {quickActions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3"
              >
                <span className="bg-white px-3 py-1 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap">
                  {action.label}
                </span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={action.action}
                  className={`${action.color} text-white rounded-full w-12 h-12 flex items-center justify-center text-xl shadow-lg`}
                >
                  {action.icon}
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Actions Button */}
      <FloatingActionButton
        icon={showQuickActions ? "✕" : "⚡"}
        onClick={() => setShowQuickActions(!showQuickActions)}
        position="bottom-right"
        color={showQuickActions ? "bg-red-500" : "bg-primary"}
        tooltip={showQuickActions ? "Close" : "Quick Actions"}
      />

      {/* Bottom Navigation */}
      <AnimatePresence>
        {showBottomNav && (
          <motion.nav
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{
              type: adaptiveSettings.animationsEnabled ? "spring" : "tween",
              stiffness: 400,
              damping: 25,
              duration: adaptiveSettings.animationsEnabled ? undefined : 0.2,
            }}
            className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30"
          >
            <div className="flex items-center justify-around py-2">
              {navigationItems.map((item) => (
                <Link key={item.key} href={item.href} className="flex-1">
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    className={`flex flex-col items-center py-2 px-1 relative ${
                      activeTab === item.key ? "text-primary" : "text-gray-600"
                    }`}
                  >
                    {/* Active indicator */}
                    {activeTab === item.key && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute -top-1 left-1/2 w-8 h-1 bg-primary rounded-full"
                        style={{ x: "-50%" }}
                        transition={{
                          type: adaptiveSettings.animationsEnabled
                            ? "spring"
                            : "tween",
                          stiffness: 400,
                          damping: 25,
                        }}
                      />
                    )}

                    {/* Icon with badge */}
                    <div className="relative mb-1">
                      <motion.span
                        className="text-xl"
                        animate={{
                          scale: activeTab === item.key ? 1.1 : 1,
                          rotateY: activeTab === item.key ? 360 : 0,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        {item.icon}
                      </motion.span>

                      {/* Badge */}
                      {item.badge && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center"
                        >
                          {item.badge > 99 ? "99+" : item.badge}
                        </motion.div>
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className={`text-xs font-medium ${
                        activeTab === item.key
                          ? "text-primary"
                          : "text-gray-600"
                      }`}
                    >
                      {item.label}
                    </span>
                  </motion.div>
                </Link>
              ))}
            </div>

            {/* Connection status bar */}
            {!isOnline && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                className="bg-red-500 text-white text-center py-1"
              >
                <span className="text-xs">📴 Offline Mode</span>
              </motion.div>
            )}
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Performance indicator for development */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed top-4 left-4 bg-black/70 text-white text-xs p-2 rounded z-50">
          <div>Low-end: {isLowEndDevice ? "Yes" : "No"}</div>
          <div>
            Animations: {adaptiveSettings.animationsEnabled ? "On" : "Off"}
          </div>
          <div>Pending: {pendingCount}</div>
        </div>
      )}
    </div>
  );
};

export default MobileLayoutClient;
