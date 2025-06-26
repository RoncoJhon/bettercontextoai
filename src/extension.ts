import * as vscode from 'vscode';
import { writeFileSync, existsSync, readFileSync, appendFileSync, lstatSync } from 'fs';
import { join, normalize, basename } from 'path';
import { FileSystemProvider } from './tree/FileSystemProvider';
import { FileTreeItem } from './tree/FileTreeItem';
import { filterSelectedPaths, getFolderStructureForSelectedPaths } from './utils/fileSystemUtils';
import { ExclusionManager } from './utils/ExclusionManager';

/**
 * File decoration provider to show visual indicators in Explorer view
 */
class AIContextDecorationProvider implements vscode.FileDecorationProvider {
    private _onDidChangeFileDecorations: vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined> = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
    readonly onDidChangeFileDecorations: vscode.Event<vscode.Uri | vscode.Uri[] | undefined> = this._onDidChangeFileDecorations.event;

    constructor(private fileSystemProvider: FileSystemProvider) {}

    provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
        const isSelected = this.fileSystemProvider.isSelected(uri.fsPath);
        
        if (isSelected) {
            return {
                badge: "✓",
                tooltip: "Selected for AI Context",
                color: new vscode.ThemeColor("charts.green")
            };
        }
        
        return undefined;
    }

    /**
     * Refresh decorations for all files
     */
    refresh(): void {
        this._onDidChangeFileDecorations.fire(undefined);
    }

    /**
     * Refresh decoration for a specific file
     */
    refreshFile(uri: vscode.Uri): void {
        this._onDidChangeFileDecorations.fire(uri);
    }
}

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

    // Create and register the decoration provider
    const decorationProvider = new AIContextDecorationProvider(fileSystemProvider);
    const decorationDisposable = vscode.window.registerFileDecorationProvider(decorationProvider);

    // Listen to selection changes and update decorations
    const selectionChangeListener = fileSystemProvider.onDidChangeSelection((changedPaths: string[]) => {
        // Convert changed paths to URIs and refresh decorations for those specific files
        const changedUris = changedPaths.map(path => vscode.Uri.file(path));
        for (const uri of changedUris) {
            decorationProvider.refreshFile(uri);
        }
    });

    const treeView = vscode.window.createTreeView('fileSelector', {
        treeDataProvider: fileSystemProvider,
        showCollapseAll: true, 
    });

    const toggleSelectionCommand = vscode.commands.registerCommand('extension.toggleSelection', (item: FileTreeItem) => {
        fileSystemProvider.toggleSelection(item);
        // Decorations will be updated automatically via the selection change event
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
        
        // FIXED: First open the file automatically
        const doc = await vscode.workspace.openTextDocument(mdPath);
        await vscode.window.showTextDocument(doc);
        
        // FIXED: Then show the info message with exclusion summary
        const exclusionSummary = ExclusionManager.getExclusionSummary();
        vscode.window.showInformationMessage(
            `FILE_CONTENT_MAP.md generated successfully! (${exclusionSummary})`,
            'Settings'
        ).then(selection => {
            if (selection === 'Settings') {
                ExclusionManager.openSettings();
            }
        });
    });

    const refreshTreeCommand = vscode.commands.registerCommand('extension.refreshFileTree', () => {
        fileSystemProvider.refresh();
        vscode.window.showInformationMessage('File tree refreshed.');
    });

    // Settings command
    const openSettingsCommand = vscode.commands.registerCommand('extension.openSettings', () => {
        ExclusionManager.openSettings();
    });

    // NEW: Reset to defaults command
    const resetToDefaultsCommand = vscode.commands.registerCommand('extension.resetToDefaults', async () => {
        const result = await vscode.window.showWarningMessage(
            'This will reset all Better Context to AI settings to their default values. Are you sure?',
            { modal: true },
            'Yes, Reset',
            'Cancel'
        );
        
        if (result === 'Yes, Reset') {
            await ExclusionManager.resetToDefaults();
            // Refresh the tree view to reflect changes
            fileSystemProvider.refresh();
        }
    });

    const toggleSelectionFromExplorerCommand = vscode.commands.registerCommand('extension.toggleSelectionFromExplorer', async (uri: vscode.Uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('No file or folder selected.');
            return;
        }

        const filePath = uri.fsPath;
        
        // Toggle the selection in the file system provider
        const wasSelected = fileSystemProvider.isSelected(filePath);
        fileSystemProvider.toggleSelectionByPath(filePath);
        
        // Show the File Selector view if it's not visible
        await vscode.commands.executeCommand('fileSelector.focus');
        
        // Try to reveal the item in the tree view
        try {
            await fileSystemProvider.revealItem(filePath, treeView);
        } catch (err) {
            console.log('Could not reveal item in tree view:', err);
        }

        // Show a message indicating the action
        const action = wasSelected ? 'unselected from' : 'selected for';
        const fileName = filePath.split(/[\\/]/).pop();
        vscode.window.showInformationMessage(`${fileName} ${action} AI context.`);
    });

    const excludeFromAICommand = vscode.commands.registerCommand('extension.excludeFromAI', async (uri: vscode.Uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('No file or folder selected.');
            return;
        }

        const filePath = uri.fsPath;
        const stats = lstatSync(filePath);
        const isDirectory = stats.isDirectory();
        const fileName = basename(filePath);
        
        await ExclusionManager.addToExclusions(filePath, isDirectory);
        
        const itemType = isDirectory ? 'folder' : 'file';
        vscode.window.showInformationMessage(
            `${fileName} (${itemType}) will be excluded from AI context.`,
            'Open Settings',
            'Refresh Tree'
        ).then(selection => {
            if (selection === 'Open Settings') {
                ExclusionManager.openSettings();
            } else if (selection === 'Refresh Tree') {
                fileSystemProvider.refresh();
            }
        });
    });

    context.subscriptions.push(
        toggleSelectionCommand,
        fileContentMapCommand,
        refreshTreeCommand,
        openSettingsCommand,
        resetToDefaultsCommand,        // NEW
        toggleSelectionFromExplorerCommand,
        excludeFromAICommand,
        decorationDisposable,
        selectionChangeListener,
        treeView
    );
}

/**
 * Deactivate the extension.
 */
export function deactivate() { }