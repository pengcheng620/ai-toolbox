# AI Toolbox Frontend

A React-based web frontend for the AI Toolbox, featuring real-time streaming interfaces and modern UI components.

## 🚧 Status: Planned

This frontend application is currently in the planning phase. The browser extension currently serves as the primary frontend interface.

## 🎯 Planned Features

- **Real-time Streaming UI**: Components that handle Server-Sent Events for typewriter effects
- **Jira Integration Interface**: Web-based interface for Jira comment generation
- **GitHub Integration Interface**: Web-based interface for PR description generation
- **Universal AI Chat**: General-purpose AI chat interface
- **Authentication Flow**: OAuth 2.0 authentication with Azure AD
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS

## 🛠 Planned Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and building
- **Styling**: Tailwind CSS for utility-first styling
- **State Management**: Zustand for lightweight state management
- **HTTP Client**: Fetch API with streaming support
- **UI Components**: Custom components with Headless UI
- **Icons**: Heroicons or Lucide React
- **Testing**: Vitest + React Testing Library

## 📁 Planned Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Basic UI components (Button, Input, etc.)
│   │   ├── streaming/      # Streaming-specific components
│   │   ├── jira/          # Jira-related components
│   │   └── github/        # GitHub-related components
│   ├── pages/              # Page components
│   │   ├── Dashboard.tsx   # Main dashboard
│   │   ├── Jira.tsx       # Jira integration page
│   │   └── GitHub.tsx     # GitHub integration page
│   ├── hooks/              # Custom React hooks
│   │   ├── useStreaming.ts # Streaming data hook
│   │   ├── useAuth.ts     # Authentication hook
│   │   └── useApi.ts      # API interaction hook
│   ├── services/           # API and external services
│   │   ├── api.ts         # API client
│   │   ├── auth.ts        # Authentication service
│   │   └── streaming.ts   # Streaming utilities
│   ├── stores/             # Zustand stores
│   │   ├── authStore.ts   # Authentication state
│   │   └── uiStore.ts     # UI state
│   ├── types/              # TypeScript type definitions
│   │   ├── api.ts         # API response types
│   │   ├── jira.ts        # Jira-specific types
│   │   └── github.ts      # GitHub-specific types
│   ├── utils/              # Utility functions
│   │   ├── constants.ts   # Application constants
│   │   └── helpers.ts     # Helper functions
│   ├── App.tsx             # Main application component
│   ├── main.tsx           # Application entry point
│   └── index.css          # Global styles
├── public/                 # Static assets
├── tests/                  # Test files
├── package.json           # Dependencies and scripts
├── vite.config.ts         # Vite configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## 🚀 Planned Quick Start

Once implemented, the frontend will be started with:

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview

# Run tests
pnpm test

# Run tests with coverage
pnpm run test:coverage
```

## 🔗 Integration with Backend

The frontend will integrate with the backend API at `http://localhost:8000`:

### Streaming Integration Example

```typescript
// hooks/useStreaming.ts
import { useState, useCallback } from 'react';

interface StreamingOptions {
  onChunk: (chunk: string) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

export const useStreaming = () => {
  const [isStreaming, setIsStreaming] = useState(false);

  const startStream = useCallback(async (
    endpoint: string,
    data: any,
    options: StreamingOptions
  ) => {
    setIsStreaming(true);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, stream: true })
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              options.onComplete();
              break;
            } else if (data.startsWith('Error:')) {
              options.onError(data);
              break;
            } else {
              options.onChunk(data);
            }
          }
        }
      }
    } catch (error) {
      options.onError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return { startStream, isStreaming };
};
```

### Jira Component Example

```typescript
// components/jira/JiraCommentGenerator.tsx
import React, { useState } from 'react';
import { useStreaming } from '../../hooks/useStreaming';

interface JiraCommentGeneratorProps {
  taskDescription: string;
  taskType: string;
  context?: Record<string, any>;
}

export const JiraCommentGenerator: React.FC<JiraCommentGeneratorProps> = ({
  taskDescription,
  taskType,
  context
}) => {
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { startStream } = useStreaming();

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedContent('');

    await startStream('/api/v1/ai/jira/generate', {
      task_description: taskDescription,
      task_type: taskType,
      context
    }, {
      onChunk: (chunk) => {
        setGeneratedContent(prev => prev + chunk);
      },
      onComplete: () => {
        setIsGenerating(false);
      },
      onError: (error) => {
        console.error('Generation failed:', error);
        setIsGenerating(false);
      }
    });
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isGenerating ? 'Generating...' : 'Generate Comment'}
      </button>
      
      <div className="border rounded p-4 min-h-[200px] bg-gray-50">
        <pre className="whitespace-pre-wrap font-mono text-sm">
          {generatedContent}
          {isGenerating && <span className="animate-pulse">|</span>}
        </pre>
      </div>
    </div>
  );
};
```

## 🔄 Migration from Extension

When migrating from the browser extension:

1. **Extract Shared Components**: Move reusable components to a shared library
2. **Adapt API Calls**: Update API calls to work with the web environment
3. **Responsive Design**: Ensure components work well in both extension and web contexts
4. **State Management**: Implement proper state management for the web application
5. **Authentication**: Implement web-based OAuth flow

## 🧪 Testing Strategy

- **Unit Tests**: Test individual components and hooks
- **Integration Tests**: Test component interactions and API calls
- **E2E Tests**: Test complete user workflows
- **Streaming Tests**: Specifically test streaming functionality
- **Accessibility Tests**: Ensure WCAG compliance

## 🚀 Deployment

The frontend will be deployed as a static site:

```bash
# Build for production
npm run build

# Deploy to hosting service (Vercel, Netlify, etc.)
# The dist/ folder contains the built application
```

## 🔗 Related Documentation

- [Backend README](../backend/README.md) - Backend API documentation
- [Extension README](../extension/README.md) - Browser extension documentation
- [Root README](../README.md) - Project overview and setup

---

**Note**: This frontend is currently in the planning phase. The browser extension serves as the current frontend interface. Development will begin after the backend streaming functionality is fully stabilized.
