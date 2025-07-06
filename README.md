# Better Context to AI

Easily share your context with web-based AI models 

## The Problem
-   🤏 VS Code AI extensions often have **restrictive context limitations**.
-   📋 Web-based AI chats (ChatGPT, Claude, Gemini, Google's AI Studio) offer **better context windows** (Google's are my recommendations, mainly AI Studio), but require tedious **file-by-file copy-pasting**.
-   🤔 You end up choosing between convenience (limited AI) or capability (manual work).

## The Solution
Select multiple files and folders in VS Code 🖱️, generate one comprehensive document 📄, then paste everything into your preferred web AI chat 🤖 **in a single action**. 🚀

### Using the Explorer View to select the context to share
![Demo of Better Context to AI](https://raw.githubusercontent.com/roncojon/justmedia/main/using-explorer-view.gif)

### Using the File Selector to select the context to share
![Demo of Better Context to AI](https://raw.githubusercontent.com/roncojon/justmedia/main/using-file-selector.gif)
Of course you can use a combination of both ways.

## Usage

The entire workflow can be managed directly from the "File Selector" view

1.  Open the **File Selector** view in the Explorer pane.
2.  Click on any file or folder to toggle its selection.
3.  Click the **Generate** (⚡) icon in the view's title bar to create `FILE_CONTENT_MAP.md`.
4.  Copy the content from the generated file and paste it into your AI chat.
 
Or you can use the "Explorer View":

1.  Open the **Explorer View** view in VS Code.
2.  Click on any file or folder to toggle its selection.
3.  Click the **Generate** (⚡) icon in the view's title bar to create `FILE_CONTENT_MAP.md`.
4.  Copy the content from the generated file and paste it into your AI chat.

## Why Use This?

-   🧠 **Escape context limitations**: Leverage web AI models with 100K+ tokens context window (some of them 1M+) instead of being stuck with sometimes limited VS Code extensions.
-   💸 **Save money**: Web AI chats are often **free or cheaper** than premium VS Code AI extensions - use them more effectively.
-   🚫 **End copy-paste hell**: No more manually copying dozens of files one by one into chat windows. If you are working over the same files and you already selected them once, you can just use the command to regenerate the single file with the updated context you want to share.
-   🤝 **Best of both worlds**: This is not a substitute for your current AI coding agents or copilot, keep your familiar VS Code workflow while accessing the most powerful AI models available trough their webs.

If you find this extension useful, please rate it on the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ronco-jhon.better-context-to-ai&ssr=false#review-details). Your feedback helps us improve!
There's still work to be done, but I think it's useful, right? It might help a fellow developer.

## Supported Languages

All programming languages and file types supported by VS Code are fully supported.

## Features

-   Interactive **File Selector** tree view to pick files and folders for context
-   Produce a `FILE_CONTENT_MAP.md` with code snippets, files over 50 KB, images and other binary files are automatically omitted
-   **Automatic `.gitignore` Handling:** The extension will automatically add `FILE_CONTENT_MAP.md` to your project's `.gitignore` file to prevent it from being accidentally committed.
-   Your generated `FILE_CONTENT_MAP.md` file is automatically hidden from the File Selector to reduce clutter.
-   **Smart Filtering:** Intelligently avoids nested or duplicate paths when generating the map and omits large binaries, images, and other non-essential files to keep your context focused.

## Commands

While the primary workflow uses the title bar icons, the following commands are also available in the Command Palette (`Ctrl+Shift+P`):

-   `Better Context to AI: Generate File Content Map`
-   `Better Context to AI: Refresh File Tree`

## Requirements

- Visual Studio Code **≥ 1.90.0**

## Release Notes

### 1.3.0 (Latest)
-   **New Feature:** Added "Select/Unselect for AI Context" option in the Explorer context menu.
-   **New Feature:** Added Settings to Exclude specific file patterns, folders or file extensions from AI context.
### 1.2.9
-   **New Feature:** Added visual indicators (✓) in Explorer view to show which files/folders are selected for AI context.
-   **New Feature:** Added option "Select/Unselect for AI Context" when right clicking a file or folder from the Explorer view.
-   **New Feature:** Added Generate (⚡) and Refresh (🔃) icons to the view's title bar for an intuitive, one-click workflow.
-   **New Feature:** Extension now automatically adds `FILE_CONTENT_MAP.md` to `.gitignore`.
-   **Improvement:** The `FILE_CONTENT_MAP.md` file is now hidden from the File Selector tree view.
-   Updated documentation to reflect new UI.

### 1.1.1
-   Added MIT License.