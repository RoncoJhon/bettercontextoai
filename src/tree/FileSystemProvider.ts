import * as vscode from 'vscode';
import { readdirSync, lstatSync } from 'fs';
import { join, dirname, relative } from 'path';
import { FileTreeItem } from './FileTreeItem';

/**
 * TreeDataProvider that scans the workspace root folder and builds a tree view.
 * It maintains a map of selection states keyed by full file/folder path.
 */
export class FileSystemProvider implements vscode.TreeDataProvider<FileTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FileTreeItem | undefined | null | void> = new vscode.EventEmitter<FileTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FileTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    // New event emitter for selection changes
    private _onDidChangeSelection: vscode.EventEmitter<string> = new vscode.EventEmitter<string>();
    readonly onDidChangeSelection: vscode.Event<string> = this._onDidChangeSelection.event;
    
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
            // Improvement #2: Filter out our generated file before mapping.
            children = items.filter(item => item !== 'FILE_CONTENT_MAP.md').map(item => {
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
     * Recursively set selection state for a folder and all its children.
     */
    setSelectionRecursive(path: string, state: boolean) {
        this.selectionMap.set(path, state);
        // Emit selection change event
        this._onDidChangeSelection.fire(path);
        try {
            if (lstatSync(path).isDirectory()) {
                const items = readdirSync(path);
                for (const item of items) {
                    const fullPath = join(path, item);
                    this.setSelectionRecursive(fullPath, state);
                }
            }
        } catch (err) {
            // Ignore errors (e.g. permission issues)
        }
    }

    /**
     * Propagate unselection upward: if an item is unselected, then mark its parent as unselected.
     */
    updateParentSelection(path: string) {
        const parent = dirname(path);
        // Stop if we've reached the top or if parent is the same as path.
        if (!parent || parent === path) {
            return;
        }
        // Unselect the parent.
        this.selectionMap.set(parent, false);
        // Emit selection change event for parent
        this._onDidChangeSelection.fire(parent);
        // Recursively update the parent's parent.
        this.updateParentSelection(parent);
    }

    /**
     * Toggle the selection state of the given item.
     */
    toggleSelection(item: FileTreeItem) {
        const current = this.selectionMap.get(item.fullPath) || false;
        const newState = !current;
        if (item.isFolder) {
            // For folders, always set the state recursively for all children.
            this.setSelectionRecursive(item.fullPath, newState);
            // If unselecting, update parent selection.
            if (!newState) {
                this.updateParentSelection(item.fullPath);
            }
        } else {
            // For files, simply update the state.
            this.selectionMap.set(item.fullPath, newState);
            // Emit selection change event
            this._onDidChangeSelection.fire(item.fullPath);
            if (!newState) {
                this.updateParentSelection(item.fullPath);
            }
        }
        this.refresh();
    }

    /**
     * Toggle selection state by file path (for use from Explorer context menu).
     */
    toggleSelectionByPath(path: string) {
        const current = this.selectionMap.get(path) || false;
        const newState = !current;
        
        try {
            const stats = lstatSync(path);
            if (stats.isDirectory()) {
                // For folders, always set the state recursively for all children.
                this.setSelectionRecursive(path, newState);
                // If unselecting, update parent selection.
                if (!newState) {
                    this.updateParentSelection(path);
                }
            } else {
                // For files, simply update the state.
                this.selectionMap.set(path, newState);
                // Emit selection change event
                this._onDidChangeSelection.fire(path);
                if (!newState) {
                    this.updateParentSelection(path);
                }
            }
        } catch (err) {
            console.error('Error toggling selection for path:', path, err);
        }
        
        this.refresh();
    }

    /**
     * Check if a path is currently selected.
     */
    isSelected(path: string): boolean {
        return this.selectionMap.get(path) || false;
    }

    /**
     * Attempt to reveal an item in the tree view by expanding parent folders.
     */
    async revealItem(targetPath: string, treeView: vscode.TreeView<FileTreeItem>): Promise<void> {
        // Get the relative path from root to target
        const relativePath = relative(this.rootPath, targetPath);
        const pathParts = relativePath.split(/[\\/]/);
        
        // Build the path step by step and try to find the tree item
        let currentPath = this.rootPath;
        let currentItem: FileTreeItem | undefined;
        
        for (let i = 0; i < pathParts.length; i++) {
            currentPath = join(currentPath, pathParts[i]);
            
            // Get children at current level
            const children = await this.getChildren(currentItem);
            
            // Find the item that matches our current path part
            currentItem = children.find(child => child.fullPath === currentPath);
            
            if (!currentItem) {
                break; // Can't find the path, stop trying
            }
            
            // If this is not the last part and it's a folder, we need to expand it
            if (i < pathParts.length - 1 && currentItem.isFolder) {
                try {
                    await treeView.reveal(currentItem, { expand: true, focus: false, select: false });
                } catch (err) {
                    // Ignore reveal errors
                }
            }
        }
        
        // Finally, try to reveal and select the target item
        if (currentItem) {
            try {
                await treeView.reveal(currentItem, { expand: false, focus: true, select: true });
            } catch (err) {
                // Ignore reveal errors
            }
        }
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
                if (this.selectionMap.get(fullPath)) {
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