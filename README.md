# Galastri Link to File

A VS Code extension that makes file links in comments clickable and underlined.

## Features

- Detects `LINK:` references in any comment format
- Underlines valid file paths that exist in your project
- Optional "Open File" action above each link
- Native clickable links, using the same modifier as VS Code's external links
- Supports all file types: text files, images (PNG, JPG, etc.), PDFs, and binary files
- Opens files with appropriate viewer (text editor, image viewer, etc.)
- Supports all languages (JavaScript, TypeScript, Python, Markdown, HTML, CSS, and more)
- Customizable link colors

## Syntax

The extension recognizes the following patterns:

```javascript
// LINK:/path/to/file.md
/* LINK:/public/documentation.md */
# LINK:/src/utils/helpers.ts
```

### Format Requirements
- Must use capital `LINK:`
- Followed by a forward slash `/` (works on all operating systems)
- Followed by the relative path from project root
- Can have anything after the path (spaces, tabs, etc.)

## Usage

1. Add a `LINK:` comment in any file:
   ```javascript
   // LINK:/README.md
   // LINK:/src/components/Button.tsx
   /* Configuration: LINK:/config.json */
   ```

2. The valid paths will be **underlined** in blue

3. Hover over the link to see if the file exists

4. Ctrl+click the path, or click the **"Open File"** action above it. If
   `editor.multiCursorModifier` is `ctrlCmd`, VS Code uses Alt+click instead.

5. The file will open in VS Code

## Installation

1. Disable or uninstall the original Link to File extension to avoid duplicate actions.
2. Download `galastri-link-to-file-vsix` from the latest successful GitHub Actions run
   and extract `galastri-link-to-file-1.0.1.vsix` from the ZIP.
3. In VS Code, run **Extensions: Install from VSIX...** and select that file.

The **Package personal VSIX** workflow is based on the personal Ataula workflow.
It runs on Windows only, checks the two settings and file opening in VS Code,
and packages the extension. It can also be started with **Run workflow**.

## Installation from Source

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Or watch for changes
npm run watch

# Package as VSIX
npm run package:vsix
```

## Extension Settings

You can customize the appearance of link highlighting in VS Code settings:

### Configuration Options

```json
{
  "galastri-link-to-file.showOpenFile": true,
  "galastri-link-to-file.allowClickToFollowLink": true,
  "galastri-link-to-file.linkColor": "#000000",
  "galastri-link-to-file.linkBackgroundColor": "#ffffff"
}
```

- `showOpenFile`: Show 'Open File' above the link (default: `true`).
- `allowClickToFollowLink`: Allow clicking to follow the link (default: `true`).
  Uses VS Code's native Ctrl+click / Alt+click behavior. Independent of `showOpenFile`.
- `linkColor`: Text color of the links (default: `#000000` - black)
- `linkBackgroundColor`: Background color of the links (default: `#ffffff` - white)

Example - highlight links in yellow:
```json
{
  "galastri-link-to-file.linkColor": "#000000",
  "galastri-link-to-file.linkBackgroundColor": "#ffff00"
}
```

## Known Limitations

- Paths must be relative to the workspace root
- Only detects exact `LINK:/path` format (capital letters required)
- Will not detect paths with spaces (to maintain clean parsing)

## Development

- TypeScript source in `src/extension.ts`
- See `package.json` for available npm scripts
- A short Windows smoke test is in `test/` and runs through GitHub Actions.

## License

MIT
