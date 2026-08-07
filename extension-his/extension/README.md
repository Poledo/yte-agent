# ZeroCheck AI - Chrome Extension

## Overview

ZeroCheck AI is a Chrome Extension that helps validate data input on websites using AI and rule-based validation.

## Project Structure

```
extension/
├── src/
│   ├── background/     # Service Worker for background tasks
│   ├── content/        # Content Script injected into websites
│   ├── popup/          # Popup UI
│   ├── shared/         # Shared utilities (future)
│   ├── types/          # TypeScript type definitions (future)
│   └── utils/          # Utility functions (future)
├── public/             # Static assets
├── manifest.json       # Chrome Extension Manifest V3
├── package.json        # npm configuration
├── tsconfig.json       # TypeScript configuration
└── vite.config.ts      # Vite build configuration
```

## Development

### Installation

```bash
npm install
```

### Build

```bash
npm run build
```

Output will be in the `dist/` directory.

### Load Extension in Chrome

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist/` directory

## Architecture

The extension follows a modular architecture:

- **Background**: Service Worker for handling background tasks
- **Content Script**: Injects into all websites to monitor and validate input
- **Popup**: UI for user interaction and status display
- **Shared/Utils/Types**: Reusable modules (to be implemented in future tasks)

## Features (Task 001)

- [x] Manifest V3 setup
- [x] TypeScript configuration
- [x] Vite build setup
- [x] Basic project structure
- [x] Content Script that logs on page load
- [x] Popup with version and status display
- [x] Background Service Worker

## Task Status

✅ Task 001: Chrome Extension Setup - COMPLETED
