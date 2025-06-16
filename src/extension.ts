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

    const toggleSelectionCommand = vscode.commands.registerCommand('extension.toggleSelection', (item: FileTreeItem) => {
        fileSystemProvider.toggleSelection(item);
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