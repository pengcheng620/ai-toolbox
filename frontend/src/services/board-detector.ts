/**
 * Board ID detection service for Jira pages
 * Extracts board information from URL and DOM elements
 */

import type { BoardDetectionResult } from "~types/sprint-planning"

export class BoardDetector {
  private static instance: BoardDetector
  
  public static getInstance(): BoardDetector {
    if (!BoardDetector.instance) {
      BoardDetector.instance = new BoardDetector()
    }
    return BoardDetector.instance
  }

  /**
   * Detect board ID from current page
   */
  public async detectBoard(): Promise<BoardDetectionResult> {
    const url = window.location.href
    console.log("🔍 Detecting board from URL:", url)
    
    // Try URL-based detection first
    const urlResult = this.detectFromUrl(url)
    console.log("🔍 URL detection result:", urlResult)
    
    if (urlResult.boardId && urlResult.confidence > 0.8) {
      return urlResult
    }

    // Try DOM-based detection
    console.log("🔍 Trying DOM detection...")
    const domResult = await this.detectFromDOM()
    console.log("🔍 DOM detection result:", domResult)
    
    if (domResult.boardId && domResult.confidence > 0.7) {
      return domResult
    }

    // Return the best result or error
    if (urlResult.boardId || domResult.boardId) {
      return urlResult.confidence > domResult.confidence ? urlResult : domResult
    }

    return {
      url,
      method: 'url',
      confidence: 0,
      error: 'Could not detect board ID from URL or DOM'
    }
  }

  /**
   * Detect board ID from URL patterns
   */
  private detectFromUrl(url: string): BoardDetectionResult {
    console.log("🔍 Analyzing URL for board ID:", url)
    
    // First try to extract rapidView parameter directly using URLSearchParams
    try {
      const urlObj = new URL(url)
      const rapidView = urlObj.searchParams.get('rapidView')
      if (rapidView && /^\d+$/.test(rapidView)) {
        console.log("✅ Found rapidView parameter:", rapidView)
        return {
          boardId: rapidView,
          url,
          method: 'url',
          confidence: 0.95
        }
      }
    } catch (error) {
      console.log("❌ URL parsing failed:", error)
    }
    
    // Fallback to regex patterns
    const patterns = [
      // Jira Software board URLs - 修复正则表达式，使其更宽松
      /[?&]rapidView=(\d+)/,
      /\/secure\/RapidBoard\.jspa.*rapidView=(\d+)/,
      /\/jira\/software\/projects\/[^/]+\/boards\/(\d+)/,
      /\/projects\/[^/]+\/boards\/(\d+)/,
      /\/boards\/(\d+)/,
      // Backlog URLs
      /\/secure\/RapidBoard\.jspa.*rapidView=(\d+).*view=planning/,
      /\/jira\/software\/projects\/[^/]+\/boards\/(\d+)\/backlog/,
      /\/projects\/[^/]+\/boards\/(\d+)\/backlog/,
      // Sprint URLs
      /\/jira\/software\/projects\/[^/]+\/boards\/(\d+)\/sprints\/(\d+)/,
      /\/projects\/[^/]+\/boards\/(\d+)\/sprints\/(\d+)/,
    ]

    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i]
      const match = url.match(pattern)
      console.log(`🔍 Pattern ${i + 1}:`, pattern, "Match:", match)
      
      if (match && match[1]) {
        console.log("✅ Found board ID via pattern:", match[1])
        return {
          boardId: match[1],
          url,
          method: 'url',
          confidence: 0.9
        }
      }
    }

    console.log("❌ No board ID found in URL patterns")
    return {
      url,
      method: 'url',
      confidence: 0,
      error: 'No board ID found in URL'
    }
  }

  /**
   * Detect board ID from DOM elements
   */
  private async detectFromDOM(): Promise<BoardDetectionResult> {
    const url = window.location.href

    try {
      console.log("🔍 Starting DOM detection...")
      
      // Wait for page to load - 减少等待时间，增加超时处理
      try {
        await this.waitForElement('[data-testid="platform-board-kit.ui.board.scroll.board-scroll"]', 3000)
      } catch (timeoutError) {
        console.log("⚠️ Main board element not found, trying alternative selectors...")
        // 继续尝试其他检测方法
      }

      // Try various DOM selectors for board information
      const selectors = [
        // Board configuration links
        'a[href*="RapidBoard.jspa?rapidView="]',
        'a[href*="/boards/"]',
        // Data attributes
        '[data-board-id]',
        '[data-rapid-view-id]',
        '[data-rapidview-id]',
        // Meta tags
        'meta[name="ajs-rapid-view-id"]',
        'meta[content*="rapidView"]',
        // Board header elements
        '.ghx-board-name',
        '[data-testid*="board"]',
        // JIRA specific elements
        '.ghx-controls',
        '.js-rapid-view-select',
        '#ghx-board-name'
      ]

      for (const selector of selectors) {
        console.log("🔍 Trying selector:", selector)
        const element = document.querySelector(selector)
        if (element) {
          console.log("✅ Found element:", element)
          const boardId = this.extractBoardIdFromElement(element)
          if (boardId) {
            console.log("✅ Extracted board ID from DOM:", boardId)
            const boardName = this.extractBoardName()
            const projectKey = this.extractProjectKey()
            
            return {
              boardId,
              boardName,
              projectKey,
              url,
              method: 'dom',
              confidence: 0.8
            }
          }
        }
      }

      // Try to find board ID in page scripts
      console.log("🔍 Trying script extraction...")
      const scriptBoardId = this.extractBoardIdFromScripts()
      if (scriptBoardId) {
        console.log("✅ Found board ID in scripts:", scriptBoardId)
        return {
          boardId: scriptBoardId,
          url,
          method: 'dom',
          confidence: 0.7
        }
      }

      console.log("❌ No board ID found in DOM")
      return {
        url,
        method: 'dom',
        confidence: 0,
        error: 'No board ID found in DOM'
      }

    } catch (error) {
      console.error("❌ DOM detection error:", error)
      return {
        url,
        method: 'dom',
        confidence: 0,
        error: `DOM detection failed: ${error.message}`
      }
    }
  }

  /**
   * Extract board ID from a DOM element
   */
  private extractBoardIdFromElement(element: Element): string | null {
    // Check data attributes
    const dataAttrs = ['data-board-id', 'data-rapid-view-id', 'data-rapidview-id']
    for (const attr of dataAttrs) {
      const value = element.getAttribute(attr)
      if (value && /^\d+$/.test(value)) {
        return value
      }
    }

    // Check href attributes
    const href = element.getAttribute('href')
    if (href) {
      const match = href.match(/rapidView=(\d+)|boards\/(\d+)/)
      if (match) {
        return match[1] || match[2]
      }
    }

    // Check content
    const content = element.textContent || element.innerHTML
    const match = content.match(/rapidView[=:](\d+)|board[=:](\d+)/i)
    if (match) {
      return match[1] || match[2]
    }

    return null
  }

  /**
   * Extract board name from page
   */
  private extractBoardName(): string | undefined {
    const selectors = [
      '.ghx-board-name',
      '[data-testid*="board-name"]',
      '.board-title',
      'h1[data-testid*="board"]'
    ]

    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element && element.textContent) {
        return element.textContent.trim()
      }
    }

    return undefined
  }

  /**
   * Extract project key from page
   */
  private extractProjectKey(): string | undefined {
    // Try to extract from URL
    const urlMatch = window.location.href.match(/\/projects\/([A-Z]+)/)
    if (urlMatch) {
      return urlMatch[1]
    }

    // Try to extract from DOM
    const selectors = [
      '[data-project-key]',
      '.project-key',
      '[data-testid*="project-key"]'
    ]

    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        const projectKey = element.getAttribute('data-project-key') || element.textContent
        if (projectKey && /^[A-Z]+$/.test(projectKey.trim())) {
          return projectKey.trim()
        }
      }
    }

    return undefined
  }

  /**
   * Extract board ID from page scripts
   */
  private extractBoardIdFromScripts(): string | null {
    console.log("🔍 Searching for board ID in page scripts...")
    const scripts = document.querySelectorAll('script')
    console.log(`🔍 Found ${scripts.length} script elements`)
    
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i]
      const content = script.textContent || script.innerHTML
      
      if (!content || content.length < 10) continue
      
      // Look for rapidViewId in script content
      const patterns = [
        /rapidViewId['":\s]*['"]?(\d+)['"]?/,
        /boardId['":\s]*['"]?(\d+)['"]?/,
        /"rapidView"['":\s]*['"]?(\d+)['"]?/,
        /"board"['":\s]*['"]?(\d+)['"]?/,
        /rapidView=(\d+)/,
        /RAPID_VIEW_ID['":\s]*['"]?(\d+)['"]?/,
        /"rapidViewId":\s*(\d+)/,
        /'rapidViewId':\s*(\d+)/
      ]

      for (const pattern of patterns) {
        const match = content.match(pattern)
        if (match && match[1]) {
          console.log(`✅ Found board ID in script ${i + 1}:`, match[1])
          console.log("🔍 Script snippet:", content.substring(Math.max(0, match.index - 50), match.index + 100))
          return match[1]
        }
      }
      
      // 额外检查是否包含 rapidView 相关内容
      if (content.includes('rapidView') || content.includes('boardId')) {
        console.log(`🔍 Script ${i + 1} contains rapidView/boardId:`, content.substring(0, 200))
      }
    }

    // Also check window object for any exposed board data
    try {
      const win = window as any
      if (win.JIRA && win.JIRA.rapidViewId) {
        console.log("✅ Found board ID in window.JIRA.rapidViewId:", win.JIRA.rapidViewId)
        return win.JIRA.rapidViewId.toString()
      }
      if (win.WRM && win.WRM.data && win.WRM.data.claims) {
        const claims = win.WRM.data.claims
        for (const key in claims) {
          if (key.includes('rapidView') || key.includes('board')) {
            console.log("✅ Found board data in WRM claims:", key, claims[key])
            const match = claims[key].toString().match(/\d+/)
            if (match) return match[0]
          }
        }
      }
    } catch (error) {
      console.log("⚠️ Error checking window object:", error)
    }

    console.log("❌ No board ID found in scripts")
    return null
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

      const observer = new MutationObserver((mutations) => {
        const element = document.querySelector(selector)
        if (element) {
          observer.disconnect()
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

  /**
   * Check if current page is a Jira board page
   */
  public isJiraBoardPage(): boolean {
    const url = window.location.href
    return /\/secure\/RapidBoard\.jspa|\/boards\/\d+|\/projects\/[^/]+\/boards\/\d+/.test(url)
  }

  /**
   * Check if current page is a Jira backlog page
   */
  public isJiraBacklogPage(): boolean {
    const url = window.location.href
    return /\/backlog|view=planning/.test(url)
  }

  /**
   * Debug method for testing board detection
   */
  public async debugDetection(): Promise<void> {
    console.log("🔧 Starting debug detection...")
    console.log("🔧 Current URL:", window.location.href)
    console.log("🔧 URL search params:", window.location.search)
    
    // Test URL parsing
    try {
      const urlObj = new URL(window.location.href)
      console.log("🔧 URLSearchParams rapidView:", urlObj.searchParams.get('rapidView'))
      console.log("🔧 URLSearchParams view:", urlObj.searchParams.get('view'))
      console.log("🔧 URLSearchParams issueLimit:", urlObj.searchParams.get('issueLimit'))
    } catch (error) {
      console.log("🔧 URL parsing error:", error)
    }
    
    // Test regex patterns
    const url = window.location.href
    const patterns = [
      /[?&]rapidView=(\d+)/,
      /\/secure\/RapidBoard\.jspa.*rapidView=(\d+)/,
    ]
    
    patterns.forEach((pattern, index) => {
      const match = url.match(pattern)
      console.log(`🔧 Pattern ${index + 1} (${pattern}):`, match)
    })
    
    // Test full detection
    const result = await this.detectBoard()
    console.log("🔧 Final detection result:", result)
  }
}

// Export singleton instance for easy use
export const boardDetector = BoardDetector.getInstance()
