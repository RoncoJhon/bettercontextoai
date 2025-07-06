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
     * Get the effective configuration value, properly handling defaults
     */
    private static getEffectiveConfig<T>(key: string, defaultValue: T): T {
        const config = vscode.workspace.getConfiguration('betterContextToAI');
        
        // Get the value from workspace/user settings
        const configValue = config.get<T>(key);
        
        // If the config value exists and is not empty, use it
        if (configValue !== undefined && configValue !== null) {
            // For arrays, check if it's empty
            if (Array.isArray(configValue) && configValue.length === 0) {
                return defaultValue;
            }
            return configValue;
        }
        
        // Fallback to default value
        return defaultValue;
    }

    /**
     * Check if a file/folder should be excluded based on user settings
     */
    static shouldExclude(filePath: string, isDirectory: boolean, rootPath: string = ''): boolean {
        const fileName = basename(filePath);
        const fileExt = extname(filePath);
        
        // Create relative path for pattern matching if rootPath is provided
        const relativePath = rootPath ? relative(rootPath, filePath) : filePath;
        // Always use forward slashes for consistency
        const normalizedPath = relativePath.replace(/\\/g, '/');
        
        // Get effective exclusions (with proper defaults)
        const userPatterns = this.getEffectiveConfig('excludePatterns', this.DEFAULT_VALUES.excludePatterns);
        const userFolders = this.getEffectiveConfig('excludeFolders', this.DEFAULT_VALUES.excludeFolders);
        const userExtensions = this.getEffectiveConfig('excludeExtensions', this.DEFAULT_VALUES.excludeExtensions);
        
        // 1. Check against file extensions FIRST (most specific)
        if (!isDirectory && fileExt && userExtensions.includes(fileExt)) {
            return true;
        }
        
        // 2. Check against folder names (including nested folders)
        if (isDirectory) {
            // Check if the folder name itself is in the exclude list
            if (userFolders.includes(fileName)) {
                return true;
            }
            
            // Also check if any parent folder in the path is excluded
            const pathParts = normalizedPath.split('/');
            for (const part of pathParts) {
                if (part && userFolders.includes(part)) {
                    return true;
                }
            }
        }
        
        // 3. Check against patterns (most flexible)
        for (const pattern of userPatterns) {
            if (this.matchesPattern(normalizedPath, pattern)) {
                return true;
            }
            
            // Also check against the full filename for file-specific patterns
            if (!isDirectory && this.matchesPattern(fileName, pattern)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Improved pattern matching with proper glob support
     */
    private static matchesPattern(path: string, pattern: string): boolean {
        try {
            // Handle different types of patterns
            
            // 1. Exact filename match (e.g., "yarn.lock", "package-lock.json")
            if (!pattern.includes('*') && !pattern.includes('/')) {
                return basename(path) === pattern;
            }
            
            // 2. Simple extension patterns (e.g., "*.md", "*.spec.*")
            if (pattern.startsWith('*') && !pattern.includes('/')) {
                return this.matchesSimplePattern(basename(path), pattern);
            }
            
            // 3. Directory-based patterns (e.g., "**/test/**", "**/node_modules/**")
            if (pattern.includes('**')) {
                return this.matchesDirectoryPattern(path, pattern);
            }
            
            // 4. Simple path patterns (e.g., "src/*.js")
            return this.matchesSimplePattern(path, pattern);
            
        } catch (error) {
            console.error(`Error in pattern matching: ${error}`);
            return false;
        }
    }
    
    /**
     * Match simple patterns like *.js, *.spec.*, etc.
     */
    private static matchesSimplePattern(path: string, pattern: string): boolean {
        // Convert glob pattern to regex
        const regexPattern = pattern
            .replace(/\./g, '\\.')      // Escape dots first
            .replace(/\*/g, '[^/]*');   // * matches any characters except /
        
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(path);
    }
    
    // /**
    //  * Match directory-based patterns like **/test/**, **/node_modules/**
    //  */
    private static matchesDirectoryPattern(path: string, pattern: string): boolean {
        // Handle patterns like **/folder/**
        if (pattern.startsWith('**/') && pattern.endsWith('/**')) {
            const folderName = pattern.slice(3, -3); // Remove **/ and /**
            return path.split('/').includes(folderName);
        }
        
        // Handle patterns like **/folder
        if (pattern.startsWith('**/')) {
            const suffix = pattern.slice(3);
            return path.includes(suffix) || path.endsWith('/' + suffix);
        }
        
        // Handle patterns like folder/**
        if (pattern.endsWith('/**')) {
            const prefix = pattern.slice(0, -3);
            return path.startsWith(prefix + '/') || path === prefix;
        }
        
        // Fallback to simple pattern matching
        return this.matchesSimplePattern(path, pattern);
    }

    /**
     * Add a file or folder to exclusions - ensures workspace settings exist
     */
    static async addToExclusions(filePath: string, isDirectory: boolean): Promise<void> {
        const config = vscode.workspace.getConfiguration('betterContextToAI');
        const fileName = basename(filePath);
        
        if (isDirectory) {
            // Get current effective folders (with defaults)
            const currentFolders = this.getEffectiveConfig('excludeFolders', this.DEFAULT_VALUES.excludeFolders);
            if (!currentFolders.includes(fileName)) {
                await config.update('excludeFolders', [...currentFolders, fileName], 
                                 vscode.ConfigurationTarget.Workspace);
            }
        } else {
            const fileExt = extname(filePath);
            if (fileExt) {
                // Get current effective extensions (with defaults)
                const currentExtensions = this.getEffectiveConfig('excludeExtensions', this.DEFAULT_VALUES.excludeExtensions);
                if (!currentExtensions.includes(fileExt)) {
                    await config.update('excludeExtensions', [...currentExtensions, fileExt], 
                                      vscode.ConfigurationTarget.Workspace);
                }
            }
        }
    }

    /**
     * Ensure workspace settings are properly initialized with defaults
     */
    static async ensureWorkspaceSettings(): Promise<void> {
        const config = vscode.workspace.getConfiguration('betterContextToAI');
        
        try {
            // Check if workspace has any of our settings
            const hasWorkspaceSettings = [
                config.inspect('excludeExtensions')?.workspaceValue,
                config.inspect('excludeFolders')?.workspaceValue,
                config.inspect('excludePatterns')?.workspaceValue,
                config.inspect('maxFileSize')?.workspaceValue
            ].some(value => value !== undefined);
            
            // If no workspace settings exist, initialize them with defaults
            if (!hasWorkspaceSettings) {
                await Promise.all([
                    config.update('excludeExtensions', this.DEFAULT_VALUES.excludeExtensions, vscode.ConfigurationTarget.Workspace),
                    config.update('excludeFolders', this.DEFAULT_VALUES.excludeFolders, vscode.ConfigurationTarget.Workspace),
                    config.update('excludePatterns', this.DEFAULT_VALUES.excludePatterns, vscode.ConfigurationTarget.Workspace),
                    config.update('maxFileSize', this.DEFAULT_VALUES.maxFileSize, vscode.ConfigurationTarget.Workspace)
                ]);
                
                console.log('Better Context to AI: Initialized workspace settings with defaults');
            }
        } catch (error) {
            console.error('Better Context to AI: Failed to initialize workspace settings:', error);
        }
    }

    /**
     * Reset all settings to their default values
     */
    static async resetToDefaults(): Promise<void> {
        const config = vscode.workspace.getConfiguration('betterContextToAI');
        
        try {
            // Reset workspace settings to defaults
            await Promise.all([
                config.update('excludeExtensions', this.DEFAULT_VALUES.excludeExtensions, vscode.ConfigurationTarget.Workspace),
                config.update('excludeFolders', this.DEFAULT_VALUES.excludeFolders, vscode.ConfigurationTarget.Workspace),
                config.update('excludePatterns', this.DEFAULT_VALUES.excludePatterns, vscode.ConfigurationTarget.Workspace),
                config.update('maxFileSize', this.DEFAULT_VALUES.maxFileSize, vscode.ConfigurationTarget.Workspace)
            ]);
            
            vscode.window.showInformationMessage(
                'Better Context to AI settings have been reset to defaults.'
            );
            
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
        const patterns = this.getEffectiveConfig('excludePatterns', this.DEFAULT_VALUES.excludePatterns);
        const folders = this.getEffectiveConfig('excludeFolders', this.DEFAULT_VALUES.excludeFolders);
        const extensions = this.getEffectiveConfig('excludeExtensions', this.DEFAULT_VALUES.excludeExtensions);
        
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