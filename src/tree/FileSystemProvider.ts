import * as vscode from 'vscode';
import { readdirSync, lstatSync } from 'fs';
import { join, dirname } from 'path';
import { FileTreeItem } from './FileTreeItem';

/**
 * TreeDataProvider that scans the workspace root folder and builds a tree view.
 * It maintains a map of selection states keyed by full file/folder path.
 */
export class FileSystemProvider implements vscode.TreeDataProvider<FileTreeItem> {
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
     * Recursively set selection state for a folder and all its children.
     */
    setSelectionRecursive(path: string, state: boolean) {
        this.selectionMap.set(path, state);
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
        // Recursively update the parent's parent.
        this.updateParentSelection(parent);
    }

    /**
     * Toggle the selection state of the given item.
     * - When selecting a folder, mark all its children as selected.
     * - When unselecting a folder, mark all its children as unselected.
     * - When unselecting any item, update its parent(s) to be unselected.
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
            if (!newState) {
                this.updateParentSelection(item.fullPath);
            }
        }
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