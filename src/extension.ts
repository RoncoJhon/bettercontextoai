import * as vscode from 'vscode';
import OpenAI from "openai";
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

// 1) Keep a global conversation array
let conversation: Array<{ role: "user" | "assistant"; content: string }> = [];

// Use your real key or environment variable
const openai = new OpenAI({ apiKey: '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' });

// Helper function to get folder structure
function getFolderStructure(folderPath: string, maxDepth = 2, currentDepth = 0): any {
  if (currentDepth > maxDepth) {
    return {};
  }
  const structure: any = {};
  const items = readdirSync(folderPath);

  const foldersAndFilesToAvoid = ['.git', 'node_modules', 'dist', 'build', '.gitignore', 'yarn.lock'];
  for (const item of items) {
    // Skip node_modules
    if (foldersAndFilesToAvoid.includes(item) || item?.includes('test')) {
      continue;
    }

    const itemPath = join(folderPath, item);
    const stats = statSync(itemPath);

    if (stats.isDirectory()) {
      structure[item] = getFolderStructure(itemPath, maxDepth, currentDepth + 1);
    } else {
      structure[item] = "file";
    }
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

    // Read the folder structure (limit depth to 2 to avoid huge JSON)
    const rootPath = workspaceFolders[0].uri.fsPath;
    const structure = getFolderStructure(rootPath, 4);

    // Add user message with structure
    conversation.push({
      role: "user",
      content: `Here is the project structure in JSON (depth 2):\n${JSON.stringify(structure, null, 2)}\n\n` +
               `Please analyze this whole project, then create a .md that shows the project folder structure while describing each folder/file responsibility.`
    });

    try {
      const response = await openai.chat.completions.create({
        model: "o1-mini",
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

      // Or optionally write to a file:
      // import { writeFileSync } from 'fs';
      // const mdPath = join(rootPath, "PROJECT_SUMMARY.md");
      // writeFileSync(mdPath, assistantReply, "utf8");
      // vscode.window.showInformationMessage(`Saved project summary to ${mdPath}`);

    } catch (error: any) {
      vscode.window.showErrorMessage(`Error calling OpenAI API: ${error?.message}`);
      console.error(error);
    }
  });

  // Register both commands
  context.subscriptions.push(chatCommand, projectSummaryCommand);
}

export function deactivate() {}
