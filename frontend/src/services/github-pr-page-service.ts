export interface DiffLine {
  type: 'add' | 'delete' | 'context';
  oldLineNumber: number | null;
  newLineNumber: number | null;
  content: string;
}

export interface ParsedFile {
  filePath: string;
  status: 'modified' | 'added' | 'renamed' | 'deleted' | 'unknown';
  additions: number;
  deletions: number;
  fileUrl?: string;
  lines: DiffLine[];
}

export interface ParsedCommit {
  sha: string | null;
  message: string;
  author: string | null;
  date: string | null; // ISO 8601 format
  jiraTicket?: string | null;
  commitUrl?: string;
}

/**
 * Extracts the base URL of a GitHub pull request.
 * e.g., "https://github.com/org/repo/pull/123/files" -> "https://github.com/org/repo/pull/123"
 * @param prUrl The full URL of a page within a GitHub PR.
 * @returns The base URL for the pull request, or the cleaned URL if no match.
 */
const getBasePrUrl = (prUrl: string): string => {
  const match = prUrl.match(/^(.*\/pull\/\d+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Fallback for simple URLs, removing any query params, hash, or trailing slashes.
  return prUrl.split("?")[0].split("#")[0].replace(/\/+$/, "");
};

/**
 * Constructs the URL for the 'Files changed' tab from a GitHub PR URL.
 * @param prUrl The URL of the GitHub pull request.
 * @returns The URL for the 'Files changed' tab.
 */
const constructFilesTabUrl = (prUrl: string): string => {
  return `${getBasePrUrl(prUrl)}/files`;
};

/**
 * Constructs the URL for the 'Commits' tab from a GitHub PR URL.
 * @param prUrl The URL of the GitHub pull request.
 * @returns The URL for the 'Commits' tab.
 */
const constructCommitsTabUrl = (prUrl: string): string => {
  return `${getBasePrUrl(prUrl)}/commits`;
};

import githubCacheService from './github-cache-service'

/**
 * Fetches and parses the 'Files changed' tab of a GitHub PR to extract detailed,
 * structured information about file changes, including metadata and line-by-line diffs.
 * @returns A promise that resolves to an array of parsed file objects.
 */
export const fetchPRFileChanges = async (): Promise<ParsedFile[]> => {
  const prUrl = window.location.href

  // Check cache first
  const cachedData = githubCacheService.get<ParsedFile[]>(prUrl, 'fileChanges')
  if (cachedData) {
    return cachedData
  }

  console.log('🔍 Fetching PR file changes from server...')
  const filesUrl = constructFilesTabUrl(prUrl);

  try {
    const response = await fetch(filesUrl);
    if (!response.ok) {
      console.error(`Fetch failed with status: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch file changes. Status: ${response.status}`);
    }
  const htmlText = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, "text/html");

  const parsedFiles: ParsedFile[] = [];
  const fileContainers = doc.querySelectorAll(".file");

  fileContainers.forEach(container => {
    const header = container.querySelector<HTMLElement>(".file-header");
    if (!header) {
      console.warn("Skipping a file container because no file header was found.", container);
      return;
    }

    const filePathElement = header.querySelector<HTMLAnchorElement>("a[title]");
    const filePath = filePathElement?.title;
    if (!filePath) {
      console.warn("Skipping a file container because no file path was found in the header.", header);
      return;
    }

    // Extract additions and deletions from the diffstat
    const diffstatElement = header.querySelector<HTMLElement>(".diffstat");
    const additionsText = diffstatElement?.querySelector('[aria-label*="additions"]')?.textContent ?? "";
    const deletionsText = diffstatElement?.querySelector('[aria-label*="deletions"]')?.textContent ?? "";
    const additions = parseInt(additionsText.replace(/[^0-9]/g, "") || "0", 10);
    const deletions = parseInt(deletionsText.replace(/[^0-9]/g, "") || "0", 10);

    // Extract status
    let status: ParsedFile["status"] = "unknown";
    const fileStatusBadge = header.querySelector<HTMLElement>(".file-info .Label")?.textContent;
    if (fileStatusBadge) {
      const lowerCaseStatus = fileStatusBadge.toLowerCase();
      if (
        lowerCaseStatus === "added" ||
        lowerCaseStatus === "deleted" ||
        lowerCaseStatus === "renamed" ||
        lowerCaseStatus === "modified"
      ) {
        status = lowerCaseStatus;
      }
    } else {
      // Fallback for modified files which might not have a badge
      if (additions > 0 || deletions > 0) {
        status = "modified";
      }
    }
    
    // Check for 'added' or 'deleted' status from container class if no badge
    if (status === 'unknown') {
      if (container.classList.contains('file-mode-added')) status = 'added';
      else if (container.classList.contains('file-mode-deleted')) status = 'deleted';
    }

    // Extract file URL
    const fileUrl = filePathElement?.href;

    const file: ParsedFile = {
      filePath,
      status,
      additions,
      deletions,
      fileUrl,
      lines: []
    };

    const rows = container.querySelectorAll<HTMLTableRowElement>(".diff-table tr");

    rows.forEach(row => {
      const contentEl = row.querySelector<HTMLElement>(".blob-code-inner");
      
      // Skip rows that are not actual code lines (e.g., hunk headers, expanders)
      if (!contentEl) {
        return;
      }
      
      const oldLineNumEl = row.querySelector<HTMLElement>("td[data-line-number].blob-num-context, td[data-line-number].blob-num-deletion");
      const newLineNumEl = row.querySelector<HTMLElement>("td[data-line-number].blob-num-context, td[data-line-number].blob-num-addition");

      let type: DiffLine['type'] = 'context';
      if (row.classList.contains('blob-code-addition')) {
        type = 'add';
      } else if (row.classList.contains('blob-code-deletion')) {
        type = 'delete';
      }

      file.lines.push({
        type,
        oldLineNumber: oldLineNumEl ? parseInt(oldLineNumEl.getAttribute('data-line-number')!, 10) : null,
        newLineNumber: newLineNumEl ? parseInt(newLineNumEl.getAttribute('data-line-number')!, 10) : null,
        content: contentEl.textContent || ''
      });
    });

    if (
      file.lines.length > 0 ||
      file.status === "added" ||
      file.status === "deleted" ||
      file.status === "renamed"
    ) {
      parsedFiles.push(file);
    }
  });

  // Cache the results before returning
  githubCacheService.set(prUrl, 'fileChanges', parsedFiles)
  console.log(`✅ Cached ${parsedFiles.length} file changes for PR`)

  return parsedFiles;
  } catch (error) {
    console.error('❌ Failed to fetch PR file changes:', error)
    throw error
  }
};

/**
 * Detects which GitHub platform the current page is on.
 * @returns The platform type: 'github.com', 'git.autodesk.com', or 'unknown'
 */
const detectPlatform = (): 'github.com' | 'git.autodesk.com' | 'unknown' => {
  const hostname = window.location.hostname.toLowerCase();

  if (hostname.includes('github.com')) {
    return 'github.com';
  } else if (hostname.includes('git.autodesk.com')) {
    return 'git.autodesk.com';
  }

  return 'unknown';
};

/**
 * Parses commits from github.com DOM structure.
 * @param doc The parsed HTML document
 * @returns Array of parsed commit objects
 */
const parseCommitsGitHubCom = (doc: Document): ParsedCommit[] => {
  const parsedCommits: ParsedCommit[] = [];
  const commitContainers = doc.querySelectorAll('[data-testid="commit-row-item"]');

  commitContainers.forEach(container => {
    // Extract commit message and URL
    const messageLink = container.querySelector<HTMLAnchorElement>('h4 > a');
    const message = messageLink?.textContent?.trim() ?? "";
    const commitUrl = messageLink?.href;

    // Extract commit SHA (short format from github.com)
    const shaElement = container.querySelector<HTMLElement>('.Button-label.color-fg-muted');
    const sha = shaElement?.textContent?.trim() ?? null;

    // Extract author
    const authorLink = container.querySelector<HTMLAnchorElement>('[data-testid="author-avatar"] a:last-child');
    const author = authorLink?.textContent?.trim() ?? null;

    // Extract date
    const dateElement = container.querySelector<HTMLElement>('relative-time');
    const date = dateElement?.getAttribute('datetime') ?? null;

    // JIRA ticket extraction (less common on github.com, but try anyway)
    const jiraMatch = message.match(/([A-Z]+-\d+)/);
    const jiraTicket = jiraMatch ? jiraMatch[1] : null;

    if (message) {
      parsedCommits.push({
        sha,
        message,
        author,
        date,
        jiraTicket,
        commitUrl
      });
    }
  });

  return parsedCommits;
};

/**
 * Parses commits from git.autodesk.com DOM structure.
 * @param doc The parsed HTML document
 * @returns Array of parsed commit objects
 */
const parseCommitsAutodesk = (doc: Document): ParsedCommit[] => {
  const parsedCommits: ParsedCommit[] = [];
  const commitContainers = doc.querySelectorAll(".js-commits-list-item");

  commitContainers.forEach(container => {
    const details = container.querySelector<HTMLElement>(".js-details-container.Details");
    if (!details) {
      console.warn("Skipping commit container, no details found.", container);
      return;
    }

    const messageLink = details.querySelector<HTMLAnchorElement>("a.Link--primary.text-bold.js-navigation-open");
    const message = messageLink?.textContent?.trim() ?? "";
    const commitUrl = messageLink?.href;

    const jiraLink = details.querySelector<HTMLAnchorElement>("a.issue-link.js-issue-link");
    const jiraTicket = jiraLink?.textContent?.trim() ?? null;

    const authorLink = details.querySelector<HTMLAnchorElement>("a.commit-author.user-mention");
    const author = authorLink?.textContent?.trim() ?? null;

    const dateElement = details.querySelector<HTMLElement>("relative-time");
    const date = dateElement?.getAttribute("datetime") ?? null;

    const shaContainer = container.querySelector<HTMLElement>(".d-none.d-md-flex.flex-shrink-0.gap-2");
    const fullShaCopy = shaContainer?.querySelector<HTMLElement>('clipboard-copy[aria-label="Copy the full SHA"]');
    const fullSha = fullShaCopy?.getAttribute('value') ?? null;

    parsedCommits.push({
      sha: fullSha,
      message,
      author,
      date,
      jiraTicket,
      commitUrl
    });
  });

  return parsedCommits;
};

/**
 * Fetches and parses the 'Commits' tab of a GitHub PR to extract structured
 * information about each commit. Works with both github.com and git.autodesk.com.
 * @returns A promise that resolves to an array of parsed commit objects.
 */
export const fetchPRCommitMessages = async (): Promise<ParsedCommit[]> => {
  const prUrl = window.location.href

  // Check cache first
  const cachedData = githubCacheService.get<ParsedCommit[]>(prUrl, 'commits')
  if (cachedData) {
    return cachedData
  }

  console.log('🔍 Fetching PR commit messages from server...')
  const commitsUrl = constructCommitsTabUrl(prUrl);

  try {
    const response = await fetch(commitsUrl);
    if (!response.ok) {
      console.error(`Fetch failed with status: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch commit messages. Status: ${response.status}`);
    }
    const htmlText = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, "text/html");

    // Detect platform and use appropriate parsing logic
    const platform = detectPlatform();

    let parsedCommits: ParsedCommit[]

    switch (platform) {
      case 'github.com':
        console.log('Parsing commits for github.com');
        parsedCommits = parseCommitsGitHubCom(doc);
        break;

      case 'git.autodesk.com':
        console.log('Parsing commits for git.autodesk.com');
        parsedCommits = parseCommitsAutodesk(doc);
        break;

      default:
        console.warn(`Unknown platform: ${window.location.hostname}. Attempting git.autodesk.com parsing as fallback.`);
        parsedCommits = parseCommitsAutodesk(doc);
        break;
    }

    // Cache the results before returning
    githubCacheService.set(prUrl, 'commits', parsedCommits)
    console.log(`✅ Cached ${parsedCommits.length} commits for PR`)

    return parsedCommits;
  } catch (error) {
    console.error('❌ Failed to fetch PR commit messages:', error)
    throw error
  }
};