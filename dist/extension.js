"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode3 = __toESM(require("vscode"));
var import_fs3 = require("fs");
var import_path3 = require("path");

// src/tree/FileSystemProvider.ts
var vscode2 = __toESM(require("vscode"));
var import_fs = require("fs");
var import_path = require("path");

// src/tree/FileTreeItem.ts
var vscode = __toESM(require("vscode"));
var FileTreeItem = class extends vscode.TreeItem {
  constructor(label, fullPath, collapsibleState, isFolder, selected = false) {
    super(label, collapsibleState);
    this.label = label;
    this.fullPath = fullPath;
    this.collapsibleState = collapsibleState;
    this.isFolder = isFolder;
    this.selected = selected;
    this.iconPath = selected ? new vscode.ThemeIcon("check") : new vscode.ThemeIcon("circle-outline");
    this.command = {
      command: "extension.toggleSelection",
      title: "Toggle Selection",
      arguments: [this]
    };
  }
  selected;
  isFolder;
};

// src/tree/FileSystemProvider.ts
var FileSystemProvider = class {
  constructor(rootPath) {
    this.rootPath = rootPath;
  }
  _onDidChangeTreeData = new vscode2.EventEmitter();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  selectionMap = /* @__PURE__ */ new Map();
  refresh() {
    this._onDidChangeTreeData.fire();
  }
  getTreeItem(element) {
    return element;
  }
  getChildren(element) {
    const directory = element ? element.fullPath : this.rootPath;
    let children = [];
    try {
      const items = (0, import_fs.readdirSync)(directory);
      children = items.filter((item) => item !== "FILE_CONTENT_MAP.md").map((item) => {
        const fullPath = (0, import_path.join)(directory, item);
        const stats = (0, import_fs.lstatSync)(fullPath);
        const isFolder = stats.isDirectory();
        const collapsibleState = isFolder ? vscode2.TreeItemCollapsibleState.Collapsed : vscode2.TreeItemCollapsibleState.None;
        const selected = this.selectionMap.get(fullPath) || false;
        return new FileTreeItem(item, fullPath, collapsibleState, isFolder, selected);
      });
    } catch (err) {
      console.error(err);
    }
    return Promise.resolve(children);
  }
  /**
   * Recursively set selection state for a folder and all its children.
   */
  setSelectionRecursive(path, state) {
    this.selectionMap.set(path, state);
    try {
      if ((0, import_fs.lstatSync)(path).isDirectory()) {
        const items = (0, import_fs.readdirSync)(path);
        for (const item of items) {
          const fullPath = (0, import_path.join)(path, item);
          this.setSelectionRecursive(fullPath, state);
        }
      }
    } catch (err) {
    }
  }
  /**
   * Propagate unselection upward: if an item is unselected, then mark its parent as unselected.
   */
  updateParentSelection(path) {
    const parent = (0, import_path.dirname)(path);
    if (!parent || parent === path) {
      return;
    }
    this.selectionMap.set(parent, false);
    this.updateParentSelection(parent);
  }
  /**
   * Toggle the selection state of the given item.
   */
  toggleSelection(item) {
    const current = this.selectionMap.get(item.fullPath) || false;
    const newState = !current;
    if (item.isFolder) {
      this.setSelectionRecursive(item.fullPath, newState);
      if (!newState) {
        this.updateParentSelection(item.fullPath);
      }
    } else {
      this.selectionMap.set(item.fullPath, newState);
      if (!newState) {
        this.updateParentSelection(item.fullPath);
      }
    }
    this.refresh();
  }
  /**
   * Recursively traverse the workspace and return an array of full paths
   * that are marked as selected.
   */
  async getSelectedItems() {
    const selectedItems = [];
    const traverse = (dir) => {
      let items;
      try {
        items = (0, import_fs.readdirSync)(dir);
      } catch (err) {
        return;
      }
      for (const item of items) {
        const fullPath = (0, import_path.join)(dir, item);
        let stats;
        try {
          stats = (0, import_fs.lstatSync)(fullPath);
        } catch (err) {
          continue;
        }
        const isFolder = stats.isDirectory();
        if (this.selectionMap.get(fullPath)) {
          selectedItems.push(fullPath);
        }
        if (isFolder) {
          traverse(fullPath);
        }
      }
    };
    traverse(this.rootPath);
    return selectedItems;
  }
};

// src/utils/fileSystemUtils.ts
var import_fs2 = require("fs");
var import_path2 = require("path");
function filterSelectedPaths(paths) {
  const normalized = paths.map((p) => (0, import_path2.normalize)(p).replace(/\\/g, "/"));
  return normalized.filter((path) => {
    return !normalized.some(
      (otherPath) => otherPath !== path && path.startsWith(otherPath + "/")
    );
  });
}
function traverseFolder(folderPath, maxDepth) {
  const structure = {};
  const MAX_FILE_SIZE = 50 * 1024;
  const foldersAndFilesToAvoid = [
    ".git",
    "node_modules",
    "dist",
    "build",
    "yarn.lock",
    "package-lock.json",
    ".yarnrc",
    ".pdf",
    ".png",
    ".exe",
    ".ico",
    ".txt",
    ".zip",
    ".tar",
    ".gz",
    ".jpg",
    ".jpeg",
    ".svg",
    ".gif",
    ".mp4",
    ".mp3",
    ".wav",
    ".avi",
    ".webm",
    ".mov"
  ];
  if (maxDepth <= 0) {
    return structure;
  }
  let items;
  try {
    items = (0, import_fs2.readdirSync)(folderPath);
  } catch (err) {
    return structure;
  }
  for (const item of items) {
    const itemPath = (0, import_path2.join)(folderPath, item);
    const stats = (0, import_fs2.lstatSync)(itemPath);
    const banned = foldersAndFilesToAvoid.find((ext) => item.includes(ext));
    if (banned || item.includes("test") || item.includes("ignore") || item.includes(".spec") || item.includes(".md")) {
      continue;
    }
    if (stats.isDirectory()) {
      structure[item] = traverseFolder(itemPath, maxDepth - 1);
    } else {
      if (stats.size <= MAX_FILE_SIZE) {
        try {
          const content = (0, import_fs2.readFileSync)(itemPath, "utf8");
          structure[item] = { type: "file", content, path: itemPath };
        } catch (err) {
          structure[item] = { type: "file", content: "[Error reading file]", path: itemPath };
        }
      } else {
        structure[item] = { type: "file", content: "[File too large, omitted]", path: itemPath };
      }
    }
  }
  return structure;
}
function getFolderStructureForSelectedPaths(paths, maxDepth = 2) {
  const structure = {};
  const MAX_FILE_SIZE = 50 * 1024;
  paths.forEach((p) => {
    if (!(0, import_fs2.existsSync)(p)) {
      console.error("Path does not exist:", p);
      return;
    }
    const stats = (0, import_fs2.lstatSync)(p);
    if (stats.isDirectory()) {
      structure[p] = traverseFolder(p, maxDepth);
    } else {
      if (stats.size <= MAX_FILE_SIZE) {
        try {
          const content = (0, import_fs2.readFileSync)(p, "utf8");
          structure[p] = { type: "file", content, path: p };
        } catch (err) {
          structure[p] = { type: "file", content: "[Error reading file]", path: p };
        }
      } else {
        structure[p] = { type: "file", content: "[File too large, omitted]", path: p };
      }
    }
  });
  return structure;
}

// src/extension.ts
function ensureFileIsGitignored(rootPath, filename) {
  const gitignorePath = (0, import_path3.join)(rootPath, ".gitignore");
  if ((0, import_fs3.existsSync)(gitignorePath)) {
    try {
      const gitignoreContent = (0, import_fs3.readFileSync)(gitignorePath, "utf8");
      const entries = gitignoreContent.split("\n").map((line) => line.trim());
      if (!entries.includes(filename)) {
        (0, import_fs3.appendFileSync)(gitignorePath, `

# Added by Better Context to AI
${filename}`);
      }
    } catch (err) {
      console.error(`Better Context to AI: Failed to read or write to .gitignore:`, err);
    }
  }
}
function activate(context) {
  const rootPath = vscode3.workspace.workspaceFolders ? vscode3.workspace.workspaceFolders[0].uri.fsPath : "";
  if (!rootPath) {
    vscode3.window.showErrorMessage("No workspace folder found.");
    return;
  }
  ensureFileIsGitignored(rootPath, "FILE_CONTENT_MAP.md");
  const fileSystemProvider = new FileSystemProvider(rootPath);
  const treeView = vscode3.window.createTreeView("fileSelector", {
    treeDataProvider: fileSystemProvider,
    showCollapseAll: true
  });
  const toggleSelectionCommand = vscode3.commands.registerCommand("extension.toggleSelection", (item) => {
    fileSystemProvider.toggleSelection(item);
  });
  const fileContentMapCommand = vscode3.commands.registerCommand("extension.generateFileContentMap", async () => {
    const selectedPaths = await fileSystemProvider.getSelectedItems();
    if (selectedPaths.length === 0) {
      vscode3.window.showErrorMessage("No files or folders selected.");
      return;
    }
    const filteredPaths = filterSelectedPaths(selectedPaths);
    const structure = getFolderStructureForSelectedPaths(filteredPaths, 2);
    let fileContentMap = "";
    function buildFileContentMap(data) {
      for (const key in data) {
        const item = data[key];
        if (item && item.type === "file" && item.path) {
          const forwardPath = (0, import_path3.normalize)(item.path).replace(/\\/g, "/");
          fileContentMap += `<!-- "${forwardPath}": -->
`;
          fileContentMap += `${item.content}

`;
        } else if (typeof item === "object") {
          buildFileContentMap(item);
        }
      }
    }
    buildFileContentMap(structure);
    const mdPath = (0, import_path3.join)(rootPath, "FILE_CONTENT_MAP.md");
    (0, import_fs3.writeFileSync)(mdPath, fileContentMap, "utf8");
    vscode3.window.showInformationMessage(`Saved file content map to ${mdPath}`);
    vscode3.workspace.openTextDocument(mdPath).then((doc) => {
      vscode3.window.showTextDocument(doc);
    });
  });
  const refreshTreeCommand = vscode3.commands.registerCommand("extension.refreshFileTree", () => {
    fileSystemProvider.refresh();
    vscode3.window.showInformationMessage("File tree refreshed.");
  });
  context.subscriptions.push(
    toggleSelectionCommand,
    fileContentMapCommand,
    refreshTreeCommand,
    treeView
  );
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
