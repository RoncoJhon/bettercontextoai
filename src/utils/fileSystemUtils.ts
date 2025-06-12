import { readdirSync, lstatSync, readFileSync, existsSync } from 'fs';
import { join, normalize, dirname } from 'path';

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
function traverseFolder(folderPath: string, maxDepth: number): any {
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
        const stats = lstatSync(itemPath);
        const banned = foldersAndFilesToAvoid.find(ext => item.includes(ext));
        if (banned ||
            item.includes('test') ||
            item.includes('ignore') ||
            item.includes('.spec') ||
            item.includes('.md')) {
            continue;
        }
        if (stats.isDirectory()) {
            structure[item] = traverseFolder(itemPath, maxDepth - 1);
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
    const MAX_FILE_SIZE = 50 * 1024; // 50 KB

    paths.forEach((p) => {
        if (!existsSync(p)) {
            console.error("Path does not exist:", p);
            return;
        }
        const stats = lstatSync(p);
        // If the path is a directory, traverse it.
        if (stats.isDirectory()) {
            structure[p] = traverseFolder(p, maxDepth);
        } else {
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

