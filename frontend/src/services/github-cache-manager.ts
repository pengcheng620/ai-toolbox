/**
 * GitHub Cache Manager
 * 
 * Provides high-level cache management utilities and debugging tools
 * for the GitHub PR data caching system.
 */

import githubCacheService from './github-cache-service'

export class GitHubCacheManager {
  /**
   * Clear all cache for the current PR
   */
  static clearCurrentPR(): void {
    const currentUrl = window.location.href
    githubCacheService.clear(currentUrl)
    console.log('🧹 Cleared all cache for current PR')
  }

  /**
   * Clear specific data type for current PR
   */
  static clearCurrentPRData(dataType: 'commits' | 'fileChanges' | 'codeChanges' | 'commitMessages'): void {
    const currentUrl = window.location.href
    githubCacheService.clear(currentUrl, dataType)
    console.log(`🧹 Cleared ${dataType} cache for current PR`)
  }

  /**
   * Clear all cache entries
   */
  static clearAll(): void {
    githubCacheService.clearAll()
    console.log('🧹 Cleared all cache entries')
  }

  /**
   * Get cache statistics
   */
  static getStats() {
    const stats = githubCacheService.getStats()
    console.table(stats)
    return stats
  }

  /**
   * Get detailed cache information for debugging
   */
  static getDebugInfo() {
    const info = githubCacheService.getDebugInfo()
    console.log('📊 Cache Debug Information:')
    console.log('Config:', info.config)
    console.log('Stats:', info.stats)
    console.log('Memory Usage:', `${(info.memoryUsage / 1024).toFixed(2)} KB`)
    console.table(info.entries)
    return info
  }

  /**
   * Check if current PR has cached data
   */
  static getCurrentPRCacheStatus() {
    const currentUrl = window.location.href
    const status = {
      commits: githubCacheService.has(currentUrl, 'commits'),
      fileChanges: githubCacheService.has(currentUrl, 'fileChanges'),
      codeChanges: githubCacheService.has(currentUrl, 'codeChanges'),
      commitMessages: githubCacheService.has(currentUrl, 'commitMessages')
    }
    
    console.log('📋 Current PR Cache Status:')
    console.table(status)
    return status
  }

  /**
   * Warm up cache for current PR by pre-fetching all data
   */
  static async warmUpCurrentPR(): Promise<void> {
    console.log('🔥 Warming up cache for current PR...')
    
    try {
      // Import services dynamically to avoid circular dependencies
      const [
        { fetchPRCommitMessages, fetchPRFileChanges },
        { getGitHubPageStrategy }
      ] = await Promise.all([
        import('./github-pr-page-service'),
        import('../../lib/utils/github')
      ])

      const strategy = getGitHubPageStrategy()

      // Pre-fetch all data types in parallel
      const promises = [
        fetchPRCommitMessages().catch(e => console.warn('Failed to warm up commits:', e)),
        fetchPRFileChanges().catch(e => console.warn('Failed to warm up file changes:', e)),
        strategy.getCodeChanges().catch(e => console.warn('Failed to warm up code changes:', e)),
        strategy.getCommitMessages().catch(e => console.warn('Failed to warm up commit messages:', e))
      ]

      await Promise.allSettled(promises)
      console.log('✅ Cache warm-up completed')
      
      // Show updated cache status
      this.getCurrentPRCacheStatus()
    } catch (error) {
      console.error('❌ Cache warm-up failed:', error)
    }
  }

  /**
   * Monitor cache performance over time
   */
  static startPerformanceMonitoring(intervalMs: number = 30000): () => void {
    console.log('📈 Starting cache performance monitoring...')
    
    let lastStats = githubCacheService.getStats()
    
    const intervalId = setInterval(() => {
      const currentStats = githubCacheService.getStats()
      const deltaHits = currentStats.hits - lastStats.hits
      const deltaMisses = currentStats.misses - lastStats.misses
      const deltaRequests = currentStats.totalRequests - lastStats.totalRequests
      
      if (deltaRequests > 0) {
        console.log(`📊 Cache Performance (last ${intervalMs/1000}s):`, {
          requests: deltaRequests,
          hits: deltaHits,
          misses: deltaMisses,
          hitRate: deltaRequests > 0 ? ((deltaHits / deltaRequests) * 100).toFixed(1) + '%' : 'N/A'
        })
      }
      
      lastStats = currentStats
    }, intervalMs)

    // Return cleanup function
    return () => {
      clearInterval(intervalId)
      console.log('📈 Cache performance monitoring stopped')
    }
  }

  /**
   * Export cache data for analysis
   */
  static exportCacheData(): string {
    const debugInfo = githubCacheService.getDebugInfo()
    const exportData = {
      timestamp: new Date().toISOString(),
      config: debugInfo.config,
      stats: debugInfo.stats,
      entries: debugInfo.entries.map(entry => ({
        key: entry.key,
        size: entry.size,
        age: entry.age,
        ttl: entry.ttl,
        accessCount: entry.accessCount,
        expired: entry.expired
      }))
    }
    
    const jsonData = JSON.stringify(exportData, null, 2)
    console.log('📤 Cache data exported:', jsonData)
    return jsonData
  }

  /**
   * Validate cache integrity
   */
  static validateCacheIntegrity(): boolean {
    try {
      const debugInfo = githubCacheService.getDebugInfo()
      let isValid = true
      const issues: string[] = []

      // Check for expired entries that should have been cleaned up
      const expiredEntries = debugInfo.entries.filter(entry => entry.expired)
      if (expiredEntries.length > 0) {
        issues.push(`Found ${expiredEntries.length} expired entries`)
        isValid = false
      }

      // Check memory usage
      const memoryUsageMB = debugInfo.memoryUsage / (1024 * 1024)
      if (memoryUsageMB > 10) { // 10MB threshold
        issues.push(`High memory usage: ${memoryUsageMB.toFixed(2)}MB`)
      }

      // Check hit rate
      if (debugInfo.stats.totalRequests > 10 && debugInfo.stats.hitRate < 30) {
        issues.push(`Low hit rate: ${debugInfo.stats.hitRate.toFixed(1)}%`)
      }

      if (isValid) {
        console.log('✅ Cache integrity check passed')
      } else {
        console.warn('⚠️ Cache integrity issues found:', issues)
      }

      return isValid
    } catch (error) {
      console.error('❌ Cache integrity check failed:', error)
      return false
    }
  }
}

// Expose to global scope for debugging
if (typeof window !== 'undefined') {
  (window as any).GitHubCacheManager = GitHubCacheManager
  
  // Add convenient global shortcuts
  (window as any).clearPRCache = () => GitHubCacheManager.clearCurrentPR()
  (window as any).cacheStats = () => GitHubCacheManager.getStats()
  (window as any).cacheDebug = () => GitHubCacheManager.getDebugInfo()
  (window as any).warmUpCache = () => GitHubCacheManager.warmUpCurrentPR()
}

export default GitHubCacheManager
