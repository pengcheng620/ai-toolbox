/**
 * API Endpoint Constructor
 * 
 * This module provides a centralized function to construct the full object of API 
 * endpoints based on a given base URL. This approach ensures that all endpoint
 * paths are managed in one place, making them easier to update and maintain.
 * 
 * The base URL itself is now dynamically fetched from the backend via the 
 * `useAppConfig` hook and is no longer managed here.
 */

export interface ApiEndpoints {
  ai: {
    health: string;
    github: {
      prFromJira: string;
    };
    jira: {
      generate: string;
    };
  };
  sprintPlanning: {
    boardInfo: (boardId: string) => string;
  };
}

/**
 * Constructs the API endpoints object from a base URL.
 * 
 * @param baseUrl - The base URL for the API, dynamically fetched from the backend.
 * @returns An object containing all API endpoint paths.
 */
export function getApiEndpoints(baseUrl: string): ApiEndpoints {
  const apiV1Prefix = `${baseUrl}/api/v1`;

  return {
    ai: {
      health: `${apiV1Prefix}/ai/health`,
      github: {
        prFromJira: `${apiV1Prefix}/ai/github/pr-from-jira`
      },
      jira: {
        generate: `${apiV1Prefix}/ai/jira/generate`
      }
    },
    sprintPlanning: {
      boardInfo: (boardId: string) => `${apiV1Prefix}/sprint-planning/board-info/${boardId}`
    }
  };
}

/**
 * Synchronous API configuration getter for Chrome extension contexts
 */
export function getApiConfigSync() {
  // Get the base URL from environment variable (set during build time)
  const baseUrl = process.env.PLASMO_PUBLIC_API_BASE_URL || 'http://localhost:8077';
  
  return {
    baseUrl,
    endpoints: getApiEndpoints(baseUrl)
  };
}
