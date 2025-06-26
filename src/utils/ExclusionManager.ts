import * as vscode from 'vscode';
import { basename, extname, relative } from 'path';

export class ExclusionManager {
    private static readonly DEFAULT_EXCLUSIONS = {
        folders: ['.git', 'node_modules', 'dist', 'build', '.vscode', 'out', 'coverage', '__pycache__', '.next', '.nuxt'],
        extensions: ['.pdf', '.png', '.exe', '.ico', '.zip', '.tar', '.gz', 
                    '.jpg', '.jpeg', '.svg', '.gif', '.mp4', '.mp3', '.wav', 
                    '.avi', '.webm', '.mov', '.dmg', '.deb', '.rpm', '.msi'],
        patterns: ['**/test/**', '**/*.spec.*', '**/*.test.*', '**/ignore/**',
                  'yarn.lock', 'package-lock.json', '.yarnrc', '**/.DS_Store',
                  '**/Thumbs.db', '**/*.tmp', '**/*.temp']
    };

    /**
     * Check if a file/folder should be excluded based on user settings and defaults
     */
    static shouldExclude(filePath: string, isDirectory: boolean, rootPath: string = ''): boolean {
        const config = vscode.workspace.getConfiguration('betterContextToAI');
        const useDefaults = config.get<boolean>('useDefaultExclusions', true);
        
        const fileName = basename(filePath);
        const fileExt = extname(filePath);
        
        // Create relative path for pattern matching if rootPath is provided
        const relativePath = rootPath ? relative(rootPath, filePath) : filePath;
        const normalizedPath = relativePath.replace(/\\/g, '/');
        
        // Check user-defined exclusions first
        const userPatterns = config.get<string[]>('excludePatterns', []);
        const userFolders = config.get<string[]>('excludeFolders', []);
        const userExtensions = config.get<string[]>('excludeExtensions', []);
        
        // Check against user patterns using minimatch-like logic
        if (userPatterns.some(pattern => this.matchesPattern(normalizedPath, pattern))) {
            return true;
        }
        
        // Check against user folders
        if (isDirectory && userFolders.includes(fileName)) {
            return true;
        }
        
        // Check against user extensions
        if (!isDirectory && userExtensions.includes(fileExt)) {
            return true;
        }
        
        // Check against defaults if enabled
        if (useDefaults) {
            if (isDirectory && this.DEFAULT_EXCLUSIONS.folders.includes(fileName)) {
                return true;
            }
            
            if (!isDirectory && this.DEFAULT_EXCLUSIONS.extensions.includes(fileExt)) {
                return true;
            }
            
            if (this.DEFAULT_EXCLUSIONS.patterns.some(pattern => this.matchesPattern(normalizedPath, pattern))) {
                return true;
            }
            
            // Additional default checks
            if (fileName.includes('test') || fileName.includes('spec') || fileName.includes('.md')) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Simple pattern matching (basic glob support)
     */
    private static matchesPattern(path: string, pattern: string): boolean {
        // Convert glob pattern to regex
        const regexPattern = pattern
            .replace(/\*\*/g, '.*')  // ** matches any path
            .replace(/\*/g, '[^/]*') // * matches any characters except /
            .replace(/\?/g, '.')     // ? matches single character
            .replace(/\./g, '\\.');  // Escape dots
        
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(path);
    }

    /**
     * Add a file or folder to exclusions
     */
    static async addToExclusions(filePath: string, isDirectory: boolean): Promise<void> {
        const config = vscode.workspace.getConfiguration('betterContextToAI');
        const fileName = basename(filePath);
        
        if (isDirectory) {
            const currentFolders = config.get<string[]>('excludeFolders', []);
            if (!currentFolders.includes(fileName)) {
                await config.update('excludeFolders', [...currentFolders, fileName], 
                                 vscode.ConfigurationTarget.Workspace);
            }
        } else {
            const fileExt = extname(filePath);
            if (fileExt) {
                const currentExtensions = config.get<string[]>('excludeExtensions', []);
                if (!currentExtensions.includes(fileExt)) {
                    await config.update('excludeExtensions', [...currentExtensions, fileExt], 
                                      vscode.ConfigurationTarget.Workspace);
                }
            }
        }
    }

    /**
     * Open the extension settings in VS Code Settings UI
     */
    static openSettings(): void {
        vscode.commands.executeCommand('workbench.action.openSettings', '@ext:ronco-jhon.better-context-to-ai');
    }

    /**
     * Get current exclusion summary for display
     */
    static getExclusionSummary(): string {
        const config = vscode.workspace.getConfiguration('betterContextToAI');
        const patterns = config.get<string[]>('excludePatterns', []);
        const folders = config.get<string[]>('excludeFolders', []);
        const extensions = config.get<string[]>('excludeExtensions', []);
        const useDefaults = config.get<boolean>('useDefaultExclusions', true);
        
        let summary = '';
        if (useDefaults) {
            summary += 'Using default exclusions + ';
        }
        
        const customCount = patterns.length + folders.length + extensions.length;
        if (customCount > 0) {
            summary += `${customCount} custom exclusion${customCount > 1 ? 's' : ''}`;
        } else {
            summary += 'no custom exclusions';
        }
        
        return summary;
    }
}