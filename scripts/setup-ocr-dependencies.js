#!/usr/bin/env node

/**
 * OCR Dependencies Setup Script
 * Automatically installs system dependencies required for OCR functionality
 */

import { exec } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';

// Configuration
const SETUP_MARKER_FILE = '.ocr-dependencies-installed';
const SCRIPT_VERSION = '1.0.0';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Logging functions
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  header: (msg) => console.log(`${colors.bright}${colors.cyan}🔧 ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.magenta}🔄${colors.reset} ${msg}`),
};

// Check if setup has already been completed
function isSetupCompleted() {
  try {
    const markerPath = path.join(process.cwd(), SETUP_MARKER_FILE);
    if (fs.existsSync(markerPath)) {
      const markerData = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
      return markerData.version === SCRIPT_VERSION;
    }
    return false;
  } catch (error) {
    return false;
  }
}

// Mark setup as completed
function markSetupCompleted() {
  const markerPath = path.join(process.cwd(), SETUP_MARKER_FILE);
  const markerData = {
    version: SCRIPT_VERSION,
    timestamp: new Date().toISOString(),
    platform: os.platform(),
  };
  fs.writeFileSync(markerPath, JSON.stringify(markerData, null, 2));
}

// Execute shell command with promise
function execAsync(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// Check if command exists
async function commandExists(command) {
  try {
    await execAsync(`which ${command}`);
    return true;
  } catch (error) {
    return false;
  }
}

// Check if Homebrew is installed (macOS)
async function hasHomebrew() {
  return await commandExists('brew');
}

// Check if apt-get is available (Linux)
async function hasAptGet() {
  return await commandExists('apt-get');
}

// Setup for macOS
async function setupMacOS() {
  log.step('Setting up OCR dependencies for macOS...');
  
  // Check if Homebrew is installed
  if (!(await hasHomebrew())) {
    log.warning('Homebrew is not installed. Please install Homebrew first:');
    log.info('Visit: https://brew.sh/');
    log.info('Or run: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
    return false;
  }

  // Check if GraphicsMagick is installed
  const hasGM = await commandExists('gm');
  if (!hasGM) {
    log.step('Installing GraphicsMagick...');
    try {
      await execAsync('brew install graphicsmagick');
      log.success('GraphicsMagick installed successfully');
    } catch (error) {
      log.error('Failed to install GraphicsMagick');
      log.error(error.stderr || error.error.message);
      return false;
    }
  } else {
    log.success('GraphicsMagick is already installed');
  }

  // Check if Ghostscript is installed
  const hasGS = await commandExists('gs');
  if (!hasGS) {
    log.step('Installing Ghostscript...');
    try {
      await execAsync('brew install ghostscript');
      log.success('Ghostscript installed successfully');
    } catch (error) {
      log.error('Failed to install Ghostscript');
      log.error(error.stderr || error.error.message);
      return false;
    }
  } else {
    log.success('Ghostscript is already installed');
  }

  return true;
}

// Setup for Linux (Ubuntu/Debian)
async function setupLinux() {
  log.step('Setting up OCR dependencies for Linux...');
  
  // Check if apt-get is available
  if (!(await hasAptGet())) {
    log.warning('apt-get is not available. Please install dependencies manually:');
    log.info('GraphicsMagick: Use your package manager to install graphicsmagick');
    log.info('Ghostscript: Use your package manager to install ghostscript');
    return false;
  }

  // Update package list
  log.step('Updating package list...');
  try {
    await execAsync('sudo apt-get update');
    log.success('Package list updated');
  } catch (error) {
    log.warning('Failed to update package list (continuing anyway)');
  }

  // Check if GraphicsMagick is installed
  const hasGM = await commandExists('gm');
  if (!hasGM) {
    log.step('Installing GraphicsMagick...');
    try {
      await execAsync('sudo apt-get install -y graphicsmagick');
      log.success('GraphicsMagick installed successfully');
    } catch (error) {
      log.error('Failed to install GraphicsMagick');
      log.error(error.stderr || error.error.message);
      return false;
    }
  } else {
    log.success('GraphicsMagick is already installed');
  }

  // Check if Ghostscript is installed
  const hasGS = await commandExists('gs');
  if (!hasGS) {
    log.step('Installing Ghostscript...');
    try {
      await execAsync('sudo apt-get install -y ghostscript');
      log.success('Ghostscript installed successfully');
    } catch (error) {
      log.error('Failed to install Ghostscript');
      log.error(error.stderr || error.error.message);
      return false;
    }
  } else {
    log.success('Ghostscript is already installed');
  }

  return true;
}

// Setup for Windows
async function setupWindows() {
  log.step('Setting up OCR dependencies for Windows...');
  
  log.warning('Windows automatic setup is not implemented yet.');
  log.info('Please install dependencies manually:');
  log.info('1. GraphicsMagick: Download from http://www.graphicsmagick.org/');
  log.info('2. Ghostscript: Download from https://www.ghostscript.com/');
  log.info('3. Make sure both are added to your PATH');
  log.info('');
  log.info('After manual installation, you can verify with:');
  log.info('- gm version');
  log.info('- gs --version');
  
  return false; // Manual setup required
}

// Verify installation
async function verifyInstallation() {
  log.step('Verifying OCR dependencies installation...');
  
  const hasGM = await commandExists('gm');
  const hasGS = await commandExists('gs');
  
  if (hasGM && hasGS) {
    log.success('All OCR dependencies are properly installed');
    
    // Get versions
    try {
      const gmVersion = await execAsync('gm version');
      const gsVersion = await execAsync('gs --version');
      
      log.info(`GraphicsMagick version: ${gmVersion.stdout.split('\\n')[0]}`);
      log.info(`Ghostscript version: ${gsVersion.stdout.trim()}`);
    } catch (error) {
      log.warning('Could not retrieve version information');
    }
    
    return true;
  } else {
    log.error('OCR dependencies verification failed');
    if (!hasGM) log.error('GraphicsMagick (gm) is not available');
    if (!hasGS) log.error('Ghostscript (gs) is not available');
    return false;
  }
}

// Main setup function
async function setupOcrDependencies() {
  log.header('DocRebrander OCR Dependencies Setup');
  log.info('This script will automatically install system dependencies required for OCR functionality.');
  log.info('Required dependencies: GraphicsMagick, Ghostscript');
  log.info('');

  // Check if setup is already completed
  if (isSetupCompleted()) {
    log.success('OCR dependencies setup already completed');
    log.info('If you need to reinstall, delete the .ocr-dependencies-installed file');
    return true;
  }

  const platform = os.platform();
  let success = false;

  switch (platform) {
    case 'darwin':
      success = await setupMacOS();
      break;
    case 'linux':
      success = await setupLinux();
      break;
    case 'win32':
      success = await setupWindows();
      break;
    default:
      log.error(`Unsupported platform: ${platform}`);
      log.info('Please install dependencies manually and refer to the OCR documentation');
      return false;
  }

  if (success) {
    // Verify installation
    const verified = await verifyInstallation();
    if (verified) {
      markSetupCompleted();
      log.success('OCR dependencies setup completed successfully!');
      log.info('');
      log.info('📖 For more information about OCR features, see: docs/tech/ocr_implementation.md');
      log.info('🧪 You can now test OCR functionality by uploading PDFs through the web interface');
      return true;
    } else {
      log.error('Installation verification failed');
      return false;
    }
  } else {
    log.error('OCR dependencies setup failed');
    log.info('');
    log.info('📖 Please refer to the manual installation instructions in: docs/tech/ocr_implementation.md');
    log.info('💡 Or check the troubleshooting section for common issues');
    return false;
  }
}

// Check if running as postinstall script
const isPostInstall = process.argv.includes('--postinstall');

if (isPostInstall) {
  log.info('Running OCR dependencies setup as part of npm install...');
  setupOcrDependencies().then((success) => {
    if (!success) {
      log.warning('OCR dependencies setup failed, but continuing with installation');
      log.info('You can run the setup manually later with: node scripts/setup-ocr-dependencies.js');
    }
    process.exit(0); // Always exit 0 for postinstall to not fail the main install
  }).catch((error) => {
    log.error('OCR dependencies setup encountered an error:', error.message);
    log.info('You can run the setup manually later with: node scripts/setup-ocr-dependencies.js');
    process.exit(0); // Always exit 0 for postinstall to not fail the main install
  });
} else {
  // Manual execution
  setupOcrDependencies().then((success) => {
    process.exit(success ? 0 : 1);
  }).catch((error) => {
    log.error('Setup failed:', error.message);
    process.exit(1);
  });
}