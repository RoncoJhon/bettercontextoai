# Better Context to AI

Easily take advantage of powerful web-based AI models with massive context capabilities from your local development environment

## The Problem
- VS Code AI extensions often have **restrictive context limitations**
- Web-based AI chats (ChatGPT, Claude, Gemini, Google's AI Studio) offer **better context windows** (Google's are my recommendations, mainly AI Studio), but require tedious **file-by-file copy-pasting**
- You end up choosing between convenience (limited AI) or capability (manual work)

## The Solution
Select multiple files and folders in VS Code, generate one comprehensive document with all paths and contents, then paste everything into your preferred web AI chat **in a single action**.

## Why Use This?

- **Escape context limitations**: Leverage web AI models with 100K+ tokens context window (some of them 1M+) instead of being stuck with sometimes limited VS Code extensions
- **Save money**: Web AI chats are often **free or cheaper** than premium VS Code AI extensions - use them more effectively
- **End copy-paste hell**: No more manually copying dozens of files one by one into chat windows. If you are working over the same files and you already selected them once, you can just use the command to regenerate the single file with the updated context you want to share.
- **Best of both worlds**: This is not a substitute for your current AI coding agents or copilot, keep your familiar VS Code workflow while accessing the most powerful AI models available trough their webs

If you find this extension useful, please rate it on the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ronco-jhon.better-context-to-ai&ssr=false#review-details). Your feedback helps us improve!
There's still work to be done, but I think it's useful, right? It might help a fellow developer.

## Usage

1. Open the **File Selector** view in the Explorer pane.
2. Click on files or folders to **toggle selection**.
3. Run **Generate File Content Map** (`Ctrl+Shift+P` → `Generate File Content Map`) to export `FILE_CONTENT_MAP.md` at the workspace root.
4. Run **Refresh File Tree** (`Ctrl+Shift+P` → `Refresh File Tree`) to clear and rescan selections. (No needed if file names or paths doesn't change)
5. Copy the content of the `FILE_CONTENT_MAP.md` file and paste it into your AI chat.

![Demo of Better Context to AI](https://raw.githubusercontent.com/roncojon/justmedia/main/bettercontextoai-demo.gif)

## Requirements

- Visual Studio Code **≥ 1.90.0**

## Supported Languages

All programming languages and file types supported by VS Code are fully supported.

## Features

- Interactive **File Selector** tree view to pick files and folders for context
- Toggle selection of items with check/circle icons
- **Generate File Content Map** to produce a `FILE_CONTENT_MAP.md` with code snippets, files over 50 KB, images and other binary files are automatically omitted
- Automatic filtering to avoid nested or duplicate paths
- **Refresh File Tree** to rescan workspace selections, just needed if file names or paths changes

## Commands

| Command Identifier                    | Title                        |
| ------------------------------------- | ---------------------------- |
| `extension.generateFileContentMap`    | Generate File Content Map    |
| `extension.toggleSelection`           | Toggle File Selection        |
| `extension.refreshFileTree`           | Refresh File Tree            |

## Extension Settings

This extension does not contribute any user-configurable settings.

## Release Notes

### 1.0.6

- Enriched instructions
- No background extension icon