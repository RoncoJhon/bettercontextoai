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
var vscode = __toESM(require("vscode"));
var import_fs = require("fs");
var import_path = require("path");
function filterSelectedPaths(paths) {
  const normalized = paths.map((p) => (0, import_path.normalize)(p).replace(/\\/g, "/"));
  return normalized.filter((path) => {
    return !normalized.some(
      (otherPath) => otherPath !== path && path.startsWith(otherPath + "/")
    );
  });
}
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
var FileSystemProvider = class {
  constructor(rootPath) {
    this.rootPath = rootPath;
  }
  _onDidChangeTreeData = new vscode.EventEmitter();
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
      children = items.map((item) => {
        const fullPath = (0, import_path.join)(directory, item);
        const stats = (0, import_fs.lstatSync)(fullPath);
        const isFolder = stats.isDirectory();
        const collapsibleState = isFolder ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
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
   * - When selecting a folder, mark all its children as selected.
   * - When unselecting a folder, mark all its children as unselected.
   * - When unselecting any item, update its parent(s) to be unselected.
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
        const selected = this.selectionMap.get(fullPath);
        if (selected) {
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
    items = (0, import_fs.readdirSync)(folderPath);
  } catch (err) {
    return structure;
  }
  for (const item of items) {
    const itemPath = (0, import_path.join)(folderPath, item);
    const stats = (0, import_fs.lstatSync)(itemPath);
    const banned = foldersAndFilesToAvoid.find((ext) => item.includes(ext));
    if (banned || item.includes("test") || item.includes("ignore") || item.includes(".spec") || item.includes(".md")) {
      continue;
    }
    if (stats.isDirectory()) {
      structure[item] = traverseFolder(itemPath, maxDepth - 1);
    } else {
      if (stats.size <= MAX_FILE_SIZE) {
        try {
          const content = (0, import_fs.readFileSync)(itemPath, "utf8");
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
    if (!(0, import_fs.existsSync)(p)) {
      console.error("Path does not exist:", p);
      return;
    }
    const stats = (0, import_fs.lstatSync)(p);
    if (stats.isDirectory()) {
      structure[p] = traverseFolder(p, maxDepth);
    } else {
      if (stats.size <= MAX_FILE_SIZE) {
        try {
          const content = (0, import_fs.readFileSync)(p, "utf8");
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
function activate(context) {
  const rootPath = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : "";
  if (!rootPath) {
    vscode.window.showErrorMessage("No workspace folder found.");
    return;
  }
  const fileSystemProvider = new FileSystemProvider(rootPath);
  const treeView = vscode.window.createTreeView("fileSelector", {
    treeDataProvider: fileSystemProvider,
    showCollapseAll: true
  });
  const toggleSelectionCommand = vscode.commands.registerCommand("extension.toggleSelection", (item) => {
    fileSystemProvider.toggleSelection(item);
  });
  const fileContentMapCommand = vscode.commands.registerCommand("extension.generateFileContentMap", async () => {
    const selectedPaths = await fileSystemProvider.getSelectedItems();
    if (selectedPaths.length === 0) {
      vscode.window.showErrorMessage("No files or folders selected.");
      return;
    }
    const filteredPaths = filterSelectedPaths(selectedPaths);
    const structure = getFolderStructureForSelectedPaths(filteredPaths, 2);
    let fileContentMap = "";
    function buildFileContentMap(data) {
      for (const key in data) {
        const item = data[key];
        if (item && item.type === "file" && item.path) {
          const normalizedPath = (0, import_path.normalize)(item.path);
          const forwardPath = normalizedPath.replace(/\\/g, "/");
          fileContentMap += `"${forwardPath}":
`;
          fileContentMap += `// ${item.content}

`;
        } else if (typeof item === "object") {
          buildFileContentMap(item);
        }
      }
    }
    buildFileContentMap(structure);
    const outputFolder = rootPath;
    const mdPath = (0, import_path.join)(outputFolder, "FILE_CONTENT_MAP.md");
    (0, import_fs.writeFileSync)(mdPath, fileContentMap, "utf8");
    vscode.window.showInformationMessage(`Saved file content map to ${mdPath}`);
    vscode.workspace.openTextDocument(mdPath).then((doc) => {
      vscode.window.showTextDocument(doc);
    });
  });
  const refreshTreeCommand = vscode.commands.registerCommand("extension.refreshFileTree", () => {
    fileSystemProvider.refresh();
    vscode.window.showInformationMessage("File tree refreshed.");
  });
  context.subscriptions.push(toggleSelectionCommand, fileContentMapCommand, refreshTreeCommand, treeView);
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
