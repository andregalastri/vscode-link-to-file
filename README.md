# Link File Extension

A VS Code extension that makes file links in comments clickable and underlined.

## Features

- Detects `LINK:` references in any comment format
- Underlines valid file paths that exist in your project
- Shows a code lens "Open file" action
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

4. Click the **"Open file"** code lens action that appears above the link

5. The file will open in VS Code

## Installation

1. Copy this folder to your extensions directory or install from VS Code marketplace
2. Reload VS Code
3. The extension will activate automatically

## Installation from Source

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Or watch for changes
npm run watch

# Package as VSIX
npm run package
```

## Extension Settings

You can customize the appearance of link highlighting in VS Code settings:

### Configuration Options

```json
{
  "link-file-extension.linkColor": "#000000",
  "link-file-extension.linkBackgroundColor": "#ffffff"
}
```

- `linkColor`: Text color of the links (default: `#000000` - black)
- `linkBackgroundColor`: Background color of the links (default: `#ffffff` - white)

Example - highlight links in yellow:
```json
{
  "link-file-extension.linkColor": "#000000",
  "link-file-extension.linkBackgroundColor": "#ffff00"
}
```

## Known Limitations

- Paths must be relative to the workspace root
- Only detects exact `LINK:/path` format (capital letters required)
- Will not detect paths with spaces (to maintain clean parsing)

## Development

- TypeScript source in `src/extension.ts`
- See `package.json` for available npm scripts
- Tests can be added in a `test/` folder

## License

MIT
