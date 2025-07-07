# Scripts Directory

This directory contains setup and utility scripts for the DocRebrander project.

## setup-ocr-dependencies.js

Automatically installs system dependencies required for OCR functionality.

### Usage

**Automatic (runs during `pnpm install`):**
```bash
pnpm install
```

**Manual execution:**
```bash
pnpm run setup:ocr
```

**Direct execution:**
```bash
node scripts/setup-ocr-dependencies.js
```

### What it does

1. **Detects your operating system** and chooses the appropriate installation method
2. **Checks for existing dependencies** to avoid unnecessary installations
3. **Installs missing dependencies** using your system's package manager
4. **Verifies the installation** by checking if commands are available
5. **Creates a marker file** to skip future runs
6. **Provides helpful logs** with version information and next steps

### Supported Platforms

- **macOS**: Uses Homebrew (`brew install graphicsmagick ghostscript`)
- **Linux (Ubuntu/Debian)**: Uses apt-get (`sudo apt-get install graphicsmagick ghostscript`)
- **Windows**: Provides manual installation instructions

### Dependencies Installed

- **GraphicsMagick**: Image processing library for PDF to image conversion
- **Ghostscript**: PostScript and PDF interpreter for PDF processing

### Troubleshooting

If the script fails:

1. Check the detailed error messages in the console
2. Ensure you have the required system permissions
3. For macOS: Ensure Homebrew is installed
4. For Linux: Ensure you have sudo access
5. For Windows: Follow the manual installation instructions

### Force Reinstallation

```bash
# Remove the marker file and run setup again
rm .ocr-dependencies-installed
pnpm run setup:ocr
```

## How it Works

The script uses a smart approach:

1. **Idempotent**: Won't reinstall if dependencies are already present
2. **Cross-platform**: Automatically detects and handles different operating systems
3. **Non-blocking**: Won't fail the main `pnpm install` process
4. **Informative**: Provides clear logs about what's happening and what to do next
5. **Verifiable**: Checks that installations actually work before marking as complete

This ensures developers can simply run `pnpm install` and have everything set up automatically, while still providing manual options for troubleshooting.