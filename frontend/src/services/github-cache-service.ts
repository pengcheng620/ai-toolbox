/**
 * GitHub PR Data Cache Service
 * 
 * Provides intelligent caching for GitHub PR data to reduce API calls and improve performance.
 * Features:
 * - LRU eviction policy
 * - Configurable TTL
 * - Cache hit/miss statistics
 * - Memory usage monitoring
 * - Graceful degradation on errors
 */

import type { ParsedCommit, ParsedFile } from './github-pr-page-service'
import { getCacheConfig, type CacheConfiguration } from '../config/cache-config'

// Cache configuration (using centralized config)
type CacheConfig = CacheConfiguration

// Cache entry structure
interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
  accessCount: number
  lastAccessed: number
}

// Cache statistics
interface CacheStats {
  hits: number
  misses: number
  evictions: number
  totalRequests: number
  hitRate: number
}

// Cached data types
export interface PRDataCache {
  commits?: ParsedCommit[]
  fileChanges?: ParsedFile[]
  codeChanges?: string
  commitMessages?: string[]
}

// Cache key types
type CacheKeyType = 'commits' | 'fileChanges' | 'codeChanges' | 'commitMessages'

class GitHubCacheService {
  private cache = new Map<string, CacheEntry<any>>()
  private accessOrder: string[] = []
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRequests: 0,
    hitRate: 0
  }

  private config: CacheConfig

  constructor() {
    this.config = getCacheConfig()
    if (this.config.enableDebugLogs) {
      console.log('🔧 GitHub Cache Service initialized with config:', this.config)
    }
  }

  /**
   * Generate a standardized cache key for PR data
   */
  private generateCacheKey(prUrl: string, dataType: CacheKeyType): string {
    // Normalize PR URL by removing query params and fragments
    const url = new URL(prUrl)
    const normalizedUrl = `${url.origin}${url.pathname}`
    return `${normalizedUrl}:${dataType}`
  }

  /**
   * Update access order for LRU eviction
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
    this.accessOrder.push(key)
  }

  /**
   * Evict least recently used entries if cache is full
   */
  private evictIfNeeded(): void {
    while (this.cache.size >= this.config.maxEntries && this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift()
      if (oldestKey && this.cache.has(oldestKey)) {
        this.cache.delete(oldestKey)
        this.stats.evictions++
        if (this.config.enableDebugLogs) {
          console.log(`🗑️ Cache evicted: ${oldestKey}`)
        }
      }
    }
  }

  /**
   * Check if a cache entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() > entry.expiresAt
  }

  /**
   * Update cache statistics
   */
  private updateStats(hit: boolean): void {
    if (!this.config.enableStats) return

    this.stats.totalRequests++
    if (hit) {
      this.stats.hits++
    } else {
      this.stats.misses++
    }
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests) * 100 
      : 0
  }

  /**
   * Get data from cache
   */
  get<T>(prUrl: string, dataType: CacheKeyType): T | null {
    const key = this.generateCacheKey(prUrl, dataType)
    const entry = this.cache.get(key)

    if (!entry) {
      this.updateStats(false)
      if (this.config.enableDebugLogs) {
        console.log(`❌ Cache miss: ${dataType} for ${prUrl}`)
      }
      return null
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key)
      this.updateStats(false)
      if (this.config.enableDebugLogs) {
        console.log(`⏰ Cache expired: ${dataType} for ${prUrl}`)
      }
      return null
    }

    // Update access tracking
    entry.accessCount++
    entry.lastAccessed = Date.now()
    this.updateAccessOrder(key)
    this.updateStats(true)

    if (this.config.enableDebugLogs) {
      console.log(`✅ Cache hit: ${dataType} for ${prUrl} (age: ${Date.now() - entry.timestamp}ms)`)
    }

    return entry.data
  }

  /**
   * Get TTL for specific data type
   */
  private getTTLForDataType(dataType: CacheKeyType): number {
    switch (dataType) {
      case 'commits':
        return this.config.commitsTTL || this.config.defaultTTL
      case 'fileChanges':
        return this.config.fileChangesTTL || this.config.defaultTTL
      case 'codeChanges':
        return this.config.codeChangesTTL || this.config.defaultTTL
      case 'commitMessages':
        return this.config.commitMessagesTTL || this.config.defaultTTL
      default:
        return this.config.defaultTTL
    }
  }

  /**
   * Set data in cache
   */
  set<T>(prUrl: string, dataType: CacheKeyType, data: T, ttl?: number): void {
    const key = this.generateCacheKey(prUrl, dataType)
    const now = Date.now()
    const effectiveTTL = ttl || this.getTTLForDataType(dataType)
    const expiresAt = now + effectiveTTL

    this.evictIfNeeded()

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt,
      accessCount: 1,
      lastAccessed: now
    }

    this.cache.set(key, entry)
    this.updateAccessOrder(key)

    if (this.config.enableDebugLogs) {
      console.log(`💾 Cache set: ${dataType} for ${prUrl} (TTL: ${effectiveTTL}ms)`)
    }
  }

  /**
   * Check if data exists in cache and is not expired
   */
  has(prUrl: string, dataType: CacheKeyType): boolean {
    const key = this.generateCacheKey(prUrl, dataType)
    const entry = this.cache.get(key)
    return entry !== undefined && !this.isExpired(entry)
  }

  /**
   * Clear specific cache entry
   */
  clear(prUrl: string, dataType?: CacheKeyType): void {
    if (dataType) {
      const key = this.generateCacheKey(prUrl, dataType)
      this.cache.delete(key)
      const index = this.accessOrder.indexOf(key)
      if (index > -1) {
        this.accessOrder.splice(index, 1)
      }
      if (this.config.enableDebugLogs) {
        console.log(`🧹 Cache cleared: ${dataType} for ${prUrl}`)
      }
    } else {
      // Clear all entries for this PR
      const urlPrefix = new URL(prUrl).origin + new URL(prUrl).pathname
      const keysToDelete: string[] = []
      
      for (const key of this.cache.keys()) {
        if (key.startsWith(urlPrefix)) {
          keysToDelete.push(key)
        }
      }
      
      keysToDelete.forEach(key => {
        this.cache.delete(key)
        const index = this.accessOrder.indexOf(key)
        if (index > -1) {
          this.accessOrder.splice(index, 1)
        }
      })
      
      if (this.config.enableDebugLogs) {
        console.log(`🧹 Cache cleared: all data for ${prUrl} (${keysToDelete.length} entries)`)
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    const entriesCount = this.cache.size
    this.cache.clear()
    this.accessOrder = []
    if (this.config.enableDebugLogs) {
      console.log(`🧹 Cache cleared: all entries (${entriesCount} total)`)
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Get cache info for debugging
   */
  getDebugInfo(): any {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      size: JSON.stringify(entry.data).length,
      age: Date.now() - entry.timestamp,
      ttl: entry.expiresAt - Date.now(),
      accessCount: entry.accessCount,
      expired: this.isExpired(entry)
    }))

    return {
      config: this.config,
      stats: this.stats,
      entries,
      totalEntries: this.cache.size,
      memoryUsage: entries.reduce((sum, entry) => sum + entry.size, 0)
    }
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig }
    if (this.config.enableDebugLogs) {
      console.log('⚙️ Cache config updated:', this.config)
    }
  }
}

// Export singleton instance
export const githubCacheService = new GitHubCacheService()

// Expose to global scope for debugging
if (typeof window !== 'undefined') {
  (window as any).githubCacheService = githubCacheService
}

export default githubCacheService
