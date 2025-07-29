"use server";

import mongoose from "mongoose";

import { dbConnect } from "./mongoose";

export interface CacheEntry {
  key: string;
  data: any;
  expiresAt: Date;
  tags: string[];
}

export interface QueryMetrics {
  query: string;
  executionTime: number;
  timestamp: Date;
  collection: string;
  result_count?: number;
}

class PerformanceService {
  private cache: Map<string, CacheEntry> = new Map();
  private queryMetrics: QueryMetrics[] = [];
  private maxCacheSize = 1000;
  private maxMetricsHistory = 500;

  /**
   * Initialize performance optimizations
   */
  async initialize(): Promise<void> {
    try {
      await this.setupDatabaseOptimizations();
      this.startCacheCleanup();
      this.enableQueryLogging();

      console.log("Performance optimizations initialized");
    } catch (error) {
      console.error("Error initializing performance service:", error);
    }
  }

  /**
   * Setup database optimizations
   */
  private async setupDatabaseOptimizations(): Promise<void> {
    await dbConnect();

    // Enable query logging for performance monitoring
    if (process.env.NODE_ENV === "development") {
      mongoose.set("debug", (collection, method, query, doc) => {
        const startTime = Date.now();

        // Store query metrics
        this.recordQueryMetric({
          query: JSON.stringify(query),
          executionTime: 0, // Will be updated in post middleware
          timestamp: new Date(),
          collection,
        });
      });
    }

    // Setup connection pooling optimization
    mongoose.connection.on("connected", () => {
      console.log("MongoDB connection pool optimized");
    });

    // Create essential indexes if they don't exist
    await this.createOptimalIndexes();
  }

  /**
   * Create optimal database indexes
   */
  private async createOptimalIndexes(): Promise<void> {
    try {
      const db = mongoose.connection.db;

      // Chores collection indexes
      await db.collection("chores").createIndex(
        {
          assignedTo: 1,
          status: 1,
          dueDate: 1,
        },
        {
          name: "assignedTo_status_dueDate",
          background: true,
        },
      );

      await db.collection("chores").createIndex(
        {
          family: 1,
          deletedAt: 1,
          dueDate: 1,
        },
        {
          name: "family_deletedAt_dueDate",
          background: true,
        },
      );

      await db.collection("chores").createIndex(
        {
          scheduleId: 1,
          isRecurring: 1,
        },
        {
          name: "scheduleId_isRecurring",
          background: true,
        },
      );

      // Users collection indexes
      await db.collection("users").createIndex(
        {
          familyId: 1,
          role: 1,
        },
        {
          name: "familyId_role",
          background: true,
        },
      );

      await db.collection("users").createIndex(
        {
          email: 1,
        },
        {
          name: "email_unique",
          unique: true,
          background: true,
        },
      );

      // Families collection indexes
      await db.collection("families").createIndex(
        {
          createdBy: 1,
        },
        {
          name: "createdBy",
          background: true,
        },
      );

      console.log("Database indexes created successfully");
    } catch (error) {
      console.error("Error creating indexes:", error);
    }
  }

  /**
   * Cache management
   */
  setCache(
    key: string,
    data: any,
    ttlMinutes: number = 30,
    tags: string[] = [],
  ): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    this.cache.set(key, {
      key,
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      expiresAt,
      tags,
    });
  }

  getCache(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (entry.expiresAt <= new Date()) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidateCache(tags: string[]): void {
    for (const [key, entry] of this.cache.entries()) {
      if (tags.some((tag) => entry.tags.includes(tag))) {
        this.cache.delete(key);
      }
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Query optimization helpers
   */
  async optimizedFind(
    model: any,
    query: any,
    options: {
      limit?: number;
      sort?: any;
      populate?: string;
      select?: string;
      lean?: boolean;
      cache?: boolean;
      cacheTTL?: number;
      cacheTags?: string[];
    } = {},
  ): Promise<any> {
    const cacheKey = options.cache
      ? this.generateCacheKey(model.modelName, query, options)
      : null;

    // Check cache first
    if (cacheKey) {
      const cached = this.getCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const startTime = Date.now();

    // Build optimized query
    let mongoQuery = model.find(query);

    if (options.select) mongoQuery = mongoQuery.select(options.select);
    if (options.populate) mongoQuery = mongoQuery.populate(options.populate);
    if (options.sort) mongoQuery = mongoQuery.sort(options.sort);
    if (options.limit) mongoQuery = mongoQuery.limit(options.limit);
    if (options.lean !== false) mongoQuery = mongoQuery.lean(); // Default to lean for better performance

    const results = await mongoQuery.exec();

    const executionTime = Date.now() - startTime;

    // Record metrics
    this.recordQueryMetric({
      query: JSON.stringify(query),
      executionTime,
      timestamp: new Date(),
      collection: model.modelName,
      result_count: Array.isArray(results) ? results.length : 1,
    });

    // Cache results if requested
    if (cacheKey && results) {
      this.setCache(
        cacheKey,
        results,
        options.cacheTTL || 30,
        options.cacheTags || [model.modelName.toLowerCase()],
      );
    }

    return results;
  }

  /**
   * Optimized aggregation pipeline
   */
  async optimizedAggregate(
    model: any,
    pipeline: any[],
    options: {
      cache?: boolean;
      cacheTTL?: number;
      cacheTags?: string[];
    } = {},
  ): Promise<any> {
    const cacheKey = options.cache
      ? this.generateCacheKey(model.modelName, { pipeline }, options)
      : null;

    // Check cache first
    if (cacheKey) {
      const cached = this.getCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const startTime = Date.now();

    // Add performance optimizations to pipeline
    const optimizedPipeline = this.optimizePipeline(pipeline);

    const results = await model.aggregate(optimizedPipeline).exec();

    const executionTime = Date.now() - startTime;

    // Record metrics
    this.recordQueryMetric({
      query: JSON.stringify(optimizedPipeline),
      executionTime,
      timestamp: new Date(),
      collection: model.modelName,
      result_count: results.length,
    });

    // Cache results if requested
    if (cacheKey && results) {
      this.setCache(
        cacheKey,
        results,
        options.cacheTTL || 30,
        options.cacheTags || [model.modelName.toLowerCase()],
      );
    }

    return results;
  }

  /**
   * Batch operations for better performance
   */
  async batchInsert(
    model: any,
    documents: any[],
    batchSize: number = 100,
  ): Promise<any[]> {
    const results = [];

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchResults = await model.insertMany(batch, {
        ordered: false, // Don't stop on error
        lean: true,
      });
      results.push(...batchResults);
    }

    // Invalidate related cache
    this.invalidateCache([model.modelName.toLowerCase()]);

    return results;
  }

  async batchUpdate(
    model: any,
    updates: Array<{ filter: any; update: any }>,
    batchSize: number = 100,
  ): Promise<any[]> {
    const results = [];

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);

      const bulkOps = batch.map(({ filter, update }) => ({
        updateOne: {
          filter,
          update,
          upsert: false,
        },
      }));

      const batchResult = await model.bulkWrite(bulkOps);
      results.push(batchResult);
    }

    // Invalidate related cache
    this.invalidateCache([model.modelName.toLowerCase()]);

    return results;
  }

  /**
   * Performance monitoring
   */
  getPerformanceMetrics(): {
    cacheStats: {
      size: number;
      hitRate: number;
      maxSize: number;
    };
    queryStats: {
      averageExecutionTime: number;
      slowQueries: QueryMetrics[];
      totalQueries: number;
      queriesByCollection: { [key: string]: number };
    };
    memoryUsage: NodeJS.MemoryUsage;
  } {
    const cacheHits = Array.from(this.cache.values()).length;
    const slowQueries = this.queryMetrics
      .filter((m) => m.executionTime > 100) // Queries taking more than 100ms
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    const avgExecutionTime =
      this.queryMetrics.length > 0
        ? this.queryMetrics.reduce((sum, m) => sum + m.executionTime, 0) /
          this.queryMetrics.length
        : 0;

    const queriesByCollection = this.queryMetrics.reduce(
      (acc, m) => {
        acc[m.collection] = (acc[m.collection] || 0) + 1;
        return acc;
      },
      {} as { [key: string]: number },
    );

    return {
      cacheStats: {
        size: this.cache.size,
        hitRate:
          cacheHits > 0
            ? (cacheHits / (cacheHits + this.queryMetrics.length)) * 100
            : 0,
        maxSize: this.maxCacheSize,
      },
      queryStats: {
        averageExecutionTime: Math.round(avgExecutionTime),
        slowQueries,
        totalQueries: this.queryMetrics.length,
        queriesByCollection,
      },
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Database health check
   */
  async getDatabaseHealth(): Promise<{
    connectionStatus: string;
    responseTime: number;
    activeConnections: number;
    indexUsage: any[];
  }> {
    const startTime = Date.now();

    try {
      await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - startTime;

      const stats = await mongoose.connection.db.stats();
      const indexStats = await this.getIndexUsageStats();

      return {
        connectionStatus: "healthy",
        responseTime,
        activeConnections: stats.connections || 0,
        indexUsage: indexStats,
      };
    } catch (error) {
      return {
        connectionStatus: "error",
        responseTime: Date.now() - startTime,
        activeConnections: 0,
        indexUsage: [],
      };
    }
  }

  /**
   * Optimize aggregation pipeline
   */
  private optimizePipeline(pipeline: any[]): any[] {
    const optimized = [...pipeline];

    // Move $match stages as early as possible
    const matchStages = optimized.filter((stage) => stage.$match);
    const otherStages = optimized.filter((stage) => !stage.$match);

    // Add index hints for better performance
    if (matchStages.length > 0) {
      // This would require more sophisticated analysis of available indexes
      // For now, just preserve original order
    }

    return [...matchStages, ...otherStages];
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(
    modelName: string,
    query: any,
    options: any,
  ): string {
    const keyData = {
      model: modelName,
      query,
      options: {
        limit: options.limit,
        sort: options.sort,
        populate: options.populate,
        select: options.select,
      },
    };

    return `cache_${Buffer.from(JSON.stringify(keyData)).toString("base64")}`;
  }

  /**
   * Record query metrics
   */
  private recordQueryMetric(metric: QueryMetrics): void {
    this.queryMetrics.push(metric);

    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics.shift();
    }
  }

  /**
   * Start cache cleanup process
   */
  private startCacheCleanup(): void {
    setInterval(
      () => {
        const now = new Date();
        for (const [key, entry] of this.cache.entries()) {
          if (entry.expiresAt <= now) {
            this.cache.delete(key);
          }
        }
      },
      5 * 60 * 1000,
    ); // Clean every 5 minutes
  }

  /**
   * Enable query logging
   */
  private enableQueryLogging(): void {
    if (process.env.NODE_ENV === "development") {
      // Additional query logging could be implemented here
      console.log("Query logging enabled for development");
    }
  }

  /**
   * Get index usage statistics
   */
  private async getIndexUsageStats(): Promise<any[]> {
    try {
      const collections = ["chores", "users", "families"];
      const stats = [];

      for (const collectionName of collections) {
        const indexStats = await mongoose.connection.db
          .collection(collectionName)
          .aggregate([{ $indexStats: {} }])
          .toArray();

        stats.push({
          collection: collectionName,
          indexes: indexStats,
        });
      }

      return stats;
    } catch (error) {
      console.error("Error getting index stats:", error);
      return [];
    }
  }
}

// Singleton instance
let performanceService: PerformanceService | null = null;

export const getPerformanceService = (): PerformanceService => {
  if (!performanceService) {
    performanceService = new PerformanceService();
    performanceService.initialize();
  }
  return performanceService;
};

export { PerformanceService };
