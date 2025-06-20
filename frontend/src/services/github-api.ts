/**
 * GitHub API service for fetching PR data from backend
 */

import { defaultApiConfig } from "../../lib/servers/api-config"

export interface GitHubPRData {
  success: boolean
  pr_info?: {
    owner: string
    repo: string
    pr_number: string
    base_url?: string
  }
  files_data?: {
    success: boolean
    files: any[]
    formatted_changes: string
    total_files: number
  }
  commits_data?: {
    success: boolean
    commits: any[]
    formatted_commits: string[]
    total_commits: number
  }
  formatted_changes: string
  formatted_commits: string[]
  error: string
}

export interface GitHubAPIResponse {
  success: boolean
  data?: GitHubPRData
  error?: string
}

class GitHubAPIService {
  private baseUrl: string
  private apiVersion: string

  constructor() {
    this.baseUrl = defaultApiConfig.baseUrl
    this.apiVersion = defaultApiConfig.apiVersion
  }

  private getApiUrl(endpoint: string): string {
    return `${this.baseUrl}${this.apiVersion}${endpoint}`
  }



  /**
   * Fetch PR data using GitHub REST API via backend
   */
  async fetchPRData(prUrl: string): Promise<GitHubAPIResponse> {
    try {
      console.log("🚀 Fetching PR data via GitHub API:", prUrl)

      const requestBody = {
        pr_url: prUrl
      }

      const response = await fetch(this.getApiUrl("/ai/github/pr-data"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      console.log("📡 GitHub API response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ GitHub API error:", errorText)

        // Provide more specific error messages based on status code
        let errorMessage = `API error: ${response.status}`
        switch (response.status) {
          case 401:
            errorMessage = "Authentication failed - invalid or expired token"
            break
          case 403:
            errorMessage = "Access forbidden - insufficient permissions or rate limit exceeded"
            break
          case 404:
            errorMessage = "PR not found or access denied - may be a private repository"
            break
          case 500:
            errorMessage = "Server error - please try again later"
            break
          default:
            errorMessage = `API error: ${response.status} - ${errorText}`
        }

        return {
          success: false,
          error: errorMessage
        }
      }

      const data: GitHubPRData = await response.json()
      console.log("✅ GitHub API response:", data)

      return {
        success: data.success,
        data: data,
        error: data.error || undefined
      }

    } catch (error) {
      console.error("❌ GitHub API fetch failed:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }

  /**
   * Extract formatted code changes from API response
   */
  extractCodeChanges(data: GitHubPRData): string {
    if (!data.success) {
      return ""
    }

    // Prefer formatted changes from API
    if (data.formatted_changes && data.formatted_changes.trim()) {
      return data.formatted_changes
    }

    // Fallback to raw files data
    if (data.files_data?.files && data.files_data.files.length > 0) {
      const changes = data.files_data.files.map(file => {
        const filename = file.filename || "Unknown file"
        const status = file.status || "modified"
        const additions = file.additions || 0
        const deletions = file.deletions || 0
        
        return `File: ${filename} (${status}) +${additions} -${deletions}`
      }).join("\n")
      
      return changes
    }

    return ""
  }

  /**
   * Extract formatted commit messages from API response
   */
  extractCommitMessages(data: GitHubPRData): string[] {
    if (!data.success) {
      return []
    }

    // Prefer formatted commits from API
    if (data.formatted_commits && data.formatted_commits.length > 0) {
      return data.formatted_commits
    }

    // Fallback to raw commits data
    if (data.commits_data?.commits && data.commits_data.commits.length > 0) {
      return data.commits_data.commits.map(commit => {
        const message = commit.commit?.message || "No commit message"
        const author = commit.commit?.author?.name || "Unknown author"
        const sha = commit.sha?.substring(0, 8) || "unknown"
        
        return `[${sha}] ${message.split('\n')[0]} (by ${author})`
      })
    }

    return []
  }

  /**
   * Get PR metadata from URL
   */
  parsePRUrl(prUrl: string): { owner: string; repo: string; prNumber: string } | null {
    try {
      const patterns = [
        /https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/,
        /https?:\/\/git\.autodesk\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/,
      ]

      for (const pattern of patterns) {
        const match = prUrl.match(pattern)
        if (match) {
          const [, owner, repo, prNumber] = match
          return { owner, repo, prNumber }
        }
      }

      return null
    } catch (error) {
      console.error("Error parsing PR URL:", error)
      return null
    }
  }

  /**
   * Check if GitHub API is available and configured
   */
  async checkAPIAvailability(): Promise<boolean> {
    try {
      // Test with a simple health check or a minimal API call
      const response = await fetch(this.getApiUrl("/ai/health"))
      return response.ok
    } catch (error) {
      console.error("GitHub API availability check failed:", error)
      return false
    }
  }
}

// Export singleton instance
export const githubAPIService = new GitHubAPIService()
export default githubAPIService
