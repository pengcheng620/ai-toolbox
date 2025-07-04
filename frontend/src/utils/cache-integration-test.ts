/**
 * Cache Integration Test
 * 
 * Simple integration test to verify cache functionality works correctly
 * with the existing GitHub PR data fetching system.
 */

import githubCacheService from '../services/github-cache-service'
import GitHubCacheManager from '../services/github-cache-manager'

export async function runBasicCacheTest(): Promise<boolean> {
  console.log('🧪 Running basic cache integration test...')
  
  try {
    const testUrl = 'https://github.com/test/repo/pull/123'
    const testData = {
      commits: [
        {
          sha: 'abc123',
          message: 'Test commit',
          author: 'Test Author',
          date: '2024-01-01T00:00:00Z',
          jiraTicket: null,
          commitUrl: 'https://github.com/test/repo/commit/abc123'
        }
      ],
      fileChanges: [
        {
          filePath: 'test.ts',
          status: 'modified' as const,
          additions: 5,
          deletions: 2,
          lines: []
        }
      ],
      codeChanges: 'Test code changes content',
      commitMessages: ['Test commit message']
    }

    // Test 1: Cache miss
    console.log('📝 Test 1: Cache miss behavior')
    const initialCommits = githubCacheService.get(testUrl, 'commits')
    if (initialCommits !== null) {
      console.error('❌ Expected cache miss, but got data')
      return false
    }
    console.log('✅ Cache miss test passed')

    // Test 2: Cache set and hit
    console.log('📝 Test 2: Cache set and hit')
    githubCacheService.set(testUrl, 'commits', testData.commits)
    githubCacheService.set(testUrl, 'fileChanges', testData.fileChanges)
    githubCacheService.set(testUrl, 'codeChanges', testData.codeChanges)
    githubCacheService.set(testUrl, 'commitMessages', testData.commitMessages)

    const cachedCommits = githubCacheService.get(testUrl, 'commits')
    if (!cachedCommits || cachedCommits.length !== testData.commits.length) {
      console.error('❌ Cache hit failed for commits')
      return false
    }
    console.log('✅ Cache hit test passed')

    // Test 3: Cache has method
    console.log('📝 Test 3: Cache has method')
    const hasCommits = githubCacheService.has(testUrl, 'commits')
    const hasNonExistent = githubCacheService.has(testUrl + '_fake', 'commits')
    
    if (!hasCommits || hasNonExistent) {
      console.error('❌ Cache has method failed')
      return false
    }
    console.log('✅ Cache has method test passed')

    // Test 4: Cache clear
    console.log('📝 Test 4: Cache clear')
    githubCacheService.clear(testUrl, 'commits')
    const clearedCommits = githubCacheService.get(testUrl, 'commits')
    
    if (clearedCommits !== null) {
      console.error('❌ Cache clear failed')
      return false
    }
    console.log('✅ Cache clear test passed')

    // Test 5: Cache manager functions
    console.log('📝 Test 5: Cache manager functions')
    githubCacheService.set(testUrl, 'commits', testData.commits)
    
    const stats = GitHubCacheManager.getStats()
    if (typeof stats.hits !== 'number' || typeof stats.misses !== 'number') {
      console.error('❌ Cache stats failed')
      return false
    }
    
    GitHubCacheManager.clearAll()
    const clearedStats = githubCacheService.get(testUrl, 'commits')
    if (clearedStats !== null) {
      console.error('❌ Cache manager clear all failed')
      return false
    }
    console.log('✅ Cache manager test passed')

    console.log('🎉 All cache integration tests passed!')
    return true

  } catch (error) {
    console.error('❌ Cache integration test failed:', error)
    return false
  }
}

export async function runCachePerformanceComparison(): Promise<void> {
  console.log('⚡ Running cache performance comparison...')
  
  const testUrl = window.location.href
  const testData = Array(100).fill(null).map((_, i) => ({
    sha: `sha${i}`,
    message: `Test commit ${i}`,
    author: 'Test Author',
    date: new Date().toISOString(),
    jiraTicket: null,
    commitUrl: `https://github.com/test/repo/commit/sha${i}`
  }))

  // Warm up cache
  githubCacheService.set(testUrl, 'commits', testData)

  // Test cache hit performance
  const cacheHitTimes: number[] = []
  for (let i = 0; i < 10; i++) {
    const start = performance.now()
    githubCacheService.get(testUrl, 'commits')
    const end = performance.now()
    cacheHitTimes.push(end - start)
  }

  // Test cache miss performance (simulate)
  const cacheMissTimes: number[] = []
  for (let i = 0; i < 10; i++) {
    const start = performance.now()
    githubCacheService.get(testUrl + `_miss_${i}`, 'commits')
    const end = performance.now()
    cacheMissTimes.push(end - start)
  }

  const avgHitTime = cacheHitTimes.reduce((a, b) => a + b, 0) / cacheHitTimes.length
  const avgMissTime = cacheMissTimes.reduce((a, b) => a + b, 0) / cacheMissTimes.length

  console.log('📊 Performance Comparison Results:')
  console.log(`Average cache hit time: ${avgHitTime.toFixed(3)}ms`)
  console.log(`Average cache miss time: ${avgMissTime.toFixed(3)}ms`)
  console.log(`Performance improvement: ${(avgMissTime / avgHitTime).toFixed(1)}x faster`)
  
  // Clean up
  GitHubCacheManager.clearAll()
}

// Expose to global scope for manual testing
if (typeof window !== 'undefined') {
  (window as any).runBasicCacheTest = runBasicCacheTest
  (window as any).runCachePerformanceComparison = runCachePerformanceComparison
}

export default {
  runBasicCacheTest,
  runCachePerformanceComparison
}
