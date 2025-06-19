const JIRA_TICKET_REGEX = /([a-zA-Z]{2,}-\d+)/i

/**
 * Defines the interface for a strategy that extracts information from a GitHub PR page.
 * This allows handling different page layouts (e.g., public GitHub vs. enterprise).
 */
export interface GitHubPageStrategy {
  getPRTitle(): string
  extractJiraTicketId(): string | null
  getCodeChanges(): string
  getBranchName(): string
  getCommitMessages(): string[]
  getDescriptionTemplate(): string
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

  getCodeChanges(): string {
    const diffTables = document.querySelectorAll(".diff-table tbody tr")
    let codeChanges = ""
    diffTables.forEach((row) => {
      codeChanges += `${(row as HTMLElement).innerText}\\n`
    })
    return codeChanges
  }

  getBranchName(): string {
    return document.querySelector(".head-ref")?.textContent?.trim() || ""
  }

  getCommitMessages(): string[] {
    const commitMessages: string[] = []
    // This selector is a bit fragile and might need updates.
    const messageElements = document.querySelectorAll(
      "a[data-testid='commit-message']"
    )
    messageElements.forEach((el) => {
      commitMessages.push(el.textContent?.trim() || "")
    })
    return commitMessages
  }

  getDescriptionTemplate(): string {
    const descriptionTextarea = document.querySelector(
      "#pull_request_body"
    ) as HTMLTextAreaElement
    return descriptionTextarea?.value || ""
  }
}

// --- Strategy for Autodesk GitHub (git.autodesk.com) ---

class AutodeskGitHubStrategy extends PublicGitHubStrategy {
  // For now, assume Autodesk GitHub has the same selectors as public GitHub.
  // If they differ, override methods here.
  // Example override:
  // getPRTitle(): string {
  //   const titleElement = document.querySelector(".custom-adsk-title-selector");
  //   return titleElement?.textContent?.trim() || "";
  // }
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