# AI Toolbox Browser Extension

A Plasmo-based browser extension that provides seamless browser integration for the AI Toolbox, featuring real-time streaming responses and modern UI components.

## 🚀 Features

- **Real-time Streaming UI**: Typewriter effect components for handling server-sent events
- **Jira Integration Interface**: In-browser Jira comment generation interface
- **GitHub Integration Interface**: PR description generation interface
- **Universal AI Chat**: General-purpose AI chat interface
- **Seamless Integration**: Direct UI component injection into target websites
- **Responsive Design**: Interface that adapts to various screen sizes

## 🛠 Tech Stack

- **Framework**: Plasmo + React 18 + TypeScript
- **Build Tool**: Plasmo Framework
- **Styling**: Tailwind CSS + Mantine UI Component Library
- **State Management**: Plasmo Storage API
- **HTTP Client**: Fetch API with streaming response support
- **Icons**: Heroicons
- **Package Manager**: pnpm
- **Extension Type**: Manifest V3 (Chrome/Edge), Manifest V2 (Firefox)
- **Browser Support**: Chrome, Firefox, Edge, and other Chromium-based browsers

## 📁 Project Structure

```
frontend/
├── src/                    # Source code directory
│   ├── components/         # Reusable UI components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API and external services
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── background/            # Background scripts
│   └── messages/          # Message handlers
├── assets/               # Static assets
├── lib/                  # Library files
├── scripts/              # Build and utility scripts
├── package.json          # Dependencies and scripts (pnpm)
├── tailwind.config.js    # Tailwind CSS configuration
├── postcss.config.js     # PostCSS configuration
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- Chrome or Firefox browser (for development and testing)

### Installation and Development

```bash
# Install dependencies
pnpm install

# Start development mode (with file watching)
pnpm dev                    # Chrome development mode (default)
pnpm dev:firefox           # Firefox development mode

# Build production version
pnpm build                 # Chrome build (default)
pnpm build:firefox         # Firefox build

# Package extension
pnpm package               # Chrome package (default)
pnpm package:firefox       # Firefox package
```

### Loading Extension in Chrome

1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `build/chrome-mv3-dev` folder (development mode) or `build/chrome-mv3-prod` folder (production mode)

### Loading Extension in Firefox

1. Open Firefox browser
2. Navigate to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on..."
5. Navigate to `build/firefox-mv2-dev` folder (development mode) or `build/firefox-mv2-prod` folder (production mode)
6. Select the `manifest.json` file

## 🔗 Backend Integration

The extension integrates with the backend API through `http://localhost:8077`:

### Plasmo Messaging

```typescript
// Use Plasmo's messaging API to communicate with background scripts
import { sendToBackground } from "@plasmohq/messaging"

// Send message to background script
const response = await sendToBackground({
  name: "generateJiraComment",
  body: {
    task_description: "Implement user authentication",
    task_type: "feature",
    stream: true
  }
})
```

### Streaming Response Handling

```typescript
// hooks/useStreaming.ts
import { useState, useCallback } from 'react';

export const useStreaming = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [content, setContent] = useState('');

  const startStream = useCallback(async (data: any) => {
    setIsStreaming(true);
    setContent('');

    try {
      const response = await fetch('http://localhost:8077/api/v1/ai/jira/generate', {
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
        setContent(prev => prev + chunk);
      }
    } catch (error) {
      console.error('Streaming error:', error);
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return { startStream, isStreaming, content };
};
```

### Content Script Example

```typescript
// contents/jira-integration.tsx
import type { PlasmoCSConfig } from "plasmo"
import { useState } from "react"
import { useStreaming } from "~hooks/useStreaming"

export const config: PlasmoCSConfig = {
  matches: ["https://jira.*.com/*"]
}

const JiraCommentGenerator = () => {
  const { startStream, isStreaming, content } = useStreaming()
  const [taskDescription, setTaskDescription] = useState("")

  const handleGenerate = async () => {
    await startStream({
      task_description: taskDescription,
      task_type: "feature"
    })
  }

  return (
    <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-50">
      <h3 className="text-lg font-semibold mb-2">AI Comment Generator</h3>
      <textarea
        value={taskDescription}
        onChange={(e) => setTaskDescription(e.target.value)}
        placeholder="Enter task description..."
        className="w-full p-2 border rounded mb-2"
      />
      <button
        onClick={handleGenerate}
        disabled={isStreaming}
        className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isStreaming ? 'Generating...' : 'Generate Comment'}
      </button>
      {content && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
          {content}
          {isStreaming && <span className="animate-pulse">|</span>}
        </div>
      )}
    </div>
  )
}

export default JiraCommentGenerator
```

## 🛠 Development Guide

### Browser-Specific Configuration

Plasmo supports configuration specific to different browsers:

#### Environment Variable Files

- `.env.firefox` - Firefox-specific environment variables
- `.env` - General environment variables

#### Browser-Specific Entry Files

- `popup.firefox.tsx` - Firefox-specific popup page
- `popup.tsx` - General popup page

#### Browser Detection in Code

```typescript
if (process.env.PLASMO_BROWSER === "firefox") {
  // Firefox-specific code
  console.log("Running on Firefox");
} else {
  // Other browsers code
  console.log("Running on Chrome/Edge");
}
```

### Plasmo Features

- **Content Scripts**: Inject UI components into target websites
- **Background Scripts**: Handle API calls and data management
- **Popup**: Interface displayed when extension icon is clicked
- **Storage API**: Cross-page data persistence
- **Messaging**: Inter-component communication

### Development Best Practices

1. **Use TypeScript**: Ensure type safety
2. **Modular Components**: Create reusable UI components
3. **Error Handling**: Properly handle API errors and network issues
4. **Performance Optimization**: Avoid unnecessary re-renders
5. **User Experience**: Provide loading states and error feedback

## 📚 Related Documentation

- [Plasmo Official Documentation](https://docs.plasmo.com/) - Plasmo framework documentation
- [Backend Documentation](../backend/README.md) - Backend API documentation
- [Project Root](../README.md) - Project overview and setup

---

**Note**: This is a Plasmo framework-based browser extension project focused on providing seamless browser integration experience for the AI Toolbox.
