"use client";

import { debounce, throttle } from "lodash";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  loadTime: number;
  renderTime: number;
  networkType: string;
  isLowEndDevice: boolean;
}

interface PerformanceOptimizationOptions {
  enableMetrics?: boolean;
  enableAdaptiveRendering?: boolean;
  enableResourceHints?: boolean;
  enableLazyLoading?: boolean;
  fpsThreshold?: number;
  memoryThreshold?: number;
}

export const usePerformanceOptimization = (
  options: PerformanceOptimizationOptions = {},
) => {
  const {
    enableMetrics = true,
    enableAdaptiveRendering = true,
    enableResourceHints = true,
    enableLazyLoading = true,
    fpsThreshold = 30,
    memoryThreshold = 100 * 1024 * 1024, // 100MB
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    loadTime: 0,
    renderTime: 0,
    networkType: "unknown",
    isLowEndDevice: false,
  });

  const [adaptiveSettings, setAdaptiveSettings] = useState({
    animationsEnabled: true,
    highQualityImages: true,
    particleEffects: true,
    autoplay: true,
    prefetchEnabled: true,
  });

  const fpsCounterRef = useRef(0);
  const frameTimeRef = useRef(performance.now());
  const renderStartTimeRef = useRef(0);
  const frameCountRef = useRef(0);

  // Detect device capabilities
  const deviceCapabilities = useMemo(() => {
    if (typeof window === "undefined")
      return { isLowEnd: false, cores: 4, memory: 8 };

    const connection = (navigator as any).connection;
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const deviceMemory = (navigator as any).deviceMemory || 4;

    const isLowEnd =
      hardwareConcurrency <= 2 ||
      deviceMemory <= 2 ||
      connection?.effectiveType === "slow-2g" ||
      connection?.effectiveType === "2g";

    return {
      isLowEnd,
      cores: hardwareConcurrency,
      memory: deviceMemory,
      connectionType: connection?.effectiveType || "unknown",
    };
  }, []);

  // FPS monitoring
  const updateFPS = useCallback(() => {
    if (!enableMetrics) return;

    const now = performance.now();
    const delta = now - frameTimeRef.current;
    frameCountRef.current++;

    if (delta >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / delta);
      setMetrics((prev) => ({ ...prev, fps }));

      frameCountRef.current = 0;
      frameTimeRef.current = now;
    }

    requestAnimationFrame(updateFPS);
  }, [enableMetrics]);

  // Memory monitoring
  const updateMemoryUsage = useCallback(() => {
    if (!enableMetrics || !(performance as any).memory) return;

    const memory = (performance as any).memory;
    const memoryUsage = memory.usedJSHeapSize;

    setMetrics((prev) => ({ ...prev, memoryUsage }));
  }, [enableMetrics]);

  // Network monitoring
  const updateNetworkInfo = useCallback(() => {
    if (typeof navigator === "undefined") return;

    const connection = (navigator as any).connection;
    if (connection) {
      setMetrics((prev) => ({
        ...prev,
        networkType: connection.effectiveType || "unknown",
      }));
    }
  }, []);

  // Adaptive rendering based on performance
  const updateAdaptiveSettings = useCallback(() => {
    if (!enableAdaptiveRendering) return;

    const { fps, memoryUsage, networkType, isLowEndDevice } = metrics;

    setAdaptiveSettings((prev) => ({
      ...prev,
      animationsEnabled: fps >= fpsThreshold && !isLowEndDevice,
      highQualityImages:
        networkType !== "slow-2g" &&
        networkType !== "2g" &&
        memoryUsage < memoryThreshold,
      particleEffects: fps >= fpsThreshold * 1.2 && !isLowEndDevice,
      autoplay: networkType !== "slow-2g" && networkType !== "2g",
      prefetchEnabled: networkType === "4g" || networkType === "5g",
    }));
  }, [metrics, fpsThreshold, memoryThreshold, enableAdaptiveRendering]);

  // Performance monitoring setup
  useEffect(() => {
    if (!enableMetrics) return;

    // Start FPS monitoring
    requestAnimationFrame(updateFPS);

    // Update other metrics periodically
    const metricsInterval = setInterval(() => {
      updateMemoryUsage();
      updateNetworkInfo();
    }, 5000);

    return () => {
      clearInterval(metricsInterval);
    };
  }, [enableMetrics, updateFPS, updateMemoryUsage, updateNetworkInfo]);

  // Update device capabilities
  useEffect(() => {
    setMetrics((prev) => ({
      ...prev,
      isLowEndDevice: deviceCapabilities.isLowEnd,
      networkType: deviceCapabilities.connectionType,
    }));
  }, [deviceCapabilities]);

  // Update adaptive settings when metrics change
  useEffect(() => {
    updateAdaptiveSettings();
  }, [updateAdaptiveSettings]);

  // Resource hints for better loading performance
  const addResourceHint = useCallback(
    (url: string, type: "preload" | "prefetch" | "dns-prefetch") => {
      if (!enableResourceHints) return;

      const link = document.createElement("link");
      link.rel = type;
      link.href = url;

      if (type === "preload") {
        link.as = url.includes(".js")
          ? "script"
          : url.includes(".css")
            ? "style"
            : url.includes(".woff")
              ? "font"
              : "fetch";

        if (link.as === "font") {
          link.crossOrigin = "anonymous";
        }
      }

      document.head.appendChild(link);
    },
    [enableResourceHints],
  );

  // Optimized scroll handler
  const createOptimizedScrollHandler = useCallback(
    (
      handler: (event: Event) => void,
      options: { throttle?: number; passive?: boolean } = {},
    ) => {
      const { throttle: throttleMs = 16, passive = true } = options;

      const throttledHandler = throttle(handler, throttleMs);

      return {
        handler: throttledHandler,
        options: { passive },
      };
    },
    [],
  );

  // Optimized resize handler
  const createOptimizedResizeHandler = useCallback(
    (handler: (event: Event) => void, debounceMs: number = 250) => {
      return debounce(handler, debounceMs);
    },
    [],
  );

  // Image optimization
  const getOptimizedImageSrc = useCallback(
    (originalSrc: string, width?: number, quality?: number) => {
      if (!adaptiveSettings.highQualityImages) {
        quality = Math.min(quality || 75, 60);
      }

      // If using a CDN or image service, append optimization parameters
      const url = new URL(originalSrc, window.location.origin);

      if (width) {
        url.searchParams.set("w", width.toString());
      }

      if (quality) {
        url.searchParams.set("q", quality.toString());
      }

      // Use WebP for better compression if supported
      if (
        typeof window !== "undefined" &&
        window.CSS?.supports("(background-image: url('test.webp'))")
      ) {
        url.searchParams.set("f", "webp");
      }

      return url.toString();
    },
    [adaptiveSettings.highQualityImages],
  );

  // Render time tracking
  const trackRenderTime = useCallback(
    (componentName: string) => {
      renderStartTimeRef.current = performance.now();

      return () => {
        const renderTime = performance.now() - renderStartTimeRef.current;

        if (enableMetrics) {
          console.log(
            `${componentName} render time: ${renderTime.toFixed(2)}ms`,
          );

          // Update average render time
          setMetrics((prev) => ({
            ...prev,
            renderTime: (prev.renderTime + renderTime) / 2,
          }));
        }
      };
    },
    [enableMetrics],
  );

  // Critical resource loading
  const loadCriticalResources = useCallback(
    async (resources: string[]) => {
      if (!enableResourceHints) return;

      // Preload critical resources
      resources.forEach((resource) => {
        addResourceHint(resource, "preload");
      });

      // Wait for critical resources to load
      await Promise.allSettled(
        resources.map((resource) => fetch(resource).catch(() => null)),
      );
    },
    [addResourceHint, enableResourceHints],
  );

  // Bundle splitting helper
  const loadModuleWhenNeeded = useCallback(
    async <T>(moduleLoader: () => Promise<T>): Promise<T> => {
      try {
        return await moduleLoader();
      } catch (error) {
        console.error("Failed to load module:", error);
        throw error;
      }
    },
    [],
  );

  return {
    // Metrics
    metrics,
    adaptiveSettings,
    deviceCapabilities,

    // Performance optimization utilities
    addResourceHint,
    createOptimizedScrollHandler,
    createOptimizedResizeHandler,
    getOptimizedImageSrc,
    trackRenderTime,
    loadCriticalResources,
    loadModuleWhenNeeded,

    // Status checks
    isLowEndDevice: deviceCapabilities.isLowEnd,
    isSlowNetwork:
      metrics.networkType === "slow-2g" || metrics.networkType === "2g",
    shouldReduceAnimations: !adaptiveSettings.animationsEnabled,
    shouldUseHighQuality: adaptiveSettings.highQualityImages,

    // Performance recommendations
    recommendations: {
      enableAnimations: adaptiveSettings.animationsEnabled,
      enableParticles: adaptiveSettings.particleEffects,
      enableAutoplay: adaptiveSettings.autoplay,
      enablePrefetch: adaptiveSettings.prefetchEnabled,
      imageQuality: adaptiveSettings.highQualityImages ? 85 : 60,
      maxConcurrentRequests: deviceCapabilities.isLowEnd ? 2 : 6,
    },
  };
};
