import * as vscode from 'vscode';
import { readdirSync, lstatSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, normalize, extname } from 'path';

/**
 * Custom TreeItem representing a file or folder in the workspace.
 */
class FileTreeItem extends vscode.TreeItem {
    public selected: boolean;
    public readonly isFolder: boolean;

    constructor(
        public readonly label: string,
        public readonly fullPath: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        isFolder: boolean,
        selected = false
    ) {
        super(label, collapsibleState);
        this.isFolder = isFolder;
        this.selected = selected;
        // Use different icons to indicate selection state.
        this.iconPath = selected 
            ? new vscode.ThemeIcon('check') 
            : new vscode.ThemeIcon('circle-outline');
        // When the user clicks on an item, trigger the toggle command.
        this.command = {
            command: 'extension.toggleSelection',
            title: 'Toggle Selection',
            arguments: [this]
        };
    }
}

/**
 * TreeDataProvider that scans the workspace root folder and builds a tree view.
 * It also maintains a map of selection states keyed by full file/folder path.
 */
class FileSystemProvider implements vscode.TreeDataProvider<FileTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FileTreeItem | undefined | null | void> = new vscode.EventEmitter<FileTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FileTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    private selectionMap: Map<string, boolean> = new Map();

    constructor(private rootPath: string) { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: FileTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FileTreeItem): Thenable<FileTreeItem[]> {
        const directory = element ? element.fullPath : this.rootPath;
        let children: FileTreeItem[] = [];
        try {
            const items = readdirSync(directory);
            children = items.map(item => {
                const fullPath = join(directory, item);
                const stats = lstatSync(fullPath);
                const isFolder = stats.isDirectory();
                const collapsibleState = isFolder 
                    ? vscode.TreeItemCollapsibleState.Collapsed 
                    : vscode.TreeItemCollapsibleState.None;
                // Check if we have stored a selection state for this item
                const selected = this.selectionMap.get(fullPath) || false;
                return new FileTreeItem(item, fullPath, collapsibleState, isFolder, selected);
            });
        } catch (err) {
            console.error(err);
        }
        return Promise.resolve(children);
    }

    /**
     * Toggle the selection state of the given item.
     */
    toggleSelection(item: FileTreeItem) {
        const current = this.selectionMap.get(item.fullPath) || false;
        this.selectionMap.set(item.fullPath, !current);
        this.refresh();
    }

    /**
     * Recursively traverse the workspace and return an array of full paths
     * that are marked as selected.
     */
    async getSelectedItems(): Promise<string[]> {
        const selectedItems: string[] = [];

        const traverse = (dir: string) => {
            let items: string[];
            try {
                items = readdirSync(dir);
            } catch (err) {
                return;
            }
            for (const item of items) {
                const fullPath = join(dir, item);
                let stats;
                try {
                    stats = lstatSync(fullPath);
                } catch (err) {
                    continue;
                }
                const isFolder = stats.isDirectory();
                const selected = this.selectionMap.get(fullPath);
                if (selected) {
                    selectedItems.push(fullPath);
                }
                if (isFolder) {
                    traverse(fullPath);
                }
            }
        };

        traverse(this.rootPath);
        return selectedItems;
    }
}

/**
 * Helper function to build a folder structure with file contents from a list of paths.
 * This logic largely mirrors your existing implementation.
 */
function getFolderStructureForSelectedPaths(paths: string[], maxDepth = 2): any {
    const structure: any = {};
    const MAX_FILE_SIZE = 50 * 1024; // 50 KB

    // List of folders and file extensions to avoid
    const foldersAndFilesToAvoid = [
        '.git', 
        'node_modules', 
        'dist', 
        'build', 
        'yarn.lock',
        'package-lock.json',
        '.yarnrc',
        '.pdf',
        '.png',
        '.exe',
        '.ico',
        '.txt',
        '.zip',
        '.tar',
        '.gz',
        '.jpg',
        '.jpeg',
        '.svg',
        '.gif',
        '.mp4',
        '.mp3',
        '.wav',
        '.avi',
        '.webm',
        '.mov',
    ];

    paths.forEach((folderPath) => {
        try {
            if (!existsSync(folderPath)) {
                console.error("Folder does not exist:", folderPath);
                return;
            }

            const items = readdirSync(folderPath);

            for (const item of items) {
                const itemPath = join(folderPath, item);
                const stats = lstatSync(itemPath);
                const itemHasABannedExtension = foldersAndFilesToAvoid.find((ext) => item.includes(ext));
                // Skip ignored items
                if (itemHasABannedExtension ||
                    item.includes('test') ||
                    item.includes('ignore') ||
                    item.includes('.spec') ||
                    item.includes('.md')) {
                    continue;
                }

                if (stats.isDirectory()) {
                    structure[item] = getFolderStructureForSelectedPaths([itemPath], maxDepth);
                } else {
                    if (stats.size <= MAX_FILE_SIZE) {
                        try {
                            const content = readFileSync(itemPath, 'utf8');
                            structure[item] = { type: 'file', content, path: itemPath };
                        } catch (err) {
                            structure[item] = { type: 'file', content: '[Error reading file]', path: itemPath };
                        }
                    } else {
                        structure[item] = { type: 'file', content: '[File too large, omitted]', path: itemPath };
                    }
                }
            }
        } catch (err) {
            console.error("Error reading directory:", folderPath, err);
        }
    });

    return structure;
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

    // Instantiate the file system provider for the tree view.
    const fileSystemProvider = new FileSystemProvider(rootPath);

    // Create the tree view with the id 'fileSelector' (make sure to add a view contribution in package.json).
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
        // Retrieve selected items (full paths) from the tree view.
        const selectedPaths = await fileSystemProvider.getSelectedItems();
        if (selectedPaths.length === 0) {
            vscode.window.showErrorMessage("No files or folders selected.");
            return;
        }

        // Build the folder structure (with file contents) from the selected paths.
        const structure = getFolderStructureForSelectedPaths(selectedPaths, 2);

        let fileContentMap = "";

        // Recursively build the markdown content.
        function buildFileContentMap(data: any) {
            for (const key in data) {
                const item = data[key];
                if (item && item.type === 'file' && item.path) {
                    const normalizedPath = normalize(item.path);
                    const forwardPath = normalizedPath.replace(/\\/g, "/");
                    fileContentMap += `"${forwardPath}":\n`;
                    fileContentMap += `// ${item.content}\n\n`;
                } else if (typeof item === 'object') {
                    buildFileContentMap(item);
                }
            }
        }
        buildFileContentMap(structure);

        // Choose an output folder: either the first selected folder or fallback to the workspace root.
        const outputFolder = selectedPaths.find(path => {
            try {
                return lstatSync(path).isDirectory();
            } catch (err) {
                return false;
            }
        }) || rootPath;

        const mdPath = join(outputFolder, "FILE_CONTENT_MAP.md");
        writeFileSync(mdPath, fileContentMap, "utf8");
        vscode.window.showInformationMessage(`Saved file content map to ${mdPath}`);
        vscode.workspace.openTextDocument(mdPath).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    });

    context.subscriptions.push(toggleSelectionCommand, fileContentMapCommand, treeView);
}

/**
 * Deactivate the extension.
 */
export function deactivate() {}
