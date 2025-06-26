import * as vscode from 'vscode';
import { readdirSync, lstatSync } from 'fs';
import { join, dirname, relative } from 'path';
import { FileTreeItem } from './FileTreeItem';
import { ExclusionManager } from '../utils/ExclusionManager';

/**
 * TreeDataProvider that scans the workspace root folder and builds a tree view.
 * It maintains a map of selection states keyed by full file/folder path.
 */
export class FileSystemProvider implements vscode.TreeDataProvider<FileTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FileTreeItem | undefined | null | void> = new vscode.EventEmitter<FileTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FileTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    // New event emitter for selection changes
    private _onDidChangeSelection: vscode.EventEmitter<string[]> = new vscode.EventEmitter<string[]>();
    readonly onDidChangeSelection: vscode.Event<string[]> = this._onDidChangeSelection.event;
    
    private selectionMap: Map<string, boolean> = new Map();

    constructor(private rootPath: string) { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Emit selection change event with list of changed paths
     */
    private emitSelectionChange(changedPaths: string[]): void {
        this._onDidChangeSelection.fire(changedPaths);
    }

    getTreeItem(element: FileTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FileTreeItem): Thenable<FileTreeItem[]> {
        const directory = element ? element.fullPath : this.rootPath;
        let children: FileTreeItem[] = [];
        try {
            const items = readdirSync(directory);
            // FIXED: Only filter out FILE_CONTENT_MAP.md, but show everything else in tree view
            // The ExclusionManager filtering happens only during file generation, not tree display
            children = items.filter(item => {
                // Always hide our generated file from the tree view
                if (item === 'FILE_CONTENT_MAP.md') {
                    return false;
                }
                
                // Show everything else in the tree view so users can select what they want
                // Exclusions only apply during actual file generation
                return true;
            }).map(item => {
                const fullPath = join(directory, item);
                try {
                    const stats = lstatSync(fullPath);
                    const isFolder = stats.isDirectory();
                    const collapsibleState = isFolder
                        ? vscode.TreeItemCollapsibleState.Collapsed
                        : vscode.TreeItemCollapsibleState.None;
                    // Check if we have stored a selection state for this item
                    const selected = this.selectionMap.get(fullPath) || false;
                    return new FileTreeItem(item, fullPath, collapsibleState, isFolder, selected);
                } catch (err) {
                    // If we can't stat the file, create a basic item
                    return new FileTreeItem(item, fullPath, vscode.TreeItemCollapsibleState.None, false, false);
                }
            });
        } catch (err) {
            console.error(err);
        }
        return Promise.resolve(children);
    }

    /**
     * Recursively set selection state for a folder and all its children.
     */
    setSelectionRecursive(path: string, state: boolean): string[] {
        const changedPaths: string[] = [];
        
        // Only add to changed paths if the state actually changes
        const currentState = this.selectionMap.get(path) || false;
        if (currentState !== state) {
            this.selectionMap.set(path, state);
            changedPaths.push(path);
        }
        
        try {
            if (lstatSync(path).isDirectory()) {
                const items = readdirSync(path);
                for (const item of items) {
                    const fullPath = join(path, item);
                    const childChanges = this.setSelectionRecursive(fullPath, state);
                    changedPaths.push(...childChanges);
                }
            }
        } catch (err) {
            // Ignore errors (e.g. permission issues)
        }
        
        return changedPaths;
    }

    /**
     * Propagate unselection upward: if an item is unselected, then mark its parent as unselected.
     */
    updateParentSelection(path: string): string[] {
        const changedPaths: string[] = [];
        const parent = dirname(path);
        
        // Stop if we've reached the top or if parent is the same as path.
        if (!parent || parent === path) {
            return changedPaths;
        }
        
        // Only unselect parent if it was previously selected
        const currentState = this.selectionMap.get(parent) || false;
        if (currentState) {
            this.selectionMap.set(parent, false);
            changedPaths.push(parent);
        }
        
        // Recursively update the parent's parent.
        const parentChanges = this.updateParentSelection(parent);
        changedPaths.push(...parentChanges);
        
        return changedPaths;
    }

    /**
     * Toggle the selection state of the given item.
     */
    toggleSelection(item: FileTreeItem) {
        const current = this.selectionMap.get(item.fullPath) || false;
        const newState = !current;
        let changedPaths: string[] = [];
        
        if (item.isFolder) {
            // For folders, always set the state recursively for all children.
            changedPaths = this.setSelectionRecursive(item.fullPath, newState);
            // If unselecting, update parent selection.
            if (!newState) {
                const parentChanges = this.updateParentSelection(item.fullPath);
                changedPaths.push(...parentChanges);
            }
        } else {
            // For files, simply update the state.
            this.selectionMap.set(item.fullPath, newState);
            changedPaths.push(item.fullPath);
            if (!newState) {
                const parentChanges = this.updateParentSelection(item.fullPath);
                changedPaths.push(...parentChanges);
            }
        }
        
        this.refresh();
        
        // Emit selection change event
        if (changedPaths.length > 0) {
            this.emitSelectionChange(changedPaths);
        }
    }

    /**
     * Toggle selection state by file path (for use from Explorer context menu).
     */
    toggleSelectionByPath(path: string) {
        const current = this.selectionMap.get(path) || false;
        const newState = !current;
        let changedPaths: string[] = [];
        
        try {
            const stats = lstatSync(path);
            if (stats.isDirectory()) {
                // For folders, always set the state recursively for all children.
                changedPaths = this.setSelectionRecursive(path, newState);
                // If unselecting, update parent selection.
                if (!newState) {
                    const parentChanges = this.updateParentSelection(path);
                    changedPaths.push(...parentChanges);
                }
            } else {
                // For files, simply update the state.
                this.selectionMap.set(path, newState);
                changedPaths.push(path);
                if (!newState) {
                    const parentChanges = this.updateParentSelection(path);
                    changedPaths.push(...parentChanges);
                }
            }
        } catch (err) {
            console.error('Error toggling selection for path:', path, err);
        }
        
        this.refresh();
        
        // Emit selection change event
        if (changedPaths.length > 0) {
            this.emitSelectionChange(changedPaths);
        }
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