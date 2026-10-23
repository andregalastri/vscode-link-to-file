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
  console.log('Galastri Link to File is now active');

  // Create decoration for underlining valid links
  let linkDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: vscode.workspace.getConfiguration('galastri-link-to-file').get('linkBackgroundColor'),
    color: vscode.workspace.getConfiguration('galastri-link-to-file').get('linkColor'),
    textDecoration: 'underline',
    cursor: 'pointer'
  });

  // Function to recreate decoration with new settings
  const recreateDecoration = () => {
    linkDecoration.dispose();
    const config = vscode.workspace.getConfiguration('galastri-link-to-file');
    linkDecoration = vscode.window.createTextEditorDecorationType({
      backgroundColor: config.get('linkBackgroundColor'),
      color: config.get('linkColor'),
      textDecoration: 'underline',
      cursor: 'pointer'
    });
  };

  // Provider for code lens
  const codeLensProvider = new LinkCodeLensProvider();

  // Register code lens provider for all languages
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { scheme: 'file' },
      codeLensProvider
    )
  );

  // Native document links use the same modifier as VS Code's external links.
  const documentLinkProvider = new LinkDocumentLinkProvider();
  let documentLinkRegistration: vscode.Disposable;

  function registerDocumentLinks() {
    if (documentLinkRegistration) {
      documentLinkRegistration.dispose();
    }
    documentLinkRegistration = vscode.languages.registerDocumentLinkProvider(
      { scheme: 'file' },
      documentLinkProvider
    );
  }

  registerDocumentLinks();
  context.subscriptions.push(
    codeLensProvider,
    { dispose() { documentLinkRegistration.dispose(); } }
  );

  // Command to open the linked file
  const openFileCommand = vscode.commands.registerCommand(
    'galastri-link-to-file.openFile',
    async (filePath: string) => {
      try {
        const uri = vscode.Uri.file(filePath);
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

    // Update code lens provider
    codeLensProvider.refresh();
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
      if (event.affectsConfiguration('galastri-link-to-file')) {
        recreateDecoration();
        updateDecorations();
        if (event.affectsConfiguration('galastri-link-to-file.allowClickToFollowLink')) {
          registerDocumentLinks();
        }
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
  private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();

  readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;

  refresh() {
    this.onDidChangeCodeLensesEmitter.fire();
  }

  provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] {
    const config = vscode.workspace.getConfiguration('galastri-link-to-file', document.uri);
    if (!config.get<boolean>('showOpenFile', true)) {
      return [];
    }
    const links = findLinks(document.getText(), document);
    return links
      .filter(link => link.exists)
      .map(link => {
        const command: vscode.Command = {
          title: 'Open File',
          command: 'galastri-link-to-file.openFile',
          arguments: [link.fullPath]
        };
        return new vscode.CodeLens(link.range, command);
      });
  }

  dispose() {
    this.onDidChangeCodeLensesEmitter.dispose();
  }

  resolveCodeLens(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken
  ): vscode.CodeLens {
    return codeLens;
  }
}

class LinkDocumentLinkProvider implements vscode.DocumentLinkProvider {
  provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
    const config = vscode.workspace.getConfiguration('galastri-link-to-file', document.uri);
    if (!config.get<boolean>('allowClickToFollowLink', true)) {
      return [];
    }

    const documentLinks: vscode.DocumentLink[] = [];
    const links = findLinks(document.getText(), document);
    for (const link of links) {
      if (link.exists) {
        documentLinks.push(new vscode.DocumentLink(link.range, vscode.Uri.file(link.fullPath)));
      }
    }
    return documentLinks;
  }

}

export function deactivate() {}
