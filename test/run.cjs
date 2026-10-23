const fs = require('fs');
const os = require('os');
const path = require('path');
const { runTests } = require('@vscode/test-electron');

async function main() {
  if (process.platform !== 'win32') {
    throw new Error('Run this smoke test on Windows.');
  }

  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'galastri-link-'));
  const workspace = path.join(temporaryDirectory, 'workspace');
  fs.mkdirSync(workspace);
  fs.writeFileSync(path.join(workspace, 'index.php'), '<?php\n// LINK:/target.txt\n');
  fs.writeFileSync(path.join(workspace, 'target.txt'), 'Linked file\n');

  try {
    await runTests({
      extensionDevelopmentPath: path.resolve(__dirname, '..'),
      extensionTestsPath: path.join(__dirname, 'smoke.cjs'),
      launchArgs: [workspace, '--disable-extensions', '--skip-welcome',
        '--skip-release-notes', '--user-data-dir', path.join(temporaryDirectory, 'profile')]
    });
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function fail(error) {
  console.error(error);
  process.exitCode = 1;
}

main().catch(fail);
