# AI-Powered GitHub PR Description Generation

## 1. Overview

This feature automates the creation of GitHub Pull Request (PR) descriptions. It leverages an AI model to generate a comprehensive and structured description by combining detailed information from a linked Jira ticket with the code changes present in the PR. This solves the problem of developers spending manual effort on writing descriptions and ensures consistency and quality.

## 2. High-Level Design

The feature follows a client-server architecture, with the frontend running as a browser extension on the GitHub PR page and the backend providing the core AI and business logic.

**Workflow:**
1.  **Trigger**: The user clicks an "AI Generate" button on the GitHub "New/Edit Pull Request" page.
2.  **Frontend Data Extraction**: The frontend script extracts the Jira Ticket ID, code diff, PR title, and branch name from the page's DOM.
    - If the Jira Ticket ID is not found, it prompts the user for manual input.
3.  **API Call**: The frontend sends the extracted data to a dedicated backend API endpoint.
4.  **Backend Orchestration**: The backend receives the request and:
    a. Calls the Jira API to fetch detailed information for the given ticket ID.
    b. Constructs a detailed prompt containing both the Jira ticket context and the code changes.
    c. Sends the prompt to the Azure OpenAI service to generate the PR description.
5.  **Response**: The backend streams the generated description back to the frontend.
6.  **UI Update**: The frontend receives the description in real-time and populates the PR description textarea, providing a seamless user experience.

## 3. Implementation Details

### Frontend

-   **File to Modify**: `frontend/src/components/github/add-description.tsx`
-   **Data Extraction Logic**:
    -   **Jira Ticket ID**: Parsed from the description template body using the regex `/[A-Z]{2,}-\d+/`. A `window.prompt` is used as a fallback.
    -   **Code Diff**: Extracted by querying the DOM for elements matching a selector like `div[data-testid="file-diff-container"]` and concatenating their text content.
-   **API Communication**:
    -   A new request is sent via the existing Plasmo messaging system (`useGitHubPRMessaging` hook) to a new backend endpoint.
    -   The payload includes `jira_ticket_id`, `code_changes`, `pr_title`, and `branch_name`.

### Backend

-   **New API Endpoint**: `POST /api/github/pr-description-from-jira`
    -   **File**: `backend/app/api/github.py`
    -   **Request Model**: A Pydantic model `GeneratePRDescriptionRequest` will validate the incoming data.
-   **New Service Method**: `generate_pr_description_from_jira`
    -   **File**: `backend/app/services/github_service.py`
    -   **Logic**:
        1.  Uses the existing `jira_api_client` to fetch issue details.
        2.  Handles errors gracefully if the Jira ticket is not found or the API fails.
        3.  Uses a new, specialized prompt template designed to synthesize information from both Jira and the code diff.
-   **New Prompt**:
    -   **File**: `backend/app/prompts/github/pr_description.py`
    -   A new prompt configuration `PR_DESCRIPTION_FROM_JIRA` will be created to guide the AI model effectively.

## 4. API Documentation

The new endpoint will be fully documented in `docs/api-documentation.md`, including details about the request payload, response format, and potential error codes. This ensures clarity for future development and integration. 