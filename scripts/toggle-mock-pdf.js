#!/usr/bin/env node

/**
 * Toggle Mock PDF Extraction Mode
 * 
 * This script helps developers easily toggle between using real Gemini API
 * and mock data for PDF extraction during development.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_FILE_PATH = path.join(__dirname, '..', '.env');
const ENV_EXAMPLE_PATH = path.join(__dirname, '..', '.env.example');

async function readEnvFile() {
  try {
    const content = await fs.readFile(ENV_FILE_PATH, 'utf-8');
    return content;
  } catch (error) {
    console.log('📝 .env file not found, creating from .env.example...');
    try {
      const exampleContent = await fs.readFile(ENV_EXAMPLE_PATH, 'utf-8');
      await fs.writeFile(ENV_FILE_PATH, exampleContent);
      return exampleContent;
    } catch (exampleError) {
      console.error('❌ Could not create .env file:', exampleError);
      process.exit(1);
    }
  }
}

async function updateEnvFile(content, newValue) {
  const lines = content.split('\n');
  let found = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('USE_MOCK_PDF_EXTRACTION=')) {
      lines[i] = `USE_MOCK_PDF_EXTRACTION=${newValue}`;
      found = true;
      break;
    }
  }
  
  if (!found) {
    // Add the variable if it doesn't exist
    lines.push(`USE_MOCK_PDF_EXTRACTION=${newValue}`);
  }
  
  const newContent = lines.join('\n');
  await fs.writeFile(ENV_FILE_PATH, newContent);
}

async function getCurrentValue() {
  const content = await readEnvFile();
  const match = content.match(/USE_MOCK_PDF_EXTRACTION=(.+)/);
  return match ? match[1].trim() : 'false';
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🔧 PDF Extraction Mock Mode Toggle\n');
  
  try {
    const currentValue = await getCurrentValue();
    console.log(`Current state: ${currentValue === 'true' ? '🔧 MOCK MODE' : '🌐 REAL API'}`);
    
    if (command === 'on') {
      await updateEnvFile(await readEnvFile(), 'true');
      console.log('✅ Mock mode enabled! PDF extraction will use mock data.');
      console.log('💡 Restart your dev server to apply changes.');
    } else if (command === 'off') {
      await updateEnvFile(await readEnvFile(), 'false');
      console.log('✅ Mock mode disabled! PDF extraction will use real Gemini API.');
      console.log('💡 Restart your dev server to apply changes.');
    } else if (command === 'toggle') {
      const newValue = currentValue === 'true' ? 'false' : 'true';
      await updateEnvFile(await readEnvFile(), newValue);
      console.log(`✅ Toggled to ${newValue === 'true' ? '🔧 MOCK MODE' : '🌐 REAL API'}`);
      console.log('💡 Restart your dev server to apply changes.');
    } else {
      console.log('Usage:');
      console.log('  node scripts/toggle-mock-pdf.js on       # Enable mock mode');
      console.log('  node scripts/toggle-mock-pdf.js off      # Disable mock mode');
      console.log('  node scripts/toggle-mock-pdf.js toggle   # Toggle current state');
      console.log('  node scripts/toggle-mock-pdf.js          # Show current state');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();