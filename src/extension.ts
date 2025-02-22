import * as vscode from 'vscode';
import OpenAI from "openai";
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync, lstatSync } from 'fs';
import { join, normalize } from 'path';

// models: gpt-4o-mini, o1-mini

// 1) Keep a global conversation array
let conversation: Array<{ role: "user" | "assistant"; content: string }> = [];

// Use your real key or environment variable
const openai = new OpenAI({ apiKey: '...' });

// Helper function to get folder structure + file contents
function getFolderStructure(folderPath: string, maxDepth = 2, currentDepth = 0): any {
  if (currentDepth > maxDepth) {
    return {};
  }

  const structure: any = {};
  const items = readdirSync(folderPath);

  // Adjust or expand this list as needed
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
    '.exe'
  ];
  // Limit file size to avoid very large payloads
  const MAX_FILE_SIZE = 50 * 1024; // 50 KB

  for (const item of items) {
    // Skip ignored items or test files
    if (foldersAndFilesToAvoid.includes(item) || item.includes('test') || item.includes('ignore') || item.includes('.spec') || item.includes('.md')) {
      continue;
    }

    const itemPath = join(folderPath, item);
    const stats = statSync(itemPath);

    if (stats.isDirectory()) {
      // Recursively get folder structure for subdirectories
      structure[item] = getFolderStructure(itemPath, maxDepth, currentDepth + 1);
    } else {
      // It's a file: decide whether to read the contents
      if (stats.size <= MAX_FILE_SIZE) {
        try {
          const content = readFileSync(itemPath, 'utf8');
          structure[item] = {
            type: 'file',
            content
          };
        } catch (err) {
          structure[item] = {
            type: 'file',
            content: '[Error reading file]'
          };
        }
      } else {
        structure[item] = {
          type: 'file',
          content: '[File too large, omitted]'
        };
      }
    }
  }
  return structure;
}

function getFolderStructure2(folderPath: string, maxDepth = 2, currentDepth = 0, targetFolder = 'src'): any {
  if (currentDepth > maxDepth) {
      return {};
  }

  const structure: any = {};

  try {
      if (!existsSync(folderPath)) {
          console.error("Folder does not exist:", folderPath);
          return {}; // Or throw an error if you prefer
      }

      const items = readdirSync(folderPath);

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
        '.exe'
      ];
      const MAX_FILE_SIZE = 50 * 1024;

      for (const item of items) {
          const itemPath = join(folderPath, item);
          const stats = lstatSync(itemPath); // Use lstatSync

          if (foldersAndFilesToAvoid.includes(item) || item.includes('test') || item.includes('ignore') || item.includes('.spec') || item.includes('.md')) {
              continue;
          }

          if (stats.isDirectory()) {
              structure[item] = getFolderStructure2(itemPath, maxDepth, currentDepth + 1, targetFolder);
          } else {
              if (stats.size <= MAX_FILE_SIZE) {
                  try {
                      const content = readFileSync(itemPath, 'utf8');
                      structure[item] = { type: 'file', content, path: itemPath };
                  } catch (err) {
                      console.error("Error reading file:", itemPath, err);
                      structure[item] = { type: 'file', content: '[Error reading file]', path: itemPath };
                  }
              } else {
                  structure[item] = { type: 'file', content: '[File too large, omitted]', path: itemPath };
              }
          }
      }
  } catch (err) {
      console.error("Error reading directory:", folderPath, err);
      return {};
  }

  return structure;
}

export function activate(context: vscode.ExtensionContext) {
  // Command 1: Regular Chat
  let chatCommand = vscode.commands.registerCommand('extension.bettercontextoai', async () => {
    const userInput = await vscode.window.showInputBox({
      placeHolder: 'Enter your message for OpenAI'
    });
    if (!userInput) {
      vscode.window.showErrorMessage('No input provided.');
      return;
    }

    // Add user message
    conversation.push({ role: "user", content: userInput });

    try {
      // Send entire conversation each time
      const response = await openai.chat.completions.create({
        model: "o1-mini", // or "gpt-3.5-turbo", etc.
        messages: conversation
      });

      const assistantReply = response.choices[0]?.message?.content ?? '';
      // Add assistant reply to conversation
      conversation.push({ role: "assistant", content: assistantReply });

      vscode.window.showInformationMessage(`OpenAI says: ${assistantReply}`);
      console.log('Full reply:', JSON.stringify(response));
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error calling OpenAI API: ${error?.message}`);
      console.error(error);
    }
  });

 // Command 2: Generate Project Summary
let projectSummaryCommand = vscode.commands.registerCommand('extension.generateProjectSummary', async () => {
  // Make sure there's a workspace folder
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage('No workspace folder found.');
    return;
  }

  // Read the folder structure (limit depth to 4 for demonstration)
  const rootPath = workspaceFolders[0].uri.fsPath;
  const structure = getFolderStructure(rootPath, 4);

  // Refined prompt with no references to other models
  conversation.push({
    role: "user",
    content: `
Here is the project structure in JSON (with file contents, depth 4):
${JSON.stringify(structure, null, 2)}

**Please analyze this entire project and produce a single functional Markdown document** with these sections:

1. **Project Title and Overview**  
   - Briefly describe the purpose and goals of the project.

2. **Table of Contents**  
   - List the major sections in a clear, navigable format.

3. **Project Folder Structure**  
   - Present the folder structure in a code block or tree listing.
   - For each folder/file, include:
     - **Type** (folder or file)
     - **Purpose** (what it does)
     - **Key contents** or a short summary of what’s inside
   - Provide extra detail for any file inside the src/ folder: 
     - Summarize its main logic, functionalities and responsabilities
     - Show the structure of its content while Highlight detailing any important functions or data structures

4. **Security Considerations**  
   - Address handling of environment variables, API keys, or any potential vulnerabilities.

5. **Development / Setup Instructions**  
   - Outline how to build, run, and test the extension.

6. **Conclusion**  
   - Summarize the project’s value, recommended best practices, or next steps.

**Formatting Guidelines**:
- Use headings (\`#\`, \`##\`, etc.) for clarity.
- Include bullet points for lists or sub-points.
- Use code blocks where relevant (e.g., for folder structure, example commands).
- Keep the language concise and informative.

Now, please generate the Markdown document following these instructions.`
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: conversation
    });

    const assistantReply = response.choices[0]?.message?.content ?? '';
    // Add assistant reply to conversation
    conversation.push({ role: "assistant", content: assistantReply });

    // Open the .md text in a new editor
    const doc = await vscode.workspace.openTextDocument({
      content: assistantReply,
      language: "markdown"
    });
    await vscode.window.showTextDocument(doc);

    // Optional: write to a file
    // import { writeFileSync } from 'fs';
    // const mdPath = join(rootPath, "PROJECT_SUMMARY.md");
    // writeFileSync(mdPath, assistantReply, "utf8");
    // vscode.window.showInformationMessage(`Saved project summary to ${mdPath}`);

  } catch (error: any) {
    vscode.window.showErrorMessage(`Error calling OpenAI API: ${error?.message}`);
    console.error(error);
  }
});

let fileContentMapCommand = vscode.commands.registerCommand('extension.generateFileContentMap', async () => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage('No workspace folder found.');
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  console.log("Root Path:", rootPath);

  // Use getFolderStructure2 to get the directory structure
  const structure = getFolderStructure2(rootPath, 10, 0, 'src');
  console.log("Structure:", JSON.stringify(structure, null, 2));

  let fileContentMap = "";

  function buildFileContentMap(data: any) {
    for (const key in data) {
      const item = data[key];
      if (item && item.type === 'file' && item.path) {
        const normalizedPath = normalize(item.path);
        // Convert Windows backslashes to forward slashes
        const forwardPath = normalizedPath.replace(/\\/g, "/");
        console.log("Considering file:", forwardPath);
        if (forwardPath.includes('src/')) {
          console.log("Including file:", forwardPath);
          fileContentMap += `"${forwardPath}":\n`;
          fileContentMap += `// ${item.content}\n\n`;
        } else {
          console.log("Excluding file:", forwardPath);
        }
      } else if (typeof item === 'object') {
        buildFileContentMap(item);
      }
    }
  }

  buildFileContentMap(structure);

  const mdPath = join(rootPath, "FILE_CONTENT_MAP.md");
  console.log("Writing to:", mdPath);
  writeFileSync(mdPath, fileContentMap, "utf8");
  vscode.window.showInformationMessage(`Saved file content map to ${mdPath}`);

  vscode.workspace.openTextDocument(mdPath).then(doc => {
    vscode.window.showTextDocument(doc);
  });
});

// context.subscriptions.push(chatCommand, projectSummaryCommand);
context.subscriptions.push(chatCommand, projectSummaryCommand, fileContentMapCommand);

}

export function deactivate() {}
