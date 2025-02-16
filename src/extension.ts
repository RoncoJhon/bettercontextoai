import * as vscode from 'vscode';
import OpenAI from "openai";

// 1) Keep a conversation array at the top-level (global) scope
let conversation: Array<{ role: "user" | "assistant"; content: string }> = [];

const openai = new OpenAI({ apiKey: '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' });

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('extension.bettercontextoai', async () => {
    // Prompt user for a message
    const userInput = await vscode.window.showInputBox({
      placeHolder: 'Enter your message for OpenAI'
    });
    if (!userInput) {
      vscode.window.showErrorMessage('No input provided.');
      return;
    }

    // 2) Add the new user message to the conversation
    conversation.push({ role: "user", content: userInput });

    try {
      // 3) Send the entire conversation each time
      const response = await openai.chat.completions.create({
        model: "o1-mini", // or "gpt-3.5-turbo", etc.
        messages: conversation,
        // store: true, // "store" is optional/experimental in some libraries
      });

      const assistantReply = response.choices[0]?.message?.content ?? '';
      
      // 4) Add the assistant's response to the conversation
      conversation.push({ role: "assistant", content: assistantReply });

      // Show the response
      vscode.window.showInformationMessage(`OpenAI says: ${assistantReply}`);
      console.log('Full reply:', JSON.stringify(response));
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error calling OpenAI API: ${error?.message}`);
      console.error(error);
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
