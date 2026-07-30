import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const LINK_PATTERN = /LINK:\s*([\/\\][^\s\t\n\r]*)/g;

interface LinkMatch {
  path: string;
  range: vscode.Range;
  exists: boolean;
  fullPath: string;
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Link File Extension is now active');

  // Track active decorations
  const decorationMap = new Map<string, vscode.Range[]>();
  const linksCache = new Map<string, LinkMatch[]>();
  const linkRanges = new Map<string, LinkMatch[]>();

  // Create decoration for underlining valid links
  let linkDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: vscode.workspace.getConfiguration('link-file-extension').get('linkBackgroundColor'),
    color: vscode.workspace.getConfiguration('link-file-extension').get('linkColor'),
    textDecoration: 'underline',
    cursor: 'pointer'
  });

  // Function to recreate decoration with new settings
  const recreateDecoration = () => {
    linkDecoration.dispose();
    const config = vscode.workspace.getConfiguration('link-file-extension');
    linkDecoration = vscode.window.createTextEditorDecorationType({
      backgroundColor: config.get('linkBackgroundColor'),
      color: config.get('linkColor'),
      textDecoration: 'underline',
      cursor: 'pointer'
    });
  };

  // Prevent recursive file opening
  let lastOpenedFilePath: string | null = null;
  let lastOpenTime: number = 0;

  // Provider for code lens
  const codeLensProvider = new LinkCodeLensProvider();

  // Register code lens provider for all languages
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { scheme: 'file' },
      codeLensProvider
    )
  );

  // Command to open the linked file
  const openFileCommand = vscode.commands.registerCommand(
    'link-file-extension.openFile',
    async (filePath: string) => {
      try {
        const uri = vscode.Uri.file(filePath);
        lastOpenedFilePath = filePath;
        lastOpenTime = Date.now();
        // Use vscode.open command which intelligently handles all file types
        // (text files, images, binary files, etc.)
        await vscode.commands.executeCommand('vscode.open', uri);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to open file: ${filePath}. ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );
  context.subscriptions.push(openFileCommand);

  // Function to update decorations for current editor
  const updateDecorations = () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const document = editor.document;
    const text = document.getText();
    const links = findLinks(text, document);

    // Filter for valid links
    const validRanges = links.filter(link => link.exists).map(link => link.range);

    // Update decorations
    editor.setDecorations(linkDecoration, validRanges);

    // Store for later reference
    decorationMap.set(document.uri.fsPath, validRanges);

    // Cache links for click detection
    linksCache.set(document.uri.fsPath, links);
    linkRanges.set(document.uri.fsPath, links);

    // Update code lens provider
    codeLensProvider.setLinks(document.uri.fsPath, links);
  };

  // Update decorations on document open and change
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      updateDecorations();
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document === vscode.window.activeTextEditor?.document) {
        updateDecorations();
      }
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('link-file-extension')) {
        recreateDecoration();
        updateDecorations();
      }
    })
  );

  // Initial update
  updateDecorations();

  // Hover provider to show file info
  const hoverProvider = vscode.languages.registerHoverProvider(
    { scheme: 'file' },
    {
      provideHover(document: vscode.TextDocument, position: vscode.Position) {
        const links = findLinks(document.getText(), document);

        for (const link of links) {
          if (link.range.contains(position)) {
            const markdown = new vscode.MarkdownString(
              `**Linked File:** \`${link.path}\`\n\n${link.exists ? '✓ File exists' : '✗ File not found'}`
            );
            return new vscode.Hover(markdown);
          }
        }
        return null;
      }
    }
  );
  context.subscriptions.push(hoverProvider);
}

function findLinks(text: string, document: vscode.TextDocument): LinkMatch[] {
  const links: LinkMatch[] = [];
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

  if (!workspaceFolder) {
    return links;
  }

  let match;
  const regex = new RegExp(LINK_PATTERN);

  while ((match = regex.exec(text)) !== null) {
    const linkPath = match[1];
    const fullMatchStart = match.index;
    const linkPathStart = match[0].indexOf(linkPath);

    const startPos = document.positionAt(fullMatchStart + linkPathStart);
    const endPos = document.positionAt(fullMatchStart + linkPathStart + linkPath.length);
    const range = new vscode.Range(startPos, endPos);

    // Normalize path for current OS (convert forward slashes if needed on Windows)
    const normalizedPath = linkPath.replace(/\//g, path.sep);
    const fullPath = path.join(workspaceFolder.uri.fsPath, normalizedPath);

    // Check if file exists
    const exists = fs.existsSync(fullPath);

    links.push({
      path: linkPath,
      range,
      exists,
      fullPath
    });
  }

  return links;
}

class LinkCodeLensProvider implements vscode.CodeLensProvider {
  private linksMap = new Map<string, LinkMatch[]>();
  private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();

  readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;

  setLinks(documentPath: string, links: LinkMatch[]) {
    this.linksMap.set(documentPath, links);
    this.onDidChangeCodeLensesEmitter.fire();
  }

  provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] {
    const links = this.linksMap.get(document.uri.fsPath) || [];
    return links
      .filter(link => link.exists)
      .map(link => {
        const command: vscode.Command = {
          title: 'Open File',
          command: 'link-file-extension.openFile',
          arguments: [link.fullPath]
        };
        return new vscode.CodeLens(link.range, command);
      });
  }

  resolveCodeLens(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken
  ): vscode.CodeLens {
    return codeLens;
  }
}

export function deactivate() {}
