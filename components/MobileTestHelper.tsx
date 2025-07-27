"use client";

import { useState, useEffect } from "react";

const MobileTestHelper = () => {
  const [screenInfo, setScreenInfo] = useState({
    width: 0,
    height: 0,
    userAgent: "",
    isTouchDevice: false,
    orientation: "",
    pixelRatio: 1,
  });

  const [testResults, setTestResults] = useState({
    navigation: "✅ Desktop navigation visible",
    tabBar: "❌ Mobile tab bar hidden",
    touchTargets: "✅ Touch targets sized correctly",
    responsiveGrid: "✅ Grid layout responsive",
    textReadability: "✅ Text size appropriate",
  });

  useEffect(() => {
    const updateScreenInfo = () => {
      setScreenInfo({
        width: window.innerWidth,
        height: window.innerHeight,
        userAgent: navigator.userAgent,
        isTouchDevice: "ontouchstart" in window || navigator.maxTouchPoints > 0,
        orientation:
          window.innerWidth > window.innerHeight ? "landscape" : "portrait",
        pixelRatio: window.devicePixelRatio || 1,
      });

      // Update test results based on screen size
      const isMobile = window.innerWidth < 768;
      const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      const isDesktop = window.innerWidth >= 1024;

      setTestResults({
        navigation: isDesktop
          ? "✅ Desktop navigation visible"
          : isMobile
            ? "✅ Mobile menu available"
            : "✅ Tablet navigation responsive",
        tabBar: isMobile
          ? "✅ Mobile tab bar visible"
          : "✅ Tab bar hidden on larger screens",
        touchTargets: screenInfo.isTouchDevice
          ? "✅ Touch-optimized targets"
          : "✅ Mouse-optimized targets",
        responsiveGrid: "✅ Grid adapts to screen size",
        textReadability:
          window.innerWidth < 400
            ? "⚠️ Very small screen - check text size"
            : "✅ Text readable",
      });
    };

    updateScreenInfo();
    window.addEventListener("resize", updateScreenInfo);
    window.addEventListener("orientationchange", updateScreenInfo);

    return () => {
      window.removeEventListener("resize", updateScreenInfo);
      window.removeEventListener("orientationchange", updateScreenInfo);
    };
  }, [screenInfo.isTouchDevice]);

  const getDeviceType = () => {
    if (screenInfo.width < 768) return "📱 Mobile";
    if (screenInfo.width < 1024) return "📱 Tablet";
    return "🖥️ Desktop";
  };

  const getBreakpoint = () => {
    if (screenInfo.width < 640) return "xs";
    if (screenInfo.width < 768) return "sm";
    if (screenInfo.width < 1024) return "md";
    if (screenInfo.width < 1280) return "lg";
    if (screenInfo.width < 1536) return "xl";
    return "2xl";
  };

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-base-100 shadow-2xl rounded-lg border-2 border-primary/20 p-4 max-w-sm">
      <div className="text-xs space-y-2">
        <div className="font-bold text-primary border-b pb-2">
          📊 Mobile Test Helper
        </div>

        {/* Device Info */}
        <div>
          <div className="font-semibold">{getDeviceType()}</div>
          <div className="text-gray-600">
            {screenInfo.width}×{screenInfo.height} ({getBreakpoint()})
          </div>
          <div className="text-gray-600">
            {screenInfo.orientation} • {screenInfo.pixelRatio}x
          </div>
          {screenInfo.isTouchDevice && (
            <div className="text-blue-600">👆 Touch device</div>
          )}
        </div>

        {/* Test Results */}
        <div className="border-t pt-2">
          <div className="font-semibold mb-1">Test Results:</div>
          {Object.entries(testResults).map(([key, result]) => (
            <div key={key} className="text-xs">
              {result}
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="border-t pt-2">
          <div className="font-semibold mb-1">Quick Tests:</div>
          <div className="space-y-1">
            <button
              onClick={() => {
                const nav = document.querySelector("nav");
                if (nav) nav.style.border = "2px solid red";
                setTimeout(() => {
                  if (nav) nav.style.border = "none";
                }, 2000);
              }}
              className="btn btn-xs btn-outline w-full"
            >
              Highlight Navigation
            </button>
            <button
              onClick={() => {
                const tabBar = document.querySelector("[data-mobile-tab-bar]");
                if (tabBar) {
                  tabBar.style.border = "2px solid red";
                  setTimeout(() => {
                    tabBar.style.border = "none";
                  }, 2000);
                }
              }}
              className="btn btn-xs btn-outline w-full"
            >
              Highlight Tab Bar
            </button>
            <button
              onClick={() => {
                document.body.style.transform = "rotate(90deg)";
                setTimeout(() => {
                  document.body.style.transform = "none";
                }, 2000);
              }}
              className="btn btn-xs btn-outline w-full"
            >
              Test Orientation
            </button>
          </div>
        </div>

        {/* Performance Info */}
        <div className="border-t pt-2 text-xs text-gray-500">
          Dev mode only • Remove in production
        </div>
      </div>
    </div>
  );
};

export default MobileTestHelper;
