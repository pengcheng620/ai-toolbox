/**
 * Cache Performance Testing Utilities
 * 
 * Provides tools to test and validate the GitHub PR data caching system.
 * Useful for development, debugging, and performance optimization.
 */

import githubCacheService from '../services/github-cache-service'
import GitHubCacheManager from '../services/github-cache-manager'
import { fetchPRCommitMessages, fetchPRFileChanges } from '../services/github-pr-page-service'
import { getGitHubPageStrategy } from '../../lib/utils/github'

export interface PerformanceTestResult {
  testName: string
  duration: number
  cacheHit: boolean
  dataSize: number
  error?: string
}

export interface CachePerformanceReport {
  testResults: PerformanceTestResult[]
  summary: {
    totalTests: number
    cacheHits: number
    cacheMisses: number
    averageHitTime: number
    averageMissTime: number
    totalDataSize: number
    hitRate: number
  }
  cacheStats: any
}

export class CachePerformanceTester {
  private results: PerformanceTestResult[] = []

  /**
   * Test individual data fetching performance
   */
  private async testDataFetch<T>(
    testName: string,
    fetchFunction: () => Promise<T>,
    prUrl: string,
    dataType: 'commits' | 'fileChanges' | 'codeChanges' | 'commitMessages'
  ): Promise<PerformanceTestResult> {
    const startTime = performance.now()
    const cacheHit = githubCacheService.has(prUrl, dataType)
    
    try {
      const data = await fetchFunction()
      const endTime = performance.now()
      const duration = endTime - startTime
      const dataSize = JSON.stringify(data).length

      return {
        testName,
        duration,
        cacheHit,
        dataSize,
      }
    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime

      return {
        testName,
        duration,
        cacheHit,
        dataSize: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Run comprehensive cache performance tests
   */
  async runPerformanceTests(): Promise<CachePerformanceReport> {
    console.log('🧪 Starting cache performance tests...')
    this.results = []

    const prUrl = window.location.href
    const strategy = getGitHubPageStrategy()

    // Clear cache to start fresh
    GitHubCacheManager.clearCurrentPR()

    // Test 1: Cold cache (first fetch)
    console.log('📊 Testing cold cache performance...')
    
    const coldTests = await Promise.allSettled([
      this.testDataFetch('Commits (Cold)', () => fetchPRCommitMessages(), prUrl, 'commits'),
      this.testDataFetch('File Changes (Cold)', () => fetchPRFileChanges(), prUrl, 'fileChanges'),
      this.testDataFetch('Code Changes (Cold)', () => strategy.getCodeChanges(), prUrl, 'codeChanges'),
      this.testDataFetch('Commit Messages (Cold)', () => strategy.getCommitMessages(), prUrl, 'commitMessages')
    ])

    coldTests.forEach(result => {
      if (result.status === 'fulfilled') {
        this.results.push(result.value)
      }
    })

    // Wait a bit to ensure cache is populated
    await new Promise(resolve => setTimeout(resolve, 100))

    // Test 2: Warm cache (second fetch)
    console.log('📊 Testing warm cache performance...')
    
    const warmTests = await Promise.allSettled([
      this.testDataFetch('Commits (Warm)', () => fetchPRCommitMessages(), prUrl, 'commits'),
      this.testDataFetch('File Changes (Warm)', () => fetchPRFileChanges(), prUrl, 'fileChanges'),
      this.testDataFetch('Code Changes (Warm)', () => strategy.getCodeChanges(), prUrl, 'codeChanges'),
      this.testDataFetch('Commit Messages (Warm)', () => strategy.getCommitMessages(), prUrl, 'commitMessages')
    ])

    warmTests.forEach(result => {
      if (result.status === 'fulfilled') {
        this.results.push(result.value)
      }
    })

    // Test 3: Rapid successive calls (stress test)
    console.log('📊 Testing rapid successive calls...')
    
    const rapidTests = []
    for (let i = 0; i < 5; i++) {
      rapidTests.push(
        this.testDataFetch(`Rapid Commits ${i + 1}`, () => fetchPRCommitMessages(), prUrl, 'commits')
      )
    }

    const rapidResults = await Promise.allSettled(rapidTests)
    rapidResults.forEach(result => {
      if (result.status === 'fulfilled') {
        this.results.push(result.value)
      }
    })

    // Generate report
    return this.generateReport()
  }

  /**
   * Generate performance report
   */
  private generateReport(): CachePerformanceReport {
    const cacheHits = this.results.filter(r => r.cacheHit)
    const cacheMisses = this.results.filter(r => !r.cacheHit)
    
    const averageHitTime = cacheHits.length > 0 
      ? cacheHits.reduce((sum, r) => sum + r.duration, 0) / cacheHits.length 
      : 0
    
    const averageMissTime = cacheMisses.length > 0 
      ? cacheMisses.reduce((sum, r) => sum + r.duration, 0) / cacheMisses.length 
      : 0

    const totalDataSize = this.results.reduce((sum, r) => sum + r.dataSize, 0)
    const hitRate = this.results.length > 0 
      ? (cacheHits.length / this.results.length) * 100 
      : 0

    const report: CachePerformanceReport = {
      testResults: this.results,
      summary: {
        totalTests: this.results.length,
        cacheHits: cacheHits.length,
        cacheMisses: cacheMisses.length,
        averageHitTime,
        averageMissTime,
        totalDataSize,
        hitRate
      },
      cacheStats: githubCacheService.getStats()
    }

    // Log report to console
    console.log('📊 Cache Performance Report:')
    console.table(this.results)
    console.log('Summary:', report.summary)
    console.log('Cache Stats:', report.cacheStats)

    return report
  }

  /**
   * Test cache memory usage
   */
  async testMemoryUsage(): Promise<any> {
    console.log('🧠 Testing cache memory usage...')
    
    const initialDebugInfo = githubCacheService.getDebugInfo()
    const initialMemory = initialDebugInfo.memoryUsage

    // Populate cache with multiple PRs (simulate)
    const testUrls = [
      'https://github.com/test/repo/pull/1',
      'https://github.com/test/repo/pull/2',
      'https://github.com/test/repo/pull/3'
    ]

    const testData = {
      commits: Array(10).fill(null).map((_, i) => ({
        sha: `sha${i}`,
        message: `Test commit ${i}`,
        author: 'Test Author',
        date: new Date().toISOString(),
        jiraTicket: null,
        commitUrl: `https://github.com/test/repo/commit/sha${i}`
      })),
      fileChanges: Array(5).fill(null).map((_, i) => ({
        filePath: `test/file${i}.ts`,
        status: 'modified' as const,
        additions: 10,
        deletions: 5,
        lines: []
      }))
    }

    // Populate cache
    testUrls.forEach(url => {
      githubCacheService.set(url, 'commits', testData.commits)
      githubCacheService.set(url, 'fileChanges', testData.fileChanges)
      githubCacheService.set(url, 'codeChanges', 'Test code changes content')
      githubCacheService.set(url, 'commitMessages', ['Test commit 1', 'Test commit 2'])
    })

    const finalDebugInfo = githubCacheService.getDebugInfo()
    const finalMemory = finalDebugInfo.memoryUsage

    const memoryReport = {
      initialMemory,
      finalMemory,
      memoryIncrease: finalMemory - initialMemory,
      entriesAdded: testUrls.length * 4, // 4 data types per URL
      averageEntrySize: (finalMemory - initialMemory) / (testUrls.length * 4),
      debugInfo: finalDebugInfo
    }

    console.log('🧠 Memory Usage Report:', memoryReport)
    return memoryReport
  }

  /**
   * Test cache expiration behavior
   */
  async testCacheExpiration(): Promise<any> {
    console.log('⏰ Testing cache expiration...')
    
    const testUrl = window.location.href
    const testData = ['test', 'commit', 'messages']
    
    // Set cache with short TTL
    githubCacheService.set(testUrl, 'commitMessages', testData, 1000) // 1 second TTL
    
    // Verify cache hit immediately
    const immediateResult = githubCacheService.get(testUrl, 'commitMessages')
    const immediateHit = immediateResult !== null
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100))
    
    // Verify cache miss after expiration
    const expiredResult = githubCacheService.get(testUrl, 'commitMessages')
    const expiredMiss = expiredResult === null
    
    const expirationReport = {
      immediateHit,
      expiredMiss,
      testPassed: immediateHit && expiredMiss
    }
    
    console.log('⏰ Cache Expiration Report:', expirationReport)
    return expirationReport
  }
}

// Export utilities for global access
export const cachePerformanceTester = new CachePerformanceTester()

// Expose to global scope for debugging
if (typeof window !== 'undefined') {
  (window as any).cachePerformanceTester = cachePerformanceTester
  (window as any).runCacheTests = () => cachePerformanceTester.runPerformanceTests()
  (window as any).testCacheMemory = () => cachePerformanceTester.testMemoryUsage()
  (window as any).testCacheExpiration = () => cachePerformanceTester.testCacheExpiration()
}

export default cachePerformanceTester
