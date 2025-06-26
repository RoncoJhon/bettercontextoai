import * as vscode from 'vscode';
import { basename, extname, relative } from 'path';

export class ExclusionManager {
    // Default values - these will be used to reset settings
    private static readonly DEFAULT_VALUES = {
        excludeExtensions: [".pdf", ".png", ".exe", ".ico", ".zip", ".tar", ".gz", ".jpg", ".jpeg", ".svg", ".gif", ".mp4", ".mp3", ".wav", ".avi", ".webm", ".mov", ".dmg", ".deb", ".rpm", ".msi"],
        excludeFolders: [".git", "node_modules", "dist", "build", ".vscode", "out", "coverage", "__pycache__", ".next", ".nuxt"],
        excludePatterns: ["**/test/**", "**/*.spec.*", "**/*.test.*", "**/ignore/**", "yarn.lock", "package-lock.json", ".yarnrc", "**/.DS_Store", "**/Thumbs.db", "**/*.tmp", "**/*.temp", "**/*.md"],
        maxFileSize: 51200
    };

    /**
     * Check if a file/folder should be excluded based on user settings
     */
    static shouldExclude(filePath: string, isDirectory: boolean, rootPath: string = ''): boolean {
        const config = vscode.workspace.getConfiguration('betterContextToAI');
        
        const fileName = basename(filePath);
        const fileExt = extname(filePath);
        
        // Create relative path for pattern matching if rootPath is provided
        const relativePath = rootPath ? relative(rootPath, filePath) : filePath;
        const normalizedPath = relativePath.replace(/\\/g, '/');
        
        // Get user-defined exclusions (these now include defaults)
        const userPatterns = config.get<string[]>('excludePatterns', this.DEFAULT_VALUES.excludePatterns);
        const userFolders = config.get<string[]>('excludeFolders', this.DEFAULT_VALUES.excludeFolders);
        const userExtensions = config.get<string[]>('excludeExtensions', this.DEFAULT_VALUES.excludeExtensions);
        
        // Check against patterns using minimatch-like logic
        if (userPatterns.length > 0 && userPatterns.some(pattern => this.matchesPattern(normalizedPath, pattern))) {
            return true;
        }
        
        // Check against folders
        if (isDirectory && userFolders.length > 0 && userFolders.includes(fileName)) {
            return true;
        }
        
        // Check against extensions
        if (!isDirectory && userExtensions.length > 0 && userExtensions.includes(fileExt)) {
            return true;
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
            const currentFolders = config.get<string[]>('excludeFolders', this.DEFAULT_VALUES.excludeFolders);
            if (!currentFolders.includes(fileName)) {
                await config.update('excludeFolders', [...currentFolders, fileName], 
                                 vscode.ConfigurationTarget.Workspace);
            }
        } else {
            const fileExt = extname(filePath);
            if (fileExt) {
                const currentExtensions = config.get<string[]>('excludeExtensions', this.DEFAULT_VALUES.excludeExtensions);
                if (!currentExtensions.includes(fileExt)) {
                    await config.update('excludeExtensions', [...currentExtensions, fileExt], 
                                      vscode.ConfigurationTarget.Workspace);
                }
            }
        }
    }

    /**
     * Reset all settings to their default values
     */
    static async resetToDefaults(): Promise<void> {
        const config = vscode.workspace.getConfiguration('betterContextToAI');
        
        try {
            console.log('Starting reset to defaults...');
            console.log('Current values before reset:');
            console.log('- excludeExtensions:', config.get('excludeExtensions'));
            console.log('- excludeFolders:', config.get('excludeFolders'));
            console.log('- excludePatterns:', config.get('excludePatterns'));
            console.log('- maxFileSize:', config.get('maxFileSize'));
            
            // Try to reset both workspace and global settings to ensure it works
            const resetPromises = [
                // Reset workspace settings
                config.update('excludeExtensions', this.DEFAULT_VALUES.excludeExtensions, vscode.ConfigurationTarget.Workspace),
                config.update('excludeFolders', this.DEFAULT_VALUES.excludeFolders, vscode.ConfigurationTarget.Workspace),
                config.update('excludePatterns', this.DEFAULT_VALUES.excludePatterns, vscode.ConfigurationTarget.Workspace),
                config.update('maxFileSize', this.DEFAULT_VALUES.maxFileSize, vscode.ConfigurationTarget.Workspace),
            ];
            
            // Also try to clear any global overrides by setting to undefined
            const clearGlobalPromises = [
                config.update('excludeExtensions', undefined, vscode.ConfigurationTarget.Global),
                config.update('excludeFolders', undefined, vscode.ConfigurationTarget.Global),
                config.update('excludePatterns', undefined, vscode.ConfigurationTarget.Global),
                config.update('maxFileSize', undefined, vscode.ConfigurationTarget.Global),
            ];
            
            await Promise.all([...resetPromises, ...clearGlobalPromises]);
            
            console.log('Reset completed. New values:');
            // Reload config to see updated values
            const newConfig = vscode.workspace.getConfiguration('betterContextToAI');
            console.log('- excludeExtensions:', newConfig.get('excludeExtensions'));
            console.log('- excludeFolders:', newConfig.get('excludeFolders'));
            console.log('- excludePatterns:', newConfig.get('excludePatterns'));
            console.log('- maxFileSize:', newConfig.get('maxFileSize'));
            
            vscode.window.showInformationMessage(
                'Better Context to AI settings have been reset to defaults.',
                'Reload Window'
            ).then(selection => {
                if (selection === 'Reload Window') {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            });
            
        } catch (error) {
            console.error('Reset to defaults error:', error);
            vscode.window.showErrorMessage(`Failed to reset settings: ${error}`);
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
        
        const totalCount = patterns.length + folders.length + extensions.length;
        return `${totalCount} exclusion rule${totalCount !== 1 ? 's' : ''} active`;
    }

    /**
     * Get the default values (useful for documentation or UI)
     */
    static getDefaults() {
        return { ...this.DEFAULT_VALUES };
    }
}