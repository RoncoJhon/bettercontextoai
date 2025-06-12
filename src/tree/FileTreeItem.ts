import * as vscode from 'vscode';

/**
 * Custom TreeItem representing a file or folder in the workspace.
 */
export class FileTreeItem extends vscode.TreeItem {
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