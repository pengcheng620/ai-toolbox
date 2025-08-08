// 🎯 AI Toolbox Hooks unified export
// Developer only need to import all hooks from here

// Jira related hooks
export {
  useJiraTicketSummary,
  useJiraMessageOptimize, 
  useJiraStatusCheck,
  useJiraTicketSummaryWithValidation,
  useJiraMessageOptimizeWithValidation,
  createJiraHook
} from './jira'

// Type exports
export type {
  JiraTicketSummaryHook,
  JiraMessageOptimizeHook,
  JiraStatusCheckHook
} from './jira'

// GitHub related hooks
export {
  useGitHubPRDescription,
  useGitHubCodeReview,
  useGitHubCommitMessage,
  useGitHubPRDescriptionWithValidation
} from './github'

// Generic hook (not directly used, but can be used to create custom hooks)
export { useStreamBase } from './common/useStreamBase'
export type { StreamOptions, StreamHookResult } from './common/useStreamBase'