import * as vscode from 'vscode';
import { writeFileSync, existsSync, readFileSync, appendFileSync } from 'fs';
import { join, normalize } from 'path';
import { FileSystemProvider } from './tree/FileSystemProvider';
import { FileTreeItem } from './tree/FileTreeItem';
import { filterSelectedPaths, getFolderStructureForSelectedPaths } from './utils/fileSystemUtils';

/**
 * Checks for a .gitignore file in the root of the workspace and ensures
 * that the specified filename is included in it.
 * @param rootPath The root path of the workspace.
 * @param filename The filename to add to .gitignore.
 */
function ensureFileIsGitignored(rootPath: string, filename: string) {
    const gitignorePath = join(rootPath, '.gitignore');
    
    try {
        let gitignoreContent = '';
        let needsUpdate = false;
        
        // Read existing .gitignore if it exists
        if (existsSync(gitignorePath)) {
            gitignoreContent = readFileSync(gitignorePath, 'utf8');
            // Check if the filename is already present on any line
            const entries = gitignoreContent.split('\n').map(line => line.trim());
            if (!entries.includes(filename)) {
                needsUpdate = true;
            }
        } else {
            // .gitignore doesn't exist, we need to create it
            needsUpdate = true;
        }
        
        if (needsUpdate) {
            const comment = '# Added by the extension Better Context To AI';
            const newEntry = `\n${comment}\n${filename}`;
            
            if (gitignoreContent) {
                // Append to existing content
                appendFileSync(gitignorePath, newEntry);
            } else {
                // Create new .gitignore file
                writeFileSync(gitignorePath, `${comment}\n${filename}`, 'utf8');
            }
            
            console.log(`Better Context to AI: Added ${filename} to .gitignore`);
        }
    } catch (err) {
        console.error(`Better Context to AI: Failed to read or write to .gitignore:`, err);
    }
}

// Store the last right-clicked URI globally so we can update its context
let lastRightClickedUri: vscode.Uri | undefined;

/**
 * Updates the context value for the explorer context menu based on selection state
 */
function updateContextValue(fileSystemProvider: FileSystemProvider, uri?: vscode.Uri) {
    if (!uri) {
        // Clear context if no URI
        vscode.commands.executeCommand('setContext', 'aiContext.isSelected', false);
        return;
    }
    
    // Store the last right-clicked URI
    lastRightClickedUri = uri;
    
    const isSelected = fileSystemProvider.isSelected(uri.fsPath);
    vscode.commands.executeCommand('setContext', 'aiContext.isSelected', isSelected);
}

/**
 * Updates context for the last right-clicked item when selections change
 */
function updateLastRightClickedContext(fileSystemProvider: FileSystemProvider) {
    if (lastRightClickedUri) {
        const isSelected = fileSystemProvider.isSelected(lastRightClickedUri.fsPath);
        vscode.commands.executeCommand('setContext', 'aiContext.isSelected', isSelected);
    }
}

/**
 * Activates the extension.
 */
export function activate(context: vscode.ExtensionContext) {
    const rootPath = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
    if (!rootPath) {
        vscode.window.showErrorMessage('No workspace folder found.');
        return;
    }

    // Improvement #1: Ensure our output file is in .gitignore
    ensureFileIsGitignored(rootPath, 'FILE_CONTENT_MAP.md');

    const fileSystemProvider = new FileSystemProvider(rootPath);

    const treeView = vscode.window.createTreeView('fileSelector', {
        treeDataProvider: fileSystemProvider,
        showCollapseAll: true, 
    });

    // Listen to selection changes from the File Selector
    const selectionChangeListener = fileSystemProvider.onDidChangeSelection((changedPath: string) => {
        // Update context if the changed path matches our last right-clicked item
        if (lastRightClickedUri && lastRightClickedUri.fsPath === changedPath) {
            updateLastRightClickedContext(fileSystemProvider);
        }
    });

    // Listen to explorer selection changes to update context
    const explorerSelectionListener = vscode.window.onDidChangeActiveTextEditor(() => {
        // This isn't perfect for explorer selection, but it's a starting point
        // VS Code doesn't have a direct API for explorer selection changes
    });

    const toggleSelectionCommand = vscode.commands.registerCommand('extension.toggleSelection', (item: FileTreeItem) => {
        fileSystemProvider.toggleSelection(item);
        // Update context for the last right-clicked item after any selection change
        updateLastRightClickedContext(fileSystemProvider);
    });

    const fileContentMapCommand = vscode.commands.registerCommand('extension.generateFileContentMap', async () => {
        const selectedPaths = await fileSystemProvider.getSelectedItems();
        if (selectedPaths.length === 0) {
            vscode.window.showErrorMessage("No files or folders selected.");
            return;
        }

        const filteredPaths = filterSelectedPaths(selectedPaths);
        const structure = getFolderStructureForSelectedPaths(filteredPaths, 2);
        let fileContentMap = "";

        function buildFileContentMap(data: any) {
            for (const key in data) {
                const item = data[key];
                if (item && item.type === 'file' && item.path) {
                    const forwardPath = normalize(item.path).replace(/\\/g, "/");
                    fileContentMap += `<!-- "${forwardPath}": -->\n`;
                    fileContentMap += `${item.content}\n\n`;    
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

    const refreshTreeCommand = vscode.commands.registerCommand('extension.refreshFileTree', () => {
        fileSystemProvider.refresh();
        vscode.window.showInformationMessage('File tree refreshed.');
    });

    // New command to select for AI context
    const selectForAIContextCommand = vscode.commands.registerCommand('extension.selectForAIContext', async (uri: vscode.Uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('No file or folder selected.');
            return;
        }

        const filePath = uri.fsPath;
        
        // Only select if not already selected
        if (!fileSystemProvider.isSelected(filePath)) {
            fileSystemProvider.toggleSelectionByPath(filePath);
        }
        
        // Show the File Selector view if it's not visible
        await vscode.commands.executeCommand('fileSelector.focus');
        
        // Try to reveal the item in the tree view
        try {
            await fileSystemProvider.revealItem(filePath, treeView);
        } catch (err) {
            console.log('Could not reveal item in tree view:', err);
        }

        // Show a message indicating the action
        const fileName = filePath.split(/[\\/]/).pop();
        vscode.window.showInformationMessage(`${fileName} selected for AI context.`);
        
        // Update context for future menu displays
        updateContextValue(fileSystemProvider, uri);
    });

    // New command to unselect from AI context
    const unselectForAIContextCommand = vscode.commands.registerCommand('extension.unselectForAIContext', async (uri: vscode.Uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('No file or folder selected.');
            return;
        }

        const filePath = uri.fsPath;
        
        // Only unselect if currently selected
        if (fileSystemProvider.isSelected(filePath)) {
            fileSystemProvider.toggleSelectionByPath(filePath);
        }
        
        // Show the File Selector view if it's not visible
        await vscode.commands.executeCommand('fileSelector.focus');
        
        // Try to reveal the item in the tree view
        try {
            await fileSystemProvider.revealItem(filePath, treeView);
        } catch (err) {
            console.log('Could not reveal item in tree view:', err);
        }

        // Show a message indicating the action
        const fileName = filePath.split(/[\\/]/).pop();
        vscode.window.showInformationMessage(`${fileName} unselected from AI context.`);
        
        // Update context for future menu displays
        updateContextValue(fileSystemProvider, uri);
    });

    // Command to update context based on current explorer selection
    const updateContextCommand = vscode.commands.registerCommand('extension.updateContext', (uri: vscode.Uri) => {
        updateContextValue(fileSystemProvider, uri);
    });

    context.subscriptions.push(
        toggleSelectionCommand,
        fileContentMapCommand,
        refreshTreeCommand,
        selectForAIContextCommand,
        unselectForAIContextCommand,
        updateContextCommand,
        explorerSelectionListener,
        selectionChangeListener,
        treeView
    );
}

/**
 * Deactivate the extension.
 */
export function deactivate() { }