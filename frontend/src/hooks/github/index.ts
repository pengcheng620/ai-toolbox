// 🎯 AI Toolbox GitHub Hooks
// Simplified Architecture - GitHub functionality based on generic Hook wrapper

import { useStreamBase, type StreamOptions } from '../common/useStreamBase'

/**
 * 🚀 GitHub PR Description Hook
 * Generate intelligent PR descriptions from Jira tickets
 */
export const useGitHubPRDescription = () => useStreamBase('github', 'pr-description')

/**
 * 🚀 GitHub Code Review Hook
 * Generate code review suggestions
 */
export const useGitHubCodeReview = () => useStreamBase('github', 'code-review')

/**
 * 🚀 GitHub Commit Message Hook
 * Generate commit messages from code changes
 */
export const useGitHubCommitMessage = () => useStreamBase('github', 'commit-message')

/**
 * 🔧 GitHub PR Description Hook with Validation
 * Includes input validation for PR description generation
 */
export function useGitHubPRDescriptionWithValidation() {
  const hook = useGitHubPRDescription()
  
  const executeWithValidation = async (
    request: { 
      jira_ticket_id?: string; 
      pr_title?: string; 
      pr_body?: string;
      [key: string]: any 
    }, 
    options?: StreamOptions
  ) => {
    // Validate at least one input source
    if (!request?.jira_ticket_id && !request?.pr_title && !request?.pr_body) {
      throw new Error('At least one of jira_ticket_id, pr_title, or pr_body is required')
    }
    
    // Validate Jira ticket ID format if provided
    if (request.jira_ticket_id) {
      const jiraRegex = /^[A-Z]{2,}-\d+$/i
      if (!jiraRegex.test(request.jira_ticket_id)) {
        throw new Error('Invalid Jira ticket ID format. Expected format: ABC-123')
      }
    }
    
    return hook.execute(request, options)
  }
  
  return { ...hook, execute: executeWithValidation }
}