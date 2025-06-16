/**
 * Jira DOM parser service for extracting Sprint and Issue data from page
 */

import type { 
  SprintData, 
  JiraIssue, 
  JiraSprint, 
  TeamMember, 
  DOMParsingResult,
  JiraUser 
} from "~types/sprint-planning"

export class JiraDOMParser {
  private static instance: JiraDOMParser
  
  public static getInstance(): JiraDOMParser {
    if (!JiraDOMParser.instance) {
      JiraDOMParser.instance = new JiraDOMParser()
    }
    return JiraDOMParser.instance
  }

  /**
   * Parse current page for Sprint Planning data
   */
  public async parseCurrentPage(boardId: string): Promise<DOMParsingResult> {
    try {
      // Wait for page content to load
      await this.waitForPageLoad()

      const sprintData = await this.extractSprintData(boardId)
      const teamMembers = this.extractTeamMembers()

      return {
        boardId,
        sprintData,
        teamMembers
      }
    } catch (error) {
      return {
        boardId,
        error: `Failed to parse page: ${error.message}`
      }
    }
  }

  /**
   * Extract sprint data from current page
   */
  private async extractSprintData(boardId: string): Promise<SprintData | undefined> {
    try {
      const sprint = this.extractCurrentSprint(boardId)
      if (!sprint) {
        return undefined
      }

      const issues = this.extractIssues()
      const totalStoryPoints = this.calculateTotalStoryPoints(issues)
      const issuesByStatus = this.groupIssuesByStatus(issues)
      const issuesByAssignee = this.groupIssuesByAssignee(issues)

      return {
        sprint,
        issues,
        totalStoryPoints,
        issuesByStatus,
        issuesByAssignee
      }
    } catch (error) {
      console.error('Failed to extract sprint data:', error)
      return undefined
    }
  }

  /**
   * Extract current sprint information
   */
  private extractCurrentSprint(boardId: string): JiraSprint | undefined {
    // Try different selectors for sprint information
    const sprintSelectors = [
      '.ghx-sprint-group .ghx-name',
      '[data-testid*="sprint"] .ghx-name',
      '.sprint-header .ghx-name',
      '.ghx-sprint .ghx-name'
    ]

    for (const selector of sprintSelectors) {
      const element = document.querySelector(selector)
      if (element && element.textContent) {
        const sprintName = element.textContent.trim()
        
        // Extract sprint ID if available
        const sprintId = this.extractSprintIdFromElement(element) || `sprint-${Date.now()}`
        
        return {
          id: sprintId,
          name: sprintName,
          state: 'active', // Assume active if we're viewing it
          boardId
        }
      }
    }

    // Fallback: create a default sprint
    return {
      id: `sprint-${boardId}-current`,
      name: 'Current Sprint',
      state: 'active',
      boardId
    }
  }

  /**
   * Extract sprint ID from DOM element
   */
  private extractSprintIdFromElement(element: Element): string | null {
    // Check data attributes
    const dataAttrs = ['data-sprint-id', 'data-id']
    for (const attr of dataAttrs) {
      const value = element.getAttribute(attr)
      if (value) return value
    }

    // Check parent elements
    let parent = element.parentElement
    while (parent) {
      for (const attr of dataAttrs) {
        const value = parent.getAttribute(attr)
        if (value) return value
      }
      parent = parent.parentElement
    }

    return null
  }

  /**
   * Extract issues from current page
   */
  private extractIssues(): JiraIssue[] {
    const issues: JiraIssue[] = []
    
    // Try different selectors for issue cards
    const issueSelectors = [
      '.ghx-issue',
      '[data-testid*="issue"]',
      '.issue-card',
      '.ghx-card'
    ]

    for (const selector of issueSelectors) {
      const issueElements = document.querySelectorAll(selector)
      
      for (const element of issueElements) {
        const issue = this.parseIssueElement(element)
        if (issue) {
          issues.push(issue)
        }
      }
      
      if (issues.length > 0) break // Use first successful selector
    }

    return issues
  }

  /**
   * Parse individual issue element
   */
  private parseIssueElement(element: Element): JiraIssue | null {
    try {
      // Extract issue key
      const keyElement = element.querySelector('.ghx-key, [data-testid*="issue-key"], .issue-key')
      const key = keyElement?.textContent?.trim()
      if (!key) return null

      // Extract issue ID (usually same as key or derived from it)
      const id = element.getAttribute('data-issue-id') || 
                 element.getAttribute('data-issue-key') || 
                 key

      // Extract summary
      const summaryElement = element.querySelector('.ghx-summary, [data-testid*="summary"], .issue-summary')
      const summary = summaryElement?.textContent?.trim() || 'No summary'

      // Extract issue type
      const typeElement = element.querySelector('.ghx-type, [data-testid*="issue-type"], .issue-type img')
      const issueType = {
        id: typeElement?.getAttribute('data-issue-type') || 'unknown',
        name: typeElement?.getAttribute('alt') || typeElement?.getAttribute('title') || 'Unknown',
        iconUrl: typeElement?.getAttribute('src')
      }

      // Extract status
      const statusElement = element.querySelector('.ghx-status, [data-testid*="status"], .issue-status')
      const status = {
        id: statusElement?.getAttribute('data-status-id') || 'unknown',
        name: statusElement?.textContent?.trim() || 'Unknown',
        statusCategory: this.getStatusCategory(statusElement?.textContent?.trim() || '')
      }

      // Extract assignee
      const assigneeElement = element.querySelector('.ghx-assignee, [data-testid*="assignee"], .issue-assignee img')
      const assignee = assigneeElement ? this.parseUserFromElement(assigneeElement) : undefined

      // Extract priority
      const priorityElement = element.querySelector('.ghx-priority, [data-testid*="priority"], .issue-priority img')
      const priority = {
        id: priorityElement?.getAttribute('data-priority-id') || 'unknown',
        name: priorityElement?.getAttribute('alt') || priorityElement?.getAttribute('title') || 'Unknown',
        iconUrl: priorityElement?.getAttribute('src')
      }

      // Extract story points
      const storyPointsElement = element.querySelector('.ghx-estimate, [data-testid*="story-points"], .story-points')
      const storyPointsText = storyPointsElement?.textContent?.trim()
      const storyPoints = storyPointsText ? parseInt(storyPointsText, 10) : undefined

      // Extract labels
      const labelElements = element.querySelectorAll('.ghx-label, [data-testid*="label"], .issue-label')
      const labels = Array.from(labelElements).map(el => el.textContent?.trim() || '').filter(Boolean)

      return {
        id,
        key,
        summary,
        issueType,
        status,
        assignee,
        priority,
        storyPoints,
        labels,
        components: [], // Would need more complex parsing
        fixVersions: [], // Would need more complex parsing
        created: new Date().toISOString(), // Placeholder
        updated: new Date().toISOString()  // Placeholder
      }
    } catch (error) {
      console.error('Failed to parse issue element:', error)
      return null
    }
  }

  /**
   * Parse user information from DOM element
   */
  private parseUserFromElement(element: Element): JiraUser | undefined {
    const name = element.getAttribute('data-user-name') || 
                 element.getAttribute('alt') || 
                 element.getAttribute('title')
    
    if (!name) return undefined

    return {
      id: element.getAttribute('data-user-id') || name,
      name,
      displayName: name,
      avatar: element.getAttribute('src')
    }
  }

  /**
   * Get status category from status name
   */
  private getStatusCategory(statusName: string): string {
    const lowerStatus = statusName.toLowerCase()
    
    if (lowerStatus.includes('done') || lowerStatus.includes('closed') || lowerStatus.includes('resolved')) {
      return 'done'
    } else if (lowerStatus.includes('progress') || lowerStatus.includes('review') || lowerStatus.includes('testing')) {
      return 'indeterminate'
    } else {
      return 'new'
    }
  }

  /**
   * Calculate total story points from issues
   */
  private calculateTotalStoryPoints(issues: JiraIssue[]): number {
    return issues.reduce((total, issue) => total + (issue.storyPoints || 0), 0)
  }

  /**
   * Group issues by status
   */
  private groupIssuesByStatus(issues: JiraIssue[]): Record<string, JiraIssue[]> {
    return issues.reduce((groups, issue) => {
      const status = issue.status.name
      if (!groups[status]) {
        groups[status] = []
      }
      groups[status].push(issue)
      return groups
    }, {} as Record<string, JiraIssue[]>)
  }

  /**
   * Group issues by assignee
   */
  private groupIssuesByAssignee(issues: JiraIssue[]): Record<string, JiraIssue[]> {
    return issues.reduce((groups, issue) => {
      const assigneeId = issue.assignee?.id || 'unassigned'
      if (!groups[assigneeId]) {
        groups[assigneeId] = []
      }
      groups[assigneeId].push(issue)
      return groups
    }, {} as Record<string, JiraIssue[]>)
  }

  /**
   * Extract team members from page
   */
  private extractTeamMembers(): TeamMember[] {
    const members: TeamMember[] = []
    const seenMembers = new Set<string>()

    // Try to find assignee avatars and user information
    const userSelectors = [
      '.ghx-assignee img',
      '[data-testid*="assignee"] img',
      '.issue-assignee img',
      '.user-avatar'
    ]

    for (const selector of userSelectors) {
      const userElements = document.querySelectorAll(selector)
      
      for (const element of userElements) {
        const user = this.parseUserFromElement(element)
        if (user && !seenMembers.has(user.id)) {
          seenMembers.add(user.id)
          members.push({
            id: user.id,
            name: user.name,
            displayName: user.displayName,
            avatar: user.avatar
          })
        }
      }
    }

    return members
  }

  /**
   * Wait for page content to load
   */
  private async waitForPageLoad(): Promise<void> {
    // Wait for basic Jira board structure
    const selectors = [
      '.ghx-board',
      '[data-testid*="board"]',
      '.rapid-board'
    ]

    for (const selector of selectors) {
      try {
        await this.waitForElement(selector, 3000)
        return
      } catch {
        // Continue to next selector
      }
    }

    // If no board structure found, wait a bit and continue
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  /**
   * Wait for an element to appear in the DOM
   */
  private waitForElement(selector: string, timeout: number = 5000): Promise<Element> {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector)
      if (element) {
        resolve(element)
        return
      }

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector)
        if (element) {
          obs.disconnect()
          resolve(element)
        }
      })

      observer.observe(document.body, {
        childList: true,
        subtree: true
      })

      setTimeout(() => {
        observer.disconnect()
        reject(new Error(`Element ${selector} not found within ${timeout}ms`))
      }, timeout)
    })
  }
}

// Export singleton instance
export const jiraDOMParser = JiraDOMParser.getInstance()
