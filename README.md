# Better Context to AI

Generate a file containing paths and contents of selected files or folders for easy and cost-effective AI context sharing, copy-paste into your AI chat just once. Really useful if you use models with long context windows. My recommendation is Ai Studo from google.

## Usage

1. Open the **File Selector** view in the Explorer pane.
2. Click on files or folders to **toggle selection**.
3. Run **Generate File Content Map** (`Ctrl+Shift+P` → `Generate File Content Map`) to export `FILE_CONTENT_MAP.md` at the workspace root.
4. Run **Refresh File Tree** (`Ctrl+Shift+P` → `Refresh File Tree`) to clear and rescan selections. (No needed if file names or paths doesn't change)
5. Copy the content of the `FILE_CONTENT_MAP.md` file and paste it into your AI chat.

## Requirements

- Visual Studio Code **≥ 1.97.0**

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

### 1.0.0

- Initial release with file selection tree and content map generation.
