const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('Claude File Paste extension is now active!');
  
  let disposable = vscode.commands.registerCommand("claude-file-paste.pasteFile", async () => {
    console.log('Claude File Paste command executed');
    try {
      // Check platform support
      const platform = getPlatform();
      if (!platform) {
        vscode.window.showErrorMessage("Claude File Paste: Only supported on Windows and WSL environments");
        return;
      }

      // Check for active terminal
      const activeTerminal = vscode.window.activeTerminal;
      if (!activeTerminal) {
        vscode.window.showErrorMessage("Claude File Paste: No active terminal found. Please open a terminal first.");
        return;
      }

      // Show progress notification
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Retrieving files from clipboard...",
          cancellable: false,
        },
        async (progress) => {
          try {
            console.log('Attempting to get files from clipboard...');
            const filePathsRaw = await getFilesFromClipboard(platform);
            console.log('Raw clipboard result:', filePathsRaw);

            if (filePathsRaw && filePathsRaw.trim()) {
              // Split paths if multiple were returned
              const filePaths = filePathsRaw.includes("\n") ? filePathsRaw.split("\n").filter((p) => p.trim()) : [filePathsRaw.trim()];
              console.log('Parsed file paths:', filePaths);

              // Convert and insert all paths
              const convertedPaths = filePaths.map((filePath) => convertPathForTerminal(filePath.trim(), platform, activeTerminal));
              console.log('Converted paths:', convertedPaths);

              // Send all paths to terminal, space-separated
              activeTerminal.sendText(convertedPaths.join(" "), false);

              // Show success with file count
              if (filePaths.length === 1) {
                try {
                  const stats = fs.statSync(filePaths[0]);
                  const sizeKB = Math.round(stats.size / 1024);
                  vscode.window.showInformationMessage(`Claude File Paste: Inserted ${path.basename(filePaths[0])} (${sizeKB}KB)`);
                } catch (statError) {
                  vscode.window.showInformationMessage(`Claude File Paste: Inserted ${path.basename(filePaths[0])}`);
                }
              } else {
                vscode.window.showInformationMessage(`Claude File Paste: Inserted ${filePaths.length} files`);
              }
            } else {
              console.log('No file paths returned from clipboard');
              vscode.window.showWarningMessage('Claude File Paste: No files or images found in clipboard');
            }
          } catch (error) {
            console.error('Clipboard error:', error);
            throw error;
          }
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Claude File Paste: ${error.message}`);
    }
  });

  context.subscriptions.push(disposable);
}

/**
 * Determine the current platform
 * @returns {string|null} 'windows', 'wsl', or null if unsupported
 */
function getPlatform() {
  if (process.platform === "win32") {
    return "windows";
  }
  if (process.platform === "linux" && fs.existsSync("/mnt/c/Windows")) {
    return "wsl";
  }
  return null;
}

/**
 * Get files from clipboard using PowerShell
 * @param {string} platform - 'windows' or 'wsl'
 * @returns {Promise<string>} Path to the saved files
 */
async function getFilesFromClipboard(platform) {
  const psScript = `
$ErrorActionPreference = 'Stop'
try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
} catch {
    Write-Error "Failed to load required .NET assemblies. Ensure .NET Framework is installed."
    exit 1
}

# Function to get next available filename
function Get-NextAvailableFilename {
    param([string]$extension)
    $tempDir = [System.IO.Path]::GetTempPath()
    
    # Try claude_paste_01 through claude_paste_99
    for ($i = 1; $i -le 99; $i++) {
        $filename = "claude_paste_$('{0:D2}' -f $i)$extension"
        $fullPath = [System.IO.Path]::Combine($tempDir, $filename)
        if (-not (Test-Path $fullPath)) {
            return $fullPath
        }
    }
    
    # If all 99 slots are taken, find the oldest and overwrite it
    $oldestFile = Get-ChildItem -Path $tempDir -Filter "claude_paste_*$extension" |
                  Where-Object { $_.Name -match 'claude_paste_\\d{2}' } |
                  Sort-Object LastWriteTime |
                  Select-Object -First 1
    
    if ($oldestFile) {
        return $oldestFile.FullName
    }
    
    # Fallback to slot 01 if nothing found
    return [System.IO.Path]::Combine($tempDir, "claude_paste_01$extension")
}

# First check if there's a file list in clipboard
$files = [System.Windows.Forms.Clipboard]::GetFileDropList()
if ($files -and $files.Count -gt 0) {
    $validPaths = @()
    
    foreach ($sourceFile in $files) {
        if (Test-Path $sourceFile) {
            $validPaths += $sourceFile
        }
    }
    
    if ($validPaths.Count -gt 0) {
        # Output original paths separated by newlines
        Write-Output ($validPaths -join [Environment]::NewLine)
        exit 0
    } else {
        Write-Error "No valid files found in clipboard"
        exit 1
    }
}

# If no files, check for clipboard image
try {
    $image = [System.Windows.Forms.Clipboard]::GetImage()
    if ($image -eq $null) {
        Write-Error "No image found in clipboard. Copy an image or image file and try again."
        exit 1
    }
    
    $tempPath = Get-NextAvailableFilename -extension ".png"
    $image.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $image.Dispose()
    Write-Output $tempPath
} catch {
    Write-Error "Failed to save clipboard image: $_"
    exit 1
}
    `.trim();

  const { exec } = require("child_process");
  const util = require("util");
  const execPromise = util.promisify(exec);

  // Build command based on platform - use temp file to avoid escaping issues
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  let command;
  if (platform === "wsl") {
    // From WSL, write to temp file
    const tempScript = '/tmp/claude_clipboard.ps1';
    fs.writeFileSync(tempScript, psScript);
    command = `pwsh.exe -NoProfile -ExecutionPolicy Bypass -File "${tempScript}"`;
  } else {
    // From Windows, write to temp file  
    const tempScript = path.join(os.tmpdir(), 'claude_clipboard.ps1');
    fs.writeFileSync(tempScript, psScript);
    command = `pwsh -NoProfile -ExecutionPolicy Bypass -File "${tempScript}"`;
  }

  const { stdout, stderr } = await execPromise(command, {
    timeout: 10000, // 10 second timeout
  });

  // Clean up temp file
  try {
    if (platform === "wsl") {
      fs.unlinkSync('/tmp/claude_clipboard.ps1');
    } else {
      fs.unlinkSync(path.join(os.tmpdir(), 'claude_clipboard.ps1'));
    }
  } catch (cleanupError) {
    console.log('Failed to cleanup temp script:', cleanupError.message);
  }

  if (stderr) {
    throw new Error(stderr.trim());
  }

  return stdout.trim();
}

/**
 * Convert Windows path to appropriate format for the terminal
 * @param {string} windowsPath - The Windows path
 * @param {string} platform - 'windows' or 'wsl'
 * @param {vscode.Terminal} terminal - The active terminal
 * @returns {string} The converted path
 */
function convertPathForTerminal(windowsPath, platform, terminal) {
  // If we're in WSL or the terminal is WSL, convert to WSL path
  if (platform === "wsl" || (terminal.name && terminal.name.toLowerCase().includes("wsl"))) {
    return windowsPath.replace(/\\/g, "/").replace(/^([A-Z]):/, (match, drive) => `/mnt/${drive.toLowerCase()}`);
  }

  // Otherwise return Windows path as-is
  return windowsPath;
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
