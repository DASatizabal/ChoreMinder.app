"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  overscan?: number;
  loading?: boolean;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  emptyComponent?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  className?: string;
}

function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  keyExtractor,
  overscan = 5,
  loading = false,
  onEndReached,
  onEndReachedThreshold = 0.8,
  refreshing = false,
  onRefresh,
  emptyComponent,
  loadingComponent,
  className = "",
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const startTouchY = useRef(0);
  const lastScrollTop = useRef(0);

  const totalHeight = items.length * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    startIndex + visibleCount + overscan * 2,
  );

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      key: keyExtractor(item, startIndex + index),
    }));
  }, [items, startIndex, endIndex, keyExtractor]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const currentScrollTop = e.currentTarget.scrollTop;
      setScrollTop(currentScrollTop);
      setIsScrolling(true);

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Set scrolling to false after scroll ends
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);

      // Check if we're near the end
      if (onEndReached) {
        const scrollPercentage =
          (currentScrollTop + containerHeight) /
          (totalHeight + containerHeight);

        if (scrollPercentage >= onEndReachedThreshold && !loading) {
          onEndReached();
        }
      }

      lastScrollTop.current = currentScrollTop;
    },
    [
      containerHeight,
      totalHeight,
      onEndReached,
      onEndReachedThreshold,
      loading,
    ],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (scrollTop <= 0) {
        startTouchY.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    },
    [scrollTop],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isPulling && scrollTop <= 0) {
        const currentY = e.touches[0].clientY;
        const distance = Math.max(0, currentY - startTouchY.current);

        // Add resistance to the pull
        const resistanceDistance = distance * 0.4;
        setPullDistance(Math.min(resistanceDistance, 100));

        if (distance > 80) {
          // Add haptic feedback when ready to refresh
          if (navigator.vibrate) {
            navigator.vibrate(10);
          }
        }
      }
    },
    [isPulling, scrollTop],
  );

  const handleTouchEnd = useCallback(() => {
    if (isPulling) {
      if (pullDistance > 80 && onRefresh && !refreshing) {
        onRefresh();
      }

      setIsPulling(false);
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, onRefresh, refreshing]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  if (items.length === 0 && !loading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        {emptyComponent || (
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-4">📭</div>
            <p>No items to display</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Pull to refresh indicator */}
      <AnimatePresence>
        {(isPulling || refreshing) && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center h-12 bg-primary/10"
            style={{ transform: `translateY(${pullDistance - 50}px)` }}
          >
            <div className="flex items-center gap-2 text-primary">
              {refreshing ? (
                <>
                  <div className="loading loading-spinner loading-sm"></div>
                  <span className="text-sm font-medium">Refreshing...</span>
                </>
              ) : pullDistance > 80 ? (
                <>
                  <span className="text-lg">🔄</span>
                  <span className="text-sm font-medium">
                    Release to refresh
                  </span>
                </>
              ) : (
                <>
                  <span className="text-lg">⬇️</span>
                  <span className="text-sm font-medium">Pull to refresh</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Virtualized list container */}
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Virtual spacer before visible items */}
        <div style={{ height: startIndex * itemHeight }} />

        {/* Visible items */}
        <div>
          <AnimatePresence mode="popLayout">
            {visibleItems.map(({ item, index, key }) => (
              <motion.div
                key={key}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{
                  duration: 0.2,
                  layout: { duration: 0.3 },
                }}
                style={{
                  height: itemHeight,
                  transform: isScrolling ? "translateZ(0)" : "none", // Force GPU acceleration when scrolling
                }}
                className="will-change-transform"
              >
                {renderItem(item, index)}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Virtual spacer after visible items */}
        <div style={{ height: (items.length - endIndex - 1) * itemHeight }} />

        {/* Loading indicator at bottom */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            {loadingComponent || (
              <div className="flex items-center gap-2 text-primary">
                <div className="loading loading-spinner loading-sm"></div>
                <span className="text-sm">Loading more...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scroll indicator */}
      {isScrolling && items.length > visibleCount && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute right-2 top-2 bottom-2 w-1 bg-primary/20 rounded-full"
        >
          <motion.div
            className="w-full bg-primary rounded-full"
            style={{
              height: `${(containerHeight / totalHeight) * 100}%`,
              transform: `translateY(${(scrollTop / totalHeight) * containerHeight}px)`,
            }}
          />
        </motion.div>
      )}
    </div>
  );
}

export default VirtualizedList;
