// Removed unused constant - JIRA_TICKET_REGEX is defined inline where needed

import githubCacheService from '../../src/services/github-cache-service'

/**
 * Defines the interface for a strategy that extracts information from a GitHub PR page.
 * This allows handling different page layouts (e.g., public GitHub vs. enterprise).
 */
export interface GitHubPageStrategy {
  getPRTitle(): string
  extractJiraTicketId(): string | null
  getCodeChanges(): Promise<string>
  getBranchName(): string
  getCommitMessages(): Promise<string[]>
  getDescriptionTemplate(): string
  findEditButton(): HTMLButtonElement | null
  findEditModeTextarea(): HTMLTextAreaElement | null
}

// --- Strategy for Public GitHub (github.com) ---

class PublicGitHubStrategy implements GitHubPageStrategy {
  getPRTitle(): string {
    const titleElement = document.querySelector(".gh-header-title")
    return titleElement?.textContent?.trim() || ""
  }

  extractJiraTicketId(): string | null {
    const prTitle = this.getPRTitle()
    const branchName = this.getBranchName()
    const descriptionBody =
      (
        document.querySelector(
          "#pull_request_body"
        ) as HTMLTextAreaElement
      )?.value || ""

    const sources = [prTitle, branchName, descriptionBody]
    const regex = /([a-zA-Z]{2,}-\d+)/i

    for (const source of sources) {
      const match = source.match(regex)
      if (match) {
        return match[0].toUpperCase()
      }
    }
    return null
  }

  async getCodeChanges(): Promise<string> {
    const prUrl = window.location.href

    // Check cache first
    const cachedData = githubCacheService.get<string>(prUrl, 'codeChanges')
    if (cachedData) {
      return cachedData
    }

    console.log("🔍 Extracting code changes from GitHub page...")

    let codeChanges: string

    // First, try to use GitHub API if available
    const apiChanges = await this.getCodeChangesFromAPI()
    if (apiChanges) {
      console.log("✅ Successfully extracted code changes from GitHub API")
      codeChanges = apiChanges
    } else {
      console.log("⚠️ GitHub API failed, falling back to DOM extraction")
      codeChanges = await this.getCodeChangesFromDOM()
    }

    // Cache the results before returning
    githubCacheService.set(prUrl, 'codeChanges', codeChanges)
    console.log(`✅ Cached code changes for PR (${codeChanges.length} characters)`)

    return codeChanges
  }

  private async getCodeChangesFromAPI(): Promise<string | null> {
    try {
      // Import the GitHub API service dynamically to avoid circular dependencies
      const { githubAPIService } = await import('../../src/services/github-api')

      // Get current PR URL
      const currentUrl = window.location.href

      // Check if this is a valid PR URL
      const prInfo = githubAPIService.parsePRUrl(currentUrl)
      if (!prInfo) {
        console.log("🔍 Current URL is not a valid PR URL, skipping API extraction")
        return null
      }

      console.log("🚀 Fetching code changes from GitHub API...")
      // fetchPRData will automatically extract user token if available
      const response = await githubAPIService.fetchPRData(currentUrl)

      if (response.success && response.data) {
        const codeChanges = githubAPIService.extractCodeChanges(response.data)
        if (codeChanges && codeChanges.trim()) {
          console.log(`✅ API extracted ${codeChanges.length} characters of code changes`)
          return codeChanges
        }
      } else {
        console.warn("⚠️ GitHub API returned no code changes:", response.error)
      }

      return null
    } catch (error) {
      console.error("❌ Error fetching code changes from API:", error)
      return null
    }
  }

  private getCodeChangesFromDOM(): string {
    console.log("🔍 Extracting code changes from DOM...")

    // Try multiple selectors for different GitHub layouts
    const selectors = [
      ".diff-table tbody tr",
      ".js-diff-table tbody tr",
      "[data-testid='file-diff-container']",
      ".file-diff-split tbody tr",
      ".diff-view .blob-code-content",
      ".js-file-content .blob-code",
      ".diff-table .blob-code"
    ]

    let codeChanges = ""

    for (const selector of selectors) {
      console.log(`🔍 Trying code changes selector: ${selector}`)
      const elements = document.querySelectorAll(selector)
      console.log(`Found ${elements.length} elements with selector: ${selector}`)

      if (elements.length > 0) {
        elements.forEach((element) => {
          const text = (element as HTMLElement).innerText?.trim()
          if (text) {
            codeChanges += `${text}\n`
          }
        })

        if (codeChanges.trim()) {
          console.log(`✅ Found code changes using selector: ${selector}`)
          console.log(`Code changes length: ${codeChanges.length}`)
          console.log(`Code changes preview: ${codeChanges.substring(0, 200)}...`)
          break
        }
      }
    }

    // Fallback: try to get file names and basic info
    if (!codeChanges.trim()) {
      console.log("🔍 Fallback: trying to extract file information...")
      const fileHeaders = document.querySelectorAll('.file-header, .file-info, [data-testid="file-header"]')
      fileHeaders.forEach((header) => {
        const fileName = header.textContent?.trim()
        if (fileName) {
          codeChanges += `File: ${fileName}\n`
        }
      })
    }

    // If still no changes, provide a generic message
    if (!codeChanges.trim()) {
      console.warn("⚠️ No code changes found, using generic message")
      codeChanges = "Code changes detected in this Pull Request. Please review the diff for details."
    }

    console.log(`Final DOM code changes: ${codeChanges.length} characters`)
    return codeChanges
  }

  getBranchName(): string {
    return document.querySelector(".head-ref")?.textContent?.trim() || ""
  }

  async getCommitMessages(): Promise<string[]> {
    const prUrl = window.location.href

    // Check cache first
    const cachedData = githubCacheService.get<string[]>(prUrl, 'commitMessages')
    if (cachedData) {
      return cachedData
    }

    console.log("🔍 Extracting commit messages from GitHub page...")

    let commitMessages: string[]

    // First, try to use GitHub API if available
    const apiCommits = await this.getCommitMessagesFromAPI()
    if (apiCommits && apiCommits.length > 0) {
      console.log("✅ Successfully extracted commit messages from GitHub API")
      commitMessages = apiCommits
    } else {
      console.log("⚠️ GitHub API failed, falling back to DOM extraction")
      commitMessages = await this.getCommitMessagesFromDOM()
    }

    // Cache the results before returning
    githubCacheService.set(prUrl, 'commitMessages', commitMessages)
    console.log(`✅ Cached ${commitMessages.length} commit messages for PR`)

    return commitMessages
  }

  private async getCommitMessagesFromAPI(): Promise<string[] | null> {
    try {
      // Import the GitHub API service dynamically
      const { githubAPIService } = await import('../../src/services/github-api')

      // Get current PR URL
      const currentUrl = window.location.href

      // Check if this is a valid PR URL
      const prInfo = githubAPIService.parsePRUrl(currentUrl)
      if (!prInfo) {
        console.log("🔍 Current URL is not a valid PR URL, skipping API extraction")
        return null
      }

      console.log("🚀 Fetching commit messages from GitHub API...")
      // fetchPRData will automatically extract user token if available
      const response = await githubAPIService.fetchPRData(currentUrl)

      if (response.success && response.data) {
        const commitMessages = githubAPIService.extractCommitMessages(response.data)
        if (commitMessages && commitMessages.length > 0) {
          console.log(`✅ API extracted ${commitMessages.length} commit messages`)
          return commitMessages
        }
      } else {
        console.warn("⚠️ GitHub API returned no commit messages:", response.error)
      }

      return null
    } catch (error) {
      console.error("❌ Error fetching commit messages from API:", error)
      return null
    }
  }

  private getCommitMessagesFromDOM(): string[] {
    console.log("🔍 Extracting commit messages from DOM...")

    const commitMessages: string[] = []
    // This selector is a bit fragile and might need updates.
    const messageElements = document.querySelectorAll(
      "a[data-testid='commit-message']"
    )
    messageElements.forEach((el) => {
      commitMessages.push(el.textContent?.trim() || "")
    })

    console.log(`Found ${commitMessages.length} commit messages from DOM`)
    return commitMessages
  }

  getDescriptionTemplate(): string {
    console.log("🔍 Extracting description template...")

    // Try multiple selectors to get existing PR description content
    const selectors = [
      // Current description in view mode (markdown rendered)
      'div.comment-body.markdown-body.js-comment-body.soft-wrap.css-overflow-wrap-anywhere.user-select-contain.d-block',
      'div.comment-body.markdown-body.js-comment-body',
      'div.comment-body.markdown-body',
      '.comment-body.markdown-body',
      // Textarea in edit mode
      'textarea#pull_request_body',
      'textarea[name="pull_request[body]"]',
      // Fallback selectors
      '.js-comment-body',
      '.comment-body'
    ]

    for (const selector of selectors) {
      console.log(`🔍 Trying template selector: ${selector}`)
      const element = document.querySelector(selector)

      if (element) {
        let content = ""

        if (element.tagName.toLowerCase() === 'textarea') {
          // For textarea elements, get the value
          content = (element as HTMLTextAreaElement).value || ""
        } else {
          // For div elements, get the text content or innerHTML
          // Try to get markdown-like content if possible
          content = this.extractMarkdownFromElement(element as HTMLElement)
        }

        if (content.trim()) {
          console.log(`✅ Found template content using selector: ${selector}`)
          console.log(`Template length: ${content.length}`)
          console.log(`Template preview: ${content.substring(0, 200)}...`)
          return content.trim()
        }
      }
    }

    console.log("ℹ️ No existing description template found")
    return ""
  }

  private extractMarkdownFromElement(element: HTMLElement): string {
    // Try to convert HTML back to markdown-like format
    let content = ""

    // Handle different types of content
    const children = element.children

    if (children.length === 0) {
      // Simple text content
      return element.textContent?.trim() || ""
    }

    // Process child elements to reconstruct markdown
    for (const child of children) {
      const tagName = child.tagName.toLowerCase()
      const text = child.textContent?.trim() || ""

      switch (tagName) {
        case 'h1':
          content += `# ${text}\n\n`
          break
        case 'h2':
          content += `## ${text}\n\n`
          break
        case 'h3':
          content += `### ${text}\n\n`
          break
        case 'h4':
          content += `#### ${text}\n\n`
          break
        case 'h5':
          content += `##### ${text}\n\n`
          break
        case 'h6':
          content += `###### ${text}\n\n`
          break
        case 'p':
          content += `${text}\n\n`
          break
        case 'ul':
        case 'ol':
          const listItems = child.querySelectorAll('li')
          listItems.forEach(li => {
            // Check if this is a checkbox list item
            const checkbox = li.querySelector('input[type="checkbox"]') as HTMLInputElement
            if (checkbox) {
              // This is a markdown checkbox - preserve the checkbox format
              const isChecked = checkbox.checked
              const checkboxText = isChecked ? '[x]' : '[ ]'
              const itemText = li.textContent?.trim() || ''
              // Remove any existing checkbox symbols from the text content
              const cleanText = itemText.replace(/^[\[\]x\s]*/, '').trim()
              content += `- ${checkboxText} ${cleanText}\n`
            } else {
              // Regular list item
              const bullet = tagName === 'ul' ? '-' : '1.'
              const itemText = li.textContent?.trim() || ''
              content += `${bullet} ${itemText}\n`
            }
          })
          content += '\n'
          break
        case 'blockquote':
          const lines = text.split('\n')
          lines.forEach(line => {
            if (line.trim()) {
              content += `> ${line.trim()}\n`
            }
          })
          content += '\n'
          break
        case 'code':
          content += `\`${text}\``
          break
        case 'pre':
          content += `\`\`\`\n${text}\n\`\`\`\n\n`
          break
        default:
          if (text) {
            content += `${text}\n\n`
          }
      }
    }

    return content.trim()
  }

  findEditButton(): HTMLButtonElement | null {
    console.log("🔍 Searching for edit button...")

    // Try multiple selectors to find the edit button
    const selectors = [
      'button.dropdown-item.btn-link.js-comment-edit-button[role="menuitem"][aria-label="Edit comment"]',
      'button.js-comment-edit-button[aria-label="Edit comment"]',
      'button[aria-label="Edit comment"]',
      '.js-comment-edit-button',
      'button[data-testid="edit-comment-button"]',
      'button:contains("Edit")',
      '.timeline-comment-actions button'
    ]

    for (const selector of selectors) {
      console.log(`🔍 Trying selector: ${selector}`)
      const buttons = document.querySelectorAll(selector) as NodeListOf<HTMLButtonElement>
      console.log(`Found ${buttons.length} elements with selector: ${selector}`)

      for (const button of buttons) {
        const text = button.textContent?.trim().toLowerCase()
        console.log(`Button text: "${text}"`)
        if (text && text.includes('edit')) {
          console.log("✅ Found edit button:", button)
          return button
        }
      }
    }

    // Fallback: search all buttons for edit text
    console.log("🔍 Fallback: searching all buttons for 'edit' text...")
    const allButtons = document.querySelectorAll('button')
    for (const button of allButtons) {
      const text = button.textContent?.trim().toLowerCase()
      if (text && text.includes('edit')) {
        console.log("✅ Found edit button via fallback:", button)
        return button as HTMLButtonElement
      }
    }

    console.warn("❌ No edit button found")
    return null
  }

  findEditModeTextarea(): HTMLTextAreaElement | null {
    console.log("🔍 Searching for edit mode textarea...")

    // Try multiple selectors to find the edit mode textarea
    const selectors = [
      'textarea[name="pull_request[body]"]',
      'textarea[aria-label="Comment body"]',
      'textarea.js-comment-field.js-paste-markdown',
      'textarea[id*="body"]',
      'textarea.CommentBox-input',
      'textarea[placeholder*="comment"]',
      'textarea[placeholder*="Comment"]'
    ]

    for (const selector of selectors) {
      console.log(`🔍 Trying textarea selector: ${selector}`)
      const textarea = document.querySelector(selector) as HTMLTextAreaElement
      if (textarea) {
        console.log("✅ Found edit mode textarea:", textarea)
        return textarea
      }
    }

    // Fallback: search all textareas
    console.log("🔍 Fallback: searching all textareas...")
    const allTextareas = document.querySelectorAll('textarea')
    console.log(`Found ${allTextareas.length} textareas on page`)

    for (const textarea of allTextareas) {
      const name = textarea.getAttribute('name')
      const id = textarea.getAttribute('id')
      const placeholder = textarea.getAttribute('placeholder')
      console.log(`Textarea - name: ${name}, id: ${id}, placeholder: ${placeholder}`)

      if (name?.includes('body') || id?.includes('body') || placeholder?.toLowerCase().includes('comment')) {
        console.log("✅ Found textarea via fallback:", textarea)
        return textarea as HTMLTextAreaElement
      }
    }

    console.warn("❌ No edit mode textarea found")
    return null
  }
}

// --- Strategy for Autodesk GitHub (git.autodesk.com) ---

class AutodeskGitHubStrategy extends PublicGitHubStrategy {
  // For now, assume Autodesk GitHub has the same selectors as public GitHub.
  // If they differ, override methods here.

  // Override if Autodesk GitHub has different edit button selectors
  findEditButton(): HTMLButtonElement | null {
    // Try Autodesk-specific selectors first, then fall back to parent implementation
    const autodeskSelectors = [
      'button.dropdown-item.btn-link.js-comment-edit-button[role="menuitem"][aria-label="Edit comment"]',
      'button.js-comment-edit-button[aria-label="Edit comment"]'
    ]

    for (const selector of autodeskSelectors) {
      const button = document.querySelector(selector) as HTMLButtonElement
      if (button && button.textContent?.trim().toLowerCase().includes('edit')) {
        return button
      }
    }

    // Fall back to parent implementation
    return super.findEditButton()
  }

  // Override if Autodesk GitHub has different textarea selectors
  findEditModeTextarea(): HTMLTextAreaElement | null {
    // Try Autodesk-specific selectors first, then fall back to parent implementation
    const autodeskSelectors = [
      'textarea[name="pull_request[body]"]',
      'textarea[aria-label="Comment body"]'
    ]

    for (const selector of autodeskSelectors) {
      const textarea = document.querySelector(selector) as HTMLTextAreaElement
      if (textarea) {
        return textarea
      }
    }

    // Fall back to parent implementation
    return super.findEditModeTextarea()
  }
}

/**
 * Factory function to get the appropriate GitHub page strategy based on the current hostname.
 * @returns An instance of a class that implements GitHubPageStrategy.
 */
export function getGitHubPageStrategy(): GitHubPageStrategy {
  const hostname = window.location.hostname
  if (hostname.includes("git.autodesk.com")) {
    console.log("Using Autodesk GitHub strategy")
    return new AutodeskGitHubStrategy()
  }
  console.log("Using Public GitHub strategy")
  return new PublicGitHubStrategy()
} 