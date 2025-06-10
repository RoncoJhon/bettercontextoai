# betterContextOAI

Generate a file containing paths and contents of selected files or folders for easy and cost-effective AI context sharing, copy-paste into your AI chat just once.

## Features

- Interactive **File Selector** tree view to pick files and folders for context
- Toggle selection of items with check/circle icons
- **Generate File Content Map** to produce a `FILE_CONTENT_MAP.md` with code snippets up to 50 KB
- Automatic filtering to avoid nested or duplicate paths
- **Refresh File Tree** to rescan workspace selections

## Requirements

- Visual Studio Code **≥ 1.97.0**
- Node.js **≥ 16.x** (for building)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/RoncoJhon/bettercontextoai.git
   cd bettercontextoai
   ```
2. Install dependencies and build:
   ```bash
   yarn install
   yarn compile
   ```
3. Launch the extension in the VS Code Extension Development Host (press **F5**).
4. (Optional) Package for Marketplace:
   ```bash
   vsce package
   ```

## Usage

1. Open the **File Selector** view in the Explorer pane.
2. Click on files or folders to **toggle selection**.
3. Run **Generate File Content Map** (`Ctrl+Shift+P` → `Generate File Content Map`) to export `FILE_CONTENT_MAP.md` at the workspace root.
4. Run **Refresh File Tree** (`Ctrl+Shift+P` → `Refresh File Tree`) to clear and rescan selections. (No needed if file names or paths doesn't change)

## Commands

| Command Identifier                    | Title                        |
| ------------------------------------- | ---------------------------- |
| `extension.generateFileContentMap`     | Generate File Content Map    |
| `extension.toggleSelection`            | Toggle File Selection        |
| `extension.refreshFileTree`            | Refresh File Tree            |

## Extension Settings

This extension does not contribute any user-configurable settings.

## Known Issues

- Large or binary files (>50 KB) are automatically omitted from the content map.
- Files and folders containing `test`, `ignore`, or `.md` in their names are skipped.

## Release Notes

### 1.0.0

- Initial release with file selection tree<!-- , chat integration, --> and content map generation.

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
