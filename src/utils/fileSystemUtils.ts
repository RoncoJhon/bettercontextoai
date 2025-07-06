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

    console.log(`Traversing folder: ${folderPath} (depth: ${maxDepth})`);

    // If we've reached the maximum depth, stop traversing.
    if (maxDepth <= 0) {
        return structure;
    }

    let items: string[];
    try {
        items = readdirSync(folderPath);
    } catch (err) {
        console.error(`Error reading directory ${folderPath}:`, err);
        return structure;
    }

    for (const item of items) {
        const itemPath = join(folderPath, item);
        let stats;
        try {
            stats = lstatSync(itemPath);
        } catch (err) {
            console.error(`Error getting stats for ${itemPath}:`, err);
            continue; // Skip files we can't read
        }
        
        const isDirectory = stats.isDirectory();
        
        // IMPORTANT: Use the exclusion manager here
        console.log(`Checking item: ${item} at path: ${itemPath}`);
        const shouldExclude = ExclusionManager.shouldExclude(itemPath, isDirectory, rootPath);
        
        if (shouldExclude) {
            console.log(`SKIPPING ${item} - excluded by settings`);
            continue;
        }
        
        console.log(`INCLUDING ${item} - not excluded`);
        
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

    console.log(`Building structure for paths:`, paths);
    console.log(`Workspace root: ${workspaceRoot}`);

    paths.forEach((p) => {
        console.log(`Processing path: ${p}`);
        
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
            console.log(`${p} is a directory, checking if it should be excluded first...`);
            
            // FIXED: Check if the selected directory itself should be excluded BEFORE traversing
            if (ExclusionManager.shouldExclude(p, true, workspaceRoot)) {
                console.log(`EXCLUDING entire directory: ${p} - matches exclusion settings`);
                return; // Don't include this directory at all
            }
            
            console.log(`Directory ${p} is allowed, traversing...`);
            // If the path is a directory, traverse it.
            structure[p] = traverseFolder(p, maxDepth, workspaceRoot);
        } else {
            console.log(`${p} is a file, checking exclusions...`);
            // Check if individual file should be excluded
            if (ExclusionManager.shouldExclude(p, false, workspaceRoot)) {
                console.log(`EXCLUDING file: ${p}`);
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