import { readdirSync, lstatSync, readFileSync, existsSync } from 'fs';
import { join, normalize, dirname } from 'path';
import * as vscode from 'vscode';
import { ExclusionManager } from './ExclusionManager';

/**
 * Helper function to filter out paths that are descendants of another selected path.
 */
export function filterSelectedPaths(paths: string[]): string[] {
    // Normalize paths to use forward slashes for consistency.
    const normalized = paths.map(p => normalize(p).replace(/\\/g, "/"));
    return normalized.filter((path) => {
        // Exclude the path if any other path is a proper prefix.
        return !normalized.some(otherPath =>
            otherPath !== path && path.startsWith(otherPath + "/")
        );
    });
}

/**
 * Helper function to traverse a folder (up to a given depth) and build its structure.
 */
function traverseFolder(folderPath: string, maxDepth: number, rootPath: string = ''): any {
    const structure: any = {};
    const config = vscode.workspace.getConfiguration('betterContextToAI');
    const MAX_FILE_SIZE = config.get<number>('maxFileSize', 51200); // User-configurable file size

    // If we've reached the maximum depth, stop traversing.
    if (maxDepth <= 0) {
        return structure;
    }

    let items: string[];
    try {
        items = readdirSync(folderPath);
    } catch (err) {
        return structure;
    }

    for (const item of items) {
        const itemPath = join(folderPath, item);
        let stats;
        try {
            stats = lstatSync(itemPath);
        } catch (err) {
            continue; // Skip files we can't read
        }
        
        const isDirectory = stats.isDirectory();
        
        // Use the new exclusion manager
        if (ExclusionManager.shouldExclude(itemPath, isDirectory, rootPath)) {
            continue;
        }
        
        if (isDirectory) {
            structure[item] = traverseFolder(itemPath, maxDepth - 1, rootPath);
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
    return structure;
}

/**
 * Helper function to build a folder structure with file contents from a list of paths.
 * It now handles both directories and individual files.
 */
export function getFolderStructureForSelectedPaths(paths: string[], maxDepth = 2): any {
    const structure: any = {};
    const config = vscode.workspace.getConfiguration('betterContextToAI');
    const MAX_FILE_SIZE = config.get<number>('maxFileSize', 51200);

    // Get workspace root for relative path calculations
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

    paths.forEach((p) => {
        if (!existsSync(p)) {
            console.error("Path does not exist:", p);
            return;
        }
        
        let stats;
        try {
            stats = lstatSync(p);
        } catch (err) {
            console.error("Cannot access path:", p, err);
            return;
        }
        
        if (stats.isDirectory()) {
            // If the path is a directory, traverse it.
            structure[p] = traverseFolder(p, maxDepth, workspaceRoot);
        } else {
            // Check if individual file should be excluded
            if (ExclusionManager.shouldExclude(p, false, workspaceRoot)) {
                return;
            }
            
            // For a file, read its content directly.
            if (stats.size <= MAX_FILE_SIZE) {
                try {
                    const content = readFileSync(p, 'utf8');
                    structure[p] = { type: 'file', content, path: p };
                } catch (err) {
                    structure[p] = { type: 'file', content: '[Error reading file]', path: p };
                }
            } else {
                structure[p] = { type: 'file', content: '[File too large, omitted]', path: p };
            }
        }
    });

    return structure;
}