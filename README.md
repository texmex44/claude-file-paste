# Claude File Paste for VS Code

A VS Code extension that enables seamless file pasting into terminals for Claude Code conversations. Works with any file type - documents, images, code files, and more!

## Features

- **Clipboard Images**: Paste screenshots directly from your clipboard
- **Any File Type**: Copy any files from Explorer and paste their paths
- **Smart Path Conversion**: Automatically converts paths for WSL terminals
- **Progress Feedback**: Shows file size and status notifications
- **Multi-file Support**: Paste multiple files at once

## Installation

### From Source
1. Clone or download this extension to a suitable folder
2. Open VS Code
3. Open the command palette
4. Execute `Developer: Install from Location...`
5. Navigate to the extension folder
6. Click ok
7. Restart VS Code

### For WSL Users
After installing on Windows, you'll see "Install in WSL" button - click it to enable in WSL terminals.

## Usage

1. **Copy files**:
   - Take a screenshot (Win+Shift+S, PrintScreen, etc.)
   - OR copy any file(s) from File Explorer
   - OR right-click an image in browser → Copy image

2. **In your terminal**:
   - Press `Ctrl+Shift+Alt+I` (keyboard shortcut)
   - OR Press `Ctrl+Shift+P` → Type "Paste File for Claude" → Enter
   - OR remap the shortcut in your settings and use it instead. The key is `claude-file-paste.pasteFile`

3. **The file path(s) are inserted** and you can send them to Claude!

## Requirements

- Windows or WSL environment
- PowerShell 7 (pwsh) recommended
- .NET Framework (for clipboard access)
- VS Code 1.74.0 or higher

## Tips

- **For copied files**: Original paths are inserted directly (no copying needed!)
- **For screenshots**: Saved to temp folder as `claude_paste_01.png`, etc.
- Smart handling: Files keep their original locations, only clipboard images are saved
- Perfect for Claude Code conversations like:
  ```
  "Can you review this code?"
  G:\Projects\my-app\src\main.py
  
  "Here are the test results and the error screenshot:"
  G:\Projects\my-app\test-results.log /mnt/c/Users/YourName/AppData/Local/Temp/claude_paste_01.png
  ```

## Troubleshooting

**"No active terminal found"**
- Make sure you have a terminal open in VS Code

**"No files found in clipboard"**
- Ensure you've copied files (not just selected them)
- Try copying again

**PowerShell errors**
- Make sure you have PowerShell 7 installed
- Check that .NET Framework is installed

## Authors

Created by Claude

## License

This extension is provided as-is for the Claude Code community!