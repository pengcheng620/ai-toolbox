# AI Toolbox Browser Extension - Design Document

## Table of Contents
1. [Design Brief](#design-brief)
2. [System Architecture](#system-architecture)
3. [Component Design](#component-design)
4. [Class Design](#class-design)
5. [Sequence Diagrams](#sequence-diagrams)
6. [Data Flow Diagrams](#data-flow-diagrams)
7. [Deployment Architecture](#deployment-architecture)
8. [Use Case Diagrams](#use-case-diagrams)

---

## Design Brief

### Project Overview
**AI Toolbox** is a browser extension designed to automate repetitive development and documentation tasks by integrating AI capabilities directly into web-based workflows. Built using the Plasmo framework, it targets internal employees to enhance productivity and reduce manual work.

### Objectives
- **Automate repetitive tasks** in development workflows
- **Streamline communication** between developers and QA teams
- **Integrate AI-powered assistance** into daily browsing activities
- **Maintain consistency** in documentation and processes

### Scope
- **Current**: Jira integration for automated test summaries
- **Planned**: GitHub PR descriptions, AI translation, chatbot assistance
- **Target Platforms**: Chrome, Firefox, Edge (via Plasmo framework)

### Technology Stack
- **Framework**: Plasmo (Browser Extension Framework)
- **Frontend**: React 18.2.0 + TypeScript 5.3.3
- **Styling**: Tailwind CSS 3.4.1 + Mantine UI 7.11.1
- **AI Integration**: Azure OpenAI API (GPT-4o)
- **Build Tool**: PNPM + Plasmo CLI
- **State Management**: Plasmo Storage + React Hooks

---

## System Architecture

### High-Level Architecture

The AI Toolbox follows a modular browser extension architecture with content script injection and AI service integration.

```mermaid
graph TB
    subgraph "Browser Environment"
        subgraph "Web Pages"
            JIRA[Jira Page]
            GITHUB[GitHub Page]
            OTHER[Other Pages]
        end
        
        subgraph "Extension Components"
            POPUP[Extension Popup]
            CONTENT[Content Scripts]
            BACKGROUND[Background Service]
            SIDEBAR[Side Widget]
        end
    end
    
    subgraph "AI Services"
        AZURE[Azure OpenAI<br/>GPT-4o]
    end
    
    subgraph "Storage"
        LOCAL[Local Storage<br/>Plasmo Storage]
        CONFIG[Configuration<br/>Tokens & Settings]
    end
    
    JIRA --> CONTENT
    GITHUB --> CONTENT
    OTHER --> CONTENT
    
    CONTENT --> POPUP
    CONTENT --> SIDEBAR
    CONTENT --> BACKGROUND
    
    BACKGROUND --> AZURE
    CONTENT --> AZURE
    
    POPUP --> LOCAL
    BACKGROUND --> LOCAL
    CONTENT --> CONFIG
    
    AZURE -.->|AI Responses| CONTENT
    CONTENT -.->|Inject UI| JIRA
    CONTENT -.->|Inject UI| GITHUB
```

### Architecture Principles
- **Content Script Injection**: Extension functionality is injected into target websites
- **Event-Driven Communication**: Components communicate via browser extension messaging
- **Streaming AI Integration**: Real-time AI response streaming for better UX
- **Modular Design**: Each feature is self-contained and reusable
- **Configuration-Based**: Behavior controlled through stored settings

---

## Component Design

### Component Hierarchy

The component structure follows a clear separation of concerns with content scripts, UI components, and shared services.

```mermaid
graph TD
    subgraph "Extension Root"
        POPUP["`**popup.tsx**
        Main Extension UI`"]
        
        subgraph "Content Scripts"
            JIRA_CONTENT["`**jira.tsx**
            Jira Integration`"]
            GITHUB_CONTENT["`**github-pr.tsx**
            GitHub PR Integration`"]
            GITHUB_NEW_CONTENT["`**github-new-pr.tsx**
            GitHub New PR`"]
            COMMON_CONTENT["`**common.tsx**
            Shared Content Logic`"]
            SIDE_WIDGET["`**side-widget.tsx**
            Side Panel Widget`"]
        end
        
        subgraph "UI Components"
            subgraph "Jira Components"
                ADD_COMMENT["`**AddCommentButton**
                Generate Test Summary`"]
                JIRA_SERVERS["`**jira-servers.ts**
                Prompt & Config`"]
            end
            
            subgraph "GitHub Components"
                ADD_DESC["`**AddDescription**
                Generate PR Description`"]
                GITHUB_SERVERS["`**github-servers.ts**
                GitHub Prompts`"]
            end
            
            subgraph "Common Components"
                NOTIFICATION["`**Notification**
                User Feedback`"]
                PARSE_FORM["`**ParsePictureForm**
                Image Processing`"]
            end
        end
        
        subgraph "Features"
            COUNT_BTN["`**CountButton**
            Demo Feature`"]
        end
        
        subgraph "Hooks"
            USE_DRAG["`**useDrag**
            Drag Functionality`"]
            USE_STREAM["`**useTextStream**
            AI Response Streaming`"]
            USE_FETCH["`**useStreamFetch**
            HTTP Streaming`"]
        end
        
        subgraph "Core Services"
            AI_SERVICE["`**azure.ts**
            Azure OpenAI Client`"]
            VARIABLES["`**variables.ts**
            Configuration`"]
        end
    end
    
    POPUP --> COUNT_BTN
    
    JIRA_CONTENT --> ADD_COMMENT
    GITHUB_CONTENT --> ADD_DESC
    GITHUB_NEW_CONTENT --> ADD_DESC
    
    ADD_COMMENT --> JIRA_SERVERS
    ADD_COMMENT --> AI_SERVICE
    ADD_COMMENT --> USE_STREAM
    
    ADD_DESC --> GITHUB_SERVERS
    ADD_DESC --> AI_SERVICE
    ADD_DESC --> NOTIFICATION
    
    COMMON_CONTENT --> NOTIFICATION
    SIDE_WIDGET --> USE_DRAG
    
    AI_SERVICE --> VARIABLES
    USE_STREAM --> USE_FETCH
```

### Key Component Responsibilities

#### Content Scripts
- **jira.tsx**: Injects AI-powered comment generation into Jira pages
- **github-*.tsx**: Handles GitHub PR description automation
- **common.tsx**: Shared logic across different page types
- **side-widget.tsx**: Provides universal side panel functionality

#### UI Components
- **Feature-Specific**: Each platform (Jira, GitHub) has dedicated components
- **Reusable**: Common components shared across features
- **Configurable**: Server files contain prompts and configuration

#### Core Services
- **AI Service**: Manages Azure OpenAI integration
- **Custom Hooks**: Reusable React hooks for common functionality
- **Configuration**: Centralized settings and constants

---

## Class Design

### Core Classes and Interfaces

The class design follows TypeScript interfaces and React component patterns with clear separation of concerns.

```mermaid
classDiagram
    class PlasmoCSConfig {
        +matches: string[]
        +world?: string
        +all_frames?: boolean
    }
    
    class AIService {
        -resourceName: string
        -apiKey: string
        -baseURL: string
        -headers: object
        +createAzure() Azure
        +streamText(options) AsyncIterable
    }
    
    class JiraService {
        +JIRA_BTN_COMMENT_DES: ButtonConfig
        +generatePrompt(text: string) string
        +generateSnippet(text: string) CoreMessage[]
    }
    
    class GitHubService {
        +GITHUB_BTN_DES_GEN: ButtonConfig
        +generateMessages(description: string) CoreMessage[]
    }
    
    class AddCommentButton {
        -handleClick() Promise~void~
        -handleGenerate(description: string) Promise~void~
        -setCommentArea(text: string) Promise~void~
        +render() JSX.Element
    }
    
    class AddDescription {
        -ticket: string
        -handleClick() Promise~void~
        -handleGenerate(description: string) Promise~void~
        -setCommentArea(text: string) Promise~void~
        +render() JSX.Element
    }
    
    class NotificationService {
        +addNotification(message: string, type: string) void
        +removeNotification(id: string) void
    }
    
    class StreamHook {
        +useTextStream() object
        +useStreamFetch() object
        +useDrag() object
    }
    
    class ContentScript {
        +config: PlasmoCSConfig
        +getRootContainer() Promise~Element~
        +render(container: PlasmoCSUIJSXContainer) void
    }
    
    class ButtonConfig {
        +name: string
        +tooltip: string
    }
    
    class CoreMessage {
        +role: string
        +content: string
    }
    
    AIService --> JiraService : uses
    AIService --> GitHubService : uses
    
    AddCommentButton --> JiraService : uses
    AddCommentButton --> AIService : uses
    AddCommentButton --> StreamHook : uses
    
    AddDescription --> GitHubService : uses
    AddDescription --> AIService : uses
    AddDescription --> NotificationService : uses
    
    ContentScript --> AddCommentButton : renders
    ContentScript --> AddDescription : renders
    ContentScript --> PlasmoCSConfig : implements
    
    JiraService --> ButtonConfig : contains
    JiraService --> CoreMessage : generates
    GitHubService --> ButtonConfig : contains
    GitHubService --> CoreMessage : generates
```

### Class Descriptions

#### Core Services
- **AIService**: Manages Azure OpenAI client configuration and streaming
- **JiraService**: Handles Jira-specific prompt generation and configuration
- **GitHubService**: Manages GitHub PR description prompts and logic
- **NotificationService**: Provides user feedback and notification management

#### UI Components
- **AddCommentButton**: React component for Jira comment generation
- **AddDescription**: React component for GitHub PR description automation
- **ContentScript**: Base class for content script injection logic

#### Configuration & Data
- **PlasmoCSConfig**: Content script configuration interface
- **ButtonConfig**: UI button configuration structure
- **CoreMessage**: AI message format interface

#### Custom Hooks
- **StreamHook**: Collection of React hooks for streaming, drag, and fetch operations

---

## Sequence Diagrams

### Jira Comment Generation Flow

This sequence diagram shows the complete flow from user interaction to AI-generated comment in Jira.

```mermaid
sequenceDiagram
    participant User
    participant JiraPage as Jira Page
    participant ContentScript as Content Script
    participant AddCommentBtn as AddCommentButton
    participant JiraService as Jira Service
    participant AIService as AI Service
    participant AzureAPI as Azure OpenAI API
    participant CommentArea as Comment Area

    User->>JiraPage: Navigate to Jira ticket
    JiraPage->>ContentScript: Page loaded
    ContentScript->>ContentScript: Check URL matches
    ContentScript->>JiraPage: Inject button container
    ContentScript->>AddCommentBtn: Render component
    AddCommentBtn->>JiraPage: Display "Summary to Testers" button
    
    User->>AddCommentBtn: Click button
    AddCommentBtn->>JiraPage: Check if comment editor exists
    alt Comment editor not open
        AddCommentBtn->>JiraPage: Trigger comment editor
        JiraPage->>JiraPage: Open comment editor
    end
    
    AddCommentBtn->>JiraPage: Extract ticket description
    JiraPage-->>AddCommentBtn: Return description text
    
    AddCommentBtn->>JiraService: generateSnippet(description)
    JiraService->>JiraService: Generate system prompt
    JiraService->>JiraService: Generate user prompt
    JiraService-->>AddCommentBtn: Return CoreMessage[]
    
    AddCommentBtn->>AIService: streamText(messages)
    AIService->>AzureAPI: HTTP POST /chat/completions
    
    loop Streaming Response
        AzureAPI-->>AIService: Stream text chunk
        AIService-->>AddCommentBtn: Yield text part
        AddCommentBtn->>AddCommentBtn: Append to comment
        AddCommentBtn->>CommentArea: Update textarea
        AddCommentBtn->>CommentArea: Update rich editor (iframe)
        CommentArea-->>User: Display progressive update
    end
    
    AzureAPI-->>AIService: Stream complete
    AIService-->>AddCommentBtn: Generation finished
    User->>CommentArea: Review generated summary
    User->>JiraPage: Submit comment
```

### Extension Loading and Initialization Flow

This diagram shows how the browser extension loads and initializes its components.

```mermaid
sequenceDiagram
    participant Browser
    participant Extension as Extension Runtime
    participant Popup as Extension Popup
    participant ContentScript as Content Scripts
    participant BackgroundService as Background Service
    participant Storage as Local Storage

    Browser->>Extension: User installs extension
    Extension->>Extension: Load manifest.json
    Extension->>BackgroundService: Initialize background service
    Extension->>Storage: Initialize storage
    
    Browser->>Browser: User navigates to target page
    Browser->>Extension: Page URL matches content script rules
    Extension->>ContentScript: Inject content script
    
    ContentScript->>ContentScript: Wait for page elements
    ContentScript->>ContentScript: Find injection points
    ContentScript->>ContentScript: Create root containers
    ContentScript->>ContentScript: Render React components
    
    alt User clicks extension icon
        Browser->>Popup: Show extension popup
        Popup->>Storage: Load configuration
        Storage-->>Popup: Return settings
        Popup->>Popup: Render popup UI
    end
    
    alt User interacts with injected features
        ContentScript->>ContentScript: Handle user interactions
        ContentScript->>Storage: Read/write settings
        ContentScript->>BackgroundService: Send messages if needed
    end
```

---

## Data Flow Diagrams

### AI Processing Data Flow

This flowchart shows the complete data processing pipeline from user input to AI-generated output.

```mermaid
flowchart TD
    subgraph "Data Sources"
        JIRA_DESC[Jira Ticket Description]
        GITHUB_CODE[GitHub Code Changes]
        USER_INPUT[User Input/Selection]
    end
    
    subgraph "Data Extraction"
        DOM_EXTRACT[DOM Element Extraction]
        TEXT_PARSE[Text Parsing & Cleaning]
        CONTEXT_BUILD[Context Building]
    end
    
    subgraph "Prompt Engineering"
        SYSTEM_PROMPT[System Prompt Generation]
        USER_PROMPT[User Prompt Creation]
        CONTEXT_INJECT[Context Injection]
        TEMPLATE_APPLY[Template Application]
    end
    
    subgraph "AI Processing"
        AI_REQUEST[AI API Request]
        STREAM_PROCESS[Stream Processing]
        RESPONSE_PARSE[Response Parsing]
    end
    
    subgraph "Output Processing"
        MARKDOWN_CONVERT[Markdown Conversion]
        UI_UPDATE[UI Update/Injection]
        STORAGE_SAVE[Save to Storage]
        USER_FEEDBACK[User Feedback Display]
    end
    
    subgraph "Error Handling"
        ERROR_CATCH[Error Detection]
        RETRY_LOGIC[Retry Logic]
        FALLBACK[Fallback Mechanisms]
        USER_NOTIFY[User Notification]
    end
    
    JIRA_DESC --> DOM_EXTRACT
    GITHUB_CODE --> DOM_EXTRACT
    USER_INPUT --> DOM_EXTRACT
    
    DOM_EXTRACT --> TEXT_PARSE
    TEXT_PARSE --> CONTEXT_BUILD
    
    CONTEXT_BUILD --> SYSTEM_PROMPT
    CONTEXT_BUILD --> USER_PROMPT
    SYSTEM_PROMPT --> CONTEXT_INJECT
    USER_PROMPT --> CONTEXT_INJECT
    CONTEXT_INJECT --> TEMPLATE_APPLY
    
    TEMPLATE_APPLY --> AI_REQUEST
    AI_REQUEST --> STREAM_PROCESS
    STREAM_PROCESS --> RESPONSE_PARSE
    
    RESPONSE_PARSE --> MARKDOWN_CONVERT
    MARKDOWN_CONVERT --> UI_UPDATE
    UI_UPDATE --> STORAGE_SAVE
    STORAGE_SAVE --> USER_FEEDBACK
    
    AI_REQUEST --> ERROR_CATCH
    STREAM_PROCESS --> ERROR_CATCH
    ERROR_CATCH --> RETRY_LOGIC
    RETRY_LOGIC --> FALLBACK
    FALLBACK --> USER_NOTIFY
    
    ERROR_CATCH -.->|Retry| AI_REQUEST
    FALLBACK -.->|Success| MARKDOWN_CONVERT
```

---

## Deployment Architecture

### Browser Extension Deployment Model

This diagram illustrates the complete deployment pipeline from development to end-user installation.

```mermaid
graph TB
    subgraph "Development Environment"
        DEV_CODE[Source Code<br/>TypeScript/React]
        PLASMO_CLI[Plasmo CLI<br/>Build System]
        PNPM[PNPM<br/>Package Manager]
    end
    
    subgraph "Build Process"
        BUILD_DEV[Development Build<br/>pnpm dev]
        BUILD_PROD[Production Build<br/>pnpm build]
        ASSETS[Static Assets<br/>Icons, Styles]
    end
    
    subgraph "Browser Stores"
        CHROME_STORE[Chrome Web Store]
        FIREFOX_STORE[Firefox Add-ons]
        EDGE_STORE[Edge Add-ons]
    end
    
    subgraph "User Browser"
        BROWSER_EXT[Extension Runtime]
        CONTENT_SCRIPTS[Content Scripts]
        POPUP_UI[Popup Interface]
        BACKGROUND[Background Service]
        LOCAL_STORAGE[Local Storage]
    end
    
    subgraph "External Services"
        AZURE_AI[Azure OpenAI<br/>GPT-4o API]
        JIRA_SITE[Jira Instance<br/>jira.autodesk.com]
        GITHUB_SITE[GitHub<br/>github.com]
    end
    
    subgraph "Target Websites"
        WEB_PAGES[Web Pages<br/>DOM Injection Points]
        USER_INTERFACE[Enhanced UI<br/>AI-powered Features]
    end
    
    DEV_CODE --> PLASMO_CLI
    PNPM --> PLASMO_CLI
    
    PLASMO_CLI --> BUILD_DEV
    PLASMO_CLI --> BUILD_PROD
    ASSETS --> BUILD_PROD
    
    BUILD_PROD --> CHROME_STORE
    BUILD_PROD --> FIREFOX_STORE
    BUILD_PROD --> EDGE_STORE
    
    CHROME_STORE --> BROWSER_EXT
    FIREFOX_STORE --> BROWSER_EXT
    EDGE_STORE --> BROWSER_EXT
    
    BROWSER_EXT --> CONTENT_SCRIPTS
    BROWSER_EXT --> POPUP_UI
    BROWSER_EXT --> BACKGROUND
    BROWSER_EXT --> LOCAL_STORAGE
    
    CONTENT_SCRIPTS --> WEB_PAGES
    WEB_PAGES --> USER_INTERFACE
    
    BACKGROUND --> AZURE_AI
    CONTENT_SCRIPTS --> AZURE_AI
    
    CONTENT_SCRIPTS --> JIRA_SITE
    CONTENT_SCRIPTS --> GITHUB_SITE
    
    BUILD_DEV -.->|Hot Reload| BROWSER_EXT
```

### Deployment Characteristics
- **Cross-Platform**: Single codebase deploys to multiple browsers
- **Hot Reload**: Development builds support real-time updates
- **Store Distribution**: Production builds distributed through official browser stores
- **Local Development**: Development builds can be loaded locally for testing
- **External Dependencies**: Requires network access to Azure OpenAI services

---

## Use Case Diagrams

### Primary Use Cases

This diagram shows the main use cases and actor interactions within the AI Toolbox system.

```mermaid
graph TD
    subgraph "Actors"
        DEV[Software Developer]
        QA[QA Tester]
        PM[Project Manager]
        ADMIN[System Administrator]
    end
    
    subgraph "AI Toolbox System"
        subgraph "Core Features"
            UC1[Generate Jira Test Summary]
            UC2[Generate GitHub PR Description]
            UC3[AI Text Translation]
            UC4[AI Chatbot Assistance]
        end
        
        subgraph "Configuration"
            UC5[Configure AI Settings]
            UC6[Manage API Keys]
            UC7[Set User Preferences]
        end
        
        subgraph "Content Management"
            UC8[Extract Page Content]
            UC9[Inject UI Elements]
            UC10[Update Page Content]
        end
    end
    
    subgraph "External Systems"
        JIRA[Jira System]
        GITHUB[GitHub Platform]
        AZURE[Azure OpenAI]
    end
    
    DEV --> UC1
    DEV --> UC2
    DEV --> UC3
    DEV --> UC4
    DEV --> UC5
    
    QA --> UC1
    QA --> UC4
    
    PM --> UC4
    PM --> UC7
    
    ADMIN --> UC5
    ADMIN --> UC6
    ADMIN --> UC7
    
    UC1 --> UC8
    UC1 --> UC9
    UC1 --> UC10
    UC1 --> JIRA
    UC1 --> AZURE
    
    UC2 --> UC8
    UC2 --> UC9
    UC2 --> UC10
    UC2 --> GITHUB
    UC2 --> AZURE
    
    UC3 --> AZURE
    UC4 --> AZURE
    
    UC5 --> UC6
    UC6 --> AZURE
```

### Use Case Descriptions

#### Core Features
- **UC1 - Generate Jira Test Summary**: Automatically create structured test summaries for QA teams based on Jira ticket descriptions
- **UC2 - Generate GitHub PR Description**: Auto-generate comprehensive PR descriptions from code changes
- **UC3 - AI Text Translation**: Translate selected text content between languages
- **UC4 - AI Chatbot Assistance**: Provide contextual help and answer questions

#### Configuration & Management
- **UC5 - Configure AI Settings**: Set up AI model parameters and behavior
- **UC6 - Manage API Keys**: Handle authentication tokens and API access
- **UC7 - Set User Preferences**: Customize extension behavior and UI preferences

#### Content Management
- **UC8 - Extract Page Content**: Parse and extract relevant information from web pages
- **UC9 - Inject UI Elements**: Add extension UI components to target websites
- **UC10 - Update Page Content**: Modify page content with AI-generated text

---

## Technical Specifications

### Performance Requirements
- **Response Time**: AI generation should complete within 10-30 seconds
- **Streaming**: Real-time text streaming for better user experience
- **Memory Usage**: Minimal impact on browser performance
- **Network**: Efficient API usage with retry mechanisms

### Security Considerations
- **API Key Management**: Secure storage of authentication tokens
- **Content Security**: Validation of injected content
- **Permission Model**: Minimal required permissions for extension functionality
- **Data Privacy**: No persistent storage of user content

### Browser Compatibility
- **Chrome**: Primary target (Manifest V3)
- **Firefox**: Secondary support
- **Edge**: Chromium-based compatibility
- **Safari**: Future consideration

### Development Guidelines
- **Code Quality**: TypeScript strict mode, ESLint rules
- **Testing**: Component testing with React Testing Library
- **Documentation**: Inline documentation and README updates
- **Version Control**: Semantic versioning and changelog maintenance

---

## Conclusion

The AI Toolbox browser extension represents a comprehensive solution for integrating AI-powered productivity tools directly into developer workflows. The modular architecture allows for easy extension and maintenance while providing a consistent user experience across different platforms.

### Key Architectural Benefits
1. **Modularity**: Each feature is self-contained and independently maintainable
2. **Scalability**: Easy to add new platforms and AI capabilities
3. **User Experience**: Seamless integration with existing tools and workflows
4. **Performance**: Efficient content script injection and streaming responses
5. **Security**: Secure handling of API keys and user data

### Future Enhancements
- Additional platform integrations (Confluence, Slack, etc.)
- Enhanced AI model support and configuration options
- Advanced prompt engineering and customization
- Analytics and usage tracking for optimization
- Multi-language support for international teams

This design document serves as a comprehensive guide for developers, architects, and stakeholders to understand the system's structure, behavior, and extension points for future development. 