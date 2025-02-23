import * as vscode from 'vscode';
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync, lstatSync } from 'fs';
import { extname, join, normalize } from 'path';

// Helper function to get folder structure + file contents for selected paths
function getFolderStructureForSelectedPaths(paths: string[], maxDepth = 2): any {
  const structure: any = {};
  const MAX_FILE_SIZE = 50 * 1024; // 50 KB

  // List of folders and files to avoid
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

  paths.forEach((folderPath) => {
    try {
      if (!existsSync(folderPath)) {
        console.error("Folder does not exist:", folderPath);
        return;
      }

      const items = readdirSync(folderPath);

      for (const item of items) {
        const itemPath = join(folderPath, item);
        const stats = lstatSync(itemPath);
const itemHasABannedExtension = foldersAndFilesToAvoid.find((ext) => item.includes(ext));
        // Skip ignored items
        if (itemHasABannedExtension ||
            item.includes('test') ||
            item.includes('ignore') ||
            item.includes('.spec') ||
            item.includes('.md')) {
          continue;
        }

        if (stats.isDirectory()) {
          structure[item] = getFolderStructureForSelectedPaths([itemPath], maxDepth);
        } else {
          const fileExt = extname(item).toLowerCase();
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
    } catch (err) {
      console.error("Error reading directory:", folderPath, err);
    }
  });

  return structure;
}

export function activate(context: vscode.ExtensionContext) {
  // Command 1: Generate File Content Map for selected files/folders
  let fileContentMapCommand = vscode.commands.registerCommand('extension.generateFileContentMap', async () => {
    // Show the folder/file selection dialog
    const selectedUris = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: true,
      canSelectMany: true
    });

    if (!selectedUris || selectedUris.length === 0) {
      vscode.window.showErrorMessage('No folders or files selected.');
      return;
    }

    // Get selected paths
    const selectedPaths = selectedUris.map(uri => uri.fsPath);

    // Generate folder structure for the selected paths
    const structure = getFolderStructureForSelectedPaths(selectedPaths, 2);

    // Prepare the content map string
    let fileContentMap = "";

    function buildFileContentMap(data: any) {
      for (const key in data) {
        const item = data[key];
        if (item && item.type === 'file' && item.path) {
          const normalizedPath = normalize(item.path);
          const forwardPath = normalizedPath.replace(/\\/g, "/");
          console.log("Considering file:", forwardPath);
          fileContentMap += `"${forwardPath}":\n`;
          fileContentMap += `// ${item.content}\n\n`;
        } else if (typeof item === 'object') {
          buildFileContentMap(item);
        }
      }
    }

    buildFileContentMap(structure);

    // Save the content map to a file
    const mdPath = join(selectedPaths[0], "FILE_CONTENT_MAP.md");
    console.log("Writing to:", mdPath);
    writeFileSync(mdPath, fileContentMap, "utf8");
    vscode.window.showInformationMessage(`Saved file content map to ${mdPath}`);

    // Open the generated file in a new editor
    vscode.workspace.openTextDocument(mdPath).then(doc => {
      vscode.window.showTextDocument(doc);
    });
  });

  // Register the file content map command
  context.subscriptions.push(fileContentMapCommand);
}

export function deactivate() {}
