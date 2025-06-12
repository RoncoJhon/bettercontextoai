import * as vscode from 'vscode';
import { writeFileSync } from 'fs';
import { join, normalize } from 'path';
import { FileSystemProvider } from './tree/FileSystemProvider';
import { FileTreeItem } from './tree/FileTreeItem';
import { filterSelectedPaths, getFolderStructureForSelectedPaths } from './utils/fileSystemUtils';

/**
 * Activates the extension.
 */
export function activate(context: vscode.ExtensionContext) {
    const rootPath = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
    if (!rootPath) {
        vscode.window.showErrorMessage('No workspace folder found.');
        return;
    }

    // Instantiate the file system provider for the tree view.
    const fileSystemProvider = new FileSystemProvider(rootPath);

    // Create the tree view with the id 'fileSelector'.
    const treeView = vscode.window.createTreeView('fileSelector', {
        treeDataProvider: fileSystemProvider,
        showCollapseAll: true
    });

    // Command to toggle the selection state of a file/folder.
    const toggleSelectionCommand = vscode.commands.registerCommand('extension.toggleSelection', (item: FileTreeItem) => {
        fileSystemProvider.toggleSelection(item);
    });

    // Command to generate a file content map from selected items.
    const fileContentMapCommand = vscode.commands.registerCommand('extension.generateFileContentMap', async () => {
        const selectedPaths = await fileSystemProvider.getSelectedItems();
        if (selectedPaths.length === 0) {
            vscode.window.showErrorMessage("No files or folders selected.");
            return;
        }

        const filteredPaths = filterSelectedPaths(selectedPaths);
        const structure = getFolderStructureForSelectedPaths(filteredPaths, 2);
        let fileContentMap = "";

        // **FIX:** This function is now correctly nested inside the command handler, just like the original code.
        function buildFileContentMap(data: any) {
            for (const key in data) {
                const item = data[key];
                if (item && item.type === 'file' && item.path) {
                    const forwardPath = normalize(item.path).replace(/\\/g, "/");
                    fileContentMap += `"${forwardPath}":\n`;
                    fileContentMap += `// ${item.content}\n\n`;
                } else if (typeof item === 'object') {
                    buildFileContentMap(item);
                }
            }
        }
        buildFileContentMap(structure);

        const mdPath = join(rootPath, "FILE_CONTENT_MAP.md");
        writeFileSync(mdPath, fileContentMap, "utf8");
        vscode.window.showInformationMessage(`Saved file content map to ${mdPath}`);
        vscode.workspace.openTextDocument(mdPath).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    });

    // New command to refresh/rescan the file tree.
    const refreshTreeCommand = vscode.commands.registerCommand('extension.refreshFileTree', () => {
        fileSystemProvider.refresh();
        vscode.window.showInformationMessage('File tree refreshed.');
    });

    context.subscriptions.push(
        toggleSelectionCommand,
        fileContentMapCommand,
        refreshTreeCommand,
        treeView
    );
}

/**
 * Deactivate the extension.
 */
export function deactivate() { }