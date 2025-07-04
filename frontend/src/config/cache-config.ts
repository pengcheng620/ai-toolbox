/**
 * Cache Configuration
 * 
 * Centralized configuration for GitHub PR data caching system.
 * Allows easy adjustment of cache behavior without modifying core logic.
 */

export interface CacheConfiguration {
  // Cache size limits
  maxEntries: number
  maxMemoryMB: number
  
  // Time-to-live settings (in milliseconds)
  defaultTTL: number
  commitsTTL: number
  fileChangesTTL: number
  codeChangesTTL: number
  commitMessagesTTL: number
  
  // Performance settings
  enableStats: boolean
  enableDebugLogs: boolean
  enableWarmUp: boolean
  warmUpDelay: number // delay before starting warm-up
  
  // Monitoring settings
  performanceMonitoringInterval: number
  integrityCheckInterval: number
  
  // Error handling
  enableGracefulDegradation: boolean // return expired cache on network errors
  maxRetries: number
  retryDelay: number
}

// Default configuration
export const defaultCacheConfig: CacheConfiguration = {
  // Cache size limits
  maxEntries: 10, // Max 10 PRs worth of data
  maxMemoryMB: 50, // 50MB memory limit
  
  // Time-to-live settings (5 minutes default)
  defaultTTL: 5 * 60 * 1000,
  commitsTTL: 10 * 60 * 1000, // Commits change less frequently
  fileChangesTTL: 5 * 60 * 1000,
  codeChangesTTL: 5 * 60 * 1000,
  commitMessagesTTL: 10 * 60 * 1000,
  
  // Performance settings
  enableStats: true,
  enableDebugLogs: process.env.NODE_ENV === 'development',
  enableWarmUp: true,
  warmUpDelay: 2000, // 2 seconds delay
  
  // Monitoring settings
  performanceMonitoringInterval: 30 * 1000, // 30 seconds
  integrityCheckInterval: 5 * 60 * 1000, // 5 minutes
  
  // Error handling
  enableGracefulDegradation: true,
  maxRetries: 3,
  retryDelay: 1000 // 1 second
}

// Environment-specific configurations
export const developmentCacheConfig: Partial<CacheConfiguration> = {
  enableDebugLogs: true,
  enableStats: true,
  defaultTTL: 2 * 60 * 1000, // Shorter TTL for development
  performanceMonitoringInterval: 10 * 1000 // More frequent monitoring
}

export const productionCacheConfig: Partial<CacheConfiguration> = {
  enableDebugLogs: false,
  enableStats: true,
  maxEntries: 15, // More entries in production
  maxMemoryMB: 100 // More memory in production
}

// Cache strategy configurations for different scenarios
export const cacheStrategies = {
  // Aggressive caching for stable PRs
  aggressive: {
    defaultTTL: 15 * 60 * 1000, // 15 minutes
    commitsTTL: 30 * 60 * 1000, // 30 minutes
    maxEntries: 20
  },
  
  // Conservative caching for active development
  conservative: {
    defaultTTL: 2 * 60 * 1000, // 2 minutes
    commitsTTL: 5 * 60 * 1000, // 5 minutes
    maxEntries: 5
  },
  
  // Minimal caching for testing
  minimal: {
    defaultTTL: 30 * 1000, // 30 seconds
    commitsTTL: 60 * 1000, // 1 minute
    maxEntries: 3
  }
}

/**
 * Get cache configuration based on environment and user preferences
 */
export function getCacheConfig(): CacheConfiguration {
  const baseConfig = { ...defaultCacheConfig }
  
  // Apply environment-specific overrides
  if (process.env.NODE_ENV === 'development') {
    Object.assign(baseConfig, developmentCacheConfig)
  } else if (process.env.NODE_ENV === 'production') {
    Object.assign(baseConfig, productionCacheConfig)
  }
  
  // Apply user preferences from localStorage if available
  try {
    const userPrefs = localStorage.getItem('github-cache-config')
    if (userPrefs) {
      const parsedPrefs = JSON.parse(userPrefs)
      Object.assign(baseConfig, parsedPrefs)
    }
  } catch (error) {
    console.warn('Failed to load user cache preferences:', error)
  }
  
  return baseConfig
}

/**
 * Save user cache preferences to localStorage
 */
export function saveCacheConfig(config: Partial<CacheConfiguration>): void {
  try {
    localStorage.setItem('github-cache-config', JSON.stringify(config))
    console.log('Cache configuration saved:', config)
  } catch (error) {
    console.error('Failed to save cache configuration:', error)
  }
}

/**
 * Reset cache configuration to defaults
 */
export function resetCacheConfig(): void {
  try {
    localStorage.removeItem('github-cache-config')
    console.log('Cache configuration reset to defaults')
  } catch (error) {
    console.error('Failed to reset cache configuration:', error)
  }
}

/**
 * Apply cache strategy preset
 */
export function applyCacheStrategy(strategyName: keyof typeof cacheStrategies): void {
  const strategy = cacheStrategies[strategyName]
  if (strategy) {
    saveCacheConfig(strategy)
    console.log(`Applied cache strategy: ${strategyName}`, strategy)
  } else {
    console.error(`Unknown cache strategy: ${strategyName}`)
  }
}

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).cacheConfig = {
    get: getCacheConfig,
    save: saveCacheConfig,
    reset: resetCacheConfig,
    applyStrategy: applyCacheStrategy,
    strategies: cacheStrategies
  }
}
