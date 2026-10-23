const assert = require('assert');
const vscode = require('vscode');

async function run() {
  const extension = vscode.extensions.getExtension('andregalastri.galastri-link-to-file');
  assert.ok(extension, 'Extension is installed');
  await extension.activate();
  assert.strictEqual(extension.packageJSON.displayName, 'Galastri Link to File');

  const root = vscode.workspace.workspaceFolders[0].uri;
  const source = vscode.Uri.joinPath(root, 'index.php');
  const target = vscode.Uri.joinPath(root, 'target.txt');
  const document = await vscode.workspace.openTextDocument(source);
  await vscode.window.showTextDocument(document);
  const config = vscode.workspace.getConfiguration('galastri-link-to-file', source);
  assert.strictEqual(config.get('showOpenFile'), true);
  assert.strictEqual(config.get('allowClickToFollowLink'), true);

  let links = await vscode.commands.executeCommand('vscode.executeLinkProvider', source);
  let lenses = await vscode.commands.executeCommand('vscode.executeCodeLensProvider', source);
  assert.strictEqual(links.length, 1);
  assert.strictEqual(document.getText(links[0].range), '/target.txt');
  assert.strictEqual(links[0].target.fsPath, target.fsPath);
  assert.strictEqual(lenses.length, 1);
  assert.strictEqual(lenses[0].command.title, 'Open File');
  await vscode.commands.executeCommand(lenses[0].command.command, ...lenses[0].command.arguments);
  assert.strictEqual(vscode.window.activeTextEditor.document.uri.fsPath, target.fsPath);

  await config.update('showOpenFile', false, vscode.ConfigurationTarget.Workspace);
  await config.update('allowClickToFollowLink', false, vscode.ConfigurationTarget.Workspace);
  links = await vscode.commands.executeCommand('vscode.executeLinkProvider', source);
  lenses = await vscode.commands.executeCommand('vscode.executeCodeLensProvider', source);
  assert.strictEqual(links.length, 0);
  assert.strictEqual(lenses.length, 0);

  await config.update('allowClickToFollowLink', true, vscode.ConfigurationTarget.Workspace);
  links = await vscode.commands.executeCommand('vscode.executeLinkProvider', source);
  lenses = await vscode.commands.executeCommand('vscode.executeCodeLensProvider', source);
  assert.strictEqual(links.length, 1);
  assert.strictEqual(lenses.length, 0);
  await vscode.commands.executeCommand('vscode.open', links[0].target);
  assert.strictEqual(vscode.window.activeTextEditor.document.uri.fsPath, target.fsPath);
  console.log('Windows smoke test passed: settings, CodeLens and native file links.');
}

module.exports = { run };
